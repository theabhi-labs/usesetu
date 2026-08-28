import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { requestApi } from '../../services/request.api';
import type { Request } from '../../types/request.types';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { Briefcase, CreditCard, Sparkles, Plus, FileText, ArrowRight } from 'lucide-react';

export function PortalDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');
  const tenantQuery = tenantParam ? `?tenant=${tenantParam}` : '';

  const requestsQuery = useQuery({
    queryKey: ['portalRecentRequests'],
    queryFn: () => requestApi.getMyRequests(1, 10),
  });

  const requests: Request[] = requestsQuery.data?.requests || [];

  // Calculate quick stats
  const totalApps = requests.length;
  const pendingPayments = requests.filter((r) => r.paymentSummary?.status !== 'paid').length;

  return (
    <div className="p-6 text-left space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Welcome to your Portal</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">
            Track milestones progress, review billing receipts, and upload docs.
          </p>
        </div>
        <Link to={`/${tenantQuery}`} className="select-none">
          <Button size="sm" className="gap-1.5 shadow-sm">
            <Plus size={14} /> Apply New Service
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 select-none">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Briefcase size={20} />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Applications</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{totalApps}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
            <CreditCard size={20} />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Pending Dues</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{pendingPayments}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Customer Status</span>
            <p className="text-lg font-bold text-success mt-0.5">VERIFIED</p>
          </div>
        </Card>
      </div>

      {/* Full Width Recent Applications Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Recent Applications</h3>
          </div>
          <Link to={`/portal/requests${tenantQuery}`} className="text-accent text-xs font-semibold hover:underline flex items-center gap-1">
            View All Requests <ArrowRight size={12} />
          </Link>
        </div>

        {requestsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full animate-pulse rounded-xl" />
            <Skeleton className="h-16 w-full animate-pulse rounded-xl" />
            <Skeleton className="h-16 w-full animate-pulse rounded-xl" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="text-center p-12 border border-dashed border-border bg-surface select-none space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-text-tertiary">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">No applications found</p>
              <p className="text-xs text-text-secondary">You have not submitted any service applications yet.</p>
            </div>
            <Link to={`/${tenantQuery}`}>
              <Button size="sm" className="gap-1.5 mt-2">
                <Plus size={14} /> Browse Services Catalog
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {requests.map((req) => (
              <Card key={req._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border-strong transition-colors">
                <div className="text-left space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-accent select-all text-xs sm:text-sm">{req.applicationNumber}</span>
                    <span className="text-[10px] text-text-tertiary font-mono select-none">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : ''}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-text-primary block">{req.customerName || 'Service Application'}</span>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-36 sm:w-48 h-1.5 bg-border-strong rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${req.completionPercentage || 0}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-text-tertiary">{req.completionPercentage || 0}% completed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 select-none pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                  <StatusPill status={req.status} />
                  <Link
                    to={`/portal/requests/${req._id}${tenantQuery}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-text-primary hover:text-accent transition-colors"
                  >
                    Track Progress
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

