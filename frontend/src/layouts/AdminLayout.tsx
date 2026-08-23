import * as React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/notification.api';
import { Skeleton } from '../components/ui/Skeleton';
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
  LogOut,
  Cpu
} from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const menuItems = React.useMemo(() => {
    const isStaff = user?.role === 'staff';
    const items = [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    ];

    if (!isStaff) {
      items.push(
        { label: 'Categories', path: '/admin/categories', icon: FolderTree },
        { label: 'Services', path: '/admin/services', icon: FileSpreadsheet },
        { label: 'Forms', path: '/admin/forms', icon: FileText },
        { label: 'Workflows', path: '/admin/workflows', icon: GitFork }
      );
    }

    items.push(
      { label: 'Requests', path: '/admin/requests', icon: Users },
      { label: 'Queue Desk', path: '/admin/queue', icon: Users },
      { label: 'Appointments', path: '/admin/appointments', icon: Calendar }
    );

    if (!isStaff) {
      items.push(
        { label: 'Payments', path: '/admin/payments', icon: CreditCard },
        { label: 'Staff Management', path: '/admin/staff', icon: Users },
        { label: 'Customers', path: '/admin/customers', icon: Users },
        { label: 'CMS Config', path: '/admin/cms', icon: Settings },
        { label: 'Automation', path: '/admin/automation', icon: Cpu }
      );
    }

    return items;
  }, [user]);

  // Queries
  const unreadCountQuery = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const notificationsQuery = useQuery({
    queryKey: ['notificationsListHeader'],
    queryFn: () => notificationApi.getAll(1, 10),
    enabled: bellOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsListHeader'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsListHeader'] });
    },
  });

  const unreadCount = unreadCountQuery.data?.count || 0;
  const notificationsList = notificationsQuery.data?.notifications || [];

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
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setBellOpen(!bellOpen)}
                className="relative text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-surface-elevated cursor-pointer focus:outline-none"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-surface select-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-md border border-border bg-surface shadow-lg py-2 z-40 text-left text-xs max-h-[400px] flex flex-col justify-between">
                    <div className="px-4 py-2 border-b border-border flex justify-between items-center select-none font-bold">
                      <span className="text-text-primary">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-accent text-[10px] hover:underline cursor-pointer bg-transparent border-none"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-grow max-h-[300px]">
                      {notificationsQuery.isLoading ? (
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-8 w-full animate-pulse" />
                          <Skeleton className="h-8 w-full animate-pulse" />
                        </div>
                      ) : notificationsList.length === 0 ? (
                        <div className="p-6 text-center text-text-tertiary select-none">
                          No notifications.
                        </div>
                      ) : (
                        notificationsList.map((notif: any) => (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (notif.status !== 'read') {
                                markReadMutation.mutate(notif._id);
                              }
                            }}
                            className={cn(
                              'p-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-surface/50 text-left',
                              notif.status !== 'read' ? 'bg-accent/5 font-semibold' : ''
                            )}
                          >
                            <div className="font-bold text-text-primary text-[11px]">{notif.title}</div>
                            <p className="text-text-secondary text-[10px] mt-0.5 leading-relaxed">{notif.message}</p>
                            <span className="text-[8px] text-text-tertiary font-mono block mt-1 select-none">
                              {new Date(notif.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
                      to="/portal/profile"
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
