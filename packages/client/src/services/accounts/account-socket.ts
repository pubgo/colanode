import { AccountService } from '@colanode/client/services/accounts/account-service';
import { Message, createDebugger } from '@colanode/core';

const debug = createDebugger('desktop:service:account-socket');

export class AccountSocket {
  private readonly account: AccountService;

  constructor(account: AccountService) {
    this.account = account;
  }

  public async init(): Promise<void> {
    debug(
      `Skipping remote socket initialization for account ${this.account.id} in LOCAL_ONLY flow`
    );
    return;
  }

  public isConnected(): boolean {
    return false;
  }

  public send(_message: Message): boolean {
    return false;
  }

  public close(): void {
    return;
  }

  public checkConnection(): void {
    return;
  }
}
