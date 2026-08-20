import * as React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { Bell, FileText, CreditCard, LayoutDashboard } from 'lucide-react';

export function PortalLayout() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/portal', icon: LayoutDashboard },
    { label: 'My Requests', path: '/portal/requests', icon: FileText },
    { label: 'Payments', path: '/portal/payments', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-primary">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/portal" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white select-none">C</span>
            <span className="font-bold tracking-tight text-text-primary font-sans select-none">CSC User Portal</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden sm:flex items-center gap-1 text-left">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive ? 'bg-surface-elevated text-text-primary font-semibold' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-elevated cursor-pointer">
            <Bell size={20} />
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer select-none"
            >
              <div className="h-8 w-8 rounded-full bg-border-strong flex items-center justify-center font-bold text-text-primary uppercase">
                {user?.name?.substring(0, 2)}
              </div>
              <span className="hidden md:block font-medium">{user?.name}</span>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-surface-elevated shadow-lg py-1 z-40 text-left">
                  <div className="px-4 py-2 border-b border-border text-xs text-text-tertiary select-none">
                    Customer Account
                  </div>
                  <Link
                    to="/portal/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-error hover:bg-error/5 cursor-pointer border-0 bg-transparent font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-bg p-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
