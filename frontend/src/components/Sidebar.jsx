import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
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
  X,
  MessageSquare,
  ClipboardCheck,
  Settings,
  ClipboardList,
  Award,
  BookOpenCheck,
  BookOpen,
  Clock,
  FileText,
  BarChart3,
  FolderOpen,
  Shield,
  CreditCard,
  ShoppingBag,
  Megaphone,
  Fingerprint,
  QrCode,
  Database,
  Palette,
  Wifi,
  WifiOff,
} from 'lucide-react';

const navCategories = [
  {
    title: 'MAIN DASHBOARD',
    items: [
      {
        name: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'system_admin'],
      },
    ],
  },
  {
    title: 'ACADEMICS & STUDENTS',
    items: [
      {
        name: 'Student Directory',
        path: '/students',
        icon: GraduationCap,
        roles: ['superadmin', 'admin', 'teacher', 'accountant', 'system_admin'],
      },
      {
        name: 'BECE Candidates',
        path: '/bece',
        icon: Award,
        roles: ['superadmin', 'admin', 'teacher'],
      },
      {
        name: 'Mock Exams',
        path: '/mock-exams',
        icon: BookOpenCheck,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
        requiresJHS3: true, // teachers only see this if assigned to JHS 3
      },
      {
        name: 'Classes & Subjects',
        path: '/classes',
        icon: CalendarRange,
        roles: ['superadmin', 'admin'],
      },
      {
        name: 'Color Sections',
        path: '/sections',
        icon: Palette,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
    ],
  },
  {
    title: 'STAFF & TEACHING',
    items: [
      {
        name: 'Staff Directory',
        path: '/staff',
        icon: Users,
        roles: ['superadmin', 'admin'],
      },
      {
        name: 'Staff Attendance',
        path: '/staff/attendance',
        icon: Fingerprint,
        roles: ['superadmin', 'admin', 'system_admin'],
      },
      {
        name: 'My Classes',
        path: '/my-classes',
        icon: BookOpen,
        roles: ['teacher'],
      },
      {
        name: 'Attendance Register',
        path: '/attendance',
        icon: UserCheck,
        roles: ['teacher'],
        requireFormTeacher: true,
      },
      {
        name: 'My Attendance',
        path: '/staff/check-in',
        icon: Fingerprint,
        roles: ['teacher', 'accountant', 'superadmin', 'admin', 'system_admin'],
      },
      {
        name: 'Enter Results',
        path: '/grades',
        icon: ClipboardCheck,
        roles: ['teacher'],
      },
      {
        name: 'Assignments',
        path: '/assignments',
        icon: FileText,
        roles: ['teacher'],
      },
      {
        name: 'Lesson Plans',
        path: '/lesson-plans',
        icon: BookOpen,
        roles: ['teacher'],
      },
      {
        name: 'Timetable',
        path: '/timetable',
        icon: Clock,
        roles: ['teacher'],
      },
    ],
  },
  {
    title: 'FINANCE & SERVICES',
    items: [
      {
        name: 'Fees & Finance',
        path: '/fees',
        icon: Receipt,
        roles: ['superadmin', 'admin', 'accountant'],
      },
      {
        name: 'Daily Fee Collection',
        path: '/fees/daily-register',
        icon: ClipboardList,
        roles: ['teacher', 'superadmin', 'admin', 'accountant', 'system_admin'],
      },
      {
        name: 'Staff Payroll',
        path: '/payroll',
        icon: CreditCard,
        roles: ['superadmin', 'admin', 'accountant', 'system_admin'],
      },
      {
        name: 'School Store',
        path: '/store',
        icon: ShoppingBag,
        roles: ['superadmin', 'admin', 'accountant', 'system_admin'],
      },
      {
        name: 'Transport',
        path: '/transport',
        icon: Bus,
        roles: ['superadmin', 'admin'],
      },
    ],
  },
  {
    title: 'COMMUNICATION & VAULT',
    items: [
      {
        name: 'Notice Board',
        path: '/notices',
        icon: Megaphone,
        roles: ['superadmin', 'admin', 'teacher', 'parent', 'accountant', 'system_admin'],
      },
      {
        name: 'SMS Broadcasts',
        path: '/sms',
        icon: MessageSquare,
        roles: ['superadmin', 'admin'],
      },
      {
        name: 'Messaging Hub',
        path: '/messages',
        icon: MessageSquare,
        roles: ['superadmin', 'admin', 'teacher', 'parent', 'accountant', 'system_admin'],
      },
      {
        name: 'Behaviour Log',
        path: '/behaviour-records',
        icon: Award,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
      {
        name: 'Resources Vault',
        path: '/learning-resources',
        icon: FolderOpen,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
      {
        name: 'Reports Generator',
        path: '/reports-generator',
        icon: BarChart3,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
    ],
  },
  {
    title: 'SYSTEM & SETTINGS',
    items: [
      {
        name: 'Executive Analytics',
        path: '/analytics',
        icon: BarChart3,
        roles: ['superadmin', 'admin', 'accountant'],
      },
      {
        name: 'ID Cards Generator',
        path: '/id-cards',
        icon: CreditCard,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
      {
        name: 'Gate QR Scanner',
        path: '/gate-scanner',
        icon: QrCode,
        roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
      },
      {
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'driver', 'system_admin'],
      },
    ],
  },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen, handleAvatarClick, fileInputRef, handleFileChange }) => {
  const { user, logout, activeMode, isFormTeacher, isJHS3Teacher } = useAuth();
  const { isOnline, pendingCount, openSyncManager } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || 'teacher';

  const getUserName = () => {
    if (user?.refStaff) {
      const title = user.refStaff.title ? `${user.refStaff.title} ` : '';
      return `${title}${user.refStaff.firstName}`.trim();
    }
    return user?.email ? user.email.split('@')[0] : 'User';
  };

  const isNavActive = (itemPath) => {
    const basePath = itemPath.split('?')[0].split('#')[0];
    const current = location.pathname;

    if (basePath === '/') {
      return current === '/';
    }

    if (basePath === '/students') {
      return current === '/students' || current.startsWith('/students/');
    }

    if (basePath === '/staff') {
      return (
        (current === '/staff' || current.startsWith('/staff/new') || current.startsWith('/staff/edit')) &&
        !current.startsWith('/staff/attendance') &&
        !current.startsWith('/staff/check-in')
      );
    }

    if (basePath === '/fees') {
      return current === '/fees' && !location.search.includes('tab=daily');
    }

    if (basePath === '/fees/daily-register' || basePath === '/fees/daily-collection') {
      return (
        current === '/fees/daily-register' ||
        current === '/fees/daily-collection' ||
        current === '/fee-collection' ||
        (current === '/fees' && location.search.includes('tab=daily'))
      );
    }

    return current === basePath || current.startsWith(basePath + '/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Special System Admin mode items
  if (user?.role === 'system_admin' && activeMode === 'admin') {
    const adminItems = [
      { name: 'Admin Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'User Management', path: '/admin/users', icon: Users },
      { name: 'System Settings', path: '/admin/settings', icon: Settings },
      { name: 'Integrations Monitor', path: '/admin/integrations', icon: MessageSquare },
      { name: 'Backup & Restore', path: '/admin/backups', icon: CalendarDays },
      { name: 'Audit Log Viewer', path: '/admin/audit-logs', icon: ClipboardList },
      { name: 'Data Protection Center', path: '/admin/data-requests', icon: UserCheck },
    ];

    return (
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#4A1C20] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0 overflow-hidden select-none ${
          sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#310F12]/80 relative z-10">
          <div
            onClick={() => handleNavClick('/')}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <img
              src="/hanara-badge.png"
              alt="HANARA Official Badge"
              className="h-10 w-10 object-contain drop-shadow-md shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-black text-sm tracking-wider uppercase text-white">HANARA</span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#E8D0D2]/90">ADMIN MODE</span>
            </div>
          </div>
          <button
            className="lg:hidden p-1 rounded-md text-[#E8D0D2] hover:text-white cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative z-10 scrollbar-none">
          {adminItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (setSidebarOpen) setSidebarOpen(false);
                }}
                className={`w-full text-left flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[#78282E] text-white shadow-sm font-bold border border-[#9E363E]/40'
                    : 'text-[#E8D0D2]/80 hover:bg-[#361114] hover:text-white'
                }`}
              >
                <Icon size={17} className={active ? 'text-white' : 'text-[#D9B4B8]/70'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-[#310F12]/80 bg-[#2D0D10] relative z-10">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#361114] hover:bg-[#4A1C20] text-[#E8D0D2] hover:text-white border border-[#6B2228]/60 font-bold text-xs transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#4A1C20] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0 overflow-hidden select-none ${
        sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'
      }`}
    >
      {/* Background School Watermark Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Sidebar Header / Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#310F12]/80 relative z-10 shrink-0">
        <div
          onClick={() => handleNavClick('/')}
          className="flex items-center space-x-3 cursor-pointer"
        >
          <img
            src="/hanara-badge.png"
            alt="HANARA Official Badge"
            className="h-10 w-10 object-contain drop-shadow-md shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-black text-sm tracking-wider uppercase text-white">HANARA</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#E8D0D2]/90">SCHOOLS</span>
          </div>
        </div>
        <button
          type="button"
          className="lg:hidden p-1 rounded-md text-[#E8D0D2] hover:text-white cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Categorized Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto relative z-10 scrollbar-none">
        {navCategories.map((category) => {
          const visibleItems = category.items.filter((item) => {
            if (item.roles && !item.roles.includes(role)) return false;
            if (item.requireFormTeacher && !isFormTeacher) return false;
            // Gate Mock Exams: teachers must be assigned to JHS 3; admins always see it
            if (item.requiresJHS3 && role === 'teacher' && !isJHS3Teacher) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={category.title} className="space-y-1">
              <div className="px-3.5 pb-1 text-[9px] font-black tracking-widest uppercase text-[#D9B4B8]/50">
                {category.title}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.path);
                return (
                  <Link
                    key={item.path + '-' + item.name}
                    to={item.path}
                    onClick={() => {
                      if (setSidebarOpen) setSidebarOpen(false);
                    }}
                    className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-[#78282E] text-white shadow-sm font-bold border border-[#9E363E]/40'
                        : 'text-[#E8D0D2]/80 hover:bg-[#361114] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={17} className={active ? 'text-white' : 'text-[#D9B4B8]/70'} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer / User Profile Card */}
      <div className="p-3.5 border-t border-[#310F12]/80 bg-[#2D0D10] relative z-10 shrink-0">
        {/* Offline Status & Sync Manager Widget */}
        <div
          onClick={openSyncManager}
          className={`mb-2.5 p-2 rounded-xl border flex items-center justify-between cursor-pointer transition shadow-2xs group ${
            isOnline
              ? 'bg-[#361114] border-[#6B2228]/50 hover:bg-[#3f1418]'
              : 'bg-red-950/60 border-red-800/80 hover:bg-red-950'
          }`}
          title="Click to open Offline Sync Manager"
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] shrink-0" />
            ) : (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
            <div className="leading-tight">
              <span className={`text-[10px] font-extrabold block ${isOnline ? 'text-white' : 'text-red-200'}`}>
                {isOnline ? 'Online Connected' : 'Offline Mode'}
              </span>
              <span className={`text-[9px] font-semibold ${isOnline ? 'text-[#D9B4B8]/70' : 'text-red-300 font-bold'}`}>
                {pendingCount > 0 ? `${pendingCount} pending sync` : isOnline ? 'Cloud Synced' : 'Working Offline'}
              </span>
            </div>
          </div>
          <Database size={13} className={`${isOnline ? 'text-[#D9B4B8] group-hover:text-white' : 'text-red-300 group-hover:text-white'} transition`} />
        </div>

        <div className="flex items-center space-x-3 mb-3 bg-[#3B1115] p-2.5 rounded-xl border border-[#6B2228]/50">
          <div
            onClick={handleAvatarClick}
            className="relative h-10 w-10 bg-[#361114] rounded-full flex items-center justify-center text-white border border-[#852C33]/50 overflow-hidden cursor-pointer group transition-all shrink-0 font-extrabold text-sm"
            title="Change profile picture"
          >
            {user?.photoUrl || user?.refStaff?.photoUrl ? (
              <img
                src={user.photoUrl || user.refStaff.photoUrl}
                alt="User Avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span>{getUserName()[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          {fileInputRef && (
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          )}
          <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => handleNavClick('/settings')}>
            <p className="text-xs font-bold text-white truncate" title={getUserName()}>
              {getUserName()}
            </p>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#78282E] text-white uppercase tracking-wider inline-block mt-0.5">
              {user?.role ? user.role.toUpperCase() : 'TEACHER'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#361114] hover:bg-[#4A1C20] text-[#E8D0D2] hover:text-white border border-[#6B2228]/60 font-bold text-xs transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
