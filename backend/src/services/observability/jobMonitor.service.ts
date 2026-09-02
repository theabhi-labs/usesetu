import crypto from 'crypto';
import { JobExecution, IJobExecution, JobStatus } from '../../models/jobExecution.model';
import { LoggerService } from './logger.service';
import { IncidentService } from './incident.service';

export interface JobRunContext {
  jobName: string;
  executionId: string;
  recordSuccess: (count?: number) => void;
  recordFailure: (count?: number, err?: unknown) => void;
  setMetadata: (meta: Record<string, unknown>) => void;
}

export class JobMonitorService {
  /**
   * Executes a background job wrapped with complete lifecycle tracking, error handling, and metrics.
   */
  static async executeJob<T>(
    jobName: string,
    handler: (ctx: JobRunContext) => Promise<T>,
    requestId?: string,
  ): Promise<{ execution: IJobExecution; result: T | null; error?: unknown }> {
    const executionId = `${jobName}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const startTime = Date.now();

    let recordsSucceeded = 0;
    let recordsFailed = 0;
    let jobMetadata: Record<string, unknown> = {};

    const execution = await JobExecution.create({
      jobName,
      executionId,
      startedAt: new Date(),
      status: 'RUNNING',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errorCount: 0,
      requestId,
    });

    LoggerService.info(`Background Job Started: ${jobName}`, { executionId, jobName });

    const ctx: JobRunContext = {
      jobName,
      executionId,
      recordSuccess: (count = 1) => {
        recordsSucceeded += count;
      },
      recordFailure: (count = 1, err?: unknown) => {
        recordsFailed += count;
        if (err) {
          LoggerService.warn(`Job ${jobName} partial error`, { err: String(err) });
        }
      },
      setMetadata: (meta: Record<string, unknown>) => {
        jobMetadata = { ...jobMetadata, ...meta };
      },
    };

    try {
      const result = await handler(ctx);
      const durationMs = Date.now() - startTime;
      const totalProcessed = recordsSucceeded + recordsFailed;

      let status: JobStatus = 'SUCCESS';
      if (recordsFailed > 0 && recordsSucceeded > 0) {
        status = 'PARTIAL';
      } else if (recordsFailed > 0 && recordsSucceeded === 0) {
        status = 'FAILED';
      }

      execution.status = status;
      execution.completedAt = new Date();
      execution.durationMs = durationMs;
      execution.recordsProcessed = totalProcessed;
      execution.recordsSucceeded = recordsSucceeded;
      execution.recordsFailed = recordsFailed;
      execution.errorCount = recordsFailed;
      execution.metadata = jobMetadata;
      await execution.save();

      LoggerService.info(`Background Job Completed: ${jobName} [${status}]`, {
        executionId,
        durationMs,
        recordsProcessed: totalProcessed,
        recordsSucceeded,
        recordsFailed,
      });

      return { execution, result };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.durationMs = durationMs;
      execution.recordsProcessed = recordsSucceeded + recordsFailed;
      execution.recordsSucceeded = recordsSucceeded;
      execution.recordsFailed = recordsFailed + 1;
      execution.errorCount = recordsFailed + 1;
      execution.lastError = errorMessage;
      execution.metadata = jobMetadata;
      await execution.save();

      LoggerService.error(`Background Job Failed: ${jobName}`, error, {
        executionId,
        durationMs,
        errorMessage,
      });

      // Trigger operational incident for background job failure
      await IncidentService.triggerIncident({
        title: `Background Job Failed: ${jobName}`,
        description: `Job ${jobName} failed after ${durationMs}ms: ${errorMessage}`,
        severity: 'P1',
        source: 'job_monitor',
        affectedService: 'cron_worker',
        metadata: { jobName, executionId, error: errorMessage },
      });

      return { execution, result: null, error };
    }
  }

  /**
   * Get job execution history
   */
  static async getJobHistory(query: { page?: number; limit?: number; jobName?: string; status?: string }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.jobName) filter.jobName = query.jobName;
    if (query.status) filter.status = query.status;

    const [jobs, total] = await Promise.all([
      JobExecution.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobExecution.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
