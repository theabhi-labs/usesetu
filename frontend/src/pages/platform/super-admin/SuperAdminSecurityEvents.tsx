import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const SuperAdminSecurityEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getSecurityEvents();
      if (res && Array.isArray(res.events)) {
        setEvents(res.events);
      } else if (Array.isArray(res)) {
        setEvents(res);
      } else {
        setEvents([]);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load security audit events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-extrabold text-text-primary">Security Audits & Suspicious Events</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Global security logs, brute-force login lockouts, rate limit violations, and authentication audits.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-text-secondary">Loading security audit trail...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 font-semibold">{error}</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            Zero suspicious security anomalies detected. System is safe and secure.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((evt) => (
              <div key={evt._id || evt.id || Math.random()} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-elevated/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary">{evt.eventType || 'Security Alert'}</span>
                    <span className="text-[11px] font-mono text-text-tertiary">IP: {evt.ipAddress || 'Unknown'}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{evt.details || evt.description || 'Auth attempt logged'}</p>
                </div>
                <span className="text-[11px] text-text-tertiary">
                  {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
