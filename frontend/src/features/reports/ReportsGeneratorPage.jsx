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
  Eye,
  Printer,
  ShieldCheck,
  QrCode,
  GraduationCap,
} from 'lucide-react';

const ReportsGeneratorPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [activeTab, setActiveTab] = useState('remarks'); // 'remarks' | 'preview'
  const [notification, setNotification] = useState({ text: '', type: '' });
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Form Teacher Remarks Local Grid
  const [remarksGrid, setRemarksGrid] = useState([]);

  // Report Cards preview data
  const [reportCardsData, setReportCardsData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  // Fetch Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['reportsGeneratorClassesList'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]._id);
    }
  }, [classes, selectedClass]);

  // Fetch Class Student Roster
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
          remarks: 'Satisfactory academic performance this term.',
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

  // Generate Class Terminal Reports
  const handleGenerateClassReports = async () => {
    if (!selectedClass) {
      setNotification({ text: 'Please select a class first.', type: 'error' });
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await api.post('/reports/generate-class', {
        classId: selectedClass,
        term: selectedTerm,
        academicYear: selectedYear,
      });
      if (res.data?.success) {
        setReportCardsData(res.data.data || []);
        setActiveTab('preview');
        setNotification({ text: `Generated ${res.data.data.length} official report card(s) with QR verification codes!`, type: 'success' });
      }
    } catch (err) {
      setNotification({ text: err.response?.data?.message || 'Failed to generate report cards.', type: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-cards-print-area, #report-cards-print-area * {
            visibility: visible;
          }
          #report-cards-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .report-card-page {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Header Controls (Hidden on Print) */}
      <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#78282E]" />
            Terminal Report Cards & Remarks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compile termly assessment scores, class positions, remarks, and print QR-verified report cards
          </p>
        </div>

        {reportCardsData.length > 0 && (
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Print All Report Cards ({reportCardsData.length})
          </button>
        )}
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Class Select */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Academic Year Select */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
            >
              <option value="">Select Year</option>
              {academicYears.map((y) => (
                <option key={y._id} value={y.name}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Term Select */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        {/* Actions & Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('remarks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'remarks' ? 'bg-[#78282E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Teacher Remarks
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'preview' ? 'bg-[#78282E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Report Cards Preview ({reportCardsData.length})
            </button>
          </div>

          <button
            onClick={handleGenerateClassReports}
            disabled={!selectedClass || previewLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {previewLoading ? 'Compiling…' : 'Generate Class Reports'}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification.text && (
        <div className={`no-print p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {notification.text}
        </div>
      )}

      {/* ── TAB 1: Form Teacher Remarks Grid ── */}
      {activeTab === 'remarks' && (
        <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#78282E]" />
              Form Teacher & Headmaster Remarks Grid
            </h2>
            <button
              onClick={handleSaveAllRemarks}
              disabled={saveRemarksMutation.isPending || remarksGrid.length === 0}
              className="px-4 py-2 bg-[#78282E] hover:bg-[#6B2228] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Remarks
            </button>
          </div>

          {!selectedClass ? (
            <p className="text-xs text-slate-400 text-center py-12">Please select a class above to load student roster.</p>
          ) : rosterLoading ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-2xl" />
          ) : remarksGrid.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No active students in this class.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-3 rounded-l-xl">Student</th>
                    <th className="p-3">Conduct</th>
                    <th className="p-3">Attitude</th>
                    <th className="p-3">Interest</th>
                    <th className="p-3 rounded-r-xl">Teacher Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {remarksGrid.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-900">
                        {row.name}
                        <span className="block text-[10px] text-slate-400 font-mono">{row.admissionNumber}</span>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.conduct}
                          onChange={(e) => handleRemarkChange(row.studentId, 'conduct', e.target.value)}
                          className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.attitude}
                          onChange={(e) => handleRemarkChange(row.studentId, 'attitude', e.target.value)}
                          className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.interest}
                          onChange={(e) => handleRemarkChange(row.studentId, 'interest', e.target.value)}
                          className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRemarkChange(row.studentId, 'remarks', e.target.value)}
                          className="w-full min-w-[200px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Official Print-Ready Report Cards ── */}
      {activeTab === 'preview' && (
        reportCardsData.length === 0 ? (
          <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#78282E] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Report Cards Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select a class, academic year, and term in the toolbar above, then click <span className="font-bold text-emerald-700">"Generate Class Reports"</span> to compile and preview official terminal report cards with verification QR codes.
            </p>
          </div>
        ) : (
          <div id="report-cards-print-area" className="space-y-12">
            {reportCardsData.map((card, cardIdx) => (
              <div
                key={card.reportId || cardIdx}
                className="report-card-page max-w-4xl mx-auto bg-white border-2 border-slate-900 p-8 shadow-xl rounded-3xl space-y-6 text-slate-900 select-none print:shadow-none print:border-none print:rounded-none print:p-0"
              >
              {/* Header Crest Banner */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#78282E] text-white rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-amber-400 shadow-sm shrink-0">
                    H
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider text-[#78282E] leading-tight">
                      {card.schoolProfile?.name || 'HANARA SCHOOLS'}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 italic">"{card.schoolProfile?.motto}"</p>
                    <p className="text-[10px] text-slate-500">{card.schoolProfile?.address} · Tel: {card.schoolProfile?.phone}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-slate-900 text-white rounded-full inline-block">
                    TERMINAL REPORT CARD
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {card.term} · {card.academicYear}
                  </p>
                </div>
              </div>

              {/* Student Bio Grid */}
              <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Student Full Name</span>
                  <span className="text-slate-900 text-sm font-black">{card.student?.fullName}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Admission Number</span>
                  <span className="font-mono text-slate-800">{card.student?.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Class / Grade</span>
                  <span className="text-slate-800">{card.student?.className}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Overall Class Position</span>
                  <span className="text-[#78282E] font-black text-sm">{card.summary?.classPosition}</span>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="overflow-hidden border border-slate-900 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider font-black">
                      <th className="p-2.5 border-r border-slate-700">Subject</th>
                      <th className="p-2.5 text-center border-r border-slate-700">CA (30%)</th>
                      <th className="p-2.5 text-center border-r border-slate-700">Exam (70%)</th>
                      <th className="p-2.5 text-center border-r border-slate-700">Total (100%)</th>
                      <th className="p-2.5 text-center border-r border-slate-700">Grade</th>
                      <th className="p-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-800 font-bold">
                    {card.subjects.map((sub, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 border-r border-slate-300 font-black">{sub.subjectName}</td>
                        <td className="p-2.5 text-center border-r border-slate-300 font-mono">{sub.caScore}</td>
                        <td className="p-2.5 text-center border-r border-slate-300 font-mono">{sub.examScore}</td>
                        <td className="p-2.5 text-center border-r border-slate-300 font-mono font-black text-[#78282E]">{sub.total}</td>
                        <td className="p-2.5 text-center border-r border-slate-300 font-black">{sub.grade}</td>
                        <td className="p-2.5 font-medium">{sub.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Aggregate Performance & Remarks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Score Summary Box */}
                <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-2">
                  <p className="font-black text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-300 pb-1">
                    Aggregate Summary
                  </p>
                  <div className="space-y-1 text-slate-700 font-bold">
                    <p className="flex justify-between">
                      <span>Total Marks:</span>
                      <span className="font-mono text-slate-900">{card.summary?.totalObtained} / {card.summary?.totalPossible}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Percentage Average:</span>
                      <span className="font-mono text-emerald-700 font-black">{card.summary?.averagePercentage}%</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Class Position:</span>
                      <span className="font-mono text-[#78282E] font-black">{card.summary?.classPosition}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Attendance:</span>
                      <span>{card.summary?.attendance?.daysPresent} / {card.summary?.attendance?.totalDays} Days</span>
                    </p>
                  </div>
                </div>

                {/* Remarks Box */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-2">
                  <p className="font-black text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-300 pb-1">
                    Conduct & Official Remarks
                  </p>
                  <div className="space-y-1.5 text-slate-700 text-xs">
                    <p><span className="font-black text-slate-900">Conduct & Attitude:</span> {card.summary?.conduct} · {card.summary?.attitude}</p>
                    <p><span className="font-black text-slate-900">Class Teacher:</span> {card.summary?.classTeacherRemark}</p>
                    <p><span className="font-black text-slate-900">Headmaster:</span> "{card.summary?.headmasterRemark}"</p>
                  </div>
                </div>
              </div>

              {/* Signatures & Security QR Code Footer */}
              <div className="border-t-2 border-slate-900 pt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="h-8 border-b border-slate-900 w-36 mb-1 font-serif italic text-slate-600 text-xs flex items-end">
                      H. N. Administration
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-500">Headmaster Signature & Stamp</span>
                  </div>
                </div>

                {/* Tamper-proof QR Code Verification Stamp */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 p-2 rounded-2xl">
                  <div className="bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                    <img src={card.qrDataUrl} alt="Verify QR" className="w-14 h-14" />
                  </div>
                  <div className="text-left text-[9px] font-bold text-slate-600 space-y-0.5">
                    <span className="text-emerald-700 font-black flex items-center gap-1 uppercase tracking-wider text-[10px]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Authentic Document
                    </span>
                    <p className="text-slate-500">Scan QR Code with smartphone to verify report authenticity online.</p>
                    <p className="font-mono text-[8px] text-slate-400">Token: {card.reportId}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      )}
    </div>
  );
};

export default ReportsGeneratorPage;
