import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  CreditCard,
  Users,
  Activity,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminTenantDetails as TenantDetailsType } from '../../../types/superAdmin.types';

export const SuperAdminTenantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await superAdminApi.getTenantDetails(id);
        setTenant(res);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to fetch tenant details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-text-secondary">Loading tenant telemetry...</span>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-xl">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="font-bold text-text-primary text-sm">{error || 'Tenant not found'}</p>
        <Link
          to="/platform/super-admin/tenants"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-xs font-bold rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div className="flex items-center gap-4">
          <Link
            to="/platform/super-admin/tenants"
            className="p-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-text-primary">{tenant.identity.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {tenant.identity.status}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Slug: <span className="font-mono text-accent">{tenant.identity.slug}</span> • Created on{' '}
              {new Date(tenant.identity.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`http://${tenant.domain.defaultDomain}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-primary transition-colors"
          >
            <span>Visit Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Total Users Registered</span>
          <div className="text-2xl font-black text-text-primary mt-1">{tenant.metrics.totalUsers}</div>
        </div>
        <div className="bg-surface p-5 rounded-xl border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Active Services Configured</span>
          <div className="text-2xl font-black text-text-primary mt-1">{tenant.metrics.totalServices}</div>
        </div>
        <div className="bg-surface p-5 rounded-xl border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Total Requests Intake</span>
          <div className="text-2xl font-black text-text-primary mt-1">{tenant.metrics.totalRequests}</div>
        </div>
      </div>

      {/* Identity & Owner Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider border-b border-border pb-3">
            Center Ownership & Subscription
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Owner Name:</span>
              <span className="font-semibold text-text-primary">{tenant.identity.owner.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Owner Email:</span>
              <span className="font-semibold text-text-primary">{tenant.identity.owner.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Current Plan:</span>
              <span className="font-extrabold text-accent">
                {tenant.subscription?.planSnapshot?.name || 'Standard Tier'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Billing Cycle:</span>
              <span className="font-semibold text-text-primary capitalize">
                {tenant.subscription?.billingCycle || 'Monthly'}
              </span>
            </div>
          </div>
        </div>

        {/* Domain Routing */}
        <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider border-b border-border pb-3">
            Domain & Routing Telemetry
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Default Subdomain:</span>
              <span className="font-mono text-accent">{tenant.domain.defaultDomain}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-tertiary">Tenant Isolation ID:</span>
              <span className="font-mono text-text-secondary">{tenant.identity.tenantId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Application ID:</span>
              <span className="font-mono text-text-secondary">{tenant.identity.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
