import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import api from '../../services/api';
import {
  LogIn, Eye, EyeOff, AlertCircle, UserPlus, CheckCircle2,
  ChevronLeft, User,
} from 'lucide-react';

/* ─── tiny step indicator ─── */
const StepDot = ({ active, done, label }) => (
  <div className="flex flex-col items-center space-y-1">
    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
      done  ? 'bg-emerald-700 border-emerald-700 text-white'
            : active ? 'border-emerald-700 text-emerald-700 bg-white'
            : 'border-slate-300 text-slate-400 bg-white'
    }`}>
      {done ? <CheckCircle2 size={14} /> : label}
    </div>
  </div>
);

/* ─── field wrapper ─── */
const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition";
const selectCls = `${inputCls}`;

/* ═══════════════════════════════════════════════════════════════════ */

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';

  // ── view: 'login' | 'register'
  const [view, setView] = useState('login');
  // ── registration step: 1 | 2 | 3
  const [step, setStep] = useState(1);

  /* ──── Login state ──── */
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ──── Register state ──── */
  const emptyReg = {
    title: '', firstName: '', lastName: '', otherNames: '',
    gender: '', dob: '', phone: '',
    email: '', password: '', confirmPassword: '',
    role: 'teacher', qualification: '',
    registrationCode: '', // 6-digit secret code from superadmin
  };
  const [reg, setReg]         = useState(emptyReg);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showRegPwd, setShowRegPwd]   = useState(false);

  const maxSteps = 2;

  /* ──── No class/subject data needed in registration ──── */

  useEffect(() => { if (user) navigate(from, { replace: true }); }, [user, navigate, from]);

  /* ──── Login submit ──── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setLoginError('Please fill in all fields'); return; }
    setLoginError('');
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.success) navigate(from, { replace: true });
    else setLoginError(res.message || 'Invalid login credentials');
  };

  /* ──── Reg helpers ──── */
  const setR = (key, val) => setReg((p) => ({ ...p, [key]: val }));

  const handleRoleChange = (roleVal) => {
    setR('role', roleVal);
  };

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
    setReg((prev) => ({
      ...prev,
      gender: genderVal,
      title: prev.title && validTitles.includes(prev.title) ? prev.title : '',
    }));
  };

  const validateStep1 = () => {
    if (!reg.title)            return 'Please select a title.';
    if (!reg.firstName.trim()) return 'First name is required.';
    if (!reg.lastName.trim())  return 'Last name is required.';
    if (!reg.gender)           return 'Please select a gender.';
    if (!reg.phone.trim())     return 'Phone number is required.';
    return null;
  };

  const validateStep2 = () => {
    if (!reg.email.trim()) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(reg.email)) return 'Enter a valid email address.';
    if (!reg.password) return 'Password is required.';
    if (reg.password.length < 6) return 'Password must be at least 6 characters.';
    if (reg.password !== reg.confirmPassword) return 'Passwords do not match.';
    if (!reg.registrationCode.trim()) return 'A registration code is required. Please request one from the school administrator.';
    if (!/^\d{6}$/.test(reg.registrationCode.trim())) return 'The registration code must be exactly 6 digits.';
    return null;
  };



  const goNext = () => {
    setRegError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setRegError(err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setRegError(err); return; }
    }
    if (step < maxSteps) {
      setStep((s) => s + 1);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');

    // Pre-submission validation checks
    const err1 = validateStep1();
    if (err1) { setRegError(err1); setStep(1); return; }

    const err2 = validateStep2();
    if (err2) { setRegError(err2); setStep(2); return; }

    setRegistering(true);
    try {
      const payload = {
        title:            reg.title,
        firstName:        reg.firstName.trim(),
        lastName:         reg.lastName.trim(),
        otherNames:       reg.otherNames.trim(),
        gender:           reg.gender,
        dob:              reg.dob || undefined,
        phone:            reg.phone.trim(),
        email:            reg.email.trim().toLowerCase(),
        password:         reg.password,
        role:             reg.role,
        qualification:    reg.qualification.trim(),
        registrationCode: reg.registrationCode.trim(),
      };
      const res = await api.post('/auth/register-teacher', payload);
      if (res.data?.success) {
        setRegSuccess(res.data.message || 'Registration successful! Your account is pending headteacher approval.');
        setReg(emptyReg);
        setStep(1);
      } else {
        setRegError(res.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setRegError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const switchToLogin = () => { setView('login'); setRegSuccess(''); setRegError(''); setStep(1); };
  const switchToRegister = () => { setView('register'); setLoginError(''); };

  /* ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-950 text-white flex-col justify-between p-12 relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-800/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/20 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3" />

        <div className="flex items-center space-x-3 z-10">
          <div className="h-10 w-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">H</div>
          <span className="font-bold text-xl tracking-wider uppercase text-slate-100">HANARA SCHOOLS</span>
        </div>

        <div className="my-auto space-y-6 z-10 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-100">
            {view === 'register'
              ? 'Join the HANARA Teaching Team.'
              : "Empowering Minds, Shaping Ghana\u2019s Future."}
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            {view === 'register'
              ? 'Register your profile to get access to the school management portal. Your account will be active immediately after registration.'
              : 'Welcome to the HANARA Schools Management System. Administer admissions, coordinate classes, record attendance, and monitor school progress securely.'}
          </p>

          {/* decorative stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[['Students', '800+'], ['Teachers', '60+'], ['Classes', '30+']].map(([k, v]) => (
              <div key={k} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-2xl font-extrabold text-emerald-300">{v}</p>
                <p className="text-xs text-slate-400 mt-1">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 z-10">© 2026 HANARA Schools. All rights reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6 py-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 bg-emerald-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">H</div>
            <span className="font-bold text-lg tracking-wider uppercase text-slate-800">HANARA SCHOOLS</span>
          </div>

          {/* ════════ LOGIN VIEW ════════ */}
          {view === 'login' && (
            <>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign In</h2>
                <p className="mt-1 text-sm text-slate-500">Enter your credentials to access the portal</p>
              </div>

              {loginError && (
                <div className="flex items-center space-x-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <Field label="Email Address">
                  <input
                    id="email" type="email" required disabled={submitting}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hanaraschools.edu.gh"
                    className={inputCls}
                  />
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <input
                      id="password" type={showPwd ? 'text' : 'password'} required disabled={submitting}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-12`}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white font-bold bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 transition cursor-pointer text-sm shadow-md shadow-emerald-950/10">
                  {submitting
                    ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <><LogIn size={18} /><span>Sign In</span></>}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-500">New to HANARA? Are you a teacher or staff member?</p>
                <button onClick={switchToRegister}
                  className="mt-2 inline-flex items-center space-x-1.5 text-emerald-700 font-bold text-sm hover:text-emerald-900 transition cursor-pointer">
                  <UserPlus size={15} />
                  <span>Register your staff account</span>
                </button>
              </div>
            </>
          )}

          {/* ════════ REGISTER VIEW ════════ */}
          {view === 'register' && (
            <>
              <div className="flex items-center space-x-3">
                <button onClick={switchToLogin}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer">
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Staff Registration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Complete all {maxSteps} steps to create your account</p>
                </div>
              </div>

              {/* Step indicators */}
              <div className="flex items-center space-x-2">
                {[
                  { n: 1, label: 'Personal Info', icon: <User size={12} /> },
                  { n: 2, label: 'Account Setup', icon: <LogIn size={12} /> },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.n}>
                    <div className="flex flex-col items-center space-y-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        step > s.n  ? 'bg-emerald-700 border-emerald-700 text-white'
                                    : step === s.n ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                                    : 'border-slate-200 text-slate-400 bg-white'
                      }`}>
                        {step > s.n ? <CheckCircle2 size={14} /> : s.n}
                      </div>
                      <span className={`text-[10px] font-semibold ${step === s.n ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 rounded-full transition-all ${step > s.n ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Errors / Success */}
              {regError && (
                <div className="flex items-start space-x-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={17} className="flex-shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}
              {regSuccess && (
                <div className="flex items-start space-x-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <CheckCircle2 size={17} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Registration Submitted!</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{regSuccess}</p>
                    <p className="text-xs mt-1.5 text-emerald-700 font-semibold">
                      ⏳ Your account is awaiting headteacher approval. You will be able to sign in once approved.
                    </p>
                    <button onClick={switchToLogin} className="mt-2 font-bold underline text-emerald-700 cursor-pointer text-xs">
                      Back to Sign In →
                    </button>
                  </div>
                </div>
              )}

              {!regSuccess && (
                <form onSubmit={handleRegister} className="space-y-5">

                  {/* ─── STEP 1: Personal Info ─── */}
                  {step === 1 && (
                    <div className="space-y-4">
                      {/* Gender first so title options update */}
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Gender *">
                          <select value={reg.gender} onChange={(e) => handleGenderChange(e.target.value)} className={selectCls} required>
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </Field>
                        <Field label="Title *">
                          <select
                            value={reg.title}
                            onChange={(e) => setR('title', e.target.value)}
                            className={selectCls}
                            required
                          >
                            <option value="">Select title</option>
                            {getAvailableTitles(reg.gender).map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="First Name *">
                          <input type="text" required value={reg.firstName}
                            onChange={(e) => setR('firstName', e.target.value)}
                            placeholder="e.g. Abena" className={inputCls} />
                        </Field>
                        <Field label="Last Name *">
                          <input type="text" required value={reg.lastName}
                            onChange={(e) => setR('lastName', e.target.value)}
                            placeholder="e.g. Mensah" className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Other Names">
                        <input type="text" value={reg.otherNames}
                          onChange={(e) => setR('otherNames', e.target.value)}
                          placeholder="Middle name (optional)" className={inputCls} />
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Date of Birth">
                          <input type="date" value={reg.dob}
                            onChange={(e) => setR('dob', e.target.value)}
                            className={inputCls} />
                        </Field>
                        <Field label="Phone Number *">
                          <input type="tel" value={reg.phone}
                            onChange={(e) => setR('phone', e.target.value)}
                            placeholder="e.g. 024 000 0000" className={inputCls} />
                        </Field>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Qualification">
                          <input type="text" value={reg.qualification}
                            onChange={(e) => setR('qualification', e.target.value)}
                            placeholder="e.g. B.Ed., PGDE" className={inputCls} />
                        </Field>
                      </div>


                      <Field label="Staff Role *">
                        <select value={reg.role} onChange={(e) => handleRoleChange(e.target.value)} className={selectCls} required>
                          <option value="teacher">Teacher</option>
                          <option value="accountant">Accountant</option>
                          <option value="support">Support Staff</option>
                          <option value="driver">Driver</option>
                          <option value="cleaner">School Cleaner / Cook</option>
                        </select>
                      </Field>
                    </div>
                  )}

                  {/* ─── STEP 2: Account Setup ─── */}
                  {step === 2 && (
                    <div className="space-y-4">
                      {/*
                        Anti-autofill honeypots: browsers fill these invisible fields
                        instead of our real inputs, preventing saved credentials injection.
                      */}
                      <input type="email" name="prevent-autofill-email" aria-hidden="true"
                        tabIndex={-1} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', height: 0 }}
                        autoComplete="email" readOnly />
                      <input type="password" name="prevent-autofill-password" aria-hidden="true"
                        tabIndex={-1} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', height: 0 }}
                        autoComplete="current-password" readOnly />

                      <Field label="Email Address *">
                        <input
                          type="email"
                          required
                          autoComplete="off"
                          value={reg.email}
                          onChange={(e) => setR('email', e.target.value)}
                          placeholder="you@hanaraschools.edu.gh"
                          className={inputCls}
                        />
                      </Field>

                      <Field label="Password *">
                        <div className="relative">
                          <input
                            type={showRegPwd ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            value={reg.password}
                            onChange={(e) => setR('password', e.target.value)}
                            placeholder="At least 6 characters"
                            className={`${inputCls} pr-12`}
                          />
                          <button type="button" onClick={() => setShowRegPwd(!showRegPwd)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                            {showRegPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </Field>

                      <Field label="Confirm Password *">
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={reg.confirmPassword}
                          onChange={(e) => setR('confirmPassword', e.target.value)}
                          placeholder="Re-enter password"
                          className={inputCls}
                        />
                      </Field>

                      {/* ── Secret Registration Code ── */}
                      <Field label="Secret Registration Code *">
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            autoComplete="off"
                            value={reg.registrationCode}
                            onChange={(e) => setR('registrationCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className={`${inputCls} tracking-[0.35em] font-mono text-center text-lg font-bold`}
                          />
                        </div>
                      </Field>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        <p className="font-bold">🔑 Registration Code Required</p>
                        <p className="mt-0.5">You need a 6-digit code from your school administrator to register. Contact the headteacher to obtain this code before proceeding.</p>
                      </div>
                    </div>
                  )}



                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-2">
                    {step > 1 ? (
                      <button type="button" onClick={() => { setStep((s) => s - 1); setRegError(''); }}
                        className="flex items-center space-x-1.5 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition cursor-pointer">
                        <ChevronLeft size={14} />
                        <span>Back</span>
                      </button>
                    ) : <div />}

                    {step < maxSteps ? (
                      <button type="button" onClick={goNext}
                        className="py-2 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition cursor-pointer shadow-sm">
                        Continue →
                      </button>
                    ) : (
                      <button type="submit" disabled={registering}
                        className="flex items-center space-x-2 py-2.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition cursor-pointer shadow-sm disabled:opacity-60">
                        {registering
                          ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Registering…</span></>
                          : <><CheckCircle2 size={14} /><span>Complete Registration</span></>}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {!regSuccess && (
                <p className="text-center text-xs text-slate-400">
                  Already have an account?{' '}
                  <button onClick={switchToLogin} className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer">Sign In</button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
