import { eventBus } from '@colanode/client/lib/event-bus';
import { mapWorkspace } from '@colanode/client/lib/mappers';
import { MutationHandler } from '@colanode/client/lib/types';
import {
  MutationError,
  MutationErrorCode,
  WorkspaceUpdateMutationInput,
  WorkspaceUpdateMutationOutput,
} from '@colanode/client/mutations';
import { AppService } from '@colanode/client/services/app-service';

export class WorkspaceUpdateMutationHandler implements MutationHandler<WorkspaceUpdateMutationInput> {
  private readonly app: AppService;

  constructor(app: AppService) {
    this.app = app;
  }

  async handleMutation(
    input: WorkspaceUpdateMutationInput
  ): Promise<WorkspaceUpdateMutationOutput> {
    const workspaceService = this.app.getWorkspace(input.userId);
    if (!workspaceService) {
      throw new MutationError(
        MutationErrorCode.WorkspaceNotFound,
        'Workspace not found.'
      );
    }

    const updatedWorkspace = await this.app.database
      .updateTable('workspaces')
      .returningAll()
      .set({
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        updated_at: new Date().toISOString(),
      })
      .where((eb) => eb.and([eb('user_id', '=', input.userId)]))
      .executeTakeFirst();

    if (!updatedWorkspace) {
      throw new MutationError(
        MutationErrorCode.WorkspaceNotUpdated,
        'Something went wrong updating local workspace. Please try again later.'
      );
    }

    const workspace = mapWorkspace(updatedWorkspace);
    workspaceService.updateWorkspace(workspace);

    eventBus.publish({
      type: 'workspace.updated',
      workspace,
    });

    return {
      success: true,
    };
  }
}
