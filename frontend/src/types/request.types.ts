export type RequestStatus = 'draft' | 'submitted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
export type RequestPriority = 'normal' | 'urgent' | 'vip' | 'senior_citizen' | 'disabled';
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'reupload_required';
export type PaymentSummaryStatus = 'pending' | 'partial' | 'paid';

export interface RequestDocument {
  _id: string;
  type: string;
  url: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  verificationStatus: DocumentVerificationStatus;
  verificationRemark?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Request {
  _id: string;
  applicationNumber: string; // format: CSC-YYYY-NNNNNN
  category: string;
  service: string;
  customer: string;
  formSubmission: string;
  workflow: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  currentStage: string;
  status: RequestStatus;
  completionPercentage: number;
  priority: RequestPriority;
  assignedTo?: string | { _id: string; name: string; email?: string };
  acceptedBy?: string | { _id: string; name: string; email?: string };
  acceptedAt?: string;
  documents: RequestDocument[];
  paymentSummary: { totalAmount: number; paidAmount: number; status: PaymentSummaryStatus };
  tags: string[];
  appliedOn: string;
  completedOn?: string;
  createdAt: string;
}

// PATCH /requests/:id/stage body
interface MoveStageBody {
  targetStage: string;
  remark?: string;
  context?: { paymentCompleted?: boolean; documentsVerified?: boolean; tokenGenerated?: boolean; appointmentBooked?: boolean };
}

// POST /requests/bulk body
interface BulkActionBody {
  requestIds: string[];
  action: 'assign' | 'approve' | 'reject' | 'cancel' | 'tag';
  targetStage?: string; // for approve/reject
  assignedTo?: string;  // for assign
  tag?: string;         // for tag
  remark?: string;
}
