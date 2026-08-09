import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Archive,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Save,
  MessageSquare,
  Users,
  BarChart2,
  Sparkles,
} from 'lucide-react';

const ReportsGeneratorPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [notification, setNotification] = useState({ text: '', type: '' });
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState({});
  const [finalizing, setFinalizing] = useState(false);

  // Form Teacher Remarks Local Grid
  const [remarksGrid, setRemarksGrid] = useState([]);

  // Fetch Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
  });

  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const active = academicYears.find((y) => y.isCurrent) || academicYears[0];
      if (active) setSelectedYear(active.name);
    }
  }, [academicYears, selectedYear]);

  // Fetch Teacher Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['myTeacherClassesList'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Fetch Class Student Roster & Terminal Reports
  const isFilterReady = !!selectedClass && !!selectedYear && !!selectedTerm;

  const { data: rosterData = [], isLoading: rosterLoading } = useQuery({
    queryKey: ['classRosterForReports', selectedClass, selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await api.get(`/students?class=${selectedClass}&status=active`);
      return res.data?.data || [];
    },
    enabled: isFilterReady,
  });

  // Populate remarks grid when roster loads
  useEffect(() => {
    if (rosterData.length > 0) {
      setRemarksGrid(
        rosterData.map((st) => ({
          studentId: st._id,
          name: `${st.firstName} ${st.lastName}`,
          admissionNumber: st.admissionNumber,
          conduct: 'Good',
          attitude: 'Hardworking',
          interest: 'Reading',
          remarks: 'Satisfactory performance this term.',
        }))
      );
    } else {
      setRemarksGrid([]);
    }
  }, [rosterData]);

  // Bulk Save Form Teacher Remarks Mutation
  const saveRemarksMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/grades/form-teacher-remarks', payload);
    },
    onSuccess: () => {
      setNotification({ text: 'Form Teacher remarks saved successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to save remarks.', type: 'error' });
    },
  });

  const handleRemarkChange = (studentId, field, val) => {
    setRemarksGrid((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, [field]: val } : row))
    );
  };

  const handleSaveAllRemarks = () => {
    if (!selectedClass || !selectedYear || !selectedTerm) return;
    saveRemarksMutation.mutate({
      classId: selectedClass,
      academicYear: selectedYear,
      term: selectedTerm,
      remarksData: remarksGrid.map((row) => ({
        studentId: row.studentId,
        conduct: row.conduct,
        attitude: row.attitude,
        interest: row.interest,
        remarks: row.remarks,
      })),
    });
  };

  const handleFinalizeTerm = async () => {
    if (!selectedClass || !selectedYear || !selectedTerm) return;
    setFinalizing(true);
    try {
      await api.post(`/grades/class/${selectedClass}/finalize`, {
        academicYear: selectedYear,
        term: selectedTerm,
      });
      setNotification({ text: 'Term finalized & class rankings computed!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    } catch (err) {
      setNotification({ text: err.response?.data?.message || 'Finalization failed.', type: 'error' });
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadSinglePdf = async (student) => {
    const studentId = student.studentId || student._id;
    setDownloadingPdf((prev) => ({ ...prev, [studentId]: true }));
    try {
      const res = await api.get(`/grades/student/${studentId}/report-card/pdf`, {
        params: { academicYear: selectedYear, term: selectedTerm },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `ReportCard_${student.admissionNumber || studentId}_Term${selectedTerm}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setNotification({ text: 'Failed to download report card PDF.', type: 'error' });
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const handleDownloadClassZip = async () => {
    if (!selectedClass || !selectedYear || !selectedTerm) return;
    setDownloadingZip(true);
    try {
      const res = await api.get(`/grades/class/${selectedClass}/report-card/zip`, {
        params: { academicYear: selectedYear, term: selectedTerm },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Class_ReportCards_Term${selectedTerm}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setNotification({ text: 'Failed to download class report cards ZIP.', type: 'error' });
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Report Card Generator & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Batch edit Form Teacher remarks, compute terminal rankings, and download zipped class report cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFinalizeTerm}
            disabled={finalizing || !isFilterReady}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-amber-400" />}
            Finalize Term Rankings
          </button>
          <button
            onClick={handleDownloadClassZip}
            disabled={downloadingZip || !isFilterReady}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {downloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Download Class ZIP
          </button>
        </div>
      </div>

      {/* ── Notification Feedback ── */}
      {notification.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          {notification.text}
        </div>
      )}

      {/* ── Filters Selector ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Academic Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="">Select Academic Year</option>
            {academicYears.map((yr) => (
              <option key={yr._id} value={yr.name}>
                {yr.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Term
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Class Stream
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Form Teacher Batch Remarks & Report Card Download Roster ── */}
      {!isFilterReady ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">Select Class & Academic Period</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose an Academic Year, Term, and Class Stream above to generate report cards and edit teacher remarks.
          </p>
        </div>
      ) : rosterLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Form Teacher Batch Remarks ({remarksGrid.length} Students)
            </span>
            <button
              onClick={handleSaveAllRemarks}
              disabled={saveRemarksMutation.isPending}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saveRemarksMutation.isPending ? 'Saving...' : 'Save All Remarks'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 min-w-[80px]">Adm #</th>
                  <th className="py-3 px-4 min-w-[150px]">Student Name</th>
                  <th className="py-3 px-3 min-w-[120px]">Conduct</th>
                  <th className="py-3 px-3 min-w-[120px]">Attitude</th>
                  <th className="py-3 px-3 min-w-[120px]">Interest</th>
                  <th className="py-3 px-4 min-w-[200px]">Form Teacher Remark</th>
                  <th className="py-3 px-4 text-center">PDF Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {remarksGrid.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.admissionNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.conduct}
                        onChange={(e) => handleRemarkChange(row.studentId, 'conduct', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.attitude}
                        onChange={(e) => handleRemarkChange(row.studentId, 'attitude', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.interest}
                        onChange={(e) => handleRemarkChange(row.studentId, 'interest', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRemarkChange(row.studentId, 'remarks', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDownloadSinglePdf(row)}
                        disabled={downloadingPdf[row.studentId]}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-xl border border-indigo-200 transition flex items-center justify-center gap-1 mx-auto disabled:opacity-50"
                      >
                        {downloadingPdf[row.studentId] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        PDF Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsGeneratorPage;
