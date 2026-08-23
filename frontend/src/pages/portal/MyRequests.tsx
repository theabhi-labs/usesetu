import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { requestApi } from '../../services/request.api';
import type { Request } from '../../types/request.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusPill } from '../../components/ui/StatusPill';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';

export function MyRequests() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const requestsQuery = useQuery({
    queryKey: ['portalMyRequestsList', page, limit],
    queryFn: () => requestApi.getMyRequests(page, limit),
  });

  const requests: Request[] = requestsQuery.data?.requests || [];
  const pagination = requestsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">My Applications</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Review processing progress and timelines for your requests.</p>
        </div>
      </div>

      {requestsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
          <p className="text-sm text-text-secondary mb-4">You have not submitted any service applications yet.</p>
          <Link to="/">
            <Button size="sm">Browse Catalogue</Button>
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Application Number</TH>
                <TH>Applicant Name</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Completion</TH>
                <TH className="text-center">Handled By</TH>
                <TH className="text-right">Dues Status</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Action</th>
              </TR>
            </THead>
            <TBody>
              {requests.map((req) => (
                <TR key={req._id}>
                  <TD className="font-mono font-bold text-accent select-all">{req.applicationNumber}</TD>
                  <TD className="font-semibold text-text-primary">{req.customerName}</TD>
                  <TD className="text-center">
                    <StatusPill status={req.status} />
                  </TD>
                  <TD className="text-center select-none">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1 bg-border-strong rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${req.completionPercentage || 0}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">{req.completionPercentage || 0}%</span>
                    </div>
                  </TD>
                  <TD className="text-center select-none text-text-secondary text-xs">
                    {req.assignedTo && typeof req.assignedTo === 'object' ? req.assignedTo.name : 'Processing Desk'}
                  </TD>
                  <TD className="text-right font-mono text-xs select-none">
                    ₹{req.paymentSummary?.totalAmount - req.paymentSummary?.paidAmount}
                  </TD>
                  <td className="py-3 px-4 text-right select-none">
                    <Link to={`/portal/requests/${req._id}`} className="text-accent hover:underline text-xs font-semibold">
                      Track
                    </Link>
                  </td>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 select-none">
              <span className="text-xs text-text-secondary">
                Showing {requests.length} of {pagination.total} records
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
