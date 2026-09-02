import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardApi } from '../../services/dashboard.api';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  Download,
  Clock,
  Briefcase,
  Users,
  CheckCircle,
  FileText,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Bookmark,
  Trash2,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { requestApi } from '../../services/request.api';
import { StatusPill } from '../../components/ui/StatusPill';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';

const COLORS = ['#FF6700', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export function AdminDashboard() {
  const { user } = useAuthStore();
  const isStaff = user?.role === 'staff';

  if (isStaff) {
    return <StaffDashboardView user={user} />;
  }

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'kpis',
    'revenueTrend',
    'requestsOverview',
    'workflowBottlenecks',
  ]);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [savedReports, setSavedReports] = useState<any[]>([]);

  // Queries
  const kpiQuery = useQuery({
    queryKey: ['adminKpi'],
    queryFn: dashboardApi.getKpi,
  });

  const revenueQuery = useQuery({
    queryKey: ['adminRevenueTrend', dateFrom, dateTo],
    queryFn: () => dashboardApi.getRevenueTrend(dateFrom, dateTo),
  });

  const requestAnalyticsQuery = useQuery({
    queryKey: ['adminRequestAnalytics'],
    queryFn: dashboardApi.getRequestAnalytics,
  });

  const workflowAnalyticsQuery = useQuery({
    queryKey: ['adminWorkflowAnalytics'],
    queryFn: dashboardApi.getWorkflowAnalytics,
  });

  const widgetQuery = useQuery({
    queryKey: ['adminWidgets'],
    queryFn: dashboardApi.getWidgets,
  });

  const reportsQuery = useQuery({
    queryKey: ['adminReports'],
    queryFn: dashboardApi.getReports,
  });

  // Sync widget layout preferences from backend
  useEffect(() => {
    if (widgetQuery.data?.layouts) {
      setWidgetOrder(widgetQuery.data.layouts);
    }
  }, [widgetQuery.data]);

  // Sync saved reports
  useEffect(() => {
    if (reportsQuery.data) {
      setSavedReports(reportsQuery.data);
    }
  }, [reportsQuery.data]);

  // Mutations
  const updateWidgetsMutation = useMutation({
    mutationFn: (layouts: string[]) => dashboardApi.updateWidgets(layouts),
  });

  const createReportMutation = useMutation({
    mutationFn: (report: { title: string; filters: any }) => dashboardApi.createReport(report),
    onSuccess: (data) => {
      setSavedReports((prev) => [...prev, data]);
      setNewReportTitle('');
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => dashboardApi.deleteReport(id),
    onSuccess: (_, variables) => {
      setSavedReports((prev) => prev.filter((r) => r._id !== variables));
    },
  });

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const nextOrder = [...widgetOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextOrder.length) return;

    // Swap
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;

    setWidgetOrder(nextOrder);
    updateWidgetsMutation.mutate(nextOrder);
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReportTitle.trim()) {
      createReportMutation.mutate({
        title: newReportTitle,
        filters: { dateFrom, dateTo },
      });
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/dashboard/export/requests', {
        responseType: 'blob',
        params: { dateFrom, dateTo },
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `requests_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export requests data', err);
    }
  };

  const kpis = kpiQuery.data || {};
  const revenueTrend = revenueQuery.data || [];
  const requestAnalytics = requestAnalyticsQuery.data || { statusBreakdown: [], topServices: [] };
  const workflowAnalytics = workflowAnalyticsQuery.data || [];

  const renderWidget = (widgetName: string, index: number) => {
    const isFirst = index === 0;
    const isLast = index === widgetOrder.length - 1;

    const WidgetControls = () => (
      <div className="flex items-center gap-1 select-none">
        <button
          disabled={isFirst}
          onClick={() => moveWidget(index, 'up')}
          className="text-text-tertiary hover:text-text-primary disabled:opacity-30 p-1 rounded hover:bg-surface-elevated cursor-pointer"
        >
          <ArrowUp size={12} />
        </button>
        <button
          disabled={isLast}
          onClick={() => moveWidget(index, 'down')}
          className="text-text-tertiary hover:text-text-primary disabled:opacity-30 p-1 rounded hover:bg-surface-elevated cursor-pointer"
        >
          <ArrowDown size={12} />
        </button>
      </div>
    );

    switch (widgetName) {
      case 'kpis':
        return (
          <div key="kpis" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider select-none">Overview KPIs</h3>
              <WidgetControls />
            </div>
            {kpiQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-3">
                  <TrendingUp className="text-accent shrink-0" size={24} />
                  <div className="text-left">
                    <span className="text-[10px] text-text-secondary uppercase select-none font-medium">Revenue Today</span>
                    <p className="text-lg font-bold font-mono text-text-primary">₹{kpis.todaysRevenue || 0}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <Briefcase className="text-accent shrink-0" size={24} />
                  <div className="text-left">
                    <span className="text-[10px] text-text-secondary uppercase select-none font-medium">Pending Requests</span>
                    <p className="text-lg font-bold font-mono text-text-primary">{kpis.pendingRequests || 0}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <CheckCircle className="text-success shrink-0" size={24} />
                  <div className="text-left">
                    <span className="text-[10px] text-text-secondary uppercase select-none font-medium">Completed Today</span>
                    <p className="text-lg font-bold font-mono text-text-primary">{kpis.completedRequestsToday || 0}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <Clock className="text-accent shrink-0" size={24} />
                  <div className="text-left">
                    <span className="text-[10px] text-text-secondary uppercase select-none font-medium">Avg Processing</span>
                    <p className="text-lg font-bold font-mono text-text-primary">
                      {kpis.avgProcessingHours || 0} hrs
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        );

      case 'revenueTrend':
        return (
          <Card key="revenueTrend" className="p-5 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text-primary text-sm">Revenue Trends</h3>
                <p className="text-[10px] text-text-secondary mt-0.5 select-none">Monitor collections and payments over duration ranges.</p>
              </div>
              <WidgetControls />
            </div>

            {revenueQuery.isLoading ? (
              <Skeleton className="h-64 w-full animate-pulse" />
            ) : revenueTrend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-text-tertiary select-none">
                No revenue records found for this period.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6700" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF6700" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#6b6b6b" fontSize={10} />
                    <YAxis stroke="#6b6b6b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626' }} />
                    <Area type="monotone" dataKey="amount" stroke="#FF6700" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        );

      case 'requestsOverview':
        return (
          <div key="requestsOverview" className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Status donut */}
            <Card className="p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h4 className="font-bold text-text-primary text-sm">Request Status</h4>
                <WidgetControls />
              </div>
              {requestAnalyticsQuery.isLoading ? (
                <Skeleton className="h-56 w-full animate-pulse" />
              ) : requestAnalytics.statusBreakdown?.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-text-tertiary select-none">No active request logs.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={requestAnalytics.statusBreakdown || []}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                      >
                        {(requestAnalytics.statusBreakdown || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Top services */}
            <Card className="p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h4 className="font-bold text-text-primary text-sm">Top Services</h4>
                <WidgetControls />
              </div>
              {requestAnalyticsQuery.isLoading ? (
                <Skeleton className="h-56 w-full animate-pulse" />
              ) : requestAnalytics.topServices?.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-text-tertiary select-none">No service metrics yet.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requestAnalytics.topServices || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="name" stroke="#6b6b6b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b6b6b" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626' }} />
                      <Bar dataKey="count" fill="#FF6700">
                        {(requestAnalytics.topServices || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        );

      case 'workflowBottlenecks':
        return (
          <Card key="workflowBottlenecks" className="p-5 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text-primary text-sm">Workflow Stage Durations</h3>
                <p className="text-[10px] text-text-secondary mt-0.5 select-none">Flags operational bottleneck steps.</p>
              </div>
              <WidgetControls />
            </div>

            {workflowAnalyticsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full animate-pulse" />
                ))}
              </div>
            ) : workflowAnalytics.length === 0 ? (
              <div className="text-center text-xs text-text-tertiary py-8 select-none">No workflow bottleneck records.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary uppercase select-none">
                      <th className="py-2.5 font-medium">Service Name</th>
                      <th className="py-2.5 font-medium">Stage Key</th>
                      <th className="py-2.5 font-medium text-right">Avg Hours</th>
                      <th className="py-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowAnalytics.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-border bg-surface hover:bg-surface-elevated/40">
                        <td className="py-3 font-semibold text-text-primary">{item.serviceName}</td>
                        <td className="py-3 font-mono text-text-secondary">{item.stageKey}</td>
                        <td className="py-3 text-right font-mono font-bold text-text-primary">{item.avgHours}</td>
                        <td className="py-3 text-right">
                          {item.isBottleneck ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-error bg-error/10 border border-error/20 px-2 py-0.5 rounded-full select-none">
                              <AlertTriangle size={10} /> BOTTLENECK
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full select-none">
                              HEALTHY
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 text-left space-y-8 w-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Admin Dashboard</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Operations center metrics and logs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs py-1"
            />
            <span className="text-text-tertiary select-none text-xs">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs py-1"
            />
          </div>

          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download size={14} className="mr-1.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Grid widgets container */}
      <div className="space-y-6">
        {widgetOrder.map((name, index) => renderWidget(name, index))}
      </div>

      {/* Saved Reports section */}
      <div className="border-t border-border pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <Bookmark size={16} className="text-accent" /> Save Filters Report
            </h3>
            <p className="text-xs text-text-secondary mt-1 select-none">Quick-save current search dates parameters.</p>
          </div>
          <form onSubmit={handleCreateReport} className="flex gap-2">
            <Input
              placeholder="Report Title..."
              value={newReportTitle}
              onChange={(e) => setNewReportTitle(e.target.value)}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm">Save</Button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-text-secondary uppercase select-none">Saved Report Definitions</h4>
          {savedReports.length === 0 ? (
            <p className="text-xs text-text-tertiary py-4 select-none">No saved search reports.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedReports.map((report) => (
                <Card key={report._id} className="p-4 flex items-center justify-between gap-4">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-xs text-text-primary block truncate">{report.title}</span>
                    <span className="text-[10px] text-text-tertiary block font-mono">
                      Filters: {report.filters?.dateFrom || 'Any'} to {report.filters?.dateTo || 'Any'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (report.filters?.dateFrom) setDateFrom(report.filters.dateFrom);
                        if (report.filters?.dateTo) setDateTo(report.filters.dateTo);
                      }}
                    >
                      Apply
                    </Button>
                    <button
                      onClick={() => deleteReportMutation.mutate(report._id)}
                      className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffDashboardView({ user }: { user: any }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const assignedQuery = useQuery({
    queryKey: ['staffAssignedRequests', user?.userId, page, debouncedSearch],
    queryFn: () =>
      requestApi.getAll(page, 10, {
        assignedTo: user?.userId,
        search: debouncedSearch,
      }),
    enabled: !!user?.userId,
  });

  const requests = assignedQuery.data?.requests || [];
  const pagination = assignedQuery.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const totalAssigned = pagination.total;
  const inProgressCount = requests.filter((r: any) => r.status === 'in_progress').length;
  const completedCount = requests.filter((r: any) => r.status === 'completed').length;

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Welcome Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold font-sans text-text-primary">Staff Operations Console</h1>
        <p className="text-xs text-text-secondary mt-0.5 select-none">Welcome back, {user?.name}. Manage your assigned applications and milestones.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        <Card className="p-4 flex items-center gap-3">
          <Briefcase className="text-accent shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Assigned Applications</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{totalAssigned}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Clock className="text-warning shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">In Progress</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{inProgressCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <CheckCircle className="text-success shrink-0" size={24} />
          <div className="text-left">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Completed Tasks</span>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{completedCount}</p>
          </div>
        </Card>
      </div>

      {/* Requests Workspace */}
      <div className="space-y-4">
        <div className="flex justify-between items-center select-none">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">My Workload Queue</h3>
        </div>

        <Card className="p-4 flex gap-4 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-text-tertiary" />
            <Input
              placeholder="Search assigned applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {assignedQuery.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full animate-pulse" />
              <Skeleton className="h-16 w-full animate-pulse" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-sm text-text-secondary select-none">
              No applications currently assigned to you.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Application No</TH>
                    <TH>Customer Name</TH>
                    <TH>Mobile</TH>
                    <TH>Status</TH>
                    <TH>Progress</TH>
                    <TH>Assigned On</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {requests.map((r: any) => (
                    <TR key={r._id}>
                      <TD className="font-mono font-bold text-accent select-all text-xs">{r.applicationNumber}</TD>
                      <TD className="font-bold text-text-primary">{r.customerName || 'Guest'}</TD>
                      <TD className="font-mono text-xs">{r.customerMobile}</TD>
                      <TD><StatusPill status={r.status} /></TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-border-strong rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${r.completionPercentage || 0}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-text-secondary">{r.completionPercentage || 0}%</span>
                        </div>
                      </TD>
                      <TD className="text-xs text-text-secondary">{new Date(r.createdAt).toLocaleDateString()}</TD>
                      <TD className="text-right">
                        <Link to={`/admin/requests/${r._id}`}>
                          <Button size="sm" variant="secondary">
                            Process
                          </Button>
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-border flex justify-between items-center select-none text-xs">
              <span className="text-text-secondary">
                Showing Page {page} of {pagination.pages} ({pagination.total} assigned)
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
    </div>
  );
}
