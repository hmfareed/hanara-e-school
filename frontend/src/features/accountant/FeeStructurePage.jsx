import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  BanknoteIcon,
  Bus,
  Calendar,
  Lock,
  Building,
  Info,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const FeeStructurePage = () => {
  const { data: structures = [], isLoading } = useQuery({
    queryKey: ['dailyFeeStructures'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/structures');
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Fee Structure</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Currently active daily feeding and bus fare rates
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 self-start sm:self-auto"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          <Lock size={12} className="text-slate-400" />
          Read-only — edit in System Admin
        </div>
      </div>

      {/* Info note */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}
      >
        <Info size={16} className="text-teal-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          These rates are looked up automatically when a teacher opens the daily register for their class.
          The most specific rule (class &gt; grade level &gt; school-wide default) applies.
          Each rule has an effective start date — older entries are preserved for historical accuracy.
        </p>
      </div>

      {/* Structures */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-20" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : structures.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
          <BanknoteIcon size={40} className="text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">No fee structures configured</p>
          <p className="text-xs text-slate-300 mt-1">The System Administrator needs to add at least one rate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {structures.map((s, i) => {
            const isSchoolWide = !s.class && !s.level;
            const isClassSpecific = !!s.class;
            const isLevelSpecific = !!s.level && !s.class;

            return (
              <div
                key={s._id || i}
                className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                style={{ border: '1px solid #e2e8f0' }}
              >
                {/* Scope */}
                <div className="flex items-center gap-4">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isClassSpecific
                        ? 'rgba(99,102,241,0.1)'
                        : isLevelSpecific
                        ? 'rgba(20,184,166,0.1)'
                        : 'rgba(148,163,184,0.1)',
                      border: isClassSpecific
                        ? '1px solid rgba(99,102,241,0.2)'
                        : isLevelSpecific
                        ? '1px solid rgba(20,184,166,0.2)'
                        : '1px solid rgba(148,163,184,0.2)',
                    }}
                  >
                    <Building
                      size={18}
                      className={
                        isClassSpecific ? 'text-indigo-600' : isLevelSpecific ? 'text-teal-600' : 'text-slate-500'
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-800">
                        {isClassSpecific
                          ? s.class?.name || 'Specific Class'
                          : isLevelSpecific
                          ? `Level: ${s.level?.name || 'Grade Level'}`
                          : 'School-wide Default'}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={
                          isClassSpecific
                            ? { background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.2)' }
                            : isLevelSpecific
                            ? { background: 'rgba(20,184,166,0.1)', color: '#0d9488', border: '1px solid rgba(20,184,166,0.2)' }
                            : { background: 'rgba(148,163,184,0.1)', color: '#64748b', border: '1px solid rgba(148,163,184,0.2)' }
                        }
                      >
                        {isClassSpecific ? 'Class' : isLevelSpecific ? 'Level' : 'Default'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={9} />
                        From: {s.effectiveStartDate ? new Date(s.effectiveStartDate).toLocaleDateString('en-GH') : '—'}
                      </span>
                      {s.lastUpdatedBy && (
                        <span>Set by {s.lastUpdatedBy?.email?.split('@')[0] || '—'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BanknoteIcon size={12} className="text-teal-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feeding</span>
                    </div>
                    <span className="text-lg font-black text-teal-700">{GHS(s.feedingFeeAmount)}</span>
                    <span className="block text-[9px] text-slate-400">per day</span>
                  </div>
                  <div className="h-10 w-px bg-slate-100" />
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bus size={12} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bus Fare</span>
                    </div>
                    <span className="text-lg font-black text-blue-700">{GHS(s.busFareAmount)}</span>
                    <span className="block text-[9px] text-slate-400">per day</span>
                  </div>
                  <div className="h-10 w-px bg-slate-100" />
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Combined</span>
                    <span className="text-lg font-black text-slate-800">
                      {GHS((s.feedingFeeAmount || 0) + (s.busFareAmount || 0))}
                    </span>
                    <span className="block text-[9px] text-slate-400">per day</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeeStructurePage;
