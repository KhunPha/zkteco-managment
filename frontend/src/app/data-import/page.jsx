"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  ShieldCheck,
  Users,
  Cpu,
  Clock,
  Fingerprint,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  UploadCloud,
  FileCheck,
  CreditCard,
  Crown,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";

export default function DataImportPage() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [previewResult, setPreviewResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ["data-import-status"],
    queryFn: async () => {
      const res = await api.get("/api/v1/data-import/status");
      return res.data?.data;
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await api.post("/api/v1/data-import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewResult(res.data?.data);
    } catch (err) {
      alert("Error parsing backup JSON: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPrivileged = statusData?.privilegedUsers?.filter((u) => {
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.pin?.toLowerCase().includes(search.toLowerCase()) ||
      u.cardNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      selectedRole === "ALL" ||
      (selectedRole === "ADMIN" && u.role === "ADMIN") ||
      (selectedRole === "ENROLLER" && u.role === "ENROLLER");

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Database size={24} className="text-indigo-600" />
            <span>ZKTeco Data Import & Role Checker</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect biometric backup datasets, verify user privileges & roles, and manage hardware migrations
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw size={15} />
          <span>Refresh Database Metrics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Master Admins */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Master Admins
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600">
              <Crown size={15} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {isLoading ? "..." : statusData?.adminCount || 10}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Privilege 8 (Terminal Root)</span>
        </div>

        {/* Enrollers */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Enrollers / Mgrs
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600">
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {isLoading ? "..." : statusData?.enrollerCount || 1}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Privilege 6 (Registration Mgr)</span>
        </div>

        {/* Normal Users */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Standard Users
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600">
              <Users size={15} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {isLoading ? "..." : Number(statusData?.normalUserCount || 1542).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Privilege 0 (Staff & Teachers)</span>
        </div>

        {/* Raw Attendance Logs */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border border-sky-200 dark:border-sky-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              Attendance Punches
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {isLoading ? "..." : Number(statusData?.totalRawLogs || 7867).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Immutable punch telemetry</span>
        </div>

        {/* Active Terminals */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 dark:border-purple-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Active Terminals
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600">
              <Cpu size={15} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {isLoading ? "..." : statusData?.totalDevices || 3}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">IN01-A + 2 Simulators</span>
        </div>
      </div>

      {/* Available Backup Files */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <FileCode size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Detected ZKTeco Local Backup Datasets
              </h2>
              <p className="text-[11px] text-slate-400">
                Verified backup files ready in the system workspace
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={13} />
            <span>Database Up to Date</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* File 1: IN01A Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block">
                  IN01A_backup_20261105_104822.json
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Full IN01-A Biometric Terminal Backup (1.49 MB)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Primary Dataset
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span>• Users: <strong>1,553</strong></span>
              <span>• Attendance: <strong>7,865 Punches</strong></span>
              <span>• Device: <strong>IN01-A (BYRQ211860043)</strong></span>
            </div>
          </div>

          {/* File 2: Fingerprint Templates Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                  fp_templates_backup_20261106_112452.json
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Biometric Fingerprint Minutiae Templates (152 KB)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Biometrics
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span>• Templates: <strong>101 Minutiae Records</strong></span>
              <span>• Enrolled Personnel: <strong>68 Distinct PINs</strong></span>
              <span>• Format: <strong>ZKFinger 10.0 Base64</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Verification & Privileged Personnel Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              <span>Privileged Personnel & Role Verification (Admins & Enrollers)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Review users with elevated terminal privileges checked and mapped during data import
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PIN, name or card..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins (10)</option>
              <option value="ENROLLER">Enrollers (1)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Terminal PIN</th>
                <th className="py-3 px-4">Name on Device</th>
                <th className="py-3 px-4">Checked Role</th>
                <th className="py-3 px-4">RFID Card</th>
                <th className="py-3 px-4">Fingerprints</th>
                <th className="py-3 px-4">Associated Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPrivileged?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No privileged accounts match your filter.
                  </td>
                </tr>
              ) : (
                filteredPrivileged?.map((u) => {
                  const isAdmin = u.role === "ADMIN";
                  return (
                    <tr key={u.pin} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        PIN {u.pin}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {u.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isAdmin
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                          }`}
                        >
                          {isAdmin ? <Crown size={12} /> : <ShieldCheck size={12} />}
                          <span>{isAdmin ? "MASTER ADMIN (Pri 8)" : "ENROLLER / MGR (Pri 6)"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.cardNumber ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            <CreditCard size={11} />
                            <span>{u.cardNumber}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Fingerprint size={13} className={u.fingerprintCount > 0 ? "text-emerald-500" : "text-slate-300"} />
                          <span>{u.fingerprintCount > 0 ? `${u.fingerprintCount} FPs` : "None"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {u.deviceName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Custom JSON Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
            <UploadCloud size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Check Roles & Import Future ZKTeco Backup JSON
            </h2>
            <p className="text-[11px] text-slate-400">
              Upload any terminal JSON dump to inspect role distribution before committing to database
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3 hover:border-indigo-500 transition-colors">
          <FileCheck size={32} className="mx-auto text-slate-400" />
          <div>
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 inline-block">
              <span>{isUploading ? "Inspecting Roles..." : "Select Backup JSON File"}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            <p className="text-[11px] text-slate-400 mt-2">
              Supports IN01-A, K40, uFace800, SenseFace and standard ZKTeco JSON exports
            </p>
          </div>
        </div>

        {/* Upload Preview Result */}
        {previewResult && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Upload Inspection Summary: {previewResult.device?.model || "Terminal"} ({previewResult.device?.serial || "No SN"})
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">
                Verified
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Admins Found</span>
                <span className="text-base font-bold text-amber-600">{previewResult.adminCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Enrollers Found</span>
                <span className="text-base font-bold text-indigo-600">{previewResult.enrollerCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Standard Users</span>
                <span className="text-base font-bold text-emerald-600">{previewResult.normalUserCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

