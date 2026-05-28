import { sha256 } from 'js-sha256';
import ms from 'ms';

import { EventLoop } from '@colanode/client/lib/event-loop';
import { AccountSocket } from '@colanode/client/services/accounts/account-socket';
import { WorkspaceService } from '@colanode/client/services/workspaces/workspace-service';
import {
  SynchronizerInputMessage,
  SynchronizerInput,
  SynchronizerMap,
  createDebugger,
} from '@colanode/core';

export type SynchronizerStatus = 'idle' | 'waiting' | 'processing';

const debug = createDebugger('desktop:synchronizer');

export class Synchronizer<TInput extends SynchronizerInput> {
  private readonly id: string;
  private readonly input: TInput;
  private readonly workspace: WorkspaceService;
  private readonly connection: AccountSocket;
  private readonly cursorKey: string;
  private readonly eventLoop: EventLoop;

  private readonly processor: (
    data: SynchronizerMap[TInput['type']]['data']
  ) => Promise<void>;

  private status: SynchronizerStatus = 'idle';
  private cursor: string = '0';
  private initialized: boolean = false;

  constructor(
    workspace: WorkspaceService,
    input: TInput,
    cursorKey: string,
    processor: (data: SynchronizerMap[TInput['type']]['data']) => Promise<void>
  ) {
    this.workspace = workspace;
    this.connection = workspace.account.socket;
    this.input = input;
    this.cursorKey = cursorKey;
    this.id = this.generateId();
    this.processor = processor;

    this.eventLoop = new EventLoop(
      ms('1 minute'),
      ms('1 second'),
      this.ping.bind(this)
    );

    this.eventLoop.start();
  }

  public async init() {
    this.cursor = await this.fetchCursor();
    this.initConsumer();
    this.eventLoop.start();
    this.initialized = true;
  }

  private ping() {
    if (!this.initialized) {
      return;
    }

    this.initConsumer();
  }

  private initConsumer() {
    if (this.status === 'processing') {
      return;
    }

    if (!this.connection.isConnected()) {
      return;
    }

    debug(`Initializing consumer for ${this.input.type}`);

    const message: SynchronizerInputMessage = {
      id: this.id,
      type: 'synchronizer.input',
      userId: this.workspace.userId,
      input: this.input,
      cursor: this.cursor.toString(),
    };

    const sent = this.connection.send(message);
    if (sent) {
      this.status = 'waiting';
    }
  }

  private async fetchCursor() {
    const cursor = await this.workspace.database
      .selectFrom('cursors')
      .select('value')
      .where('key', '=', this.cursorKey)
      .executeTakeFirst();

    return cursor?.value ?? '0';
  }

  public destroy() {
    this.eventLoop.stop();
  }

  public async delete() {
    this.destroy();

    await this.workspace.database
      .deleteFrom('cursors')
      .where('key', '=', this.cursorKey)
      .execute();
  }

  private generateId() {
    return sha256(
      JSON.stringify({
        userId: this.workspace.userId,
        input: this.input,
      })
    );
  }
}
