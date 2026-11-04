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
  const { language } = useThemeStore();

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 select-none z-20",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              ZK
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                ZKTECO BIOMETRICS
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Enterprise Attendance
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            ZK
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                    active
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className={cn("flex items-center justify-between", collapsed ? "flex-col gap-2" : "gap-3")}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                {user?.username ? user.username.substring(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.fullName || user?.username || "Admin"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.roles?.[0] || "SUPER_ADMIN"}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

