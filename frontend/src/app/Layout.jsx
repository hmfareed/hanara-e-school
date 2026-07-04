import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  CalendarRange,
  CalendarDays,
  Receipt,
  Bus,
  LogOut,
  Menu,
  X,
  User,
  MessageSquare,
  ClipboardCheck,
  Settings,
  ClipboardList,
  Award,
} from 'lucide-react';

/* ── Dynamic header badge showing current academic year ── */
const ActiveYearBadge = () => {
  const { data: years = [] } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
    staleTime: 5 * 60 * 1000, // 5 min cache — no need to refetch every render
  });
  const active = years.find(y => y.isCurrent) || years[0];
  if (!active) return <span className="text-xs font-bold text-slate-400">No active year</span>;
  return (
    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
      {active.name}
    </span>
  );
};

const Layout = () => {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent'],
    },
    {
      name: 'SMS Broadcasts',
      path: '/sms',
      icon: MessageSquare,
      roles: ['superadmin', 'admin'],
    },
    {
      name: 'Students',
      path: '/students',
      icon: GraduationCap,
      roles: ['superadmin', 'admin', 'teacher', 'accountant'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: UserCheck,
      roles: ['superadmin', 'admin', 'teacher'],
    },
    {
      name: 'Enter Results',
      path: '/grades',
      icon: ClipboardCheck,
      roles: ['superadmin', 'admin', 'teacher'],
    },
    {
      name: 'BECE Candidates',
      path: '/bece',
      icon: Award,
      roles: ['superadmin', 'admin', 'teacher'],
    },
    {
      name: 'Classes & Subjects',
      path: '/classes',
      icon: CalendarRange,
      roles: ['superadmin', 'admin'],
    },
    {
      name: 'Academic Year',
      path: '/academic-year',
      icon: CalendarDays,
      roles: ['superadmin', 'admin'],
    },
    {
      name: 'Staff Directory',
      path: '/staff',
      icon: Users,
      roles: ['superadmin', 'admin'],
    },
    {
      name: 'Fees & Finance',
      path: '/fees',
      icon: Receipt,
      roles: ['superadmin', 'admin', 'accountant'],
    },
    {
      name: 'Transport',
      path: '/transport',
      icon: Bus,
      roles: ['superadmin', 'admin'],
    },
    {
      name: 'Daily Fee Register',
      path: '/fees/daily-register',
      icon: ClipboardList,
      roles: ['superadmin', 'admin', 'teacher'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'driver'],
    },
  ];

  const filteredItems = navItems.filter((item) => hasRole(item.roles));

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'superadmin':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'admin':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'teacher':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'accountant':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'parent':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'cleaner':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center space-x-2" onClick={() => setSidebarOpen(false)}>
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">
              H
            </div>
            <span className="font-bold text-base tracking-wide uppercase text-slate-100">HANARA SCHOOLS</span>
          </Link>
          <button
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.badge ? '#' : item.path}
                onClick={(e) => {
                  if (item.badge) {
                    e.preventDefault();
                    return;
                  }
                  setSidebarOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                } ${item.badge ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Current User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 border border-slate-700 overflow-hidden">
              {user?.refStaff?.photoUrl ? (
                <img src={user.refStaff.photoUrl} alt="User Avatar" className="h-full w-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-200" title={user?.refStaff ? `${user.refStaff.title ? user.refStaff.title + " " : ""}${user.refStaff.firstName}` : user?.email?.split('@')[0]}>
                {user?.refStaff 
                  ? `${user.refStaff.title ? user.refStaff.title + " " : ""}${user.refStaff.firstName}` 
                  : user?.email?.split('@')[0]}
              </p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeStyle(user?.role)}`}>
                {user?.role === 'superadmin' ? 'headteacher' : user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/20 font-medium text-sm transition-colors text-slate-300"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight capitalize select-none">
              {location.pathname === '/'
                ? 'Welcome Back'
                : location.pathname.substring(1).split('/')[0].replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Academic Period</span>
              <ActiveYearBadge />
            </div>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
