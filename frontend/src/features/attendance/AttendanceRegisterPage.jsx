import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Check, AlertCircle, Save, Calendar, CheckSquare, XCircle, Clock } from 'lucide-react';

const AttendanceRegisterPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [register, setRegister] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  const { data: classes } = useQuery({
    queryKey: ['classesList'],
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

  const { data: registerData, isLoading, error } = useQuery({
    queryKey: ['attendanceRegister', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await api.get(`/attendance?class=${selectedClass}&date=${selectedDate}`);
      return res.data?.data;
    },
    enabled: !!selectedClass,
  });

  useEffect(() => {
    if (registerData?.register) {
      setRegister(
        registerData.register.map((item) => ({
          studentId: item.student._id,
          name: `${item.student.firstName} ${item.student.lastName}`,
          admissionNumber: item.student.admissionNumber,
          gender: item.student.gender,
          status: item.status || 'present',
          notes: item.notes || '',
        }))
      );
    }
  }, [registerData]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/attendance/bulk', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRegister', selectedClass, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setMessage({ text: 'Attendance register saved successfully.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setMessage({ text: err.response?.data?.message || 'Failed to save attendance.', type: 'error' });
    },
  });

  const handleStatusChange = (studentId, status) => {
    setRegister((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, status } : item))
    );
  };

  const handleNotesChange = (studentId, notes) => {
    setRegister((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, notes } : item))
    );
  };

  const handleSave = () => {
    if (!selectedClass) return;
    const termId = classes?.find((c) => c._id === selectedClass)?.academicYear?.terms?.[0]?._id || null;

    const payload = {
      classId: selectedClass,
      date: new Date(selectedDate).toISOString(),
      termId,
      records: register.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        notes: r.notes,
      })),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Daily Attendance Register</h2>
        <p className="text-sm text-slate-500 mt-1">Mark and review daily student attendance logs</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="w-full md:w-64">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Class Stream</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800"
            >
              <option value="">Select a class</option>
              {availableClasses.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Date</label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 font-mono"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {selectedClass && register.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
          >
            {saveMutation.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save Register</span>
              </>
            )}
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center space-x-2.5 border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {!selectedClass ? (
          <div className="p-12 text-center text-slate-400">
            <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">Please select a class stream above to mark attendance.</p>
          </div>
        ) : isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
            <p className="text-sm font-semibold text-slate-400">Loading register list...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-700 bg-red-50 border-b border-slate-200">
            <p className="font-bold text-base">Error loading register</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Adm #</th>
                  <th className="py-4 px-6">Student Name</th>
                  <th className="py-4 px-6">Status Toggle</th>
                  <th className="py-4 px-6">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {register.length > 0 ? (
                  register.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-800">
                        {row.admissionNumber}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900 font-sans">
                        {row.name}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row.studentId, 'present')}
                            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                              row.status === 'present'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <CheckSquare size={14} />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(row.studentId, 'absent')}
                            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                              row.status === 'absent'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <XCircle size={14} />
                            <span>Absent</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(row.studentId, 'late')}
                            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer ${
                              row.status === 'late'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <Clock size={14} />
                            <span>Late</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          placeholder="e.g. Excused for medical checkup..."
                          value={row.notes}
                          onChange={(e) => handleNotesChange(row.studentId, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 text-slate-800 font-sans"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-sm text-slate-400">
                      No active students found in this class stream.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRegisterPage;
