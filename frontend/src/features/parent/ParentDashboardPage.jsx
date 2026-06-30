import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  TrendingUp,
  UserCheck,
  Receipt,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
} from 'lucide-react';
import api from '../../services/api';

const ParentDashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parentDashboard'],
    queryFn: async () => {
      const res = await api.get('/parent/dashboard');
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl p-6">
              <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
              <div className="h-8 w-16 bg-slate-300 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-64"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h4 className="font-bold text-lg">Error loading parent portal</h4>
        <p className="text-sm mt-1">{error.message || 'Please check if the backend server is running.'}</p>
      </div>
    );
  }

  const { guardian, kids, billing, recentPayments, invoices } = data || {};

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'absent':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'late':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'excused':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white p-6 md:p-8 shadow-sm border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/3 animate-pulse"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <ShieldCheck size={12} /> Parent Portal Secure Access
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Welcome, {guardian?.firstName} {guardian?.lastName}
          </h2>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Monitor your children's educational progress, attendance records, school fees, and make secure Mobile Money payments.
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fees Invoiced</span>
            <h3 className="text-2xl font-extrabold text-slate-900">GHS {billing?.totalDue?.toFixed(2) || '0.00'}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">For all active terms</span>
          </div>
          <div className="h-12 w-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Amount</span>
            <h3 className="text-2xl font-extrabold text-emerald-700">GHS {billing?.totalPaid?.toFixed(2) || '0.00'}</h3>
            <span className="text-[10px] text-emerald-500 block mt-1">Confirmed payments</span>
          </div>
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
            <h3 className={`text-2xl font-extrabold ${billing?.outstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              GHS {billing?.outstanding?.toFixed(2) || '0.00'}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-1">
              {billing?.outstanding > 0 ? 'Dues pending payment' : 'Fully cleared'}
            </span>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
            billing?.outstanding > 0 
              ? 'bg-rose-50 border-rose-100 text-rose-600' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            {billing?.outstanding > 0 ? <AlertCircle size={22} /> : <ShieldCheck size={22} />}
          </div>
        </div>
      </div>

      {/* Children List and Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Wards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              My Children (Wards)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {kids && kids.map((kid) => (
              <div 
                key={kid.id} 
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100 font-bold text-sm">
                      {kid.firstName[0]}{kid.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{kid.firstName} {kid.lastName}</h4>
                      <span className="text-[11px] text-slate-400 font-mono font-medium">{kid.admissionNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-3 py-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Class:</span>
                      <span className="font-bold text-slate-700">{kid.className}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Today's Attendance:</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getStatusBadgeStyle(kid.todayStatus)}`}>
                        {kid.todayStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/parent/child/${kid.id}`}
                  className="mt-6 w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
                >
                  <span>View Attendance &amp; Fees</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Billing / Payment Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Recent Activity &amp; Invoices
            </h3>
            
            <div className="space-y-4">
              {invoices && invoices.length > 0 ? (
                invoices.slice(0, 3).map((inv) => (
                  <div key={inv._id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                        {inv.invoiceNumber}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        inv.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>{inv.student?.firstName} • {inv.termName}</span>
                      <span className="font-extrabold text-slate-700">GHS {inv.balance.toFixed(2)} due</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No invoice history found.</p>
              )}
            </div>

            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3 flex items-center gap-1.5">
              <Clock size={12} /> Last Payments
            </h3>
            <div className="space-y-3">
              {recentPayments && recentPayments.length > 0 ? (
                recentPayments.slice(0, 3).map((pay) => (
                  <div key={pay._id} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-bold text-slate-800 block">{pay.receiptNumber}</span>
                      <span className="text-[10px] text-slate-400">{pay.student?.firstName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600">GHS {pay.amount.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 block">{new Date(pay.paidAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 py-2 text-center">No payment history found.</p>
              )}
            </div>
          </div>
          
          {kids && kids.length > 0 && (
            <Link
              to={`/parent/child/${kids[0].id}`}
              className="mt-6 flex items-center justify-center space-x-1 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors"
            >
              <span>Manage Child Finance</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
