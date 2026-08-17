import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Search,
  Filter,
  X,
  Loader2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

export default function PromotionWizardModal({ isOpen, onClose, years = [] }) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const activeYear = years.find((y) => y.isCurrent) || years[0];

  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [makeToYearCurrent, setMakeToYearCurrent] = useState(true);

  // Class mappings: { [fromClassId]: { targetClassId, action } }
  const [classMappings, setClassMappings] = useState({});

  // Student overrides: { [studentId]: { action, targetClassId, remarks } }
  const [studentOverrides, setStudentOverrides] = useState({});

  // Active filter for Step 3
  const [selectedReviewClassId, setSelectedReviewClassId] = useState('');
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  // Execution result state
  const [executionResult, setExecutionResult] = useState(null);

  // Initialize selected years when modal opens
  useEffect(() => {
    if (isOpen && activeYear) {
      setFromYearId(activeYear._id);
      // Select the other year or newest
      const otherYear = years.find((y) => y._id !== activeYear._id);
      if (otherYear) {
        setToYearId(otherYear._id);
      }
      setStep(1);
      setExecutionResult(null);
      setStudentOverrides({});
    }
  }, [isOpen, activeYear, years]);

  // Fetch rollover preview data
  const {
    data: previewData,
    isLoading: loadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['rolloverPreview', fromYearId, toYearId],
    queryFn: async () => {
      if (!fromYearId) return null;
      const url = toYearId
        ? `/academic-years/rollover/preview?fromYearId=${fromYearId}&toYearId=${toYearId}`
        : `/academic-years/rollover/preview?fromYearId=${fromYearId}`;
      const res = await api.get(url);
      return res.data?.data;
    },
    enabled: isOpen && !!fromYearId,
  });

  // Populate default class mappings whenever previewData loads
  useEffect(() => {
    if (previewData?.classesSummary) {
      const initialMappings = {};
      previewData.classesSummary.forEach((item) => {
        initialMappings[item.fromClass._id] = {
          targetClassId: item.suggestedTargetClass?._id || '',
          action: item.suggestedAction || 'promoted',
        };
      });
      setClassMappings(initialMappings);

      if (previewData.classesSummary.length > 0 && !selectedReviewClassId) {
        setSelectedReviewClassId(previewData.classesSummary[0].fromClass._id);
      }
    }
  }, [previewData]);

  // Rollover execution mutation
  const rolloverMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/academic-years/rollover/execute', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setExecutionResult(data.data);
      queryClient.invalidateQueries(); // Invalidate all cached data across all portals
    },
  });

  if (!isOpen) return null;

  const classesSummary = previewData?.classesSummary || [];
  const availableToClasses = previewData?.availableToClasses || [];
  const stats = previewData?.stats || {
    totalEligibleStudents: 0,
    totalPromoting: 0,
    totalGraduating: 0,
  };

  // Calculations for Step 4 summary
  let calculatedPromoted = 0;
  let calculatedRepeated = 0;
  let calculatedGraduated = 0;
  let calculatedWithdrawn = 0;

  classesSummary.forEach((cls) => {
    const classMapping = classMappings[cls.fromClass._id] || {};
    cls.students.forEach((st) => {
      const override = studentOverrides[st._id];
      const action =
        override?.action ||
        classMapping.action ||
        (cls.isGraduatingLevel ? 'graduated' : 'promoted');

      if (action === 'promoted') calculatedPromoted++;
      else if (action === 'repeated') calculatedRepeated++;
      else if (action === 'graduated') calculatedGraduated++;
      else if (action === 'withdrawn') calculatedWithdrawn++;
    });
  });

  const handleExecute = () => {
    const classMappingsArray = Object.entries(classMappings).map(([fromClassId, map]) => ({
      fromClassId,
      targetClassId: map.targetClassId || null,
      action: map.action,
    }));

    const studentOverridesArray = Object.entries(studentOverrides).map(
      ([studentId, override]) => ({
        studentId,
        action: override.action,
        targetClassId: override.targetClassId || null,
        remarks: override.remarks || '',
      })
    );

    rolloverMutation.mutate({
      fromYearId,
      toYearId,
      makeToYearCurrent,
      classMappings: classMappingsArray,
      studentOverrides: studentOverridesArray,
    });
  };

  const handleStudentActionChange = (studentId, action, defaultTargetId = '') => {
    setStudentOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        action,
        targetClassId: action === 'promoted' ? defaultTargetId : prev[studentId]?.targetClassId || '',
      },
    }));
  };

  const handleStudentRemarksChange = (studentId, remarks) => {
    setStudentOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const selectedClassSummary = classesSummary.find(
    (c) => c.fromClass._id === selectedReviewClassId
  );

  const filteredStudents = (selectedClassSummary?.students || []).filter((s) => {
    if (!searchStudentTerm) return true;
    const term = searchStudentTerm.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(term) ||
      s.admissionNumber?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                End-of-Year Class Promotion & Roll-over Wizard
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Advance student cohorts across grades, handle retentions, and archive graduating JHS 3 candidates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Header (if not finished) */}
        {!executionResult && (
          <div className="px-8 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-6 text-xs font-bold">
              {[
                { num: 1, label: 'Academic Years' },
                { num: 2, label: 'Class Stream Mappings' },
                { num: 3, label: 'Student Review & Exceptions' },
                { num: 4, label: 'Summary & Execute' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 ${
                    step === s.num
                      ? 'text-emerald-800'
                      : step > s.num
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      step === s.num
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : step > s.num
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className="hidden md:inline">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Step {step} of 4
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {executionResult ? (
            /* Success View */
            <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={44} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">
                  Academic Year Rollover Successful!
                </h3>
                <p className="text-sm text-slate-500">
                  Successfully rolled over from{' '}
                  <span className="font-bold text-slate-800">{executionResult.fromYear}</span> to{' '}
                  <span className="font-bold text-emerald-800">{executionResult.toYear}</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-xl font-black text-slate-800">{executionResult.totalProcessed}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase">Promoted</p>
                  <p className="text-xl font-black text-emerald-800">{executionResult.promotedCount}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[11px] font-bold text-amber-600 uppercase">Repeated</p>
                  <p className="text-xl font-black text-amber-800">{executionResult.repeatedCount}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[11px] font-bold text-blue-600 uppercase">Graduated</p>
                  <p className="text-xl font-black text-blue-800">{executionResult.graduatedCount}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="w-full py-3 px-6 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-colors"
              >
                Done & Return to Academic Years
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: Academic Years Selection */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Year */}
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Calendar size={18} className="text-emerald-700" />
                        <span>Source Academic Year (Current)</span>
                      </div>
                      <select
                        value={fromYearId}
                        onChange={(e) => setFromYearId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                      >
                        {years.map((y) => (
                          <option key={y._id} value={y._id}>
                            {y.name} {y.isCurrent ? '(Active Current)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Select the academic year containing the cohort you wish to promote.
                      </p>
                    </div>

                    {/* Target Year */}
                    <div className="p-6 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <ArrowUpRight size={18} className="text-emerald-700" />
                        <span>Target Academic Year (Upcoming)</span>
                      </div>
                      <select
                        value={toYearId}
                        onChange={(e) => setToYearId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-300 font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                      >
                        <option value="">Select target academic year...</option>
                        {years
                          .filter((y) => y._id !== fromYearId)
                          .map((y) => (
                            <option key={y._id} value={y._id}>
                              {y.name}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-emerald-700">
                        Select the target academic year where classes will be assigned.
                      </p>
                    </div>
                  </div>

                  {/* Settings Checkbox */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Activate target academic year
                      </p>
                      <p className="text-xs text-slate-500">
                        Automatically set the target year as the active system-wide current year upon completion.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={makeToYearCurrent}
                      onChange={(e) => setMakeToYearCurrent(e.target.checked)}
                      className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
                    />
                  </div>

                  {/* Summary Metric Badges */}
                  {loadingPreview ? (
                    <div className="py-8 flex items-center justify-center gap-3 text-slate-400 text-sm">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Analyzing class levels and active student cohorts...</span>
                    </div>
                  ) : previewData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Users size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Eligible Students</p>
                          <p className="text-2xl font-black text-slate-900">{stats.totalEligibleStudents}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                          <ArrowRight size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-emerald-700">Advancing Cohort</p>
                          <p className="text-2xl font-black text-emerald-900">{stats.totalPromoting}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800">
                          <GraduationCap size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-blue-700">Graduating (JHS 3)</p>
                          <p className="text-2xl font-black text-blue-900">{stats.totalGraduating}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* STEP 2: Class Stream Mapping */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Class Progression Mappings</h4>
                      <p className="text-xs text-slate-500">
                        Review or customize where each class stream advances in the upcoming academic year.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                      {classesSummary.length} Classes Configured
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">Current Class</th>
                          <th className="py-3.5 px-4">Level</th>
                          <th className="py-3.5 px-4 text-center">Students</th>
                          <th className="py-3.5 px-4">Action</th>
                          <th className="py-3.5 px-4">Target Class in {previewData?.toYear?.name || 'Target Year'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classesSummary.map((item) => {
                          const mapping = classMappings[item.fromClass._id] || {};
                          return (
                            <tr key={item.fromClass._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                {item.fromClass.name}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">
                                {item.fromClass.level?.displayName || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="font-black px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                                  {item.studentCount}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={mapping.action || (item.isGraduatingLevel ? 'graduated' : 'promoted')}
                                  onChange={(e) =>
                                    setClassMappings((prev) => ({
                                      ...prev,
                                      [item.fromClass._id]: {
                                        ...prev[item.fromClass._id],
                                        action: e.target.value,
                                      },
                                    }))
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 text-xs outline-none"
                                >
                                  <option value="promoted">Promote</option>
                                  <option value="repeated">Repeat in Place</option>
                                  <option value="graduated">Graduate</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4">
                                {mapping.action === 'graduated' || item.isGraduatingLevel ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 text-xs">
                                    <GraduationCap size={14} /> Graduated Alumni
                                  </span>
                                ) : (
                                  <select
                                    value={mapping.targetClassId || ''}
                                    onChange={(e) =>
                                      setClassMappings((prev) => ({
                                        ...prev,
                                        [item.fromClass._id]: {
                                          ...prev[item.fromClass._id],
                                          targetClassId: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full max-w-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 text-xs outline-none focus:ring-1 focus:ring-emerald-700"
                                  >
                                    <option value="">Select target stream...</option>
                                    {availableToClasses.map((ac) => (
                                      <option key={ac._id} value={ac._id}>
                                        {ac.name} ({ac.level?.displayName || 'Level'})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: Student Review & Individual Exceptions */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Layers size={18} className="text-emerald-700" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Viewing Class Roster</p>
                        <select
                          value={selectedReviewClassId}
                          onChange={(e) => setSelectedReviewClassId(e.target.value)}
                          className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer text-sm"
                        >
                          {classesSummary.map((c) => (
                            <option key={c.fromClass._id} value={c.fromClass._id}>
                              {c.fromClass.name} ({c.studentCount} students)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Student Search */}
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student by name or ID..."
                        value={searchStudentTerm}
                        onChange={(e) => setSearchStudentTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">ID Number</th>
                          <th className="py-3 px-4">Status / Action</th>
                          <th className="py-3 px-4">Remarks (for Repeat/Special)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-slate-400 font-medium">
                              No students found in this class roster.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const override = studentOverrides[student._id];
                            const defaultAction =
                              classMappings[selectedReviewClassId]?.action ||
                              (selectedClassSummary?.isGraduatingLevel ? 'graduated' : 'promoted');
                            const currentAction = override?.action || defaultAction;

                            return (
                              <tr
                                key={student._id}
                                className={`transition-colors ${
                                  override?.action === 'repeated'
                                    ? 'bg-amber-50/50'
                                    : override?.action === 'withdrawn'
                                    ? 'bg-rose-50/50'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {student.fullName}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono">
                                  {student.admissionNumber}
                                </td>
                                <td className="py-3 px-4">
                                  <select
                                    value={currentAction}
                                    onChange={(e) =>
                                      handleStudentActionChange(
                                        student._id,
                                        e.target.value,
                                        classMappings[selectedReviewClassId]?.targetClassId
                                      )
                                    }
                                    className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs outline-none ${
                                      currentAction === 'promoted'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : currentAction === 'repeated'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : currentAction === 'graduated'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}
                                  >
                                    <option value="promoted">Promote to Next Level</option>
                                    <option value="repeated">Repeat / Retain</option>
                                    <option value="graduated">Graduate</option>
                                    <option value="withdrawn">Withdrawn</option>
                                  </select>
                                </td>
                                <td className="py-3 px-4">
                                  <input
                                    type="text"
                                    placeholder="Optional note (e.g. Needs academic intervention)"
                                    value={override?.remarks || ''}
                                    onChange={(e) =>
                                      handleStudentRemarksChange(student._id, e.target.value)
                                    }
                                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: Summary & Roll-over Confirmation */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-6 bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl space-y-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={24} className="text-emerald-300" />
                      <h4 className="text-lg font-black tracking-tight">Final Rollover Verification</h4>
                    </div>
                    <p className="text-xs text-emerald-100 leading-relaxed">
                      You are about to transition student cohorts from{' '}
                      <span className="font-bold underline">{previewData?.fromYear?.name}</span> to{' '}
                      <span className="font-bold underline">{previewData?.toYear?.name}</span>.
                      Individual rosters will be updated and an audit log will be archived.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Total Processed</p>
                        <p className="text-xl font-black">{stats.totalEligibleStudents}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Promoted</p>
                        <p className="text-xl font-black">{calculatedPromoted}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-amber-300">Repeating</p>
                        <p className="text-xl font-black">{calculatedRepeated}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-blue-300">Graduating</p>
                        <p className="text-xl font-black">{calculatedGraduated}</p>
                      </div>
                    </div>
                  </div>

                  {rolloverMutation.isError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span>{rolloverMutation.error?.response?.data?.message || 'Rollover execution failed.'}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!executionResult && (
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => {
                if (step > 1) setStep((s) => s - 1);
                else onClose();
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!toYearId || loadingPreview}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleExecute}
                disabled={rolloverMutation.isPending}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-colors"
              >
                {rolloverMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>Confirm & Execute Rollover</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
