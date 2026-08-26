import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Tenant } from '../models/tenant.model';
import { Account } from '../models/account.model';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { SystemError } from '../models/systemError.model';
import { SystemIncident } from '../models/systemIncident.model';
import { JobExecution } from '../models/jobExecution.model';
import { SecurityEvent } from '../models/securityEvent.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { LoggerService, sanitizeLogData } from '../services/observability/logger.service';
import { ErrorTrackerService } from '../services/observability/errorTracker.service';
import { IncidentService } from '../services/observability/incident.service';
import { JobMonitorService } from '../services/observability/jobMonitor.service';
import { BillingHealthService } from '../services/observability/billingHealth.service';
import { DomainHealthService } from '../services/observability/domainHealth.service';
import { ApplicationHealthService } from '../services/observability/applicationHealth.service';
import { SecurityAuditService } from '../services/observability/securityAudit.service';
import { DatabaseHealthService } from '../services/observability/databaseHealth.service';

describe('UseSetu Stage 9 — Production Operations, Monitoring & Observability Test Suite', () => {
  let superAdminUser: any;
  let superAdminToken: string;
  let normalUser: any;
  let normalUserToken: string;
  let testTenant: any;
  let testAccount: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    try {
      await mongoose.connection.collection('systemerrors').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('systemincidents').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('jobexecutions').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('securityevents').drop();
    } catch {
      // Collection may not exist yet
    }

    await SystemError.syncIndexes();
    await SystemIncident.syncIndexes();
    await JobExecution.syncIndexes();
    await SecurityEvent.syncIndexes();

    // Ensure digital-service-center template exists
    let dscTemplate = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!dscTemplate) {
      dscTemplate = await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'csc',
        description: 'Citizen Service Center OS Blueprint',
        version: 1,
        status: TemplateStatus.ACTIVE,
      });
    }

    const stamp = Date.now();

    // Super Admin User
    superAdminUser = await User.create({
      name: 'Super Admin',
      email: `superadmin_${stamp}@usesetu.local`,
      mobile: `999${stamp.toString().slice(-7)}`,
      password: 'Password123!',
      role: Role.SUPER_ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      userId: superAdminUser._id.toString(),
      role: Role.SUPER_ADMIN,
      tokenVersion: 0,
    });

    // Normal User & Tenant Account
    testTenant = await Tenant.create({
      name: 'Test Tenant Ops',
      slug: `ops-tenant-${stamp}`,
    });

    normalUser = await User.create({
      tenantId: testTenant._id,
      name: 'Alice User',
      email: `alice_${stamp}@test.com`,
      mobile: `988${stamp.toString().slice(-7)}`,
      password: 'Password123!',
      role: Role.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    normalUserToken = generateAccessToken({
      userId: normalUser._id.toString(),
      role: Role.ADMIN,
      tokenVersion: 0,
    });

    testAccount = await Account.create({
      name: 'Alice Account',
      ownerUserId: normalUser._id,
    });

    await Application.create({
      accountId: testAccount._id,
      tenantId: testTenant._id,
      templateId: dscTemplate._id,
      templateVersion: 1,
      name: 'Operations Test Center',
      slug: `ops-center-${stamp}`,
      status: ApplicationStatus.ACTIVE,
      primaryDomain: `ops-center-${stamp}.usesetu.com`,
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup created test records
    await SystemError.deleteMany({});
    await SystemIncident.deleteMany({});
    await JobExecution.deleteMany({});
    await SecurityEvent.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // 1. HEALTH CHECKS
  // -------------------------------------------------------------------------
  describe('1. Health Checks & Diagnostics', () => {
    it('GET /health should return 200 with service, version, and uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('usesetu-api');
      expect(res.body.uptime).toBeTypeOf('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /health/live should return 200 process-level liveness without DB dependency', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /health/ready should return 200 when database is connected', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.dependencies.mongodb).toBe('connected');
    });

    it('GET /health/deep should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/health/deep');
      expect(res.status).toBe(401);
    });

    it('GET /health/deep should reject normal authenticated users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/health/deep')
        .set('Authorization', `Bearer ${normalUserToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /health/deep should allow SUPER_ADMIN with detailed diagnostics and DB latency', async () => {
      const res = await request(app)
        .get('/health/deep')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBeDefined();
      expect(res.body.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.memory).toBeDefined();
      expect(res.body.performance).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. REQUEST CORRELATION & CONTEXT
  // -------------------------------------------------------------------------
  describe('2. Request Correlation & Context Middleware', () => {
    it('should generate X-Request-ID header automatically when missing in client request', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      const requestId = res.headers['x-request-id'];
      expect(requestId).toBeDefined();
      expect(requestId.length).toBeGreaterThan(10);
    });

    it('should propagate client-supplied X-Request-ID safely in response headers', async () => {
      const customId = 'client-custom-trace-uuid-12345';
      const res = await request(app)
        .get('/health')
        .set('X-Request-ID', customId);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  // -------------------------------------------------------------------------
  // 3. STRUCTURED LOGGING & SECRET REDACTION
  // -------------------------------------------------------------------------
  describe('3. Structured Logging & Secret Redaction', () => {
    it('should recursively redact sensitive fields (passwords, tokens, razorpay secrets, CVV, OTP)', () => {
      const payload = {
        name: 'John Doe',
        password: 'SuperSecretPassword123!',
        nested: {
          apiKey: 'pk_live_abcdef123456',
          jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ',
          card: {
            cardNumber: '4111111111111111',
            cvv: '123',
            otp: '456789',
          },
          razorpay_key_secret: 'rzp_secret_998877',
        },
        items: [
          { token: 'secret_token_1' },
          { safeField: 'public_value' },
        ],
      };

      const sanitized: any = sanitizeLogData(payload);
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.nested.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.jwt).toBe('[REDACTED]');
      expect(sanitized.nested.card).toBe('[REDACTED]');
      expect(sanitized.nested.razorpay_key_secret).toBe('[REDACTED]');
      expect(sanitized.items[0].token).toBe('[REDACTED]');
      expect(sanitized.items[1].safeField).toBe('public_value');
    });

    it('should log structured messages cleanly without crashing', () => {
      expect(() => {
        LoggerService.info('Testing info log entry', { sampleKey: 'sampleValue' }, 'test_event');
        LoggerService.warn('Testing warn log entry', { attempt: 2 });
        LoggerService.error('Testing error log entry', new Error('Sample test error'));
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 4. ERROR TRACKING & FINGERPRINT DEDUPLICATION
  // -------------------------------------------------------------------------
  describe('4. Error Tracking & Deduplication', () => {
    it('should generate deterministic fingerprints for identical error signatures', () => {
      const fp1 = ErrorTrackerService.generateFingerprint('/api/v1/services', 'GET', 'Cast to ObjectId failed', 'hash123');
      const fp2 = ErrorTrackerService.generateFingerprint('/api/v1/services', 'GET', 'Cast to ObjectId failed', 'hash123');
      const fp3 = ErrorTrackerService.generateFingerprint('/api/v1/services', 'POST', 'Cast to ObjectId failed', 'hash123');

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
    });

    it('should track and deduplicate repeated error occurrences by incrementing occurrenceCount', async () => {
      const err1 = await ErrorTrackerService.trackError({
        errorCode: 'DATABASE_TIMEOUT',
        message: 'Mongo query timed out after 30000ms',
        route: '/api/v1/platform/billing',
        method: 'GET',
        severity: 'P1',
      });

      expect(err1).toBeDefined();
      expect(err1?.occurrenceCount).toBe(1);

      const err2 = await ErrorTrackerService.trackError({
        errorCode: 'DATABASE_TIMEOUT',
        message: 'Mongo query timed out after 30000ms',
        route: '/api/v1/platform/billing',
        method: 'GET',
        severity: 'P1',
      });

      expect(err2).toBeDefined();
      expect(err2?.fingerprint).toBe(err1?.fingerprint);
      expect(err2?.occurrenceCount).toBe(2);

      // Verify only 1 document exists for this fingerprint
      const count = await SystemError.countDocuments({ fingerprint: err1?.fingerprint });
      expect(count).toBe(1);
    });

    it('should allow resolving tracked errors', async () => {
      const err = await ErrorTrackerService.trackError({
        errorCode: 'SYNTAX_ERROR',
        message: 'Unexpected token in JSON',
        route: '/api/v1/upload',
        method: 'POST',
      });

      expect(err?.status).toBe('UNRESOLVED');
      const resolved = await ErrorTrackerService.resolveError(err!._id.toString());
      expect(resolved?.status).toBe('RESOLVED');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. INCIDENT MANAGEMENT
  // -------------------------------------------------------------------------
  describe('5. Incident Lifecycle & Deduplication', () => {
    it('should open new incident and deduplicate subsequent occurrences', async () => {
      const inc1 = await IncidentService.triggerIncident({
        title: 'High Database Ping Latency',
        description: 'Ping latency reached 650ms',
        severity: 'P1',
        source: 'database_health',
      });

      expect(inc1.status).toBe('OPEN');
      expect(inc1.occurrenceCount).toBe(1);

      const inc2 = await IncidentService.triggerIncident({
        title: 'High Database Ping Latency',
        description: 'Ping latency reached 720ms',
        severity: 'P1',
        source: 'database_health',
      });

      expect(inc2._id.toString()).toBe(inc1._id.toString());
      expect(inc2.occurrenceCount).toBe(2);
    });

    it('should support acknowledging and resolving incidents', async () => {
      const inc = await IncidentService.triggerIncident({
        title: 'Webhook Backlog Detected',
        description: '50 events pending',
        severity: 'P2',
      });

      const ack = await IncidentService.acknowledgeIncident(inc._id.toString(), superAdminUser._id);
      expect(ack?.status).toBe('ACKNOWLEDGED');
      expect(ack?.acknowledgedAt).toBeDefined();

      const resolved = await IncidentService.resolveIncident(inc._id.toString(), superAdminUser._id);
      expect(resolved?.status).toBe('RESOLVED');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 6. BACKGROUND JOB MONITORING
  // -------------------------------------------------------------------------
  describe('6. Background Job Monitoring', () => {
    it('should track successful job runs with records processed and duration', async () => {
      const { execution, result } = await JobMonitorService.executeJob('test-cleanup-job', async (ctx) => {
        ctx.recordSuccess(15);
        ctx.setMetadata({ cleanedRecords: 15 });
        return { count: 15 };
      });

      expect(execution.status).toBe('SUCCESS');
      expect(execution.recordsSucceeded).toBe(15);
      expect(execution.recordsProcessed).toBe(15);
      expect(execution.durationMs).toBeGreaterThanOrEqual(0);
      expect(result).toEqual({ count: 15 });
    });

    it('should record failed jobs, log error details, and open a P1 operational incident', async () => {
      const { execution, error } = await JobMonitorService.executeJob('test-failing-job', async () => {
        throw new Error('Simulated database connection drop during job');
      });

      expect(execution.status).toBe('FAILED');
      expect(execution.lastError).toContain('Simulated database connection drop');
      expect(error).toBeDefined();

      // Verify incident opened automatically
      const incident = await SystemIncident.findOne({
        source: 'job_monitor',
        title: { $regex: 'test-failing-job' },
      });
      expect(incident).toBeDefined();
      expect(incident?.severity).toBe('P1');
    });
  });

  // -------------------------------------------------------------------------
  // 7. BILLING, DOMAIN & APPLICATION TELEMETRY
  // -------------------------------------------------------------------------
  describe('7. Platform Health Telemetry Aggregations', () => {
    it('BillingHealthService should aggregate read-only payment and webhook metrics accurately', async () => {
      const health = await BillingHealthService.getBillingHealth();
      expect(health.summary).toBeDefined();
      expect(health.summary.paymentSuccessRate).toBeTypeOf('number');
      expect(health.webhooks).toBeDefined();
      expect(health.webhooks.webhookSuccessRate).toBeTypeOf('number');
      expect(health.subscriptions).toBeDefined();
      expect(health.subscriptions.inGracePeriodCount).toBeTypeOf('number');
      expect(health.reconciliation).toBeDefined();
    });

    it('DomainHealthService should aggregate domain verification and SSL metrics', async () => {
      const domainHealth = await DomainHealthService.getDomainHealth();
      expect(domainHealth.summary).toBeDefined();
      expect(domainHealth.summary.totalDomains).toBeTypeOf('number');
      expect(domainHealth.summary.activeDomains).toBeTypeOf('number');
      expect(domainHealth.summary.pendingVerification).toBeTypeOf('number');
      expect(domainHealth.summary.sslActive).toBeTypeOf('number');
    });

    it('ApplicationHealthService should aggregate fleet counts and recent applications', async () => {
      const appHealth = await ApplicationHealthService.getApplicationHealth();
      expect(appHealth.summary.totalApplications).toBeGreaterThanOrEqual(1);
      expect(appHealth.summary.active).toBeGreaterThanOrEqual(1);
      expect(appHealth.recentApplications.length).toBeGreaterThanOrEqual(1);
    });

    it('DatabaseHealthService should measure ping latency and connection state', async () => {
      const dbHealth = await DatabaseHealthService.checkHealth();
      expect(dbHealth.status).toBe('healthy');
      expect(dbHealth.latencyMs).toBeGreaterThanOrEqual(0);
      expect(dbHealth.readyStateText).toBe('connected');
    });
  });

  // -------------------------------------------------------------------------
  // 8. SECURITY AUDIT EVENTS
  // -------------------------------------------------------------------------
  describe('8. Security Audit Events & Sanitization', () => {
    it('should log security events and sanitize sensitive payloads', async () => {
      const event = await SecurityAuditService.recordEvent({
        eventType: 'WEBHOOK_SIGNATURE_FAILED',
        severity: 'HIGH',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        route: '/api/v1/webhooks/razorpay',
        method: 'POST',
        details: {
          providedHeader: 'invalid_sig',
          secret: 'should_be_redacted_secret',
        },
      });

      expect(event).toBeDefined();
      expect(event?.eventType).toBe('WEBHOOK_SIGNATURE_FAILED');
      expect(event?.severity).toBe('HIGH');
      expect(event?.details?.secret).toBe('[REDACTED]');
    });
  });

  // -------------------------------------------------------------------------
  // 9. SUPER ADMIN OPERATIONS API & RBAC
  // -------------------------------------------------------------------------
  describe('9. Super Admin Operations API & RBAC Enforcement', () => {
    it('GET /api/v1/admin/operations/overview should reject unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/v1/admin/operations/overview');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/admin/operations/overview should reject normal users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/overview')
        .set('Authorization', `Bearer ${normalUserToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/admin/operations/overview should allow SUPER_ADMIN and return complete system overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.system.database).toBeDefined();
      expect(res.body.data.performance.p95Ms).toBeDefined();
      expect(res.body.data.billing.paymentSuccessRate).toBeDefined();
      expect(res.body.data.domains).toBeDefined();
      expect(res.body.data.applications).toBeDefined();
    });

    it('GET /api/v1/admin/operations/metrics should return API performance summary for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalRequests).toBeGreaterThanOrEqual(1);
      expect(res.body.data.p50Ms).toBeTypeOf('number');
    });

    it('GET /api/v1/admin/operations/incidents should return paginated incidents for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/incidents?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.incidents).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('GET /api/v1/admin/operations/errors should return paginated error groups for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/errors?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.errors).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('GET /api/v1/admin/operations/jobs should return background job run history for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/jobs?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.jobs).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('GET /api/v1/admin/operations/security-events should return security audit records for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/operations/security-events?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.events).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });
  });
});
