import type { Role } from './auth.types';

export type StageType = 'initial' | 'intermediate' | 'final' | 'rejected' | 'cancelled';

export interface WorkflowStage {
  key: string;
  title: string;
  description?: string;
  color: string;
  backgroundColor: string;
  icon?: string;
  order: number;
  completionPercentage: number; // 0-100
  estimatedDurationValue?: number;
  estimatedDurationUnit?: 'minutes' | 'hours' | 'days';
  statusType: StageType;
  visibleToCustomer: boolean;
  visibleToAdmin: boolean;
  isFinal: boolean;
  allowedRoles: Role[];
  requirements: {
    paymentRequired: boolean;
    documentVerificationRequired: boolean;
    tokenRequired: boolean;
    appointmentRequired: boolean;
  };
  notifyOnEnter: { customerEmail: boolean; customerInApp: boolean; adminEmail: boolean; adminInApp: boolean };
}

export interface WorkflowTransition {
  fromStage: string;
  toStage: string;
  label: string;
  allowedRoles: Role[];
  requireRemark: boolean;
  isRejectTransition: boolean;
  isCancelTransition: boolean;
  isReopenTransition: boolean;
}

export interface Workflow {
  _id: string;
  service: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  isDefault: boolean;
  version: number;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
}
