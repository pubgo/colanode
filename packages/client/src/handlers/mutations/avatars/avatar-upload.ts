import { eventBus } from '@colanode/client/lib/event-bus';
import { mapAvatar } from '@colanode/client/lib/mappers';
import { MutationHandler } from '@colanode/client/lib/types';
import { MutationError, MutationErrorCode } from '@colanode/client/mutations';
import {
  AvatarUploadMutationInput,
  AvatarUploadMutationOutput,
} from '@colanode/client/mutations/avatars/avatar-upload';
import { AppService } from '@colanode/client/services/app-service';
import { generateId, IdType } from '@colanode/core';

export class AvatarUploadMutationHandler
  implements MutationHandler<AvatarUploadMutationInput> {
  private readonly app: AppService;

  constructor(appService: AppService) {
    this.app = appService;
  }

  async handleMutation(
    input: AvatarUploadMutationInput
  ): Promise<AvatarUploadMutationOutput> {
    const account = this.app.getAccount(input.accountId);

    if (!account) {
      throw new MutationError(
        MutationErrorCode.AccountNotFound,
        'Account not found or has been logged out already. Try closing the app and opening it again.'
      );
    }

    try {
      const filePath = input.file.path;
      const fileExists = await this.app.fs.exists(filePath);

      if (!fileExists) {
        throw new MutationError(
          MutationErrorCode.FileNotFound,
          `Avatar file does not exist`
        );
      }

      const avatarId = generateId(IdType.Avatar);
      const avatarPath = this.app.path.avatar(avatarId);
      const now = new Date().toISOString();

      await this.app.fs.copy(filePath, avatarPath);

      const avatarBytes = await this.app.fs.readFile(avatarPath);
      const createdAvatar = await this.app.database
        .insertInto('avatars')
        .returningAll()
        .values({
          id: avatarId,
          path: avatarPath,
          size: avatarBytes.length,
          created_at: now,
          opened_at: now,
        })
        .executeTakeFirst();

      if (!createdAvatar) {
        throw new MutationError(
          MutationErrorCode.ApiError,
          'Failed to save avatar'
        );
      }

      const url = await this.app.fs.url(avatarPath);
      if (!url) {
        await this.app.fs.delete(avatarPath);
        await this.app.database
          .deleteFrom('avatars')
          .where('id', '=', avatarId)
          .execute();

        throw new MutationError(
          MutationErrorCode.ApiError,
          'Failed to load saved avatar'
        );
      }

      eventBus.publish({
        type: 'avatar.created',
        avatar: mapAvatar(createdAvatar, url),
      });

      return {
        id: avatarId,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new MutationError(MutationErrorCode.ApiError, error.message);
      }

      throw new MutationError(
        MutationErrorCode.ApiError,
        'Unknown error occurred'
      );
    } finally {
      try {
        await this.app.fs.delete(input.file.path);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
