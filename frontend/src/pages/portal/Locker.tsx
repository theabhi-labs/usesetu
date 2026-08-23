import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lockerApi, type LockerDocument } from '../../services/locker.api';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Select } from '../../components/ui/Select';
import { FileText, Folder, UploadCloud, Plus, Trash2, Eye, Download } from 'lucide-react';

export function Locker() {
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docType, setDocType] = useState('other');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Delete modal state
  const [docToDelete, setDocToDelete] = useState<LockerDocument | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const lockerQuery = useQuery({
    queryKey: ['portalLockerDocuments'],
    queryFn: () => lockerApi.getAll(),
  });

  const lockerDocs = lockerQuery.data || [];

  const uploadDocMutation = useMutation({
    mutationFn: (formData: FormData) => lockerApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalLockerDocuments'] });
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadError('');
    },
    onError: (err: any) => {
      setUploadError(err?.response?.data?.message || 'Document upload failed.');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => lockerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalLockerDocuments'] });
      setDocToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.message || 'Failed to delete document.');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('type', docType);

    uploadDocMutation.mutate(formData);
  };

  const handleOpenUploadModal = () => {
    setDocType('other');
    setUploadFile(null);
    setUploadError('');
    setIsUploadModalOpen(true);
  };

  const handleDelete = () => {
    if (docToDelete) {
      deleteDocMutation.mutate(docToDelete._id);
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      photo: 'Photograph',
      signature: 'Signature Specimen',
      ration_card: 'Ration Card',
      voter_id: 'Voter ID Card',
      passport: 'Passport',
      driving_licence: 'Driving Licence',
      other: 'Other Supporting Document',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">My Documents Locker</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Access, manage, and store your service documents safely.</p>
        </div>
        <Button size="sm" onClick={handleOpenUploadModal}>
          <Plus size={14} className="mr-1.5" /> Upload Document
        </Button>
      </div>

      {lockerQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full animate-pulse" />
          ))}
        </div>
      ) : lockerDocs.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
          <Folder className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-xs text-text-tertiary">No uploaded locker assets found. Start by uploading one!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lockerDocs.map((doc) => (
            <Card key={doc._id} className="p-4 flex flex-col justify-between items-stretch gap-4 text-left">
              <div className="flex items-start gap-2.5">
                <FileText size={20} className="text-accent shrink-0" />
                <div className="space-y-0.5 max-w-[85%]">
                  <span className="font-bold text-xs text-text-primary block truncate" title={doc.originalName}>
                    {doc.originalName}
                  </span>
                  <span className="text-[9px] text-accent font-bold uppercase tracking-wider block">
                    {getDocTypeLabel(doc.type)}
                  </span>
                  <span className="text-[8px] text-text-tertiary block font-mono">
                    SIZE: {(doc.size / 1024).toFixed(1)} KB • UPLOADED: {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-3 select-none">
                <div className="flex gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-secondary hover:text-accent font-semibold flex items-center gap-1"
                    title="View Document"
                  >
                    <Eye size={12} /> View
                  </a>
                  <a
                    href={doc.url}
                    download
                    className="text-xs text-text-secondary hover:text-accent font-semibold flex items-center gap-1"
                    title="Download Document"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
                <button
                  onClick={() => {
                    setDocToDelete(doc);
                    setDeleteError('');
                  }}
                  className="text-text-tertiary hover:text-error p-1 hover:bg-surface-elevated rounded"
                  title="Delete Document"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      <Dialog isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document to Locker</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2 text-xs">
            {uploadError && (
              <div className="p-3 border border-error/20 bg-error/5 text-error rounded-md font-semibold text-left">
                {uploadError}
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="font-bold text-text-secondary">Document Category / Type</label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value)} required>
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
                <option value="photo">Photograph</option>
                <option value="signature">Signature Specimen</option>
                <option value="ration_card">Ration Card</option>
                <option value="voter_id">Voter ID Card</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="other">Other Supporting Document</option>
              </Select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="font-bold text-text-secondary">Choose File</label>
              {uploadFile ? (
                <div className="border border-border rounded-md p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate max-w-[80%]">
                    <FileText size={18} className="text-accent shrink-0" />
                    <span className="font-medium truncate">{uploadFile.name}</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setUploadFile(null)}>
                    Clear
                  </Button>
                </div>
              ) : (
                <label className="border border-dashed border-border hover:border-accent hover:bg-surface-elevated/20 rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                  <UploadCloud size={28} className="text-text-tertiary" />
                  <span className="text-text-secondary select-none">Click to select a document file</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} required />
                </label>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={uploadDocMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={uploadDocMutation.isPending}>
                Upload Now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog isOpen={!!docToDelete} onClose={() => setDocToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Locker Document?</DialogTitle>
          </DialogHeader>

          <div className="py-3 text-xs text-text-secondary text-left space-y-3">
            <p>
              Are you sure you want to delete <strong className="text-text-primary">{docToDelete?.originalName}</strong> from your locker?
            </p>
            <p className="text-error font-medium">This document will no longer be available for future quick applications.</p>
            {deleteError && (
              <div className="p-3 bg-error/10 border border-error/20 text-error rounded-md">
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDocToDelete(null)}
              disabled={deleteDocMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              isLoading={deleteDocMutation.isPending}
              className="bg-error hover:bg-error-hover text-white"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
