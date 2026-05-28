import { mapMutation } from '@colanode/client/lib/mappers';
import { WorkspaceService } from '@colanode/client/services/workspaces/workspace-service';
import {
  createDebugger,
  Mutation,
} from '@colanode/core';

const READ_SIZE = 500;

const debug = createDebugger('desktop:service:mutation');

export class MutationService {
  private readonly workspace: WorkspaceService;

  constructor(workspaceService: WorkspaceService) {
    this.workspace = workspaceService;
  }

  public async scheduleSync(): Promise<void> {
    if (this.workspace.account.app.meta.localOnly) {
      await this.clearLocalOnlyMutations();
      return;
    }

    await this.sync();
  }

  public async sync(): Promise<void> {
    if (this.workspace.account.app.meta.localOnly) {
      await this.clearLocalOnlyMutations();
      return;
    }

    try {
      let hasMutations = true;

      while (hasMutations) {
        hasMutations = await this.sendMutations();
      }

      await this.revertInvalidMutations();
    } catch (error) {
      debug(`Error syncing mutations: ${error}`);
    }
  }

  private async clearLocalOnlyMutations(): Promise<void> {
    await this.workspace.database.deleteFrom('mutations').execute();
  }

  private async sendMutations(): Promise<boolean> {
    if (!this.workspace.account.server.isAvailable) {
      return false;
    }

    const pendingMutations = await this.workspace.database
      .selectFrom('mutations')
      .selectAll()
      .orderBy('id', 'asc')
      .limit(READ_SIZE)
      .execute();

    if (pendingMutations.length === 0) {
      return false;
    }

    const allMutations: Mutation[] = pendingMutations.map(mapMutation);
    const { validMutations, deletedMutationIds } =
      this.consolidateMutations(allMutations);

    if (deletedMutationIds.size > 0) {
      await this.deleteMutations(
        Array.from(deletedMutationIds),
        'consolidated'
      );
    }

    debug(
      `Sending ${pendingMutations.length} local pending mutations for user ${this.workspace.userId}`
    );

    if (validMutations.length > 0) {
      await this.deleteMutations(
        validMutations.map((mutation) => mutation.id),
        'remote-sync-disabled'
      );
    }

    return pendingMutations.length > 0;
  }

  private async revertInvalidMutations(): Promise<void> {
    const invalidMutations = await this.workspace.database
      .selectFrom('mutations')
      .selectAll()
      .where('retries', '>=', 10)
      .execute();

    if (invalidMutations.length === 0) {
      return;
    }

    debug(
      `Reverting ${invalidMutations.length} invalid mutations for user ${this.workspace.userId}`
    );

    for (const mutationRow of invalidMutations) {
      const mutation = mapMutation(mutationRow);

      if (mutation.type === 'node.create') {
        await this.workspace.nodes.revertNodeCreate(mutation.data);
      } else if (mutation.type === 'node.update') {
        await this.workspace.nodes.revertNodeUpdate(mutation.data);
      } else if (mutation.type === 'node.delete') {
        await this.workspace.nodes.revertNodeDelete(mutation.data);
      } else if (mutation.type === 'node.reaction.create') {
        await this.workspace.nodeReactions.revertNodeReactionCreate(
          mutation.data
        );
      } else if (mutation.type === 'node.reaction.delete') {
        await this.workspace.nodeReactions.revertNodeReactionDelete(
          mutation.data
        );
      } else if (mutation.type === 'document.update') {
        await this.workspace.documents.revertDocumentUpdate(mutation.data);
      }
    }

    const mutationIds = invalidMutations.map((m) => m.id);
    await this.deleteMutations(mutationIds, 'invalid');
  }

  private async deleteMutations(
    mutationIds: string[],
    reason: string
  ): Promise<void> {
    debug(
      `Deleting ${mutationIds.length} local mutations for user ${this.workspace.userId}. Reason: ${reason}`
    );

    await this.workspace.database
      .deleteFrom('mutations')
      .where('id', 'in', mutationIds)
      .execute();
  }

  private async markMutationsAsFailed(mutationIds: string[]): Promise<void> {
    debug(
      `Marking ${mutationIds.length} local pending mutations as failed for user ${this.workspace.userId}`
    );

    await this.workspace.database
      .updateTable('mutations')
      .set((eb) => ({ retries: eb('retries', '+', 1) }))
      .where('id', 'in', mutationIds)
      .execute();
  }

  private consolidateMutations(mutations: Mutation[]) {
    const validMutations: Mutation[] = [];
    const deletedMutationIds: Set<string> = new Set();

    for (let i = mutations.length - 1; i >= 0; i--) {
      const mutation = mutations[i];
      if (!mutation) {
        continue;
      }

      if (deletedMutationIds.has(mutation.id)) {
        continue;
      }

      if (mutation.type === 'node.delete') {
        for (let j = i - 1; j >= 0; j--) {
          const previousMutation = mutations[j];
          if (!previousMutation) {
            continue;
          }

          if (
            previousMutation.type === 'node.create' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(mutation.id);
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.update' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(mutation.id);
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.delete' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          } else if (previousMutation.type === 'document.update') {
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.interaction.seen' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.interaction.opened' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.reaction.create' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.reaction.delete' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          }
        }
      } else if (mutation.type === 'node.reaction.delete') {
        for (let j = i - 1; j >= 0; j--) {
          const previousMutation = mutations[j];
          if (!previousMutation) {
            continue;
          }

          if (
            previousMutation.type === 'node.reaction.create' &&
            previousMutation.data.nodeId === mutation.data.nodeId &&
            previousMutation.data.reaction === mutation.data.reaction
          ) {
            deletedMutationIds.add(mutation.id);
            deletedMutationIds.add(previousMutation.id);
          } else if (
            previousMutation.type === 'node.reaction.delete' &&
            previousMutation.data.nodeId === mutation.data.nodeId &&
            previousMutation.data.reaction === mutation.data.reaction
          ) {
            deletedMutationIds.add(previousMutation.id);
          }
        }
      } else if (mutation.type === 'node.interaction.seen') {
        for (let j = i - 1; j >= 0; j--) {
          const previousMutation = mutations[j];
          if (!previousMutation) {
            continue;
          }

          if (
            previousMutation.type === 'node.interaction.seen' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          }
        }
      } else if (mutation.type === 'node.interaction.opened') {
        for (let j = i - 1; j >= 0; j--) {
          const previousMutation = mutations[j];
          if (!previousMutation) {
            continue;
          }

          if (
            previousMutation.type === 'node.interaction.opened' &&
            previousMutation.data.nodeId === mutation.data.nodeId
          ) {
            deletedMutationIds.add(previousMutation.id);
          }
        }
      }

      if (!deletedMutationIds.has(mutation.id)) {
        validMutations.push(mutation);
      }
    }

    return {
      validMutations: validMutations.reverse(),
      deletedMutationIds,
    };
  }
}
