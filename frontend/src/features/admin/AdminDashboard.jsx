import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Server,
  Database,
  Wifi,
  WifiOff,
  Clock,
  Users,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  HardDrive,
} from 'lucide-react';

const StatusDot = ({ status }) => {
  const colors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-400',
    down: 'bg-red-500',
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status] || 'bg-slate-400'} ring-2 ring-white`}
    />
  );
};

const SeverityBadge = ({ severity }) => {
  const styles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    sensitive: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${styles[severity] || ''}`}>
      {severity}
    </span>
  );
};

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ['admin-integrations'],
    queryFn: async () => (await api.get('/admin/integrations/status')).data?.data || [],
    refetchInterval: 30000,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs-critical'],
    queryFn: async () =>
      (await api.get('/admin/audit-logs?severity=critical&limit=10')).data?.data || [],
  });

  const { data: backups = [] } = useQuery({
    queryKey: ['admin-backups-latest'],
    queryFn: async () => (await api.get('/admin/backups')).data?.data || [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data?.data || [],
  });

  const runBackupMutation = useMutation({
    mutationFn: () => api.post('/admin/backups/run'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-backups-latest'] }),
  });

  const latestBackup = backups[0];
  const roleBreakdown = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 md:p-8 shadow border border-slate-800">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
            System Administrator Panel
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Infrastructure Overview
          </h2>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Monitor system health, integration status, and recent critical security events across HANARA SMS.
          </p>
        </div>
        <div className="absolute bottom-4 right-6 hidden md:flex items-center space-x-2 text-slate-500 text-xs">
          <Activity size={14} />
          <span>Live system telemetry</span>
        </div>
      </div>

      {/* Health Tiles Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* DB Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database</span>
            <Database size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-center space-x-2">
            <StatusDot status="healthy" />
            <span className="text-lg font-bold text-slate-800">Connected</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">MongoDB Atlas — Cluster0</p>
        </div>

        {/* Last Backup */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Backup</span>
            <HardDrive size={18} className="text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-slate-800">
            {latestBackup
              ? new Date(latestBackup.createdAt).toLocaleDateString()
              : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {latestBackup
              ? `${(latestBackup.fileSizeBytes / 1024 / 1024).toFixed(1)} MB · ${latestBackup.type}`
              : 'No backups yet'}
          </p>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Users</span>
            <Users size={18} className="text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{users.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {users.filter((u) => u.isActive).length} active
          </p>
        </div>

        {/* Critical Audit Events */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Events</span>
            <ShieldAlert size={18} className="text-red-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{auditLogs.length}</p>
          <p className="text-xs text-slate-400 mt-1">Last 10 critical records</p>
        </div>
      </div>

      {/* Integrations Strip + Quick Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integration Health Cards */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Integration Health</h3>
            <Wifi size={16} className="text-slate-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {integrations.map((svc) => (
              <div
                key={svc.service}
                className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {svc.service.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <StatusDot status={svc.status} />
                    <span className={`text-xs font-semibold capitalize ${
                      svc.status === 'healthy' ? 'text-emerald-600' :
                      svc.status === 'degraded' ? 'text-amber-600' : 'text-red-600'
                    }`}>{svc.status}</span>
                  </div>
                  {svc.creditsRemaining !== null && svc.creditsRemaining !== undefined && (
                    <p className="text-[10px] text-slate-400">{svc.creditsRemaining.toLocaleString()} credits</p>
                  )}
                </div>
                {svc.status === 'healthy' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : svc.status === 'degraded' ? (
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Backup Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Backup</h3>
              <HardDrive size={16} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              {backups.slice(0, 3).map((b) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <span className="font-semibold text-slate-700 capitalize">{b.type}</span>
                    <span className="text-slate-400 ml-2">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    b.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    b.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => runBackupMutation.mutate()}
            disabled={runBackupMutation.isPending}
            className="mt-5 w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={runBackupMutation.isPending ? 'animate-spin' : ''} />
            <span>{runBackupMutation.isPending ? 'Running...' : 'Run Manual Backup'}</span>
          </button>
        </div>
      </div>

      {/* Recent Critical Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert size={14} className="text-red-500" />
            <span>Recent Critical Events</span>
          </h3>
          <Clock size={14} className="text-slate-400" />
        </div>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium">No critical events. All clear.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm"
              >
                <div className="flex items-center space-x-3">
                  <SeverityBadge severity={log.severity} />
                  <span className="font-mono text-xs text-slate-700 font-medium">{log.action}</span>
                  <span className="text-slate-500 text-xs hidden md:inline">{log.targetType}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="font-semibold">{log.actorId?.email || 'system'}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Breakdown */}
      {Object.keys(roleBreakdown).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">
            Active Users by Role
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(roleBreakdown).map(([role, count]) => (
              <div
                key={role}
                className="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition-colors"
              >
                <span className="text-2xl font-extrabold text-slate-800">{count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 capitalize">
                  {role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
