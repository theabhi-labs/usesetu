import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { requestApi } from '../../services/request.api';
import type { Request } from '../../types/request.types';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { Briefcase, CreditCard, Sparkles, Plus } from 'lucide-react';
import { CustomerCard } from '../../components/common/CustomerCard';
import { useAuthStore } from '../../store/authStore';

export function PortalDashboard() {
  const { user } = useAuthStore();
  const requestsQuery = useQuery({
    queryKey: ['portalRecentRequests'],
    queryFn: () => requestApi.getMyRequests(1, 5),
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
          <p className="text-xs text-text-secondary mt-0.5 select-none">Track milestones progress, review billing receipts, and upload docs.</p>
        </div>
        <Link to="/" className="select-none">
          <Button size="sm">
            <Plus size={14} className="mr-1.5" /> Apply New Service
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 select-none">
        <Card className="p-4 flex items-center gap-3">
          <Briefcase className="text-accent shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Applications</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{totalApps}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <CreditCard className="text-accent shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Pending Dues</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{pendingPayments}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Sparkles className="text-success shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Customer Status</span>
            <p className="text-lg font-bold text-success mt-0.5">VERIFIED</p>
          </div>
        </Card>
      </div>

      {/* Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Recent Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recent Applications</h3>
            <Link to="/portal/requests" className="text-accent text-xs hover:underline">
              View All
            </Link>
          </div>

          {requestsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full animate-pulse" />
              <Skeleton className="h-12 w-full animate-pulse" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
              <p className="text-sm text-text-secondary mb-4">You have not submitted any applications yet.</p>
              <Link to="/">
                <Button size="sm">Browse Services Catalog</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <Card key={req._id} className="p-4 flex items-center justify-between gap-4">
                  <div className="text-left space-y-1">
                    <span className="font-mono font-bold text-accent select-all text-xs sm:text-sm">{req.applicationNumber}</span>
                    <span className="text-xs font-semibold text-text-primary block">{req.customerName || 'Service Application'}</span>
                    {/* Progress bar */}
                    <div className="w-24 sm:w-36 h-1 bg-border-strong rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${req.completionPercentage || 0}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 select-none">
                    <StatusPill status={req.status} />
                    <Link to={`/portal/requests/${req._id}`} className="text-accent hover:underline text-xs font-semibold">
                      Track
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Customer Card */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider select-none text-left">My ID Card</h3>
          {user ? (
            <CustomerCard customer={user as any} />
          ) : (
            <Skeleton className="h-64 w-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
