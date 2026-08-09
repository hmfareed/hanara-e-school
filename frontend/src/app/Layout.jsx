import React, { useState, useRef, useEffect } from 'react';
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
  BookOpenCheck,
  Search,
  BookOpen,
  Clock,
  FileText,
  BarChart3,
  FolderOpen,
  Bell,
  ChevronDown,
  Shield,
} from 'lucide-react';

/* ── Dynamic header badge showing current academic year ── */
const ActiveYearBadge = () => {
  const { data: years = [] } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
    staleTime: 5 * 60 * 1000, // 5 min cache — no need to refetch every render
  });
  const active = years.find(y => y.isCurrent) || years[0];
  if (!active) return <span className="text-xs font-bold text-slate-400">No Active Year</span>;
  return (
    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
      {active.name}
    </span>
  );
};

const Layout = () => {
  const { user, logout, hasRole, activeMode, toggleActiveMode, isFormTeacher, refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Global live-search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      setShowDropdown(true);
      try {
        const [studentsRes, staffRes] = await Promise.all([
          api.get(`/students?limit=5&search=${encodeURIComponent(searchQuery)}`),
          api.get(`/staff?limit=5&search=${encodeURIComponent(searchQuery)}`)
        ]);

        const students = (studentsRes.data?.data || []).map(s => ({
          id: s._id,
          type: 'Student',
          name: `${s.firstName} ${s.lastName}`,
          sub: s.currentClass?.name || 'Student',
          link: `/students/${s._id}`,
          photoUrl: s.photoUrl
        }));

        const staff = (staffRes.data?.data || []).map(t => ({
          id: t._id,
          type: 'Staff / Teacher',
          name: `${t.title ? t.title + ' ' : ''}${t.firstName} ${t.lastName}`,
          sub: t.email || 'Staff',
          link: `/staff/edit/${t._id}`,
          photoUrl: t.photoUrl
        }));

        setSearchResults([...students, ...staff]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserName = () => {
    if (user?.refStaff) {
      const title = user.refStaff.title ? `${user.refStaff.title} ` : '';
      return `${title}${user.refStaff.firstName}`.trim();
    }
    return user?.email ? user.email.split('@')[0] : 'User';
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBase64 = await compressImage(file, 500, 0.8);
      await api.put('/teachers/profile/update', { photoUrl: compressedBase64 });
      const updatedUser = {
        ...user,
        photoUrl: compressedBase64,
        refStaff: user?.refStaff ? { ...user.refStaff, photoUrl: compressedBase64 } : { photoUrl: compressedBase64 },
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert('Failed to update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'system_admin'],
    },
    {
      name: 'Academic Year',
      path: '/academic-year',
      icon: CalendarDays,
      roles: ['superadmin', 'admin'],
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
    },
    {
      name: 'Classes & Subjects',
      path: '/classes',
      icon: CalendarRange,
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
      name: 'SMS Broadcasts',
      path: '/sms',
      icon: MessageSquare,
      roles: ['superadmin', 'admin'],
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
    {
      name: 'Messaging Hub',
      path: '/messages',
      icon: MessageSquare,
      roles: ['superadmin', 'admin', 'teacher', 'system_admin'],
    },
    {
      name: 'My Classes',
      path: '/my-classes',
      icon: BookOpen,
      roles: ['teacher'],
    },
    {
      name: 'Students',
      path: '/students',
      icon: GraduationCap,
      roles: ['teacher', 'accountant'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: UserCheck,
      roles: ['teacher'],
      requireFormTeacher: true,
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
    {
      name: 'Daily Fee Collection',
      path: '/fees/daily-register',
      icon: ClipboardList,
      roles: ['teacher', 'superadmin', 'admin', 'accountant', 'system_admin'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'driver', 'system_admin'],
    },
  ];

  const getNavItems = () => {
    if (user?.role === 'system_admin' && activeMode === 'admin') {
      return [
        { name: 'Admin Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'System Settings', path: '/admin/settings', icon: Settings },
        { name: 'Integrations Monitor', path: '/admin/integrations', icon: MessageSquare },
        { name: 'Backup & Restore', path: '/admin/backups', icon: CalendarDays },
        { name: 'Audit Log Viewer', path: '/admin/audit-logs', icon: ClipboardList },
        { name: 'Data Protection Center', path: '/admin/data-requests', icon: UserCheck },
      ];
    }

    const role = user?.role || 'teacher';

    return navItems
      .filter((item) => {
        if (item.roles && !item.roles.includes(role)) {
          return false;
        }
        if (item.requireFormTeacher && !isFormTeacher) {
          return false;
        }
        return true;
      })
      .map((item) => {
        if (item.name === 'Messaging Hub' || item.name === 'Messages') {
          return {
            ...item,
            badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
          };
        }
        return item;
      });
  };

  const filteredItems = getNavItems();

  return (
    <div className="h-screen bg-[#f4f6f8] flex overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#4A1C20] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 relative overflow-hidden select-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Background School Watermark Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#310F12]/80 relative z-10">
          <Link to="/" className="flex items-center space-x-3" onClick={() => setSidebarOpen(false)}>
            <div className="h-9 w-9 bg-[#361114] border border-[#7D2A30]/40 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Shield size={20} className="fill-[#D9B4B8]/20 text-[#D9B4B8]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-black text-sm tracking-wider uppercase text-white">HANARA</span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#E8D0D2]/90">SCHOOLS</span>
            </div>
          </Link>
          <button
            className="lg:hidden p-1 rounded-md text-[#E8D0D2] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative z-10 scrollbar-none">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-[#78282E] text-white shadow-sm font-bold border border-[#9E363E]/40'
                    : 'text-[#E8D0D2]/80 hover:bg-[#361114] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={17} className={isActive ? 'text-white' : 'text-[#D9B4B8]/70'} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#78282E] text-white border border-[#9E363E]/50">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Teacher Profile Card */}
        <div className="p-3.5 border-t border-[#310F12]/80 bg-[#2D0D10] relative z-10">
          <div className="flex items-center space-x-3 mb-3 bg-[#3B1115] p-2.5 rounded-xl border border-[#6B2228]/50">
            <div 
              onClick={handleAvatarClick}
              className="relative h-10 w-10 bg-[#361114] rounded-full flex items-center justify-center text-white border border-[#852C33]/50 overflow-hidden cursor-pointer group transition-all shrink-0"
              title="Change profile picture"
            >
              {(user?.photoUrl || user?.refStaff?.photoUrl) ? (
                <img src={user.photoUrl || user.refStaff.photoUrl} alt="User Avatar" className="h-full w-full object-cover" />
              ) : (
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Avatar" className="h-full w-full object-cover" />
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => navigate('/settings')}>
              <p className="text-xs font-bold text-white truncate" title={getUserName()}>
                {getUserName()}
              </p>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#78282E] text-white uppercase tracking-wider inline-block mt-0.5">
                {user?.role ? user.role.toUpperCase() : 'TEACHER'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#361114] hover:bg-[#4A1C20] text-[#E8D0D2] hover:text-white border border-[#6B2228]/60 font-bold text-xs transition-colors"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shadow-sm">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
            >
              <Menu size={20} />
            </button>
            
            {/* Header Search Bar */}
            <div className="relative max-w-md w-full hidden sm:block z-50">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Search students, classes, records..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 placeholder-slate-400"
              />

              {/* Background click-away overlay */}
              {showDropdown && (
                <div 
                  className="fixed inset-0 bg-transparent cursor-default" 
                  style={{ zIndex: 40 }}
                  onClick={() => setShowDropdown(false)}
                />
              )}

              {/* Dropdown panel */}
              {showDropdown && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto z-50 animate-fade-in">
                  <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {searching ? 'Searching records...' : `${searchResults.length} matches found`}
                    </span>
                  </div>
                  
                  <div className="divide-y divide-slate-50">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          to={result.link}
                          onClick={() => {
                            setSearchQuery('');
                            setShowDropdown(false);
                          }}
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="h-8 w-8 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold shrink-0 overflow-hidden text-xs">
                            {result.photoUrl ? (
                              <img src={result.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <span>{result.name[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{result.name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                              {result.sub}
                            </span>
                          </div>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200/50 text-slate-500 shrink-0 uppercase tracking-wider">
                            {result.type}
                          </span>
                        </Link>
                      ))
                    ) : (
                      !searching && (
                        <div className="px-4 py-8 text-center text-slate-400 space-y-1">
                          <p className="text-xs font-semibold">No records matched</p>
                          <p className="text-[10px] text-slate-400">Check spelling or search for another keyword</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {location.pathname !== '/' && (
              <span className="text-sm font-bold text-slate-400 hidden lg:inline-block">
                / {location.pathname.substring(1).split('/')[0].replace('-', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {user?.role === 'system_admin' && user?.secondaryCapacities?.includes('teacher') && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => activeMode !== 'admin' && toggleActiveMode()}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeMode === 'admin'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin Panel
                </button>
                <button
                  onClick={() => activeMode !== 'teacher' && toggleActiveMode()}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeMode === 'teacher'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Classes
                </button>
              </div>
            )}

            {/* Academic Year Selector Pill */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
              <CalendarDays size={16} className="text-emerald-600" />
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-normal">Academic Year</span>
                <span className="font-extrabold text-slate-800">2026/2027</span>
              </div>
              <ChevronDown size={13} className="text-slate-400" />
            </div>

            {/* Date Display Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
              <CalendarDays size={16} className="text-emerald-600" />
              <span className="font-medium text-slate-800">Tuesday, Aug 4, 2026</span>
            </div>

            {/* Messages Icon (Community Staff Chat) */}
            <div 
              onClick={() => navigate('/messages')} 
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer" 
              title="Staff & Headmaster Community Chat"
            >
              <MessageSquare size={19} />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-[#78282E] text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadMessagesCount}
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <div 
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer" 
              title="Notifications"
            >
              <Bell size={19} />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {notificationsCount}
                </span>
              )}
            </div>

            {/* User Profile Avatar with Dropdown Arrow */}
            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200 cursor-pointer" onClick={handleAvatarClick}>
              <div className="h-9 w-9 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-emerald-600 shadow-2xs">
                {user?.refStaff?.photoUrl ? (
                  <img src={user.refStaff.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{getUserName()[0]?.toUpperCase()}</span>
                )}
              </div>
              <ChevronDown size={14} className="text-slate-400" />
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
