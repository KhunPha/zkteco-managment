"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Plus, Trash2, RefreshCw, Users, Clock } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    shiftId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["all-schedules"],
    queryFn: async () => {
      const res = await api.get("/api/v1/schedules");
      return res.data?.data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=100");
      return res.data?.data?.content || [];
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shifts");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/schedules", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-schedules"]);
      setShowModal(false);
    },
  });

  const deleteSchedule = async (id) => {
    if (!confirm("Remove this schedule assignment?")) return;
    try {
      await api.delete(`/api/v1/schedules/${id}`);
      queryClient.invalidateQueries(["all-schedules"]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const days = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Schedule & Roster Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign shift profiles and working days to individual staff and teachers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Assign Schedule</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Assigned Shift</th>
                <th className="py-3 px-4">Working Weekdays</th>
                <th className="py-3 px-4">Effective Range</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading schedules...</td>
                </tr>
              ) : schedules?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <CalendarRange size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No custom schedules assigned</p>
                    <p className="text-[11px]">Employees without custom schedules automatically follow standard office hours.</p>
                  </td>
                </tr>
              ) : (
                schedules?.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{sc.employeeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sc.employeeCode}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {sc.shiftName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {days.map((d) => {
                          const active = sc[d.key];
                          return (
                            <span
                              key={d.key}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                active
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                                  : "text-slate-300 dark:text-slate-700"
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDate(sc.effectiveFrom)} → {sc.effectiveTo ? formatDate(sc.effectiveTo) : "Ongoing"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteSchedule(sc.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Remove Assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assign Schedule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Schedule Roster</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  ...formData,
                  employeeId: Number(formData.employeeId),
                  shiftId: Number(formData.shiftId),
                  effectiveTo: formData.effectiveTo || null,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Employee *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.englishName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Shift *</label>
                <select
                  required
                  value={formData.shiftId}
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Shift</option>
                  {shifts?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Effective Until</label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">Applicable Weekdays</label>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <label key={d.key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[d.key]}
                        onChange={(e) => setFormData({ ...formData, [d.key]: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                >
                  {createMutation.isPending ? "Assigning..." : "Assign Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

