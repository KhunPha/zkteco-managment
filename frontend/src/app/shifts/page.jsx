"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Edit2, RefreshCw, CheckCircle2, Coffee, Sparkles, ArrowRight, Info } from "lucide-react";
import api from "@/lib/api";
import Portal from "@/components/common/Portal";

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Work Shifts & Hours Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define daily operating hours, grace periods, and 2-shift break rules (Shift 1 + Lunch Break + Shift 2)
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover-lift active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add Work Shift</span>
          </button>
        </div>
      </div>

      {/* 2-Shift & Scheduled Break Time Guidance Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Coffee size={18} className="text-amber-500 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Understanding 2-Shift Workdays (Shift 1 + Break Time + Shift 2)
            </h2>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            ✓ Break Duration is Excluded from Working Hours
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              1. Shift 1 (Morning)
            </span>
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
              Start Work → Lunch Start
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
              Personnel punch Check-In (F1) in the morning. Covers the morning work block (typically 4.0h).
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
              <Coffee size={12} />
              2. Scheduled Break (Lunch)
            </span>
            <span className="font-mono font-bold text-xs text-emerald-950 dark:text-emerald-200 block">
              Break Start → Break End
            </span>
            <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 block leading-relaxed">
              Rest period (1.0h to 1.5h). Automatically deducted so no one is penalized as late or early leave during lunch.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              3. Shift 2 (Afternoon)
            </span>
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
              Lunch End → Day Checkout
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
              Personnel resume work after lunch and punch Check-Out (F4) in the evening (typically 4.0h).
            </span>
          </div>
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
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover-lift transition-all"
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
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Shift"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => deleteShift(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Shift"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* 2-Shift Visual Indicator */}
              {s.breakStart && s.breakEnd ? (
                <div className="p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    <Coffee size={12} className="text-amber-500" />
                    2-Shift Working Model Active
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[9px] text-slate-400 block">Shift 1</span>
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{s.startTime.substring(0, 5)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                      <span className="text-[9px] block">Lunch</span>
                      <span className="font-bold block truncate">{s.breakStart.substring(0, 5)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[9px] text-slate-400 block">Shift 2</span>
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{s.endTime.substring(0, 5)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-500 shrink-0" />
                  <span>Continuous Single Shift (No Break Deduction)</span>
                </div>
              )}

              <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800/80 py-3">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Working Span:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {s.startTime} → {s.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Break Schedule:</span>
                  <span
                    className={
                      s.breakStart
                        ? "font-mono font-bold text-emerald-600 dark:text-emerald-400"
                        : "font-semibold text-slate-500 dark:text-slate-400"
                    }
                  >
                    {s.breakStart ? `${s.breakStart} → ${s.breakEnd}` : "Continuous (No Break)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grace Late:</span>
                  <span className="font-semibold text-amber-600">+{s.graceLateMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Target:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{s.workHours} Hours Net Work</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Active
                </span>
                {s.breakStart && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    2-Shift (Shift 1 / 2)
                  </span>
                )}
                {!s.breakStart && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Continuous
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
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingShiftId ? "Edit Work Shift" : "Create Work Shift"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingShiftId(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
                {/* Quick 1-Click 2-Shift Templates */}
                {!editingShiftId && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                      1-Click 2-Shift Presets:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          name: "Standard Office 2-Shift (with Lunch Break)",
                          code: formData.code || "SHIFT_OFFICE_2S",
                          startTime: "08:00:00",
                          endTime: "17:30:00",
                          hasBreak: true,
                          breakStart: "12:00:00",
                          breakEnd: "13:30:00",
                          workHours: 8.0,
                          graceLateMinutes: 15,
                          graceEarlyLeaveMinutes: 15,
                        })}
                        className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/60 transition-colors text-left"
                      >
                        <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300 block">Office 2-Shift</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">08:00–17:30 (12:00–13:30 break)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          name: "Academic School 2-Shift (Faculty)",
                          code: formData.code || "SHIFT_ACADEMIC_2S",
                          startTime: "07:30:00",
                          endTime: "16:30:00",
                          hasBreak: true,
                          breakStart: "11:30:00",
                          breakEnd: "13:00:00",
                          workHours: 7.5,
                          graceLateMinutes: 15,
                          graceEarlyLeaveMinutes: 15,
                        })}
                        className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700/60 transition-colors text-left"
                      >
                        <span className="font-bold text-xs text-amber-700 dark:text-amber-300 block">School 2-Shift</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">07:30–16:30 (11:30–13:00 break)</span>
                      </button>
                    </div>
                  </div>
                )}
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
              </div>

              {/* Pinned Sticky Footer - Never Cut Off */}
              <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingShiftId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : editingShiftId ? "Update Shift" : "Save Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
