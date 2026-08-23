import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestApi } from '../../services/request.api';
import { paymentApi } from '../../services/payment.api';
import type { Request } from '../../types/request.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { StatusPill } from '../../components/ui/StatusPill';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import {
  ArrowLeft,
  Calendar,
  FileText,
  MessageSquare,
  DollarSign,
  Printer,
  UploadCloud,
} from 'lucide-react';

export function PortalRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'payments' | 'comments'>('overview');
  const [commentVal, setCommentVal] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

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
      const shouldReload = request?.completionDocument?.downloadPolicy === 'once';

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
        if (shouldReload) {
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['portalRequestDetail', id] }), 1500);
        }
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
    queryKey: ['portalRequestDetail', id],
    queryFn: () => requestApi.getById(id || ''),
    enabled: !!id,
  });

  const request = requestQuery.data;

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

  // RESTRICT comments to public (customer visible) notes only
  const publicComments = (commentsQuery.data || []).filter((c: any) => c.isPublic);

  // Mutations
  const uploadDocMutation = useMutation({
    mutationFn: (formData: FormData) => requestApi.uploadDocument(id || '', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalRequestDetail', id] });
      setUploadError('');
    },
    onError: (err: any) => {
      setUploadError(err?.response?.data?.message || 'Document upload failed.');
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
        <Skeleton className="h-[280px] w-full animate-pulse" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary select-none">Request Not Found</h2>
        <Link to="/portal">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const totalAmount = request.paymentSummary?.totalAmount || 0;
  const paidAmount = request.paymentSummary?.paidAmount || 0;
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'other');
      await uploadDocMutation.mutateAsync(formData);
    } catch {
      // Handled by onError
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentVal.trim()) {
      addCommentMutation.mutate({
        content: commentVal,
        isPublic: true, // Customers can ONLY post public comments
      });
    }
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link to="/portal/requests" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold font-sans text-text-primary">
              Application Tracker: <span className="font-mono text-accent select-all">{request.applicationNumber}</span>
            </h1>
            <p className="text-[10px] text-text-tertiary select-none font-mono">STATUS ENQUIRY MONITOR</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill status={request.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs select-none">
        {[
          { key: 'overview', label: 'Timeline Tracking', icon: Calendar },
          { key: 'docs', label: 'My Documents Locker', icon: FileText },
          { key: 'payments', label: 'Billing Statement', icon: DollarSign },
          { key: 'comments', label: 'Messages Desk', icon: MessageSquare },
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Current Stage Card */}
            {(() => {
              const stages = request.workflow?.stages || [];
              const currentStageObj = stages.find((s: any) => s.key === request.currentStage);
              return (
                <Card className="p-5 border border-accent/20 bg-accent/5 space-y-4">
                  <span className="text-[10px] font-bold text-accent uppercase block select-none">Current Stage</span>
                  <div className="text-left space-y-1">
                    <h2 className="text-lg font-bold text-text-primary">
                      {currentStageObj?.title || request.currentStage}
                    </h2>
                    <p className="text-xs text-text-secondary font-sans select-none">
                      {currentStageObj?.description || 'Your application is currently at this processing stage.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs border-t border-border pt-3">
                    <div>
                      <span className="text-text-tertiary select-none">Handled By:</span>{' '}
                      <span className="font-semibold text-text-primary">
                        👤 {request.assignedTo && typeof request.assignedTo === 'object' ? (request.assignedTo as any).name : 'Processing Desk'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary select-none">Last Updated:</span>{' '}
                      <span className="font-semibold text-text-primary font-mono select-all">
                        {new Date(request.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })() || null}

            {/* Progress bar */}
            <Card className="p-5 space-y-4">
              <div className="flex justify-between items-center text-xs select-none">
                <span className="text-text-secondary font-medium font-sans">Workflow Milestones Progress</span>
                <span className="text-accent font-bold font-mono">{request.completionPercentage || 0}% Complete</span>
              </div>
              <div className="h-2.5 w-full bg-border-strong rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${request.completionPercentage || 0}%` }}
                />
              </div>
            </Card>

            {/* Service Progress Complete Timeline */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase select-none font-sans">Service Progress Timeline</h3>
              {(() => {
                const stages = request.workflow?.stages || [];
                if (stages.length === 0) {
                  return (
                    <p className="text-xs text-text-tertiary select-none font-sans">No milestones configured for this service.</p>
                  );
                }

                const sortedStages = [...stages].sort((a: any, b: any) => a.order - b.order);
                const activeIdx = sortedStages.findIndex((s: any) => s.key === request.currentStage);

                return (
                  <div className="relative border-l border-border pl-6 space-y-6 text-xs text-left">
                    {sortedStages.map((stage: any, index: number) => {
                      const isActive = stage.key === request.currentStage;
                      const isCompleted = activeIdx !== -1 && index < activeIdx;
                      
                      // Find matching transition log in request.timeline
                      const historyRecord = request.timeline?.find((log: any) => log.toStage === stage.key);

                      return (
                        <div key={stage.key} className="relative">
                          {/* Left node indicator */}
                          <span className={`absolute -left-[32px] top-0.5 h-4.5 w-4.5 rounded-full border bg-surface flex items-center justify-center select-none ${
                            isCompleted ? 'border-success text-success bg-success/5 font-extrabold' : isActive ? 'border-accent text-accent' : 'border-border-strong text-text-tertiary'
                          }`}>
                            {isCompleted ? (
                              <span className="text-[10px] font-bold">✓</span>
                            ) : isActive ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                            )}
                          </span>

                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline gap-2">
                              <h4 className={`font-bold ${isActive ? 'text-accent text-sm font-extrabold' : isCompleted ? 'text-text-primary' : 'text-text-tertiary'}`}>
                                {stage.title}
                              </h4>
                              {isCompleted && historyRecord && (
                                <span className="text-[9px] font-mono text-text-tertiary">
                                  {new Date(historyRecord.createdAt).toLocaleDateString()}{' '}
                                  {new Date(historyRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[9px] font-bold text-accent animate-pulse font-sans">CURRENTLY ACTIVE</span>
                              )}
                            </div>
                            
                            {/* Subtext description */}
                            {isActive ? (
                              <p className="text-text-secondary text-xs">Currently in progress. Last updated: {new Date(request.updatedAt).toLocaleString()}</p>
                            ) : isCompleted ? (
                              <p className="text-text-tertiary text-xs">
                                Completed {historyRecord?.operatorName ? `by ${historyRecord.operatorName}` : ''}
                                {historyRecord?.remark ? ` — "${historyRecord.remark}"` : ''}
                              </p>
                            ) : (
                              <p className="text-text-tertiary text-xs select-none">Pending stage</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>

            {/* Completion / Receiving Document Card */}
            {request.completionDocument && (
              <Card className="p-5 border border-success/20 bg-success/5 space-y-4">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] font-bold text-success uppercase block">Completion Document / Receiving</span>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    request.completionDocument.downloadPolicy === 'once' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                  }`}>
                    {request.completionDocument.downloadPolicy === 'once' ? 'Download Once Policy' : 'Permanent Access'}
                  </span>
                </div>
                <div className="flex items-start gap-4 p-4 border border-success/10 bg-surface rounded-md">
                  <span className="text-3xl select-none">📄</span>
                  <div className="text-left flex-1 space-y-1">
                    <h4 className="font-semibold text-text-primary text-sm truncate select-all">
                      {request.completionDocument.originalName}
                    </h4>
                    <p className="text-[10px] text-text-tertiary font-mono">
                      File Size: {(request.completionDocument.size / 1024).toFixed(1)} KB | Uploaded: {new Date(request.completionDocument.uploadedAt).toLocaleDateString()}
                    </p>
                    {request.completionDocument.downloadPolicy === 'once' && (
                      <p className="text-[10px] text-warning font-semibold">
                        {request.completionDocument.downloadCount > 0 
                          ? '⚠ Download expired (One-time download policy configured)' 
                          : 'ℹ Available: 1 download remaining'}
                      </p>
                    )}
                  </div>
                </div>
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

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleReceivingAction('view')}
                    disabled={isDocumentActionLoading}
                    className="px-3 py-1.5 border border-border text-text-secondary hover:bg-surface-elevated rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDocumentActionLoading ? 'Loading...' : 'View File'}
                  </button>
                  {request.completionDocument.downloadPolicy === 'once' && request.completionDocument.downloadCount > 0 ? (
                    <button
                      disabled
                      className="px-3 py-1.5 bg-border text-text-tertiary cursor-not-allowed rounded text-xs font-bold"
                    >
                      Download Expired
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReceivingAction('download')}
                      disabled={isDocumentActionLoading}
                      className="px-3 py-1.5 bg-success text-white hover:bg-success/90 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDocumentActionLoading ? 'Downloading...' : 'Download Receiving'}
                    </button>
                  )}
                  <button
                    onClick={() => handleReceivingAction('print')}
                    disabled={isDocumentActionLoading}
                    className="px-3 py-1.5 border border-success/20 text-success hover:bg-success/5 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDocumentActionLoading ? 'Loading...' : 'Print File'}
                  </button>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="p-4 space-y-3 text-xs select-none">
              <h3 className="font-bold text-text-primary uppercase tracking-wider">Application Summary</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-text-secondary">Customer Name</span>
                  <span className="font-semibold text-text-primary">{request.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-text-secondary">Reference Mobile</span>
                  <span className="font-semibold text-text-primary font-mono">{request.customerMobile}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-text-secondary">Applied Date</span>
                  <span className="font-semibold text-text-primary">
                    {new Date(request.appliedOn || request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Handled By</span>
                  <span className="font-semibold text-accent flex items-center gap-1">
                    👤 {request.assignedTo && typeof request.assignedTo === 'object' ? request.assignedTo.name : 'Processing Desk'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Docs Checklist list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase select-none">My Uploaded Documents</h3>
            {request.documents?.length === 0 ? (
              <p className="text-xs text-text-tertiary select-none">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {request.documents?.map((doc) => (
                  <Card key={doc._id} className="p-4 flex items-center justify-between gap-4">
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-1.5">
                        <FileText size={15} className="text-accent" />
                        <span className="font-semibold text-xs text-text-primary">{doc.originalName}</span>
                      </div>
                      <span className="text-[9px] text-text-tertiary block uppercase font-mono">
                        Type: {doc.type.replace('_', ' ')} • Status: {doc.verificationStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline font-semibold"
                      >
                        Open
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upload Dropzone */}
          <div>
            <Card className="p-5 space-y-4 text-left">
              <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider select-none">Upload New Document</h3>

              {uploadError && <p className="text-[10px] text-error font-medium select-none">{uploadError}</p>}

              <label className={`border border-dashed border-border hover:border-accent hover:bg-surface-elevated/20 rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <UploadCloud size={28} className="text-text-tertiary animate-bounce" />
                <span className="text-xs text-text-secondary select-none">
                  {isUploading ? 'Uploading document...' : 'Click to select upload document'}
                </span>
                <input type="file" className="hidden" disabled={isUploading} onChange={handleFileUpload} />
              </label>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* List transactions */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Transaction Receipts</h3>
            {paymentsList.length === 0 ? (
              <p className="text-xs text-text-tertiary select-none">No transactions recorded.</p>
            ) : (
              <div className="space-y-2">
                {paymentsList.map((pay: any) => (
                  <Card key={pay._id} className="p-4 flex items-center justify-between gap-4">
                    <div className="text-left space-y-1">
                      <span className="font-bold text-xs text-text-primary">
                        ₹{pay.amount}{' '}
                        <span className="text-[9px] text-text-tertiary font-mono uppercase ml-2">
                          ({pay.paymentMethod})
                        </span>
                      </span>
                      <span className="text-[9px] text-text-secondary block font-mono">
                        Date: {new Date(pay.paidAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Button size="sm" variant="outline" onClick={() => setActiveReceiptId(pay._id)}>
                      <Printer size={12} className="mr-1" /> View Receipt
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Billing overview */}
          <div>
            <Card className="p-5 space-y-4 text-xs text-left select-none">
              <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider">Billing Statement</h3>
              <div className="space-y-2.5 border-b border-border pb-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Assigned Service Fee</span>
                  <span className="font-semibold text-text-primary font-mono">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span className="text-text-secondary">Amount Cleared</span>
                  <span className="font-semibold font-mono">₹{paidAmount}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>Balance Due</span>
                  <span className="font-mono text-accent">₹{balanceDue}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="max-w-xl space-y-6 text-left">
          {/* Discussion feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase select-none">Milestones Discussion</h3>
            {publicComments.length === 0 ? (
              <p className="text-xs text-text-tertiary select-none">No messages logged yet.</p>
            ) : (
              <div className="space-y-3">
                {publicComments.map((c: any) => (
                  <Card key={c._id} className="p-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-text-secondary font-mono select-none">
                      <span className="font-bold">{c.authorName || 'Executive'}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed">{c.content}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Comment writer */}
          <Card className="p-4 space-y-4">
            <form onSubmit={handleAddComment} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Write Comment</label>
                <Textarea
                  placeholder="Ask a question or log comments..."
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end select-none">
                <Button type="submit" disabled={addCommentMutation.isPending}>
                  Post Message
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Printable Receipt Dialog */}
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
                  <span className="text-text-secondary">Amount Paid:</span>
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
                  <img src={receiptQuery.data.qrCode} alt="Receipt QR validation" className="w-36 h-36 border border-border p-1 bg-white" />
                  <span className="text-[9px] text-text-tertiary font-mono mt-2 select-none uppercase font-bold">SCAN TO CHECK STATUS</span>
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
