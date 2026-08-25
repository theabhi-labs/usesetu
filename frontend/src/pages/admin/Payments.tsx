import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../services/payment.api';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, BarChart2, Calendar } from 'lucide-react';

export function Payments() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Queries
  const paymentsQuery = useQuery({
    queryKey: ['adminPaymentsList', page, limit, filterMethod, filterStatus, dateFrom, dateTo],
    queryFn: () =>
      paymentApi.getAll(page, limit, {
        paymentMethod: filterMethod,
        status: filterStatus,
        dateFrom,
        dateTo,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ['adminPaymentStats', filterMethod, filterStatus, dateFrom, dateTo],
    queryFn: () =>
      paymentApi.getStats({
        paymentMethod: filterMethod,
        status: filterStatus,
        dateFrom,
        dateTo,
      }),
  });

  const payments = paymentsQuery.data?.payments || [];
  const pagination = paymentsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const stats = statsQuery.data || { totalRevenue: 0, methodBreakdown: [], statusBreakdown: [] };

  return (
    <div className="p-6 text-left space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Payments Console</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Monitor billing logs, cash registers, refunds and payment stats.</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <DollarSign className="text-accent shrink-0" size={24} />
          <div className="text-left select-none">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Collections</span>
            <p className="text-lg font-bold font-mono text-text-primary">₹{stats.totalRevenue || 0}</p>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Payment Method</label>
          <Select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="h-9 text-xs">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="qr_code">QR Code</option>
            <option value="bank_transfer">Bank Transfer</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Status</label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs">
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">From Date</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">To Date</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
        </div>
      </div>

      {/* Graph and Logs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left 2 Cols: Logs table */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider select-none">Bookkeeping Ledger</h3>

          {paymentsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No payment transactions recorded.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Transaction ID</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Method</TH>
                    <TH className="text-center">Status</TH>
                    <TH className="text-right">Paid Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {payments.map((pay: any) => (
                    <TR key={pay._id}>
                      <TD className="font-mono text-xs select-all">{pay.transactionId || 'CASH_LOG'}</TD>
                      <TD className="text-right font-mono font-bold text-text-primary">₹{pay.amount}</TD>
                      <TD className="capitalize font-mono text-[10px] text-text-secondary">{pay.paymentMethod}</TD>
                      <TD className="text-center">
                        <Badge variant={pay.status === 'success' ? 'success' : pay.status === 'refunded' ? 'secondary' : 'danger'}>
                          {pay.status}
                        </Badge>
                      </TD>
                      <TD className="text-right font-mono text-[10px] text-text-secondary">
                        {new Date(pay.paidAt).toLocaleDateString()}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center pt-4 select-none">
                  <span className="text-xs text-text-secondary">
                    Showing {payments.length} of {pagination.total} records
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

        {/* Right 1 Col: Recharts Graph */}
        <div>
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5 select-none">
              <BarChart2 size={14} className="text-accent" /> Payment Methods
            </h3>

            {statsQuery.isLoading ? (
              <Skeleton className="h-56 w-full animate-pulse" />
            ) : !stats.methodBreakdown || stats.methodBreakdown.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-text-tertiary select-none">No active method summaries.</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.methodBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="method" stroke="#6b6b6b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#6b6b6b" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626' }} />
                    <Bar dataKey="amount" fill="#FF6700" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
