import { Kysely } from 'kysely';
import ms from 'ms';

import {
  EmojiDatabaseSchema,
  IconDatabaseSchema,
} from '@colanode/client/databases';
import { eventBus, mapAvatar } from '@colanode/client/lib';
import { AppService } from '@colanode/client/services/app-service';
import { Avatar } from '@colanode/client/types/avatars';

export class AssetService {
  private readonly app: AppService;

  public readonly emojis: Kysely<EmojiDatabaseSchema>;
  public readonly icons: Kysely<IconDatabaseSchema>;

  constructor(app: AppService) {
    this.app = app;

    this.emojis = this.app.kysely.build<EmojiDatabaseSchema>({
      path: this.app.path.emojisDatabase,
      readonly: true,
    });

    this.icons = this.app.kysely.build<IconDatabaseSchema>({
      path: this.app.path.iconsDatabase,
      readonly: true,
    });
  }

  public async getAvatar(
    accountId: string,
    avatar: string,
    autoDownload?: boolean
  ): Promise<Avatar | null> {
    const updatedAvatar = await this.app.database
      .updateTable('avatars')
      .returningAll()
      .set({
        opened_at: new Date().toISOString(),
      })
      .where('id', '=', avatar)
      .executeTakeFirst();

    if (updatedAvatar) {
      const url = await this.app.fs.url(updatedAvatar.path);
      if (!url) {
        await this.app.fs.delete(updatedAvatar.path);
        await this.app.database
          .deleteFrom('avatars')
          .where('id', '=', avatar)
          .execute();

        return null;
      }

      return mapAvatar(updatedAvatar, url);
    }

    if (autoDownload && !this.app.meta.localOnly) {
      await this.app.jobs.addJob(
        {
          type: 'avatar.download',
          accountId,
          avatar,
        },
        {
          deduplication: {
            key: `avatar.download.${avatar}`,
          },
          retries: 5,
        }
      );
    }

    return null;
  }

  public async downloadAvatar(
    accountId: string,
    _avatar: string
  ): Promise<boolean | null> {
    const account = this.app.getAccount(accountId);
    if (!account) {
      return null;
    }

    if (this.app.meta.localOnly || !account.server.isAvailable) {
      return false;
    }

    // Remote avatar download has been disabled in local-first mode.
    return false;
  }

  public async cleanupAvatars(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - ms('7 days')).toISOString();
    const unopenedAvatars = await this.app.database
      .deleteFrom('avatars')
      .where('opened_at', '<', sevenDaysAgo)
      .returningAll()
      .execute();

    for (const avatar of unopenedAvatars) {
      await this.app.fs.delete(avatar.path);

      eventBus.publish({
        type: 'avatar.deleted',
        avatar: mapAvatar(avatar, ''),
      });
    }
  }
}
