import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertCircle,
  Info,
  Globe,
  HardDrive,
  CreditCard,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { NotificationsResponse } from '../../services/platform.api';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'quota' | 'domain' | 'subscription' | 'system'>('all');

  const { data, isLoading, isError, error } = useQuery<NotificationsResponse>({
    queryKey: ['platform-notifications'],
    queryFn: platformApi.getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => platformApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => platformApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.category === filter;
  });

  const getCategoryIcon = (category: string, type: string) => {
    switch (category) {
      case 'quota':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'domain':
        return <Globe className="w-4 h-4 text-orange-400" />;
      case 'subscription':
        return <CreditCard className="w-4 h-4 text-indigo-400" />;
      default:
        return type === 'error' ? (
          <AlertCircle className="w-4 h-4 text-rose-400" />
        ) : (
          <Info className="w-4 h-4 text-blue-400" />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Notifications</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational alerts, quota notices, domain verifications, and subscription updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700/60 shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'quota', label: 'Quotas & Storage' },
          { id: 'domain', label: 'Domains & DNS' },
          { id: 'subscription', label: 'Subscriptions' },
          { id: 'system', label: 'System' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              filter === f.id
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-900/60 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-6 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-rose-200">Failed to load notifications</h3>
          <p className="text-xs text-slate-400">{(error as any)?.message || 'Service unavailable'}</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-1" />
          <h3 className="text-base font-bold text-white">No notifications in this category</h3>
          <p className="text-xs text-slate-400">All your centers and quotas are operating normally.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                notif.isRead
                  ? 'border-slate-800/60 opacity-80'
                  : 'border-orange-500/30 bg-slate-900 shadow-md shadow-orange-500/5'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(notif.category, notif.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-0.5">
                    {new Date(notif.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                {notif.link && (
                  <Link
                    to={notif.link}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-lg transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}

                {!notif.isRead && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
