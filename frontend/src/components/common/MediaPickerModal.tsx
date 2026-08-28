import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../services/cms.api';
import type { MediaAsset } from '../../types/cms.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { UploadCloud, Image, FileText, Check } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function MediaPickerModal({ isOpen, onClose, onSelect }: MediaPickerModalProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Queries
  const mediaQuery = useQuery({
    queryKey: ['mediaAssetsList', page, search],
    queryFn: () => cmsApi.getMedia(page, 12, search),
    enabled: isOpen,
  });

  const assets: MediaAsset[] = mediaQuery.data?.assets || mediaQuery.data?.media || [];
  const pagination = mediaQuery.data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => cmsApi.uploadMedia(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssetsList'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Media upload failed.');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await uploadMutation.mutateAsync(form);
    } catch {
      // Handled by onError
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = (mime: string) => mime?.startsWith('image/');

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto pl-6 pr-6 pt-4 pb-6">
        <DialogHeader>
          <DialogTitle>Media Assets Picker</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4 text-left">
          {/* Top upload / search bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs max-w-xs"
            />

            <label className={`h-9 px-4 rounded border border-dashed border-border bg-surface hover:bg-surface-elevated/20 flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <UploadCloud size={14} className="text-text-secondary" />
              {isUploading ? 'Uploading...' : 'Upload File'}
              <input type="file" className="hidden" disabled={isUploading} onChange={handleUpload} />
            </label>
          </div>

          {error && <p className="text-[10px] text-error font-medium">{error}</p>}

          {/* Grid assets list */}
          {mediaQuery.isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-border rounded text-xs text-text-tertiary select-none">
              No media files uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 select-none">
              {assets.map((asset) => (
                <div
                  key={asset._id}
                  onClick={() => {
                    onSelect(asset.url);
                    onClose();
                  }}
                  className="group relative border border-border bg-surface rounded overflow-hidden h-20 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors"
                >
                  {isImage(asset.mimeType) ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={24} className="text-text-tertiary" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Check size={16} className="text-accent" />
                  </div>
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] text-text-secondary p-0.5 truncate font-mono text-center">
                    {asset.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 select-none">
              <span className="text-[10px] text-text-tertiary">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
