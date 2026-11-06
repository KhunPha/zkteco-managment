"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  RefreshCw,
  Search,
  Play,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import api from "@/lib/api";
import { formatTime, formatDate } from "@/lib/utils";
import Pagination from "@/components/common/Pagination";

export default function DailyAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [personnelType, setPersonnelType] = useState("ALL"); // ALL, TEACHER, EMPLOYEE, STUDENT
  const [orderBy, setOrderBy] = useState("ROLE_TEACHER_FIRST"); // ROLE_TEACHER_FIRST, ROLE_STUDENT_FIRST, ROLE_EMPLOYEE_FIRST, TIME_DESC, TIME_ASC, NAME_ASC
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [calcMsg, setCalcMsg] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const isToday = date === new Date().toISOString().split("T")[0];

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ["attendance-records", date, departmentId, status, search, personnelType, orderBy, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/attendance?date=${date}&page=${page}&size=${pageSize}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (personnelType && personnelType !== "ALL") url += `&personnelType=${personnelType}`;
      if (orderBy) url += `&orderBy=${orderBy}`;
      const res = await api.get(url);
      return res.data?.data;
    },
    refetchInterval: isToday ? 1000 : false, // Ultra-fast 1-second live stream for today
    staleTime: 0,
    refetchIntervalInBackground: true,
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/v1/attendance/process?date=${date}`);
      return res.data?.data;
    },
    onSuccess: (data) => {
      setCalcMsg(`Processed: ${data.totalProcessed} records, ${data.totalErrors} errors`);
      queryClient.invalidateQueries(["attendance-records"]);
      setTimeout(() => setCalcMsg(""), 4000);
    },
  });

  const records = attendanceData?.content || [];

  const presentCount = records.filter(r => r.status === "PRESENT" || r.status === "LATE" || r.status === "EARLY_DEPARTURE").length;
  const lateCount = records.filter(r => r.status === "LATE").length;
  const absentCount = records.filter(r => r.status === "ABSENT").length;
  const leaveCount = records.filter(r => r.status === "ON_LEAVE").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Daily Attendance Records</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {date}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time biometric attendance across Teachers, Staff Officers, and Enrolled Students
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isToday ? "⚡ Ultra-Fast Live Sync (1s)" : "Historical Archive"}</span>
          </div>
          {calcMsg && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-fade-in shadow-2xs">
              {calcMsg}
            </span>
          )}
          <button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover-lift active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play size={14} className={processMutation.isPending ? "animate-spin" : ""} />
            <span>{processMutation.isPending ? "Calculating..." : "Recalculate Day"}</span>
          </button>
        </div>
      </div>

      {/* Personnel Category Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setPersonnelType("ALL");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "ALL"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users size={15} />
          <span>All Personnel</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelType("TEACHER");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "TEACHER"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap size={15} className={personnelType === "TEACHER" ? "text-white" : "text-amber-500"} />
          <span>Teachers & Academic</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelType("EMPLOYEE");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "EMPLOYEE"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase size={15} className={personnelType === "EMPLOYEE" ? "text-white" : "text-emerald-500"} />
          <span>Staff & Officers</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelType("STUDENT");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "STUDENT"
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserCheck size={15} className={personnelType === "STUDENT" ? "text-white" : "text-cyan-500"} />
          <span>Enrolled Students</span>
        </button>
      </div>

      {/* Date & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            />
          </div>

          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {personnelType !== "STUDENT" && (
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Departments</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d.name}</option>
              ))}
            </select>
          )}

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
            <option value="PRESENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Present</option>
            <option value="LATE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Late Arrival</option>
            <option value="EARLY_DEPARTURE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Early Departure</option>
            <option value="ABSENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Absent</option>
            <option value="ON_LEAVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">On Leave</option>
            <option value="REST_DAY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Rest Day</option>
          </select>

          {/* Order By Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="ROLE_TEACHER_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Teachers First</option>
              <option value="ROLE_STUDENT_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Students First</option>
              <option value="ROLE_EMPLOYEE_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Staff First</option>
              <option value="TIME_DESC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Latest Punch First</option>
              <option value="TIME_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Earliest Punch First</option>
              <option value="NAME_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Name (A - Z)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer hover:scale-110 active:scale-95 transition-all"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Mini Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between shadow-2xs hover-lift">
          <span className="font-bold text-emerald-800 dark:text-emerald-300">Present</span>
          <span className="font-mono font-black text-emerald-900 dark:text-emerald-200 text-lg">{presentCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between shadow-2xs hover-lift">
          <span className="font-bold text-amber-800 dark:text-amber-300">Late</span>
          <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-lg">{lateCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-between shadow-2xs hover-lift">
          <span className="font-bold text-rose-800 dark:text-rose-300">Absent</span>
          <span className="font-mono font-black text-rose-900 dark:text-rose-200 text-lg">{absentCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between shadow-2xs hover-lift">
          <span className="font-bold text-purple-800 dark:text-purple-300">On Leave</span>
          <span className="font-mono font-black text-purple-900 dark:text-purple-200 text-lg">{leaveCount}</span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th rowSpan={2} className="py-3.5 px-4 text-left border-r border-slate-200/60 dark:border-slate-800 min-w-[220px]">
                  Personnel & Role
                </th>
                <th rowSpan={2} className="py-3.5 px-3.5 text-left border-r border-slate-200/60 dark:border-slate-800 min-w-[150px]">
                  Shift
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-400/5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-extrabold tracking-normal normal-case">
                    <span>🌅 Shift 1 (Morning)</span>
                  </div>
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800 bg-indigo-500/5 dark:bg-indigo-400/5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-extrabold tracking-normal normal-case">
                    <span>🌆 Shift 2 (Afternoon)</span>
                  </div>
                </th>
                <th rowSpan={2} className="py-3.5 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[105px] whitespace-nowrap">
                  Late
                </th>
                <th rowSpan={2} className="py-3.5 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[105px]">
                  Total Work
                </th>
                <th rowSpan={2} className="py-3.5 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px]">
                  Overtime
                </th>
                <th rowSpan={2} className="py-3.5 px-4 text-center min-w-[120px]">
                  Status
                </th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2 px-3 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[105px]">
                  First In
                </th>
                <th className="py-2 px-3 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[105px]">
                  Last Out
                </th>
                <th className="py-2 px-3 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[105px]">
                  First In
                </th>
                <th className="py-2 px-3 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[105px]">
                  Last Out
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">Loading daily attendance records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <CalendarCheck size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No attendance records for {date}</p>
                    <p className="text-[11px]">Click "Recalculate Day" to compute records from raw terminal logs.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isStudent = r.personnelType === "STUDENT";
                  const isTeacher = r.personnelType === "TEACHER";

                  const s1In = r.shift1CheckIn || r.firstCheckIn;
                  const s1Out = r.shift1CheckOut;
                  const s2In = r.shift2CheckIn;
                  const s2Out = r.shift2CheckOut || r.lastCheckOut;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* PERSONNEL & ROLE */}
                      <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border ${
                              isStudent
                                ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                : isTeacher
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                            }`}
                          >
                            {isStudent ? (
                              <UserCheck size={16} />
                            ) : isTeacher ? (
                              <GraduationCap size={16} />
                            ) : (
                              <Briefcase size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                {r.employeeName || "Unnamed"}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase ${
                                  isStudent
                                    ? "bg-cyan-100/70 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300"
                                    : isTeacher
                                    ? "bg-amber-100/70 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {r.personnelType || "EMPLOYEE"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">PIN: {r.employeeCode}</span>
                              <span>•</span>
                              <span className="truncate">
                                {isStudent
                                  ? `${r.studentGrade || "Secondary"} | ${r.studentClassName || "General"}`
                                  : isTeacher
                                  ? `${r.departmentName || "Academic Affairs"}`
                                  : `${r.departmentName || "Staff"}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SHIFT */}
                      <td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-200 block text-xs">
                            {r.shiftName || "Standard Full Shift"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/80" />
                            2-Shift Work
                          </span>
                        </div>
                      </td>

                      {/* SHIFT 1: First Check-In */}
                      <td className="py-3 px-3 bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-100 dark:border-slate-800/40 text-center">
                        {s1In ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white tracking-wider">
                              {formatTime(s1In)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[95px] mt-0.5" title={r.inDeviceName || "Terminal In"}>
                              {r.inDeviceName ? r.inDeviceName.split(" ")[0] : "Gate In"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-xs">--:--:--</span>
                            <span className="text-[9px] text-slate-300/60 dark:text-slate-700 font-mono mt-0.5">No Punch</span>
                          </div>
                        )}
                      </td>

                      {/* SHIFT 1: Last Check-Out (Lunch Break Out) */}
                      <td className="py-3 px-3 bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-200/80 dark:border-slate-800 text-center">
                        {s1Out ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 tracking-wider">
                              {formatTime(s1Out)}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                              Lunch Out
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-xs">--:--:--</span>
                            <span className="text-[9px] text-slate-300/60 dark:text-slate-700 font-mono mt-0.5">No Punch</span>
                          </div>
                        )}
                      </td>

                      {/* SHIFT 2: First Check-In (Lunch Break In / Resume) */}
                      <td className="py-3 px-3 bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-100 dark:border-slate-800/40 text-center">
                        {s2In ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 tracking-wider">
                              {formatTime(s2In)}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold mt-0.5">
                              Resume In
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-xs">--:--:--</span>
                            <span className="text-[9px] text-slate-300/60 dark:text-slate-700 font-mono mt-0.5">No Punch</span>
                          </div>
                        )}
                      </td>

                      {/* SHIFT 2: Last Check-Out (Evening Out) */}
                      <td className="py-3 px-3 bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-200/80 dark:border-slate-800 text-center">
                        {s2Out ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white tracking-wider">
                              {formatTime(s2Out)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[95px] mt-0.5" title={r.outDeviceName || "Terminal Out"}>
                              {r.outDeviceName ? r.outDeviceName.split(" ")[0] : "Gate Out"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-xs">--:--:--</span>
                            <span className="text-[9px] text-slate-300/60 dark:text-slate-700 font-mono mt-0.5">No Punch</span>
                          </div>
                        )}
                      </td>

                      {/* LATE */}
                      <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap min-w-[105px]">
                        {r.lateMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20 whitespace-nowrap text-xs">
                            <Clock size={11} className="shrink-0" />
                            +{r.lateMinutes}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            <CheckCircle size={12} className="shrink-0" />
                            On Time
                          </span>
                        )}
                      </td>

                      {/* TOTAL WORK */}
                      <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                        <span className="inline-flex items-center font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap">
                          {Math.floor(r.totalWorkMinutes / 60)}h {r.totalWorkMinutes % 60}m
                        </span>
                      </td>

                      {/* OVERTIME */}
                      <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800">
                        {r.overtimeMinutes > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold border border-indigo-500/20 whitespace-nowrap text-xs">
                            +{r.overtimeMinutes}m
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-4 text-center">
                        {r.status === "PRESENT" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            PRESENT
                          </span>
                        )}
                        {r.status === "LATE" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-2xs">
                            <AlertTriangle size={11} className="shrink-0" />
                            LATE
                          </span>
                        )}
                        {r.status === "ABSENT" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ABSENT
                          </span>
                        )}
                        {r.status === "ON_LEAVE" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 whitespace-nowrap shadow-2xs">
                            <Calendar size={11} className="shrink-0" />
                            ON LEAVE
                          </span>
                        )}
                        {!["PRESENT", "LATE", "ABSENT", "ON_LEAVE"].includes(r.status) && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {r.status}
                          </span>
                        )}
                        {r.manualAdjusted && (
                          <span className="block text-[9px] text-indigo-500 font-medium mt-1">Manual Adj</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={attendanceData?.pageNumber ?? page}
          totalPages={attendanceData?.totalPages ?? 1}
          totalElements={attendanceData?.totalElements ?? 0}
          pageSize={pageSize}
          pageSizeOptions={[20, 50, 100]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          itemLabel="attendance records"
        />
      </div>
    </div>
  );
}

