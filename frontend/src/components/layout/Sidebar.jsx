"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  Radio,
  Activity,
  HardDrive,
  X,
  Search,
  Briefcase,
  School,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const NAV_SECTIONS = [
  {
    id: "core",
    title: "Core Monitoring",
    khmerTitle: "ម៉ូនីទ័រគោល",
    items: [
      { name: "Dashboard", khmerName: "ផ្ទាំងគ្រប់គ្រង", href: "/dashboard", icon: LayoutDashboard },
      { name: "Daily Attendance", khmerName: "វត្តមានប្រចាំថ្ងៃ", href: "/attendance/daily", icon: CalendarCheck },
      { name: "Live Punch Scans", khmerName: "ទិន្នន័យស្កេនផ្ទាល់", href: "/attendance/punches", icon: Activity, badge: "LIVE", badgeColor: "emerald" },
      { name: "Live Kiosk Monitor", khmerName: "ម៉ូនីទ័រ Kiosk ផ្ទាល់", href: "/attendance/live", icon: Radio },
      { name: "Corrections", khmerName: "ស្នើកែវត្តមាន", href: "/attendance/corrections", icon: CheckCircle2 },
    ],
  },
  {
    id: "hardware",
    title: "Biometric Hardware",
    khmerTitle: "ឧបករណ៍ជីវមាត្រ",
    items: [
      { name: "Terminals", khmerName: "ម៉ាស៊ីនស្កេន ZKTeco", href: "/devices", icon: Cpu },
      { name: "Device Users", khmerName: "អ្នកប្រើប្រាស់ម៉ាស៊ីន", href: "/device-users", icon: Fingerprint },
    ],
  },
  {
    id: "personnel",
    title: "Organization Personnel",
    khmerTitle: "បុគ្គលិក និងស្ថាប័ន",
    items: [
      { name: "Employees", khmerName: "បុគ្គលិកទូទៅ", href: "/employees", icon: Users },
      { name: "Teachers", khmerName: "គ្រូបង្រៀន / សាស្រ្តាចារ្យ", href: "/teachers", icon: BookOpen },
      { name: "Students", khmerName: "សិស្ស / និស្សិត", href: "/students", icon: GraduationCap },
      { name: "Academic Classes", khmerName: "ថ្នាក់ និងកម្រិតសិក្សា", href: "/academic-classes", icon: School },
      { name: "Departments", khmerName: "នាយកដ្ឋាន / ដេប៉ាតឺម៉ង់", href: "/departments", icon: Building2 },
      { name: "Positions", khmerName: "មុខតំណែង (Job Titles)", href: "/positions", icon: Briefcase },
      { name: "Branches", khmerName: "សាខាស្ថាប័ន", href: "/branches", icon: GitFork },
    ],
  },
  {
    id: "shifts",
    title: "Schedules & Leaves",
    khmerTitle: "វេន និងច្បាប់ឈប់",
    items: [
      { name: "Work Shifts", khmerName: "វេនការងារ (Shifts)", href: "/shifts", icon: Clock },
      { name: "Schedules", khmerName: "កាលវិភាគវេន (Rosters)", href: "/schedules", icon: CalendarRange },
      { name: "Leave Requests", khmerName: "ពាក្យសុំច្បាប់ (Leaves)", href: "/leaves", icon: FileText },
      { name: "Holidays", khmerName: "ថ្ងៃឈប់បុណ្យ (Holidays)", href: "/holidays", icon: CalendarDays },
    ],
  },
  {
    id: "saas",
    title: "SaaS Multi-Tenant",
    khmerTitle: "គ្រប់គ្រងស្ថាប័នអតិថិជន",
    superAdminOnly: true,
    items: [
      { name: "Companies & Clients", khmerName: "ស្ថាប័នអតិថិជន", href: "/companies", icon: Building2, badge: "SaaS", badgeColor: "indigo" },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    khmerTitle: "ការគ្រប់គ្រងប្រព័ន្ធ",
    items: [
      { name: "Reports & Export", khmerName: "របាយការណ៍ និង Export", href: "/reports", icon: FileSpreadsheet, badge: "Excel", badgeColor: "sky" },
      { name: "Database & Backups", khmerName: "បម្រុងទុកទិន្នន័យ (Backups)", href: "/backups", icon: HardDrive, badge: "Drive", badgeColor: "emerald" },
      { name: "Data Import & Roles", khmerName: "នាំចូលទិន្នន័យ (Import)", href: "/data-import", icon: Database },
      { name: "User Accounts", khmerName: "គណនីអ្នកប្រើ (Users)", href: "/users", icon: ShieldCheck },
      { name: "Audit Trail", khmerName: "ប្រវត្តិសកម្មភាព (Audit)", href: "/audit-logs", icon: History },
      { name: "User Guide & Manual", khmerName: "សៀវភៅណែនាំ (Visual Guide)", href: "/guide", icon: BookOpen, badge: "Guide", badgeColor: "indigo" },
      { name: "System Settings", khmerName: "ការកំណត់ប្រព័ន្ធ", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({});
  const [tooltip, setTooltip] = useState(null); // Floating tooltip positioned outside scroll container
  const { logout, user } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useThemeStore();

  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");

  // Fetch current company branding & details
  const { data: currentCompany } = useQuery({
    queryKey: ["current-tenant-company-profile"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/companies/current");
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Close mobile drawer on route change or escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMobileSidebarOpen]);

  // Filter sections by role and search query
  const filteredNavSections = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();

    return NAV_SECTIONS.filter((section) => {
      if (section.superAdminOnly && !isSuperAdmin) {
        return false;
      }
      return true;
    })
      .map((section) => {
        if (!q) return section;
        const matchingItems = section.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.khmerName.toLowerCase().includes(q) ||
            item.href.toLowerCase().includes(q)
        );
        return {
          ...section,
          items: matchingItems,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [isSuperAdmin, searchFilter]);

  const navContent = (isMobile = false) => {
    const isExpanded = !collapsed || isMobile;

    return (
      <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 select-none overflow-hidden">
        {/* Brand Header */}
        <div className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center">
          {isExpanded ? (
            <div className="flex items-center justify-between w-full px-3.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Logo / Emblem */}
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {currentCompany?.logoUrl ? (
                    <img
                      src={currentCompany.logoUrl}
                      alt={currentCompany.name || "Logo"}
                      className="w-full h-full object-contain rounded-xl bg-white dark:bg-slate-900 p-0.5"
                    />
                  ) : (
                    <span className="font-black text-white text-xs tracking-tight">
                      {currentCompany?.name ? currentCompany.name.substring(0, 2).toUpperCase() : "ZK"}
                    </span>
                  )}
                </div>

                {/* Title & Organization Subtitle */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate tracking-tight">
                      {currentCompany?.name || "ZKTECO CLOUD"}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="System Online" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    <span className="truncate">{currentCompany?.khmerName || "Enterprise Attendance"}</span>
                    {currentCompany?.plan && (
                      <span className="px-1 py-0.2 rounded font-bold text-[8px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono shrink-0">
                        {currentCompany.plan}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button on Mobile / Collapse Button on Desktop */}
              {isMobile ? (
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close menu"
                >
                  <X size={18} />
                </button>
              ) : (
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={17} />
                </button>
              )}
            </div>
          ) : (
            /* Perfectly Centered Logo & Expand Button in Collapsed Mode */
            <div className="w-full flex items-center justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="relative group w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 p-0.5 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/20 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                title="Expand sidebar"
              >
                {currentCompany?.logoUrl ? (
                  <img
                    src={currentCompany.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain rounded-xl bg-white dark:bg-slate-900 p-0.5"
                  />
                ) : (
                  <span className="font-black text-white text-xs">
                    {currentCompany?.name ? currentCompany.name.substring(0, 2).toUpperCase() : "ZK"}
                  </span>
                )}
                {/* Expand overlay on hover */}
                <div className="absolute inset-0 bg-slate-950/75 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <ChevronRight size={16} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Quick Menu Filter (Only when expanded) */}
        {isExpanded && (
          <div className="px-3 pt-2.5 pb-1 shrink-0">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ស្វែងរកទំព័រ (Filter menu)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-7 pr-6 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List - STRICTLY NO HORIZONTAL SCROLLBAR */}
        <div
          onScroll={() => setTooltip(null)}
          style={{
            overflowX: "hidden",
            maxWidth: "100%",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className={cn(
            "flex-1 sidebar-scroll-container py-2 space-y-2.5 overflow-x-hidden overflow-y-auto select-none",
            collapsed ? "px-1.5" : "px-2"
          )}
        >
          {filteredNavSections.map((section) => {
            const isSectionCollapsed = Boolean(collapsedSections[section.id]) && !searchFilter;

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Section Title Header */}
                {isExpanded && (
                  <div
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none group"
                  >
                    <span className="truncate">{section.title}</span>
                    <ChevronDown
                      size={12}
                      className={cn(
                        "text-slate-400 transition-transform duration-200",
                        isSectionCollapsed ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </div>
                )}

                {/* Section Items */}
                {!isSectionCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <div key={item.href} className="w-full flex justify-center overflow-hidden">
                          <Link
                            href={item.href}
                            onClick={() => isMobile && setMobileSidebarOpen(false)}
                            onMouseEnter={(e) => {
                              if (collapsed && !isMobile) {
                                const r = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  name: item.name,
                                  khmerName: item.khmerName,
                                  badge: item.badge,
                                  y: r.top + r.height / 2,
                                });
                              }
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            className={cn(
                              "relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150",
                              isExpanded ? "w-full gap-2.5 px-2.5 py-2" : "w-10 h-10 mx-auto justify-center",
                              active
                                ? "bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            {/* Active Left Pill Indicator */}
                            {active && isExpanded && (
                              <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-xs" />
                            )}

                            {/* Icon */}
                            <div
                              className={cn(
                                "flex items-center justify-center shrink-0 transition-colors",
                                active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                              )}
                            >
                              <Icon size={18} />
                            </div>

                            {/* Label & Khmer Subtitle (when expanded) */}
                            {isExpanded && (
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5 overflow-hidden">
                                <span className="truncate leading-tight text-xs">{item.name}</span>

                                {/* Micro Badges */}
                                {item.badge && (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.2 rounded font-extrabold text-[8px] tracking-wider uppercase shrink-0 shadow-2xs",
                                      item.badgeColor === "emerald"
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : item.badgeColor === "indigo"
                                        ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                        : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                    )}
                                  >
                                    {item.badge === "LIVE" ? (
                                      <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>LIVE</span>
                                      </span>
                                    ) : (
                                      item.badge
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Card & Bottom Action Bar */}
        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className={cn("flex items-center justify-between w-full", collapsed && !isMobile ? "flex-col gap-2" : "gap-2")}>
            {isExpanded ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 to-indigo-100 dark:from-slate-800 dark:to-indigo-950/80 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 ring-1 ring-slate-300 dark:ring-slate-700">
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : "AD"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.fullName || user?.username || "Admin"}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                    <span className="px-1 py-0.2 rounded font-bold text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate">
                      {isSuperAdmin ? "SUPER ADMIN" : user?.roles?.[0] || "ADMIN"}
                    </span>
                    <span className="font-mono text-[9px] truncate">
                      ({user?.companyCode || "default"})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative shrink-0 mx-auto">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 to-indigo-100 dark:from-slate-800 dark:to-indigo-950/80 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 ring-1 ring-slate-300 dark:ring-slate-700">
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : "AD"}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
            )}

            {/* Quick Actions */}
            <div className={cn("flex items-center gap-0.5 shrink-0", collapsed && !isMobile ? "flex-col" : "")}>
              <Link
                href="/settings"
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                title="System Settings"
              >
                <Settings size={16} />
              </Link>

              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
                title="Sign out (ចាកចេញ)"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 transition-all duration-300 select-none z-20 shrink-0 relative overflow-hidden",
          collapsed ? "w-[72px]" : "w-64 lg:w-[260px]"
        )}
      >
        {navContent(false)}

        {/* Global Floating Tooltip Outside the Scroll Container (Zero Horizontal Scroll!) */}
        {collapsed && tooltip && (
          <div
            className="fixed left-[78px] px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800 text-white text-xs font-semibold shadow-2xl border border-slate-700/80 pointer-events-none z-[9999] whitespace-nowrap flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: `${tooltip.y}px`, transform: "translateY(-50%)" }}
          >
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs leading-tight">{tooltip.name}</span>
              <span className="text-[10px] text-slate-400 leading-tight">{tooltip.khmerName}</span>
            </div>
            {tooltip.badge && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-600 text-white">
                {tooltip.badge}
              </span>
            )}
            {/* Arrow */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900/95 dark:bg-slate-800 rotate-45 border-l border-b border-slate-700/80" />
          </div>
        )}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-[280px] max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250 select-none border-r border-slate-200 dark:border-slate-800 overflow-hidden">
            {navContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
