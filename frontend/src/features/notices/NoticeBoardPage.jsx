import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Pin, Calendar, MapPin, Send, Plus, Trash2, CheckCircle2,
  AlertTriangle, Filter, Sparkles, X, Megaphone, User, Clock,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const NoticeBoardPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    targetAudience: 'all',
    eventDate: '',
    location: '',
    isPinned: false,
    sendSmsBroadcast: false,
  });

  // Query Notices
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['noticesList', selectedCategory],
    queryFn: async () => {
      const param = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const res = await api.get(`/notices${param}`);
      return res.data?.data || [];
    },
  });

  // Create Notice Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/notices', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setNotification({ text: data?.message || 'Notice published successfully!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['noticesList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setShowAddModal(false);
      setFormData({
        title: '', content: '', category: 'general', targetAudience: 'all',
        eventDate: '', location: '', isPinned: false, sendSmsBroadcast: false,
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to post notice', type: 'error' });
    },
  });

  // Delete Notice Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notices/${id}`);
    },
    onSuccess: () => {
      setNotification({ text: 'Notice removed', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['noticesList'] });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setNotification({ text: 'Title and content are required', type: 'error' });
      return;
    }
    createMutation.mutate(formData);
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'academic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'financial':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'event':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone size={28} className="text-emerald-700" />
            <span>School Notice Board &amp; Event Calendar</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official announcements, term calendar events, and emergency alerts.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Post Announcement / Notice</span>
          </button>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between animate-in fade-in duration-150 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Category Filter Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">Filter:</span>
        {['all', 'urgent', 'event', 'academic', 'financial', 'general'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-950 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notice Cards List */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
        </div>
      ) : notices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notices.map((notice) => (
            <div
              key={notice._id}
              className={`bg-white border rounded-2xl p-6 shadow-xs relative flex flex-col justify-between transition-all ${
                notice.isPinned ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-extrabold uppercase ${getCategoryBadge(notice.category)}`}>
                      {notice.category}
                    </span>
                    {notice.targetAudience !== 'all' && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 capitalize">
                        Audience: {notice.targetAudience}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {notice.isPinned && (
                      <span className="inline-flex items-center space-x-1 text-amber-700 font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        <Pin size={10} />
                        <span>Pinned</span>
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this notice?')) deleteMutation.mutate(notice._id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-2">{notice.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{notice.content}</p>

                {/* Optional Event Details */}
                {(notice.eventDate || notice.location) && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    {notice.eventDate && (
                      <div className="flex items-center space-x-2 font-bold text-emerald-800">
                        <Calendar size={14} />
                        <span>Date: {new Date(notice.eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                    {notice.location && (
                      <div className="flex items-center space-x-2 font-medium text-slate-600">
                        <MapPin size={14} />
                        <span>Venue: {notice.location}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <div className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>Posted {new Date(notice.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                {notice.smsBroadcastSent && (
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                    <Send size={10} />
                    <span>SMS Sent ({notice.smsRecipientCount})</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 space-y-2">
          <Bell size={36} className="mx-auto text-slate-300" />
          <p className="font-bold text-sm">No notices posted in this category.</p>
        </div>
      )}

      {/* Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Megaphone size={20} className="text-emerald-400" />
                <h3 className="font-bold text-base">Publish School Notice / Event</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Important Parent-Teacher Association (PTA) Meeting"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent Alert</option>
                    <option value="event">Term Event</option>
                    <option value="academic">Academic</option>
                    <option value="financial">Financial / Fees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
                  >
                    <option value="all">Everyone (All)</option>
                    <option value="parents">Parents Only</option>
                    <option value="teachers">Teachers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type official notice details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Venue / Location (Optional)</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. School Main Hall"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendSmsBroadcast}
                    onChange={(e) => setFormData({ ...formData, sendSmsBroadcast: e.target.checked })}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                    <Send size={12} />
                    <span>Broadcast as SMS Alert to Target Audience</span>
                  </span>
                </label>
                <p className="text-[11px] text-emerald-800">
                  Sends an instant SMS text alert to all parents/teachers registered in the target audience.
                </p>
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
                  {createMutation.isPending ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoardPage;
