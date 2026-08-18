import { Request as RequestModel, RequestStatus } from '../models/request.model';
import { Payment, PaymentStatus } from '../models/payment.model';
import { QueueToken } from '../models/queueToken.model';
import { Appointment } from '../models/appointment.model';
import { User } from '../models/user.model';
import { WorkflowHistory } from '../models/workflowHistory.model';
import { AnalyticsSnapshot } from '../models/analyticsSnapshot.model';
import { Role } from '../types/auth.types';

const startOfDay = (d = new Date()) => new Date(new Date(d).setHours(0, 0, 0, 0));
const endOfDay = (d = new Date()) => new Date(new Date(d).setHours(23, 59, 59, 999));

/**
 * The top-row KPI cards. All queries run in parallel via Promise.all — each
 * is backed by an existing index ({service,status,createdAt} on Request,
 * {status,createdAt} on Payment, {queue,tokenDate,status} on QueueToken,
 * {appointmentDate,status} on Appointment) so this stays fast as history
 * grows, since every query is scoped to "today" first.
 */
export const getKpiSummary = async () => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const todayDateStr = todayStart.toISOString().split('T')[0];

  const [
    todaysRevenue,
    pendingRequests,
    completedRequestsToday,
    newCustomersToday,
    todaysQueueTokens,
    todaysAppointments,
    avgProcessingTimeResult,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { status: PaymentStatus.SUCCESS, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    RequestModel.countDocuments({ status: { $in: [RequestStatus.SUBMITTED, RequestStatus.IN_PROGRESS] } }),
    RequestModel.countDocuments({ status: RequestStatus.COMPLETED, completedOn: { $gte: todayStart, $lte: todayEnd } }),
    User.countDocuments({ role: Role.CUSTOMER, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    QueueToken.countDocuments({ tokenDate: todayDateStr }),
    Appointment.countDocuments({ appointmentDate: todayDateStr }),
    RequestModel.aggregate([
      {
        $match: {
          status: RequestStatus.COMPLETED,
          completedOn: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      { $project: { processingHours: { $divide: [{ $subtract: ['$completedOn', '$createdAt'] }, 3600000] } } },
      { $group: { _id: null, avgHours: { $avg: '$processingHours' } } },
    ]),
  ]);

  return {
    todaysRevenue: todaysRevenue[0]?.total || 0,
    pendingRequests,
    completedRequestsToday,
    newCustomersToday,
    todaysQueueTokens,
    todaysAppointments,
    avgProcessingHours: Math.round((avgProcessingTimeResult[0]?.avgHours || 0) * 10) / 10,
  };
};

/**
 * Requests grouped by status/service/date over a date range, plus
 * approval/rejection rates — a single aggregation with $facet rather than
 * several separate queries against the same collection.
 */
export const getRequestAnalytics = async (dateFrom?: string, dateTo?: string) => {
  const match: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    match.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  const [result] = await RequestModel.aggregate([
    { $match: match },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byDate: [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        byService: [
          { $group: { _id: '$service', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
          { $unwind: '$service' },
          { $project: { serviceName: '$service.name', count: 1 } },
        ],
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.COMPLETED] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.REJECTED] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0] || { total: 0, completed: 0, rejected: 0 };

  return {
    byStatus: result?.byStatus || [],
    byDate: result?.byDate || [],
    topServices: result?.byService || [],
    approvalRate: totals.total > 0 ? Math.round((totals.completed / totals.total) * 1000) / 10 : 0,
    rejectionRate: totals.total > 0 ? Math.round((totals.rejected / totals.total) * 1000) / 10 : 0,
    totalRequests: totals.total,
  };
};

/**
 * New-customer growth over time, plus a simple returning-vs-new split
 * (a customer with 2+ requests counts as "returning").
 */
export const getCustomerAnalytics = async (dateFrom?: string, dateTo?: string) => {
  const match: Record<string, unknown> = { role: Role.CUSTOMER };
  if (dateFrom || dateTo) {
    match.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  const [growth, returningVsNew] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    RequestModel.aggregate([
      { $group: { _id: '$customer', requestCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          returning: { $sum: { $cond: [{ $gte: ['$requestCount', 2] }, 1, 0] } },
          oneTime: { $sum: { $cond: [{ $lt: ['$requestCount', 2] }, 1, 0] } },
        },
      },
    ]),
  ]);

  return {
    growth,
    returning: returningVsNew[0]?.returning || 0,
    oneTime: returningVsNew[0]?.oneTime || 0,
  };
};

/**
 * Top/least-used services by request volume, with revenue collected for
 * those requests — one aggregation instead of a per-service query loop.
 */
export const getServiceAnalytics = async () => {
  const results = await RequestModel.aggregate([
    {
      $group: {
        _id: '$service',
        requestCount: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.COMPLETED] }, 1, 0] } },
        revenue: { $sum: '$paymentSummary.paidAmount' },
      },
    },
    { $sort: { requestCount: -1 } },
    { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    {
      $project: {
        serviceId: '$_id',
        serviceName: '$service.name',
        requestCount: 1,
        completed: 1,
        revenue: 1,
        _id: 0,
      },
    },
  ]);

  return {
    topServices: results.slice(0, 10),
    leastUsedServices: results.slice(-10).reverse(),
  };
};

/**
 * Average time spent in each workflow stage and a simple bottleneck flag
 * (stages taking meaningfully longer than the overall average), computed
 * from WorkflowHistory, which already records every transition timestamp.
 */
export const getWorkflowAnalytics = async (workflowId?: string) => {
  const match: Record<string, unknown> = {};
  if (workflowId) match.workflow = workflowId;

  const perRequestTransitions = await WorkflowHistory.aggregate([
    { $match: match },
    { $sort: { request: 1, createdAt: 1 } },
    { $group: { _id: '$request', transitions: { $push: { stage: '$toStage', at: '$createdAt' } } } },
  ]);

  // Pairwise "time until next transition" is awkward to express purely in
  // the aggregation pipeline and only runs over the (small) transition list
  // per request, not the raw collection — fine to finish in application code.
  const stageTotals: Record<string, { totalMs: number; count: number }> = {};
  for (const doc of perRequestTransitions) {
    const transitions = doc.transitions as { stage: string; at: Date }[];
    for (let i = 0; i < transitions.length - 1; i++) {
      const stage = transitions[i].stage;
      const durationMs = new Date(transitions[i + 1].at).getTime() - new Date(transitions[i].at).getTime();
      if (!stageTotals[stage]) stageTotals[stage] = { totalMs: 0, count: 0 };
      stageTotals[stage].totalMs += durationMs;
      stageTotals[stage].count += 1;
    }
  }

  const stageAverages = Object.entries(stageTotals).map(([stage, { totalMs, count }]) => ({
    stage,
    avgHours: Math.round((totalMs / count / 3600000) * 10) / 10,
    sampleSize: count,
  }));

  const overallAvg = stageAverages.reduce((sum, s) => sum + s.avgHours, 0) / (stageAverages.length || 1);

  return stageAverages
    .map((s) => ({ ...s, isBottleneck: s.avgHours > overallAvg * 1.5 }))
    .sort((a, b) => b.avgHours - a.avgHours);
};

/**
 * Reads precomputed daily snapshots for the requested range — the fast
 * path for "revenue trend, last 90 days" style charts.
 */
export const getRevenueTrend = async (dateFrom: string, dateTo: string) => {
  const snapshots = await AnalyticsSnapshot.find({ date: { $gte: dateFrom, $lte: dateTo } })
    .select('date revenue requestsCreated requestsCompleted')
    .sort({ date: 1 })
    .lean();

  return snapshots;
};

/**
 * Computes and upserts one day's metrics. Intended to run once, nightly,
 * for "yesterday" (see jobs/snapshotAnalytics.job.ts) — never re-run for
 * historical dates except to backfill, since a day's data is immutable
 * once the day has passed.
 */
export const snapshotDailyMetrics = async (dateStr: string) => {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);

  const [requestCounts, revenueResult, newCustomers, queueTokens, appointments] = await Promise.all([
    RequestModel.aggregate([
      { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: PaymentStatus.SUCCESS, createdAt: { $gte: dayStart, $lte: dayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: Role.CUSTOMER, createdAt: { $gte: dayStart, $lte: dayEnd } }),
    QueueToken.countDocuments({ tokenDate: dateStr }),
    Appointment.countDocuments({ appointmentDate: dateStr }),
  ]);

  const countByStatus: Record<string, number> = Object.fromEntries(requestCounts.map((r) => [r._id, r.count]));

  return AnalyticsSnapshot.findOneAndUpdate(
    { date: dateStr },
    {
      date: dateStr,
      requestsCreated: Object.values(countByStatus).reduce((a, b) => a + b, 0),
      requestsCompleted: countByStatus[RequestStatus.COMPLETED] || 0,
      requestsRejected: countByStatus[RequestStatus.REJECTED] || 0,
      requestsCancelled: countByStatus[RequestStatus.CANCELLED] || 0,
      revenue: revenueResult[0]?.total || 0,
      newCustomers,
      queueTokensIssued: queueTokens,
      appointmentsBooked: appointments,
    },
    { upsert: true, new: true },
  );
};
