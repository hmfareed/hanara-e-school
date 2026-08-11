import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, CheckCircle2, Clock, XCircle, Plus, User,
  Calendar, FileText, AlertCircle, X, Check, ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ParentTeacherMessagingPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isParent = user?.role === 'parent';

  const [activeQuery, setActiveQuery] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [notification, setNotification] = useState(null);

  // Parent Create Form State
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'sick_leave',
    subject: '',
    message: '',
    startDate: '',
    endDate: '',
  });

  // Fetch Parent Children for dropdown (if parent)
  const { data: children = [] } = useQuery({
    queryKey: ['parentChildrenList'],
    queryFn: async () => {
      const res = await api.get('/parent/children');
      return res.data?.data || [];
    },
    enabled: isParent,
  });

  // Query Messages/Queries List
  const { data: queries = [], isLoading } = useQuery({
    queryKey: ['parentQueriesList'],
    queryFn: async () => {
      const res = await api.get('/parent-queries');
      return res.data?.data || [];
    },
  });

  // Create Query Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/parent-queries', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setNotification({ text: data?.message || 'Message sent to form teacher!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['parentQueriesList'] });
      setShowAddModal(false);
      setFormData({ studentId: '', type: 'sick_leave', subject: '', message: '', startDate: '', endDate: '' });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to send message', type: 'error' });
    },
  });

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.post(`/parent-queries/${id}/reply`, payload);
      return res.data?.data;
    },
    onSuccess: (updated) => {
      setNotification({ text: 'Reply submitted successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['parentQueriesList'] });
      setActiveQuery(updated);
      setReplyText('');
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const handleSubmitNewQuery = (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.subject.trim() || !formData.message.trim()) {
      setNotification({ text: 'Please select a child and fill in all required fields', type: 'error' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handlePostReply = (statusOverride = null) => {
    if (!activeQuery) return;
    if (!replyText.trim() && !statusOverride) return;

    replyMutation.mutate({
      id: activeQuery._id,
      payload: {
        message: replyText,
        status: statusOverride || (isParent ? 'pending' : 'replied'),
      },
    });
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'replied':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare size={28} className="text-emerald-700" />
            <span>Parent-Teacher Direct Messaging &amp; Permission Notes</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit sick permission notes, absence requests, and direct queries to your child&apos;s form teacher.
          </p>
        </div>

        {isParent && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Send Permission Note / Query</span>
          </button>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between animate-in fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}><X size={14} /></button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Thread List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 lg:col-span-1 max-h-[700px] overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Message Threads</h3>

          {isLoading ? (
            <div className="py-8 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"></div></div>
          ) : queries.length > 0 ? (
            queries.map((q) => (
              <button
                key={q._id}
                onClick={() => setActiveQuery(q)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeQuery?._id === q._id
                    ? 'border-emerald-700 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getStatusBadge(q.status)}`}>
                    {q.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{new Date(q.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate">{q.subject}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Child: <strong className="text-slate-800">{q.student?.firstName} {q.student?.lastName}</strong> ({q.class?.name})
                </p>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No message threads found.
            </div>
          )}
        </div>

        {/* Right Active Message View */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[500px]">
          {activeQuery ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getStatusBadge(activeQuery.status)}`}>
                        {activeQuery.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400 capitalize">• Type: {activeQuery.type.replace('_', ' ')}</span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mt-1">{activeQuery.subject}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Student: <strong className="text-slate-800">{activeQuery.student?.firstName} {activeQuery.student?.lastName}</strong> ({activeQuery.class?.name})
                    </p>
                  </div>

                  {!isParent && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePostReply('approved')}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                        <span>Approve Request</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Permission dates box */}
                {activeQuery.permissionDates?.startDate && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center space-x-2">
                    <Calendar size={14} />
                    <span>
                      Requested Absence Period: {new Date(activeQuery.permissionDates.startDate).toLocaleDateString('en-GB')} to {new Date(activeQuery.permissionDates.endDate || activeQuery.permissionDates.startDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}

                {/* Original Message */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mb-4">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>PARENT NOTE / QUERY</span>
                    <span>{new Date(activeQuery.createdAt).toLocaleString('en-GB')}</span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{activeQuery.message}</p>
                </div>

                {/* Reply Thread */}
                {activeQuery.replies && activeQuery.replies.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversation Replies</h4>
                    {activeQuery.replies.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          r.senderRole === 'parent' ? 'bg-slate-50 border-slate-200 ml-4' : 'bg-emerald-50/50 border-emerald-200 mr-4'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span className="capitalize">{r.senderRole === 'parent' ? 'Parent' : 'Form Teacher'}</span>
                          <span>{new Date(r.createdAt).toLocaleString('en-GB')}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Input Box */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply message..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handlePostReply()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <MessageSquare size={36} className="mx-auto text-slate-300" />
              <p className="font-bold text-sm">Select a message thread from the left list to view conversation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Permission Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <MessageSquare size={20} className="text-emerald-400" />
                <h3 className="font-bold text-base">Send Note / Permission Request</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewQuery} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Child *</label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Child...</option>
                  {children.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} ({c.currentClass?.name || 'Class'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="sick_leave">Sick Leave Permission</option>
                    <option value="permission">General Absence Permission</option>
                    <option value="academic_query">Academic Query</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Sick Leave Permission for Kwesi"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {(formData.type === 'sick_leave' || formData.type === 'permission') && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Explain reason for leave or query..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentTeacherMessagingPage;
