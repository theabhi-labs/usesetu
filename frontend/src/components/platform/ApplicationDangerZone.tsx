import React, { useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle, Archive, Trash2, AlertCircle } from 'lucide-react';

interface ApplicationDangerZoneProps {
  status: string;
  appName: string;
  onSuspend: (reason?: string) => Promise<void>;
  onResume: (reason?: string) => Promise<void>;
  onArchive: (reason?: string) => Promise<void>;
  isLoading: boolean;
}

export const ApplicationDangerZone: React.FC<ApplicationDangerZoneProps> = ({
  status,
  appName,
  onSuspend,
  onResume,
  onArchive,
  isLoading,
}) => {
  const [modalType, setModalType] = useState<'suspend' | 'resume' | 'archive' | 'delete' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isSuspended = status === 'suspended';
  const isArchived = status === 'archived';

  const handleAction = async () => {
    setError(null);
    try {
      if (modalType === 'suspend') {
        await onSuspend(reason || 'Suspended via platform settings');
      } else if (modalType === 'resume') {
        await onResume(reason || 'Resumed via platform settings');
      } else if (modalType === 'archive' || modalType === 'delete') {
        await onArchive(reason || 'Archived via platform settings');
      }
      setModalType(null);
      setReason('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  return (
    <div className="bg-rose-950/20 border border-rose-800/40 rounded-3xl p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-black text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Danger Zone & Lifecycle Management</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Perform administrative state transitions on this application. Actions are audited.
        </p>
      </div>

      <div className="divide-y divide-rose-900/30">
        {/* Suspend / Resume Option */}
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-white block">
              {isSuspended ? 'Resume Application' : 'Suspend Application'}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {isSuspended
                ? 'Restore public access and resume customer portal operations for this center.'
                : 'Temporarily pause public access and request submissions without losing data.'}
            </span>
          </div>

          {isSuspended ? (
            <button
              onClick={() => setModalType('resume')}
              disabled={isLoading || isArchived}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Resume Center</span>
            </button>
          ) : (
            <button
              onClick={() => setModalType('suspend')}
              disabled={isLoading || isArchived}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Suspend Center</span>
            </button>
          )}
        </div>

        {/* Soft Archive Option */}
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-white block">Archive Application</span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Soft-archive this application. It will be hidden from the active dashboard while preserving all records.
            </span>
          </div>

          <button
            onClick={() => setModalType('archive')}
            disabled={isLoading || isArchived}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-800/40 text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            <Archive className="w-4 h-4" />
            <span>{isArchived ? 'Already Archived' : 'Archive Center'}</span>
          </button>
        </div>

        {/* Delete Protection Option */}
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-white block">Delete Application</span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Permanent destructive hard-deletion is disabled to prevent accidental catastrophic data loss.
            </span>
          </div>

          <button
            onClick={() => setModalType('delete')}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/30 text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Safe Archive / Delete</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-white capitalize">
                {modalType === 'delete' ? 'Safe Delete / Archive Application' : `${modalType} Application`}
              </h4>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              {modalType === 'suspend' &&
                `Are you sure you want to suspend "${appName}"? The public website and service desks will be paused, but all existing customer records, users, and domains are preserved.`}
              {modalType === 'resume' &&
                `Are you sure you want to resume "${appName}"? The public portal and digital service center will be reactivated immediately.`}
              {modalType === 'archive' &&
                `Are you sure you want to archive "${appName}"? It will be removed from your active application list, but all database records remain preserved.`}
              {modalType === 'delete' &&
                `To protect your data and compliance records, permanent physical deletion is restricted. Archiving will safely deactivate public edge routing while preserving historical audits.`}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Center closed for maintenance"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalType(null)}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={isLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20"
              >
                {isLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
