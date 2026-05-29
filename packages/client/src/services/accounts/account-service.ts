import { eventBus } from '@colanode/client/lib/event-bus';
import {
  mapMetadata,
} from '@colanode/client/lib/mappers';
import { AccountSocket } from '@colanode/client/services/accounts/account-socket';
import { AppService } from '@colanode/client/services/app-service';
import { Account } from '@colanode/client/types/accounts';
import {
  createDebugger,
} from '@colanode/core';

const debug = createDebugger('desktop:service:account');

export class AccountService {
  public readonly account: Account;
  public readonly socket: AccountSocket;
  public readonly app: AppService;

  constructor(account: Account, app: AppService) {
    debug(`Initializing account service for account ${account.id}`);

    this.account = account;
    this.app = app;

    this.socket = new AccountSocket(this);
  }

  public get id(): string {
    return this.account.id;
  }

  public get token(): string {
    return this.account.token;
  }

  public get deviceId(): string {
    return this.account.deviceId;
  }

  public async init(): Promise<void> {
    if (this.app.meta.localOnly) {
      debug(
        `Skipping account sync/socket initialization for account ${this.account.id} in LOCAL_ONLY mode`
      );
      return;
    }

    this.socket.init();
  }

  public updateAccount(account: Account): void {
    this.account.email = account.email;
    this.account.token = account.token;
    this.account.deviceId = account.deviceId;
  }

  public async logout(): Promise<void> {
    try {
      const workspaces = this.app
        .getWorkspaces()
        .filter((w) => w.account.id === this.account.id);

      for (const workspace of workspaces) {
        await workspace.delete();
      }

      const deletedAccount = await this.app.database
        .deleteFrom('accounts')
        .where('id', '=', this.account.id)
        .executeTakeFirst();

      if (!deletedAccount) {
        throw new Error('Failed to delete account');
      }

      const deletedMetadata = await this.app.database
        .deleteFrom('metadata')
        .returningAll()
        .where('namespace', '=', this.account.id)
        .execute();

      if (deletedMetadata.length > 0) {
        for (const metadata of deletedMetadata) {
          eventBus.publish({
            type: 'metadata.deleted',
            metadata: mapMetadata(metadata),
          });
        }
      }

      this.socket.close();

      eventBus.publish({
        type: 'account.deleted',
        account: this.account,
      });
    } catch (error) {
      debug(`Error logging out of account ${this.account.id}: ${error}`);
    }
  }
}
