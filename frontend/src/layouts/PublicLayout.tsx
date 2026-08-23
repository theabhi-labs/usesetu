import { Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { cmsApi } from '../services/cms.api';

export function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore();

  const settingsQuery = useQuery({
    queryKey: ['cmsSettings'],
    queryFn: cmsApi.getSettings,
  });

  const headerMenuQuery = useQuery({
    queryKey: ['cmsMenu', 'header'],
    queryFn: () => cmsApi.getMenu('header'),
  });

  const footerMenuQuery = useQuery({
    queryKey: ['cmsMenu', 'footer'],
    queryFn: () => cmsApi.getMenu('footer'),
  });

  const settings = settingsQuery.data;
  const headerLinks = headerMenuQuery.data || [];
  const footerLinks = footerMenuQuery.data || [];

  const websiteName = settings?.cscName || 'Common Service Center';
  const isMaintenance = settings?.maintenanceMode?.enabled;
  const isStaff = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'staff');

  if (isMaintenance && !isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-bg text-text-primary">
        <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center text-warning border border-warning/30 animate-pulse text-2xl font-bold">
          !
        </div>
        <h1 className="text-3xl font-bold mt-6 tracking-tight select-none">System Under Maintenance</h1>
        <p className="text-text-secondary mt-2 max-w-md leading-relaxed select-none">
          {settings?.maintenanceMode?.message || 'The portal is currently down for scheduled maintenance. Please check back later.'}
        </p>
        {settings?.maintenanceMode?.estimatedTime && (
          <p className="text-xs font-mono text-text-tertiary mt-4 uppercase">
            Estimated Duration: {settings.maintenanceMode.estimatedTime}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-primary">
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="logo" className="h-8 w-auto max-h-8" />
          ) : (
            <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white select-none">C</span>
          )}
          <span className="font-bold tracking-tight text-text-primary font-sans select-none">{websiteName}</span>
        </Link>
        <nav className="flex items-center gap-4">
          {headerLinks
            .filter((item) => item.isActive)
            .map((item) => (
              <Link
                key={item.key}
                to={item.url}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          <Link to="/track" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Track Application
          </Link>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'customer' ? '/portal' : '/admin'}
              className="text-sm font-medium text-accent hover:underline"
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-accent hover:underline">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface py-8 px-6 shrink-0 select-none">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-tertiary">
          <div className="text-left space-y-1">
            <p className="font-semibold text-text-secondary">{websiteName}</p>
            {settings?.contact?.address && <p>{settings.contact.address}</p>}
            {settings?.contact?.email && <p>Email: {settings.contact.email}</p>}
            {settings?.contact?.phone && <p>Phone: {settings.contact.phone}</p>}
          </div>
          <div className="flex gap-4">
            {footerLinks
              .filter((item) => item.isActive)
              .map((item) => (
                <Link
                  key={item.key}
                  to={item.url}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="hover:text-text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
        <p className="text-center text-[10px] text-text-tertiary mt-6">
          © {new Date().getFullYear()} {websiteName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
