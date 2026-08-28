import React, { useEffect, useState } from 'react';
import { Bug, CheckCircle2, RefreshCw } from 'lucide-react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const SuperAdminErrors: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getTrackedErrors({});
      setErrors(res.errors);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleResolve = async (id: string) => {
    await adminOperationsApi.resolveTrackedError(id);
    fetchErrors();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-extrabold text-text-primary">Live Error Tracker & Stack Traces</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Grouped runtime exceptions, unhandled rejections, and request error signatures.
          </p>
        </div>
        <button
          onClick={fetchErrors}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-text-secondary">Loading error groups...</div>
        ) : errors.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            Zero unresolved errors. System is running cleanly.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {errors.map((err) => (
              <div key={err._id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-elevated/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary">{err.errorName || 'Error'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500">
                      {err.count || 1} occurrences
                    </span>
                  </div>
                  <p className="text-xs font-mono text-red-500">{err.message}</p>
                </div>
                {err.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleResolve(err._id)}
                    className="px-3 py-1.5 bg-surface-elevated border border-border hover:bg-border rounded text-xs font-semibold text-text-primary"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
