import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  CheckSquare,
  DollarSign,
  Megaphone,
  Bell,
  ShieldAlert,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  UserCheck,
  UploadCloud,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseAlertBanner } from './DatabaseAlertBanner';
import { api } from '../services/api';
import { INotification } from '../../shared/types';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const role = user?.role || 'employee';

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.listNotifications();
        if (res.data) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n) => !n.isRead).length);
        }
      } catch {
        // silent fallback
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        setShowNotifications(false);
        navigate(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Nav menus configured per role
  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Company Settings', path: '/admin/company', icon: Settings },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
    { label: 'Designations', path: '/admin/designations', icon: Briefcase },
    { label: 'Leave Types', path: '/admin/leave-types', icon: CalendarDays },
    { label: 'Public Holidays', path: '/admin/holidays', icon: CalendarDays },
    { label: 'HR Management', path: '/admin/hr-management', icon: UserCheck },
    { label: 'Employee Directory', path: '/admin/employees', icon: Users },
    { label: 'Attendance Board', path: '/admin/attendance', icon: Clock },
    { label: 'Leave Overview', path: '/admin/leaves', icon: CheckSquare },
    { label: 'Payroll & Finalize', path: '/admin/payroll', icon: DollarSign },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: ShieldAlert },
    { label: 'AI Assistant', path: '/admin/ai-assistant', icon: Bot },
  ];

  const hrNav = [
    { label: 'HR Dashboard', path: '/hr', icon: LayoutDashboard },
    { label: 'Employee Directory', path: '/hr/employees', icon: Users },
    { label: 'CSV Import & Export', path: '/hr/csv-import', icon: UploadCloud },
    { label: 'Attendance Board', path: '/hr/attendance', icon: Clock },
    { label: 'Attendance Corrections', path: '/hr/attendance-corrections', icon: Clock },
    { label: 'Leave Approvals', path: '/hr/leaves', icon: CheckSquare },
    { label: 'Salary & Payroll Draft', path: '/hr/payroll', icon: DollarSign },
    { label: 'Announcements', path: '/hr/announcements', icon: Megaphone },
    { label: 'AI Assistant', path: '/hr/ai-assistant', icon: Bot },
  ];

  const employeeNav = [
    { label: 'My Dashboard', path: '/employee', icon: LayoutDashboard },
    { label: 'My Attendance & Check-In', path: '/employee/attendance', icon: Clock },
    { label: 'Apply Leave & Balance', path: '/employee/leaves', icon: CalendarDays },
    { label: 'My Payslips', path: '/employee/payslips', icon: FileText },
    { label: 'My Profile', path: '/employee/profile', icon: User },
    { label: 'Announcements', path: '/employee/announcements', icon: Megaphone },
    { label: 'AI Assistant & Policies', path: '/employee/ai-assistant', icon: Bot },
  ];

  const currentNav = role === 'admin' ? adminNav : role === 'hr' ? hrNav : employeeNav;

  // Generate breadcrumb text
  const currentItem = currentNav.find((item) => item.path === location.pathname);
  const breadcrumbText = currentItem ? currentItem.label : 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <DatabaseAlertBanner />

      <div className="flex flex-1">
        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
            <Link to={`/${role}`} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                S
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">Saylani HCM</span>
                <span className="text-[10px] block text-blue-400 font-semibold tracking-wider uppercase">
                  Lite Enterprise
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Indicator */}
          <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Active Workspace</span>
            <span className="font-semibold text-blue-400 uppercase tracking-wider text-[11px]">
              {role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role} Account</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar Contract (Left: Breadcrumb, Right: Actions & User) */}
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden text-slate-600 hover:text-slate-900"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="capitalize">{role}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-semibold">{breadcrumbText}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* AI Assistant Quick Button */}
              <Link
                to={`/${role}/ai-assistant`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </Link>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center font-mono-numbers">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-blue-600 hover:underline font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleMarkAsRead(n._id, n.link)}
                            className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              n.isRead ? 'bg-slate-50 text-slate-600' : 'bg-blue-50/60 text-slate-900 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-900">{n.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                  {user?.email[0]}
                </div>
                <button
                  onClick={logout}
                  className="hidden sm:inline-block text-xs font-medium text-slate-500 hover:text-red-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Main Page Area */}
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
