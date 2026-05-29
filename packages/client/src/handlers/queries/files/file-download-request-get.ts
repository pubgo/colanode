import { WorkspaceQueryHandlerBase } from '@colanode/client/handlers/queries/workspace-query-handler-base';
import { ChangeCheckResult, QueryHandler } from '@colanode/client/lib/types';
import {
  FileDownloadRequestGetQueryInput,
  FileDownloadRequestGetQueryOutput,
} from '@colanode/client/queries/files/file-download-request-get';

export class FileDownloadRequestGetQueryHandler
  extends WorkspaceQueryHandlerBase
  implements QueryHandler<FileDownloadRequestGetQueryInput> {
  public async handleQuery(
    input: FileDownloadRequestGetQueryInput
  ): Promise<FileDownloadRequestGetQueryOutput | null> {
    this.getWorkspace(input.userId);
    return null;
  }

  public async checkForChanges(): Promise<
    ChangeCheckResult<FileDownloadRequestGetQueryInput>
  > {
    return {
      hasChanges: false,
    };
  }
}
