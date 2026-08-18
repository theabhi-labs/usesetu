import { IWorkflowStage, IWorkflowTransition } from '../models/workflow.model';
import { Role } from '../types/auth.types';
import { ApiError } from '../utils/ApiError';

/**
 * Structural shape (not the full Mongoose Document type) so this engine
 * works identically whether the caller passes a hydrated document or a
 * `.lean()` plain object — list/read-only endpoints prefer `.lean()` for
 * performance, while write endpoints need the hydrated document to `.save()`.
 */
interface WorkflowLike {
  stages: IWorkflowStage[];
  transitions: IWorkflowTransition[];
}

/**
 * Snapshot of everything the engine needs to know about a request at the
 * moment of transition, supplied by the caller (Request Management module).
 * Kept as plain booleans rather than DB lookups so this engine has zero
 * dependency on Payment/Document/Queue models — it stays a pure function
 * over data the caller already has in hand.
 */
export interface TransitionContext {
  paymentCompleted: boolean;
  documentsVerified: boolean;
  tokenGenerated: boolean;
  appointmentBooked: boolean;
}

export interface TransitionResult {
  stage: IWorkflowStage;
  transition: IWorkflowTransition;
}

export const findStage = (workflow: WorkflowLike, key: string): IWorkflowStage | undefined =>
  workflow.stages.find((s) => s.key === key);

export const getInitialStage = (workflow: WorkflowLike): IWorkflowStage => {
  const initial = workflow.stages.find((s) => s.statusType === 'initial') ?? workflow.stages[0];
  if (!initial) throw ApiError.badRequest('Workflow has no stages configured');
  return initial;
};

/**
 * Returns the transitions available from the current stage that the given
 * role is permitted to perform — used to render available action buttons
 * in the admin UI ("Approve", "Reject", "Send Back", etc.).
 */
export const getAvailableTransitions = (
  workflow: WorkflowLike,
  currentStageKey: string,
  role: Role,
): IWorkflowTransition[] => {
  return workflow.transitions.filter((t) => t.fromStage === currentStageKey && t.allowedRoles.includes(role));
};

/**
 * Validates that a stage transition is legal: the transition must exist,
 * the actor's role must be permitted, and the target stage's requirements
 * (payment/documents/token/appointment) must already be satisfied.
 * Throws ApiError on any violation — callers should let this bubble up to
 * the centralized error handler.
 */
export const validateTransition = (
  workflow: WorkflowLike,
  currentStageKey: string,
  targetStageKey: string,
  role: Role,
  context: TransitionContext,
  remark?: string,
): TransitionResult => {
  const transition = workflow.transitions.find(
    (t) => t.fromStage === currentStageKey && t.toStage === targetStageKey,
  );
  if (!transition) {
    throw ApiError.badRequest(`No transition defined from "${currentStageKey}" to "${targetStageKey}"`);
  }

  if (!transition.allowedRoles.includes(role)) {
    throw ApiError.forbidden(`Your role is not permitted to perform "${transition.label}"`);
  }

  if (transition.requireRemark && (!remark || remark.trim().length === 0)) {
    throw ApiError.badRequest(`A remark is required to perform "${transition.label}"`);
  }

  const targetStage = findStage(workflow, targetStageKey);
  if (!targetStage) {
    throw ApiError.badRequest(`Target stage "${targetStageKey}" does not exist on this workflow`);
  }

  const { requirements } = targetStage;
  const missing: string[] = [];
  if (requirements.paymentRequired && !context.paymentCompleted) missing.push('payment');
  if (requirements.documentVerificationRequired && !context.documentsVerified) missing.push('document verification');
  if (requirements.tokenRequired && !context.tokenGenerated) missing.push('queue token');
  if (requirements.appointmentRequired && !context.appointmentBooked) missing.push('appointment booking');

  if (missing.length > 0) {
    throw ApiError.badRequest(`Cannot move to "${targetStage.title}" — missing: ${missing.join(', ')}`);
  }

  return { stage: targetStage, transition };
};

/**
 * Convenience wrapper: validates then returns the fields the caller should
 * persist on its Request document (currentStage, completionPercentage,
 * isFinal) plus the notification flags to act on. Does NOT write to the
 * database itself — the Request Management module owns that transaction
 * (it also needs to write a WorkflowHistory row and fire notifications
 * inside the same logical operation).
 */
export const moveStage = (
  workflow: WorkflowLike,
  currentStageKey: string,
  targetStageKey: string,
  role: Role,
  context: TransitionContext,
  remark?: string,
) => {
  const { stage, transition } = validateTransition(
    workflow,
    currentStageKey,
    targetStageKey,
    role,
    context,
    remark,
  );

  return {
    newStageKey: stage.key,
    completionPercentage: stage.completionPercentage,
    isFinal: stage.isFinal,
    notify: stage.notifyOnEnter,
    transitionLabel: transition.label,
    isRejectTransition: transition.isRejectTransition,
    isCancelTransition: transition.isCancelTransition,
    isReopenTransition: transition.isReopenTransition,
  };
};
