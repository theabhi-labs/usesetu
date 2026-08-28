import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const SuperAdminIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getIncidents({});
      if (res && Array.isArray(res.incidents)) {
        setIncidents(res.incidents);
      } else if (Array.isArray(res)) {
        setIncidents(res);
      } else {
        setIncidents([]);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load incidents');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      setActionLoading(id);
      await adminOperationsApi.acknowledgeIncident(id);
      await fetchIncidents();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      setActionLoading(id);
      await adminOperationsApi.resolveIncident(id);
      await fetchIncidents();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-extrabold text-text-primary">System Incident Response (P0 / P1)</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time incident triage, automated failure detections, and recovery management.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-text-secondary">Loading incidents...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 font-semibold">{error}</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No active incidents detected. All platform services are healthy.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incidents.map((inc) => (
              <div key={inc._id || inc.id || Math.random()} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-elevated/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                      {inc.severity}
                    </span>
                    <span className="font-bold text-xs text-text-primary">{inc.title}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{inc.summary || inc.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {inc.status === 'OPEN' && (
                    <button
                      onClick={() => handleAcknowledge(inc._id)}
                      disabled={actionLoading === inc._id}
                      className="px-3 py-1.5 bg-surface-elevated border border-border hover:bg-border rounded text-xs font-semibold text-text-primary"
                    >
                      Acknowledge
                    </button>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolve(inc._id)}
                      disabled={actionLoading === inc._id}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
