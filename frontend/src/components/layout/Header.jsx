"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, Globe, Clock, Menu } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

export default function Header() {
  const { darkMode, toggleDarkMode, language, setLanguage, toggleMobileSidebar } = useThemeStore();
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Phnom_Penh",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get("/api/v1/notifications/unread-count")
      .then((res) => setUnreadCount(res.data?.data || 0))
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 px-3 sm:px-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between sticky top-0 z-20 transition-all duration-200">
      {/* Mobile Hamburger & Phnom Penh Time */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Clock size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0 hidden xs:inline" />
          <span className="hidden md:inline text-slate-500 dark:text-slate-400 font-semibold">Phnom Penh:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wider">
            {currentTime || "00:00:00"}
          </span>
          <span className="text-[10px] text-slate-400 hidden lg:inline font-mono">(UTC+7)</span>
        </div>

        {/* Live Engine Indicator (visible on medium+ screens) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Biometric Engine Live</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === "en" ? "kh" : "en")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Toggle Language"
        >
          <Globe size={15} />
          <span className="hidden xs:inline">{language === "en" ? "EN" : "KH ខ្មែរ"}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-2xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-indigo-500/20">
            {user?.username ? user.username[0].toUpperCase() : "A"}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {user?.fullName || user?.username || "Admin"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium leading-none">
              {user?.roles?.[0] || "Administrator"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

