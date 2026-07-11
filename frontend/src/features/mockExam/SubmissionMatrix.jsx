import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import api from '../../services/api';
import { Check, AlertCircle, RefreshCw, Loader2, Download, Search } from 'lucide-react';

const SubmissionMatrix = ({ seriesId, onStudentClick }) => {
  const queryClient = useQueryClient();
  const [selectedCell, setSelectedCell] = useState(null); // { entryId, subjectName, className }
  const [reopenReason, setReopenReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  // Fetch Matrix
  const { data: matrixData, isLoading, refetch } = useQuery({
    queryKey: ['mockMatrix', seriesId],
    queryFn: async () => {
      const res = await mockExamApi.getSubmissionMatrix(seriesId);
      return res.success ? res.data : null;
    },
    enabled: !!seriesId,
  });

  // Fetch Active Students in selected Class
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['matrixStudentsList', selectedClassId],
    queryFn: async () => {
      const res = await api.get(`/students?classId=${selectedClassId}`);
      return res.data?.success ? res.data.data : [];
    },
    enabled: !!selectedClassId,
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      return await mockExamApi.reopenEntry(seriesId, selectedCell.entryId, reopenReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mockMatrix', seriesId]);
      setSelectedCell(null);
      setReopenReason('');
      refetch();
      alert('Entry reopened successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error reopening entry');
    },
  });

  // Bulk PDF Download
  const handleBulkPdfDownload = async (classId, className) => {
    try {
      const blob = await mockExamApi.downloadClassSlips(seriesId, classId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MockSlips_${className}_${seriesId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Error downloading class PDF slips zip file.');
    }
  };

  const getCellBg = (status) => {
    switch (status) {
      case 'submitted': return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border-emerald-100';
      case 'reopened': return 'bg-amber-50 text-amber-700 hover:bg-amber-100/70 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 hover:bg-slate-100/70 border-slate-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  const { classes = [], subjects = [], matrix = [] } = matrixData || {};

  return (
    <div className="space-y-6">
      {/* Submission Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Submission Matrix</h2>
            <p className="text-sm text-slate-500">Live tracker of subject score submissions across classes.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors border border-slate-100"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/50 uppercase select-none">
                <th className="py-3 px-4">Subject</th>
                {classes.map((c) => (
                  <th key={c._id} className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span>{c.name}</span>
                      <button
                        onClick={() => handleBulkPdfDownload(c._id, c.name)}
                        className="flex items-center space-x-0.5 px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-white hover:bg-slate-900 shadow-sm transition-all"
                      >
                        <Download size={10} />
                        <span>ZIP</span>
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {matrix.map((row) => (
                <tr key={row.subject._id} className="hover:bg-slate-50/30">
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {row.subject.name}
                  </td>
                  {row.cells.map((cell, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-center">
                      {cell.entryId ? (
                        <button
                          onClick={() => cell.status === 'submitted' && setSelectedCell({
                            entryId: cell.entryId,
                            subjectName: row.subject.name,
                            className: cell.className,
                          })}
                          className={`w-full py-2.5 px-2 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${getCellBg(cell.status)}`}
                        >
                          <div className="capitalize">{cell.status}</div>
                          <div className="text-[9px] text-slate-400 font-normal mt-0.5 max-w-[100px] truncate mx-auto">
                            {cell.teacherEmail}
                          </div>
                        </button>
                      ) : (
                        <div className="py-2.5 px-2 text-[11px] text-slate-400 italic">
                          Not Started
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Drill Down selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Result Lookup</h2>
          <p className="text-sm text-slate-500">Select a class and search for a student to drill down into their mock grades.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select class...</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-[2]">
            <label className="text-xs font-bold text-slate-500 uppercase">Search Student</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {selectedClassId ? (
          studentsLoading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsData
                ?.filter((s) => {
                  const term = searchQuery.toLowerCase();
                  return (
                    s.firstName.toLowerCase().includes(term) ||
                    s.lastName.toLowerCase().includes(term) ||
                    s.admissionNumber.toLowerCase().includes(term)
                  );
                })
                .map((student) => (
                  <button
                    key={student._id}
                    onClick={() => onStudentClick(student._id)}
                    className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-left transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{student.firstName} {student.lastName}</h3>
                      <p className="text-xs text-slate-500">Adm: {student.admissionNumber}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 mt-2 hover:underline">
                      View Report Slip →
                    </span>
                  </button>
                ))}
            </div>
          )
        ) : null}
      </div>

      {/* Reopen Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 max-w-md w-full space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Reopen Mock Exam Entry</h3>
              <p className="text-xs text-slate-500 mt-1">
                Reopening {selectedCell.subjectName} for class {selectedCell.className}. This action will be logged in the system audit logs.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Reason for reopening</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Please explain why you are reopening this score sheet..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex space-x-3 justify-end pt-2">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => reopenMutation.mutate()}
                disabled={!reopenReason.trim() || reopenMutation.isPending}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-all shadow-sm"
              >
                {reopenMutation.isPending ? 'Processing...' : 'Reopen Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionMatrix;
