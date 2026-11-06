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
  GraduationCap,
  Users,
  ArrowUpDown,
  Filter,
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
  const [personnelType, setPersonnelType] = useState("ALL"); // ALL, STUDENT, TEACHER, EMPLOYEE
  const [orderBy, setOrderBy] = useState("ROLE_STUDENT_FIRST"); // ROLE_STUDENT_FIRST, ROLE_TEACHER_FIRST, ROLE_EMPLOYEE_FIRST, DATE_DESC, DATE_ASC, NAME_ASC
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
    queryKey: ["report-preview", startDate, endDate, departmentId, status, personnelType, orderBy],
    queryFn: async () => {
      let url = `/api/v1/attendance/reports?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;
      if (personnelType && personnelType !== "ALL") url += `&personnelType=${personnelType}`;
      if (orderBy) url += `&orderBy=${orderBy}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  // Client-side quick search by Name, Code, Grade or Class + Role sorting
  const filteredRecords = useMemo(() => {
    let list = Array.isArray(rawReportRecords) ? [...rawReportRecords] : [];
    if (personnelType !== "ALL") {
      list = list.filter((r) => r.personnelType === personnelType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
          (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q)) ||
          (r.studentGrade && r.studentGrade.toLowerCase().includes(q)) ||
          (r.studentClassName && r.studentClassName.toLowerCase().includes(q))
      );
    }
    // Stable sorting
    list.sort((a, b) => {
      if (orderBy === "ROLE_STUDENT_FIRST") {
        const orderMap = { STUDENT: 1, TEACHER: 2, EMPLOYEE: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_TEACHER_FIRST") {
        const orderMap = { TEACHER: 1, EMPLOYEE: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_EMPLOYEE_FIRST") {
        const orderMap = { EMPLOYEE: 1, TEACHER: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "NAME_ASC") {
        return (a.employeeName || "").localeCompare(b.employeeName || "");
      } else if (orderBy === "DATE_ASC") {
        return (a.attendanceDate || "").localeCompare(b.attendanceDate || "");
      }
      return (b.attendanceDate || "").localeCompare(a.attendanceDate || "");
    });
    return list;
  }, [rawReportRecords, searchQuery, personnelType, orderBy]);

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
      if (personnelType && personnelType !== "ALL") url += `&personnelType=${personnelType}`;
      if (orderBy) url += `&orderBy=${orderBy}`;

      const res = await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const extension = format === "excel" ? "xlsx" : format;
      const rolePrefix =
        personnelType === "STUDENT"
          ? "Students-Attendance-Report"
          : personnelType === "TEACHER"
          ? "Teachers-Attendance-Report"
          : personnelType === "EMPLOYEE"
          ? "Staff-Attendance-Report"
          : "Workforce-Attendance-Timesheet";
      a.download = `${rolePrefix}-${startDate}-to-${endDate}.${extension}`;
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
              Timesheet & Academic Report
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Workforce & Academic Attendance Reports</h1>
          <p className="text-xs text-indigo-200/80">
            Generate and export timesheets for Students, Teachers, and Staff Officers with accurate 2-shift punch audits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleDownload("excel")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Download formatted Excel sheet with KPI summaries"
          >
            <FileSpreadsheet size={16} />
            <span>
              {personnelType === "TEACHER"
                ? "Excel Teachers (.xlsx)"
                : personnelType === "STUDENT"
                ? "Excel Students (.xlsx)"
                : personnelType === "EMPLOYEE"
                ? "Excel Staff (.xlsx)"
                : "Excel (.xlsx)"}
            </span>
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Download printable Landscape A4 PDF report with signature blocks"
          >
            <FileText size={16} />
            <span>
              {personnelType === "TEACHER"
                ? "Print Teachers PDF"
                : personnelType === "STUDENT"
                ? "Print Students PDF"
                : personnelType === "EMPLOYEE"
                ? "Print Staff PDF"
                : "Print PDF"}
            </span>
          </button>
          <button
            onClick={() => handleDownload("csv")}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-700/80 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
            title="Export comma-separated values"
          >
            <Download size={16} />
            <span>
              {personnelType === "TEACHER"
                ? "Teachers CSV"
                : personnelType === "STUDENT"
                ? "Students CSV"
                : "CSV"}
            </span>
          </button>
        </div>
      </div>

      {/* Category Tabs: All Personnel, Students, Teachers, Staff */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setPersonnelType("ALL")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "ALL"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users size={15} />
          <span>All Personnel</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("STUDENT")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "STUDENT"
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserCheck size={15} className={personnelType === "STUDENT" ? "text-white" : "text-cyan-500"} />
          <span>Enrolled Students</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("TEACHER")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "TEACHER"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap size={15} className={personnelType === "TEACHER" ? "text-white" : "text-amber-500"} />
          <span>Teachers & Academic</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("EMPLOYEE")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "EMPLOYEE"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase size={15} className={personnelType === "EMPLOYEE" ? "text-white" : "text-emerald-500"} />
          <span>Staff & Officers</span>
        </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                personnelType === "TEACHER"
                  ? "Search teacher or PIN..."
                  : personnelType === "STUDENT"
                  ? "Search student, PIN, grade..."
                  : "Search name or PIN..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Personnel Category Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={personnelType}
              onChange={(e) => setPersonnelType(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer w-full text-xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Personnel (Everyone)</option>
              <option value="TEACHER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🎓 Only Teachers & Faculty</option>
              <option value="STUDENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🎒 Only Enrolled Students</option>
              <option value="EMPLOYEE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">💼 Only Staff & Officers</option>
            </select>
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

          {/* Order By Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer w-full text-xs"
            >
              <option value="ROLE_TEACHER_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Teachers First</option>
              <option value="ROLE_STUDENT_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Students First</option>
              <option value="ROLE_EMPLOYEE_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Staff First</option>
              <option value="DATE_DESC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Latest Date First</option>
              <option value="DATE_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Earliest Date First</option>
              <option value="NAME_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Name (A - Z)</option>
            </select>
          </div>

          {/* Department (only for non-students) */}
          {personnelType !== "STUDENT" ? (
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
          ) : (
            <div className="flex items-center px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-medium text-xs">
              All Academic Grades
            </div>
          )}

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
              {personnelType === "TEACHER"
                ? "Teachers & Academic Faculty Attendance Table"
                : personnelType === "STUDENT"
                ? "Enrolled Students Attendance Table"
                : personnelType === "EMPLOYEE"
                ? "Staff & Officers Attendance Table"
                : "Attendance Records Table"}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                personnelType === "TEACHER"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : personnelType === "STUDENT"
                  ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                  : personnelType === "EMPLOYEE"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
              }`}
            >
              {personnelType === "TEACHER"
                ? `Only Teachers • ${filteredRecords.length} Rows`
                : personnelType === "STUDENT"
                ? `Only Students • ${filteredRecords.length} Rows`
                : personnelType === "EMPLOYEE"
                ? `Only Staff • ${filteredRecords.length} Rows`
                : `${filteredRecords.length} Total Rows`}
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Period: {startDate} → {endDate}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] z-10">
              <tr>
                <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 w-12">#</th>
                <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[95px]">Date</th>
                <th rowSpan={2} className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 min-w-[210px]">Personnel & Role</th>
                <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Dept / Class</th>
                <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Shift Rule</th>
                <th colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-400/5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-extrabold normal-case">
                    <span>🌅 Shift 1 (Morning)</span>
                  </div>
                </th>
                <th colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-800 bg-indigo-500/5 dark:bg-indigo-400/5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-extrabold normal-case">
                    <span>🌆 Shift 2 (Afternoon)</span>
                  </div>
                </th>
                <th rowSpan={2} className="py-3 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px] whitespace-nowrap">Late</th>
                <th rowSpan={2} className="py-3 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px] whitespace-nowrap">Net Work</th>
                <th rowSpan={2} className="py-3 px-3 text-center min-w-[110px]">Status</th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-1.5 px-2.5 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[85px]">First In</th>
                <th className="py-1.5 px-2.5 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[85px]">Last Out</th>
                <th className="py-1.5 px-2.5 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[85px]">First In</th>
                <th className="py-1.5 px-2.5 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[85px]">Last Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-14 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                    <p className="font-semibold">Loading HR attendance report...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <FileSpreadsheet size={36} className="mx-auto mb-2 opacity-40 text-indigo-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No attendance records found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your date range, personnel filter, or search query</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isStudent = r.personnelType === "STUDENT";
                  const isTeacher = r.personnelType === "TEACHER";
                  const displayName = isStudent ? (r.studentName || r.employeeName) : (r.employeeName || r.studentName);
                  const displayCode = isStudent ? (r.studentCode || r.employeeCode) : (r.employeeCode || r.studentCode);
                  const s1In = r.shift1CheckIn || r.firstCheckIn;
                  const s1Out = r.shift1CheckOut;
                  const s2In = r.shift2CheckIn;
                  const s2Out = r.shift2CheckOut || r.lastCheckOut;

                  return (
                    <tr
                      key={r.id || `${r.attendanceDate}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px] border-r border-slate-100 dark:border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {r.attendanceDate}
                      </td>
                      {/* PERSONNEL & ROLE */}
                      <td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border ${
                              isStudent
                                ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                : isTeacher
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                            }`}
                          >
                            {isStudent ? (
                              <UserCheck size={15} />
                            ) : isTeacher ? (
                              <GraduationCap size={15} />
                            ) : (
                              <Briefcase size={15} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {displayName}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                  isStudent
                                    ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                                    : isTeacher
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                }`}
                              >
                                {r.personnelType || "STAFF"}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                              PIN: {displayCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* DEPARTMENT / CLASS */}
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                        {isStudent ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                              {r.studentGrade || "Student"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.studentClassName || "General"}
                            </span>
                          </div>
                        ) : (
                          <span>{r.departmentName || "Staff"}</span>
                        )}
                      </td>

                      {/* SHIFT */}
                      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block text-center truncate max-w-[130px]">
                          {r.shiftName || "Standard Full"}
                        </span>
                      </td>

                      {/* SHIFT 1: First In */}
                      <td className="py-3 px-2 text-center bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-100 dark:border-slate-800/40">
                        {s1In ? (
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {formatTime(s1In)}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                        )}
                      </td>

                      {/* SHIFT 1: Last Out (Lunch Out) */}
                      <td className="py-3 px-2 text-center bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-200/80 dark:border-slate-800">
                        {s1Out ? (
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                            {formatTime(s1Out)}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                        )}
                      </td>

                      {/* SHIFT 2: First In (Lunch In) */}
                      <td className="py-3 px-2 text-center bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-100 dark:border-slate-800/40">
                        {s2In ? (
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {formatTime(s2In)}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                        )}
                      </td>

                      {/* SHIFT 2: Last Out (Evening Out) */}
                      <td className="py-3 px-2 text-center bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-200/80 dark:border-slate-800">
                        {s2Out ? (
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {formatTime(s2Out)}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                        )}
                      </td>

                      {/* LATE */}
                      <td className="py-3 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {r.lateMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20 whitespace-nowrap text-xs">
                            <Clock size={11} className="shrink-0" />
                            +{r.lateMinutes}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            <CheckCircle2 size={12} className="shrink-0" />
                            On Time
                          </span>
                        )}
                      </td>

                      {/* NET WORK */}
                      <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {r.totalWorkMinutes > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                            {Math.floor(r.totalWorkMinutes / 60)}h {r.totalWorkMinutes % 60}m
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0h 0m</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                            r.status === "PRESENT"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                              : r.status === "LATE"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                              : r.status === "ABSENT"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                              : r.status === "ON_LEAVE"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {r.status === "PRESENT" && <CheckCircle2 size={11} />}
                          {r.status === "LATE" && <Clock size={11} />}
                          {r.status === "ABSENT" && <UserX size={11} />}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
