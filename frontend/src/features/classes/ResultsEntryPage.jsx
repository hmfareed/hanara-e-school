import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList, Check, AlertCircle, Save, Loader2,
  BookOpen, Layers, Calendar, FileDown, Award
} from 'lucide-react';

const ResultsEntryPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters & State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  
  // Local grades grid data
  const [gradesGrid, setGradesGrid] = useState([]);
  const [notification, setNotification] = useState({ text: '', type: '' });
  const [savingRows, setSavingRows] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState({});

  // 1. Fetch Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
  });

  // Auto-select current academic year
  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const active = academicYears.find(y => y.isCurrent) || academicYears[0];
      if (active) setSelectedYear(active.name);
    }
  }, [academicYears, selectedYear]);

  // 2. Fetch data based on role
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  // If Admin: fetch ALL classes & subjects
  const { data: allClasses = [] } = useQuery({
    queryKey: ['classesList', selectedYear],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
    enabled: isAdmin,
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjectsList'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects');
      return res.data?.data || [];
    },
    enabled: isAdmin,
  });

  // If Teacher: fetch teacher load
  const { data: teacherLoad = [], isLoading: loadLoading } = useQuery({
    queryKey: ['teacherLoad', user?.id || user?._id, selectedYear],
    queryFn: async () => {
      if (!user?.id && !user?._id) return [];
      const res = await api.get(`/teachers/${user.id || user._id}/load?academicYear=${selectedYear}`);
      return res.data?.data || [];
    },
    enabled: !isAdmin && !!selectedYear && (!!user?.id || !!user?._id),
  });

  // Compute available classes and subjects for selection
  const availableClasses = isAdmin 
    ? allClasses 
    : [...new Map(teacherLoad.map(item => {
        const classObj = item.class;
        const classId = classObj?._id || classObj;
        return classId ? [classId.toString(), classObj] : null;
      }).filter(Boolean)).values()].filter(Boolean);

  // Filter subjects based on selected class
  const availableSubjects = isAdmin
    ? allSubjects
    : teacherLoad
        .filter(item => {
          const classObj = item.class;
          const classId = classObj?._id || classObj;
          return classId && classId.toString() === selectedClass;
        })
        .map(item => item.subject)
        .filter(Boolean);

  // Reset selected subject when class changes
  useEffect(() => {
    setSelectedSubject('');
  }, [selectedClass]);

  // 3. Fetch Student Grades for selected parameters
  const isSearchEnabled = !!selectedClass && !!selectedSubject && !!selectedYear && !!selectedTerm;

  const { data: rawGradesData, isLoading: gradesLoading, error: gradesError } = useQuery({
    queryKey: ['classGrades', selectedClass, selectedSubject, selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await api.get(`/grades/class/${selectedClass}/subject/${selectedSubject}`, {
        params: { academicYear: selectedYear, term: selectedTerm }
      });
      return res.data?.data || [];
    },
    enabled: isSearchEnabled,
  });

  // Populate local state grid when grades load
  useEffect(() => {
    if (rawGradesData) {
      setGradesGrid(
        rawGradesData.map(item => ({
          studentId: item.student._id,
          name: `${item.student.firstName} ${item.student.lastName}`,
          admissionNumber: item.student.admissionNumber,
          classExercise1: item.grade?.classExercise1 ?? '',
          classExercise2: item.grade?.classExercise2 ?? '',
          classExercise3: item.grade?.classExercise3 ?? '',
          classExercise4: item.grade?.classExercise4 ?? '',
          weeklyTest: item.grade?.weeklyTest ?? '',
          homework1: item.grade?.homework1 ?? '',
          homework2: item.grade?.homework2 ?? '',
          homework3: item.grade?.homework3 ?? '',
          homework4: item.grade?.homework4 ?? '',
          rawExamScore: item.grade?.rawExamScore ?? '',
          rawClassScore: item.grade?.rawClassScore ?? 0,
          classScore: item.grade?.classScore ?? 0,
          examScore: item.grade?.examScore ?? 0,
          totalScore: item.grade?.totalScore ?? 0,
          isEdited: false,
        }))
      );
    } else {
      setGradesGrid([]);
    }
  }, [rawGradesData]);

  // Handle local mark updates in the table
  const handleScoreChange = (studentId, field, val) => {
    setGradesGrid(prev =>
      prev.map(row => {
        if (row.studentId === studentId) {
          const updatedRow = { ...row, [field]: val, isEdited: true };

          const ce1 = Number(updatedRow.classExercise1) || 0;
          const ce2 = Number(updatedRow.classExercise2) || 0;
          const ce3 = Number(updatedRow.classExercise3) || 0;
          const ce4 = Number(updatedRow.classExercise4) || 0;
          const wt = Number(updatedRow.weeklyTest) || 0;
          const hw1 = Number(updatedRow.homework1) || 0;
          const hw2 = Number(updatedRow.homework2) || 0;
          const hw3 = Number(updatedRow.homework3) || 0;
          const hw4 = Number(updatedRow.homework4) || 0;
          const rawExam = Number(updatedRow.rawExamScore) || 0;

          const rawCA = ce1 + ce2 + ce3 + ce4 + wt + hw1 + hw2 + hw3 + hw4;
          const convCA = parseFloat(((rawCA / 80) * 30).toFixed(2));
          const convExam = parseFloat(((rawExam / 100) * 70).toFixed(2));

          updatedRow.rawClassScore = rawCA;
          updatedRow.classScore = convCA;
          updatedRow.examScore = convExam;
          updatedRow.totalScore = parseFloat((convCA + convExam).toFixed(2));

          return updatedRow;
        }
        return row;
      })
    );
  };

  // Mutation to save a single grade
  const saveGradeMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/grades', payload);
    },
    onSuccess: (data, variables) => {
      // Mark as not edited and remove saving state
      setGradesGrid(prev =>
        prev.map(row => row.studentId === variables.studentId ? { ...row, isEdited: false } : row)
      );
      setSavingRows(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
    },
    onError: (err, variables) => {
      setSavingRows(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
      setNotification({ text: err.response?.data?.message || 'Failed to save grade.', type: 'error' });
    }
  });

  // Save single row
  const saveRow = (row) => {
    if (!selectedClass || !selectedSubject || !selectedYear || !selectedTerm) return;
    
    setSavingRows(prev => ({ ...prev, [row.studentId]: true }));

    const payload = {
      studentId: row.studentId,
      classId: selectedClass,
      subjectId: selectedSubject,
      academicYear: selectedYear,
      term: selectedTerm,
      classExercise1: row.classExercise1 === '' ? 0 : Number(row.classExercise1),
      classExercise2: row.classExercise2 === '' ? 0 : Number(row.classExercise2),
      classExercise3: row.classExercise3 === '' ? 0 : Number(row.classExercise3),
      classExercise4: row.classExercise4 === '' ? 0 : Number(row.classExercise4),
      weeklyTest: row.weeklyTest === '' ? 0 : Number(row.weeklyTest),
      homework1: row.homework1 === '' ? 0 : Number(row.homework1),
      homework2: row.homework2 === '' ? 0 : Number(row.homework2),
      homework3: row.homework3 === '' ? 0 : Number(row.homework3),
      homework4: row.homework4 === '' ? 0 : Number(row.homework4),
      rawExamScore: row.rawExamScore === '' ? 0 : Number(row.rawExamScore),
    };

    saveGradeMutation.mutate(payload);
  };

  // Save all modified rows
  const saveAllModified = async () => {
    const modifiedRows = gradesGrid.filter(row => row.isEdited);
    if (modifiedRows.length === 0) {
      setNotification({ text: 'No changes detected to save.', type: 'info' });
      setTimeout(() => setNotification({ text: '', type: '' }), 3000);
      return;
    }

    setNotification({ text: 'Saving grades...', type: 'info' });
    let successCount = 0;
    
    for (const row of modifiedRows) {
      try {
        setSavingRows(prev => ({ ...prev, [row.studentId]: true }));
        await api.post('/grades', {
          studentId: row.studentId,
          classId: selectedClass,
          subjectId: selectedSubject,
          academicYear: selectedYear,
          term: selectedTerm,
          classExercise1: row.classExercise1 === '' ? 0 : Number(row.classExercise1),
          classExercise2: row.classExercise2 === '' ? 0 : Number(row.classExercise2),
          classExercise3: row.classExercise3 === '' ? 0 : Number(row.classExercise3),
          classExercise4: row.classExercise4 === '' ? 0 : Number(row.classExercise4),
          weeklyTest: row.weeklyTest === '' ? 0 : Number(row.weeklyTest),
          homework1: row.homework1 === '' ? 0 : Number(row.homework1),
          homework2: row.homework2 === '' ? 0 : Number(row.homework2),
          homework3: row.homework3 === '' ? 0 : Number(row.homework3),
          homework4: row.homework4 === '' ? 0 : Number(row.homework4),
          rawExamScore: row.rawExamScore === '' ? 0 : Number(row.rawExamScore),
        });
        
        setGradesGrid(prev =>
          prev.map(r => r.studentId === row.studentId ? { ...r, isEdited: false } : r)
        );
        successCount++;
      } catch (err) {
        console.error('Failed to save grade for student:', row.studentId, err);
      } finally {
        setSavingRows(prev => {
          const next = { ...prev };
          delete next[row.studentId];
          return next;
        });
      }
    }

    // Refresh query list
    queryClient.invalidateQueries({
      queryKey: ['classGrades', selectedClass, selectedSubject, selectedYear, selectedTerm]
    });

    setNotification({
      text: `Successfully saved ${successCount} of ${modifiedRows.length} grade entries.`,
      type: 'success'
    });
    setTimeout(() => setNotification({ text: '', type: '' }), 5000);
  };

  const handleFinalize = async () => {
    if (!selectedClass || !selectedYear || !selectedTerm) return;
    if (!window.confirm("Are you sure you want to finalize this term? This will compute all student rankings, positions, and averages for this class.")) {
      return;
    }
    
    setFinalizing(true);
    setNotification({ text: 'Computing class rankings and averages...', type: 'info' });
    try {
      const res = await api.post(`/grades/class/${selectedClass}/finalize`, {
        academicYear: selectedYear,
        term: selectedTerm
      });
      setNotification({
        text: res.data?.message || 'Class term successfully finalized and rankings computed!',
        type: 'success'
      });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
      queryClient.invalidateQueries({
        queryKey: ['classGrades', selectedClass, selectedSubject, selectedYear, selectedTerm]
      });
    } catch (err) {
      console.error(err);
      setNotification({ text: err.response?.data?.message || 'Failed to finalize term.', type: 'error' });
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPdf = async (studentId, studentName) => {
    if (!selectedYear || !selectedTerm) {
      setNotification({ text: 'Academic Year and Term are required to download PDF.', type: 'error' });
      return;
    }
    setDownloadingPdf(prev => ({ ...prev, [studentId]: true }));
    try {
      const response = await api.get(`/grades/student/${studentId}/report-card/pdf`, {
        params: { academicYear: selectedYear, term: selectedTerm },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `ReportCard_${studentName.replace(/\s+/g, '_')}_Term${selectedTerm}_${selectedYear.replace(/\//g, '-')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      setNotification({ text: 'Failed to download report card PDF.', type: 'error' });
    } finally {
      setDownloadingPdf(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Result Entry & Grading Sheets</h2>
        <p className="text-sm text-slate-500 mt-1">Record class work scores and examination marks for students</p>
      </div>

      {/* Selections Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Academic Year */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Academic Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="">Select Year</option>
              {academicYears.map((yr) => (
                <option key={yr._id} value={yr.name}>
                  {yr.name}
                </option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Term */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800"
          >
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>

        {/* Class Stream */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Class Stream</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!isAdmin && loadLoading}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="">{!isAdmin && loadLoading ? 'Loading classes...' : 'Select Class'}</option>
              {availableClasses.map((cls) => {
                const classId = cls._id || cls;
                return (
                  <option key={classId?.toString()} value={classId?.toString()}>
                    {cls.name || cls}
                  </option>
                );
              })}
            </select>
            {!isAdmin && loadLoading
              ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              : <Layers size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
          </div>
          {!isAdmin && !loadLoading && availableClasses.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1">No classes assigned. Ask the admin to assign you to a class via Subject Assignments.</p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Subject / Strand</label>
          <div className="relative">
            <select
              value={selectedSubject}
              disabled={!selectedClass}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map((sub) => {
                const subId = sub._id || sub;
                return (
                  <option key={subId?.toString()} value={subId?.toString()}>
                    {sub.name || sub} {sub.code ? `(${sub.code})` : ''}
                  </option>
                );
              })}
            </select>
            <BookOpen size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {!isAdmin && selectedClass && availableSubjects.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1">No subjects assigned for this class. Ask the admin to set up Subject Assignments.</p>
          )}
        </div>
      </div>


      {notification.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center space-x-2.5 border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Main Grading sheet area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {!isSearchEnabled ? (
          <div className="p-12 text-center text-slate-400 max-w-md mx-auto">
            <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">Ready to Grade</p>
            <p className="text-xs text-slate-400 mt-1">Please select the academic period, class stream, and subject strand above to begin entering results.</p>
          </div>
        ) : gradesLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={32} className="text-[#116a4c] animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Loading student roster and scores...</p>
          </div>
        ) : gradesError ? (
          <div className="p-8 text-center text-red-700 bg-red-50 border-b border-slate-200">
            <p className="font-bold text-base">Error loading grading roster</p>
            <p className="text-sm mt-1">{gradesError?.response?.data?.message || gradesError.message}</p>
          </div>
        ) : (
          <div>
            {/* Header controls inside list */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {gradesGrid.length} Students
                </span>
                {gradesGrid.some(row => row.isEdited) && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {finalizing ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                  <span>Finalize Term & Rankings</span>
                </button>
                <button
                  onClick={saveAllModified}
                  className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save All Marks</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  {/* Group Headers */}
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th colSpan="2" className="py-2 px-4 border-r border-slate-200 text-center">Student Information</th>
                    <th colSpan="4" className="py-2 px-2 border-r border-slate-200 text-center bg-emerald-50/50 text-emerald-800">Class Exercises</th>
                    <th colSpan="1" className="py-2 px-2 border-r border-slate-200 text-center bg-indigo-50/50 text-indigo-800">Test</th>
                    <th colSpan="4" className="py-2 px-2 border-r border-slate-200 text-center bg-amber-50/50 text-amber-800">Homework</th>
                    <th colSpan="5" className="py-2 px-4 border-r border-slate-200 text-center bg-slate-100/50 text-slate-700">Grading & Summary</th>
                    <th className="py-2 px-4 text-center">Actions</th>
                  </tr>
                  {/* Detail Column Headers */}
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 border-r border-slate-100 min-w-[80px]">Adm #</th>
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[150px]">Student Name</th>
                    
                    {/* Class Exercises */}
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-emerald-50/10 text-emerald-700 w-16">CE 1<div className="text-[9px] text-slate-400">/10</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-emerald-50/10 text-emerald-700 w-16">CE 2<div className="text-[9px] text-slate-400">/10</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-emerald-50/10 text-emerald-700 w-16">CE 3<div className="text-[9px] text-slate-400">/5</div></th>
                    <th className="py-3 px-2 border-r border-slate-200 text-center bg-emerald-50/10 text-emerald-700 w-16">CE 4<div className="text-[9px] text-slate-400">/5</div></th>
                    
                    {/* Weekly Test */}
                    <th className="py-3 px-2 border-r border-slate-200 text-center bg-indigo-50/10 text-indigo-700 w-20">WT<div className="text-[9px] text-slate-400">/20</div></th>
                    
                    {/* Homework */}
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-amber-50/10 text-amber-700 w-16">HW 1<div className="text-[9px] text-slate-400">/10</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-amber-50/10 text-amber-700 w-16">HW 2<div className="text-[9px] text-slate-400">/10</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center bg-amber-50/10 text-amber-700 w-16">HW 3<div className="text-[9px] text-slate-400">/5</div></th>
                    <th className="py-3 px-2 border-r border-slate-200 text-center bg-amber-50/10 text-amber-700 w-16">HW 4<div className="text-[9px] text-slate-400">/5</div></th>
                    
                    {/* Summary / Exam */}
                    <th className="py-3 px-2 border-r border-slate-100 text-center text-slate-500 font-bold bg-slate-50 w-20">Raw CA<div className="text-[9px] text-slate-400">/80</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center text-emerald-800 font-bold bg-emerald-50/30 w-20">CA<div className="text-[9px] text-emerald-600">/30</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center text-slate-500 font-semibold w-24">Raw Exam<div className="text-[9px] text-slate-400">/100</div></th>
                    <th className="py-3 px-2 border-r border-slate-100 text-center text-indigo-800 font-bold bg-indigo-50/30 w-20">Exam<div className="text-[9px] text-indigo-600">/70</div></th>
                    <th className="py-3 px-4 border-r border-slate-200 text-center text-slate-800 font-bold bg-slate-100/50 w-24">Total<div className="text-[9px] text-slate-500">/100</div></th>
                    
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradesGrid.length > 0 ? (
                    gradesGrid.map((row) => {
                      const isSaving = !!savingRows[row.studentId];
                      return (
                        <tr key={row.studentId} className={`hover:bg-slate-50/30 transition-colors ${row.isEdited ? 'bg-amber-50/10' : ''}`}>
                          <td className="py-3 px-4 border-r border-slate-100 font-mono text-xs font-semibold text-slate-800">
                            {row.admissionNumber}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-900 font-sans">
                            {row.name}
                          </td>
                          
                          {/* Class Exercises */}
                          <td className="py-3 px-1 border-r border-slate-100 bg-emerald-50/5">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0"
                              value={row.classExercise1}
                              onChange={(e) => handleScoreChange(row.studentId, 'classExercise1', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-100 bg-emerald-50/5">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0"
                              value={row.classExercise2}
                              onChange={(e) => handleScoreChange(row.studentId, 'classExercise2', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-100 bg-emerald-50/5">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              placeholder="0"
                              value={row.classExercise3}
                              onChange={(e) => handleScoreChange(row.studentId, 'classExercise3', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-200 bg-emerald-50/5">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              placeholder="0"
                              value={row.classExercise4}
                              onChange={(e) => handleScoreChange(row.studentId, 'classExercise4', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          
                          {/* Weekly Test */}
                          <td className="py-3 px-1 border-r border-slate-200 bg-indigo-50/5">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              placeholder="0"
                              value={row.weeklyTest}
                              onChange={(e) => handleScoreChange(row.studentId, 'weeklyTest', e.target.value)}
                              className="w-14 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          
                          {/* Homework */}
                          <td className="py-3 px-1 border-r border-slate-100 bg-amber-50/5">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0"
                              value={row.homework1}
                              onChange={(e) => handleScoreChange(row.studentId, 'homework1', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-100 bg-amber-50/5">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0"
                              value={row.homework2}
                              onChange={(e) => handleScoreChange(row.studentId, 'homework2', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-100 bg-amber-50/5">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              placeholder="0"
                              value={row.homework3}
                              onChange={(e) => handleScoreChange(row.studentId, 'homework3', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-1 border-r border-slate-200 bg-amber-50/5">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              placeholder="0"
                              value={row.homework4}
                              onChange={(e) => handleScoreChange(row.studentId, 'homework4', e.target.value)}
                              className="w-12 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          
                          {/* Totals & Exam */}
                          <td className="py-3 px-2 border-r border-slate-100 text-center font-semibold font-mono text-slate-500 bg-slate-50/40">
                            {row.rawClassScore}
                          </td>
                          <td className="py-3 px-2 border-r border-slate-100 text-center font-bold font-mono text-emerald-800 bg-emerald-50/20">
                            {row.classScore}
                          </td>
                          <td className="py-3 px-1 border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              value={row.rawExamScore}
                              onChange={(e) => handleScoreChange(row.studentId, 'rawExamScore', e.target.value)}
                              className="w-14 mx-auto block px-1 py-1 border border-slate-200 rounded text-center text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800"
                            />
                          </td>
                          <td className="py-3 px-2 border-r border-slate-100 text-center font-bold font-mono text-indigo-800 bg-indigo-50/20">
                            {row.examScore}
                          </td>
                          <td className="py-3 px-2 border-r border-slate-200 text-center font-semibold font-mono bg-slate-100/30">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              row.totalScore >= 80 
                                ? 'bg-emerald-50 text-emerald-850 font-bold border border-emerald-100' 
                                : row.totalScore >= 50
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {row.totalScore}
                            </span>
                          </td>
                          
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {row.isEdited ? (
                                <button
                                  type="button"
                                  onClick={() => saveRow(row)}
                                  disabled={isSaving}
                                  className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-emerald-850 hover:bg-emerald-950 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                                >
                                  {isSaving ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Save size={12} />
                                  )}
                                  <span>Save Row</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium inline-flex items-center space-x-1 py-1.5">
                                  <Check size={12} className="text-emerald-700" />
                                  <span>Synced</span>
                                </span>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(row.studentId, row.name)}
                                disabled={!!downloadingPdf[row.studentId]}
                                title="Download Report Card PDF"
                                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {downloadingPdf[row.studentId] ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <FileDown size={12} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="17" className="py-12 text-center text-sm text-slate-400">
                        No active students found in this class stream.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom save all button */}
            {gradesGrid.length > 0 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={saveAllModified}
                  className="flex items-center space-x-1.5 py-2.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save All Student Marks</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsEntryPage;
