import * as React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/notification.api';
import { Skeleton } from '../components/ui/Skeleton';
import { Bell, FileText, CreditCard, LayoutDashboard, Folder, User } from 'lucide-react';

export function PortalLayout() {
  const { user } = useAuthStore();
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

  const navLinks = [
    { label: 'Dashboard', path: '/portal', icon: LayoutDashboard },
    { label: 'My Requests', path: '/portal/requests', icon: FileText },
    { label: 'Payments', path: '/portal/payments', icon: CreditCard },
    { label: 'Locker', path: '/portal/locker', icon: Folder },
    { label: 'Profile', path: '/portal/profile', icon: User },
  ];

  // Queries
  const unreadCountQuery = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000,
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
      <main className="flex-grow overflow-y-auto bg-bg p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
