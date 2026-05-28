import { createRoute, redirect } from '@tanstack/react-router';

import { LogoutContainer } from '@colanode/ui/components/auth/logout-container';
import { LogoutTab } from '@colanode/ui/components/auth/logout-tab';
import { getWorkspaceUserId, isLocalOnlyMode } from '@colanode/ui/routes/utils';
import {
  workspaceRoute,
  workspaceMaskRoute,
} from '@colanode/ui/routes/workspace';

export const logoutRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/logout',
  component: LogoutContainer,
  beforeLoad: (ctx) => {
    if (isLocalOnlyMode()) {
      throw redirect({
        to: '/workspace/$userId/settings',
        params: { userId: ctx.params.userId },
        replace: true,
      });
    }
  },
  context: () => {
    return {
      tab: <LogoutTab />,
    };
  },
});

export const logoutMaskRoute = createRoute({
  getParentRoute: () => workspaceMaskRoute,
  path: '/logout',
  component: () => null,
  beforeLoad: (ctx) => {
    const userId = getWorkspaceUserId(ctx.params.workspaceId);
    if (userId) {
      throw redirect({
        to: '/workspace/$userId/logout',
        params: { userId },
        replace: true,
      });
    }
  },
});
