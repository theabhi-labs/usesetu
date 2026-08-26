import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTenantContext } from '../../lib/tenant';
import { SaaSLandingPage } from '../platform/SaaSLandingPage';
import { TenantPublicHome } from './TenantPublicHome';

/**
 * Root Home Dispatcher:
 * - On Root Domain (e.g. usesetu.com or localhost:5173 without tenant param):
 *   Renders the UseSetu SaaS Platform Landing Page ("Build Your Own Platform", Templates, Pricing).
 * - On Tenant Domain (e.g. <slug>.usesetu.com or ?tenant=<slug>):
 *   Renders the Tenant Citizen / Public Service Center Portal.
 */
export function Home() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');

  const tenantContext = useMemo(() => {
    return getTenantContext();
  }, [tenantParam]);

  if (tenantContext.isRootPlatform) {
    return <SaaSLandingPage />;
  }

  return <TenantPublicHome />;
}
