export type TokenStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped' | 'cancelled' | 'expired';
export type TokenPriority = 'normal' | 'senior_citizen' | 'pregnant' | 'disabled' | 'vip' | 'emergency';

export interface QueueToken {
  _id: string;
  tokenNumber: string; // e.g. "AAD-001"
  queue: string;
  service: string;
  customer?: string;
  tokenDate: string; // 'YYYY-MM-DD'
  status: TokenStatus;
  priority: TokenPriority;
  counter?: string;
  estimatedCallTime?: string;
  calledAt?: string;
  completedAt?: string;
}

// GET /queue/current response .data
export interface QueueLiveStatus {
  nowServing: { tokenNumber: string; counter?: string; status: TokenStatus; calledAt?: string }[];
  waitingCount: number;
  nextUp: { tokenNumber: string; priority: TokenPriority }[];
  estimatedWaitMinutes: number;
  displayEnabled: boolean;
}
