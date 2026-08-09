import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  CheckCircle,
  AlertCircle,
  Camera,
  Trash2,
  Phone,
  Calendar,
  Award,
  Home,
  Save,
  Loader2
} from 'lucide-react';

const AccountantProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Profile Form State
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

  // Password Form State
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Preferences State
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('accountant_prefs');
      return saved ? JSON.parse(saved) : { audioAlerts: true, toastAlerts: true };
    } catch {
      return { audioAlerts: true, toastAlerts: true };
    }
  });

  // Sync profile details when user data is loaded/changed
  useEffect(() => {
    if (user?.refStaff) {
      setProfileForm({
        title: user.refStaff.title || '',
        photoUrl: user.refStaff.photoUrl || '',
        firstName: user.refStaff.firstName || '',
        lastName: user.refStaff.lastName || '',
        otherNames: user.refStaff.otherNames || '',
        gender: user.refStaff.gender || 'male',
        dob: user.refStaff.dob ? user.refStaff.dob.split('T')[0] : '',
        phone: user.refStaff.phone || '',
        address: user.refStaff.address || '',
        qualification: user.refStaff.qualification || ''
      });
    }
  }, [user]);

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

  const handlePrefChange = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('accountant_prefs', JSON.stringify(next));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.patch('/auth/me', profileForm);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await refreshUser();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.patch('/auth/me', {
        password: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password. Please verify current password.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (tabId) =>
    `flex items-center gap-2 py-3 px-5 border-b-2 font-semibold text-sm transition-all duration-200 cursor-pointer ${
      activeTab === tabId
        ? 'border-teal-600 text-teal-600 font-bold bg-teal-50/40'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`;

  const inputCls =
    'mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm shadow-sm';

  const selectCls =
    'mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm shadow-sm';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your personal information, credentials, and settings</p>
      </div>

      {/* Tabs Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          <button onClick={() => { setActiveTab('profile'); setMessage({ type: '', text: '' }); }} className={tabClass('profile')}>
            <User size={16} />
            <span>My Profile</span>
          </button>
          <button onClick={() => { setActiveTab('security'); setMessage({ type: '', text: '' }); }} className={tabClass('security')}>
            <Key size={16} />
            <span>Security & Password</span>
          </button>
          <button onClick={() => { setActiveTab('preferences'); setMessage({ type: '', text: '' }); }} className={tabClass('preferences')}>
            <Bell size={16} />
            <span>Preferences</span>
          </button>
        </div>

        <div className="p-6">
          {message.text && (
            <div className={`p-4 mb-6 rounded-xl flex items-center gap-2.5 text-xs font-bold border ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {message.text}
            </div>
          )}

          {/* TAB 1: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                
                {/* Profile Photo Upload Section */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Photo</span>
                  <div className="relative group w-40 h-40 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                    {profileForm.photoUrl ? (
                      <>
                        <img src={profileForm.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <label className="cursor-pointer text-[10px] font-black uppercase text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 rounded-lg shadow-sm">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
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
                          <button
                            type="button"
                            onClick={() => setProfileForm(prev => ({ ...prev, photoUrl: '' }))}
                            className="text-[10px] font-black uppercase text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                        <label className="cursor-pointer text-xs font-bold text-teal-600 hover:text-teal-800 block">
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
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
                        <span className="text-[9px] text-slate-400 block mt-1">(JPG, PNG max 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fields Section */}
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Gender *</label>
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
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Title *</label>
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
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">First Name *</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Last Name *</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Other Names</label>
                      <input
                        type="text"
                        value={profileForm.otherNames}
                        onChange={(e) => setProfileForm({ ...profileForm, otherNames: e.target.value })}
                        className={inputCls}
                        placeholder="Middle names"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
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
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={12} className="text-slate-400" />
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
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" />
                        <span>Email (Read-only)</span>
                      </label>
                      <div className="mt-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold select-all font-mono">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Home size={12} className="text-slate-400" />
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

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-teal-500/10"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Key size={16} className="text-teal-600" />
                Change Password
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all cursor-pointer shadow-md"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Bell size={16} className="text-teal-600" />
                Notification Preferences
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Toast Notifications</p>
                    <p className="text-[10px] text-slate-400">Show visual alerts in bottom right when new registers arrive</p>
                  </div>
                  <button
                    onClick={() => handlePrefChange('toastAlerts')}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${prefs.toastAlerts ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${prefs.toastAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Audio Alerts</p>
                    <p className="text-[10px] text-slate-400">Play a subtle alert tone when new submissions arrive</p>
                  </div>
                  <button
                    onClick={() => handlePrefChange('audioAlerts')}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${prefs.audioAlerts ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${prefs.audioAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountantProfilePage;
