"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  UserCheck,
  UserX,
  ClockAlert,
  CalendarOff,
  Briefcase,
  Percent,
  Cpu,
  RefreshCw,
  Play,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import api from "@/lib/api";
import { useState } from "react";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [processMsg, setProcessMsg] = useState("");

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/dashboard/summary");
      return res.data?.data;
    },
    refetchInterval: 15000, // Live poll every 15s
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/attendance/process");
      return res.data?.data;
    },
    onSuccess: (data) => {
      setProcessMsg(`Processed ${data.totalProcessed} records with 0 errors!`);
      queryClient.invalidateQueries(["dashboard-summary"]);
      setTimeout(() => setProcessMsg(""), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Employees",
      value: summary?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Total Students",
      value: summary?.totalStudents ?? 0,
      icon: GraduationCap,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      title: "Present Today",
      value: summary?.presentToday ?? 0,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "Late Arrival",
      value: summary?.lateToday ?? 0,
      icon: ClockAlert,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      title: "Absent Today",
      value: summary?.absentToday ?? 0,
      icon: UserX,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
    {
      title: "On Leave",
      value: summary?.onLeaveToday ?? 0,
      icon: CalendarOff,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      title: "Currently Working",
      value: summary?.currentlyWorking ?? 0,
      icon: Briefcase,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/40",
    },
    {
      title: "Attendance Rate",
      value: `${summary?.attendancePercentage ?? 0}%`,
      icon: Percent,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live telemetry from synchronized ZKTeco biometric terminals
          </p>
        </div>
        <div className="flex items-center gap-3">
          {processMsg && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              {processMsg}
            </span>
          )}
          <button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Play size={14} />
            <span>{processMutation.isPending ? "Calculating..." : "Run Engine Now"}</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Terminal Hardware Connectivity Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Terminal Infrastructure Status</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Biometric Push & TCP Standalone Network</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 dark:text-slate-400">Online Terminals:</span>
            <span className="text-slate-900 dark:text-white font-mono font-bold text-sm">
              {summary?.devicesOnline ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Offline / Standby:</span>
            <span className="text-slate-900 dark:text-white font-mono font-bold text-sm">
              {summary?.devicesOffline ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">7-Day Attendance Trend</h3>
            <span className="text-xs text-slate-400 font-medium">Daily Metrics</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Attendance Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Turnout Today</h3>
            <span className="text-xs text-slate-400 font-medium">Present vs Total</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.departmentStats || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="employeeCount" name="Total Staff" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="presentCount" name="Present Today" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

