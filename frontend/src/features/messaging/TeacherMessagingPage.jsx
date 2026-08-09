import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Send,
  Inbox,
  Plus,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Users,
  Smartphone,
  CheckCheck,
  Search,
} from 'lucide-react';

const TeacherMessagingPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'sent'
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [notification, setNotification] = useState({ text: '', type: '' });

  // Form State
  const [form, setForm] = useState({
    recipientType: 'admin', // 'admin' | 'staff' | 'class_parents'
    recipientId: '',
    classId: '',
    subject: '',
    body: '',
    sendSmsAlert: false,
  });

  // Fetch Teacher Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['myTeacherClassesList'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Fetch Recipients Roster
  const { data: recipientData } = useQuery({
    queryKey: ['messageRecipientsList'],
    queryFn: async () => {
      const res = await api.get('/teacher-messages/recipients');
      return res.data?.data || { staff: [], students: [] };
    },
  });

  // Fetch Inbox Messages
  const { data: inboxMessages = [], isLoading: inboxLoading } = useQuery({
    queryKey: ['teacherInboxMessages'],
    queryFn: async () => {
      const res = await api.get('/teacher-messages/inbox');
      return res.data?.data || [];
    },
  });

  // Fetch Sent Messages
  const { data: sentMessages = [], isLoading: sentLoading } = useQuery({
    queryKey: ['teacherSentMessages'],
    queryFn: async () => {
      const res = await api.get('/teacher-messages/sent');
      return res.data?.data || [];
    },
  });

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/teacher-messages', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherInboxMessages'] });
      queryClient.invalidateQueries({ queryKey: ['teacherSentMessages'] });
      setIsComposeModalOpen(false);
      resetForm();
      setNotification({ text: 'Message dispatched successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to send message.', type: 'error' });
    },
  });

  // Mark as Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      return await api.put(`/teacher-messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherInboxMessages'] });
    },
  });

  const resetForm = () => {
    setForm({
      recipientType: 'admin',
      recipientId: '',
      classId: classes[0]?._id || '',
      subject: '',
      body: '',
      sendSmsAlert: false,
    });
  };

  const handleOpenCompose = () => {
    resetForm();
    setIsComposeModalOpen(true);
  };

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    if (activeTab === 'inbox' && !msg.isRead) {
      markReadMutation.mutate(msg._id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.subject || !form.body) {
      setNotification({ text: 'Please provide a subject and message body.', type: 'error' });
      return;
    }

    sendMutation.mutate({
      recipientId: form.recipientType !== 'class_parents' ? form.recipientId : null,
      recipientRole: form.recipientType,
      classId: form.recipientType === 'class_parents' ? form.classId : null,
      subject: form.subject,
      body: form.body,
      sendSmsAlert: form.sendSmsAlert,
    });
  };

  const currentList = activeTab === 'inbox' ? inboxMessages : sentMessages;
  const isCurrentLoading = activeTab === 'inbox' ? inboxLoading : sentLoading;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Teacher Messaging & Parent SMS Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Send internal notes to Headmaster, staff, or broadcast instant SMS alerts to class parents.
          </p>
        </div>

        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Compose New Message
        </button>
      </div>

      {/* ── Notification Feedback ── */}
      {notification.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          {notification.text}
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-2 shadow-xs flex items-center gap-2 w-fit">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'inbox'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Inbox ({inboxMessages.filter((m) => !m.isRead).length} Unread)
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sent'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent Messages ({sentMessages.length})
        </button>
      </div>

      {/* ── Message List Grid ── */}
      {isCurrentLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : currentList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Mail className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Messages in {activeTab === 'inbox' ? 'Inbox' : 'Sent Box'}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Compose New Message" to send a direct message or broadcast an SMS to parents.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {currentList.map((msg) => (
            <div
              key={msg._id}
              onClick={() => handleSelectMessage(msg)}
              className={`p-5 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                activeTab === 'inbox' && !msg.isRead ? 'bg-indigo-50/40 font-bold' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {activeTab === 'inbox' && !msg.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                  <span className="text-xs font-bold text-slate-900">
                    {activeTab === 'inbox'
                      ? `From: ${msg.sender?.email || 'System'}`
                      : `To: ${msg.recipient?.email || msg.recipientRole}`}
                  </span>
                  {msg.class && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      {msg.class.name}
                    </span>
                  )}
                  {msg.sendSmsAlert && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-amber-600" /> SMS Dispatched
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm">{msg.subject}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{msg.body}</p>
              </div>

              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── COMPOSE MESSAGE MODAL ── */}
      {isComposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Compose Message / Parent Notice
              </h3>
              <button onClick={() => setIsComposeModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recipient Group <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.recipientType}
                  onChange={(e) => setForm({ ...form, recipientType: e.target.value, recipientId: '' })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="admin">🏫 Headmaster / Administration</option>
                  <option value="staff">👨‍🏫 Staff Member / Teacher</option>
                  <option value="class_parents">👨‍👩‍👧 All Parents of Class Stream</option>
                </select>
              </div>

              {form.recipientType === 'staff' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Staff Recipient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.recipientId}
                    onChange={(e) => setForm({ ...form, recipientId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">Select Staff</option>
                    {recipientData?.staff?.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.recipientType === 'class_parents' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Class Stream <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Project Submission Reminder"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your message or parent notice here..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                ></textarea>
              </div>

              {/* SMS Dispatch Toggle */}
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    Send Instant Mobile SMS Alert
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Dispatches an immediate SMS alert directly to parent phone numbers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.sendSmsAlert}
                  onChange={(e) => setForm({ ...form, sendSmsAlert: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {sendMutation.isPending ? 'Dispatching...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW MESSAGE DETAILS MODAL ── */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedMessage.subject}</h3>
                <p className="text-xs text-indigo-300">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-1.5 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-slate-500 font-semibold">
                  Sender: <span className="font-bold text-slate-900">{selectedMessage.sender?.email}</span>
                </p>
                {selectedMessage.class && (
                  <p className="text-slate-500 font-semibold">
                    Target Class: <span className="font-bold text-slate-900">{selectedMessage.class?.name}</span>
                  </p>
                )}
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 text-sm">Message Content:</p>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMessagingPage;
