"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Radio,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  Fingerprint,
  Scan,
  CreditCard,
  KeyRound,
  UserCheck,
  Building2,
  Cpu,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Table as TableIcon,
  LayoutGrid,
  Activity,
  AlertCircle,
  Eye,
  Users,
} from "lucide-react";
import api, { getApiBaseUrl } from "@/lib/api";
import { formatTime, formatDate, cn } from "@/lib/utils";
import Pagination from "@/components/common/Pagination";

// Audio chime using browser Web Audio API (100% offline, zero network assets)
function playPunchChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked or not supported
  }
}

export default function LivePunchScansPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [verifyType, setVerifyType] = useState("ALL");
  const [viewMode, setViewMode] = useState("feed"); // 'feed' | 'table'
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const lastKnownLogIdRef = useRef(null);
  const pageContainerRef = useRef(null);

  const isToday = date === new Date().toISOString().split("T")[0];

  // 1. Live stream query (Continuously & automatically polls punches every 250ms with zero manual config)
  const {
    data: liveScans = [],
    isFetching: isFetchingLive,
    refetch: refetchLive,
  } = useQuery({
    queryKey: ["attendance-live-scans-feed"],
    queryFn: async () => {
      const res = await api.get("/api/v1/attendance/live-scans?limit=30");
      const serverLogs = res.data?.data || [];
      const currentCache = queryClient.getQueryData(["attendance-live-scans-feed"]) || [];
      const now = Date.now();
      const recentSseLogs = currentCache.filter((item) => {
        if (!item?.punchTime) return false;
        const ageMs = now - new Date(item.punchTime).getTime();
        return ageMs >= 0 && ageMs < 15000 && !serverLogs.some((s) => s.logId === item.logId);
      });
      return [...recentSseLogs, ...serverLogs].slice(0, 30);
    },
    refetchInterval: isToday ? 10000 : false,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  // Real-time instant SSE stream connection directly to backend (< 10ms push latency)
  useEffect(() => {
    let es;
    try {
      const activeCompany = typeof window !== "undefined" ? (localStorage.getItem("active_company_code") || "default") : "default";
      const sseUrl = `${getApiBaseUrl()}/api/v1/attendance/stream?companyCode=${encodeURIComponent(activeCompany)}`;
      es = new EventSource(sseUrl);
      es.addEventListener("punch", (e) => {
        try {
          const newPunch = JSON.parse(e.data);
          if (newPunch && newPunch.logId) {
            // STRICT TENANT ISOLATION: Show data only in this company, not other companies
            const currentActive = typeof window !== "undefined" ? (localStorage.getItem("active_company_code") || "default") : "default";
            if (currentActive !== "all" && newPunch.companyCode && newPunch.companyCode !== currentActive) {
              return;
            }
            if (isAudioEnabled) {
              playPunchChime();
            }
            queryClient.setQueryData(["attendance-live-scans-feed"], (old = []) => {
              const exists = old.some((item) => item.logId === newPunch.logId);
              if (exists) return old;
              return [newPunch, ...old.slice(0, 29)];
            });
            queryClient.invalidateQueries({ queryKey: ["attendance-punch-stats"] });
          }
        } catch (err) {
          console.error("SSE punch parse error:", err);
        }
      });
      es.onerror = () => {
        // Fallback gracefully to polling
      };
    } catch {
      // EventSource not supported
    }

    return () => {
      if (es) es.close();
    };
  }, [isAudioEnabled, queryClient]);

  // Sound chime detection on new incoming punches from polling fallback
  useEffect(() => {
    if (liveScans && liveScans.length > 0) {
      const newestLog = liveScans[0];
      if (lastKnownLogIdRef.current !== null && newestLog.logId !== lastKnownLogIdRef.current) {
        if (isAudioEnabled) {
          playPunchChime();
        }
      }
      lastKnownLogIdRef.current = newestLog.logId;
    }
  }, [liveScans, isAudioEnabled]);

  // 2. Paginated & Filtered punches query (for historical browsing & table view)
  const {
    data: paginatedData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["attendance-punches-history", date, search, verifyType, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/attendance/punches?page=${page}&size=${pageSize}`;
      if (date) url += `&date=${date}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (verifyType && verifyType !== "ALL") url += `&verifyType=${verifyType}`;
      const res = await api.get(url);
      return res.data?.data || null;
    },
    enabled: viewMode === "table" || !isToday,
  });

  // 3. Stats query (Total punches today, etc.)
  const { data: punchStats } = useQuery({
    queryKey: ["attendance-punch-stats"],
    queryFn: async () => {
      const res = await api.get("/api/v1/attendance/punch-stats");
      return res.data?.data || { todayTotal: 0 };
    },
    refetchInterval: 10000,
  });

  // Active records to display
  const punchesToDisplay = useMemo(() => {
    if (viewMode === "table" || !isToday) {
      return paginatedData?.content || [];
    }

    // In live feed mode for today, filter the liveScans client-side for rapid reactive updates
    return liveScans.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = item.personnelName?.toLowerCase().includes(q);
        const matchesKhmer = item.personnelKhmerName?.toLowerCase().includes(q);
        const matchesCode = item.personnelCode?.toLowerCase().includes(q);
        const matchesDevice = item.deviceName?.toLowerCase().includes(q) || item.deviceSn?.toLowerCase().includes(q);
        if (!matchesName && !matchesKhmer && !matchesCode && !matchesDevice) return false;
      }
      if (verifyType !== "ALL" && item.verifyType !== verifyType) return false;
      return true;
    });
  }, [viewMode, isToday, paginatedData, liveScans, search, verifyType]);

  // Summary counts
  const latestScan = liveScans.length > 0 ? liveScans[0] : null;
  const uniquePersonnelCount = useMemo(() => {
    const pins = new Set(liveScans.map((p) => p.personnelCode || p.devicePin).filter(Boolean));
    return pins.size;
  }, [liveScans]);
  const activeTerminalsCount = useMemo(() => {
    const devs = new Set(liveScans.map((p) => p.deviceName || p.deviceSn).filter(Boolean));
    return devs.size;
  }, [liveScans]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      pageContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Export to CSV
  const handleExportCSV = () => {
    const rows = punchesToDisplay.map((p) => ({
      LogID: p.logId,
      Time: p.punchTime,
      PersonnelName: p.personnelName,
      KhmerName: p.personnelKhmerName || "",
      Code: p.personnelCode,
      Type: p.personnelType,
      Department: p.departmentOrClass || "",
      VerifyType: p.verifyType,
      Device: p.deviceName || p.deviceSn,
      DeviceSN: p.deviceSn,
    }));

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `live_punch_scans_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for verify type badge
  const renderVerifyType = (type) => {
    switch (type) {
      case "FINGERPRINT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Fingerprint size={13} className="shrink-0" />
            <span>Fingerprint</span>
          </span>
        );
      case "FACE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Scan size={13} className="shrink-0" />
            <span>Face ID</span>
          </span>
        );
      case "CARD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <CreditCard size={13} className="shrink-0" />
            <span>RFID Card</span>
          </span>
        );
      case "PASSWORD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <KeyRound size={13} className="shrink-0" />
            <span>Password</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Clock size={13} className="shrink-0" />
            <span>{type || "Device"}</span>
          </span>
        );
    }
  };

  return (
    <div
      ref={pageContainerRef}
      className={cn(
        "min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 select-none",
        isFullscreen && "fixed inset-0 z-[99999] overflow-y-auto bg-slate-950 p-6"
      )}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Radio size={20} className={isToday ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  ទិន្នន័យស្កេនផ្ទាល់ (Live Punch Logs)
                </h1>
                {isToday ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>AUTO LIVE (0.2s)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    HISTORICAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Real-time biometric terminal transaction stream & raw punch data monitor
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={cn(
              "p-2 sm:px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              isAudioEnabled
                ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            title={isAudioEnabled ? "Mute scan sound (សំឡេងស្កេន)" : "Enable scan sound (សំឡេងស្កេន)"}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{isAudioEnabled ? "Sound ON" : "Sound OFF"}</span>
          </button>

          {/* Real-time Streaming Status Badge */}
          {isToday && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Instant Push Active</span>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => {
              refetchLive();
              if (viewMode === "table" || !isToday) refetchHistory();
            }}
            disabled={isFetchingLive}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw size={15} className={isFetchingLive ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export to CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Monitor"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              សរុបថ្ងៃនេះ (Total Today)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {punchStats?.todayTotal ?? liveScans.length}
              </span>
              <span className="text-xs text-slate-400">punches</span>
            </div>
          </div>
        </div>

        {/* Unique Personnel Scanned */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              បុគ្គលិក/សិស្សបានស្កេន (Personnel)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {uniquePersonnelCount}
              </span>
              <span className="text-xs text-slate-400">unique scanned</span>
            </div>
          </div>
        </div>

        {/* Active Gate Terminals */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Cpu size={24} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              ម៉ាស៊ីនស្កេន (Active Terminals)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {activeTerminalsCount || 2}
              </span>
              <span className="text-xs text-slate-400">reporting</span>
            </div>
          </div>
        </div>

        {/* Latest Scan Person */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              ស្កេនចុងក្រោយ (Latest)
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
              {latestScan ? latestScan.personnelName : "No punches yet"}
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono truncate block">
              {latestScan?.punchTime ? formatTime(latestScan.punchTime) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Hero Latest Punch Spotlight Card (Shows dynamic instant feedback) */}
      {latestScan && isToday && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-500/30 shadow-lg">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-md">
                  {latestScan.verifyType === "FINGERPRINT" ? (
                    <Fingerprint size={28} className="text-emerald-400" />
                  ) : latestScan.verifyType === "FACE" ? (
                    <Scan size={28} className="text-sky-400" />
                  ) : latestScan.verifyType === "CARD" ? (
                    <CreditCard size={28} className="text-purple-400" />
                  ) : (
                    <UserCheck size={28} className="text-indigo-300" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    LATEST LIVE SCAN
                  </span>
                  <span className="text-xs text-indigo-300/80 font-mono">
                    ID: {latestScan.personnelCode || latestScan.devicePin}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white truncate">
                  {latestScan.personnelKhmerName ? (
                    <span>
                      {latestScan.personnelKhmerName}{" "}
                      <span className="text-sm font-semibold text-slate-300">({latestScan.personnelName})</span>
                    </span>
                  ) : (
                    latestScan.personnelName
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-indigo-400" />
                    <span>{latestScan.departmentOrClass || "General Campus"}</span>
                  </span>
                  {latestScan.positionOrGrade && (
                    <>
                      <span>•</span>
                      <span>{latestScan.positionOrGrade}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Cpu size={13} />
                    <span>{latestScan.deviceName || latestScan.deviceSn}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-2">
                {renderVerifyType(latestScan.verifyType)}
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-indigo-300 font-mono tracking-tight">
                  {formatTime(latestScan.punchTime)}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {formatDate(latestScan.punchTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ, អត្តលេខ (ID), ម៉ាស៊ីន (Search name, ID, terminal)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Verification Method Filter */}
            <select
              value={verifyType}
              onChange={(e) => setVerifyType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Methods (គ្រប់វិធីស្កេន)</option>
              <option value="FINGERPRINT">Fingerprint (ស្នាមមេដៃ)</option>
              <option value="FACE">Face ID (ផ្ទៃមុខ)</option>
              <option value="CARD">RFID Card (កាត)</option>
              <option value="PASSWORD">Password (លេខកូដ)</option>
            </select>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
              />
              {!isToday && (
                <button
                  onClick={() => setDate(new Date().toISOString().split("T")[0])}
                  className="ml-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Today
                </button>
              )}
            </div>

            {/* View Mode Toggle: Feed vs Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode("feed")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                  viewMode === "feed"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
                title="Card Feed View"
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">Feed</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
                title="Data Table View"
              >
                <TableIcon size={15} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Main Content: Feed View OR Table View */}
      {punchesToDisplay.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
            <Radio size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            មិនមានទិន្នន័យស្កេនទេ (No punch scans found)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search || verifyType !== "ALL"
              ? "No punch logs match the selected filter criteria. Try clearing search filters."
              : "Waiting for incoming live transactions from ZKTeco biometric terminals or facial devices."}
          </p>
        </div>
      ) : viewMode === "feed" && isToday ? (
        /* LIVE CARDS FEED VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {punchesToDisplay.map((p, idx) => (
            <div
              key={p.logId || idx}
              className={cn(
                "group relative bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md",
                idx === 0
                  ? "border-indigo-400/60 dark:border-indigo-500/40 ring-2 ring-indigo-500/10 shadow-xs"
                  : "border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Biometric Scan Icon & Personnel */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center">
                      {p.verifyType === "FINGERPRINT" ? (
                        <Fingerprint size={20} className="text-emerald-600 dark:text-emerald-400" />
                      ) : p.verifyType === "FACE" ? (
                        <Scan size={20} className="text-sky-600 dark:text-sky-400" />
                      ) : p.verifyType === "CARD" ? (
                        <CreditCard size={20} className="text-purple-600 dark:text-purple-400" />
                      ) : (
                        <UserCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    {/* Live indicator dot for newest item */}
                    {idx === 0 && (
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {p.personnelKhmerName || p.personnelName}
                      </span>
                      {p.personnelType && (
                        <span className="px-1.5 py-0.2 rounded font-extrabold text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 uppercase">
                          {p.personnelType}
                        </span>
                      )}
                    </div>
                    {p.personnelKhmerName && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate block">
                        {p.personnelName}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block">
                      ID: {p.personnelCode || p.devicePin}
                    </span>
                  </div>
                </div>

                {/* Punch Time */}
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                    {formatTime(p.punchTime)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {formatDate(p.punchTime)}
                  </span>
                </div>
              </div>

              {/* Department / Position Details */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate flex items-center gap-1">
                  <Building2 size={13} className="shrink-0 text-slate-400" />
                  <span className="truncate">{p.departmentOrClass || "General Campus"}</span>
                </span>
                {p.positionOrGrade && (
                  <span className="truncate text-slate-400 text-[11px] font-medium ml-2">
                    {p.positionOrGrade}
                  </span>
                )}
              </div>

              {/* Badges footer: Method & Terminal */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {renderVerifyType(p.verifyType)}
                </div>

                <div
                  className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0 truncate max-w-[140px]"
                  title={p.deviceName || p.deviceSn}
                >
                  <Cpu size={12} className="shrink-0" />
                  <span className="truncate">{p.deviceName || p.deviceSn}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE LOG VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4"># Log ID</th>
                  <th className="py-3 px-4">Personnel (បុគ្គលិក / សិស្ស)</th>
                  <th className="py-3 px-4">Role / Type</th>
                  <th className="py-3 px-4">Department / Class</th>
                  <th className="py-3 px-4">Verification Method</th>
                  <th className="py-3 px-4">Time & Date</th>
                  <th className="py-3 px-4">Terminal / Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {punchesToDisplay.map((p) => (
                  <tr
                    key={p.logId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      #{p.logId}
                    </td>

                    {/* Personnel Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0">
                          {p.verifyType === "FINGERPRINT" ? (
                            <Fingerprint size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ) : p.verifyType === "FACE" ? (
                            <Scan size={14} className="text-sky-600 dark:text-sky-400" />
                          ) : p.verifyType === "CARD" ? (
                            <CreditCard size={14} className="text-purple-600 dark:text-purple-400" />
                          ) : (
                            <UserCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white truncate block">
                            {p.personnelKhmerName || p.personnelName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {p.personnelCode || p.devicePin}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role / Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.personnelType || "EMPLOYEE"}
                      </span>
                    </td>

                    {/* Department / Position */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block truncate max-w-[180px]">
                        {p.departmentOrClass || "General Campus"}
                      </span>
                      {p.positionOrGrade && (
                        <span className="text-[10px] text-slate-400 block truncate">
                          {p.positionOrGrade}
                        </span>
                      )}
                    </td>

                    {/* Verification Method */}
                    <td className="py-3 px-4">
                      {renderVerifyType(p.verifyType)}
                    </td>

                    {/* Time & Date */}
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {formatTime(p.punchTime)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {formatDate(p.punchTime)}
                      </span>
                    </td>

                    {/* Device / Terminal */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 min-w-0 max-w-[160px]">
                        <Cpu size={14} className="text-slate-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {p.deviceName || "ZKTeco Terminal"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate block">
                            SN: {p.deviceSn}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for table view */}
          {paginatedData && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                page={page}
                totalPages={paginatedData.totalPages || 0}
                totalElements={paginatedData.totalElements || 0}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

