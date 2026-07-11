import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import { ClipboardEdit, Check, Save, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const TeacherMockEntryView = ({ seriesId }) => {
  const queryClient = useQueryClient();
  const [activeGrid, setActiveGrid] = useState(null); // { entryId, classId, subjectId, className, subjectName, isCore, status }
  const [scores, setScores] = useState([]); // [{ studentId, rawScore, grade }]

  // Fetch entries assigned to teacher
  const { data: entryData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['myMockEntries', seriesId],
    queryFn: async () => {
      const res = await mockExamApi.getMyEntries(seriesId);
      return res.success ? res.data : [];
    },
    enabled: !!seriesId,
  });

  // Fetch score grid for active entry
  const { data: scoreGrid, isLoading: gridLoading, refetch: refetchGrid } = useQuery({
    queryKey: ['mockScoreGrid', seriesId, activeGrid?.entryId, activeGrid?.classId, activeGrid?.subjectId],
    queryFn: async () => {
      const entryId = activeGrid.entryId || 'new';
      const res = await mockExamApi.getEntryScores(
        seriesId,
        entryId,
        activeGrid.classId,
        activeGrid.subjectId
      );
      if (res.success) {
        setScores(res.data.rows.map(r => ({
          studentId: r.studentId,
          rawScore: r.rawScore ?? '',
          grade: r.grade ?? '',
        })));
        // If we initialized a new entry, update activeGrid with the newly created entryId
        if (entryId === 'new' && res.data.entry?._id) {
          setActiveGrid(prev => ({ ...prev, entryId: res.data.entry._id, status: res.data.entry.status }));
        }
      }
      return res.success ? res.data : null;
    },
    enabled: !!activeGrid,
  });

  // WAEC 9-Point Live Grade Computation
  const getLiveGrade = (raw) => {
    const score = Number(raw);
    if (raw === '' || isNaN(score) || score < 0 || score > 100) return '';
    if (score >= 90) return 1;
    if (score >= 80) return 2;
    if (score >= 70) return 3;
    if (score >= 60) return 4;
    if (score >= 55) return 5;
    if (score >= 50) return 6;
    if (score >= 45) return 7;
    if (score >= 40) return 8;
    return 9;
  };

  const handleScoreChange = (studentId, value) => {
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      return;
    }
    setScores(prev =>
      prev.map(row =>
        row.studentId === studentId
          ? { ...row, rawScore: value, grade: getLiveGrade(value) }
          : row
      )
    );
  };

  // Draft Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formatted = scores.map(s => ({
        studentId: s.studentId,
        rawScore: s.rawScore === '' ? null : Number(s.rawScore),
      }));
      return await mockExamApi.saveScores(seriesId, activeGrid.entryId, formatted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMockEntries', seriesId]);
      refetchGrid();
      alert('Draft scores saved successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error saving scores');
    },
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      return await mockExamApi.submitEntry(seriesId, activeGrid.entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMockEntries', seriesId]);
      setActiveGrid(prev => ({ ...prev, status: 'submitted' }));
      refetchGrid();
      alert('Scores submitted and locked.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error submitting scores');
    },
  });

  const allScoresEntered = scores.length > 0 && scores.every(s => s.rawScore !== '');

  if (entriesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // Grid view
  if (activeGrid) {
    const isLocked = activeGrid.status === 'submitted';

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveGrid(null);
              refetchEntries();
            }}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-semibold"
          >
            <ArrowLeft size={18} />
            <span>Back to Classes</span>
          </button>

          <div className="flex items-center space-x-2">
            {isLocked ? (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold">
                <Lock size={14} />
                <span>Submitted & Locked</span>
              </span>
            ) : (
              <>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all"
                >
                  {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to submit? This locks the scores and triggers position ranking.')) {
                      submitMutation.mutate();
                    }
                  }}
                  disabled={!allScoresEntered || submitMutation.isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
                >
                  {submitMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>Submit Entry</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Score Entry Form</h2>
              <p className="text-sm text-slate-500">
                {activeGrid.className} · {activeGrid.subjectName} {activeGrid.isCore ? '(Core)' : '(Elective)'}
              </p>
            </div>
            {!allScoresEntered && !isLocked && (
              <span className="flex items-center space-x-1 text-amber-600 text-xs font-bold bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                <AlertCircle size={14} />
                <span>Please enter scores for all students before submitting.</span>
              </span>
            )}
          </div>

          {gridLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Admission Number</th>
                    <th className="py-3 px-4 w-40">Raw Score (0-100)</th>
                    <th className="py-3 px-4 w-40">WAEC Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {scoreGrid?.rows.map((row) => {
                    const currentVal = scores.find(s => s.studentId === row.studentId);
                    return (
                      <tr key={row.studentId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {row.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{row.admissionNumber}</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={currentVal?.rawScore ?? ''}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                            disabled={isLocked}
                            placeholder="—"
                            className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 px-4">
                          {currentVal?.grade ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                              currentVal.grade === 9 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {currentVal.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
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
  }

  // Dashboard / Class list view
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Your Assigned Subjects</h2>
        <p className="text-sm text-slate-500">Select a class grid below to enter or view mock exam results.</p>
      </div>

      {entryData.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No mock exam subject assignments found for you this term.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entryData.map((item) => (
            <div
              key={item.assignmentId}
              className="group relative bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.class.name}</h3>
                    <p className="text-sm text-slate-500">{item.subject.name} ({item.subject.code})</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.isCore
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}>
                    {item.isCore ? 'Core' : 'Elective'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 bg-white border border-slate-100 p-3 rounded-xl">
                  <span>Scores entered:</span>
                  <span className="font-bold text-slate-700">{item.enteredCount} / {item.studentCount}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  item.status === 'submitted'
                    ? 'text-emerald-600'
                    : item.status === 'reopened'
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}>
                  {item.status === 'submitted' ? 'Submitted' : item.status === 'reopened' ? 'Reopened' : 'Draft'}
                </span>

                <button
                  onClick={() => setActiveGrid({
                    entryId: item.entryId,
                    classId: item.class._id,
                    subjectId: item.subject._id,
                    className: item.class.name,
                    subjectName: item.subject.name,
                    isCore: item.isCore,
                    status: item.status,
                  })}
                  className="flex items-center space-x-1 text-sm font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors"
                >
                  <ClipboardEdit size={16} />
                  <span>{item.status === 'submitted' ? 'View Grid' : 'Enter Scores'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherMockEntryView;
