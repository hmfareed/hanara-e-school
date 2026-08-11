import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  ShieldCheck,
  ShieldX,
  Award,
  Calendar,
  User,
  GraduationCap,
  CheckCircle2,
  FileText,
  Building,
  Loader2,
  PhoneCall,
  UserCheck,
  Sparkles,
  QrCode
} from 'lucide-react';

const PublicCardVerifyPage = () => {
  const { token } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publicVerifyCard', token],
    queryFn: async () => {
      const res = await api.get(`/id-cards/verify-public/${token}`);
      return res.data;
    },
    retry: 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full space-y-4 text-white">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <p className="font-bold text-sm">Verifying Official ID Card Token...</p>
          <p className="text-xs text-emerald-200/60 font-mono truncate px-2">Token: {token}</p>
        </div>
      </div>
    );
  }

  const payload = data?.data;
  const isValid = data?.valid === true;
  const isStudent = data?.entityType === 'student';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden relative z-10">
        
        {/* Verification Status Header Banner */}
        <div className={`p-6 text-center text-white relative overflow-hidden ${
          isValid
            ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900'
            : 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900'
        }`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
          
          <div className="relative z-10 space-y-2">
            <div className="w-16 h-16 bg-white/10 rounded-2xl border-2 border-white/30 flex items-center justify-center mx-auto shadow-md backdrop-blur-md">
              {isValid ? (
                <ShieldCheck className="w-10 h-10 text-emerald-300" />
              ) : (
                <ShieldX className="w-10 h-10 text-rose-300" />
              )}
            </div>

            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-white/10 border border-white/20">
              HANARA Official Verification
            </span>

            <h1 className="text-xl font-black tracking-wide text-white">
              {isValid ? (isStudent ? 'Verified Student ID Card' : 'Verified Staff ID Card') : 'Verification Failed'}
            </h1>
            <p className="text-xs text-white/80 font-medium max-w-xs mx-auto">
              {isValid
                ? 'This ID Card is authentic and active in the official HANARA Schools Registry.'
                : data?.message || 'The scanned QR code token is invalid, expired, or counterfeit.'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        {isValid && payload && (
          <div className="p-6 space-y-5">
            
            {/* Person Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center font-black text-2xl text-emerald-900 overflow-hidden shrink-0 shadow-sm">
                  {payload.photoUrl ? (
                    <img src={payload.photoUrl} alt={payload.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{payload.fullName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {isStudent ? 'STUDENT' : payload.role || 'STAFF'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 capitalize">
                      {payload.status}
                    </span>
                  </div>
                  <p className="text-base font-black text-slate-900 leading-tight mt-1">{payload.fullName}</p>
                  <p className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                    {isStudent ? `Adm #: ${payload.admissionNumber}` : `Staff ID: ${payload.staffId}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-200/60 font-semibold">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {isStudent ? 'Class / Grade' : 'Department'}
                  </span>
                  <span className="text-slate-800 font-bold">{isStudent ? payload.className : payload.department}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Emergency Contact
                  </span>
                  <span className="text-slate-800 font-mono font-bold">{payload.emergencyContact}</span>
                </div>
              </div>
            </div>

            {/* School Profile Stamp */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs space-y-1 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-800 text-white shrink-0 mt-0.5">
                <Building size={16} />
              </div>
              <div>
                <span className="font-bold text-emerald-950 block text-xs">
                  {payload.schoolProfile?.name || 'HANARA SCHOOLS'}
                </span>
                <p className="text-[11px] text-emerald-800">
                  {payload.schoolProfile?.motto || 'Knowledge, Character & Excellence'}
                </p>
                <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                  {payload.schoolProfile?.address}
                </p>
              </div>
            </div>

            {/* Token details */}
            <div className="text-[10px] text-slate-400 space-y-0.5 pt-2 border-t border-slate-100 text-center font-mono">
              <p>Security Reference: {token}</p>
              <p>Verified Live On: {new Date(payload.verifiedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
          <p className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
            <ShieldCheck size={14} className="text-emerald-700" />
            HANARA Schools Management System
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">Official Student & Staff Identity Portal</p>
        </div>
      </div>
    </div>
  );
};

export default PublicCardVerifyPage;
