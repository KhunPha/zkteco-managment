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
} from "lucide-react";
import api from "@/lib/api";
import { formatTime, formatDate } from "@/lib/utils";

export default function DailyAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [calcMsg, setCalcMsg] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ["attendance-records", date, departmentId, status],
    queryFn: async () => {
      let url = `/api/v1/attendance?date=${date}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;
      const res = await api.get(url);
      return res.data?.data;
    },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daily Attendance Records
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calculated punches, shifts, grace periods, overtime, and work duration
          </p>
        </div>
        <div className="flex items-center gap-3">
          {calcMsg && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {calcMsg}
            </span>
          )}
          <button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Play size={14} />
            <span>{processMutation.isPending ? "Calculating..." : "Recalculate Day"}</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            />
          </div>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late Arrival</option>
            <option value="EARLY_DEPARTURE">Early Departure</option>
            <option value="ABSENT">Absent</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="REST_DAY">Rest Day</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Mini Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300">Present</span>
          <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 text-base">{presentCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
          <span className="font-semibold text-amber-800 dark:text-amber-300">Late</span>
          <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-base">{lateCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-between">
          <span className="font-semibold text-rose-800 dark:text-rose-300">Absent</span>
          <span className="font-mono font-bold text-rose-900 dark:text-rose-200 text-base">{absentCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between">
          <span className="font-semibold text-purple-800 dark:text-purple-300">On Leave</span>
          <span className="font-mono font-bold text-purple-900 dark:text-purple-200 text-base">{leaveCount}</span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">First Check-In</th>
                <th className="py-3 px-4">Last Check-Out</th>
                <th className="py-3 px-4">Late</th>
                <th className="py-3 px-4">Total Work</th>
                <th className="py-3 px-4">Overtime</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading daily attendance records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarCheck size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No attendance records for {date}</p>
                    <p className="text-[11px]">Click "Recalculate Day" to compute records from raw terminal logs.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const getBadge = (st) => {
                    switch (st) {
                      case "PRESENT":
                        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
                      case "LATE":
                        return "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
                      case "EARLY_DEPARTURE":
                        return "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                      case "ABSENT":
                        return "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
                      case "ON_LEAVE":
                        return "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800";
                      default:
                        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
                    }
                  };

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {r.employeeName ? r.employeeName[0].toUpperCase() : "E"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{r.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.employeeCode} • {r.departmentName || "Dept"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.shiftName || "Morning Shift"}
                      </td>
                      <td className="py-3 px-4">
                        {r.firstCheckIn ? (
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              {formatTime(r.firstCheckIn)}
                            </span>
                            <span className="text-[10px] text-slate-400">{r.inDeviceName || "Terminal"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {r.lastCheckOut ? (
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              {formatTime(r.lastCheckOut)}
                            </span>
                            <span className="text-[10px] text-slate-400">{r.outDeviceName || "Terminal"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono">--:--:--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {r.lateMinutes > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">+{r.lateMinutes} m</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {Math.floor(r.totalWorkMinutes / 60)}h {r.totalWorkMinutes % 60}m
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {r.overtimeMinutes > 0 ? (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">+{r.overtimeMinutes} m</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getBadge(r.status)}`}>
                          {r.status}
                        </span>
                        {r.manualAdjusted && (
                          <span className="block text-[9px] text-indigo-500 font-medium mt-0.5">Manual Adj</span>
                        )}
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

