import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';

import { getTenantContext } from '../lib/tenant';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4 bg-bg text-text-primary">
        <div className="w-12 h-12 rounded-md bg-accent animate-pulse" />
        <div className="text-xs font-mono text-text-secondary select-none">INITIALIZING SESSION...</div>
        <div className="w-64 max-w-full space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const tenantContext = getTenantContext(location.search);
    let target = location.pathname + location.search;
    if (tenantContext.isRootPlatform && (location.pathname === '/admin' || location.pathname.startsWith('/admin/'))) {
      target = '/platform';
    }
    const redirectTarget = encodeURIComponent(target);
    const tenantPrefix = tenantContext.tenantSlug ? `tenant=${encodeURIComponent(tenantContext.tenantSlug)}&` : '';
    return <Navigate to={`/login?${tenantPrefix}redirect=${redirectTarget}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
