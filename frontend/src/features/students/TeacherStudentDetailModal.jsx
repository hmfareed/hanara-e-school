import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  X,
  User,
  Phone,
  UserCheck,
  ClipboardCheck,
  FileText,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse,
  BookOpen,
  Lock,
  Receipt,
  Pencil,
} from 'lucide-react';
import DailyFeeConfigModal from './DailyFeeConfigModal';
import { useQueryClient } from '@tanstack/react-query';

const TeacherStudentDetailModal = ({ studentId, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState('personal');
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['teacherStudentDetail', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get(`/students/${studentId}`);
      return res.data?.data;
    },
    enabled: !!studentId,
  });

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl h-full max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          {isLoading ? (
            <div className="h-12 bg-white/10 animate-pulse rounded-xl w-48"></div>
          ) : (
            <div className="flex items-center gap-4">
              {student?.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.firstName}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 font-extrabold text-xl flex items-center justify-center text-white ring-2 ring-white/20">
                  {student?.firstName ? student.firstName.charAt(0) : 'S'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg text-white">
                    {student?.firstName} {student?.lastName}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full uppercase">
                    {student?.status || 'Active'}
                  </span>
                  {student?.colorSection && (
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      student.colorSection === 'Red' ? 'bg-rose-500/20 text-rose-300 border-rose-400/30' :
                      student.colorSection === 'Yellow' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' :
                      student.colorSection === 'Green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                      'bg-sky-500/20 text-sky-300 border-sky-400/30'
                    }`}>
                      {student.colorSection} Section
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-2 pt-0.5">
                  <span className="font-mono">Adm No: {student?.admissionNumber}</span>
                  <span>•</span>
                  <span>Class: {student?.currentClass?.name || 'Unassigned'}</span>
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'personal', label: 'Personal & Guardian', icon: User },
            { id: 'feeConfig', label: 'Fee Collection Plan', icon: Receipt },
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
            { id: 'results', label: 'Results & CA', icon: ClipboardCheck },
            { id: 'assignments', label: 'Assignments', icon: FileText },
            { id: 'behaviour', label: 'Behaviour', icon: Award },
            { id: 'medical', label: 'Medical Alert', icon: HeartPulse },
            { id: 'notes', label: 'Teacher Notes', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-slate-100 rounded-2xl"></div>
              <div className="h-40 bg-slate-100 rounded-2xl"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              Failed to load student details.
            </div>
          ) : (
            <>
              {/* SUB TAB 1: PERSONAL & GUARDIAN */}
              {activeSubTab === 'personal' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                      Personal Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Full Name</span>
                        <p className="font-bold text-slate-800">{student?.firstName} {student?.otherNames || ''} {student?.lastName}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Gender</span>
                        <p className="font-bold text-slate-800 capitalize">{student?.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Date of Birth</span>
                        <p className="font-bold text-slate-800">
                          {student?.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Color Section</span>
                        <p className="font-bold text-slate-800">
                          {student?.colorSection ? `${student.colorSection} Section` : 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Enrollment Date</span>
                        <p className="font-bold text-slate-800">
                          {student?.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                      Guardian / Emergency Contact
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Guardian Name</span>
                        <p className="font-bold text-slate-800">
                          {student?.guardian ? `${student.guardian.firstName} ${student.guardian.lastName}` : (student?.guardianName || 'Primary Guardian')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Phone Number</span>
                        <p className="font-bold text-indigo-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {student?.guardianPhone || student?.guardian?.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Relationship</span>
                        <p className="font-bold text-slate-800 capitalize">
                          {student?.guardianRelation || 'Parent'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Sensitive administrative details (fees/billing) are restricted for teacher view.</span>
                  </div>
                </div>
              )}

              {/* SUB TAB 2: ATTENDANCE HISTORY */}
              {activeSubTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-xl font-black text-emerald-700">96%</p>
                      <p className="text-[10px] font-semibold text-emerald-800">Attendance Rate</p>
                    </div>
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <p className="text-xl font-black text-indigo-700">42</p>
                      <p className="text-[10px] font-semibold text-indigo-800">Days Present</p>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                      <p className="text-xl font-black text-rose-700">2</p>
                      <p className="text-[10px] font-semibold text-rose-800">Days Absent</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <h5 className="font-bold text-slate-900 text-xs">Recent Attendance Logs</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">Today</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">Present</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">Yesterday</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">Present</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 3: RESULTS & CA */}
              {activeSubTab === 'results' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <h5 className="font-bold text-slate-900 text-xs">Term 2 Academic Performance</h5>
                    <p className="text-[11px] text-slate-500">CA (40%) + Exam (60%) Breakdown</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">Mathematics</p>
                        <p className="text-[10px] text-slate-400">CA: 34/40 • Exam: 52/60</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-lg">86% (A)</span>
                    </div>

                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">English Language</p>
                        <p className="text-[10px] text-slate-400">CA: 32/40 • Exam: 48/60</p>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded-lg">80% (B+)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 4: ASSIGNMENTS */}
              {activeSubTab === 'assignments' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">Environmental Essay</p>
                      <p className="text-[10px] text-slate-400">Due Aug 6, 2026</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">Completed</span>
                  </div>
                </div>
              )}

              {/* SUB TAB 5: BEHAVIOUR */}
              {activeSubTab === 'behaviour' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-900">Commendation: Outstanding Participation</span>
                      <span className="text-[10px] text-emerald-700">Aug 2, 2026</span>
                    </div>
                    <p className="text-slate-600">Demonstrated excellent teamwork in Science laboratory practical.</p>
                  </div>
                </div>
              )}

              {/* SUB TAB 6: MEDICAL ALERT */}
              {activeSubTab === 'medical' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      Medical Alert & Health Information
                    </div>
                    <p className="text-slate-700">
                      {student?.medicalNotes || 'No specific allergies or medical alerts recorded for this student.'}
                    </p>
                  </div>
                </div>
              )}

              {/* SUB TAB: FEE COLLECTION PLAN */}
              {activeSubTab === 'feeConfig' && (
                <div className="space-y-4 text-xs">
                  {showFeeConfigModal && (
                    <DailyFeeConfigModal
                      student={student}
                      onClose={() => setShowFeeConfigModal(false)}
                      onSaved={() => {
                        queryClient.invalidateQueries({ queryKey: ['teacherStudentDetail', studentId] });
                        queryClient.invalidateQueries({ queryKey: ['students'] });
                        setShowFeeConfigModal(false);
                      }}
                    />
                  )}

                  <div className="p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-extrabold text-slate-900 text-sm">Student Fee Collection Configuration</h4>
                      </div>
                      <button
                        onClick={() => setShowFeeConfigModal(true)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Pencil size={12} /> Configure Plan
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200/70">
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Plan Category</span>
                        <p className="font-extrabold text-slate-800 text-xs mt-0.5">
                          {student?.dailyFeeConfig?.planType === 'feeding_weekly_bus_daily' ? 'Feeding Weekly (20 GHS) + Bus Daily (5 GHS)' :
                           student?.dailyFeeConfig?.planType === 'feeding_only_daily' ? 'Feeding Fee Only (Daily)' :
                           student?.dailyFeeConfig?.planType === 'bus_only_daily' ? 'Transport Bus Fare Only (Daily)' :
                           student?.dailyFeeConfig?.planType === 'feeding_weekly_only' ? 'Feeding Fee Weekly Only (20 GHS)' :
                           student?.dailyFeeConfig?.planType === 'both_weekly' ? 'Both Feeding & Bus (Weekly)' :
                           student?.dailyFeeConfig?.planType === 'exempt' ? 'Fee Exempt' :
                           'Both Feeding & Bus Fee (Daily 9.00 GHS)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Feeding Fee</span>
                        <p className="font-bold text-slate-800 text-xs mt-0.5 capitalize">
                          {student?.dailyFeeConfig?.feedingPlan === 'weekly' ? `Weekly (${student?.dailyFeeConfig?.feedingWeeklyAmount || 20} GHS/wk)` :
                           student?.dailyFeeConfig?.feedingPlan === 'exempt' ? 'Exempt' : 'Daily (Standard 4.00 GHS)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Transport Bus Fee</span>
                        <p className="font-bold text-slate-800 text-xs mt-0.5 capitalize">
                          {student?.dailyFeeConfig?.busPlan === 'weekly' ? `Weekly (${student?.dailyFeeConfig?.busWeeklyAmount || 25} GHS/wk)` :
                           student?.dailyFeeConfig?.busPlan === 'none' ? 'None (Walks)' : 'Daily Fee (Standard 5.00 GHS)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Rate Overrides</span>
                        <p className="font-bold text-slate-800 text-xs mt-0.5">
                          {student?.dailyFeeConfig?.customFeedingRate ? `Feed: ${student.dailyFeeConfig.customFeedingRate} GHS ` : ''}
                          {student?.dailyFeeConfig?.customBusRate ? `Bus: ${student.dailyFeeConfig.customBusRate} GHS` : ''}
                          {!student?.dailyFeeConfig?.customFeedingRate && !student?.dailyFeeConfig?.customBusRate ? 'Standard School Rates' : ''}
                        </p>
                      </div>
                    </div>

                    {student?.dailyFeeConfig?.notes && (
                      <div className="p-3 bg-white border border-slate-200/70 rounded-xl text-slate-700 text-xs">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Fee Notes:</span>
                        {student.dailyFeeConfig.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB TAB 7: TEACHER NOTES */}
              {activeSubTab === 'notes' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <h5 className="font-bold text-slate-900">Teacher Observational Remarks</h5>
                    <textarea
                      rows={3}
                      placeholder="Add observational notes for this student (e.g. academic progress, peer interaction)..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    ></textarea>
                    <button className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs">
                      Save Note
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentDetailModal;
