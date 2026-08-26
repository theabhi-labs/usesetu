export interface RouteMetric {
  route: string;
  method: string;
  count: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  statusCodes: Record<number, number>;
  durations: number[];
}

export interface ApiPerformanceSummary {
  totalRequests: number;
  requestsPerMinute: number;
  errorRatePercent: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  slowestRoutes: {
    route: string;
    method: string;
    p95Ms: number;
    avgMs: number;
    count: number;
  }[];
  statusCodeDistribution: Record<number, number>;
  uptimeSeconds: number;
}

export class MetricsService {
  private static startTime = Date.now();
  private static routeMetrics = new Map<string, RouteMetric>();
  private static recentDurations: number[] = [];
  private static totalRequests = 0;
  private static totalErrors = 0;
  private static statusCodeCounts: Record<number, number> = {};
  private static MAX_STORED_DURATIONS = 5000;

  /**
   * Normalize route path to prevent high-cardinality route explosion
   */
  static normalizeRoute(path: string): string {
    return path
      .replace(/\/[0-9a-fA-F]{24}(\/|$)/g, '/:id$1')
      .replace(/\/[0-9a-fA-F-]{36}(\/|$)/g, '/:uuid$1')
      .replace(/\/\d+(\/|$)/g, '/:id$1')
      .split('?')[0];
  }

  /**
   * Record a finished HTTP request metric
   */
  static recordRequest(method: string, rawPath: string, statusCode: number, durationMs: number): void {
    const route = this.normalizeRoute(rawPath);
    const key = `${method.toUpperCase()} ${route}`;

    this.totalRequests++;
    this.statusCodeCounts[statusCode] = (this.statusCodeCounts[statusCode] || 0) + 1;

    if (statusCode >= 500) {
      this.totalErrors++;
    }

    if (this.recentDurations.length >= this.MAX_STORED_DURATIONS) {
      this.recentDurations.shift();
    }
    this.recentDurations.push(durationMs);

    let metric = this.routeMetrics.get(key);
    if (!metric) {
      metric = {
        route,
        method: method.toUpperCase(),
        count: 0,
        totalDurationMs: 0,
        minDurationMs: durationMs,
        maxDurationMs: durationMs,
        statusCodes: {},
        durations: [],
      };
      this.routeMetrics.set(key, metric);
    }

    metric.count++;
    metric.totalDurationMs += durationMs;
    metric.minDurationMs = Math.min(metric.minDurationMs, durationMs);
    metric.maxDurationMs = Math.max(metric.maxDurationMs, durationMs);
    metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

    if (metric.durations.length >= 500) {
      metric.durations.shift();
    }
    metric.durations.push(durationMs);
  }

  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(Math.floor((percentile / 100) * sorted.length), sorted.length - 1);
    return Math.round(sorted[index]);
  }

  /**
   * Generate aggregated performance summary
   */
  static getPerformanceSummary(): ApiPerformanceSummary {
    const uptimeMinutes = Math.max((Date.now() - this.startTime) / 60000, 0.1);
    const requestsPerMinute = Math.round((this.totalRequests / uptimeMinutes) * 10) / 10;
    const errorRatePercent = this.totalRequests > 0
      ? Math.round((this.totalErrors / this.totalRequests) * 10000) / 100
      : 0;

    const p50Ms = this.calculatePercentile(this.recentDurations, 50);
    const p95Ms = this.calculatePercentile(this.recentDurations, 95);
    const p99Ms = this.calculatePercentile(this.recentDurations, 99);

    const slowestRoutes = Array.from(this.routeMetrics.values())
      .map((m) => ({
        route: m.route,
        method: m.method,
        p95Ms: this.calculatePercentile(m.durations, 95),
        avgMs: Math.round(m.totalDurationMs / m.count),
        count: m.count,
      }))
      .sort((a, b) => b.p95Ms - a.p95Ms)
      .slice(0, 10);

    return {
      totalRequests: this.totalRequests,
      requestsPerMinute,
      errorRatePercent,
      p50Ms,
      p95Ms,
      p99Ms,
      slowestRoutes,
      statusCodeDistribution: { ...this.statusCodeCounts },
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  static reset(): void {
    this.startTime = Date.now();
    this.routeMetrics.clear();
    this.recentDurations = [];
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.statusCodeCounts = {};
  }
}
