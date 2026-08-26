import mongoose from 'mongoose';
import { LoggerService } from './logger.service';

export interface DatabaseHealthReport {
  status: 'healthy' | 'warning' | 'critical' | 'disconnected';
  latencyMs: number;
  readyState: number;
  readyStateText: string;
  host?: string;
  databaseName?: string;
  collections?: number;
  poolSize?: number;
  timestamp: string;
}

export class DatabaseHealthService {
  /**
   * Pings the MongoDB database and returns comprehensive health and latency statistics.
   */
  static async checkHealth(): Promise<DatabaseHealthReport> {
    const readyState = mongoose.connection.readyState;
    const readyStateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const readyStateText = readyStateMap[readyState] || 'unknown';

    if (readyState !== 1 || !mongoose.connection.db) {
      return {
        status: 'disconnected',
        latencyMs: -1,
        readyState,
        readyStateText,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const adminDb = mongoose.connection.db.admin();
      await adminDb.ping();
      const latencyMs = Date.now() - start;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (latencyMs > 500) {
        status = 'critical';
      } else if (latencyMs > 100) {
        status = 'warning';
      }

      const collections = (await mongoose.connection.db.listCollections().toArray()).length;

      return {
        status,
        latencyMs,
        readyState,
        readyStateText,
        host: mongoose.connection.host,
        databaseName: mongoose.connection.name,
        collections,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      LoggerService.error('Failed to ping database for health check', err);
      return {
        status: 'critical',
        latencyMs: -1,
        readyState,
        readyStateText,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
