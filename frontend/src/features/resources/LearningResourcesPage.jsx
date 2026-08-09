import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FolderOpen,
  Plus,
  FileText,
  FileCode,
  Link,
  BookOpen,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  HelpCircle,
} from 'lucide-react';

const LearningResourcesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ text: '', type: '' });

  // Form State
  const [form, setForm] = useState({
    title: '',
    classId: '',
    subjectId: '',
    resourceType: 'pdf',
    url: '',
    description: '',
  });

  // Fetch Teacher Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['myTeacherClassesList'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Fetch Learning Resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['learningResourcesList', selectedClass, selectedType],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedType) params.resourceType = selectedType;
      const res = await api.get('/learning-resources', { params });
      return res.data?.data || [];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/learning-resources', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningResourcesList'] });
      setIsModalOpen(false);
      resetForm();
      setNotification({ text: 'Resource shared successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to share resource.', type: 'error' });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/learning-resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningResourcesList'] });
      setNotification({ text: 'Resource deleted.', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
  });

  const resetForm = () => {
    setForm({
      title: '',
      classId: classes[0]?._id || '',
      subjectId: '',
      resourceType: 'pdf',
      url: '',
      description: '',
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.classId || !form.url) {
      setNotification({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    createMutation.mutate({
      title: form.title,
      classId: form.classId,
      subjectId: form.subjectId || (classes[0] ? classes[0]._id : null),
      resourceType: form.resourceType,
      url: form.url,
      description: form.description,
    });
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-rose-500" />;
      case 'link':
        return <Link className="w-6 h-6 text-indigo-500" />;
      case 'past_question':
        return <HelpCircle className="w-6 h-6 text-amber-500" />;
      case 'syllabus':
        return <BookOpen className="w-6 h-6 text-emerald-500" />;
      default:
        return <FileCode className="w-6 h-6 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-600" />
            Learning Resources & Study Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Share PDFs, study guides, past questions, syllabi, and reference links with your classes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Share New Resource
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

      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
          >
            <option value="">All Resource Types</option>
            <option value="pdf">PDF Document</option>
            <option value="link">External Website Link</option>
            <option value="past_question">BECE / WAEC Past Questions</option>
            <option value="syllabus">Subject Syllabus</option>
            <option value="document">General Document</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-xs font-bold text-slate-400">
          {resources.length} Resources Vaulted
        </div>
      </div>

      {/* ── Resources Grid ── */}
      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : resources.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Resources Shared Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Share New Resource" to upload study materials, past questions, or reference links.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div
              key={res._id}
              className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {getResourceIcon(res.resourceType)}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(res._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                      {res.class?.name || 'Class'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      {res.subject?.name || 'Subject'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{res.title}</h3>
                  {res.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Shared: {new Date(res.createdAt).toLocaleDateString()}</span>
                  <span className="capitalize font-semibold">{res.resourceType.replace('_', ' ')}</span>
                </p>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open / Access Resource
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SHARE RESOURCE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                Share Learning Resource
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resource Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BECE 2024 Science Past Questions PDF"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Class <span className="text-rose-500">*</span>
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Resource Type</label>
                  <select
                    value={form.resourceType}
                    onChange={(e) => setForm({ ...form, resourceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="link">External Website Link</option>
                    <option value="past_question">Past Question Paper</option>
                    <option value="syllabus">Subject Syllabus</option>
                    <option value="document">Word / Excel File</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resource URL / Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://..."
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Instructions for students regarding this document..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {createMutation.isPending ? 'Saving...' : 'Share Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningResourcesPage;
