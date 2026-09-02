import React, { useEffect, useState } from 'react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getJobHistory({
        status: statusFilter || undefined,
      });
      setJobs(res.jobs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Background Job Runs</h1>
          <p className="text-sm text-gray-500 mt-1">Lifecycle monitoring for billing, dunning, renewals & reconciliations</p>
        </div>
        <button
          onClick={fetchJobs}
          className="px-3.5 py-1.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="RUNNING">Running</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading job executions...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No background job runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Job Name</th>
                  <th className="py-3 px-4">Execution ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Processed / Succeeded / Failed</th>
                  <th className="py-3 px-4">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{job.jobName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{job.executionId}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          job.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'RUNNING'
                            ? 'bg-blue-100 text-blue-800'
                            : job.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{job.durationMs ?? '--'} ms</td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <span className="font-semibold text-gray-900">{job.recordsProcessed}</span> /{' '}
                      <span className="text-emerald-600 font-semibold">{job.recordsSucceeded}</span> /{' '}
                      <span className="text-rose-600 font-semibold">{job.recordsFailed}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(job.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
