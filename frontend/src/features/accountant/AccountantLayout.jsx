import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  BanknoteIcon,
  Bell,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import { AccountantSocketProvider } from './AccountantSocketContext';
import { getSocket } from '../../services/socket';

const navItems = [
  { name: 'Dashboard',        path: '/accountant',              icon: LayoutDashboard },
  { name: 'Pending Queue',    path: '/accountant/pending',       icon: ClipboardList },
  { name: 'Confirmed History',path: '/accountant/history',       icon: CheckCircle },
  { name: 'Discrepancies',    path: '/accountant/discrepancies', icon: AlertTriangle },
  { name: 'Reports',          path: '/accountant/reports',       icon: BarChart3 },
  { name: 'Fee Structure',    path: '/accountant/fee-structure', icon: BanknoteIcon },
  { name: 'Profile',          path: '/accountant/profile',       icon: User },
];

/* ── Toast notification component ── */
const Toast = ({ toasts, dismiss }) => (
  <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        onClick={() => dismiss(t.id)}
        className="pointer-events-auto flex items-start gap-3 bg-slate-900 border border-teal-500/40 text-white text-sm rounded-2xl px-5 py-4 shadow-2xl shadow-black/40 max-w-xs cursor-pointer animate-slide-in-up"
        style={{ animation: 'slideInUp 0.3s ease-out' }}
      >
        <span className="shrink-0 mt-0.5 h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
        <div>
          <p className="font-bold text-teal-300 text-xs uppercase tracking-wider mb-0.5">
            New Submission
          </p>
          <p className="text-slate-200 text-xs leading-snug">{t.message}</p>
        </div>
        <X size={14} className="shrink-0 text-slate-500 mt-0.5 ml-1 hover:text-white" />
      </div>
    ))}
  </div>
);

const AccountantLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [notifBadge, setNotifBadge] = useState(0);
  const [socketConnected, setSocketConnected] = useState(true);
  const toastIdRef = useRef(0);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Track socket connectivity for the status indicator
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setSocketConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [{ id, message }, ...prev].slice(0, 5));
    setNotifBadge((n) => n + 1);
    setTimeout(() => dismissToast(id), 6000);
  }, [dismissToast]);

  const handleNewSubmission = useCallback((data) => {
    const className = data?.class?.name || 'Unknown Class';
    const teacherEmail = data?.submittingTeacher?.email || 'a teacher';
    addToast(`${teacherEmail} submitted daily register for ${className}`);
  }, [addToast]);

  const handleStatusChanged = useCallback(() => {}, []);
  const handleNewCorrection = useCallback(() => {}, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserName = () => {
    if (user?.refStaff) {
      const title = user.refStaff.title ? `${user.refStaff.title} ` : '';
      return `${title}${user.refStaff.firstName}`.trim();
    }
    return user?.email?.split('@')[0] || 'Accountant';
  };

  return (
    <AccountantSocketProvider
      onNewSubmission={handleNewSubmission}
      onStatusChanged={handleStatusChanged}
      onNewCorrection={handleNewCorrection}
    >
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in-up { animation: slideInUp 0.3s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>

      <div className="h-screen flex overflow-hidden" style={{ background: '#0f172a' }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${
            sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'
          }`}
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #0d1526 100%)',
            borderRight: '1px solid rgba(20, 184, 166, 0.12)',
          }}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 shrink-0" style={{ borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
            <Link
              to="/accountant"
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                setSidebarOpen(false);
              }}
            >
              <img
                src="/hanara-badge.png"
                alt="HANARA Official Badge"
                className="h-10 w-10 object-contain drop-shadow-md shrink-0"
              />
              <div>
                <span className="block text-sm font-black tracking-wide text-white uppercase leading-tight">
                  Accounts
                </span>
                <span className="block text-[10px] font-semibold text-teal-400 uppercase tracking-widest leading-tight">
                  HANARA Schools
                </span>
              </div>
            </Link>
            <button
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/accountant' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? 'text-teal-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'rgba(20, 184, 166, 0.12)',
                          border: '1px solid rgba(20, 184, 166, 0.2)',
                        }
                      : {
                          border: '1px solid transparent',
                        }
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-teal-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(20,184,166,0.1)' }}>
            {/* Socket status */}
            <div className="flex items-center gap-2 mb-4 px-2">
              {socketConnected ? (
                <>
                  <Wifi size={12} className="text-teal-400" />
                  <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">Live feed active</span>
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Reconnecting...</span>
                </>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-3 mb-3 px-2">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0e7490)' }}
              >
                {user?.refStaff?.photoUrl ? (
                  <img src={user.refStaff.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getUserName()?.[0]?.toUpperCase() || 'A'
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-200 truncate">{getUserName()}</p>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.25)' }}
                >
                  Accountant
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
          {/* Top bar */}
          <header
            className="h-16 bg-white flex items-center justify-between px-6 shrink-0"
            style={{ borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <Menu size={20} />
              </button>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Accounts Office
                </p>
                <p className="text-sm font-bold text-slate-700 capitalize">
                  {location.pathname.replace('/accountant', '').replace('/', '').replace('-', ' ') || 'Dashboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => setNotifBadge(0)}
              >
                <Bell size={18} />
                {notifBadge > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                  >
                    {notifBadge > 9 ? '9+' : notifBadge}
                  </span>
                )}
              </button>
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-sm overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0e7490)' }}
              >
                {user?.refStaff?.photoUrl ? (
                  <img src={user.refStaff.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getUserName()?.[0]?.toUpperCase() || 'A'
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <ErrorBoundary key={location.pathname}>
              <div className="animate-page-enter">
                <Outlet />
              </div>
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Toast notifications */}
      <Toast toasts={toasts} dismiss={dismissToast} />
    </AccountantSocketProvider>
  );
};

export default AccountantLayout;
