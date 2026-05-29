import ms from 'ms';

import {
  SelectDownload,
  SelectLocalFile,
  UpdateDownload,
} from '@colanode/client/databases';
import {
  JobHandler,
  JobOutput,
  JobConcurrencyConfig,
} from '@colanode/client/jobs';
import { eventBus, mapDownload, mapNode } from '@colanode/client/lib';
import { AppService } from '@colanode/client/services/app-service';
import { WorkspaceService } from '@colanode/client/services/workspaces/workspace-service';
import { DownloadStatus, LocalFileNode } from '@colanode/client/types';
import { FileStatus } from '@colanode/core';

export type FileDownloadInput = {
  type: 'file.download';
  userId: string;
  downloadId: string;
};

declare module '@colanode/client/jobs' {
  interface JobMap {
    'file.download': {
      input: FileDownloadInput;
    };
  }
}

const DOWNLOAD_RETRIES_LIMIT = 10;

export class FileDownloadJobHandler implements JobHandler<FileDownloadInput> {
  private readonly app: AppService;

  constructor(app: AppService) {
    this.app = app;
  }

  public readonly concurrency: JobConcurrencyConfig<FileDownloadInput> = {
    limit: 1,
    key: (input: FileDownloadInput) => `file.download.${input.downloadId}`,
  };

  public async handleJob(input: FileDownloadInput): Promise<JobOutput> {
    const workspace = this.app.getWorkspace(input.userId);
    if (!workspace) {
      return {
        type: 'cancel',
      };
    }

    const account = this.app.getAccount(workspace.accountId);
    if (!account) {
      return {
        type: 'cancel',
      };
    }

    const download = await this.fetchDownload(workspace, input.downloadId);
    if (!download) {
      return {
        type: 'cancel',
      };
    }

    const file = await this.fetchNode(workspace, download.file_id);
    if (!file) {
      await this.updateDownload(workspace, download.id, {
        status: DownloadStatus.Failed,
        error_code: 'file_deleted',
        error_message: 'File has been deleted',
      });

      return {
        type: 'cancel',
      };
    }

    if (this.app.meta.localOnly) {
      const localFile = await this.fetchLocalFile(workspace, download.file_id);
      if (!localFile) {
        await this.updateDownload(workspace, download.id, {
          status: DownloadStatus.Failed,
          error_code: 'local_file_missing',
          error_message: 'Local file is not available on this device',
        });

        return {
          type: 'cancel',
        };
      }

      return this.performLocalDownload(workspace, download, localFile);
    }

    if (file.status === FileStatus.Pending) {
      return {
        type: 'retry',
        delay: ms('5 seconds'),
      };
    }

    const localFile = await this.fetchLocalFile(workspace, file.id);
    if (localFile) {
      return this.performLocalDownload(workspace, download, localFile);
    }

    await this.updateDownload(workspace, download.id, {
      status: DownloadStatus.Failed,
      completed_at: new Date().toISOString(),
      progress: 0,
      error_code: 'remote_download_disabled',
      error_message: 'Remote file download has been disabled in local mode',
    });

    return {
      type: 'cancel',
    };
  }

  private async performLocalDownload(
    workspace: WorkspaceService,
    download: SelectDownload,
    localFile: SelectLocalFile
  ): Promise<JobOutput> {
    try {
      await this.updateDownload(workspace, download.id, {
        status: DownloadStatus.Downloading,
        started_at: new Date().toISOString(),
        progress: 0,
      });

      await this.app.fs.copy(localFile.path, download.path);

      await this.updateDownload(workspace, download.id, {
        status: DownloadStatus.Completed,
        completed_at: new Date().toISOString(),
        progress: 100,
        error_code: null,
        error_message: null,
      });

      return {
        type: 'success',
      };
    } catch {
      const newRetries = download.retries + 1;

      if (newRetries >= DOWNLOAD_RETRIES_LIMIT) {
        await this.updateDownload(workspace, download.id, {
          status: DownloadStatus.Failed,
          completed_at: new Date().toISOString(),
          progress: 0,
          error_code: 'file_download_failed',
          error_message:
            'Failed to copy local file after ' + newRetries + ' retries',
        });

        return {
          type: 'cancel',
        };
      }

      await this.updateDownload(workspace, download.id, {
        status: DownloadStatus.Pending,
        retries: newRetries,
        started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      });

      return {
        type: 'retry',
        delay: ms('1 minute'),
      };
    }
  }

  private async fetchDownload(
    workspace: WorkspaceService,
    downloadId: string
  ): Promise<SelectDownload | undefined> {
    return workspace.database
      .selectFrom('downloads')
      .selectAll()
      .where('id', '=', downloadId)
      .executeTakeFirst();
  }

  private async fetchNode(
    workspace: WorkspaceService,
    fileId: string
  ): Promise<LocalFileNode | undefined> {
    const node = await workspace.database
      .selectFrom('nodes')
      .selectAll()
      .where('id', '=', fileId)
      .executeTakeFirst();

    if (!node) {
      return undefined;
    }

    return mapNode(node) as LocalFileNode;
  }

  private async fetchLocalFile(
    workspace: WorkspaceService,
    fileId: string
  ): Promise<SelectLocalFile | undefined> {
    return workspace.database
      .selectFrom('local_files')
      .selectAll()
      .where('id', '=', fileId)
      .executeTakeFirst();
  }

  private async updateDownload(
    workspace: WorkspaceService,
    downloadId: string,
    values: UpdateDownload
  ): Promise<void> {
    const updatedDownload = await workspace.database
      .updateTable('downloads')
      .returningAll()
      .set(values)
      .where('id', '=', downloadId)
      .executeTakeFirst();

    if (!updatedDownload) {
      return;
    }

    eventBus.publish({
      type: 'download.updated',
      workspace: {
        workspaceId: workspace.workspaceId,
        userId: workspace.userId,
        accountId: workspace.accountId,
      },
      download: mapDownload(updatedDownload),
    });
  }
}
