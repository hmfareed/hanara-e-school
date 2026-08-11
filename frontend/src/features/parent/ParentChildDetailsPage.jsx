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
  Award,
  UtensilsCrossed,
} from 'lucide-react';
import api from '../../services/api';

const TABS = [
  { id: 'attendance', label: 'Attendance History', icon: Calendar },
  { id: 'grades', label: 'Subject Grades & Marks', icon: Award },
  { id: 'dailyFees', label: 'Daily Feeding & Bus Fees', icon: UtensilsCrossed },
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

  // Query Child Subject Grades (Live marks)
  const { data: grades, isLoading: isGradesLoading } = useQuery({
    queryKey: ['parentChildGrades', id],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${id}/grades`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'grades',
  });

  // Query Child Daily Fees History (Feeding & Transport)
  const { data: dailyFees, isLoading: isDailyFeesLoading } = useQuery({
    queryKey: ['parentChildDailyFees', id],
    queryFn: async () => {
      const res = await api.get(`/parent/children/${id}/daily-fees`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'dailyFees',
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

  const handleDownloadReceipt = async (paymentId, receiptNumber) => {
    try {
      const res = await api.get(`/parent/payments/${paymentId}/receipt/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${receiptNumber || paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download payment receipt PDF.');
    }
  };

  const handleDownloadStatement = async () => {
    try {
      const res = await api.get(`/parent/children/${id}/statement/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FeeStatement_${child?.admissionNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download fee statement PDF.');
    }
  };

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
        <button
          onClick={handleDownloadStatement}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Download size={14} /> Download Fee Statement PDF
        </button>
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

          {/* Subject Grades & Marks Tab */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              {isGradesLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Ward Academic Subject Performances</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Live subject marks updated immediately as teachers grade assignments and exams.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <th className="px-6 py-3">Subject Name</th>
                          <th className="px-6 py-3 text-center">Class Score (/30)</th>
                          <th className="px-6 py-3 text-center">Exam Score (/70)</th>
                          <th className="px-6 py-3 text-center">Total (/100)</th>
                          <th className="px-6 py-3 text-center">Grade</th>
                          <th className="px-6 py-3 text-center">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {grades && grades.length > 0 ? (
                          grades.map((g) => (
                            <tr key={g._id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-850">
                                {g.subject?.name || 'Subject'}
                                <span className="block text-[10px] text-slate-400 font-mono font-normal">{g.subject?.code}</span>
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-slate-700">{g.classScore?.toFixed(1)}</td>
                              <td className="px-6 py-4 text-center font-semibold text-slate-700">{g.examScore?.toFixed(1)}</td>
                              <td className="px-6 py-4 text-center font-black text-emerald-800 text-base">{g.totalScore?.toFixed(1)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-black ${
                                  g.grade === '1' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  g.grade === '9' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                  'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                  {g.grade}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-xs font-semibold text-slate-700">
                                {g.remark}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-400">
                              No subject scores entered for this academic term yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Feeding & Bus Fees Tab */}
          {activeTab === 'dailyFees' && (
            <div className="space-y-6">
              {isDailyFeesLoading ? (
                <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Daily Fee & Bus Fare Register Log</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of daily feeding (GHS 4.00) and transport bus fare (GHS 5.00) collections submitted by class teachers.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3 text-center">Daily Feeding Fee</th>
                          <th className="px-6 py-3 text-center">Transport Bus Fare</th>
                          <th className="px-6 py-3 text-right">Total Paid (GHS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {dailyFees && dailyFees.length > 0 ? (
                          dailyFees.map((df) => (
                            <tr key={df.submissionId} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-800">
                                {new Date(df.date).toLocaleDateString('en-GB', {
                                  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${
                                  df.feedingStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  df.feedingStatus === 'absent' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {df.feedingStatus === 'paid' ? `Paid (GHS ${df.feedingAmount.toFixed(2)})` : df.feedingStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${
                                  df.busStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  df.busStatus === 'absent' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {df.busStatus === 'paid' ? `Paid (GHS ${df.busAmount.toFixed(2)})` : df.busStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-emerald-800">
                                GHS {df.totalPaid.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-xs text-slate-400">
                              No daily fee collection logs submitted for this student yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                                onClick={() => handleDownloadReceipt(pay._id, pay.receiptNumber)}
                                className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs text-emerald-800 transition-colors cursor-pointer"
                              >
                                <Download size={12} />
                                <span>Receipt PDF</span>
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
