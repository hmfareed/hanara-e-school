import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';

const StaffFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    photoUrl: null,
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: 'male',
    dob: '',
    phone: '',
    email: '',
    address: '',
    qualification: '',
    employmentDate: '',
    employmentStatus: 'active',
    role: 'teacher',
    createUserAccount: true,
    password: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  const { isLoading: loadingStaff } = useQuery({
    queryKey: ['staffProfile', id],
    queryFn: async () => {
      const res = await api.get(`/staff/${id}`);
      const data = res.data?.data;
      if (data) {
        setFormData({
          ...data,
          title: data.title || '',
          photoUrl: data.photoUrl || null,
          dob: data.dob ? data.dob.split('T')[0] : '',
          employmentDate: data.employmentDate ? data.employmentDate.split('T')[0] : '',
          createUserAccount: false,
          password: '',
        });
      }
      return data;
    },
    enabled: isEdit,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return await api.patch(`/staff/${id}`, payload);
      } else {
        return await api.post('/staff', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['staffProfile', id] });
      }
      navigate('/staff');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || 'Failed to save staff member.');
    },
  });

  const getAvailableTitles = (gender) => {
    if (gender === 'male') {
      return ['Mr', 'Sir', 'Rev', 'Doc', 'Prof'];
    }
    if (gender === 'female') {
      return ['Miss', 'Mrs', 'Ms', 'Rev', 'Doc', 'Prof'];
    }
    return ['Mr', 'Mrs', 'Miss', 'Ms', 'Sir', 'Rev', 'Doc', 'Prof'];
  };

  const handleGenderChange = (genderVal) => {
    const validTitles = getAvailableTitles(genderVal);
    setFormData((prev) => ({
      ...prev,
      gender: genderVal,
      title: prev.title && validTitles.includes(prev.title) ? prev.title : '',
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const payload = {
      ...formData,
      dob: formData.dob ? new Date(formData.dob).toISOString() : null,
      employmentDate: formData.employmentDate ? new Date(formData.employmentDate).toISOString() : null,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && loadingStaff) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-emerald-800" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/staff" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit Staff Profile' : 'Add Staff Member'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEdit ? 'Update details for ' + formData.firstName : 'Configure new employee profile and system roles'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Personal Information
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture Upload Section */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 w-full md:w-48 h-48 bg-slate-50 relative group overflow-hidden">
              {formData.photoUrl ? (
                <>
                  <img src={formData.photoUrl} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photoUrl: null }))}
                    className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove Photo
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <User size={32} className="mx-auto text-slate-300 mb-2" />
                  <label className="cursor-pointer text-xs font-bold text-emerald-800 hover:text-emerald-950 block">
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-slate-400 block mt-1">(Optional)</span>
                </div>
              )}
            </div>

            {/* Input fields panel */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Title <span className="text-red-500">*</span></label>
                  <select
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                    required
                  >
                    <option value="">Select</option>
                    {getAvailableTitles(formData.gender).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Other Names</label>
                  <input
                    type="text"
                    value={formData.otherNames}
                    onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleGenderChange(e.target.value)}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Home Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Employment & System Role
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Employment Date</label>
              <input
                type="date"
                value={formData.employmentDate}
                onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Employment Status <span className="text-red-500">*</span></label>
              <select
                value={formData.employmentStatus}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">System Role <span className="text-red-500">*</span></label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
                <option value="accountant">Accountant / Bursar</option>
                <option value="driver">Bus Driver</option>
                <option value="support">Support Staff</option>
                <option value="cleaner">School Cleaner / Cook</option>
              </select>
            </div>
          </div>


        </div>

        {!isEdit && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              System Access Account
            </h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="createUserAccount"
                checked={formData.createUserAccount}
                onChange={(e) => setFormData({ ...formData, createUserAccount: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <label htmlFor="createUserAccount" className="text-sm font-semibold text-slate-700">
                Create user login account automatically
              </label>
            </div>

            {formData.createUserAccount && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Login Password</label>
                  <input
                    type="password"
                    placeholder="Auto-default: e.g. Hanara@2026"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Link
            to="/staff"
            className="py-2.5 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-sm text-slate-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center space-x-2 py-2.5 px-6 rounded-xl text-white font-bold bg-[#116a4c] hover:bg-[#0b4f38] focus:outline-none disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-md shadow-emerald-950/10 font-sans"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Staff</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffFormPage;
