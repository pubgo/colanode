import { useState } from 'react';
import { toast } from 'sonner';

import { build, formatDate, timeAgo } from '@colanode/core';
import { useMetadata } from '@colanode/ui/hooks/use-metadata';
import { InfoBreadcrumb } from '@colanode/ui/components/app/info-breadcrumb';
import { Container } from '@colanode/ui/components/layouts/containers/container';
import { ServerAvatar } from '@colanode/ui/components/servers/server-avatar';
import { Button } from '@colanode/ui/components/ui/button';
import { Separator } from '@colanode/ui/components/ui/separator';
import { useApp } from '@colanode/ui/contexts/app';
import { useServer } from '@colanode/ui/contexts/server';
import { isLocalOnlyMode } from '@colanode/ui/routes/utils';

export const InfoContainer = () => {
  const app = useApp();
  const server = useServer();
  const localOnly = isLocalOnlyMode();
  const [storagePath] = useMetadata<string>('app', 'storage.path');
  const [isApplyingStoragePath, setIsApplyingStoragePath] = useState(false);

  const handleSelectStorageDirectory = async () => {
    const selectedPath = await window.colanode.showStorageDirectoryDialog();
    if (!selectedPath) {
      return;
    }

    if (selectedPath === storagePath) {
      toast.info('已经是当前存储目录');
      return;
    }

    const confirmed = window.confirm(
      `切换本地存储目录到以下路径后，应用会自动重启。\n\n${selectedPath}`
    );

    if (!confirmed) {
      return;
    }

    setIsApplyingStoragePath(true);

    try {
      await window.colanode.setStorageDirectory(selectedPath);
    } catch (error) {
      setIsApplyingStoragePath(false);
      toast.error(
        error instanceof Error ? error.message : '切换存储目录失败'
      );
    }
  };

  return (
    <Container type="full" breadcrumb={<InfoBreadcrumb />}>
      <div className="max-w-xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            App information
          </h2>
          <Separator className="mt-3" />
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-baseline">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm">{build.version}</span>
            <span className="text-sm text-muted-foreground">SHA</span>
            <span className="text-sm font-mono break-all">{build.sha}</span>
          </div>

          {app.type === 'desktop' && localOnly && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Local storage
                </h2>
                <Separator className="mt-2" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current path</p>
                <p className="text-sm font-mono break-all">
                  {storagePath ?? 'Not configured'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSelectStorageDirectory}
                  disabled={isApplyingStoragePath}
                >
                  {isApplyingStoragePath ? 'Applying...' : 'Change folder'}
                </Button>
                {storagePath && (
                  <Button
                    variant="ghost"
                    onClick={() => window.colanode.showItemInFolder(storagePath)}
                  >
                    Show in Finder
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Server</h2>
              <Separator className="mt-2" />
            </div>
            <div className="flex items-center gap-3">
              <ServerAvatar
                url={server.avatar}
                name={server.name}
                className="size-10 rounded-lg"
              />
              <div className="grid gap-0.5">
                <span className="text-sm font-semibold">{server.name}</span>
                <span className="text-xs text-muted-foreground">
                  {server.domain}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-baseline">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm">
                {server.state?.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm">{server.version}</span>
              <span className="text-sm text-muted-foreground">SHA</span>
              <span className="text-sm font-mono break-all">
                {server.attributes.sha ?? 'Unknown'}
              </span>
              <span className="text-sm text-muted-foreground">Domain</span>
              <span className="text-sm font-mono break-all">
                {server.domain}
              </span>
              <span className="text-sm text-muted-foreground">URL</span>
              <a
                href={server.configUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline font-mono break-all"
              >
                {server.configUrl}
              </a>
              <span className="text-sm text-muted-foreground">Last sync</span>
              <span className="text-sm">
                {server.syncedAt ? timeAgo(server.syncedAt) : 'Never'}
              </span>
              <span className="text-sm text-muted-foreground">Last ping</span>
              <span className="text-sm">
                {server.state?.lastCheckedAt
                  ? timeAgo(server.state.lastCheckedAt)
                  : 'Never'}
              </span>
              <span className="text-sm text-muted-foreground">Added</span>
              <span className="text-sm">{formatDate(server.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
