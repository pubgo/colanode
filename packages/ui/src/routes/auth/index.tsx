import { createRoute, redirect } from '@tanstack/react-router';

import { AuthLayout } from '@colanode/ui/components/auth/auth-layout';
import { rootRoute } from '@colanode/ui/routes/root';
import { isLocalOnlyMode } from '@colanode/ui/routes/utils';

export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthLayout,
  beforeLoad: () => {
    if (isLocalOnlyMode()) {
      throw redirect({
        to: '/',
        replace: true,
      });
    }
  },
});
