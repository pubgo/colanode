import { SelectServer } from '@colanode/client/databases';
import { FeatureKey, isFeatureSupported } from '@colanode/client/lib';
import { isServerOutdated } from '@colanode/client/lib/servers';
import { AppService } from '@colanode/client/services/app-service';
import {
  Server,
  ServerAttributes,
  ServerState,
} from '@colanode/client/types/servers';

export class ServerService {
  private readonly app: AppService;

  private name: string;
  private avatar: string;
  private attributes: ServerAttributes;
  private createdAt: Date;
  private syncedAt: Date | null;
  private version: string;
  private state: ServerState;
  private isOutdated: boolean;

  public readonly domain: string;
  public readonly configUrl: string;

  constructor(app: AppService, server: SelectServer) {
    this.app = app;
    this.domain = server.domain;
    this.name = server.name;
    this.avatar = server.avatar;
    this.attributes = JSON.parse(server.attributes) ?? {};
    this.version = server.version;
    this.createdAt = new Date(server.created_at);
    this.syncedAt = server.synced_at ? new Date(server.synced_at) : null;
    this.configUrl = this.buildConfigUrl();
    this.isOutdated = isServerOutdated(server.version);

    this.state = {
      isAvailable: !this.app.meta.localOnly,
      lastCheckedAt: new Date(),
      lastCheckedSuccessfullyAt: null,
      count: 0,
    };
  }

  public get server(): Server {
    return {
      domain: this.domain,
      name: this.name,
      avatar: this.avatar,
      attributes: this.attributes,
      version: this.version,
      createdAt: this.createdAt,
      syncedAt: this.syncedAt,
      state: this.state,
      configUrl: this.configUrl,
      isOutdated: this.isOutdated,
    };
  }

  public get isAvailable() {
    return this.state.isAvailable;
  }

  public isFeatureSupported(feature: FeatureKey) {
    return isFeatureSupported(feature, this.version);
  }

  public async init(): Promise<void> {
    return;
  }

  private buildConfigUrl() {
    const protocol = this.attributes.insecure ? 'http' : 'https';
    return this.buildBaseUrl(protocol) + '/config';
  }

  private buildBaseUrl(protocol: string) {
    const prefix = this.attributes.pathPrefix
      ? `/${this.attributes.pathPrefix}`
      : '';

    return `${protocol}://${this.domain}${prefix}`;
  }
}
