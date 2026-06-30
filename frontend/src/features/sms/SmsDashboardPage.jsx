import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  MessageSquare,
  History,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';

const SmsDashboardPage = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('compose'); // compose, logs
  const [targets, setTargets] = useState('all');
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');
  const [pageLog, setPageLog] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Character count calculation
  const charLimit = 160;
  const numPages = Math.ceil(message.length / charLimit) || 1;

  // Query SMS Statistics
  const { data: stats } = useQuery({
    queryKey: ['smsStats'],
    queryFn: async () => {
      const res = await api.get('/sms/stats');
      return res.data?.data;
    },
  });

  // Query Classes (for selective class broadcast)
  const { data: classes } = useQuery({
    queryKey: ['broadcastClasses'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Query SMS logs (paginated)
  const { data: logData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['smsLogs', pageLog],
    queryFn: async () => {
      const res = await api.get(`/sms/logs?page=${pageLog}&limit=20`);
      return res.data;
    },
    enabled: activeSubTab === 'logs',
  });

  // Broadcast Mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/sms/broadcast', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'SMS broadcast completed successfully.');
      setMessage('');
      setClassId('');
      setTargets('all');
      queryClient.invalidateQueries(['smsStats']);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || 'Failed to dispatch broadcast');
    },
  });

  const handleBroadcast = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!message || message.trim() === '') return;
    if (targets === 'class' && !classId) {
      setErrorMsg('Please select a target class');
      return;
    }
    broadcastMutation.mutate({ targets, classId, message });
  };

  const getStatusStyle = (status) => {
    return status === 'sent'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
      : status === 'failed'
      ? 'bg-rose-50 text-rose-700 border-rose-150'
      : 'bg-slate-50 text-slate-400 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SMS Communications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Broadcast SMS messages to parent cohorts, check delivery logs, and view usage statistics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Delivered Messages</span>
            <h3 className="text-2xl font-black text-slate-905">{stats?.status?.sent || 0}</h3>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Failed Despatches</span>
            <h3 className="text-2xl font-black text-rose-700">{stats?.status?.failed || 0}</h3>
          </div>
          <div className="h-10 w-10 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl flex items-center justify-center">
            <XCircle size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Dispatched</span>
            <h3 className="text-2xl font-black text-slate-900">
              {(stats?.status?.sent || 0) + (stats?.status?.failed || 0) + (stats?.status?.pending || 0)}
            </h3>
          </div>
          <div className="h-10 w-10 bg-slate-50 text-slate-500 border border-slate-100 rounded-xl flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
        </div>
      </div>

      {/* Main Console Interface */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Sub Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('compose')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeSubTab === 'compose'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Send size={14} />
            <span>Compose Broadcast</span>
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeSubTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History size={14} />
            <span>Delivery Logs</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6">
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeSubTab === 'compose' && (
            <form onSubmit={handleBroadcast} className="space-y-6 max-w-xl">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient Cohort</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targets"
                      value="all"
                      checked={targets === 'all'}
                      onChange={() => setTargets('all')}
                      className="text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                    />
                    <span>All Guardians</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targets"
                      value="class"
                      checked={targets === 'class'}
                      onChange={() => setTargets('class')}
                      className="text-emerald-700 focus:ring-emerald-700 h-4 w-4"
                    />
                    <span>Specific Class</span>
                  </label>
                </div>
              </div>

              {targets === 'class' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Target Class</label>
                  <select
                    required
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-800 text-sm bg-white"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes && classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SMS Message Body</label>
                  <span className={`text-[10px] font-bold ${message.length > charLimit ? 'text-amber-600' : 'text-slate-400'}`}>
                    {message.length} chars ({numPages} {numPages > 1 ? 'pages' : 'page'})
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type school announcement or update to broadcast..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-800 text-sm"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Note: A standard single SMS contains up to 160 characters. Messages exceeding this limit will count as multiple page credits.
                </p>
              </div>

              <button
                type="submit"
                disabled={broadcastMutation.isPending || !message}
                className="py-3 px-6 rounded-xl bg-emerald-850 hover:bg-emerald-950 text-white font-extrabold text-xs shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={12} />
                <span>{broadcastMutation.isPending ? 'Sending Broadcast...' : 'Dispatch SMS Broadcast'}</span>
              </button>
            </form>
          )}

          {activeSubTab === 'logs' && (
            <div className="space-y-6">
              {isLogsLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <th className="px-6 py-3">Recipient</th>
                          <th className="px-6 py-3">Message</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {logData?.data && logData.data.length > 0 ? (
                          logData.data.map((log) => (
                            <tr key={log._id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                {log.recipient}
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-700 max-w-sm truncate" title={log.message}>
                                {log.message}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-550 capitalize">{log.type?.replace('_', ' ')}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusStyle(log.status)}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-400">
                                {new Date(log.createdAt).toLocaleString('en-GB')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-xs text-slate-400">
                              No SMS history found in the audit logs.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  {logData?.meta && logData.meta.pages > 1 && (
                    <div className="flex justify-between items-center pt-2">
                      <button
                        disabled={pageLog === 1}
                        onClick={() => setPageLog((p) => p - 1)}
                        className="py-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        Page {pageLog} of {logData.meta.pages}
                      </span>
                      <button
                        disabled={pageLog === logData.meta.pages}
                        onClick={() => setPageLog((p) => p + 1)}
                        className="py-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SmsDashboardPage;
