import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../services/payment.api';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { DollarSign, Printer } from 'lucide-react';

export function MyPayments() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  // Queries
  const paymentsQuery = useQuery({
    queryKey: ['portalPaymentsList', page, limit],
    queryFn: () => paymentApi.getAll(page, limit),
  });

  const receiptQuery = useQuery({
    queryKey: ['paymentReceipt', activeReceiptId],
    queryFn: () => paymentApi.getReceipt(activeReceiptId || ''),
    enabled: !!activeReceiptId,
  });

  const payments = paymentsQuery.data?.payments || [];
  const pagination = paymentsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">My Payments Ledger</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Review transactions statements and download receipts.</p>
        </div>
      </div>

      {paymentsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
          <DollarSign className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-sm text-text-secondary">No payments history found.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Receipt Number</TH>
                <TH className="text-right">Amount Paid</TH>
                <TH>Method</TH>
                <TH>Ref Transaction ID</TH>
                <TH className="text-right">Cleared Date</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Action</th>
              </TR>
            </THead>
            <TBody>
              {payments.map((pay: any) => (
                <TR key={pay._id}>
                  <TD className="font-mono text-xs select-all">{pay._id}</TD>
                  <TD className="text-right font-mono font-bold text-text-primary">₹{pay.amount}</TD>
                  <TD className="capitalize font-mono text-[10px] text-text-secondary">{pay.paymentMethod}</TD>
                  <TD className="font-mono text-xs select-all">{pay.transactionId || 'CASH_REGISTER'}</TD>
                  <TD className="text-right font-mono text-[10px] text-text-secondary">
                    {new Date(pay.paidAt).toLocaleDateString()}
                  </TD>
                  <td className="py-3 px-4 text-right select-none">
                    <Button size="sm" variant="outline" onClick={() => setActiveReceiptId(pay._id)}>
                      <Printer size={12} className="mr-1" /> Receipt
                    </Button>
                  </td>
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

      {/* Printable Receipt Dialog */}
      <Dialog isOpen={!!activeReceiptId} onClose={() => setActiveReceiptId(null)}>
        <DialogContent className="max-w-md p-6">
          {receiptQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3 animate-pulse" />
              <Skeleton className="h-40 w-full animate-pulse" />
            </div>
          ) : receiptQuery.data ? (
            <div className="space-y-6 text-left" id="printable-receipt">
              <div className="text-center border-b border-border pb-4 select-none">
                <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">CSC RECEIPT SUMMARY</h3>
                <span className="text-[10px] text-text-tertiary font-mono block mt-1">NO: {receiptQuery.data.receiptNumber}</span>
              </div>

              <div className="space-y-3 text-xs select-none">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount Paid:</span>
                  <span className="font-bold font-mono text-text-primary">₹{receiptQuery.data.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Payment Method:</span>
                  <span className="font-bold text-text-primary uppercase font-mono">{receiptQuery.data.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono text-accent">₹{receiptQuery.data.balanceAfterPayment}</span>
                </div>
              </div>

              {receiptQuery.data.qrCode && (
                <div className="flex flex-col items-center justify-center border-t border-border pt-4">
                  <img src={receiptQuery.data.qrCode} alt="Receipt QR verification link" className="w-36 h-36 border border-border p-1 bg-white" />
                  <span className="text-[9px] text-text-tertiary font-mono mt-2 select-none uppercase font-bold">SCAN TO CHECK STATUS</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border print:hidden select-none">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Button size="sm" onClick={() => setActiveReceiptId(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
