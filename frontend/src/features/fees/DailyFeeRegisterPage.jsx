import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Save, Calendar, AlertCircle, Check, Loader2 } from 'lucide-react';

const DailyFeeRegisterPage = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  const { data: classes } = useQuery({
    queryKey: ['classesListDailyFees'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const availableClasses = classes || [];

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]._id);
    }
  }, [availableClasses, selectedClass]);

  const { data: registerData, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyFeeRegister', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await api.get(`/fees/daily-register`, {
        params: { classId: selectedClass, date: selectedDate },
      });
      return res.data;
    },
    enabled: !!selectedClass,
  });

  useEffect(() => {
    if (registerData?.data?.records) {
      setRecords(
        registerData.data.records.map((item) => ({
          studentId: item.student?._id || item.student,
          name: item.student
            ? `${item.student.firstName} ${item.student.lastName}`
            : 'Unknown Student',
          admissionNumber: item.student?.admissionNumber || '',
          usesBus: item.student?.transport?.usesBus || false,
          stop: item.student?.transport?.stop || '',
          status: item.status || 'unpaid',
        }))
      );
    }
  }, [registerData]);

  // Bulk preselect status: if a student uses bus, preselect "both" (9 GHS) if they are present.
  // Or we can let teachers click a button "Prefill Present"
  const handlePrefillDefaults = () => {
    setRecords((prev) =>
      prev.map((rec) => ({
        ...rec,
        status: rec.usesBus ? 'both' : 'feeding',
      }))
    );
  };

  const handleStatusChange = (studentId, status) => {
    setRecords((prev) =>
      prev.map((rec) => (rec.studentId === studentId ? { ...rec, status } : rec))
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/fees/daily-register', payload);
    },
    onSuccess: () => {
      refetch();
      setMessage({ text: 'Daily fee register saved successfully.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setMessage({
        text: err.response?.data?.message || 'Failed to save daily fee register.',
        type: 'error',
      });
    },
  });

  const handleSave = () => {
    if (!selectedClass) return;

    const payload = {
      classId: selectedClass,
      date: new Date(selectedDate).toISOString(),
      records: records.map((r) => ({
        student: r.studentId,
        status: r.status,
        amountPaid: r.status === 'both' ? 9 : r.status === 'feeding' ? 4 : 0,
      })),
    };

    saveMutation.mutate(payload);
  };

  // Calculations for summary card
  const calculatedTotals = records.reduce(
    (acc, curr) => {
      if (curr.status === 'both') {
        acc.total += 9;
        acc.bus += 5;
        acc.feeding += 4;
        acc.paidCount++;
      } else if (curr.status === 'feeding') {
        acc.total += 4;
        acc.feeding += 4;
        acc.paidCount++;
      } else if (curr.status === 'unpaid') {
        acc.unpaidCount++;
      } else if (curr.status === 'absent') {
        acc.absentCount++;
      }
      return acc;
    },
    { total: 0, bus: 0, feeding: 0, paidCount: 0, unpaidCount: 0, absentCount: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Fee Register</h2>
          <p className="text-sm text-slate-500 mt-1">
            Form Teachers: Record daily feeding and transport payments for your class
          </p>
        </div>
      </div>

      {/* Selector panel */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {availableClasses.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="shrink-0 flex gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handlePrefillDefaults}
            disabled={records.length === 0}
            className="w-full md:w-auto py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            Prefill Paid
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Loading daily register...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error.message || 'Failed to load register.'}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400">
          No active students found in this class.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Table */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Adm #</th>
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Bus Stop</th>
                    <th className="py-4 px-6 text-center">Daily Status Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((student) => (
                    <tr key={student.studentId} className="hover:bg-slate-50/20">
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-800">
                        {student.admissionNumber}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {student.name}
                        {student.usesBus && (
                          <span className="block text-[9px] uppercase tracking-wide bg-blue-50 text-blue-700 font-bold border border-blue-100 rounded px-1.5 py-0.5 w-max mt-1">
                            Bus Passenger
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                        {student.usesBus ? student.stop : <span className="text-slate-300 italic font-normal">N/A</span>}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${student.studentId}`}
                              checked={student.status === 'both'}
                              onChange={() => handleStatusChange(student.studentId, 'both')}
                              className="h-4 w-4 text-emerald-800 focus:ring-emerald-800 border-slate-350"
                            />
                            <span className="text-xs font-bold text-slate-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                              9 GHS (Both)
                            </span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${student.studentId}`}
                              checked={student.status === 'feeding'}
                              onChange={() => handleStatusChange(student.studentId, 'feeding')}
                              className="h-4 w-4 text-emerald-800 focus:ring-emerald-800 border-slate-350"
                            />
                            <span className="text-xs font-bold text-slate-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
                              4 GHS (Feed)
                            </span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${student.studentId}`}
                              checked={student.status === 'absent'}
                              onChange={() => handleStatusChange(student.studentId, 'absent')}
                              className="h-4 w-4 text-red-800 focus:ring-red-800 border-slate-350"
                            />
                            <span className="text-xs font-bold text-slate-750 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">
                              Absent
                            </span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${student.studentId}`}
                              checked={student.status === 'unpaid'}
                              onChange={() => handleStatusChange(student.studentId, 'unpaid')}
                              className="h-4 w-4 text-slate-800 focus:ring-slate-800 border-slate-350"
                            />
                            <span className="text-xs font-bold text-slate-650 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                              Not paid
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 py-2.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Daily Register
              </button>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                Register Summary
              </h3>

              <div className="text-center bg-slate-50 border border-slate-200 rounded-2xl py-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Collected
                </span>
                <span className="text-3xl font-black text-slate-900 font-sans">
                  {calculatedTotals.total.toFixed(2)} GHS
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Feeding Collections:</span>
                  <span className="text-slate-800 font-bold">{calculatedTotals.feeding} GHS</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Bus Collections:</span>
                  <span className="text-slate-800 font-bold">{calculatedTotals.bus} GHS</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-slate-150">
                  <span className="text-slate-400">Students Paid:</span>
                  <span className="text-emerald-700 font-bold">{calculatedTotals.paidCount}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Present Unpaid:</span>
                  <span className="text-amber-600 font-bold">{calculatedTotals.unpaidCount}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Absent:</span>
                  <span className="text-red-500 font-bold">{calculatedTotals.absentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyFeeRegisterPage;
