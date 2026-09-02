import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestApi } from '../../services/request.api';
import { serviceApi } from '../../services/service.api';
import { workflowApi } from '../../services/workflow.api';
import { paymentApi } from '../../services/payment.api';
import { userApi } from '../../services/user.api';
import { useAuthStore } from '../../store/authStore';
import type { Request, RequestDocument } from '../../types/request.types';
import type { Service } from '../../types/service.types';
import type { Workflow } from '../../types/workflow.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { StatusPill } from '../../components/ui/StatusPill';
import { Badge } from '../../components/ui/Badge';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import {
  ArrowLeft,
  Calendar,
  FileText,
  MessageSquare,
  DollarSign,
  History,
  AlertCircle,
  Printer,
} from 'lucide-react';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'payments' | 'comments' | 'activity'>('overview');
  const [stageRemark, setStageRemark] = useState('');
  const [transitionError, setTransitionError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (fieldKey: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = (url: string) => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  // Manual payment forms
  const [paymentType, setPaymentType] = useState<'advance' | 'partial' | 'full'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'qr_code'>('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Refund forms
  const [refundTargetPaymentId, setRefundTargetPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');

  // Comment forms
  const [commentVal, setCommentVal] = useState('');
  const [commentIsPublic, setCommentIsPublic] = useState(false);

  // Document review form
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docReviewStatus, setDocReviewStatus] = useState<'verified' | 'rejected' | 'reupload_required'>('verified');
  const [docReviewRemark, setDocReviewRemark] = useState('');

  // Printable receipt state
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  // Completion document upload states
  const [receivingFile, setReceivingFile] = useState<File | null>(null);
  const [downloadPolicy, setDownloadPolicy] = useState<'once' | 'permanent'>('permanent');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  // Document action loading and message states
  const [isDocumentActionLoading, setIsDocumentActionLoading] = useState(false);
  const [documentActionError, setDocumentActionError] = useState('');
  const [documentActionSuccess, setDocumentActionSuccess] = useState('');

  const handleReceivingAction = async (action: 'view' | 'download' | 'print') => {
    setIsDocumentActionLoading(true);
    setDocumentActionError('');
    setDocumentActionSuccess('');
    
    try {
      const blob = await requestApi.downloadCompletionDocument(id || '');

      if (action === 'download') {
        const fileUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = request?.completionDocument?.originalName || 'receiving-document';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(fileUrl);
        setDocumentActionSuccess('✓ Receiving downloaded successfully');
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] }), 1500);
      } else if (action === 'view') {
        const fileUrl = window.URL.createObjectURL(blob);
        window.open(fileUrl, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(fileUrl), 30000);
      } else if (action === 'print') {
        const fileUrl = window.URL.createObjectURL(blob);
        const printWindow = window.open(fileUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
          printWindow.print();
        }
        setTimeout(() => window.URL.revokeObjectURL(fileUrl), 30000);
      }
    } catch (err: any) {
      console.error('Document action failed:', err);
      let message = 'An error occurred while accessing the document.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message = json.message || message;
        } catch (e) {
          // ignore
        }
      } else if (err.message) {
        message = err.message;
      }
      setDocumentActionError(message);
    } finally {
      setIsDocumentActionLoading(false);
    }
  };

  // Queries
  const requestQuery = useQuery({
    queryKey: ['adminRequestDetail', id],
    queryFn: () => requestApi.getById(id || ''),
    enabled: !!id,
  });

  const request = requestQuery.data;
  const [selectedStageKey, setSelectedStageKey] = useState('');
  useEffect(() => {
    if (request?.currentStage) {
      setSelectedStageKey(request.currentStage);
    }
  }, [request?.currentStage]);
  const submission = (request as any)?.formSubmission;
  const formFields = submission?.form?.fields || [];
  const submittedValues = submission?.values || {};

  const serviceQuery = useQuery({
    queryKey: ['adminServiceDetail', request?.service],
    queryFn: () => serviceApi.getAll(1, 1, { id: request?.service }),
    enabled: !!request?.service,
  });

  const matchedService: Service | undefined = serviceQuery.data?.services?.[0];

  const workflowQuery = useQuery({
    queryKey: ['adminWorkflowDetail', typeof request?.workflow === 'string' ? request.workflow : (request?.workflow as any)?._id],
    queryFn: () => workflowApi.getById(typeof request?.workflow === 'string' ? request.workflow : (request?.workflow as any)?._id || ''),
    enabled: !!request?.workflow,
  });

  const workflow = request?.workflow && typeof request.workflow === 'object'
    ? (request.workflow as any)
    : workflowQuery.data;

  const paymentsQuery = useQuery({
    queryKey: ['requestPayments', id],
    queryFn: () => paymentApi.getAll(1, 50, { request: id }),
    enabled: !!id,
  });

  const paymentsList = paymentsQuery.data?.payments || [];

  const receiptQuery = useQuery({
    queryKey: ['paymentReceipt', activeReceiptId],
    queryFn: () => paymentApi.getReceipt(activeReceiptId || ''),
    enabled: !!activeReceiptId,
  });

  const commentsQuery = useQuery({
    queryKey: ['requestComments', id],
    queryFn: () => requestApi.getComments(id || ''),
    enabled: !!id,
  });

  const comments = commentsQuery.data || [];

  const activityQuery = useQuery({
    queryKey: ['requestActivity', id],
    queryFn: () => requestApi.getActivity(id || ''),
    enabled: !!id,
  });

  const activity = activityQuery.data || [];

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const staffQuery = useQuery({
    queryKey: ['adminStaffListForReassignment'],
    queryFn: () => userApi.getAll(1, 100, '', 'staff'),
    enabled: !!isAdmin,
  });
  const staffMembers = staffQuery.data?.users || [];

  const reassignMutation = useMutation({
    mutationFn: (assignedTo: string) => requestApi.assign(id || '', assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['requestActivity', id] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to reassign request.');
    },
  });

  // Mutations
  const moveStageMutation = useMutation({
    mutationFn: (body: any) => requestApi.moveStage(id || '', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['requestActivity', id] });
      setStageRemark('');
      setTransitionError('');
    },
    onError: (err: any) => {
      setTransitionError(err?.response?.data?.message || 'Verification checks failed.');
    },
  });

  const uploadReceivingMutation = useMutation({
    mutationFn: async (data: { file: File; downloadPolicy: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('downloadPolicy', data.downloadPolicy);
      return requestApi.uploadCompletionDocument(id || '', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      setReceivingFile(null);
      setReplacementFile(null);
      setShowUploadForm(false);
      setTransitionError('');
    },
    onError: (err: any) => {
      setTransitionError(err.message || 'Failed to upload completion document');
    },
  });

  const handleUploadReceiving = () => {
    const fileToUpload = receivingFile || replacementFile;
    if (!fileToUpload) return;
    uploadReceivingMutation.mutate({
      file: fileToUpload,
      downloadPolicy,
    });
  };

  const verifyDocMutation = useMutation({
    mutationFn: (body: { docId: string; verificationStatus: string; verificationRemark?: string }) =>
      requestApi.verifyDocument(id || '', body.docId, {
        verificationStatus: body.verificationStatus,
        verificationRemark: body.verificationRemark,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      setSelectedDocId(null);
      setDocReviewRemark('');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (body: any) => paymentApi.record(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['requestPayments', id] });
      setPaymentAmount(0);
      setPaymentTxnId('');
      setPaymentRemark('');
      setPaymentError('');
    },
  });

  const refundMutation = useMutation({
    mutationFn: (body: { paymentId: string; amount: number; reason: string }) =>
      paymentApi.refund(body.paymentId, body.amount, body.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequestDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['requestPayments', id] });
      setRefundTargetPaymentId('');
      setRefundAmount(0);
      setRefundReason('');
      setRefundError('');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: any) => requestApi.addComment(id || '', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requestComments', id] });
      setCommentVal('');
    },
  });

  if (requestQuery.isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 animate-pulse" />
        <Skeleton className="h-[300px] w-full animate-pulse" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary select-none">Request Not Found</h2>
        <Link to="/admin/requests">
          <Button variant="secondary">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  // Calculate balance checks
  const totalAmount = request.paymentSummary?.totalAmount || 0;
  const paidAmount = request.paymentSummary?.paidAmount || 0;
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  // Render transitions
  const currentStageObj = workflow?.stages?.find((s: any) => s.key === request.currentStage);

  const handleStageMove = (targetStage: string, requireRemark: boolean) => {
    if (requireRemark && !stageRemark.trim()) {
      setTransitionError('Stage transition requires a remark.');
      return;
    }
    moveStageMutation.mutate({
      targetStage,
      remark: stageRemark || undefined,
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    // Client-side Overpayment Cap
    if (paymentAmount > balanceDue) {
      setPaymentError(`Amount cannot exceed the remaining balance due of ₹${balanceDue}.`);
      return;
    }

    recordPaymentMutation.mutate({
      request: request._id,
      paymentType,
      paymentMethod,
      amount: paymentAmount,
      transactionId: paymentTxnId || undefined,
      remarks: paymentRemark || undefined,
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPayment = paymentsList.find((p: any) => p._id === refundTargetPaymentId);
    if (!targetPayment) return;

    const maxRefundable = targetPayment.amount - (targetPayment.refundedAmount || 0);
    if (refundAmount <= 0) {
      setRefundError('Refund amount must be greater than zero.');
      return;
    }
    // Client-side Refund bounds verification
    if (refundAmount > maxRefundable) {
      setRefundError(`Refund amount cannot exceed remaining paid balance of ₹${maxRefundable}.`);
      return;
    }

    refundMutation.mutate({
      paymentId: refundTargetPaymentId,
      amount: refundAmount,
      reason: refundReason,
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentVal.trim()) {
      addCommentMutation.mutate({
        content: commentVal,
        isPublic: commentIsPublic,
      });
    }
  };

  const selectedDoc = request.documents?.find((d) => d._id === selectedDocId);

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/requests" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-sans text-text-primary flex items-center gap-2">
              Process Application: <span className="font-mono text-accent">{request.applicationNumber}</span>
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 select-none">
              Client: {request.customerName} ({request.customerMobile})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill status={request.status} />
          <Badge
            variant={
              request.priority === 'urgent' || request.priority === 'vip' ? 'danger' : 'secondary'
            }
          >
            {request.priority}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs select-none">
        {[
          { key: 'overview', label: 'Overview & Stages', icon: Calendar },
          { key: 'docs', label: 'Documents review', icon: FileText },
          { key: 'payments', label: 'Payments & Billing', icon: DollarSign },
          { key: 'comments', label: 'Discussions log', icon: MessageSquare },
          { key: 'activity', label: 'Audit Trail Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 border-b-2 font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? 'border-accent text-accent font-bold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Main Stage Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stages horizontal nodes */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Milestones Track</h3>
              <div className="h-2 w-full bg-border-strong rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${request.completionPercentage || 0}%` }}
                />
              </div>
              <div className="text-xs font-bold text-accent select-none font-mono">
                Stage: {currentStageObj?.title || request.currentStage} ({request.completionPercentage}%)
              </div>
            </Card>

            {/* Actions panel */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Workflow Steps Progress Checklist</h3>

              {transitionError && (
                <div className="p-3 border border-error/20 bg-error/5 text-error rounded text-xs font-semibold select-none flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" /> {transitionError}
                </div>
              )}

              {/* Stages checklist layout */}
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-bold text-text-tertiary uppercase block select-none">Select active milestone stage:</span>
                <div className="space-y-2 border border-border p-4 rounded bg-surface-elevated/20 divide-y divide-border">
                  {workflow?.stages?.map((s: any, idx: number) => {
                    const isActive = s.key === request.currentStage;
                    const activeStageIndex = workflow.stages.findIndex((stage: any) => stage.key === request.currentStage);
                    const isCompleted = idx < activeStageIndex;

                    return (
                      <div key={s.key} className="flex items-center justify-between py-2 select-none">
                        <label htmlFor={`stage-chk-${s.key}`} className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="radio"
                            id={`stage-chk-${s.key}`}
                            name="workflow-stage-selection"
                            checked={selectedStageKey === s.key}
                            onChange={() => setSelectedStageKey(s.key)}
                            className="h-4 w-4 accent-accent cursor-pointer"
                          />
                          <div className="text-left">
                            <span className={`text-xs font-bold ${isActive ? 'text-accent font-extrabold' : isCompleted ? 'text-success' : 'text-text-primary'}`}>
                              {s.title}
                            </span>
                            <span className="text-[9px] text-text-tertiary block font-mono">Completion weight: {s.completionPercentage}%</span>
                          </div>
                        </label>

                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <span className="text-[9px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full select-none">✓ COMPLETED</span>
                          ) : isActive ? (
                            <span className="text-[9px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full animate-pulse select-none">● ACTIVE STEP</span>
                          ) : (
                            <span className="text-[9px] font-bold bg-border-strong text-text-tertiary px-2 py-0.5 rounded-full select-none">PENDING</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-3">
                  <label className="text-xs font-bold text-text-secondary select-none">Progress Update Remark / Note</label>
                  <Input
                    placeholder="Input remarks before saving workflow progress..."
                    value={stageRemark}
                    onChange={(e) => setStageRemark(e.target.value)}
                  />
                </div>

                <div className="pt-2 select-none">
                  <Button
                    onClick={() => handleStageMove(selectedStageKey, false)}
                    disabled={moveStageMutation.isPending || selectedStageKey === request.currentStage}
                    className="w-full sm:w-auto"
                  >
                    Save Workflow Progress
                  </Button>
                </div>
              </div>
            </Card>

            {/* Completion / Receiving Document Panel for Staff */}
            {(() => {
              const stages = workflow?.stages || [];
              const currentStageObj = stages.find((s: any) => s.key === request.currentStage);
              const isFinal = currentStageObj?.isFinal || currentStageObj?.statusType === 'final';
              const requiresDoc = matchedService?.requiresCompletionDocument;

              // Display the panel if the service requires it, or if a document is already uploaded, or if the stage is final
              if (!requiresDoc && !request.completionDocument && !isFinal) return null;

              return (
                <Card className="p-5 space-y-4">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-xs font-bold text-text-secondary uppercase font-sans">Completion / Receiving Document</h3>
                    {requiresDoc && (
                      <span className="text-[9px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-full select-none">
                        ★ REQUIRED FOR COMPLETION
                      </span>
                    )}
                  </div>

                  {request.completionDocument ? (
                    <div className="space-y-4 text-left">
                      <div className="flex items-start gap-4 p-4 border border-border bg-surface-elevated/20 rounded-md">
                        <span className="text-3xl select-none">📄</span>
                        <div className="text-left flex-1 space-y-1">
                          <h4 className="font-semibold text-text-primary text-xs truncate select-all">
                            {request.completionDocument.originalName || 'Receiving Document'}
                          </h4>
                          <p className="text-[10px] text-text-tertiary font-mono">
                            File Size: {((request.completionDocument.size || 0) / 1024).toFixed(1)} KB | Policy:{' '}
                            <span className="font-bold text-accent uppercase">
                              {request.completionDocument.downloadPolicy || 'permanent'}
                            </span>
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            Downloads: <span className="font-bold">{request.completionDocument.downloadCount || 0}</span> times
                          </p>
                        </div>
                      </div>

                      {/* Download Log / Audit History */}
                      {request.completionDocument.downloads && (request.completionDocument.downloads as any[]).length > 0 && (
                        <div className="border-t border-border pt-3 space-y-2 select-none">
                          <span className="text-[9px] font-bold text-text-tertiary uppercase block">Download Audit Log</span>
                          <div className="max-h-24 overflow-y-auto space-y-1 bg-surface-elevated/30 p-2 rounded border border-border">
                            {(request.completionDocument.downloads as any[]).map((dl: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[9px] text-text-secondary font-mono">
                                <span>👤 Downloaded by Customer</span>
                                <span>{new Date(dl.downloadedAt).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(documentActionError || documentActionSuccess) && (
                        <div className="text-left space-y-1.5 pt-1">
                          {documentActionError && (
                            <p className="text-[10px] text-error font-semibold select-none">
                              ⚠ {documentActionError}
                            </p>
                          )}
                          {documentActionSuccess && (
                            <p className="text-[10px] text-success font-semibold select-none">
                              {documentActionSuccess}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end select-none">
                        <button
                          onClick={() => handleReceivingAction('view')}
                          disabled={isDocumentActionLoading}
                          className="px-3 py-1.5 border border-border text-text-secondary hover:bg-surface-elevated rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDocumentActionLoading ? 'Loading...' : 'View File'}
                        </button>
                        <button
                          onClick={() => {
                            setReplacementFile(null);
                            setShowUploadForm(true);
                          }}
                          disabled={isDocumentActionLoading}
                          className="px-3 py-1.5 bg-accent text-white hover:bg-accent/90 rounded text-xs font-bold disabled:opacity-50"
                        >
                          Replace Document
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      {requiresDoc && (
                        <div className="p-3 border border-warning/20 bg-warning/5 text-warning rounded text-xs font-semibold select-none">
                          ⚠ Completion document has not been uploaded yet. Please upload it before final completion.
                        </div>
                      )}
                      
                      {/* Upload Form */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-text-secondary select-none">Choose File (PDF, PNG, JPG)</label>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => setReceivingFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1 select-none">
                          <label className="text-xs font-bold text-text-secondary block">Download Permission Policy</label>
                          <div className="flex gap-4 text-xs mt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="download-policy"
                                value="permanent"
                                checked={downloadPolicy === 'permanent'}
                                onChange={() => setDownloadPolicy('permanent')}
                                className="accent-accent"
                              />
                              <span>Permanent Access</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="download-policy"
                                value="once"
                                checked={downloadPolicy === 'once'}
                                onChange={() => setDownloadPolicy('once')}
                                className="accent-accent"
                              />
                              <span>Download Once</span>
                            </label>
                          </div>
                        </div>

                        {transitionError && (
                          <p className="text-[10px] text-error font-semibold select-none">
                            {transitionError}
                          </p>
                        )}

                        <Button
                          onClick={handleUploadReceiving}
                          disabled={!receivingFile || uploadReceivingMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {uploadReceivingMutation.isPending ? 'Uploading...' : 'Upload Completion Document'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Submission Form Data */}
            {submission ? (
              <Card className="p-5 space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Submitted Form Fields</h3>
                <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface-elevated text-xs">
                  {formFields
                    .filter((f: any) => !['divider', 'heading', 'paragraph'].includes(f.type))
                    .map((field: any) => {
                      const val = submittedValues[field.fieldKey];
                      const valStr = val !== undefined && val !== null ? String(val) : '';
                      const isFile = ['file_upload', 'image_upload', 'pdf_upload'].includes(field.type);

                      return (
                        <div key={field.fieldKey} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/30">
                          <div className="space-y-1 text-left flex-1 min-w-0">
                            <span className="font-bold text-text-secondary block select-none">{field.label}</span>
                            {isFile ? (
                              valStr ? (
                                <a href={valStr} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block font-mono">
                                  {valStr}
                                </a>
                              ) : (
                                <span className="text-text-tertiary">No document uploaded</span>
                              )
                            ) : (
                              <span className="font-medium text-text-primary block break-all font-mono">
                                {valStr || '—'}
                              </span>
                            )}
                          </div>

                          {valStr ? (
                            <div className="flex items-center gap-1.5 select-none">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(field.fieldKey, valStr)}
                                className="h-7 px-2"
                              >
                                {copiedField === field.fieldKey ? 'Copied' : 'Copy'}
                              </Button>
                              
                              {isFile && (
                                <>
                                  <a href={valStr} download target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="h-7 px-2">
                                      Download
                                    </Button>
                                  </a>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrint(valStr)}
                                    className="h-7 px-2"
                                  >
                                    Print
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </Card>
            ) : null}
          </div>

          {/* Details metadata */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Application Details</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary select-none">Applicant Name</span>
                  <span className="font-semibold text-text-primary">{request.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary select-none">Email Address</span>
                  <span className="font-semibold text-text-primary">{request.customerEmail}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary select-none">Mobile Number</span>
                  <span className="font-semibold text-text-primary font-mono">{request.customerMobile}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary select-none">Assigned Executive</span>
                  <span className="font-semibold text-text-primary">{(request.assignedTo as any)?.name || 'Unassigned'}</span>
                </div>
                {request.acceptedBy && (
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-text-secondary select-none">Accepted By</span>
                    <span className="font-semibold text-text-primary font-mono text-right">
                      {(request.acceptedBy as any)?.name}
                      {request.acceptedAt && <span className="block text-[9px] text-text-tertiary">{new Date(request.acceptedAt).toLocaleString()}</span>}
                    </span>
                  </div>
                )}
                {isAdmin && staffMembers.length > 0 && (
                  <div className="space-y-1.5 pt-2 select-none">
                    <label className="text-[10px] text-text-secondary font-bold uppercase">Reassign Staff Operator</label>
                    <Select
                      value={(request.assignedTo as any)?._id || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          reassignMutation.mutate(e.target.value);
                        }
                      }}
                      className="h-8 text-xs py-0 px-2"
                      disabled={reassignMutation.isPending}
                    >
                      <option value="">Choose executive...</option>
                      {staffMembers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Docs Listing */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase select-none text-left">Uploaded Files Checklist</h3>
            {request.documents?.length === 0 ? (
              <p className="text-xs text-text-tertiary select-none text-left">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {request.documents?.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSelectedDocId(doc._id)}
                    className={`p-3 border rounded-md flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                      selectedDocId === doc._id
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-surface hover:bg-surface-elevated/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-accent" />
                      <div className="text-left">
                        <span className="font-semibold text-xs text-text-primary">{doc.originalName}</span>
                        <span className="text-[9px] text-text-tertiary block uppercase font-mono mt-0.5">
                          Type: {doc.type.replace('_', ' ')} • {(doc.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <StatusPill status={doc.verificationStatus} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doc details Review Drawer */}
          <div>
            {selectedDoc ? (
              <Card className="p-5 space-y-4">
                <div className="border-b border-border pb-3 text-left">
                  <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider">Review Document</h4>
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent font-mono block mt-1 hover:underline truncate"
                  >
                    Open Original File ↗
                  </a>
                </div>

                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Verification Verdict</label>
                    <Select
                      value={docReviewStatus}
                      onChange={(e: any) => setDocReviewStatus(e.target.value)}
                    >
                      <option value="verified">Verify / Approve</option>
                      <option value="rejected">Reject Document</option>
                      <option value="reupload_required">Request Re-upload</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Review Remark / Instruction</label>
                    <Textarea
                      placeholder="Why is this document approved or rejected?"
                      value={docReviewRemark}
                      onChange={(e) => setDocReviewRemark(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={() =>
                      verifyDocMutation.mutate({
                        docId: selectedDoc._id,
                        verificationStatus: docReviewStatus,
                        verificationRemark: docReviewRemark,
                      })
                    }
                    disabled={verifyDocMutation.isPending}
                    className="w-full"
                  >
                    {verifyDocMutation.isPending ? 'Saving Review...' : 'Submit Verdict'}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="text-center py-12 text-xs text-text-tertiary border border-dashed border-border rounded bg-surface/50 select-none">
                Select a document from the checklist to verify details.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Collection log */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase select-none text-left">Payment Log Records</h3>
              {paymentsList.length === 0 ? (
                <p className="text-xs text-text-tertiary select-none text-left">No billing transactions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {paymentsList.map((pay: any) => (
                    <Card key={pay._id} className="p-4 flex items-center justify-between gap-4">
                      <div className="text-left space-y-1">
                        <span className="font-bold text-xs text-text-primary block">
                          ₹{pay.amount}{' '}
                          <span className="text-[10px] text-text-tertiary font-mono uppercase ml-2">
                            ({pay.paymentMethod})
                          </span>
                        </span>
                        <span className="text-[10px] text-text-secondary block font-mono">
                          Txn ID: {pay.transactionId || 'CASH_LOG'} •{' '}
                          {new Date(pay.paidAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setActiveReceiptId(pay._id)}>
                          <Printer size={12} className="mr-1" /> Receipt
                        </Button>
                        {pay.status !== 'refunded' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRefundTargetPaymentId(pay._id);
                              setRefundAmount(pay.amount - (pay.refundedAmount || 0));
                            }}
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Refund sub-panel */}
            {refundTargetPaymentId && (
              <Card className="p-5 space-y-4 border-error/20 bg-error/5 text-left">
                <h4 className="font-bold text-xs text-error uppercase tracking-wider select-none">Process Refund Transaction</h4>

                {refundError && (
                  <p className="text-[10px] text-error font-medium select-none">{refundError}</p>
                )}

                <form onSubmit={handleRefundSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-text-secondary select-none">Refund Amount (₹)</label>
                      <Input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-text-secondary select-none">Reason</label>
                      <Input
                        placeholder="Reason for refund..."
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setRefundTargetPaymentId('')}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-error hover:bg-error/85" disabled={refundMutation.isPending}>
                      Confirm Refund
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>

          {/* Book Payment Panel */}
          <div>
            <Card className="p-5 space-y-4 text-left">
              <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider select-none">Book Payment</h3>
              <div className="text-xs text-text-secondary space-y-1 border-b border-border pb-3 select-none">
                <div className="flex justify-between">
                  <span>Total Amount</span>
                  <span className="font-mono font-bold text-text-primary">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>Total Paid</span>
                  <span className="font-mono font-bold">₹{paidAmount}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>Balance Due</span>
                  <span className="font-mono text-accent">₹{balanceDue}</span>
                </div>
              </div>

              {balanceDue <= 0 ? (
                <div className="p-4 bg-success/5 border border-success/20 text-success text-center text-xs rounded-md font-semibold select-none">
                  Application Fully Paid
                </div>
              ) : (
                <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                  {paymentError && <p className="text-[10px] text-error font-medium select-none">{paymentError}</p>}

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Type</label>
                    <Select value={paymentType} onChange={(e: any) => setPaymentType(e.target.value)}>
                      <option value="full">Full Upfront</option>
                      <option value="partial">Installment / Partial</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Payment Method</label>
                    <Select value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)}>
                      <option value="cash">Cash Payment</option>
                      <option value="upi">UPI Log</option>
                      <option value="qr_code">QR Code scan</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Amount Paid (₹)</label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Transaction / Ref ID</label>
                    <Input
                      placeholder="e.g. UPI8837119"
                      value={paymentTxnId}
                      onChange={(e) => setPaymentTxnId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Remarks</label>
                    <Input
                      placeholder="Notes..."
                      value={paymentRemark}
                      onChange={(e) => setPaymentRemark(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={recordPaymentMutation.isPending}>
                    {recordPaymentMutation.isPending ? 'Logging Payment...' : 'Record Log'}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="max-w-xl space-y-6 text-left">
          {/* Discussion feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Application Discussion Logs</h3>
            {comments.length === 0 ? (
              <p className="text-xs text-text-tertiary select-none">No comments logged yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c: any) => (
                  <Card key={c._id} className={`p-4 space-y-2 ${c.isPublic ? 'border-border/60 bg-surface' : 'border-warning/20 bg-warning/5'}`}>
                    <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono select-none">
                      <span className="font-bold">{c.authorName || 'Executive Staff'}</span>
                      <span>
                        {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed">{c.content}</p>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded select-none ${c.isPublic ? 'bg-border-strong text-text-tertiary font-mono' : 'bg-warning/10 text-warning'}`}>
                      {c.isPublic ? 'Customer Visible' : 'Internal Note Only'}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Comment creator */}
          <Card className="p-4 space-y-4">
            <form onSubmit={handleAddComment} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Write New Comment</label>
                <Textarea
                  placeholder="Notes..."
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-between items-center select-none">
                <Checkbox
                  id="commentIsPublic"
                  label="Visible to Customer"
                  checked={commentIsPublic}
                  onChange={(e) => setCommentIsPublic(e.target.checked)}
                />
                <Button type="submit" disabled={addCommentMutation.isPending}>
                  Post Comment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="max-w-2xl space-y-4 text-left">
          <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Milestone Audit Log</h3>
          {activity.length === 0 ? (
            <p className="text-xs text-text-tertiary select-none">No audit records found.</p>
          ) : (
            <div className="relative border-l border-border pl-6 space-y-6">
              {activity.map((act: any, idx: number) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border border-bg bg-surface flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-text-secondary" />
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-baseline gap-2 select-none font-mono">
                      <span className="font-bold text-text-primary">{act.action}</span>
                      <span className="text-[10px] text-text-tertiary">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-text-secondary">{act.details}</p>
                    <span className="text-[9px] text-text-tertiary select-none font-mono uppercase">Performed by: {act.operatorName || 'System'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Printable Receipt Dialog with print stylesheets */}
      <Dialog isOpen={!!activeReceiptId} onClose={() => setActiveReceiptId(null)}>
        <DialogContent className="max-w-md p-6">
          {receiptQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3 animate-pulse" />
              <Skeleton className="h-40 w-full animate-pulse" />
            </div>
          ) : receiptQuery.data ? (
            <div className="space-y-6 text-left" id="printable-receipt">
              <div className="text-center border-b border-border pb-4 select-none">
                <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">CSC RECEIPT SUMMARY</h3>
                <span className="text-[10px] text-text-tertiary font-mono block mt-1">NO: {receiptQuery.data.receiptNumber}</span>
              </div>

              <div className="space-y-3 text-xs select-none">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount Collected:</span>
                  <span className="font-bold font-mono text-text-primary">₹{receiptQuery.data.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Payment Method:</span>
                  <span className="font-bold text-text-primary uppercase font-mono">{receiptQuery.data.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono text-accent">₹{receiptQuery.data.balanceAfterPayment}</span>
                </div>
              </div>

              {receiptQuery.data.qrCode && (
                <div className="flex flex-col items-center justify-center border-t border-border pt-4">
                  <img src={receiptQuery.data.qrCode} alt="Receipt QR verification link" className="w-36 h-36 border border-border p-1 bg-white" />
                  <span className="text-[9px] text-text-tertiary font-mono mt-2 select-none uppercase">SCAN TO CHECK STATUS</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border print:hidden select-none">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Button size="sm" onClick={() => setActiveReceiptId(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
