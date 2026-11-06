"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  Radio,
  UserCheck,
  CreditCard,
  Cpu,
  Layers,
  Fingerprint,
  Scan,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { formatTime } from "@/lib/utils";
import Portal from "@/components/common/Portal";

export default function AttendanceLiveKioskPage() {
  const [audioEnabled, setAudioEnabled] = useState(false); // Default to false to avoid duplicate echo with system daemon audio
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [lastLogId, setLastLogId] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [countdown, setCountdown] = useState(5);

  const audioRef = useRef(null);
  const lastAudioPlayedRef = useRef(0);
  const dismissTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-GB", { hour12: false })
      );
      setCurrentDateStr(
        now.toLocaleDateString("km-KH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll real-time biometric raw punch events with high-frequency 400ms interval
  const { data: liveScans } = useQuery({
    queryKey: ["live-scans-stream"],
    queryFn: async () => {
      const res = await api.get("/api/v1/attendance/live-scans?limit=15");
      return res.data?.data || [];
    },
    refetchInterval: 400,
    staleTime: 0,
    refetchIntervalInBackground: true,
  });

  // Handle auto-cleanup and 5-second countdown timer
  const triggerActiveScanWithCountdown = (record) => {
    setActiveScan(record);
    setCountdown(5);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let secLeft = 5;
    countdownIntervalRef.current = setInterval(() => {
      secLeft -= 1;
      setCountdown((prev) => Math.max(0, prev - 1));
      if (secLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    dismissTimerRef.current = setTimeout(() => {
      setActiveScan(null);
      setCountdown(5);
    }, 5000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Trigger audio and display on new punch event
  useEffect(() => {
    if (!liveScans || liveScans.length === 0) return;
    const latest = liveScans[0];
    if (!latest) return;

    // First load check: only display as active scan if punch was within the last 5 seconds
    if (lastLogId === null) {
      setLastLogId(latest.logId);
      if (latest.punchTime) {
        const punchAgeMs = Date.now() - new Date(latest.punchTime).getTime();
        if (punchAgeMs >= 0 && punchAgeMs <= 5000) {
          triggerActiveScanWithCountdown(latest);
        }
      }
      return;
    }

    // New punch event detected from hardware
    if (latest.logId !== lastLogId) {
      setLastLogId(latest.logId);
      triggerActiveScanWithCountdown(latest);
      // Audio is played natively once by the Linux system daemon (pw-play) with zero latency.
      // Browser audio autoplay is intentionally removed to prevent duplicate voice.
    }
  }, [liveScans, lastLogId]);

  // Synchronize fullscreen state with browser events (e.g. user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      // In case browser policy blocks requestFullscreen, still toggle UI fullscreen mode
      setIsFullscreen((prev) => !prev);
    }
  };

  const playTestVoice = () => {
    const snd = new Audio("/audio/khmer_thank_you.mp3");
    snd.play().catch(() => alert("Please click anywhere on page to enable audio"));
  };

  const dismissActiveScan = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveScan(null);
    setCountdown(5);
  };

  const kioskContent = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[999999] bg-slate-950 text-white flex flex-col p-4 sm:p-5 h-screen w-screen overflow-hidden select-none animate-in fade-in duration-200"
          : "space-y-6"
      }
    >
      {/* Kiosk Top Bar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40 ${
          isFullscreen ? "p-3.5 sm:p-4 shrink-0 mb-3" : "p-5"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <Radio size={isFullscreen ? 20 : 24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${isFullscreen ? "text-lg sm:text-xl" : "text-xl"} font-bold tracking-tight`}>
                Live Attendance Gate Kiosk
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ULTRA-FAST LIVE SYNC (400ms)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentDateStr} • ZKTeco IN01-A Dual Gate (192.168.1.201 & .202)
            </p>
          </div>
        </div>

        {/* Digital Clock & Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`font-mono ${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black tracking-wider text-emerald-400`}>
              {currentTime}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Phnom Penh Time (UTC+7)
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700/60 pl-4">
            {/* System Audio Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Volume2 size={15} />
              <span className="hidden sm:inline">System Audio Active</span>
            </div>

            {/* Test Voice Button */}
            <button
              onClick={playTestVoice}
              className="px-3 py-1.5 sm:py-2 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Test Khmer voice audio"
            >
              <Volume2 size={14} />
              <span>សាកល្បងសំឡេង</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Gate Display"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Kiosk Content */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 ${
          isFullscreen ? "flex-1 min-h-0 overflow-hidden" : "gap-6"
        }`}
      >
        {/* Left Column: Big Real-Time Scan Display Card */}
        <div
          className={`lg:col-span-7 xl:col-span-8 ${
            isFullscreen ? "h-full flex flex-col overflow-hidden" : "space-y-4"
          }`}
        >
          <div
            className={`relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between ${
              isFullscreen ? "h-full p-5 sm:p-7" : "p-7 min-h-[500px]"
            }`}
          >
            {/* Background Decorative Glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className={isFullscreen ? "flex-1 min-h-0 flex flex-col justify-between" : ""}>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-500" />
                  Biometric Verification Gate
                </span>
                
                {activeScan ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <Clock size={12} className="animate-spin" />
                      Auto-cleans in <strong className="font-mono text-sm">{countdown}s</strong>
                    </span>
                    <button
                      type="button"
                      onClick={dismissActiveScan}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Dismiss now"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready to Scan • ត្រៀមស្កេន
                  </span>
                )}
              </div>

              {activeScan ? (
                <div className={`animate-in fade-in zoom-in-95 duration-200 ${isFullscreen ? "space-y-4 py-3 flex-1 flex flex-col justify-around" : "pt-6 space-y-6"}`}>
                  {/* Countdown Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 5) * 100}%` }}
                    />
                  </div>

                  {/* Avatar & Names */}
                  <div className="flex items-start gap-5">
                    <div className={`${isFullscreen ? "w-20 h-20 sm:w-24 sm:h-24" : "w-24 h-24"} rounded-3xl bg-linear-to-tr from-emerald-500 to-indigo-600 p-1 shadow-lg shadow-emerald-500/20 shrink-0`}>
                      <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-2xl text-slate-800 dark:text-white uppercase overflow-hidden">
                        {activeScan.profileImageUrl ? (
                          <img src={activeScan.profileImageUrl} alt={activeScan.personnelName} className="w-full h-full object-cover" />
                        ) : (
                          activeScan.personnelName ? activeScan.personnelName.substring(0, 2) : "ZK"
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          activeScan.personnelType === "TEACHER"
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                            : activeScan.personnelType === "STUDENT"
                            ? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                            : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        }`}>
                          {activeScan.personnelType === "TEACHER"
                            ? "👨‍🏫 គ្រូបង្រៀន (Teacher)"
                            : activeScan.personnelType === "STUDENT"
                            ? "🎓 សិស្ស (Student)"
                            : "💼 បុគ្គលិក (Employee)"}
                        </span>

                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          ID: {activeScan.personnelCode || activeScan.devicePin}
                        </span>

                        {activeScan.cardNumber && (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <CreditCard size={12} />
                            Card: {activeScan.cardNumber}
                          </span>
                        )}
                      </div>

                      {/* Khmer Name Highlight */}
                      {activeScan.personnelKhmerName && (
                        <div className={`${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black text-indigo-600 dark:text-indigo-400 tracking-tight`}>
                          {activeScan.personnelKhmerName}
                        </div>
                      )}

                      {/* English Name */}
                      <h2 className={`${isFullscreen ? "text-2xl sm:text-3xl" : "text-3xl"} font-extrabold text-slate-900 dark:text-white tracking-tight truncate`}>
                        {activeScan.personnelName}
                      </h2>

                      {/* Class or Department */}
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers size={14} className="text-slate-400" />
                        <span>{activeScan.departmentOrClass || "General Campus"}</span>
                      </p>
                    </div>
                  </div>

                  {/* High Visibility Khmer Confirmation Banner */}
                  <div className={`rounded-2xl bg-linear-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center gap-4 shadow-sm ${isFullscreen ? "p-3.5 sm:p-4" : "p-5"}`}>
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse shrink-0">
                      <CheckCircle2 size={isFullscreen ? 26 : 32} />
                    </div>
                    <div>
                      <div className={`${isFullscreen ? "text-lg sm:text-xl" : "text-xl"} font-black text-emerald-700 dark:text-emerald-300 tracking-wide`}>
                        សូមអរគុណសម្រាប់ការចុះវត្តមាន!
                      </div>
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Scan Verified Successfully • Punch State: {activeScan.punchState || "CHECK_IN"} • Auto-cleans in {countdown}s
                      </div>
                    </div>
                  </div>

                  {/* Punch Details Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className={`${isFullscreen ? "p-2.5 sm:p-3" : "p-3.5"} rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800`}>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ម៉ោងស្កេន (Punch Time)</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock size={16} className="text-indigo-500" />
                        {activeScan.punchTime ? formatTime(activeScan.punchTime) : "--:--:--"}
                      </span>
                    </div>

                    <div className={`${isFullscreen ? "p-2.5 sm:p-3" : "p-3.5"} rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800`}>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ឧបករណ៍ស្កេន (Terminal Gate)</span>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                        <Cpu size={14} className="text-emerald-500" />
                        <span>{activeScan.deviceName || activeScan.deviceSn || "IN01-A"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* High-Tech Standby Screen */
                <div className={`text-center space-y-5 animate-in fade-in duration-300 ${isFullscreen ? "py-8 my-auto flex flex-col items-center justify-center" : "py-14"}`}>
                  {/* Radar Pulse Sensor Visual */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-75" />
                    <div className="absolute inset-2 rounded-full bg-indigo-500/10 animate-pulse" />
                    <div className="w-24 h-24 rounded-3xl bg-linear-to-tr from-emerald-500/20 via-indigo-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl">
                      <Fingerprint size={48} className="animate-pulse text-emerald-500" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h2 className={`${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black text-slate-800 dark:text-white tracking-tight`}>
                      សូមស្កេនកាត ឬដាក់ម្រាមដៃលើម៉ាស៊ីន
                    </h2>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      Ready to Scan • Present RFID Card or Biometric Fingerprint
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Dual Gate Terminals (192.168.1.201 & 192.168.1.202) are armed and listening in real-time. Results will flash here for 5s.
                    </p>
                  </div>

                  {/* Device Gate Status Chips */}
                  <div className="inline-flex flex-wrap items-center justify-center gap-3 pt-2">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Gate 1 (192.168.1.201): Online
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Gate 2 (192.168.1.202): Online
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-indigo-500" />
                      Latency: &lt; 2ms Direct DB
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span>🔊 សំឡេងកុំព្យូទ័រ: បើកស្វ័យប្រវត្តិ (សូមអរគុណសម្រាប់ការចុះវត្តមាន)</span>
              <span>Ultra-Fast Real-Time Biometric Stream • Auto-cleans after 5 seconds</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Today Scans List */}
        <div
          className={`lg:col-span-5 xl:col-span-4 ${
            isFullscreen ? "h-full flex flex-col overflow-hidden" : "space-y-4"
          }`}
        >
          <div
            className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col ${
              isFullscreen ? "h-full p-4 sm:p-5 overflow-hidden" : "p-5 space-y-4"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Live Attendance Scans Stream
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {liveScans?.length || 0} Punches
              </span>
            </div>

            <div
              className={`space-y-2.5 overflow-y-auto pr-1 ${
                isFullscreen ? "flex-1 min-h-0" : "max-h-[500px]"
              }`}
            >
              {liveScans?.map((record) => {
                const isSelected = activeScan?.logId === record.logId;
                return (
                  <div
                    key={record.logId}
                    onClick={() => triggerActiveScanWithCountdown(record)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                        {record.personnelName ? record.personnelName.substring(0, 2).toUpperCase() : "ZK"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                          {record.personnelKhmerName ? `${record.personnelKhmerName} • ` : ""}{record.personnelName}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {record.personnelType} • {record.departmentOrClass || "Campus"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                        {record.punchTime ? formatTime(record.punchTime) : "--:--"}
                      </span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {record.punchState || "CHECK_IN"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return <Portal>{kioskContent}</Portal>;
  }

  return kioskContent;
}
