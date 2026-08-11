import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { X, Award, ArrowRight, Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';

const EMPTY_ARRAY = [];

const BatchPromotionModal = ({ isOpen, onClose, classes = [], onSuccess }) => {
  const [fromClassId, setFromClassId] = useState('');
  const [action, setAction] = useState('promote'); // 'promote' | 'graduate' | 'repeat'
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Fetch student roster of source class
  const { data, isLoading: loadingRoster } = useQuery({
    queryKey: ['batchPromotionRoster', fromClassId],
    queryFn: async () => {
      if (!fromClassId) return [];
      const res = await api.get(`/students?class=${fromClassId}&limit=200&status=active`);
      return res.data?.data || [];
    },
    enabled: !!fromClassId && isOpen,
  });
  const sourceStudents = data ?? EMPTY_ARRAY;

  // Select all students when roster loads
  useEffect(() => {
    if (sourceStudents.length > 0) {
      setSelectedStudentIds(sourceStudents.map((s) => s._id));
    } else {
      setSelectedStudentIds([]);
    }
  }, [sourceStudents]);

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === sourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceStudents.map((s) => s._id));
    }
  };

  // Batch Promotion Mutation
  const promoteMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/students/promote-batch', payload);
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'success',
        message: `✓ ${res.data?.message || 'Batch promotion executed successfully!'}`,
      });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setFeedback(null);
      }, 2000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to execute batch promotion.',
      });
    },
  });

  const handleExecute = () => {
    if (!fromClassId) {
      setFeedback({ type: 'error', message: 'Please select a source class stream.' });
      return;
    }
    if (selectedStudentIds.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one student.' });
      return;
    }
    if (action === 'promote' && !targetClassId) {
      setFeedback({ type: 'error', message: 'Please select a destination target class.' });
      return;
    }

    setFeedback(null);
    promoteMutation.mutate({
      studentIds: selectedStudentIds,
      action,
      targetClassId: action === 'promote' ? targetClassId : undefined,
    });
  };

  if (!isOpen) return null;

  const sourceClassName = classes.find((c) => c._id === fromClassId)?.name || 'Selected Class';
  const targetClassName = classes.find((c) => c._id === targetClassId)?.name || 'Target Class';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 relative animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-800 font-bold">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Batch Student Promotion &amp; Transition</h3>
              <p className="text-xs text-slate-500">Promote or graduate an entire class stream at the end of term</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedback.message}
          </div>
        )}

        {/* Transition Parameters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
          <div>
            <label className="block font-black uppercase text-[10px] text-slate-400 tracking-wider mb-1">Source Class Stream</label>
            <select
              value={fromClassId}
              onChange={(e) => setFromClassId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="">Select Source Class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] text-slate-400 tracking-wider mb-1">Transition Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="promote">Promote to Next Class</option>
              <option value="graduate">Graduate (Archive Class)</option>
              <option value="repeat">Repeat Current Class</option>
            </select>
          </div>

          {action === 'promote' && (
            <div>
              <label className="block font-black uppercase text-[10px] text-slate-400 tracking-wider mb-1">Destination Target Class</label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value="">Select Target Class</option>
                {classes.filter((c) => c._id !== fromClassId).map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Transition Summary Banner */}
        {fromClassId && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs flex items-center justify-between text-emerald-900 font-bold">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-700" />
              <span>
                {action === 'promote' && `Promoting ${selectedStudentIds.length} students from ${sourceClassName} to ${targetClassName}`}
                {action === 'graduate' && `Graduating ${selectedStudentIds.length} BECE candidates from ${sourceClassName}`}
                {action === 'repeat' && `Retaining ${selectedStudentIds.length} students in ${sourceClassName}`}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">
              {selectedStudentIds.length} Selected
            </span>
          </div>
        )}

        {/* Student Roster Selection Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
          {!fromClassId ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              Please select a Source Class Stream above to load students.
            </div>
          ) : loadingRoster ? (
            <div className="p-8 text-center flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <Loader2 className="animate-spin text-emerald-600" size={16} /> Loading class roster...
            </div>
          ) : sourceStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active students found in this class stream.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 sticky top-0 bg-slate-50">
                <tr>
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === sourceStudents.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Admission No.</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourceStudents.map((st) => {
                  const isChecked = selectedStudentIds.includes(st._id);
                  return (
                    <tr
                      key={st._id}
                      onClick={() => toggleSelectStudent(st._id)}
                      className={`hover:bg-slate-50/60 cursor-pointer transition-colors ${isChecked ? 'bg-emerald-50/20' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{st.firstName} {st.lastName}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">{st.admissionNumber || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {st.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={promoteMutation.isPending || !fromClassId || selectedStudentIds.length === 0}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {promoteMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Executing Transition...
              </>
            ) : (
              <>
                <ArrowRight size={14} /> Execute Batch Transition
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchPromotionModal;
