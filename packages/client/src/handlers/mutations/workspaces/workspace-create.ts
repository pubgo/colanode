import { eventBus } from '@colanode/client/lib/event-bus';
import { mapWorkspace } from '@colanode/client/lib/mappers';
import { MutationHandler } from '@colanode/client/lib/types';
import { MutationError, MutationErrorCode } from '@colanode/client/mutations';
import {
  WorkspaceCreateMutationInput,
  WorkspaceCreateMutationOutput,
} from '@colanode/client/mutations/workspaces/workspace-create';
import { AppService } from '@colanode/client/services/app-service';
import {
  generateId,
  IdType,
  WorkspaceStatus,
} from '@colanode/core';

export class WorkspaceCreateMutationHandler implements MutationHandler<WorkspaceCreateMutationInput> {
  private readonly app: AppService;

  constructor(app: AppService) {
    this.app = app;
  }

  async handleMutation(
    input: WorkspaceCreateMutationInput
  ): Promise<WorkspaceCreateMutationOutput> {
    const account = this.app.getAccount(input.accountId);

    if (!account) {
      throw new MutationError(
        MutationErrorCode.AccountNotFound,
        'Account not found or has been logged out.'
      );
    }

    const now = new Date().toISOString();
    const createdWorkspace = await this.app.database
      .insertInto('workspaces')
      .returningAll()
      .values({
        user_id: generateId(IdType.User),
        workspace_id: generateId(IdType.Workspace),
        account_id: account.id,
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        role: 'owner',
        max_file_size: null,
        created_at: now,
        updated_at: now,
        status: WorkspaceStatus.Active,
      })
      .executeTakeFirst();

    if (!createdWorkspace) {
      throw new MutationError(
        MutationErrorCode.WorkspaceNotCreated,
        'Something went wrong creating local workspace. Please try again later.'
      );
    }

    await this.app.initWorkspace(createdWorkspace);
    await this.app.metadata.set('app', 'workspace', createdWorkspace.user_id);

    const workspace = mapWorkspace(createdWorkspace);
    eventBus.publish({
      type: 'workspace.created',
      workspace,
    });

    return {
      id: createdWorkspace.workspace_id,
      userId: createdWorkspace.user_id,
    };
  }
}
