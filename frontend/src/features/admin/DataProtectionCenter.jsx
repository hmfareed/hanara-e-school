import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock,
  UserCheck, Loader2, FileLock2,
} from 'lucide-react';

const STATUS_STYLES = {
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const TYPE_ICON = {
  export: '📤',
  delete: '🗑️',
};

const DataProtectionCenter = () => {
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newReq, setNewReq] = useState({ requestType: 'export', subjectType: 'Student', subjectId: '', requestedBy: '' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-data-requests'],
    queryFn: async () => (await api.get('/admin/data-requests')).data?.data || [],
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/admin/data-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data-requests'] });
      setShowNewForm(false);
      setNewReq({ requestType: 'export', subjectType: 'Student', subjectId: '', requestedBy: '' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/data-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-data-requests'] }),
  });

  const executeMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/data-requests/${id}/execute`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-data-requests'] }),
  });

  const pending = requests.filter((r) => r.status === 'pending_approval').length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <FileLock2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Data Protection Center</h1>
            <p className="text-sm text-slate-500">Manage Act 843 export and erasure requests — two-person rule enforced</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <ShieldCheck size={15} />
          <span>New Request</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: requests.length, color: 'text-slate-800' },
          { label: 'Pending Approval', value: pending, color: 'text-amber-700' },
          { label: 'Approved', value: approved, color: 'text-blue-700' },
          { label: 'Executed', value: requests.filter((r) => r.status === 'executed').length, color: 'text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New Request Form */}
      {showNewForm && (
        <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Submit New Data Protection Request</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Request Type</label>
              <select value={newReq.requestType} onChange={(e) => setNewReq({ ...newReq, requestType: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="export">Export (Data Portability)</option>
                <option value="delete">Delete (Right to Erasure)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Subject Type</label>
              <select value={newReq.subjectType} onChange={(e) => setNewReq({ ...newReq, subjectType: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Subject ID</label>
              <input type="text" placeholder="MongoDB ObjectId…" value={newReq.subjectId}
                onChange={(e) => setNewReq({ ...newReq, subjectId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Requested By (Parent/Guardian Name)</label>
              <input type="text" placeholder="e.g. Ama Asante" value={newReq.requestedBy}
                onChange={(e) => setNewReq({ ...newReq, requestedBy: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => submitMutation.mutate(newReq)}
              disabled={submitMutation.isPending || !newReq.subjectId || !newReq.requestedBy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Submit for Approval
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">All Requests</h3>
          <span className="text-xs text-slate-400">{requests.length} total</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <UserCheck size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No data protection requests submitted yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICON[req.requestType] || '📋'}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 capitalize">
                      {req.requestType} — {req.subjectType}
                    </p>
                    <p className="text-xs text-slate-500">Requested by: <span className="font-semibold">{req.requestedBy}</span></p>
                    <p className="text-xs text-slate-400 font-mono">{req.subjectId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded border ${STATUS_STYLES[req.status] || ''}`}>
                    {req.status.replace('_', ' ')}
                  </span>
                  {req.status === 'pending_approval' && (
                    <button
                      onClick={() => approveMutation.mutate(req._id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
                    >
                      {approveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                  )}
                  {req.status === 'approved' && (
                    <button
                      onClick={() => executeMutation.mutate(req._id)}
                      disabled={executeMutation.isPending}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-60"
                    >
                      {executeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Execute
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

export default DataProtectionCenter;
