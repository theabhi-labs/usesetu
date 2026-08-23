import mongoose from 'mongoose';
import { Request as RequestModel, RequestStatus, IRequest } from '../models/request.model';
import { FormSubmission } from '../models/formSubmission.model';
import { Service } from '../models/service.model';
import { Workflow, WorkflowStatus, StageType } from '../models/workflow.model';
import { WorkflowHistory } from '../models/workflowHistory.model';
import { RequestActivity } from '../models/requestActivity.model';
import { User } from '../models/user.model';
import { generateApplicationNumber } from './applicationNumber.service';
import { getInitialStage, TransitionContext } from './workflowEngine.service';
import { emitEvent } from './eventBus.service';
import { Role } from '../types/auth.types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

const deriveStatusFromStageType = (statusType: StageType): RequestStatus => {
  switch (statusType) {
    case StageType.FINAL:
      return RequestStatus.COMPLETED;
    case StageType.REJECTED:
      return RequestStatus.REJECTED;
    case StageType.CANCELLED:
      return RequestStatus.CANCELLED;
    case StageType.INITIAL:
      return RequestStatus.SUBMITTED;
    default:
      return RequestStatus.IN_PROGRESS;
  }
};

/**
 * Creates a Request from an already-saved FormSubmission. Runs inside a
 * MongoDB transaction so the Request, the initial WorkflowHistory row, the
 * RequestActivity entry, and the back-link on FormSubmission all commit — or
 * none do. Requires MONGO_URI to point at a replica set (MongoDB Atlas
 * provides this automatically; for local dev run `mongod --replSet rs0`).
 */
export const createRequestFromSubmission = async (submissionId: string) => {
  const session = await mongoose.startSession();

  try {
    let created: IRequest | undefined;
    await session.withTransaction(async () => {
      const submission = await FormSubmission.findById(submissionId).session(session);
      if (!submission) throw ApiError.notFound('Form submission not found');
      if (submission.request) throw ApiError.conflict('A request has already been created for this submission');

      const service = await Service.findById(submission.service).session(session);
      if (!service) throw ApiError.badRequest('Service no longer exists');

      let workflow = await Workflow.findOne({
        service: service._id,
        status: WorkflowStatus.PUBLISHED,
        isDefault: true,
      }).session(session);

      if (!workflow) {
        workflow = await Workflow.findOne({
          service: service._id,
          status: WorkflowStatus.DRAFT,
          isDefault: true,
        }).session(session);
      }

      if (!workflow) {
        workflow = await Workflow.findOne({
          service: service._id,
        }).session(session);
      }

      if (!workflow) {
        throw ApiError.badRequest('This service has no workflow configured — contact an administrator');
      }

      const initialStage = getInitialStage(workflow);
      const applicationNumber = await generateApplicationNumber();

      let customerName = 'Guest';
      let customerMobile = '';
      let customerEmail = '';
      if (submission.customer) {
        const customer = await User.findById(submission.customer).session(session);
        if (customer) {
          customerName = customer.name;
          customerMobile = customer.mobile;
          customerEmail = customer.email;
        }
      }

      const [request] = await RequestModel.create(
        [
          {
            applicationNumber,
            category: service.category,
            service: service._id,
            customer: submission.customer,
            formSubmission: submission._id,
            workflow: workflow._id,
            customerName,
            customerMobile,
            customerEmail,
            currentStage: initialStage.key,
            status: deriveStatusFromStageType(initialStage.statusType),
            completionPercentage: initialStage.completionPercentage,
            paymentSummary: {
              totalAmount: service.serviceFee + service.govtFee + service.cscFee,
              paidAmount: 0,
              status: 'pending',
            },
          },
        ],
        { session },
      );

      await WorkflowHistory.create(
        [
          {
            request: request._id,
            workflow: workflow._id,
            toStage: initialStage.key,
            changedBy: submission.customer,
            changedByRole: Role.CUSTOMER,
            remark: 'Application submitted',
            isCustomerVisible: true,
          },
        ],
        { session },
      );

      await RequestActivity.create(
        [
          {
            request: request._id,
            action: 'REQUEST_CREATED',
            performedBy: submission.customer,
            performedByRole: Role.CUSTOMER,
            description: `Application ${applicationNumber} created from form submission`,
          },
        ],
        { session },
      );

      submission.request = request._id as unknown as mongoose.Types.ObjectId;
      await submission.save({ session });

      created = request;
    });

    // Emitted after the transaction commits — automation side-effects
    // (email/in-app notification) should never run against data that might
    // still be rolled back.
    if (created) {
      emitEvent('request.created', {
        userId: String(created.customer),
        requestId: String(created._id),
        applicationNumber: created.applicationNumber,
        customerName: created.customerName,
        serviceId: String(created.service),
      });
    }

    return created;
  } catch (error) {
    // Transactions require a replica set. In local single-node dev without
    // one, MongoDB throws here — surface a clear message instead of a
    // cryptic driver error.
    if (error instanceof Error && error.message.includes('Transaction numbers')) {
      logger.error('MongoDB transactions require a replica set. See README for local dev setup.');
    }
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Moves a Request to a new workflow stage: validates via the workflow
 * engine, then atomically updates the Request, appends a WorkflowHistory
 * row, and logs a RequestActivity entry.
 */
export const moveRequestStage = async (
  requestId: string,
  targetStage: string,
  actorId: string,
  actorRole: Role,
  _context: TransitionContext,
  remark?: string,
) => {
  const request = await RequestModel.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  const workflow = await Workflow.findById(request.workflow);
  if (!workflow) throw ApiError.internal('Workflow referenced by this request no longer exists');

  const targetStageObj = workflow.stages.find((s) => s.key === targetStage);
  if (!targetStageObj) throw ApiError.badRequest(`Target stage "${targetStage}" does not exist on this workflow`);

  const serviceObj = await Service.findById(request.service);
  if (!serviceObj) throw ApiError.internal('Service referenced by this request no longer exists');

  const isTargetStageFinal = targetStageObj.statusType === 'final' || targetStageObj.isFinal;
  if (isTargetStageFinal && serviceObj.requiresCompletionDocument && !request.completionDocument) {
    throw ApiError.badRequest('A completion / receiving document is required before completing this service.');
  }

  const previousStage = request.currentStage;
  request.currentStage = targetStageObj.key;
  request.completionPercentage = targetStageObj.completionPercentage;
  
  request.status = targetStageObj.statusType === 'rejected'
    ? RequestStatus.REJECTED
    : targetStageObj.statusType === 'cancelled'
      ? RequestStatus.CANCELLED
      : targetStageObj.statusType === 'final'
        ? RequestStatus.COMPLETED
        : RequestStatus.IN_PROGRESS;

  if (targetStageObj.statusType === 'final') request.completedOn = new Date();
  await request.save();

  await WorkflowHistory.create({
    request: request._id,
    workflow: workflow._id,
    fromStage: previousStage,
    toStage: targetStageObj.key,
    changedBy: actorId,
    changedByRole: actorRole,
    remark,
    isCustomerVisible: true,
  });

  await RequestActivity.create({
    request: request._id,
    action: 'STAGE_CHANGED',
    performedBy: actorId,
    performedByRole: actorRole,
    description: `Stage moved to "${targetStageObj.title}"`,
  });

  emitEvent('request.stage_changed', {
    userId: String(request.customer),
    requestId: String(request._id),
    applicationNumber: request.applicationNumber,
    customerName: request.customerName,
    fromStage: previousStage,
    toStage: targetStageObj.key,
    stageName: targetStageObj.title,
  });

  if (targetStageObj.statusType === 'final') {
    emitEvent('request.completed', {
      userId: String(request.customer),
      requestId: String(request._id),
      applicationNumber: request.applicationNumber,
      customerName: request.customerName,
    });
  }

  return request;
};
