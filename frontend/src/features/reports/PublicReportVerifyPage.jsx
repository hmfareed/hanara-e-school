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
} from 'lucide-react';

const PublicReportVerifyPage = () => {
  const { token } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publicVerifyReport', token],
    queryFn: async () => {
      const res = await api.get(`/reports/verify/${token}`);
      return res.data;
    },
    retry: 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-sm w-full space-y-4">
          <Loader2 className="w-10 h-10 text-[#78282E] animate-spin mx-auto" />
          <p className="font-bold text-slate-800 text-sm">Verifying Report Card Credentials…</p>
          <p className="text-xs text-slate-400 font-mono">Token: {token}</p>
        </div>
      </div>
    );
  }

  const report = data?.data;
  const isValid = data?.valid === true;

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col items-center justify-center p-4 font-sans select-none">
      
      {/* Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden">
        
        {/* Verification Status Header Banner */}
        <div className={`p-6 text-center text-white relative overflow-hidden ${
          isValid
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900'
            : 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900'
        }`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
          
          <div className="relative z-10 space-y-2">
            <div className="w-16 h-16 bg-white/10 rounded-2xl border-2 border-white/30 flex items-center justify-center mx-auto shadow-md">
              {isValid ? (
                <ShieldCheck className="w-10 h-10 text-emerald-200" />
              ) : (
                <ShieldX className="w-10 h-10 text-rose-200" />
              )}
            </div>

            <h1 className="text-xl font-black tracking-wide">
              {isValid ? 'Official Report Card Verified' : 'Verification Failed'}
            </h1>
            <p className="text-xs text-white/80 font-medium max-w-xs mx-auto">
              {isValid
                ? 'This academic terminal report is authentic and has been verified by HANARA Schools.'
                : 'The scanned code is invalid, expired, or counterfeit.'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        {isValid && report && (
          <div className="p-6 space-y-5">
            
            {/* Student Profile Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#78282E]/10 text-[#78282E] font-black flex items-center justify-center text-xl shrink-0">
                  {report.studentName.charAt(0)}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 leading-tight">{report.studentName}</p>
                  <p className="text-xs font-bold text-slate-500">
                    Admission #: <span className="font-mono text-slate-800">{report.admissionNumber}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Class / Grade</span>
                  <span className="text-slate-800">{report.className}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Academic Period</span>
                  <span className="text-slate-800">{report.term} · {report.academicYear}</span>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Official Academic Record</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-lg font-black text-emerald-800">{report.summary?.averagePercentage}%</p>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Average Percentage</p>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-lg font-black text-indigo-800">{report.summary?.classPosition}</p>
                  <p className="text-[10px] font-bold text-indigo-700 uppercase">Class Position</p>
                </div>
              </div>
            </div>

            {/* Remark */}
            {report.summary?.headmasterRemark && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 block text-[10px] uppercase">Headmaster's Official Remark</span>
                <p className="italic text-amber-800">"{report.summary.headmasterRemark}"</p>
              </div>
            )}

            {/* Token details */}
            <div className="text-[10px] text-slate-400 space-y-1 pt-2 border-t border-slate-100 text-center font-mono">
              <p>Security Reference: {report.token}</p>
              <p>Issued On: {new Date(report.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
          <p className="text-[11px] font-bold text-slate-600">HANARA Schools Management System</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Secure Document Verification Portal</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReportVerifyPage;
