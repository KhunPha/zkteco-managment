"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Key, Globe, Shield, Check, Copy, Send, Bell, Sparkles, AlertCircle, GraduationCap, Briefcase, BookOpen, Users, CheckCircle2, Plus, Trash2, Layers } from "lucide-react";
import api from "@/lib/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["all-settings"],
    queryFn: async () => {
      const res = await api.get("/api/v1/settings");
      return res.data?.data || [];
    },
  });

  // Telegram Settings Query
  const { data: tgSettings, refetch: refetchTg } = useQuery({
    queryKey: ["telegram-settings"],
    queryFn: async () => {
      const res = await api.get("/api/v1/telegram/settings");
      return res.data?.data || {};
    },
  });

  const [tgForm, setTgForm] = useState(null);
  const [testingTarget, setTestingTarget] = useState(null);
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [tgFeedback, setTgFeedback] = useState(null);

  useEffect(() => {
    if (tgSettings && !tgForm) {
      setTgForm({
        enabled: tgSettings.enabled ?? false,
        botToken: tgSettings.botToken ?? "",
        teacherChatId: tgSettings.teacherChatId || tgSettings.chatId || "",
        notifyTeacher: tgSettings.notifyTeacher ?? true,
        staffChatId: tgSettings.staffChatId || tgSettings.chatId || "",
        notifyStaff: tgSettings.notifyStaff ?? tgSettings.notifyEmployee ?? true,
        studentChatId: tgSettings.studentChatId || tgSettings.chatId || "",
        notifyStudent: tgSettings.notifyStudent ?? true,
        notifyLateOnly: tgSettings.notifyLateOnly ?? false,
        customGroups: Array.isArray(tgSettings.customGroups) ? tgSettings.customGroups : [],
      });
    }
  }, [tgSettings]);

  const handleAddCustomGroup = () => {
    const newGroup = {
      id: "grp_" + Date.now(),
      name: "",
      chatId: "",
      target: "ALL",
      enabled: true,
    };
    setTgForm((prev) => ({
      ...prev,
      customGroups: [...(prev?.customGroups || []), newGroup],
    }));
  };

  const handleUpdateCustomGroup = (index, field, value) => {
    setTgForm((prev) => {
      const updated = [...(prev?.customGroups || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customGroups: updated };
    });
  };

  const handleDeleteCustomGroup = (index) => {
    setTgForm((prev) => {
      const updated = (prev?.customGroups || []).filter((_, i) => i !== index);
      return { ...prev, customGroups: updated };
    });
  };

  const handleSaveTg = async () => {
    if (!tgForm) return;
    setIsSavingTg(true);
    try {
      await api.post("/api/v1/telegram/settings", tgForm);
      setTgFeedback({ type: "success", text: "✓ Telegram settings and custom groups saved successfully" });
      refetchTg();
    } catch (err) {
      setTgFeedback({ type: "error", text: "Error saving: " + err.message });
    } finally {
      setIsSavingTg(false);
      setTimeout(() => setTgFeedback(null), 4000);
    }
  };

  const handleTestTg = async (target = "all", customName = "") => {
    setTestingTarget(target);
    const targetLabel = target === "teacher" ? "Teachers Group (ក្រុមគ្រូបង្រៀន)" :
                        target === "staff" ? "Staffs Group (ក្រុមបុគ្គលិក)" :
                        target === "student" ? "Students Group (ក្រុមសិស្ស)" :
                        target === "all" ? "All Configured Groups" :
                        (customName || "Custom Group");
    setTgFeedback({ type: "loading", text: `Sending test alert to ${targetLabel}...` });
    try {
      const res = await api.post(`/api/v1/telegram/test?target=${target}`);
      setTgFeedback({
        type: res.data?.data ? "success" : "error",
        text: res.data?.message || `Test completed for ${targetLabel}`,
      });
    } catch (err) {
      setTgFeedback({ type: "error", text: "Test failed: " + (err.response?.data?.message || err.message) });
    } finally {
      setTestingTarget(null);
      setTimeout(() => setTgFeedback(null), 6000);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put(`/api/v1/settings/${key}`, { value });
      setSaveFeedback(`✓ Setting '${key}' updated`);
      queryClient.invalidateQueries(["all-settings"]);
      setTimeout(() => setSaveFeedback(""), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const copyMisKey = () => {
    navigator.clipboard.writeText("mis-secret-api-key-enterprise-2026");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const findVal = (key, fallback) => {
    return settings?.find((s) => s.settingKey === key)?.settingValue || fallback;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System & Integration Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organization preferences, biometric protocol defaults, and external School MIS keys
          </p>
        </div>
        {saveFeedback && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            {saveFeedback}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Globe size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">General & Timezone</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Organization Display Name
              </label>
              <input
                type="text"
                defaultValue={findVal("COMPANY_NAME", "Enterprise Biometrics Organization")}
                onBlur={(e) => updateSetting("COMPANY_NAME", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Operational Timezone
              </label>
              <input
                type="text"
                readOnly
                value="Asia/Phnom_Penh (UTC+07:00)"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">UTC storage with Phnom Penh local calculation.</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Standard Late Arrival Grace Period (Minutes)
              </label>
              <input
                type="number"
                defaultValue={findVal("LATE_GRACE_MINUTES", "15")}
                onBlur={(e) => updateSetting("LATE_GRACE_MINUTES", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-medium"
              />
            </div>
          </div>
        </div>

        {/* School MIS Integration Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Key size={18} className="text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">School MIS Integration Layer</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                MIS Webhook Synchronization Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="mis-secret-api-key-enterprise-2026"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300"
                />
                <button
                  onClick={copyMisKey}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Pass this header as <code>X-MIS-API-KEY</code> in external MIS webhooks.</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                MIS Sync Webhook Endpoint
              </label>
              <input
                type="text"
                readOnly
                value="/api/v1/mis/webhook/sync-personnel"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-indigo-600 font-semibold"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block">External MIS Compatibility</span>
              <p>Supports teacher synchronization, class grade assignments, and student roster imports with conflict resolution.</p>
            </div>
          </div>
        </div>

        {/* Telegram Attendance Bot Card - 3 Dedicated Groups */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 shadow-xs">
                <Send size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Telegram Attendance Bot & 3-Group Alerts</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                    Instant Push
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                    3 Dedicated Groups
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Route real-time punch notifications into 3 distinct Telegram groups: <b>Teachers</b>, <b>Staffs</b>, and <b>Students</b> with auto-categorization
                </p>
              </div>
            </div>

            {tgFeedback && (
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 animate-fade-in ${
                  tgFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                    : tgFeedback.type === "loading"
                    ? "bg-sky-50 text-sky-600 border-sky-200 animate-pulse"
                    : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400"
                }`}
              >
                <span>{tgFeedback.text}</span>
              </span>
            )}
          </div>

          {/* Master Bot Configuration */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-xs">
                  Enable Real-Time Telegram Broadcast System
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Master switch to dispatch instant Telegram notifications when employees, teachers, or students punch
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTgForm((prev) => ({ ...prev, enabled: !prev?.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer self-start sm:self-auto shrink-0 ${
                  tgForm?.enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    tgForm?.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="font-semibold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                Telegram Bot API Token *
              </label>
              <input
                type="text"
                placeholder="e.g. 7123456789:AAFlkjhsdf892374jhksdf..."
                value={tgForm?.botToken || ""}
                onChange={(e) => setTgForm({ ...tgForm, botToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                One bot token connects to all 3 groups. Add this bot as <b>Administrator</b> to each of the 3 Telegram groups below. Create a free bot with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">@BotFather</a>.
              </p>
            </div>
          </div>

          {/* 3 Dedicated Group Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Card 1: Teachers Group */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Teachers Group</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ក្រុមគ្រូបង្រៀន & សាស្ត្រាចារ្យ</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    Faculty
                  </span>
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Group / Channel ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. -1002345678901"
                    value={tgForm?.teacherChatId || ""}
                    onChange={(e) => setTgForm({ ...tgForm, teacherChatId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={tgForm?.notifyTeacher ?? true}
                    onChange={(e) => setTgForm({ ...tgForm, notifyTeacher: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    Send Teacher Punch Alerts
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => handleTestTg("teacher")}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={12} className={testingTarget === "teacher" ? "animate-spin" : ""} />
                <span>{testingTarget === "teacher" ? "Testing..." : "Test Teachers Group"}</span>
              </button>
            </div>

            {/* Card 2: Staffs Group */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Staffs Group</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ក្រុមបុគ្គលិកទូទៅ & ការិយាល័យ</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    Operations
                  </span>
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Group / Channel ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. -1002345678902"
                    value={tgForm?.staffChatId || ""}
                    onChange={(e) => setTgForm({ ...tgForm, staffChatId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={tgForm?.notifyStaff ?? true}
                    onChange={(e) => setTgForm({ ...tgForm, notifyStaff: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    Send Staff Punch Alerts
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => handleTestTg("staff")}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={12} className={testingTarget === "staff" ? "animate-spin" : ""} />
                <span>{testingTarget === "staff" ? "Testing..." : "Test Staffs Group"}</span>
              </button>
            </div>

            {/* Card 3: Students Group */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Students Group</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ក្រុមសិស្សានុសិស្ស & អាណាព្យាបាល</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                    Students
                  </span>
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Group / Channel ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. -1002345678903"
                    value={tgForm?.studentChatId || ""}
                    onChange={(e) => setTgForm({ ...tgForm, studentChatId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={tgForm?.notifyStudent ?? true}
                    onChange={(e) => setTgForm({ ...tgForm, notifyStudent: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    Send Student Attendance Alerts
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => handleTestTg("student")}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={12} className={testingTarget === "student" ? "animate-spin" : ""} />
                <span>{testingTarget === "student" ? "Testing..." : "Test Students Group"}</span>
              </button>
            </div>
          </div>

          {/* Dynamic Unlimited Custom Telegram Groups Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Custom Alert Groups & Channels</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-semibold">
                      {(tgForm?.customGroups || []).length} Custom { (tgForm?.customGroups || []).length === 1 ? 'Group' : 'Groups' }
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    បន្ថែមក្រុម Telegram តាមចិត្ត (សាខាទី២, ថ្នាក់ដឹកនាំ, សន្តិសុខ, អាណាព្យាបាល...) ដោយគ្មានកំណត់
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomGroup}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>+ Add Telegram Group</span>
              </button>
            </div>

            {/* Custom Groups List */}
            {(!tgForm?.customGroups || tgForm.customGroups.length === 0) ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  មិនទាន់មានក្រុមបន្ថែមនៅឡើយទេ។ ចុច <b>"+ Add Telegram Group"</b> ដើម្បីបន្ថែមក្រុមថ្មីតាមតម្រូវការ។
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomGroup}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 underline cursor-pointer"
                >
                  Create your first custom alert channel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tgForm.customGroups.map((group, idx) => (
                  <div
                    key={group.id || idx}
                    className="p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/20 flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Name input + Delete button */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Campus 2, Security Team"
                          value={group.name || ""}
                          onChange={(e) => handleUpdateCustomGroup(idx, "name", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 font-bold text-xs text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomGroup(idx)}
                          title="Delete Group"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Chat / Channel ID */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Group / Channel ID *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. -1009876543210"
                          value={group.chatId || ""}
                          onChange={(e) => handleUpdateCustomGroup(idx, "chatId", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Target Audience Filter */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Target Personnel Filter
                        </label>
                        <select
                          value={group.target || "ALL"}
                          onChange={(e) => handleUpdateCustomGroup(idx, "target", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          <option value="ALL">🌐 All Personnel (បុគ្គលិក & សិស្សទាំងអស់)</option>
                          <option value="TEACHER">👨‍🏫 Teachers Only (លោកគ្រូ-អ្នកគ្រូ)</option>
                          <option value="STAFF">💼 Staffs Only (បុគ្គលិកទូទៅ)</option>
                          <option value="STUDENT">🎓 Students Only (សិស្សានុសិស្ស)</option>
                        </select>
                      </div>

                      {/* Active Toggle Switch */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          Active Notifications
                        </span>
                        <input
                          type="checkbox"
                          checked={group.enabled ?? true}
                          onChange={(e) => handleUpdateCustomGroup(idx, "enabled", e.target.checked)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Test Button */}
                    <button
                      type="button"
                      disabled={testingTarget !== null || !group.chatId}
                      onClick={() => handleTestTg(group.id, group.name)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/50 dark:hover:bg-violet-800 text-violet-700 dark:text-violet-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={12} className={testingTarget === group.id ? "animate-spin" : ""} />
                      <span>{testingTarget === group.id ? "Testing..." : `Test ${group.name || "Group"}`}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Filter & Action Controls */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
              <input
                type="checkbox"
                checked={tgForm?.notifyLateOnly ?? false}
                onChange={(e) => setTgForm({ ...tgForm, notifyLateOnly: e.target.checked })}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Only notify when Arrival is Late (After Grace Period)
              </span>
            </label>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => handleTestTg("all")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} className={testingTarget === "all" ? "animate-spin text-sky-500" : "text-sky-500"} />
                <span>{testingTarget === "all" ? "Testing All..." : "Test All Groups"}</span>
              </button>

              <button
                type="button"
                disabled={isSavingTg}
                onClick={handleSaveTg}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{isSavingTg ? "Saving..." : "Save Telegram Config"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

