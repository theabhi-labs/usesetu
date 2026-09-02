import { internalLogger, LoggerService, sanitizeLogData } from '../services/observability/logger.service';

export const logger = internalLogger;
export { LoggerService, sanitizeLogData };
