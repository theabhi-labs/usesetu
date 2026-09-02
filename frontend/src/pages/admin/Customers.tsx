import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { userApi, type UserDetail } from '../../services/user.api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { Search, User } from 'lucide-react';

interface CustomerListItem extends UserDetail {
  currentRequest?: {
    applicationNumber: string;
    serviceName: string;
    status: string;
  };
}

export function Customers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Query customers only
  const customersQuery = useQuery({
    queryKey: ['adminCustomers', page, limit, debouncedSearch, filterStatus],
    queryFn: () =>
      userApi.getAll(page, limit, debouncedSearch, 'customer', filterStatus),
  });

  const customers: CustomerListItem[] = customersQuery.data?.users || [];
  const pagination = customersQuery.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const getCustomerId = (id?: string) => {
    if (!id) return 'CUST-000000';
    return 'CUST-' + (id.length > 6 ? id.substring(id.length - 6) : id).toUpperCase();
  };

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Page Header */}
      <div className="border-b border-border pb-4 select-none">
        <h1 className="text-xl font-bold font-sans text-text-primary">Customers Directory</h1>
        <p className="text-xs text-text-secondary mt-0.5 font-sans">
          Browse customer registry database, view current application statuses, and inspect service lockers.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3.5 text-text-tertiary" />
          <Input
            placeholder="Search customer name, email, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="h-10"
        >
          <option value="">All Account Statuses</option>
          <option value="active">Active Customers</option>
          <option value="inactive">Inactive / Lockout</option>
        </Select>
      </Card>

      {/* Directory List Table */}
      <Card className="overflow-hidden">
        {customersQuery.isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full animate-pulse" />
            <Skeleton className="h-20 w-full animate-pulse" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-secondary select-none">
            No customers found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Photo</TH>
                  <TH>Name</TH>
                  <TH>Customer ID</TH>
                  <TH>Mobile</TH>
                  <TH>Email</TH>
                  <TH>Current Application</TH>
                  <TH>App Status</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {customers.map((c) => (
                  <TR key={c._id}>
                    <TD className="w-12 select-none">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-surface-elevated border border-border flex items-center justify-center font-bold text-text-secondary text-xs uppercase">
                        {c.name.substring(0, 2)}
                      </div>
                    </TD>
                    <TD className="font-bold text-text-primary">{c.name}</TD>
                    <TD className="font-mono text-xs font-bold text-accent">{getCustomerId(c._id)}</TD>
                    <TD className="font-mono text-xs">{c.mobile}</TD>
                    <TD className="text-xs">{c.email || '—'}</TD>
                    <TD className="text-xs font-medium">
                      {c.currentRequest ? (
                        <div className="space-y-0.5">
                          <span className="text-text-primary block font-semibold">{c.currentRequest.serviceName}</span>
                          <span className="text-[10px] text-text-tertiary block font-mono">{c.currentRequest.applicationNumber}</span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary">No requests</span>
                      )}
                    </TD>
                    <TD>
                      {c.currentRequest ? (
                        <StatusPill status={c.currentRequest.status} />
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TD>
                    <TD className="text-right select-none">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/admin/customers/${c._id}`)}
                      >
                        Profile
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center select-none text-xs">
            <span className="text-text-secondary">
              Showing Page {page} of {pagination.pages} ({pagination.total} customers)
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page === pagination.pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
