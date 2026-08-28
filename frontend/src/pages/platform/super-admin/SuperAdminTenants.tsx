import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Activity,
  Globe,
  Crown,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminTenantItem } from '../../../types/superAdmin.types';

export const SuperAdminTenants: React.FC = () => {
  const [tenants, setTenants] = useState<SuperAdminTenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getTenants({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTenants(res.tenants);
      setTotalPages(res.pagination.pages);
      setTotalCount(res.pagination.total);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch tenants directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTenants();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Suspended
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-extrabold text-text-primary">CSC & Tenant Applications Directory</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Global directory of all {totalCount} provisioned digital service centers and CSC operators across India.
          </p>
        </div>
        <button
          onClick={fetchTenants}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border/30 text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface p-4 rounded-xl border border-border">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by center name or subdomain slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-text-secondary">Loading tenants...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-xs font-semibold">{error}</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-xs">
            No applications found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/50 text-[11px] font-extrabold uppercase text-text-tertiary tracking-wider">
                  <th className="py-3 px-4">Center / Application</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Plan & Status</th>
                  <th className="py-3 px-4 text-center">Users</th>
                  <th className="py-3 px-4 text-center">Requests</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-text-primary">{t.name}</div>
                      <div className="text-[11px] text-text-tertiary">Slug: {t.slug}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{t.owner.name}</div>
                      <div className="text-[11px] text-text-tertiary">{t.owner.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-accent font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{t.defaultDomain}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(t.status)}
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-accent/10 text-accent border border-accent/20">
                          {t.subscription.plan}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-text-primary">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>{t.stats.users}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-text-primary">
                      <div className="flex items-center justify-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>{t.stats.requests}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/platform/super-admin/tenants/${t.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-primary transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface-elevated/30 text-xs">
          <span className="text-text-tertiary">
            Page {page} of {totalPages} ({totalCount} total centers)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg bg-surface border border-border disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg bg-surface border border-border disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
