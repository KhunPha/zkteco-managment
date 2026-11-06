"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Cpu,
  Fingerprint,
  Users,
  GraduationCap,
  Building2,
  GitFork,
  CalendarCheck,
  Clock,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  Radio,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    title: "Core",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Daily Attendance", href: "/attendance/daily", icon: CalendarCheck },
      { name: "Live Kiosk Monitor", href: "/attendance/live", icon: Radio },
      { name: "Corrections", href: "/attendance/corrections", icon: CheckCircle2 },
    ],
  },
  {
    title: "Biometric Hardware",
    items: [
      { name: "Terminals", href: "/devices", icon: Cpu },
      { name: "Device Users", href: "/device-users", icon: Fingerprint },
    ],
  },
  {
    title: "Personnel",
    items: [
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Teachers", href: "/teachers", icon: BookOpen },
      { name: "Students", href: "/students", icon: GraduationCap },
      { name: "Departments", href: "/departments", icon: Building2 },
      { name: "Branches", href: "/branches", icon: GitFork },
    ],
  },
  {
    title: "Schedules & Leaves",
    items: [
      { name: "Work Shifts", href: "/shifts", icon: Clock },
      { name: "Schedules", href: "/schedules", icon: CalendarRange },
      { name: "Leave Requests", href: "/leaves", icon: FileText },
      { name: "Holidays", href: "/holidays", icon: CalendarDays },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Reports & Export", href: "/reports", icon: FileSpreadsheet },
      { name: "User Accounts", href: "/users", icon: ShieldCheck },
      { name: "Audit Trail", href: "/audit-logs", icon: History },
      { name: "System Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useThemeStore();

  const navContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        {(!collapsed || isMobile) && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20">
              ZK
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ZKTECO</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
                Enterprise Biometrics
              </span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/20">
            ZK
          </div>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close menu"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-5 scrollbar-none">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {(!collapsed || isMobile) && (
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setMobileSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group",
                    active
                      ? "bg-gradient-to-r from-indigo-50 to-indigo-100/60 dark:from-indigo-950/70 dark:to-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs border-l-3 border-indigo-600 dark:border-indigo-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white hover:translate-x-0.5"
                  )}
                  title={collapsed && !isMobile ? item.name : undefined}
                >
                  <Icon
                    size={17}
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                    )}
                  />
                  {(!collapsed || isMobile) && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div className={cn("flex items-center justify-between", collapsed && !isMobile ? "flex-col gap-2" : "gap-2.5")}>
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : "AD"}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || user?.username || "Admin"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  {user?.roles?.[0] || "SUPER_ADMIN"}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 select-none z-20 shrink-0",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250 select-none">
            {navContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

