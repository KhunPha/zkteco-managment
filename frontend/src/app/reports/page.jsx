"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  UserX,
  CalendarDays,
  Briefcase,
  AlertCircle,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

export default function ReportsPage() {
  const getToday = () => new Date().toISOString().split("T")[0];
  const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState("this-month");

  // Quick date presets for HR
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const t = getToday();
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "last-7-days") {
      const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(d7);
      setEndDate(getToday());
    } else if (preset === "this-month") {
      setStartDate(getStartOfMonth());
      setEndDate(getToday());
    } else if (preset === "last-month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    }
  };

  const { data: departments = [] } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const {
    data: rawReportRecords = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report-preview", startDate, endDate, departmentId, status],
    queryFn: async () => {
      let url = `/api/v1/attendance/reports?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  // Client-side quick search by Employee Name or Code
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return rawReportRecords;
    const q = searchQuery.toLowerCase().trim();
    return rawReportRecords.filter(
      (r) =>
        (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
        (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
        (r.departmentName && r.departmentName.toLowerCase().includes(q))
    );
  }, [rawReportRecords, searchQuery]);

  // Executive HR Analytics
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "PRESENT").length;
    const late = filteredRecords.filter((r) => r.status === "LATE").length;
    const absent = filteredRecords.filter((r) => r.status === "ABSENT").length;
    const onLeave = filteredRecords.filter((r) => r.status === "ON_LEAVE").length;
    const totalMinutes = filteredRecords.reduce((acc, r) => acc + (r.totalWorkMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const punctualityRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, late, absent, onLeave, totalHours, punctualityRate };
  }, [filteredRecords]);

  const handleDownload = async (format) => {
    setIsExporting(true);
    try {
      let url = `/api/v1/attendance/reports/export/${format}?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;

      const res = await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const extension = format === "excel" ? "xlsx" : format;
      a.download = `HR-Attendance-Timesheet-${startDate}-to-${endDate}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              HR Timesheet & Payroll Audit
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Workforce Attendance Reports</h1>
          <p className="text-xs text-indigo-200/80">
            Comprehensive audit reports, punctuality analysis, and executive exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleDownload("excel")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download formatted Excel sheet with KPI summaries"
          >
            <FileSpreadsheet size={16} />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Download printable Landscape A4 PDF report with signature blocks"
          >
            <FileText size={16} />
            <span>Print PDF</span>
          </button>
          <button
            onClick={() => handleDownload("csv")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-700/80 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs border border-white/10 transition-all"
            title="Export comma-separated values"
          >
            <Download size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* HR Executive KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Records</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <CalendarDays size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.present}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late Arrivals</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{metrics.late}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Clock size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{metrics.absent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
            <UserX size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">On Leave</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{metrics.onLeave}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <Briefcase size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Hours</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{metrics.totalHours}h</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Date Presets & Filter Strip */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500">
            <span>Quick Range:</span>
            <div className="flex items-center gap-1">
              {[
                { id: "today", label: "Today" },
                { id: "last-7-days", label: "Last 7 Days" },
                { id: "this-month", label: "This Month" },
                { id: "last-month", label: "Last Month" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    activePreset === p.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Detailed Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-semibold text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer w-full"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-semibold text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer w-full"
            />
          </div>

          {/* Department */}
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">✓ Present</option>
            <option value="LATE">⚠ Late Arrival</option>
            <option value="ABSENT">✕ Absent</option>
            <option value="ON_LEAVE">★ On Leave</option>
            <option value="HOLIDAY">Official Holiday</option>
            <option value="REST_DAY">Scheduled Rest Day</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Error loading report: {error?.message || "Failed to fetch attendance records"}</span>
        </div>
      )}

      {/* Main HR Table Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              Attendance Records Table
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {filteredRecords.length} Rows
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Period: {startDate} → {endDate}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] z-10">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift Rule</th>
                <th className="py-3 px-4 text-center">In Time</th>
                <th className="py-3 px-4 text-center">Out Time</th>
                <th className="py-3 px-4 text-center">Late</th>
                <th className="py-3 px-4 text-center">Net Work</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                    <p className="font-semibold">Loading HR attendance report...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <FileSpreadsheet size={36} className="mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No attendance records found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your date range, department, or search query</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {r.attendanceDate}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {r.employeeName ? r.employeeName.charAt(0) : "E"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {r.employeeName}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {r.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {r.departmentName || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.shiftName || "Standard 8h Full"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.firstCheckIn ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatTime(r.firstCheckIn)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--:--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.lastCheckOut ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatTime(r.lastCheckOut)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--:--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {r.lateMinutes > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          +{r.lateMinutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {r.totalWorkMinutes > 0 ? (
                        <span>
                          {Math.floor(r.totalWorkMinutes / 60)}h {r.totalWorkMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-slate-400">0h</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          r.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : r.status === "LATE"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : r.status === "ABSENT"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : r.status === "ON_LEAVE"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {r.status === "PRESENT" && <CheckCircle2 size={10} />}
                        {r.status === "LATE" && <Clock size={10} />}
                        {r.status === "ABSENT" && <UserX size={10} />}
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
