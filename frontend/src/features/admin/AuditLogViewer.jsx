import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ClipboardList, Download, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';

const SEVERITY_STYLES = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  sensitive: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const LogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-white transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${SEVERITY_STYLES[log.severity] || ''}`}>
            {log.severity}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-700 truncate">{log.action}</span>
          <span className="text-xs text-slate-400 hidden sm:inline truncate">{log.targetType}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className="text-xs text-slate-500 hidden md:inline">
            {log.actorId?.email || 'system'}
          </span>
          <span className="text-xs text-slate-400 hidden lg:inline">
            {new Date(log.createdAt).toLocaleString()}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-white border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-slate-600">Actor</p>
            <p className="text-slate-800">{log.actorId?.email || '—'} <span className="text-slate-400">({log.actorRole})</span></p>
            {log.actingAs && <p className="text-slate-400">Acting as: <span className="font-semibold">{log.actingAs}</span></p>}
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-600">Target</p>
            <p className="font-mono text-slate-800">{log.targetType} · {log.targetId}</p>
          </div>
          {(log.beforeValue !== null && log.beforeValue !== undefined) && (
            <div className="space-y-1">
              <p className="font-semibold text-slate-600">Before</p>
              <pre className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 overflow-auto max-h-32 text-[10px]">
                {JSON.stringify(log.beforeValue, null, 2)}
              </pre>
            </div>
          )}
          {(log.afterValue !== null && log.afterValue !== undefined) && (
            <div className="space-y-1">
              <p className="font-semibold text-slate-600">After</p>
              <pre className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800 overflow-auto max-h-32 text-[10px]">
                {JSON.stringify(log.afterValue, null, 2)}
              </pre>
            </div>
          )}
          <div className="space-y-1">
            <p className="font-semibold text-slate-600">IP Address</p>
            <p className="font-mono text-slate-700">{log.ipAddress || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-600">Timestamp</p>
            <p className="text-slate-700">{new Date(log.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditLogViewer = () => {
  const [severity, setSeverity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', severity, action, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (severity) params.append('severity', severity);
      if (action) params.append('action', action);
      return (await api.get(`/admin/audit-logs?${params}`)).data || {};
    },
  });

  const logs = result.data || [];
  const meta = result.meta || {};

  const handleExport = async () => {
    const res = await api.get('/admin/audit-logs/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Audit Log Viewer</h1>
            <p className="text-sm text-slate-500">Full history of system activity. Every sensitive action is logged.</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by</span>
        </div>
        <select
          value={severity}
          onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="sensitive">Sensitive</option>
          <option value="critical">Critical</option>
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by action…"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
          />
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No audit logs match your filters.</p>
          </div>
        ) : (
          logs.map((log) => <LogRow key={log._id} log={log} />)
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {logs.length} of {meta.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs font-bold text-slate-600">Page {page} / {meta.pages}</span>
            <button
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
