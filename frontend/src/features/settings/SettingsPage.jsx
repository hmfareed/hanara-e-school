import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User as UserIcon,
  Lock,
  Building,
  Users as UsersIcon,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Loader2,
  Phone,
  Calendar,
  Briefcase,
  Home,
  Mail,
  Award
} from 'lucide-react';

const SettingsPage = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'superadmin';

  // State for active tab
  const [activeTab, setActiveTab] = useState('profile');

  // Load fresh user data
  const { data: currentUserData, isLoading: loadingUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.data;
    }
  });

  const staffProfile = currentUserData?.refStaff || {};

  /* ────────────────────────────────────────────────────────
     TAB 1: Profile Form State & Mutations
     ──────────────────────────────────────────────────────── */
  const [profileForm, setProfileForm] = useState({
    title: '',
    photoUrl: '',
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: 'male',
    dob: '',
    phone: '',
    address: '',
    qualification: ''
  });

  const [profileMessage, setProfileMessage] = useState(null);

  // Sync profile details when data loads
  useEffect(() => {
    if (staffProfile) {
      setProfileForm({
        title: staffProfile.title || '',
        photoUrl: staffProfile.photoUrl || '',
        firstName: staffProfile.firstName || '',
        lastName: staffProfile.lastName || '',
        otherNames: staffProfile.otherNames || '',
        gender: staffProfile.gender || 'male',
        dob: staffProfile.dob ? staffProfile.dob.split('T')[0] : '',
        phone: staffProfile.phone || '',
        address: staffProfile.address || '',
        qualification: staffProfile.qualification || ''
      });
    }
  }, [currentUserData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.patch('/auth/me', payload);
    },
    onSuccess: () => {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully! Refreshing view...' });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      refetchUser();
      setTimeout(() => {
        setProfileMessage(null);
        // Reload to sync name on sidebar
        window.location.reload();
      }, 1500);
    },
    onError: (err) => {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    }
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

  const handleProfileGenderChange = (genderVal) => {
    const validTitles = getAvailableTitles(genderVal);
    setProfileForm(prev => ({
      ...prev,
      gender: genderVal,
      title: prev.title && validTitles.includes(prev.title) ? prev.title : ''
    }));
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileMessage(null);
    updateProfileMutation.mutate(profileForm);
  };

  /* ────────────────────────────────────────────────────────
     TAB 2: Password Change State & Mutations
     ──────────────────────────────────────────────────────── */
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordMessage, setPasswordMessage] = useState(null);

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/auth/change-password', payload);
    },
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMessage(null), 3000);
    },
    onError: (err) => {
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    }
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  /* ────────────────────────────────────────────────────────
     TAB 3: School Profile State & Mutations (Superadmin Only)
     ──────────────────────────────────────────────────────── */
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    motto: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    dataProtectionRegistrationNumber: ''
  });
  const [schoolMessage, setSchoolMessage] = useState(null);

  const { data: schoolProfileData, isLoading: loadingSchool } = useQuery({
    queryKey: ['settingsSchoolProfile'],
    queryFn: async () => {
      const res = await api.get('/settings/school-profile');
      return res.data?.data;
    },
    enabled: isSuperAdmin
  });

  useEffect(() => {
    if (schoolProfileData) {
      setSchoolForm({
        name: schoolProfileData.name || '',
        motto: schoolProfileData.motto || '',
        logoUrl: schoolProfileData.logoUrl || '',
        address: schoolProfileData.address || '',
        phone: schoolProfileData.phone || '',
        email: schoolProfileData.email || '',
        dataProtectionRegistrationNumber: schoolProfileData.dataProtectionRegistrationNumber || ''
      });
    }
  }, [schoolProfileData]);

  const updateSchoolMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.patch('/settings/school-profile', payload);
    },
    onSuccess: () => {
      setSchoolMessage({ type: 'success', text: 'School profile updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['settingsSchoolProfile'] });
      setTimeout(() => setSchoolMessage(null), 3000);
    },
    onError: (err) => {
      setSchoolMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update school profile.' });
    }
  });

  const handleSchoolSubmit = (e) => {
    e.preventDefault();
    setSchoolMessage(null);
    updateSchoolMutation.mutate(schoolForm);
  };

  /* ────────────────────────────────────────────────────────
     TAB 4: System Users List & Operations (Superadmin Only)
     ──────────────────────────────────────────────────────── */
  const { data: systemUsersData, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['settingsSystemUsers'],
    queryFn: async () => {
      const res = await api.get('/settings/users');
      return res.data?.data || [];
    },
    enabled: isSuperAdmin
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async (userId) => {
      return await api.patch(`/settings/users/${userId}/toggle-active`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settingsSystemUsers'] });
      refetchUsers();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to toggle user status.');
    }
  });

  /* ────────────────────────────────────────────────────────
     TAB 5: Grading Scales Configuration (Superadmin Only)
     ──────────────────────────────────────────────────────── */
  const [selectedScaleLevel, setSelectedScaleLevel] = useState('Primary');
  const [editingScale, setEditingScale] = useState({
    scaleType: 'descriptive_band',
    caWeight: 30,
    examWeight: 70,
    bands: []
  });
  const [scalesMessage, setScalesMessage] = useState(null);

  const { data: gradingScalesData, isLoading: loadingScales, refetch: refetchScales } = useQuery({
    queryKey: ['settingsGradingScales'],
    queryFn: async () => {
      const res = await api.get('/grading-scales');
      return res.data?.data;
    },
    enabled: isSuperAdmin && activeTab === 'grading-scales'
  });

  useEffect(() => {
    if (gradingScalesData && gradingScalesData[selectedScaleLevel]) {
      const scale = gradingScalesData[selectedScaleLevel];
      setEditingScale({
        scaleType: scale.scaleType || 'descriptive_band',
        caWeight: scale.caWeight ?? 30,
        examWeight: scale.examWeight ?? 70,
        bands: scale.bands ? scale.bands.map(b => ({ ...b })) : []
      });
    }
  }, [gradingScalesData, selectedScaleLevel]);

  const updateScaleMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.patch(`/grading-scales/${selectedScaleLevel}`, payload);
    },
    onSuccess: () => {
      setScalesMessage({ type: 'success', text: `Grading scale for ${selectedScaleLevel} updated successfully!` });
      queryClient.invalidateQueries({ queryKey: ['settingsGradingScales'] });
      setTimeout(() => setScalesMessage(null), 3000);
    },
    onError: (err) => {
      setScalesMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update grading scale.' });
    }
  });

  const handleBandChange = (index, field, value) => {
    setEditingScale(prev => {
      const newBands = [...prev.bands];
      newBands[index] = { 
        ...newBands[index], 
        [field]: field === 'min' || field === 'max' ? Number(value) : value 
      };
      return { ...prev, bands: newBands };
    });
  };

  const handleAddBand = () => {
    setEditingScale(prev => ({
      ...prev,
      bands: [...prev.bands, { min: 0, max: 0, grade: '', label: '' }]
    }));
  };

  const handleRemoveBand = (index) => {
    setEditingScale(prev => ({
      ...prev,
      bands: prev.bands.filter((_, i) => i !== index)
    }));
  };

  const handleScalesSubmit = (e) => {
    e.preventDefault();
    setScalesMessage(null);
    updateScaleMutation.mutate(editingScale);
  };

  /* ────────────────────────────────────────────────────────
     Render Helpers
     ──────────────────────────────────────────────────────── */
  if (loadingUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-emerald-800" size={32} />
      </div>
    );
  }

  const tabClass = (tabId) =>
    `flex items-center space-x-2 py-3 px-5 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer ${
      activeTab === tabId
        ? 'border-emerald-700 text-emerald-700 font-bold bg-emerald-50/40'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`;

  const inputCls =
    'mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm shadow-sm';

  const selectCls =
    'mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm shadow-sm';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage profile credentials, system parameters, and preferences</p>
      </div>

      {/* Tabs list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
          <button onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
            <UserIcon size={16} />
            <span>My Profile</span>
          </button>
          <button onClick={() => setActiveTab('password')} className={tabClass('password')}>
            <Lock size={16} />
            <span>Security</span>
          </button>
          {isSuperAdmin && (
            <>
              <button onClick={() => setActiveTab('school')} className={tabClass('school')}>
                <Building size={16} />
                <span>School Profile</span>
              </button>
              <button onClick={() => setActiveTab('users')} className={tabClass('users')}>
                <UsersIcon size={16} />
                <span>System Accounts</span>
              </button>
              <button onClick={() => setActiveTab('grading-scales')} className={tabClass('grading-scales')}>
                <Award size={16} />
                <span>Grading Scales</span>
              </button>
            </>
          )}
        </div>

        <div className="p-6">
          {/* TAB 1: PROFILE EDIT */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <UserIcon size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Personal Information
                </h3>
              </div>

              {profileMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-start space-x-3 border ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {profileMessage.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Picture Upload Column */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 w-full md:w-48 h-48 bg-slate-50 relative group overflow-hidden">
                  {profileForm.photoUrl ? (
                    <>
                      <img src={profileForm.photoUrl} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, photoUrl: '' }))}
                        className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove Photo
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
                      <label className="cursor-pointer text-xs font-bold text-emerald-800 hover:text-emerald-950 block">
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileForm(prev => ({ ...prev, photoUrl: reader.result }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400 block mt-1">(Optional)</span>
                    </div>
                  )}
                </div>

                {/* Form fields column */}
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Gender *</label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) => handleProfileGenderChange(e.target.value)}
                        className={selectCls}
                        required
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Title *</label>
                      <select
                        value={profileForm.title}
                        onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                        className={selectCls}
                        required
                      >
                        <option value="">Select title</option>
                        {getAvailableTitles(profileForm.gender).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">First Name *</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Last Name *</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Other Names</label>
                      <input
                        type="text"
                        value={profileForm.otherNames}
                        onChange={(e) => setProfileForm({ ...profileForm, otherNames: e.target.value })}
                        className={inputCls}
                        placeholder="e.g. Middle names"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>Phone Number *</span>
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Date of Birth</span>
                      </label>
                      <input
                        type="date"
                        value={profileForm.dob}
                        onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-1.5">
                        <Award size={13} className="text-slate-400" />
                        <span>Qualification</span>
                      </label>
                      <input
                        type="text"
                        value={profileForm.qualification}
                        onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>Email Address (Read-only)</span>
                      </label>
                      <div className="mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm shadow-sm select-all font-mono">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-1.5">
                      <Home size={13} className="text-slate-400" />
                      <span>Residential Address</span>
                    </label>
                    <textarea
                      rows={2}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center space-x-2 py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-xl">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Lock size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Update Account Password
                </h3>
              </div>

              {passwordMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-start space-x-3 border ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {passwordMessage.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className={inputCls}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                      className="absolute inset-y-0 right-0 pr-4 mt-1.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className={inputCls}
                      required
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                      className="absolute inset-y-0 right-0 pr-4 mt-1.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className={inputCls}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                      className="absolute inset-y-0 right-0 pr-4 mt-1.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex items-center space-x-2 py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SCHOOL PROFILE EDIT (Superadmin Only) */}
          {activeTab === 'school' && isSuperAdmin && (
            <form onSubmit={handleSchoolSubmit} className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Building size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  School Profile Configuration
                </h3>
              </div>

              {schoolMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-start space-x-3 border ${
                  schoolMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {schoolMessage.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{schoolMessage.text}</span>
                </div>
              )}

              {loadingSchool ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-emerald-800" size={24} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">School Name *</label>
                      <input
                        type="text"
                        value={schoolForm.name}
                        onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Motto / Tagline</label>
                      <input
                        type="text"
                        value={schoolForm.motto}
                        onChange={(e) => setSchoolForm({ ...schoolForm, motto: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Support Phone Number</label>
                      <input
                        type="text"
                        value={schoolForm.phone}
                        onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Support Email Address</label>
                      <input
                        type="email"
                        value={schoolForm.email}
                        onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Logo URL</label>
                      <input
                        type="text"
                        value={schoolForm.logoUrl}
                        onChange={(e) => setSchoolForm({ ...schoolForm, logoUrl: e.target.value })}
                        className={inputCls}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Data Protection Registration No.</label>
                      <input
                        type="text"
                        value={schoolForm.dataProtectionRegistrationNumber}
                        onChange={(e) => setSchoolForm({ ...schoolForm, dataProtectionRegistrationNumber: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Postal / Physical Address</label>
                    <textarea
                      rows={2}
                      value={schoolForm.address}
                      onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={updateSchoolMutation.isPending}
                      className="flex items-center space-x-2 py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                    >
                      {updateSchoolMutation.isPending ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <Save size={16} />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* TAB 4: SYSTEM USER MANAGEMENT (Superadmin Only) */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <UsersIcon size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Active User Accounts
                </h3>
              </div>

              {loadingUsers ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-emerald-800" size={24} />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none">
                        <th className="py-4 px-6">User / Role</th>
                        <th className="py-4 px-6">System ID</th>
                        <th className="py-4 px-6">Approval Status</th>
                        <th className="py-4 px-6 text-center">Account Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemUsersData.length > 0 ? (
                        systemUsersData.map((usr) => {
                          const staff = usr.refStaff || {};
                          const titleName = staff.title ? `${staff.title} ` : '';
                          const staffName = staff.firstName ? `${titleName}${staff.firstName} ${staff.lastName}` : 'No Staff Linked';
                          const isSelf = usr._id.toString() === user?.id;

                          return (
                            <tr key={usr._id} className="hover:bg-slate-50/20">
                              <td className="py-4 px-6">
                                <div className="font-semibold text-slate-800">
                                  {staffName} {isSelf && <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded-md ml-1 font-bold">Self</span>}
                                </div>
                                <div className="text-slate-400 text-xs font-mono">{usr.email}</div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-xs inline-block bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded font-bold capitalize select-all">
                                  {usr.role === 'superadmin' ? 'headteacher' : usr.role}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold capitalize border ${
                                  usr.approvalStatus === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : usr.approvalStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                  {usr.approvalStatus}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    disabled={isSelf || toggleUserActiveMutation.isPending}
                                    onClick={() => toggleUserActiveMutation.mutate(usr._id)}
                                    title={isSelf ? 'Cannot deactivate self' : `Toggle Active Status`}
                                    className={`focus:outline-none transition flex items-center justify-center ${
                                      isSelf ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                                    }`}
                                  >
                                    {usr.isActive ? (
                                      <div className="flex items-center space-x-1.5 text-emerald-700">
                                        <ToggleRight size={26} className="fill-emerald-100" />
                                        <span className="text-xs font-bold font-sans">Active</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-1.5 text-slate-400">
                                        <ToggleLeft size={26} className="fill-slate-50" />
                                        <span className="text-xs font-bold font-sans text-slate-400">Blocked</span>
                                      </div>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No users registered in the system.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GRADING SCALES (Superadmin Only) */}
          {activeTab === 'grading-scales' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Award size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Grading Scales & Score Bands
                </h3>
              </div>

              {scalesMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-start space-x-3 border ${
                  scalesMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {scalesMessage.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{scalesMessage.text}</span>
                </div>
              )}

              {/* Level Selector tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit space-x-1 select-none">
                {['Nursery', 'KG', 'Primary', 'JHS'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedScaleLevel(cat)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedScaleLevel === cat
                        ? 'bg-white text-emerald-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingScales ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-emerald-800" size={24} />
                </div>
              ) : (
                <form onSubmit={handleScalesSubmit} className="space-y-6">
                  {/* General Configs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Scale Evaluation Type</label>
                      <select
                        value={editingScale.scaleType}
                        onChange={(e) => setEditingScale({ ...editingScale, scaleType: e.target.value })}
                        className={selectCls}
                      >
                        <option value="descriptive_band">Descriptive Band (Letters/Labels)</option>
                        <option value="waec_9point">WAEC 9-Point Scale (JHS Numbers)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Continuous Assessment (CA) Weight %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editingScale.caWeight}
                        onChange={(e) => setEditingScale({ ...editingScale, caWeight: Number(e.target.value) })}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Examination Weight %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editingScale.examWeight}
                        onChange={(e) => setEditingScale({ ...editingScale, examWeight: Number(e.target.value) })}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  {/* Bands Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                        Grading Bands & Ranges
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddBand}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
                      >
                        + Add New Band
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs text-slate-600 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4 w-28">Min Score</th>
                            <th className="py-3 px-4 w-28">Max Score</th>
                            <th className="py-3 px-4 w-32">Grade Code</th>
                            <th className="py-3 px-4">Description / Remarks</th>
                            <th className="py-3 px-4 text-center w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {editingScale.bands.length > 0 ? (
                            editingScale.bands.map((band, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/10">
                                <td className="py-2.5 px-4">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={band.min}
                                    onChange={(e) => handleBandChange(idx, 'min', e.target.value)}
                                    className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-800"
                                    required
                                  />
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={band.max}
                                    onChange={(e) => handleBandChange(idx, 'max', e.target.value)}
                                    className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-800"
                                    required
                                  />
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="text"
                                    value={band.grade}
                                    onChange={(e) => handleBandChange(idx, 'grade', e.target.value)}
                                    placeholder="e.g. A, 1, EX"
                                    className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800 font-bold uppercase text-center"
                                    required
                                  />
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="text"
                                    value={band.label}
                                    onChange={(e) => handleBandChange(idx, 'label', e.target.value)}
                                    placeholder="e.g. Excellent, Very Good"
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800"
                                    required
                                  />
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBand(idx)}
                                    className="text-red-600 hover:text-red-900 font-semibold transition cursor-pointer text-xs animate-pulse"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                                No grading bands defined yet. Click '+ Add New Band' to configure.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={updateScaleMutation.isPending}
                      className="flex items-center space-x-2 py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
                    >
                      {updateScaleMutation.isPending ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <Save size={16} />
                      )}
                      <span>Save Grading Scale</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
