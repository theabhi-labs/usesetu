import React, { useEffect, useState } from 'react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const Errors: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getTrackedErrors({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
      });
      setErrors(res.errors);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [statusFilter, severityFilter]);

  const handleResolve = async (id: string) => {
    await adminOperationsApi.resolveTrackedError(id);
    await fetchErrors();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracked System Errors</h1>
          <p className="text-sm text-gray-500 mt-1">Fingerprinted and aggregated application error instances</p>
        </div>
        <button
          onClick={fetchErrors}
          className="px-3.5 py-1.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search errors or routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchErrors()}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[200px]"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Severities</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="ERROR">ERROR</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="UNRESOLVED">Unresolved</option>
          <option value="RESOLVED">Resolved</option>
          <option value="IGNORED">Ignored</option>
        </select>
      </div>

      {/* Errors Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading error groups...</div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tracked errors found. System is clean!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fingerprint</th>
                  <th className="py-3 px-4">Error Code & Message</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Occurrences</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-xs">
                {errors.map((err) => (
                  <tr key={err._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-indigo-600 font-semibold">{err.fingerprint}</td>
                    <td className="py-3 px-4 font-sans text-sm">
                      <span className="font-semibold text-rose-700 font-mono text-xs block">{err.errorCode}</span>
                      <span className="text-gray-800 line-clamp-1">{err.message}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs mr-1 font-semibold">{err.method}</span>
                      {err.route}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 font-sans">{err.occurrenceCount}x</td>
                    <td className="py-3 px-4 text-gray-500 font-sans text-xs">
                      {new Date(err.lastSeenAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          err.status === 'UNRESOLVED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {err.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {err.status === 'UNRESOLVED' && (
                        <button
                          onClick={() => handleResolve(err._id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          Resolve
                        </button>
                      )}
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
