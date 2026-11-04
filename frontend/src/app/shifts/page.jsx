"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Edit2, RefreshCw, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);

  const initialForm = {
    code: "",
    name: "Standard 8-Hour Full Shift (No Break)",
    startTime: "08:00:00",
    endTime: "16:00:00",
    hasBreak: false,
    breakStart: "",
    breakEnd: "",
    graceLateMinutes: 15,
    graceEarlyLeaveMinutes: 15,
    workHours: 8.0,
    overnight: false,
    flexible: false,
  };

  const [formData, setFormData] = useState(initialForm);

  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shifts");
      return res.data?.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const dataToSend = {
        ...payload,
        breakStart: payload.hasBreak && payload.breakStart ? payload.breakStart : null,
        breakEnd: payload.hasBreak && payload.breakEnd ? payload.breakEnd : null,
      };

      if (editingShiftId) {
        const res = await api.put(`/api/v1/shifts/${editingShiftId}`, dataToSend);
        return res.data?.data;
      } else {
        const res = await api.post("/api/v1/shifts", dataToSend);
        return res.data?.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-shifts"]);
      setShowModal(false);
      setEditingShiftId(null);
      setFormData(initialForm);
    },
    onError: (err) => {
      alert("Error saving shift: " + (err.response?.data?.message || err.message));
    },
  });

  const openEditModal = (shift) => {
    setEditingShiftId(shift.id);
    const hasBreak = !!(shift.breakStart && shift.breakEnd);
    setFormData({
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      hasBreak: hasBreak,
      breakStart: shift.breakStart || "",
      breakEnd: shift.breakEnd || "",
      graceLateMinutes: shift.graceLateMinutes,
      graceEarlyLeaveMinutes: shift.graceEarlyLeaveMinutes,
      workHours: shift.workHours,
      overnight: shift.overnight,
      flexible: shift.flexible,
    });
    setShowModal(true);
  };

  const deleteShift = async (id) => {
    if (!confirm("Are you sure you want to remove this shift?")) return;
    try {
      await api.delete(`/api/v1/shifts/${id}`);
      queryClient.invalidateQueries(["all-shifts"]);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Work Shifts & Hours Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define daily operating hours, grace periods, and break rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Shifts"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setEditingShiftId(null);
              setFormData(initialForm);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            <span>Add Work Shift</span>
          </button>
        </div>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading shifts...</div>
        ) : shifts?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No work shifts configured</p>
          </div>
        ) : (
          shifts?.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{s.name}</h3>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    {s.code}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Shift"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => deleteShift(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Shift"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800/80 py-3">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Working Hours:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {s.startTime} → {s.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Break Schedule:</span>
                  <span
                    className={
                      s.breakStart
                        ? "font-mono text-slate-700 dark:text-slate-300"
                        : "font-semibold text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {s.breakStart ? `${s.breakStart} → ${s.breakEnd}` : "Full Hours (No Break)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grace Late:</span>
                  <span className="font-semibold text-amber-600">+{s.graceLateMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Target:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{s.workHours} Hours Full</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Active
                </span>
                {!s.breakStart && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    8h Full / No Break
                  </span>
                )}
                {s.overnight && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-200">
                    Overnight Shift
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add / Edit Shift */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingShiftId ? "Edit Work Shift" : "Create Work Shift"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingShiftId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Shift Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingShiftId}
                    placeholder="e.g. SHIFT_8H"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Shift Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full 8-Hour Shift"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time * (8h: 16:00:00)
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Break toggle */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="hasBreak" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Enable Lunch / Break Deduction
                  </label>
                  <input
                    type="checkbox"
                    id="hasBreak"
                    checked={formData.hasBreak}
                    onChange={(e) => setFormData({ ...formData, hasBreak: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {formData.hasBreak
                    ? "Break duration will be subtracted from total working time."
                    : "No break time: 100% of attendance duration counts as net working hours (8 hours full)."}
                </p>

                {formData.hasBreak && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Break Start
                      </label>
                      <input
                        type="time"
                        step="1"
                        value={formData.breakStart}
                        onChange={(e) => setFormData({ ...formData, breakStart: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Break End
                      </label>
                      <input
                        type="time"
                        step="1"
                        value={formData.breakEnd}
                        onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Grace Late (Minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.graceLateMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, graceLateMinutes: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Work Hours Full
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.workHours}
                    onChange={(e) =>
                      setFormData({ ...formData, workHours: parseFloat(e.target.value) || 8.0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="overnight"
                  checked={formData.overnight}
                  onChange={(e) => setFormData({ ...formData, overnight: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label
                  htmlFor="overnight"
                  className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Overnight Shift (Past midnight)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingShiftId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md transition-colors"
                >
                  {saveMutation.isPending ? "Saving..." : editingShiftId ? "Update Shift" : "Save Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
