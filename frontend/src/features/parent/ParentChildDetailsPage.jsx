import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle,
  ArrowRight,
  Printer,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';

const TABS = [
  { id: 'attendance', label: 'Attendance History', icon: Calendar },
  { id: 'invoices', label: 'School Invoices', icon: FileText },
  { id: 'payments', label: 'Payment Records', icon: CreditCard },
];

const ParentChildDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('attendance');

  // Query Child Profile Details
  const { data: child, isLoading: isChildLoading } = useQuery({
    queryKey: ['parentChildProfile', id],
    queryFn: async () => {
      const res = await api.get('/parent/children');
      const list = res.data?.data || [];
      return list.find((item) => item._id === id);
    },
  });

  // Query Child Attendance History
  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['parentChildAttendance', id],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${id}/attendance`);
      return res.data?.data;
    },
    enabled: activeTab === 'attendance',
  });

  // Query Child Invoices
  const { data: invoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['parentChildInvoices', id],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${id}/invoices`);
      return res.data?.data;
    },
    enabled: activeTab === 'invoices',
  });

  // Query Child Payments
  const { data: payments, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['parentChildPayments', id],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${id}/payments`);
      return res.data?.data;
    },
    enabled: activeTab === 'payments',
  });

  // Pay Invoice mutation - calls backend momo initiate Checkout
  const momoPayMutation = useMutation({
    mutationFn: async (invoiceId) => {
      const res = await api.post('/fees/payments/momo/initiate', { invoiceId });
      return res.data?.data;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        // Redirect the user to checkout URL
        window.location.href = data.checkoutUrl;
      }
    },
  });

  if (isChildLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="h-12 bg-slate-200 rounded-xl"></div>
        <div className="h-64 bg-white border border-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center space-x-3">
        <AlertTriangle size={24} />
        <div>
          <h4 className="font-bold">Child Profile Not Found</h4>
          <p className="text-sm mt-0.5">We could not retrieve this child profile. Please return to the dashboard.</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'absent':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'late':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'excused':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and profile info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link to="/" className="inline-flex items-center space-x-1 text-xs font-bold text-slate-400 hover:text-emerald-700 transition-colors uppercase tracking-wider mb-2">
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 bg-emerald-950 text-white rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-sm">
              {child.firstName[0]}{child.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-none">{child.firstName} {child.lastName}</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Class: <span className="text-slate-800 font-bold">{child.currentClass?.name || 'N/A'}</span> • Adm: <span className="font-mono text-slate-700 font-bold">{child.admissionNumber}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab contents */}
        <div className="p-6">
          
          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {isAttendanceLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-center p-2 border-r border-slate-200/50 last:border-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
                      <span className="text-xl font-extrabold text-emerald-700">{attendanceData?.summary?.attendanceRate ?? 0}%</span>
                    </div>
                    <div className="text-center p-2 border-r border-slate-200/50 last:border-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present</span>
                      <span className="text-xl font-extrabold text-slate-800">{attendanceData?.summary?.present ?? 0} days</span>
                    </div>
                    <div className="text-center p-2 border-r border-slate-200/50 last:border-0">
                      <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-wider block">Absent</span>
                      <span className="text-xl font-extrabold text-rose-600">{attendanceData?.summary?.absent ?? 0} days</span>
                    </div>
                    <div className="text-center p-2 last:border-0">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Late</span>
                      <span className="text-xl font-extrabold text-amber-600">{attendanceData?.summary?.late ?? 0} days</span>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {attendanceData?.records && attendanceData.records.length > 0 ? (
                          attendanceData.records.map((rec) => (
                            <tr key={rec._id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {new Date(rec.date).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${getStatusBadgeStyle(rec.status)}`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                                {rec.notes || '—'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-6 py-8 text-center text-xs text-slate-400">
                              No attendance history logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              {isInvoicesLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-3">Invoice #</th>
                        <th className="px-6 py-3">Term</th>
                        <th className="px-6 py-3 text-right">Amount Due</th>
                        <th className="px-6 py-3 text-right">Paid</th>
                        <th className="px-6 py-3 text-right">Balance</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoices && invoices.length > 0 ? (
                        invoices.map((inv) => {
                          const isPaid = inv.status === 'paid';
                          const isPendingPay = momoPayMutation.isPending && momoPayMutation.variables === inv._id;
                          return (
                            <tr key={inv._id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">{inv.termName}</td>
                              <td className="px-6 py-4 text-right font-semibold text-slate-900">GHS {inv.amountDue.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right font-medium text-emerald-600">GHS {inv.amountPaid.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right font-extrabold text-slate-900">GHS {inv.balance.toFixed(2)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                                  inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  inv.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                {!isPaid && (
                                  <button
                                    onClick={() => momoPayMutation.mutate(inv._id)}
                                    disabled={isPendingPay}
                                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                                  >
                                    <Sparkles size={12} />
                                    <span>{isPendingPay ? 'Processing...' : 'Pay Online'}</span>
                                  </button>
                                )}
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={() => window.open(`${api.defaults.baseURL}/fees/invoices/${inv._id}/pdf`, '_blank')}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                                  title="Print PDF Invoice"
                                >
                                  <Printer size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-xs text-slate-400">
                            No billing invoice data found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {isPaymentsLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-3">Receipt #</th>
                        <th className="px-6 py-3">Invoice #</th>
                        <th className="px-6 py-3 text-right">Amount Paid</th>
                        <th className="px-6 py-3">Payment Method</th>
                        <th className="px-6 py-3">Date Paid</th>
                        <th className="px-6 py-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payments && payments.length > 0 ? (
                        payments.map((pay) => (
                          <tr key={pay._id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-mono font-bold text-slate-850">
                              {pay.receiptNumber}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{pay.invoice?.invoiceNumber}</td>
                            <td className="px-6 py-4 text-right font-extrabold text-emerald-700">GHS {pay.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 capitalize font-medium text-slate-600">
                              {pay.method === 'momo' ? `MoMo (${pay.provider})` : pay.method}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400">
                              {new Date(pay.paidAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => window.open(`${api.defaults.baseURL}/fees/payments/${pay._id}/receipt`, '_blank')}
                                className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-xs text-slate-600 transition-colors"
                              >
                                <Download size={12} />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-400">
                            No payment transactions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ParentChildDetailsPage;
