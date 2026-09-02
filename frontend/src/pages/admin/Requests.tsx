import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { requestApi } from '../../services/request.api';
import { serviceApi } from '../../services/service.api';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import type { Request } from '../../types/request.types';
import type { Service } from '../../types/service.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { StatusPill } from '../../components/ui/StatusPill';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Download } from 'lucide-react';

export function Requests() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeQueueTab, setActiveQueueTab] = useState<'all' | 'my' | 'unassigned'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk actions parameters
  const [bulkAction, setBulkAction] = useState<'' | 'assign' | 'tag' | 'cancel'>('');
  const [bulkVal, setBulkVal] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const requestsQuery = useQuery({
    queryKey: ['adminRequestsList', page, limit, debouncedSearch, filterService, filterStatus, filterPriority, activeQueueTab],
    queryFn: () => {
      const params: Record<string, any> = {
        service: filterService,
        status: filterStatus,
        priority: filterPriority,
      };

      if (activeQueueTab === 'my' && user) {
        params.assignedTo = (user as any).id || (user as any).userId;
      } else if (activeQueueTab === 'unassigned') {
        params.assignedTo = 'unassigned';
      }

      const cleanQ = debouncedSearch.trim();
      if (/^\d{10}$/.test(cleanQ)) {
        params.mobile = cleanQ;
      } else if (cleanQ) {
        params.search = cleanQ;
      }

      return requestApi.getAll(page, limit, params);
    },
  });

  const services: Service[] = servicesQuery.data?.services || [];
  const requests: Request[] = requestsQuery.data?.requests || [];
  const pagination = requestsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutations
  const bulkMutation = useMutation({
    mutationFn: (body: any) => requestApi.bulkAction(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestsList'] });
      setSelectedIds([]);
      setBulkAction('');
      setBulkVal('');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => requestApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestsList'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to accept request.');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(requests.map((r) => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  const handleBulkSubmit = () => {
    if (selectedIds.length === 0 || !bulkAction) return;

    const payload: Record<string, any> = {
      requestIds: selectedIds,
      action: bulkAction,
    };

    if (bulkAction === 'assign') payload.assignedTo = bulkVal;
    if (bulkAction === 'tag') payload.tag = bulkVal;

    bulkMutation.mutate(payload);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/dashboard/export/requests', {
        responseType: 'blob',
        params: {
          service: filterService,
          status: filterStatus,
          priority: filterPriority,
          search: debouncedSearch,
        },
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `requests_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export requests logs', err);
    }
  };

  return (
    <div className="p-6 text-left space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Requests Queue</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Review, verify and transition submitted digital applications.</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download size={14} className="mr-1.5" /> Export Lists
        </Button>
      </div>

      {/* Queue Tabs */}
      <div className="flex border-b border-border select-none gap-4 text-xs font-semibold pb-1">
        <button
          onClick={() => { setActiveQueueTab('all'); setPage(1); }}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeQueueTab === 'all'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          All Requests
        </button>
        <button
          onClick={() => { setActiveQueueTab('my'); setPage(1); }}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeQueueTab === 'my'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          My Workload (Assigned)
        </button>
        <button
          onClick={() => { setActiveQueueTab('unassigned'); setPage(1); }}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeQueueTab === 'unassigned'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Available Queue (Unassigned)
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Application ID / Mobile</label>
          <div className="relative">
            <Input
              placeholder="e.g. 9999999999 or CSC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Link Service</label>
          <Select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="h-9 text-xs">
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Status</label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs">
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Priority</label>
          <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="h-9 text-xs">
            <option value="">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="vip">VIP</option>
            <option value="senior_citizen">Senior Citizen</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>
      </div>

      {/* Bulk actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="p-3 border-accent bg-accent/5 flex flex-wrap items-center justify-between gap-4 select-none">
          <div className="text-xs font-semibold text-text-primary">
            Selected <span className="text-accent font-mono">{selectedIds.length}</span> items
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="h-8 text-xs py-0 px-2 max-w-[140px]"
            >
              <option value="">Choose action...</option>
              <option value="assign">Assign Staff</option>
              <option value="tag">Add Tag</option>
              <option value="cancel">Cancel Requests</option>
            </Select>
            {bulkAction === 'assign' && (
              <Input
                placeholder="Staff ID..."
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                className="h-8 text-xs max-w-[120px]"
              />
            )}
            {bulkAction === 'tag' && (
              <Input
                placeholder="Tag name..."
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                className="h-8 text-xs max-w-[120px]"
              />
            )}
            <Button size="sm" onClick={handleBulkSubmit} disabled={bulkMutation.isPending}>
              Apply
            </Button>
          </div>
        </Card>
      )}

      {requestsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
          <p className="text-sm text-text-secondary">No requests found matching search conditions.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === requests.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-accent"
                  />
                </TH>
                <TH>Application Number</TH>
                <TH>Customer Name</TH>
                <TH>Service</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Priority</TH>
                <TH className="text-center">Assigned</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Action</th>
              </TR>
            </THead>
            <TBody>
              {requests.map((req) => {
                const srvObj = services.find((s) => s._id === req.service);
                const isSelected = selectedIds.includes(req._id);

                return (
                  <TR key={req._id}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleRow(req._id, e.target.checked)}
                        className="accent-accent"
                      />
                    </TD>
                    <TD className="font-mono font-bold text-accent select-all">{req.applicationNumber}</TD>
                    <TD className="font-semibold text-text-primary">{req.customerName}</TD>
                    <TD className="text-text-secondary">{srvObj?.name || 'Service'}</TD>
                    <TD className="text-center">
                      <StatusPill status={req.status} />
                    </TD>
                    <TD className="text-center select-none">
                      <Badge
                        variant={
                          req.priority === 'urgent' || req.priority === 'vip'
                            ? 'danger'
                            : req.priority === 'normal'
                            ? 'secondary'
                            : 'warning'
                        }
                      >
                        {req.priority.replace('_', ' ')}
                      </Badge>
                    </TD>
                    <TD className="text-center text-xs text-text-secondary">
                      {(req.assignedTo as any)?.name || 'Unassigned'}
                    </TD>
                    <td className="py-3 px-4 text-right select-none">
                      <div className="flex justify-end items-center gap-2">
                        {!req.assignedTo && (
                          <Button
                            size="sm"
                            onClick={() => acceptMutation.mutate(req._id)}
                            disabled={acceptMutation.isPending}
                          >
                            Accept
                          </Button>
                        )}
                        <Link to={`/admin/requests/${req._id}`}>
                          <Button size="sm" variant="secondary">
                            Process
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </TR>
                );
              })}
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
