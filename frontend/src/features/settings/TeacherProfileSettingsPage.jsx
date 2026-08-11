import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  ShieldCheck,
  KeyRound,
  DollarSign,
} from 'lucide-react';

const TeacherProfileSettingsPage = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [notification, setNotification] = useState({ text: '', type: '' });
  const [photoPreview, setPhotoPreview] = useState(null);

  // Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    photoUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch Teacher Profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['teacherProfileSettings'],
    queryFn: async () => {
      const res = await api.get('/teachers/profile');
      return res.data?.data || null;
    },
  });

  useEffect(() => {
    if (profileData) {
      setForm((prev) => ({
        ...prev,
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        photoUrl: profileData.photoUrl || '',
      }));
      setPhotoPreview(profileData.photoUrl || null);
    }
  }, [profileData]);

  // Helper to compress uploaded images via Canvas
  const compressImage = (file, maxWidth = 500, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const elem = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = elem.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Handle Photo Upload File Conversion with Auto Compression
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 500, 0.8);
        setPhotoPreview(compressedBase64);
        setForm((prev) => ({ ...prev, photoUrl: compressedBase64 }));
      } catch (err) {
        console.error('Failed to compress image:', err);
        setNotification({ text: 'Failed to process image file.', type: 'error' });
      }
    }
  };

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.put('/teachers/profile/update', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['teacherProfileSettings'] });
      queryClient.invalidateQueries({ queryKey: ['teacherDashboardSummary'] });
      
      const newPhotoUrl = res.data?.data?.photoUrl || form.photoUrl;
      const newName = res.data?.data?.fullName || `${form.firstName} ${form.lastName}`.trim();

      if (user && setUser) {
        const updatedUser = {
          ...user,
          name: newName,
          fullName: newName,
          firstName: form.firstName,
          lastName: form.lastName,
          photoUrl: newPhotoUrl,
          refStaff: user.refStaff
            ? { ...user.refStaff, photoUrl: newPhotoUrl, firstName: form.firstName, lastName: form.lastName }
            : { photoUrl: newPhotoUrl, firstName: form.firstName, lastName: form.lastName },
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setNotification({ text: res.data?.message || 'Profile settings updated successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to update profile settings.', type: 'error' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.newPassword) {
      if (!form.currentPassword) {
        setNotification({ text: 'Please enter your current password to make password changes.', type: 'error' });
        return;
      }
      if (form.newPassword.length < 6) {
        setNotification({ text: 'New password must be at least 6 characters long.', type: 'error' });
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setNotification({ text: 'New passwords do not match.', type: 'error' });
        return;
      }
    }

    updateMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      photoUrl: form.photoUrl,
      currentPassword: form.currentPassword || undefined,
      newPassword: form.newPassword || undefined,
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* ── Top Bar Hero ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-600" />
            Teacher Account Settings & Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update your personal details, email address, profile picture, and account password.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 self-start sm:self-center disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile Changes
        </button>
      </div>

      {/* ── Feedback Notification ── */}
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

      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── SECTION 1: Profile Photo & Basic Identity ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Profile Photo & Personal Identity
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Photo Avatar */}
              <div className="relative group">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile Avatar"
                    className="w-24 h-24 rounded-3xl object-cover border-2 border-indigo-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-3xl border-2 border-indigo-200">
                    {form.firstName ? form.firstName.charAt(0) : 'T'}
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-extrabold text-slate-900 text-base">
                  {form.firstName} {form.lastName}
                </h4>
                <p className="text-xs text-slate-500 font-mono">{form.email}</p>
                <p className="text-[11px] text-indigo-600 font-semibold pt-1">
                  Click camera icon to upload a new profile picture (Max 5MB JPG/PNG)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Email & Contact Info ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Account Email Address
            </h3>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This email address is used for portal logins and system notifications.
              </p>
            </div>
          </div>

          {/* ── SECTION 3: Salary & Compensation (Admin Configured) ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Salary &amp; Official Compensation Structure
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Configured Monthly Base Salary</span>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">
                  {(profileData?.baseSalary || 1800).toFixed(2)} <span className="text-xs font-bold text-emerald-700">GHS</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Your monthly base salary is configured by school administration and used during automated monthly payroll runs.
                </p>
              </div>
              <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                Official Staff Salary
              </span>
            </div>
          </div>

          {/* ── SECTION 3: Change Password ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Security & Password Update
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password to verify"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Profile Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TeacherProfileSettingsPage;
