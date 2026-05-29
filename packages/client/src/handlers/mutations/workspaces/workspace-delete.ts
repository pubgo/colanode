import { MutationHandler } from '@colanode/client/lib/types';
import { MutationError, MutationErrorCode } from '@colanode/client/mutations';
import {
  WorkspaceDeleteMutationInput,
  WorkspaceDeleteMutationOutput,
} from '@colanode/client/mutations/workspaces/workspace-delete';
import { AppService } from '@colanode/client/services/app-service';

export class WorkspaceDeleteMutationHandler
  implements MutationHandler<WorkspaceDeleteMutationInput> {
  private readonly app: AppService;

  constructor(app: AppService) {
    this.app = app;
  }

  async handleMutation(
    input: WorkspaceDeleteMutationInput
  ): Promise<WorkspaceDeleteMutationOutput> {
    const workspaceService = this.app.getWorkspace(input.userId);
    if (!workspaceService) {
      throw new MutationError(
        MutationErrorCode.WorkspaceNotFound,
        'Workspace not found.'
      );
    }

    const workspaceId = workspaceService.workspaceId;
    await workspaceService.delete();

    return {
      id: workspaceId,
    };
  }
}
