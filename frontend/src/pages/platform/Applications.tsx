import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Server,
  LayoutGrid,
  List,
  Globe,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { ApplicationSummary } from '../../services/platform.api';
import { ApplicationCard } from '../../components/platform/ApplicationCard';
import { getTenantPublicUrl } from '../../lib/tenant';

export const ApplicationsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'provisioning' | 'suspended' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { data: applications, isLoading, isError, error, refetch } = useQuery<ApplicationSummary[]>({
    queryKey: ['platform-applications'],
    queryFn: platformApi.getApplications,
  });

  const filteredApps = (applications || []).filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.slug.toLowerCase().includes(search.toLowerCase()) ||
      app.defaultDomain.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Applications</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your provisioned digital service center applications, domains, and subscriptions.
          </p>
        </div>

        <Link
          to="/platform/create-app"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-accent/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or domain..."
            className="w-full bg-surface-elevated border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'active', 'provisioning', 'suspended', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Grid/Table Toggle */}
        <div className="hidden sm:flex items-center space-x-1 bg-surface-elevated p-1 rounded-xl border border-border">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-tertiary hover:text-text-primary'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-tertiary hover:text-text-primary'
            }`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-surface-elevated border border-border rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-error/10 border border-error/20 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-error mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">Failed to load applications</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {(error as any)?.message || 'An error occurred while fetching application records.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface text-xs font-semibold rounded-xl text-text-primary border border-border cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-surface-elevated border border-dashed border-border rounded-3xl p-12 text-center space-y-3">
          <Server className="w-10 h-10 text-text-tertiary mx-auto mb-2" />
          <h3 className="text-base font-bold text-text-primary">No applications matching your filters</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Try adjusting your search criteria or create a new application center.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-elevated text-text-tertiary font-bold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="px-6 py-4">Application</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Primary Domain</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/platform/applications/${app.id}`}
                        className="font-bold text-text-primary hover:text-accent transition-colors block text-sm"
                      >
                        {app.name}
                      </Link>
                      <span className="text-[11px] text-text-tertiary">{app.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          app.status === 'active'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 uppercase">
                        {app.subscription?.plan || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-text-secondary">
                        <Globe className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <span className="truncate max-w-[180px]">{app.defaultDomain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-tertiary">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <Link
                          to={`/platform/applications/${app.id}`}
                          className="px-3 py-1.5 bg-surface-elevated hover:bg-surface text-text-primary font-bold rounded-lg border border-border transition-colors text-xs cursor-pointer"
                        >
                          Manage
                        </Link>
                        <a
                          href={getTenantPublicUrl(app.slug, app.defaultDomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg transition-colors cursor-pointer"
                          title="Open Application"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
