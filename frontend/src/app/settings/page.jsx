"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Key, Globe, Shield, Check, Copy } from "lucide-react";
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
      </div>
    </div>
  );
}

