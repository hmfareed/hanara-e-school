import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  HardDrive, RefreshCw, RotateCcw, CheckCircle2,
  AlertTriangle, Loader2, Clock,
} from 'lucide-react';

const STATUS_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
};

const TYPE_STYLES = {
  daily: 'bg-blue-50 text-blue-700',
  weekly: 'bg-indigo-50 text-indigo-700',
  monthly: 'bg-purple-50 text-purple-700',
  manual: 'bg-slate-100 text-slate-700',
};

const RestoreModal = ({ backup, onClose, onConfirm }) => {
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm(backup._id, token);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.message || 'Restore failed. Check the confirmation token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-5">
        {step === 1 && (
          <>
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-slate-900">Confirm Restore</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
              <p className="font-bold">⚠ This will overwrite current system data.</p>
              <p>You are about to restore from the <strong className="capitalize">{backup.type}</strong> backup taken on <strong>{new Date(backup.createdAt).toLocaleDateString()}</strong>.</p>
              <p>All data written after this point will be lost.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold">I Understand — Continue</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="text-lg font-bold text-slate-900">Type the School Name</h3>
            <p className="text-sm text-slate-600">Type <strong>Hanara</strong> exactly to confirm you authorise this system restore.</p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Hanara"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={loading || !token}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Execute Restore
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={24} />
              <h3 className="text-lg font-bold text-slate-900">Restore Successful</h3>
            </div>
            <p className="text-sm text-slate-600">System has been restored from the selected backup point. The audit log has been updated.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700">Close</button>
          </>
        )}
      </div>
    </div>
  );
};

const BackupRestorePage = () => {
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['admin-backups'],
    queryFn: async () => (await api.get('/admin/backups')).data?.data || [],
  });

  const runBackup = useMutation({
    mutationFn: () => api.post('/admin/backups/run'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-backups'] }),
  });

  const restoreBackup = async (id, token) => {
    await api.post(`/admin/backups/${id}/restore`, { confirmationToken: token });
    queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
  };

  return (
    <div className="space-y-6">
      {selectedBackup && (
        <RestoreModal
          backup={selectedBackup}
          onClose={() => setSelectedBackup(null)}
          onConfirm={restoreBackup}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <HardDrive size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Backup & Restore</h1>
            <p className="text-sm text-slate-500">Manage system backups and initiate point-in-time restores</p>
          </div>
        </div>
        <button
          onClick={() => runBackup.mutate()}
          disabled={runBackup.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-60"
        >
          {runBackup.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span>{runBackup.isPending ? 'Running…' : 'Run Backup Now'}</span>
        </button>
      </div>

      {/* Retention Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Clock size={15} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Retention Policy (Grandfather–Father–Son)</h3>
        </div>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {['daily', 'weekly', 'monthly'].map((type) => {
            const count = backups.filter((b) => b.type === type).length;
            return (
              <div key={type} className={`flex-shrink-0 text-center px-5 py-3 rounded-xl border ${TYPE_STYLES[type]}`}>
                <p className="text-2xl font-extrabold">{count}</p>
                <p className="text-xs font-bold uppercase mt-0.5 capitalize">{type}</p>
              </div>
            );
          })}
          <div className="flex-shrink-0 text-center px-5 py-3 rounded-xl border bg-slate-100 text-slate-700">
            <p className="text-2xl font-extrabold">{backups.filter((b) => b.type === 'manual').length}</p>
            <p className="text-xs font-bold uppercase mt-0.5">Manual</p>
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Backup History</h3>
          <span className="text-xs text-slate-400">{backups.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                : backups.map((b) => (
                    <tr key={b._id} className={`hover:bg-slate-50 transition-colors ${b.restoredFrom ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${TYPE_STYLES[b.type] || 'bg-slate-100 text-slate-600'}`}>
                          {b.type}{b.restoredFrom ? ' (restore)' : ''}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                        {b.fileSizeBytes ? `${(b.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${STATUS_STYLES[b.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {b.status === 'completed' && !b.restoredFrom && (
                          <button
                            onClick={() => setSelectedBackup(b)}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors ml-auto"
                          >
                            <RotateCcw size={12} />
                            <span>Restore</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupRestorePage;
