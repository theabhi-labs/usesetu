import React, { useEffect, useState } from 'react';
import { ServerCog, RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const SuperAdminJobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getJobHistory();
      setJobs(res.jobs || res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <ServerCog className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-extrabold text-text-primary">Background Job Workers & Queues</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Status of background BullMQ / Redis queues, async workers, and job run executions.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-text-secondary">Loading job history...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            All background queue processors are idle or healthy.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <div key={job._id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-elevated/40">
                <div>
                  <div className="font-bold text-xs text-text-primary">{job.jobName || 'Queue Task'}</div>
                  <div className="text-[11px] text-text-tertiary">
                    Duration: {job.durationMs || 0}ms • Run at {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
