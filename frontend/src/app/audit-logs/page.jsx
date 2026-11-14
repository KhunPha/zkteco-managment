"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  Download,
  Shield,
  Key,
  Users,
  Cpu,
  Fingerprint,
  Database,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  X,
  FileText,
  Clock,
  Globe,
  Laptop
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import Pagination from "@/components/common/Pagination";

const CATEGORIES = [
  { id: "ALL", label: "All Activities", icon: History },
  { id: "AUTHENTICATION", label: "Authentication", icon: Key },
  { id: "PERSONNEL", label: "Personnel", icon: Users },
  { id: "HARDWARE", label: "Hardware & Devices", icon: Cpu },
  { id: "BIOMETRIC", label: "Biometrics & Cards", icon: Fingerprint },
  { id: "BACKUP", label: "Database Backups", icon: Database },
  { id: "ATTENDANCE", label: "Attendance & Corrections", icon: Calendar },
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedLog, setSelectedLog] = useState(null);

  // 1. Fetch Audit Summary
  const { data: summaryData } = useQuery({
    queryKey: ["audit-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/audit-logs/summary");
      return res.data?.data;
    },
    staleTime: 30000,
  });

  // 2. Fetch Audit Logs with Filtering & Pagination
  const { data: auditData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit-logs", search, selectedCategory, startDate, endDate, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/audit-logs?page=${page}&size=${pageSize}`;
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      if (selectedCategory !== "ALL") {
        url += `&entityType=${encodeURIComponent(selectedCategory)}`;
      }
      if (startDate) {
        url += `&startDate=${encodeURIComponent(new Date(startDate).toISOString())}`;
      }
      if (endDate) {
        const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
        url += `&endDate=${encodeURIComponent(endIso)}`;
      }
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  const logs = auditData?.content || [];
  const totalElements = auditData?.totalElements || 0;
  const totalPages = auditData?.totalPages || 1;

  // Metric counts from summary
  const totalRecords = summaryData?.totalRecords || totalElements;
  const categoryCounts = summaryData?.recentActionCategories || {};
  const authCount = categoryCounts["AUTHENTICATION"] || 0;
  const personnelCount = categoryCounts["PERSONNEL"] || 0;
  const hardwareCount = (categoryCounts["HARDWARE"] || 0) + (categoryCounts["BIOMETRIC"] || 0);
  const backupCount = categoryCounts["BACKUP"] || 0;

  // Action badge color styling
  const getActionBadgeStyle = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("LOGIN") && !act.includes("FAILED") || act.includes("ENROLL") || act.includes("SUCCESS")) {
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    }
    if (act.includes("UPDATE") || act.includes("CHANGE") || act.includes("SYNC") || act.includes("MAP")) {
      return "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800";
    }
    if (act.includes("DELETE") || act.includes("FAILED") || act.includes("REBOOT") || act.includes("CLEAR") || act.includes("REJECT") || act.includes("TERMINATED")) {
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    }
    if (act.includes("REVIEW") || act.includes("LOGOUT") || act.includes("PENDING")) {
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    }
    return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
  };

  // Export current view to CSV
  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "Company", "Username", "User ID", "Action", "Entity Type", "Entity ID", "Client IP", "Details"];
    const rows = logs.map(l => [
      l.createdAt,
      l.companyCode || "default",
      `"${l.username || "System"}"`,
      l.userId || "",
      `"${l.action || ""}"`,
      `"${l.entityType || ""}"`,
      l.entityId || "",
      l.ipAddress || "",
      `"${(l.newValues || l.oldValues || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_trail_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Enterprise Audit Trail
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable compliance log of administrative actions, biometric operations, hardware commands, and profile audits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Logged Events</span>
            <History size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalRecords.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active Forensic Trail
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Auth & Access Logs</span>
            <Key size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {authCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Logins, Logouts, Locks
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Personnel Adjustments</span>
            <Users size={16} className="text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {personnelCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Employees & Students
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Hardware & Biometrics</span>
            <Cpu size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {hardwareCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Cards, Biometrics, Terminal Control
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inputs */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by actor username, action, entity, IP address, or details..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs outline-hidden"
              />
            </div>

            {(search || startDate || endDate || selectedCategory !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                  setStartDate("");
                  setEndDate("");
                  setPage(0);
                }}
                className="px-2.5 py-1.5 text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                title="Reset all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details & Payload</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-500" />
                    <span>Loading audit trail records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <History size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No audit records found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || startDate || endDate || selectedCategory !== "ALL"
                        ? "Try clearing search keywords or date range filters"
                        : "Actions performed in the system will be recorded here automatically"}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <div>{formatDate(log.createdAt)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(log.createdAt)}</div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          {(log.username || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.username || "System Worker"}
                          </div>
                          {log.companyCode && log.companyCode !== "default" && (
                            <div className="text-[9px] font-mono text-indigo-500 uppercase">
                              {log.companyCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${getActionBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {log.entityType}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] font-mono text-slate-400 ml-1">
                          #{log.entityId}
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 max-w-xs sm:max-w-md truncate text-slate-600 dark:text-slate-300 text-[11px]" title={log.newValues || log.oldValues}>
                      {log.newValues || log.oldValues || "-"}
                    </td>

                    {/* Client IP */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || "127.0.0.1"}
                    </td>

                    {/* View Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Complete Audit Payload"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Integrated Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(0);
          }}
          itemLabel="audit records"
        />
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Audit Event Forensic Record #{selectedLog.id}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Immutable security record captured at {formatDate(selectedLog.createdAt)} {formatTime(selectedLog.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Action</div>
                  <div className="mt-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${getActionBadgeStyle(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Target Entity</div>
                  <div className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ""}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Actor (Username)</div>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.username || "System Worker"} {selectedLog.userId ? `(ID: ${selectedLog.userId})` : ""}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Tenant / Company</div>
                  <div className="mt-1 font-mono text-indigo-600 dark:text-indigo-400 uppercase font-semibold">
                    {selectedLog.companyCode || "default"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Client IP Address</div>
                  <div className="mt-1 font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Globe size={12} className="text-slate-400" />
                    <span>{selectedLog.ipAddress || "127.0.0.1"}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Timestamp</div>
                  <div className="mt-1 font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span>{formatTime(selectedLog.createdAt)} ({formatDate(selectedLog.createdAt)})</span>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Laptop size={12} />
                    <span>Client User-Agent</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}

              {/* Payload / Details */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  New Values / Action Details
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {selectedLog.newValues || "No new value payload recorded"}
                </div>
              </div>

              {/* Old Values (if present) */}
              {selectedLog.oldValues && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Previous Values
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 font-mono text-[11px] text-rose-800 dark:text-rose-300 whitespace-pre-wrap break-words">
                    {selectedLog.oldValues}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
