"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, Globe, Clock } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

export default function Header() {
  const { darkMode, toggleDarkMode, language, setLanguage } = useThemeStore();
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
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
      {/* Phnom Penh Time & System Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
          <Clock size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Asia/Phnom_Penh:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {currentTime || "00:00:00"}
          </span>
          <span className="text-[10px] text-slate-400">(UTC+7)</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === "en" ? "kh" : "en")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Language"
        >
          <Globe size={16} />
          <span>{language === "en" ? "EN" : "KH ខ្មែរ"}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
            {user?.username ? user.username[0].toUpperCase() : "A"}
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white hidden sm:inline">
            {user?.fullName || user?.username || "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}

