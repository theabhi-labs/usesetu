import React, { useEffect, useState } from 'react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getIncidents({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setIncidents(res.incidents);
    } catch (err) {
      // Handled silently or via UI notification
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

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

  const handleIgnore = async (id: string) => {
    try {
      setActionLoading(id);
      await adminOperationsApi.ignoreIncident(id);
      await fetchIncidents();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operational Incidents</h1>
          <p className="text-sm text-gray-500 mt-1">Deduplicated system alerts, outages, and degraded states</p>
        </div>
        <button
          onClick={fetchIncidents}
          className="px-3.5 py-1.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search incidents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchIncidents()}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[200px]"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Severities</option>
          <option value="P0">P0 - Critical</option>
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
          <option value="P3">P3 - Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="IGNORED">Ignored</option>
        </select>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No operational incidents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Incident</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Occurrences</th>
                  <th className="py-3 px-4">Last Detected</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          inc.severity === 'P0'
                            ? 'bg-rose-100 text-rose-800'
                            : inc.severity === 'P1'
                            ? 'bg-orange-100 text-orange-800'
                            : inc.severity === 'P2'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{inc.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{inc.description}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{inc.affectedService}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inc.status === 'OPEN'
                            ? 'bg-rose-100 text-rose-800'
                            : inc.status === 'ACKNOWLEDGED'
                            ? 'bg-amber-100 text-amber-800'
                            : inc.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{inc.occurrenceCount}x</td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(inc.lastDetectedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {inc.status === 'OPEN' && (
                        <button
                          disabled={actionLoading === inc._id}
                          onClick={() => handleAcknowledge(inc._id)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                        >
                          Ack
                        </button>
                      )}
                      {(inc.status === 'OPEN' || inc.status === 'ACKNOWLEDGED') && (
                        <button
                          disabled={actionLoading === inc._id}
                          onClick={() => handleResolve(inc._id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          Resolve
                        </button>
                      )}
                      {inc.status !== 'RESOLVED' && inc.status !== 'IGNORED' && (
                        <button
                          disabled={actionLoading === inc._id}
                          onClick={() => handleIgnore(inc._id)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                        >
                          Ignore
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
