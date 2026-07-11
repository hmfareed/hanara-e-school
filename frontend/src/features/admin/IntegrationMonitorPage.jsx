import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Wifi, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Loader2, Activity,
} from 'lucide-react';

const STATUS_META = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  degraded: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  down: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const ServiceCard = ({ service, onTest }) => {
  const [testing, setTesting] = useState(false);
  const meta = STATUS_META[service.status] || STATUS_META.down;
  const Icon = meta.icon;

  const handleTest = async () => {
    setTesting(true);
    await onTest(service.service);
    setTesting(false);
  };

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 ${meta.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900 capitalize">{service.service.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot} ring-2 ring-white`} />
            <span className={`text-xs font-bold capitalize ${meta.color}`}>{service.status}</span>
          </div>
        </div>
        <Icon size={22} className={meta.color} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <div>
          <span className="text-slate-400 font-semibold">Last Checked</span>
          <p className="font-medium">{service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleString() : '—'}</p>
        </div>
        <div>
          <span className="text-slate-400 font-semibold">Last Success</span>
          <p className="font-medium">{service.lastSuccessAt ? new Date(service.lastSuccessAt).toLocaleString() : '—'}</p>
        </div>
        {service.creditsRemaining !== null && service.creditsRemaining !== undefined && (
          <div>
            <span className="text-slate-400 font-semibold">SMS Credits</span>
            <p className="font-bold text-slate-800">{service.creditsRemaining.toLocaleString()}</p>
          </div>
        )}
        {service.lastFailureReason && (
          <div className="col-span-2">
            <span className="text-red-500 font-semibold">Last Error</span>
            <p className="text-red-700 font-medium truncate">{service.lastFailureReason}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleTest}
        disabled={testing}
        className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors disabled:opacity-60"
      >
        {testing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        <span>{testing ? 'Testing…' : 'Test Connection'}</span>
      </button>
    </div>
  );
};

const IntegrationMonitorPage = () => {
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['admin-integrations'],
    queryFn: async () => (await api.get('/admin/integrations/status')).data?.data || [],
    refetchInterval: 60000,
  });

  const testMutation = useMutation({
    mutationFn: (service) => api.post(`/admin/integrations/${service}/test`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-integrations'] }),
  });

  const healthy = integrations.filter((s) => s.status === 'healthy').length;
  const total = integrations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Integration Monitor</h1>
            <p className="text-sm text-slate-500">Real-time status of all connected external services</p>
          </div>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-xl border ${
          healthy === total ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {healthy}/{total} healthy
        </span>
      </div>

      {/* Service Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {integrations.map((svc) => (
            <ServiceCard
              key={svc._id || svc.service}
              service={svc}
              onTest={async (service) => testMutation.mutateAsync(service)}
            />
          ))}
        </div>
      )}

      {/* Overall status summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Wifi size={16} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Service Health Summary</h3>
        </div>
        <div className="space-y-3">
          {integrations.map((svc) => {
            const meta = STATUS_META[svc.status] || STATUS_META.down;
            return (
              <div key={svc.service} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-700 capitalize">{svc.service.replace(/_/g, ' ')}</span>
                <span className={`text-xs font-bold capitalize flex items-center gap-1.5 ${meta.color}`}>
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {svc.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IntegrationMonitorPage;
