import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  DollarSign,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Save,
  Sparkles,
  Calendar,
  CreditCard,
  FileText,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const PayrollManagementPage = () => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [notification, setNotification] = useState({ text: '', type: '' });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [downloadingPdf, setDownloadingPdf] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Query Payroll List for Selected Month
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['staffPayroll', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/payroll?month=${selectedMonth}`);
      return res.data?.data || { payrolls: [], summary: {} };
    },
  });

  const payrolls = payrollData?.payrolls || [];
  const summary = payrollData?.summary || {};

  // Delete Month Payroll Mutation
  const deleteMonthMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(`/payroll/month/${selectedMonth}`);
    },
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || `Successfully deleted payroll for ${selectedMonth}!`, type: 'success' });
      setShowDeleteModal(false);
      queryClient.invalidateQueries(['staffPayroll', selectedMonth]);
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to delete payroll for this month.', type: 'error' });
      setShowDeleteModal(false);
    },
  });

  // Auto-Generate Monthly Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/payroll/generate', { month: selectedMonth });
    },
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || 'Monthly payroll generated!', type: 'success' });
      queryClient.invalidateQueries(['staffPayroll', selectedMonth]);
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to generate payroll.', type: 'error' });
    },
  });

  // Approve / Pay All Payroll Mutation
  const approveMutation = useMutation({
    mutationFn: async (targetStatus) => {
      return await api.post('/payroll/approve', { month: selectedMonth, targetStatus });
    },
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || 'Payroll status updated!', type: 'success' });
      queryClient.invalidateQueries(['staffPayroll', selectedMonth]);
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to update payroll status.', type: 'error' });
    },
  });

  // Save Single Payroll Row Mutation
  const updateRowMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await api.patch(`/payroll/${id}`, payload);
    },
    onSuccess: () => {
      setNotification({ text: 'Staff payroll entry saved successfully!', type: 'success' });
      setEditingRowId(null);
      queryClient.invalidateQueries(['staffPayroll', selectedMonth]);
      setTimeout(() => setNotification({ text: '', type: '' }), 3000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to update payroll entry.', type: 'error' });
    },
  });

  const handleEditClick = (p) => {
    setEditingRowId(p._id);
    setEditingData({
      basicSalary: p.basicSalary || 0,
      formTeacherAllowance: p.allowances?.formTeacher || 0,
      transportAllowance: p.allowances?.transport || 0,
      taxSSNIT: p.deductions?.taxSSNIT || 0,
      loans: p.deductions?.loans || 0,
      paymentMethod: p.paymentMethod || 'bank_transfer',
    });
  };

  const handleSaveRow = (id) => {
    updateRowMutation.mutate({
      id,
      payload: {
        basicSalary: Number(editingData.basicSalary),
        allowances: {
          formTeacher: Number(editingData.formTeacherAllowance),
          transport: Number(editingData.transportAllowance),
        },
        deductions: {
          taxSSNIT: Number(editingData.taxSSNIT),
          loans: Number(editingData.loans),
        },
        paymentMethod: editingData.paymentMethod,
      },
    });
  };

  const handleDownloadPayslip = async (p) => {
    setDownloadingPdf((prev) => ({ ...prev, [p._id]: true }));
    try {
      const res = await api.get(`/payroll/payslip/${p._id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${p.staff?.firstName || 'Staff'}_${selectedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setNotification({ text: 'Failed to download payslip PDF.', type: 'error' });
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [p._id]: false }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-700" />
            Staff Payroll &amp; Allowance Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate monthly staff salaries, form teacher allowances, SSNIT deductions, and download payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          />
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Generate Month
          </button>
          <button
            onClick={() => approveMutation.mutate('paid')}
            disabled={approveMutation.isPending || payrolls.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            Approve &amp; Pay All
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteMonthMutation.isPending || payrolls.length === 0}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Delete payroll for selected month"
          >
            {deleteMonthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-rose-600" />}
            Delete Month
          </button>
        </div>
      </div>

      {/* ── Confirmation Modal for Month Deletion ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Month Payroll?</h3>
                <p className="text-xs text-slate-500">Month: {selectedMonth}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all <span className="font-bold text-slate-900">{payrolls.length} payroll entries</span> generated for <span className="font-bold text-slate-900">{selectedMonth}</span>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMonthMutation.mutate()}
                disabled={deleteMonthMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteMonthMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Feedback ── */}
      {notification.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          {notification.text}
        </div>
      )}

      {/* ── Executive Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Staff Payroll Count</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{summary.staffCount || 0}</div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Staff records generated for month</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Basic Salary Pool</span>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {(summary.totalBasic || 0).toFixed(2)} <span className="text-xs text-slate-400">GHS</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Base staff payroll commitment</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Total Allowances</span>
          <div className="text-3xl font-black text-emerald-700 mt-1">
            {(summary.totalAllowances || 0).toFixed(2)} <span className="text-xs text-slate-400">GHS</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Form Teacher &amp; transport bonuses</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs border-l-4 border-l-emerald-600">
          <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Total Net Payroll Payout</span>
          <div className="text-3xl font-black text-emerald-800 mt-1">
            {(summary.totalNet || 0).toFixed(2)} <span className="text-xs text-slate-400">GHS</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total cash / transfer payout</span>
        </div>
      </div>

      {/* ── Staff Payroll Roster Table ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
            <Users size={16} className="text-emerald-700" /> Payroll Roster for {selectedMonth}
          </span>
          <span className="text-xs font-bold text-slate-400">{payrolls.length} Staff Listed</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-2">
            <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
            <span className="text-xs font-semibold text-slate-400">Loading payroll records...</span>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <CreditCard size={36} className="mx-auto text-slate-300" />
            <p className="font-extrabold text-slate-700 text-sm">No Payroll Generated for {selectedMonth}</p>
            <p className="text-xs text-slate-400">Click &quot;Auto-Generate Month&quot; above to create draft payroll for all active staff.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Basic Salary</th>
                  <th className="py-3 px-3">Form Teacher Allowance</th>
                  <th className="py-3 px-3">SSNIT / Deductions</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payrolls.map((p) => {
                  const isEditing = editingRowId === p._id;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.staff?.firstName} {p.staff?.lastName}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{p.staff?.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                          {p.staff?.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingData.basicSalary}
                            onChange={(e) => setEditingData({ ...editingData, basicSalary: e.target.value })}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        ) : (
                          `${(p.basicSalary || 0).toFixed(2)} GHS`
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingData.formTeacherAllowance}
                            onChange={(e) => setEditingData({ ...editingData, formTeacherAllowance: e.target.value })}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-800"
                          />
                        ) : (
                          `${(p.allowances?.formTeacher || 0).toFixed(2)} GHS`
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingData.taxSSNIT}
                            onChange={(e) => setEditingData({ ...editingData, taxSSNIT: e.target.value })}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-800"
                          />
                        ) : (
                          `${(p.deductions?.taxSSNIT || 0).toFixed(2)} GHS`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">
                        {(p.netSalary || 0).toFixed(2)} GHS
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : p.status === 'approved'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveRow(p._id)}
                              disabled={updateRowMutation.isPending}
                              className="px-2.5 py-1 bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Save size={12} /> Save
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEditClick(p)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPayslip(p)}
                            disabled={downloadingPdf[p._id]}
                            title="Download Payslip PDF"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {downloadingPdf[p._id] ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollManagementPage;
