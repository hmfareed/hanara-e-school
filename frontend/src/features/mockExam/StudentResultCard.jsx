import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import { Loader2, Download, AlertTriangle, ShieldCheck, Award } from 'lucide-react';

const StudentResultCard = ({ seriesId, studentId }) => {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['mockStudentResult', seriesId, studentId],
    queryFn: async () => {
      const res = await mockExamApi.getStudentResult(seriesId, studentId);
      return res.success ? res.data : null;
    },
    enabled: !!seriesId && !!studentId,
  });

  const handleDownloadPdf = async () => {
    try {
      const blob = await mockExamApi.downloadSingleSlip(seriesId, studentId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MockSlip_${reportData?.student?.admissionNumber || studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Error downloading student PDF slip.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
        Error loading student mock result card data.
      </div>
    );
  }

  const { student, series, results = [], aggregate } = reportData;

  const coreResults = results.filter(r => r.isCore);
  const electiveResults = results.filter(r => !r.isCore);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-sm text-slate-500">
            Admission No: {student.admissionNumber} · Class: {student.currentClass?.name}
          </p>
        </div>

        <button
          onClick={handleDownloadPdf}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
        >
          <Download size={16} />
          <span>Download PDF Slip</span>
        </button>
      </div>

      {/* Aggregate and Position Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aggregate Score</span>
            <span className="text-2xl font-black text-slate-850">
              {aggregate?.isComplete ? aggregate.aggregate : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {aggregate?.isComplete ? 'Core 4 + Best 2 Electives' : 'Scores pending submission'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Class Position</span>
            <span className="text-2xl font-black text-slate-850">
              {aggregate?.classPosition ? `${aggregate.classPosition}` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Within JHS 3 section class</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cohort Position</span>
            <span className="text-2xl font-black text-slate-850">
              {aggregate?.cohortPosition ? `${aggregate.cohortPosition}` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Across entire JHS 3 level cohort</span>
          </div>
        </div>
      </div>

      {/* Results Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Score Card Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Raw Score (0-100)</th>
                <th className="py-3 px-4">WAEC Grade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {results.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/30">
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {r.subjectId?.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.isCore
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {r.isCore ? 'Core' : 'Elective'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {r.rawScore !== null ? r.rawScore : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    {r.grade !== null ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        r.grade === 9 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {r.grade}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-bold uppercase ${
                      r.entryStatus === 'submitted' ? 'text-emerald-600' : 'text-amber-500'
                    }`}>
                      {r.entryStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No scores entered or submitted for this student in this series.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisional Watermark disclaimer warning box */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start space-x-3.5">
        <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="font-bold text-red-800 text-sm">PROVISIONAL MOCK EXAMINATION REPORT CARD</h4>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            This report card is provisional and does not form part of the official student academic records.
            The mock exam system is completely isolated from official terminal reports.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentResultCard;
