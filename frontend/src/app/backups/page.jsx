"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HardDrive,
  Cloud,
  Calendar,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Key,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  FileArchive,
  Info,
  CalendarDays,
  Settings2,
  Database,
  ArrowRight,
  X,
  UserCheck,
  LogIn,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

export default function BackupsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("history"); // history | schedule | gdrive
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showVisualGuide, setShowVisualGuide] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Form state for schedule & cloud sync
  const [formData, setFormData] = useState({
    enabled: true,
    frequency: "DAILY",
    backupTime: "02:00",
    backupDayOfWeek: "MONDAY",
    cronExpression: "0 0 2 * * *",
    retentionDays: 30,
    includeUploads: false,
    gdriveEnabled: false,
    gdriveFolderId: "",
    gdriveAuthType: "OAUTH2", // OAUTH2 or SERVICE_ACCOUNT
    gdriveClientId: "",
    gdriveClientSecret: "",
    gdriveServiceAccountJson: "",
  });

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isExchangingOAuth, setIsExchangingOAuth] = useState(false);

  const showToast = (message, type = "success") => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Fetch Configuration
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ["backup-config"],
    queryFn: async () => {
      const res = await api.get("/api/v1/backups/config");
      return res.data?.data;
    },
  });

  // Sync config into formData when loaded
  useEffect(() => {
    if (config) {
      setFormData((prev) => ({
        ...prev,
        enabled: config.enabled ?? true,
        frequency: config.frequency || "DAILY",
        backupTime: config.backupTime || "02:00",
        backupDayOfWeek: config.backupDayOfWeek || "MONDAY",
        cronExpression: config.cronExpression || "0 0 2 * * *",
        retentionDays: config.retentionDays || 30,
        includeUploads: config.includeUploads ?? false,
        gdriveEnabled: config.gdriveEnabled ?? false,
        gdriveFolderId: config.gdriveFolderId || "",
        gdriveAuthType: config.gdriveAuthType || "OAUTH2",
        gdriveClientId: config.gdriveClientId || "",
        gdriveClientSecret: "", // Never returned from server for security
        gdriveServiceAccountJson: "", // Keep empty unless updating
      }));
    }
  }, [config]);

  // Handle incoming OAuth 2.0 callback with code
  const exchangeOAuthCode = async (code, clientId, clientSecret, folderId) => {
    setIsExchangingOAuth(true);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await api.post("/api/v1/backups/gdrive/oauth-exchange", {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        code: code.trim(),
        redirectUri: redirectUri,
        folderId: folderId ? folderId.trim() : undefined,
      });

      const data = res.data?.data;
      if (data?.success) {
        showToast(data.message || "Google Drive connected successfully!", "success");
        queryClient.invalidateQueries(["backup-config"]);
        localStorage.removeItem("gdrive_oauth_flow");
      } else {
        showToast(data?.error || "OAuth authorization failed", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "OAuth exchange failed", "error");
    } finally {
      setIsExchangingOAuth(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get("code");
      if (authCode) {
        setActiveTab("gdrive");
        let clientId = formData.gdriveClientId || config?.gdriveClientId || "";
        let clientSecret = formData.gdriveClientSecret || "";
        let folderId = formData.gdriveFolderId || config?.gdriveFolderId || "";

        const cached = localStorage.getItem("gdrive_oauth_flow");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.clientId) clientId = parsed.clientId;
            if (parsed.clientSecret) clientSecret = parsed.clientSecret;
            if (parsed.folderId) folderId = parsed.folderId;
          } catch (e) {}
        }

        if (clientId && clientSecret) {
          exchangeOAuthCode(authCode, clientId, clientSecret, folderId);
        } else {
          showToast("Google authorization code received! Enter Client Secret & Click Connect.", "info");
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [config]);

  // 2. Fetch Backups List
  const { data: backups = [], isLoading: isListLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["backup-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/backups");
      return res.data?.data || [];
    },
  });

  // 3. Trigger Backup Mutation
  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/backups/run");
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["backup-list"]);
      queryClient.invalidateQueries(["backup-config"]);
      if (data?.status === "SUCCESS") {
        showToast(`បម្រុងទុកបានជោគជ័យ! Created ${data.filename} (${data.formattedSize})`, "success");
      } else {
        showToast(`Backup error: ${data?.errorMessage || "Unknown error"}`, "error");
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.message || err.message || "Failed to trigger backup", "error");
    },
  });

  // 4. Save Config Mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/api/v1/backups/config", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["backup-config"]);
      showToast("បានរក្សាទុកការកំណត់ដោយជោគជ័យ (Settings saved successfully)", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.message || err.message || "Failed to save settings", "error");
    },
  });

  // 5. Delete Backup Mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/v1/backups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["backup-list"]);
      setDeleteConfirmId(null);
      showToast("បានលុបឯកសារបម្រុងទុក (Backup deleted)", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.message || err.message || "Failed to delete backup", "error");
    },
  });

  // Handle Download File
  const handleDownload = async (backup) => {
    try {
      showToast(`កំពុងទាញយក ${backup.filename}...`, "info");
      const res = await api.get(`/api/v1/backups/${backup.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", backup.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Download failed. File may no longer exist on server.", "error");
    }
  };

  // Test Google Drive Connection
  const handleTestGDrive = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload = {
        folderId: formData.gdriveFolderId || undefined,
      };
      if (formData.gdriveAuthType === "SERVICE_ACCOUNT" && formData.gdriveServiceAccountJson?.trim()) {
        payload.serviceAccountJson = formData.gdriveServiceAccountJson.trim();
      }
      const res = await api.post("/api/v1/backups/test-gdrive", payload);
      const data = res.data?.data;
      setTestResult(data);
      if (data?.success) {
        showToast("Google Drive Connected Successfully!", "success");
      } else {
        showToast(data?.error || "Connection test failed", "error");
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.message || err.message || "Network test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Launch Google OAuth 2.0 Sign In
  const handleSignInWithGoogle = () => {
    if (!formData.gdriveClientId?.trim()) {
      showToast("សូមបញ្ចូល Google Client ID ជាមុនសិន (Please enter Client ID)", "error");
      return;
    }
    if (!formData.gdriveClientSecret?.trim() && !config?.hasOAuthRefreshToken) {
      showToast("សូមបញ្ចូល Google Client Secret ជាមុនសិន (Please enter Client Secret)", "error");
      return;
    }

    const cache = {
      clientId: formData.gdriveClientId.trim(),
      clientSecret: formData.gdriveClientSecret?.trim() || "",
      folderId: formData.gdriveFolderId?.trim() || "",
    };
    localStorage.setItem("gdrive_oauth_flow", JSON.stringify(cache));

    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: formData.gdriveClientId.trim(),
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/drive",
        access_type: "offline",
        prompt: "consent",
      }).toString();

    window.location.href = authUrl;
  };

  // Handle Save
  const handleSaveSettings = (e) => {
    e.preventDefault();
    const payload = {
      enabled: formData.enabled,
      frequency: formData.frequency,
      backupTime: formData.backupTime,
      backupDayOfWeek: formData.backupDayOfWeek,
      cronExpression: formData.cronExpression,
      retentionDays: Number(formData.retentionDays) || 30,
      includeUploads: formData.includeUploads,
      gdriveEnabled: formData.gdriveEnabled,
      gdriveFolderId: formData.gdriveFolderId,
      gdriveAuthType: formData.gdriveAuthType,
      gdriveClientId: formData.gdriveClientId,
    };
    if (formData.gdriveClientSecret?.trim()) {
      payload.gdriveClientSecret = formData.gdriveClientSecret.trim();
    }
    if (formData.gdriveServiceAccountJson?.trim()) {
      payload.gdriveServiceAccountJson = formData.gdriveServiceAccountJson.trim();
    }
    saveConfigMutation.mutate(payload);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Compute Metrics
  const totalSizeBytes = backups.reduce((sum, b) => sum + (b.fileSizeBytes || 0), 0);
  const formatTotalSize = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              toastMsg.type === "error"
                ? "bg-rose-600 text-white"
                : toastMsg.type === "info"
                ? "bg-sky-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toastMsg.type === "error" ? (
              <AlertCircle size={18} />
            ) : toastMsg.type === "info" ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{toastMsg.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white">
                <HardDrive size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  ការបម្រុងទុកទិន្នន័យ (Database Backups)
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Automated PostgreSQL schedule, local archives, and Google Drive cloud storage
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetchBackups()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              title="Refresh backups list"
            >
              <RefreshCw size={16} className={isListLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => runBackupMutation.mutate()}
              disabled={runBackupMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {runBackupMutation.isPending ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>កំពុងបម្រុងទុក (Backing Up)...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-white" />
                  <span>បម្រុងទុកឥឡូវនេះ (Backup Now)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Total Backups */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Total Backups</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {backups.length} <span className="text-xs font-normal text-slate-400">files</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Disk Used: <strong className="text-slate-700 dark:text-slate-200">{formatTotalSize(totalSizeBytes)}</strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileArchive size={24} />
            </div>
          </div>

          {/* Metric 2: Last Backup */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Last Backup Run</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {config?.lastRunAt ? formatDate(config.lastRunAt) : "Never"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {config?.lastStatus === "SUCCESS" ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={11} /> SUCCESS
                  </span>
                ) : config?.lastStatus === "FAILED" ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <AlertCircle size={11} /> FAILED
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">No previous runs</span>
                )}
                {config?.lastRunAt && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatTime(config.lastRunAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>

          {/* Metric 3: Automated Schedule */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Auto Schedule</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {config?.enabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {config.frequency} @ {config.backupTime || "02:00"}
                  </span>
                ) : (
                  <span className="text-slate-400">Disabled</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Retention: <strong className="text-slate-700 dark:text-slate-200">{config?.retentionDays || 30} days</strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarDays size={24} />
            </div>
          </div>

          {/* Metric 4: Google Drive Sync */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Google Drive Cloud</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {config?.gdriveEnabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Sync Active
                  </span>
                ) : (
                  <span className="text-slate-400">Sync Disabled</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px]">
                {config?.gdriveAuthType === "OAUTH2"
                  ? config?.gdriveUserEmail || (config?.hasOAuthRefreshToken ? "Personal Google Drive" : "OAuth not linked")
                  : config?.gdriveServiceAccountEmail || "No service account"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud size={24} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Database size={16} />
            <span>ប្រវត្តិ និងឯកសារ (Backup Archives)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {backups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Clock size={16} />
            <span>កាលវិភាគស្វ័យប្រវត្តិ (Schedule & Retention)</span>
          </button>

          <button
            onClick={() => setActiveTab("gdrive")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "gdrive"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Cloud size={16} />
            <span>Google Drive Cloud Sync</span>
            {config?.gdriveEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: BACKUPS HISTORY & FILES                                            */}
        {/* ========================================================================= */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  បញ្ជីឯកសារបម្រុងទុក (Saved Database Archives)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compressed PostgreSQL database dumps (.sql.gz) ready for instant download or restoration
                </p>
              </div>
            </div>

            {isListLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mb-2" />
                <p className="text-xs">កំពុងផ្ទុកបញ្ជីបម្រុងទុក...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <HardDrive size={28} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">មិនទាន់មានឯកសារបម្រុងទុកនៅឡើយទេ</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  ចុចប៊ូតុង &ldquo;បម្រុងទុកឥឡូវនេះ (Backup Now)&rdquo; ដើម្បីបង្កើតឯកសារបម្រុងទុកជាលើកដំបូង។
                </p>
                <button
                  onClick={() => runBackupMutation.mutate()}
                  disabled={runBackupMutation.isPending}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>បម្រុងទុកឥឡូវនេះ</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
                    <tr>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Local Status</th>
                      <th className="py-3 px-4">Google Drive</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {backups.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <FileArchive size={16} className="text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[280px]" title={b.filename}>
                            {b.filename}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider ${
                              b.backupType === "SCHEDULED"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                            }`}
                          >
                            {b.backupType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {b.formattedSize || "0 B"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          <div>{formatDate(b.createdAt)}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {formatTime(b.createdAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {b.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={11} /> Saved
                            </span>
                          ) : b.status === "FAILED" ? (
                            <button
                              onClick={() => setSelectedLog({ ...b, errorType: "LOCAL_DUMP" })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition-colors cursor-pointer"
                              title="Click to view error log"
                            >
                              <AlertCircle size={11} /> Failed
                              <Info size={10} className="ml-0.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <RefreshCw size={11} className="animate-spin" /> In Progress
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {b.gdriveStatus === "UPLOADED" ? (
                            <a
                              href={b.gdriveWebViewLink || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                            >
                              <Cloud size={11} />
                              <span>Drive</span>
                              <ExternalLink size={9} />
                            </a>
                          ) : b.gdriveStatus === "FAILED" ? (
                            <button
                              onClick={() => setSelectedLog({ ...b, errorType: "GDRIVE_UPLOAD" })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition-colors cursor-pointer"
                              title="Click to view error log"
                            >
                              <AlertCircle size={11} /> Sync Failed
                              <Info size={10} className="ml-0.5" />
                            </button>
                          ) : b.gdriveStatus === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                              <RefreshCw size={11} className="animate-spin" /> Uploading...
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownload(b)}
                              disabled={b.status !== "SUCCESS"}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer disabled:opacity-40"
                              title="Download backup file"
                            >
                              <Download size={14} />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmId(b.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Delete backup"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SCHEDULE & RETENTION SETTINGS                                      */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Clock size={18} className="text-indigo-600" />
                  <span>កាលវិភាគស្វ័យប្រវត្តិ (Automated Backup Schedule)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Set recurring automated database backups to prevent data loss without manual intervention.
                </p>
              </div>

              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    បើកដំណើរការបម្រុងទុកស្វ័យប្រវត្តិ (Enable Automated Schedule)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    When active, the system automatically creates compressed database dumps according to the schedule below.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>

              {/* Frequency Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: "DAILY", label: "រាល់ថ្ងៃ (Daily)", desc: "Runs once every day at chosen time" },
                  { id: "WEEKLY", label: "រាល់សប្តាហ៍ (Weekly)", desc: "Runs on a specific day each week" },
                  { id: "HOURLY", label: "រាល់ម៉ោង (Hourly)", desc: "Runs every 60 minutes continuously" },
                  { id: "CUSTOM", label: "កំណត់ដោយខ្លួនឯង (Custom Cron)", desc: "Define precise standard cron expression" },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setFormData({ ...formData, frequency: item.id })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.frequency === item.id
                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                      {formData.frequency === item.id && (
                        <Check size={14} className="text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Dynamic Schedule Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {formData.frequency !== "HOURLY" && formData.frequency !== "CUSTOM" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ម៉ោងបម្រុងទុក (Backup Time of Day)
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        value={formData.backupTime}
                        onChange={(e) => setFormData({ ...formData, backupTime: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Recommended during off-peak hours (e.g., 02:00 AM)</p>
                  </div>
                )}

                {formData.frequency === "WEEKLY" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ថ្ងៃនៃសប្តាហ៍ (Day of Week)
                    </label>
                    <select
                      value={formData.backupDayOfWeek}
                      onChange={(e) => setFormData({ ...formData, backupDayOfWeek: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="MONDAY">Monday (ថ្ងៃច័ន្ទ)</option>
                      <option value="TUESDAY">Tuesday (ថ្ងៃអង្គារ)</option>
                      <option value="WEDNESDAY">Wednesday (ថ្ងៃពុធ)</option>
                      <option value="THURSDAY">Thursday (ថ្ងៃព្រហស្បតិ៍)</option>
                      <option value="FRIDAY">Friday (ថ្ងៃសុក្រ)</option>
                      <option value="SATURDAY">Saturday (ថ្ងៃសៅរ៍)</option>
                      <option value="SUNDAY">Sunday (ថ្ងៃអាទិត្យ)</option>
                    </select>
                  </div>
                )}

                {formData.frequency === "CUSTOM" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Cron Expression
                    </label>
                    <input
                      type="text"
                      value={formData.cronExpression}
                      onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                      placeholder="0 0 2 * * *"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Format: second minute hour day month day-of-week</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    រយៈពេលរក្សាទុក (Retention Policy)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.retentionDays}
                      onChange={(e) => setFormData({ ...formData, retentionDays: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ថ្ងៃ (days)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Backups older than this will be safely deleted automatically to save server disk space.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                <button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {saveConfigMutation.isPending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>រក្សាទុកកាលវិភាគ (Save Schedule)</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GOOGLE DRIVE CLOUD SYNC                                            */}
        {/* ========================================================================= */}
        {activeTab === "gdrive" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Cloud size={18} className="text-emerald-500" />
                    <span>Google Drive Cloud Backup Sync</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload each database backup directly into your Google Drive folder automatically.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVisualGuide(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    <span>📸 រូបភាពណែនាំ (Picture Guide)</span>
                  </button>

                  {/* Enable / Disable Cloud Sync Switch */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Sync
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.gdriveEnabled}
                        onChange={(e) => setFormData({ ...formData, gdriveEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Authentication Type Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  វិធីសាស្ត្រផ្ទៀងផ្ទាត់ (Authentication Method)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: Personal OAuth 2.0 (Recommended) */}
                  <label
                    className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      formData.gdriveAuthType === "OAUTH2"
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gdriveAuthType"
                      value="OAUTH2"
                      checked={formData.gdriveAuthType === "OAUTH2"}
                      onChange={(e) => setFormData({ ...formData, gdriveAuthType: e.target.value })}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Personal Google Account (OAuth 2.0)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500 text-white tracking-wider">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        ផ្ទុកឡើងផ្ទាល់ទៅកាន់ Google Drive ផ្ទាល់ខ្លួន (@gmail.com) ដោយប្រើ Refresh Token។ មិនជាប់កំហុសទំហំ 0 MB (No Quota Limit)។
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Service Account */}
                  <label
                    className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      formData.gdriveAuthType === "SERVICE_ACCOUNT"
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gdriveAuthType"
                      value="SERVICE_ACCOUNT"
                      checked={formData.gdriveAuthType === "SERVICE_ACCOUNT"}
                      onChange={(e) => setFormData({ ...formData, gdriveAuthType: e.target.value })}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Service Account (JSON Key)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        ប្រើប្រាស់ Bot Service Account JSON សម្រាប់ Google Workspace Shared / Team Drive ប៉ុណ្ណោះ។
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Shared Folder ID Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FolderOpen size={14} className="text-slate-400" />
                  <span>Google Drive Folder ID (លេខសម្គាល់ Folder គោលដៅ)</span>
                </label>
                <input
                  type="text"
                  value={formData.gdriveFolderId}
                  onChange={(e) => setFormData({ ...formData, gdriveFolderId: e.target.value })}
                  placeholder="e.g. 15fHZiDpQjqyVI0F_MTzfszIvf1c-gxC-"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Folder ID ពីតំណ Google Drive (ឧទាហរណ៍៖ <code>drive.google.com/drive/folders/<strong>15fHZiDpQjqyVI0F_MTzfszIvf1c-gxC-</strong></code>)
                </p>
              </div>

              {/* ========================================================= */}
              {/* MODE 1: PERSONAL OAUTH 2.0 SECTION                        */}
              {/* ========================================================= */}
              {formData.gdriveAuthType === "OAUTH2" && (
                <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  {/* Status Banner when Linked */}
                  {config?.hasOAuthRefreshToken ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                              Google Drive ផ្ទាល់ខ្លួនបានតភ្ជាប់ដោយជោគជ័យ (Linked)
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">
                              Active
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                            គណនី: <strong className="text-emerald-600 dark:text-emerald-400">{config.gdriveUserEmail || "Personal Google Account"}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSignInWithGoogle}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                      >
                        ផ្លាស់ប្តូរគណនី (Re-authenticate)
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                      <div className="flex items-start gap-3">
                        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">មិនទាន់បានតភ្ជាប់គណនី Google Drive (Not Connected Yet)</span>
                          <p className="mt-0.5 text-[11px] leading-relaxed">
                            បញ្ចូល Client ID និង Secret រួចចុច &ldquo;Sign in with Google&rdquo;។ ប្រសិនបើជួបផ្ទាំង &ldquo;Access Blocked / Unverified&rdquo; សូមមើលរូបភាពណែនាំ។
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowVisualGuide(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📸 មើលរូបភាពណែនាំ Bypass (Picture Guide)</span>
                      </button>
                    </div>
                  )}

                  {/* OAuth Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Google Client ID</span>
                        {config?.gdriveClientId && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Configured</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.gdriveClientId}
                        onChange={(e) => setFormData({ ...formData, gdriveClientId: e.target.value })}
                        placeholder="884517582498-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Google Client Secret</span>
                        {config?.hasOAuthRefreshToken && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Stored Securely</span>
                        )}
                      </label>
                      <input
                        type="password"
                        value={formData.gdriveClientSecret}
                        onChange={(e) => setFormData({ ...formData, gdriveClientSecret: e.target.value })}
                        placeholder={config?.hasOAuthRefreshToken ? "••••••••••••••••••••••••••••••••" : "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Big Sign In with Google Button */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        ចុចភ្ជាប់ជាមួយគណនី Google ផ្ទាល់ខ្លួន (1-Click Google OAuth)
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Redirects to Google OAuth &rarr; Choose your account &rarr; Grant Drive access &rarr; Returns back here automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignInWithGoogle}
                      disabled={isExchangingOAuth || !formData.gdriveClientId}
                      className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {/* Google G Logo SVG */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{config?.hasOAuthRefreshToken ? "ភ្ជាប់ឡើងវិញ (Re-connect with Google)" : "Sign in with Google"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* MODE 2: SERVICE ACCOUNT SECTION                           */}
              {/* ========================================================= */}
              {formData.gdriveAuthType === "SERVICE_ACCOUNT" && (
                <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                      <Info size={14} className="text-indigo-500" />
                      <span>ការណែនាំ Service Account (Google Workspace Shared Drive Only):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Service Accounts ដំណើរការបានតែលើ <strong>Google Workspace Shared Drives (Team Drives)</strong> ប៉ុណ្ណោះ។</li>
                      <li>Copy មាតិកាឯកសារ <code>.json</code> រួច paste ចូលក្នុងប្រអប់ខាងក្រោម។</li>
                      <li>Share Shared Drive របស់អ្នកទៅកាន់អ៊ីមែល Service Account ជាមួយសិទ្ធិ <strong>Content Manager</strong>។</li>
                    </ol>
                  </div>

                  {config?.gdriveServiceAccountEmail && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          Service Account Email:
                        </p>
                        <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {config.gdriveServiceAccountEmail}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(config.gdriveServiceAccountEmail)}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                        title="Copy email"
                      >
                        {copiedEmail ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key size={14} className="text-slate-400" />
                        <span>Google Service Account JSON Key</span>
                      </span>
                      {config?.hasServiceAccountJson && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Key Configured
                        </span>
                      )}
                    </label>
                    <textarea
                      rows={6}
                      value={formData.gdriveServiceAccountJson}
                      onChange={(e) => setFormData({ ...formData, gdriveServiceAccountJson: e.target.value })}
                      placeholder={
                        config?.hasServiceAccountJson
                          ? "Service account key is configured. Paste a new JSON here only if you wish to replace it."
                          : '{\n  "type": "service_account",\n  "client_email": "...",\n  ...\n}'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              )}

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    testResult.success
                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-500/30 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold">
                      {testResult.success ? "Connection Verified!" : "Connection Test Failed"}
                    </h5>
                    <p className="mt-0.5">{testResult.message || testResult.error}</p>
                    {testResult.folderName && (
                      <p className="mt-1 font-mono text-[11px]">
                        Target Folder: <strong>{testResult.folderName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleTestGDrive}
                  disabled={isTesting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw size={15} className="animate-spin text-indigo-500" />
                  ) : (
                    <ShieldCheck size={15} className="text-emerald-500" />
                  )}
                  <span>សាកល្បងការតភ្ជាប់ (Test Connection)</span>
                </button>

                <button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {saveConfigMutation.isPending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>រក្សាទុកការកំណត់ Google Drive (Save Cloud Settings)</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Debug Log & Error Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      ព័ត៌មានលម្អិតកំហុស និង Log (Error Details & Debug)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {selectedLog.filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                {/* Stage & Meta */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">កាលបរិច្ឆេទ (Timestamp)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(selectedLog.createdAt)} {formatTime(selectedLog.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">ដំណាក់កាលបរាជ័យ (Failed Stage)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {selectedLog.errorType === "GDRIVE_UPLOAD" ? "Google Drive Cloud Upload" : "Database Dump (pg_dump)"}
                    </span>
                  </div>
                </div>

                {/* Specific explanation if storageQuotaExceeded */}
                {selectedLog.gdriveError?.includes("storageQuotaExceeded") && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <Info size={14} />
                      <span>Google Policy: Service Accounts do not have storage quota on personal Gmail</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Google considers the Service Account bot as the owner of the uploaded file. For standard personal <code>@gmail.com</code> accounts, Google assigns bots 0 MB of storage quota.
                    </p>
                    <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                      <strong>ដំណោះស្រាយ (Recommended Solution):</strong> Move or create your backup folder inside a <strong>Google Workspace Shared Drive (Team Drive)</strong> and grant the service account <em>Content Manager</em> access.
                    </p>
                  </div>
                )}

                {/* Raw Error Log */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      សារកំហុសលម្អិត (Raw Error Message / Trace)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const errText = selectedLog.gdriveError || selectedLog.errorMessage || "No error details";
                        navigator.clipboard.writeText(errText);
                        setCopiedLog(true);
                        setTimeout(() => setCopiedLog(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedLog ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedLog ? "បានចម្លង (Copied!)" : "ចម្លង Log (Copy)"}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all border border-slate-800 max-h-56">
                    {selectedLog.gdriveError || selectedLog.errorMessage || "No error details available"}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  បិទ (Close)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Guide Modal for Google Bypass */}
        {showVisualGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                    📸
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      រូបភាពណែនាំ Bypass Google (Step-by-Step Picture Guide)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      របៀបដោះស្រាយផ្ទាំង &ldquo;Access Blocked / Unverified App&rdquo; ក្នុងរយៈពេល ១ នាទី
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVisualGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                {/* Step 1 Visual Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs">1</span>
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                        បញ្ចូល Gmail របស់អ្នកទៅក្នុង &ldquo;Test Users&rdquo;
                      </h5>
                    </div>
                    <a
                      href="https://console.cloud.google.com/apis/credentials/consent?project=884517582498"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1"
                    >
                      <span>បើក Google Console</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    រំកិលចុះក្រោមក្នុងទំព័រ <strong>OAuth consent screen</strong> &rarr; រកមើលប្រអប់ <strong>Test users</strong> &rarr; ចុច <strong>+ ADD USERS</strong> &rarr; សរសេរ Gmail ផ្ទាល់ខ្លួនរបស់អ្នក រួចចុច <strong>SAVE</strong>។
                  </p>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-700 dark:text-slate-300">Test users &bull; [ + ADD USERS ]</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">&larr; បញ្ចូល Gmail របស់អ្នកត្រង់នេះ</span>
                  </div>
                </div>

                {/* Step 2 Visual Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center text-xs">2</span>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      នៅពេល Google បង្ហាញផ្ទាំង &ldquo;Google hasn&apos;t verified this app&rdquo;
                    </h5>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    <strong>កុំចុច Back to safety ឱ្យសោះ!</strong> សូមធ្វើតាមរូបភាពខាងក្រោម៖
                  </p>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">⚠️ Google hasn&apos;t verified this app</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">Back to safety</span>
                    </div>

                    <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                        <span>👉 ចុចត្រង់ពាក្យ៖</span>
                        <span className="underline p-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 font-mono">Advanced (កម្រិតខ្ពស់)</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold pt-1">
                        <span>👉 បន្ទាប់មកចុច៖</span>
                        <span className="font-mono bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          Go to ZKTeco Attendance Backup (unsafe)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 Visual Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs">3</span>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      ផ្តល់សិទ្ធិ (Check Permission) &rarr; ចុច &ldquo;Continue&rdquo;
                    </h5>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    គ្រីសធីកលើប្រអប់អនុញ្ញាត Google Drive រួចចុច <strong>Continue</strong>។ ប្រព័ន្ធនឹងភ្ជាប់ Google Drive របស់អ្នកដោយជោគជ័យជាស្ថាពរ!
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowVisualGuide(false)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-md"
                >
                  យល់ហើយ (Got It, Close)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  តើអ្នកពិតជាចង់លុបឯកសារបម្រុងទុកនេះមែនទេ?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to delete this backup archive? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  onClick={() => deleteBackupMutation.mutate(deleteConfirmId)}
                  disabled={deleteBackupMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
                >
                  {deleteBackupMutation.isPending ? "កំពុងលុប..." : "លុបឯកសារ (Delete)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
