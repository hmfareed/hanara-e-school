import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ClipboardList, Save, Calendar, AlertCircle, Check, Loader2, 
  HelpCircle, RefreshCw, Eye, ShieldAlert, Plus, History, X 
} from 'lucide-react';
import { subscribeToEvent, unsubscribeFromEvent } from '../../services/socket';
import AdminDailyFeeOverview from './AdminDailyFeeOverview';

const TeacherDailyFeeRegister = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Correction Modal state
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedStudentForCorrection, setSelectedStudentForCorrection] = useState('');
  const [corrFeedingStatus, setCorrFeedingStatus] = useState('unpaid');
  const [corrFeedingAmount, setCorrFeedingAmount] = useState(0);
  const [corrBusStatus, setCorrBusStatus] = useState('unpaid');
  const [corrBusAmount, setCorrBusAmount] = useState(0);
  const [correctionReason, setCorrReason] = useState('');

  // 1. Fetch Classes List
  const { data: classes } = useQuery({
    queryKey: ['classesListDailyFees'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const isTeacherOnly = user?.role === 'teacher';
  const currentUserId = (user?.id || user?._id)?.toString();
  const currentStaffId = (user?.refStaff?._id || user?.refStaff)?.toString();

  const myManagedClasses = classes?.filter(cls => {
    const ftId = (cls.formTeacher?._id || cls.formTeacher)?.toString();
    const ctId = (cls.classTeacher?._id || cls.classTeacher)?.toString();
    return (currentUserId && ftId === currentUserId) || (currentStaffId && ctId === currentStaffId);
  }) || [];

  const myManagedClass = myManagedClasses[0];

  // Set default class for Teachers or general users
  useEffect(() => {
    if (classes && classes.length > 0) {
      if (isTeacherOnly && myManagedClass) {
        setSelectedClass(myManagedClass._id);
      } else if (!selectedClass) {
        setSelectedClass(myManagedClasses[0]?._id || classes[0]._id);
      }
    }
  }, [classes, isTeacherOnly, myManagedClass, selectedClass]);

  // 2. Fetch the Daily Register Data (template or submitted)
  const { data: registerPayload, isLoading, error, refetch } = useQuery({
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

  // Re-sync on Socket IO alerts
  useEffect(() => {
    const handleDiscrepancyAlert = (payload) => {
      if (payload.classId === selectedClass && payload.submissionId === registerPayload?.data?._id) {
        refetch();
        setMessage({
          text: `🔔 Discrepancy flagged: ${payload.message}`,
          type: 'error'
        });
      }
    };

    subscribeToEvent('discrepancyAlert', handleDiscrepancyAlert);
    return () => {
      unsubscribeFromEvent('discrepancyAlert', handleDiscrepancyAlert);
    };
  }, [selectedClass, registerPayload, refetch]);

  const activeFeedingRate = registerPayload?.data?.rates?.feedingFeeAmount ?? 4;
  const activeBusRate = registerPayload?.data?.rates?.busFareAmount ?? 5;

  // Update line items whenever register data fetches
  useEffect(() => {
    if (registerPayload) {
      if (registerPayload.exists) {
        // Loads from reconciled items returned by backend (layered with corrections)
        setLineItems(registerPayload.reconciledLineItems || []);
      } else {
        // Form template (attendance synchronized)
        const rawItems = registerPayload.data?.lineItems || registerPayload.data?.records || [];
        setLineItems(
          rawItems.map((item) => {
            const student = item.student || {};
            const isAbsent = item.status === 'absent' || item.feedingStatus === 'absent';
            const isPaidFeeding = item.status === 'feeding' || item.status === 'both' || item.feedingStatus === 'paid';
            const isPaidBus = item.status === 'both' || item.busStatus === 'paid';
            return {
              studentId: student._id || item.studentId || item.student,
              name: `${student.firstName || ''} ${student.otherNames ? student.otherNames + ' ' : ''}${student.lastName || ''}`.trim(),
              admissionNumber: student.admissionNumber || item.admissionNumber || '',
              usesBus: !!(student.transport?.usesBus || item.usesBus),
              stop: student.transport?.stop || item.stop || '',
              feedingStatus: isAbsent ? 'absent' : isPaidFeeding ? 'paid' : 'unpaid',
              feedingAmount: isPaidFeeding ? (item.feedingAmount || activeFeedingRate) : 0,
              busStatus: isAbsent ? 'absent' : isPaidBus ? 'paid' : 'unpaid',
              busAmount: isPaidBus ? (item.busAmount || activeBusRate) : 0,
            };
          })
        );
      }
    }
  }, [registerPayload, activeFeedingRate, activeBusRate]);

  // Handlers for template editing
  const handleFeedingStatusChange = (studentId, status, defaultAmount) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          return {
            ...item,
            feedingStatus: status,
            feedingAmount: status === 'paid' ? (defaultAmount || activeFeedingRate) : 0,
          };
        }
        return item;
      })
    );
  };

  const handleBusStatusChange = (studentId, status, defaultAmount) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          return {
            ...item,
            busStatus: status,
            busAmount: status === 'paid' ? (defaultAmount || activeBusRate) : 0,
          };
        }
        return item;
      })
    );
  };

  const handleSingleFeeStatusChange = (studentId, status) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          if (status === 'paid') {
            return {
              ...item,
              feedingStatus: 'paid',
              feedingAmount: activeFeedingRate,
              busStatus: item.usesBus ? 'paid' : 'unpaid',
              busAmount: item.usesBus ? activeBusRate : 0,
            };
          } else if (status === 'absent') {
            return {
              ...item,
              feedingStatus: 'absent',
              feedingAmount: 0,
              busStatus: item.usesBus ? 'absent' : 'unpaid',
              busAmount: 0,
            };
          } else {
            // unpaid
            return {
              ...item,
              feedingStatus: 'unpaid',
              feedingAmount: 0,
              busStatus: 'unpaid',
              busAmount: 0,
            };
          }
        }
        return item;
      })
    );
  };

  const getStudentFeeStatus = (item) => {
    if (item.feedingStatus === 'absent' || item.busStatus === 'absent') return 'absent';
    const isFeedingPaid = item.feedingStatus === 'paid';
    const isBusPaid = !item.usesBus || item.busStatus === 'paid';

    if (isFeedingPaid && isBusPaid) return 'paid';
    return 'unpaid';
  };

  const handleFeedingAmountChange = (studentId, value) => {
    const val = parseFloat(value) || 0;
    setLineItems((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, feedingAmount: val } : item))
    );
  };

  const handleBusAmountChange = (studentId, value) => {
    const val = parseFloat(value) || 0;
    setLineItems((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, busAmount: val } : item))
    );
  };

  const handlePrefillAllPresent = () => {
    setLineItems((prev) =>
      prev.map((item) => {
        // Do not alter students who were pre-filled as absent by attendance integration
        if (item.feedingStatus === 'absent' || item.busStatus === 'absent') {
          return item;
        }
        return {
          ...item,
          feedingStatus: 'paid',
          feedingAmount: activeFeedingRate,
          busStatus: item.usesBus ? 'paid' : 'unpaid',
          busAmount: item.usesBus ? activeBusRate : 0,
        };
      })
    );
  };

  // Submit register mutation
  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/fees/daily-register', payload);
    },
    onSuccess: (res) => {
      refetch();
      const isQueued = res?.data?._queued || !navigator.onLine;
      const successText = isQueued
        ? '📝 Daily fee register saved locally (Pending Verification). Will sync when connection is restored.'
        : '🎉 Daily fee register submitted and verified successfully!';
      setMessage({ text: successText, type: 'success' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage({ text: '', type: '' }), 6000);
    },
    onError: (err) => {
      setMessage({
        text: err.response?.data?.message || 'Failed to submit daily fee register.',
        type: 'error',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const handleFormSubmit = () => {
    if (!selectedClass) return;

    // Validate that there is at least one student
    if (lineItems.length === 0) {
      setMessage({ text: 'No student line items to submit.', type: 'error' });
      return;
    }

    const payload = {
      classId: selectedClass,
      date: new Date(selectedDate).toISOString(),
      records: lineItems.map((item) => {
        let status = 'unpaid';
        if (item.feedingStatus === 'absent' || item.busStatus === 'absent') {
          status = 'absent';
        } else if (item.feedingStatus === 'paid' && item.busStatus === 'paid') {
          status = 'both';
        } else if (item.feedingStatus === 'paid') {
          status = 'feeding';
        }

        const totalAmount = (item.feedingStatus === 'paid' ? item.feedingAmount : 0) + (item.busStatus === 'paid' ? item.busAmount : 0);
        return {
          student: item.studentId,
          status,
          amountPaid: totalAmount,
        };
      }),
      lineItems: lineItems.map((item) => ({
        student: item.studentId,
        feedingStatus: item.feedingStatus,
        feedingAmount: item.feedingStatus === 'paid' ? item.feedingAmount : 0,
        busStatus: item.busStatus,
        busAmount: item.busStatus === 'paid' ? item.busAmount : 0,
      })),
    };

    submitMutation.mutate(payload);
  };

  // Correction mutation
  const correctionMutation = useMutation({
    mutationFn: async ({ submissionId, payload }) => {
      return await api.post(`/fees/daily-register/${submissionId}/corrections`, payload);
    },
    onSuccess: () => {
      refetch();
      setIsCorrectionModalOpen(false);
      // Reset correction form
      setSelectedStudentForCorrection('');
      setCorrReason('');
      setMessage({ text: '✓ Auditable correction appended to submission ledger successfully.', type: 'success' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage({ text: '', type: '' }), 6000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to file correction request.');
    },
  });

  const handleOpenCorrection = (studentItem) => {
    setSelectedStudentForCorrection(studentItem.studentId);
    setCorrFeedingStatus(studentItem.feedingStatus);
    setCorrFeedingAmount(studentItem.feedingAmount);
    setCorrBusStatus(studentItem.busStatus);
    setCorrBusAmount(studentItem.busAmount);
    setCorrReason('');
    setIsCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = () => {
    if (!correctionReason.trim() || correctionReason.trim().length < 5) {
      alert('You must provide a solid explanation reason (at least 5 characters).');
      return;
    }

    const submissionId = registerPayload?.data?._id;
    if (!submissionId) return;

    const payload = {
      studentId: selectedStudentForCorrection,
      feedingStatus: corrFeedingStatus,
      feedingAmount: corrFeedingStatus === 'paid' ? parseFloat(corrFeedingAmount) || 0 : 0,
      busStatus: corrBusStatus,
      busAmount: corrBusStatus === 'paid' ? parseFloat(corrBusAmount) || 0 : 0,
      reason: correctionReason,
    };

    correctionMutation.mutate({ submissionId, payload });
  };

  // Calculations for layout metrics
  const getTotals = () => {
    if (registerPayload?.exists) {
      return registerPayload.reconciledTotals || { feedingTotal: 0, busFareTotal: 0, grandTotal: 0 };
    }
    return lineItems.reduce(
      (acc, item) => {
        const fAmount = item.feedingStatus === 'paid' ? item.feedingAmount : 0;
        const bAmount = item.busStatus === 'paid' ? item.busAmount : 0;
        acc.feedingTotal += fAmount;
        acc.busFareTotal += bAmount;
        acc.grandTotal += fAmount + bAmount;
        return acc;
      },
      { feedingTotal: 0, busFareTotal: 0, grandTotal: 0 }
    );
  };

  const totals = getTotals();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check size={12} /> Confirmed (Settled)
          </span>
        );
      case 'discrepancy_flagged':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <ShieldAlert size={12} /> Discrepancy Flagged
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Check size={12} /> Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Loader2 size={12} className="animate-spin" /> Pending Confirmation
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-emerald-600 h-6 w-6" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Fee Collection & Register</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Form Teachers & Class Teachers: Record and submit daily feeding fees and transport bus fares for your assigned class.
          </p>
        </div>
      </div>

      {/* Notice if teacher has no class assigned */}
      {isTeacherOnly && (!classes || classes.length === 0 || !myManagedClass) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">No Class Assigned to Your Teacher Account</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Daily fee collection is managed by designated Class & Form Teachers. If you are supposed to record daily fees for a class, please ask your school administrator to assign you as the Form Teacher or Class Teacher for your class.
            </p>
          </div>
        </div>
      )}

      {/* Selectors */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end transition-all">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">My Class Scope</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={isTeacherOnly && myManagedClasses.length <= 1}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-slate-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            {(isTeacherOnly && myManagedClasses.length > 0 ? myManagedClasses : classes)?.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} {cls.formTeacher?._id === currentUserId || cls.formTeacher === currentUserId ? ' (Form Class)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Collection Date</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Action pre-fill for unsubmitted */}
        {registerPayload && !registerPayload.exists && (
          <div className="shrink-0 flex gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handlePrefillAllPresent}
              disabled={lineItems.length === 0}
              className="w-full md:w-auto py-2.5 px-5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              ⚡ Prefill Present
            </button>
          </div>
        )}
      </div>

      {/* Alert Feed */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-start gap-2.5 text-sm font-semibold shadow-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <div>{message.text}</div>
        </div>
      )}

      {/* Discrepancy Flag Warning Card */}
      {registerPayload?.exists && registerPayload.data?.status === 'discrepancy_flagged' && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm space-y-2 animate-pulse">
          <div className="flex items-center gap-2 font-black text-rose-800">
            <ShieldAlert size={20} />
            <h2>ACCOUNTS OFFICE DISCREPANCY DETECTED</h2>
          </div>
          <p className="text-sm font-medium">
            The Accounts Office counted your cash in hand and flagged a mismatch. Please check your physical collections and submit corrections if required.
          </p>
          <div className="p-3 bg-white/70 border border-rose-100 rounded-xl font-mono text-xs font-bold text-rose-900">
            Notes: "{registerPayload.data?.discrepancyNotes || 'No notes added'}"
          </div>
        </div>
      )}

      {/* Attendance prefill note */}
      {registerPayload && !registerPayload.exists && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
          <HelpCircle size={14} className="shrink-0" />
          <span>Note: Students marked as 'absent' on today's attendance register are pre-flagged as absent below to prevent duplicate records.</span>
        </div>
      )}

      {/* Main Grid content */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-400">Loading school collection register...</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold">
          Failed to load register: {error.message || 'Check database connection.'}
        </div>
      ) : lineItems.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 font-bold">
          No active students found in this class.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Student lines table */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Student Roster</span>
              {registerPayload?.exists && getStatusBadge(registerPayload.data?.status)}
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Adm #</th>
                    <th className="py-3 px-4 font-bold">Student Name</th>
                    <th className="py-3 px-4 text-center font-black text-emerald-900 bg-emerald-50/70 border-l border-slate-200">
                      Fee Collection (Today)
                    </th>
                    <th className="py-3 px-4 text-center font-bold border-l border-slate-200">Status</th>
                    {registerPayload?.exists && registerPayload.data?.status !== 'confirmed' && (
                      <th className="py-3 px-4 text-center font-bold border-l border-slate-200">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item) => (
                    <tr key={item.studentId} className="hover:bg-slate-50/20">
                      {/* Admission Number */}
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-800 shrink-0">
                        {item.admissionNumber}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-3 min-w-[140px]">
                        <div className="font-extrabold text-slate-900 text-xs">{item.name}</div>
                        {item.usesBus ? (
                          <div className="inline-flex items-center text-[9px] uppercase tracking-wide bg-blue-50 text-blue-700 font-bold border border-blue-100 rounded px-1.5 py-0.5 mt-0.5">
                            🚌 {item.stop || 'Uses Bus'}
                          </div>
                        ) : (
                          <div className="inline-flex items-center text-[9px] uppercase tracking-wide bg-slate-50 text-slate-400 font-medium border border-slate-100 rounded px-1.5 py-0.5 mt-0.5">
                            Walks
                          </div>
                        )}
                      </td>

                      {/* Single Unified Fee Collection Column */}
                      <td className="py-3 px-4 border-l border-slate-200 bg-emerald-50/10 text-center">
                        {registerPayload?.exists ? (
                          /* Locked Read-only */
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wide ${
                              (item.feedingAmount + item.busAmount) > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {(item.feedingAmount + item.busAmount).toFixed(2)} GHS
                            </span>
                          </div>
                        ) : (
                          /* Editable Form Single Fee Collection Toggle */
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                              {['paid', 'unpaid', 'absent'].map((st) => {
                                const currentStatus = getStudentFeeStatus(item);
                                const isActive = currentStatus === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleSingleFeeStatusChange(item.studentId, st)}
                                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                      isActive
                                        ? st === 'paid' ? 'bg-emerald-600 text-white shadow-2xs' :
                                          st === 'absent' ? 'bg-slate-700 text-white shadow-2xs' :
                                          'bg-rose-600 text-white shadow-2xs'
                                        : st === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100' :
                                          st === 'unpaid' ? 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100' :
                                          'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-600 font-sans">
                              Target Rate: {(activeFeedingRate + (item.usesBus ? activeBusRate : 0)).toFixed(2)} GHS
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4 border-l border-slate-100 text-center">
                        <span className={`inline-flex items-center text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          item.feedingStatus === 'absent' || item.busStatus === 'absent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {item.feedingStatus === 'absent' || item.busStatus === 'absent' ? 'ABSENT' : 'PRESENT'}
                        </span>
                      </td>

                      {/* Action Correction button if locked */}
                      {registerPayload?.exists && registerPayload.data?.status !== 'confirmed' && (
                        <td className="py-4 px-4 border-l border-slate-100 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 text-xs font-bold border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus size={12} /> Correct
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form Footer Save Button Bar */}
            {!registerPayload?.exists && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleFormSubmit}
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-2 py-3 px-7 rounded-xl bg-emerald-700 hover:bg-emerald-850 text-white font-bold text-sm shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  {submitMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Submit and Lock Sheet
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Summary Card & Corrections Audit Trail */}
          <div className="space-y-4">
            {/* Rates indicator */}
            {!registerPayload?.exists && (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 shadow-sm border border-slate-850 space-y-1.5">
                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Daily Rates</h4>
                <div className="text-xs font-semibold flex justify-between">
                  <span>Feeding Fee rate:</span>
                  <span className="text-emerald-400 font-extrabold">{activeFeedingRate.toFixed(2)} GHS</span>
                </div>
                <div className="text-xs font-semibold flex justify-between">
                  <span>Transport Bus Fare rate:</span>
                  <span className="text-emerald-400 font-extrabold">{activeBusRate.toFixed(2)} GHS</span>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">
                Register Summary
              </h3>

              <div className="text-center bg-emerald-50 border border-emerald-100 rounded-2xl py-5 shadow-inner">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Expected Collections Cash
                </span>
                <span className="text-3xl font-black text-slate-900 font-sans tracking-tight">
                  {totals.grandTotal.toFixed(2)} <span className="text-xs font-bold text-slate-500">GHS</span>
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400 text-xs">Feeding total:</span>
                  <span className="text-slate-800 font-extrabold">{totals.feedingTotal.toFixed(2)} GHS</span>
                </div>
                <div className="flex justify-between font-medium pb-2 border-b border-slate-100">
                  <span className="text-slate-400 text-xs">Bus Fare total:</span>
                  <span className="text-slate-800 font-extrabold">{totals.busFareTotal.toFixed(2)} GHS</span>
                </div>
                <div className="flex justify-between font-medium text-xs">
                  <span className="text-slate-400">Total present:</span>
                  <span className="text-slate-800 font-bold">
                    {lineItems.filter((i) => i.feedingStatus !== 'absent').length} students
                  </span>
                </div>
                <div className="flex justify-between font-medium text-xs">
                  <span className="text-slate-400">Absences:</span>
                  <span className="text-red-500 font-bold">
                    {lineItems.filter((i) => i.feedingStatus === 'absent').length} students
                  </span>
                </div>
              </div>
            </div>

            {/* Reconciled Auditable Corrections History Trail */}
            {registerPayload?.exists && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-slate-850">
                  <History size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest">
                    Corrections Audit Trail
                  </h3>
                </div>

                {registerPayload.corrections && registerPayload.corrections.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {registerPayload.corrections.map((corr, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                          <span>{corr.correctedBy?.email}</span>
                          <span>{new Date(corr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-semibold text-slate-800">
                          {corr.student?.firstName} {corr.student?.lastName} modified:
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] bg-white border border-slate-100 p-1.5 rounded-lg">
                          <div>
                            <span className="text-slate-400 font-semibold block">FEEDING</span>
                            <span className="font-bold text-slate-800">{corr.feedingStatus.toUpperCase()} ({corr.feedingAmount} GHS)</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">BUS FARE</span>
                            <span className="font-bold text-slate-800">{corr.busStatus.toUpperCase()} ({corr.busAmount} GHS)</span>
                          </div>
                        </div>
                        <p className="italic text-slate-500 bg-white/50 p-1 border border-slate-100 rounded text-[11px]">
                          Reason: "{corr.reason}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 italic">No corrections have been submitted for this register.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Correction Form Modal Overlay */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-emerald-800 font-black text-sm uppercase tracking-wide">
                <History size={16} /> Record Sheet Correction
              </div>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Adjust this student's records. Corrections append to a live ledger rather than silently rewriting database records to remain audit-safe.
              </p>

              {/* Student name */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-800">
                Student Name: {lineItems.find((l) => l.studentId === selectedStudentForCorrection)?.name}
              </div>

              {/* Correction feeding input */}
              <div className="space-y-1.5 p-3 border border-slate-200 rounded-2xl">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Correction: Feeding Status</label>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  {['paid', 'unpaid', 'absent'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setCorrFeedingStatus(st);
                        if (st !== 'paid') setCorrFeedingAmount(0);
                        else setCorrFeedingAmount(activeFeedingRate);
                      }}
                      className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        corrFeedingStatus === st
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                {corrFeedingStatus === 'paid' && (
                  <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <span className="text-xs text-slate-400 font-bold">Paid: GHS</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={corrFeedingAmount}
                      onChange={(e) => setCorrFeedingAmount(e.target.value)}
                      className="w-20 px-2 py-1 text-center text-xs border border-slate-200 rounded-md font-extrabold focus:outline-emerald-600 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Correction bus input */}
              <div className="space-y-1.5 p-3 border border-slate-200 rounded-2xl">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Correction: Bus Fare Status</label>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  {['paid', 'unpaid', 'absent'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setCorrBusStatus(st);
                        if (st !== 'paid') setCorrBusAmount(0);
                        else setCorrBusAmount(activeBusRate);
                      }}
                      className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                        corrBusStatus === st
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                {corrBusStatus === 'paid' && (
                  <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <span className="text-xs text-slate-400 font-bold">Paid: GHS</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={corrBusAmount}
                      onChange={(e) => setCorrBusAmount(e.target.value)}
                      className="w-20 px-2 py-1 text-center text-xs border border-slate-200 rounded-md font-extrabold focus:outline-emerald-600 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Reason input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Explanation Reason</label>
                <textarea
                  rows="3"
                  value={correctionReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g. Student paid transport fare later in afternoon"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="py-2 px-4 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCorrection}
                disabled={correctionMutation.isPending}
                className="py-2 px-4 bg-emerald-700 hover:bg-emerald-850 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-md cursor-pointer"
              >
                {correctionMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                Register Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DailyFeeRegisterPage = () => {
  const { user, activeMode } = useAuth();
  const isTeacherMode =
    user?.role === 'teacher' || (user?.role === 'system_admin' && activeMode === 'teacher');

  if (isTeacherMode) {
    return <TeacherDailyFeeRegister />;
  }

  return <AdminDailyFeeOverview />;
};

export default DailyFeeRegisterPage;

