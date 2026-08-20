import * as React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import {
  LayoutDashboard,
  FolderTree,
  FileSpreadsheet,
  FileText,
  GitFork,
  Users,
  Calendar,
  CreditCard,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Services', path: '/admin/services', icon: FileSpreadsheet },
    { label: 'Forms', path: '/admin/forms', icon: FileText },
    { label: 'Workflows', path: '/admin/workflows', icon: GitFork },
    { label: 'Requests', path: '/admin/requests', icon: Users },
    { label: 'Queue Desk', path: '/admin/queue', icon: Users },
    { label: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard },
    { label: 'CMS Config', path: '/admin/cms', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-bg text-text-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r border-border bg-surface flex flex-col transition-all duration-300 z-20 shrink-0',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white select-none">C</span>
              <span className="font-bold tracking-tight text-text-primary text-sm select-none font-sans">CSC OS Admin</span>
            </div>
          )}
          {sidebarCollapsed && (
            <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white mx-auto select-none">C</span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-text-secondary hover:text-text-primary p-1 rounded-md border border-transparent hover:border-border cursor-pointer hidden md:block"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto text-left">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-accent text-white font-semibold'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer',
              sidebarCollapsed ? 'justify-center' : ''
            )}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-text-primary hidden sm:block font-sans">CSC Operations Console</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-elevated cursor-pointer">
              <Bell size={20} />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
            </button>

            {/* User Menu Dropdown */}
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
                    <div className="px-4 py-2 border-b border-border text-xs text-text-tertiary">
                      Logged in as <span className="text-text-secondary font-mono">{user?.role}</span>
                    </div>
                    <Link
                      to="/admin/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                    >
                      Settings
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

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-bg relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
