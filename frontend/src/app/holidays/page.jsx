"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, Calendar, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Portal from "@/components/common/Portal";

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    holidayDate: new Date().toISOString().split("T")[0],
    endDate: "",
    recurring: false,
    affectsTeachers: true,
    affectsStudents: true,
  });

  const { data: holidays, isLoading, refetch } = useQuery({
    queryKey: ["all-holidays"],
    queryFn: async () => {
      const res = await api.get("/api/v1/holidays");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const cleanPayload = {
        ...payload,
        endDate: isRangeMode && payload.endDate ? payload.endDate : null,
      };
      const res = await api.post("/api/v1/holidays", cleanPayload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-holidays"]);
      setShowModal(false);
      setIsRangeMode(false);
      setFormData({
        name: "",
        holidayDate: new Date().toISOString().split("T")[0],
        endDate: "",
        recurring: false,
        affectsTeachers: true,
        affectsStudents: true,
      });
    },
    onError: (err) => {
      alert("Error: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteHoliday = async (id) => {
    if (!confirm("Are you sure you want to remove this holiday?")) return;
    try {
      await api.delete(`/api/v1/holidays/${id}`);
      queryClient.invalidateQueries(["all-holidays"]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleSeedCambodia = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg("");
    try {
      const res = await api.post("/api/v1/holidays/seed-cambodia");
      queryClient.invalidateQueries(["all-holidays"]);
      setSeedSuccessMsg("✓ បញ្ចូលបុណ្យជាតិខ្មែរជោគជ័យ (Khmer New Year 3-Days, Pchum Ben, etc.)");
      setTimeout(() => setSeedSuccessMsg(""), 5000);
    } catch (err) {
      alert("Error populating holidays: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSeeding(false);
    }
  };

  // Calculate range days for preview
  const getDaysCount = () => {
    if (!isRangeMode || !formData.endDate || !formData.holidayDate) return 1;
    const start = new Date(formData.holidayDate);
    const end = new Date(formData.endDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Official Holiday Calendar</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
              Date Ranges Supported
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Public national holidays, multi-day vacations (Khmer New Year 3-day holiday, Pchum Ben), and academic closures
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {seedSuccessMsg && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={14} />
              <span>{seedSuccessMsg}</span>
            </span>
          )}

          <button
            onClick={handleSeedCambodia}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Populate standard Cambodian official national holidays (Khmer New Year, Pchum Ben, etc.)"
          >
            <Sparkles size={14} className={isSeeding ? "animate-spin" : ""} />
            <span>{isSeeding ? "កំពុងបញ្ចូល..." : "🇰🇭 បញ្ចូលបុណ្យជាតិខ្មែរ (Add Khmer Holidays)"}</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Holiday (Single or Range)</span>
          </button>
        </div>
      </div>

      {/* Grid of Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading holidays...</div>
        ) : holidays?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 space-y-3">
            <CalendarDays size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">No holidays registered yet</p>
            <p className="text-xs text-slate-500">
              Click &quot;🇰🇭 បញ្ចូលបុណ្យជាតិខ្មែរ&quot; to auto-populate Khmer New Year (3 days), Pchum Ben, and national holidays.
            </p>
          </div>
        ) : (
          holidays?.map((h) => {
            const isRange = h.endDate && h.daysCount > 1;
            return (
              <div
                key={h.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-shadow shadow-xs space-y-3 ${
                  isRange
                    ? "border-amber-300 dark:border-amber-800/80 bg-gradient-to-br from-amber-50/20 via-white to-transparent dark:from-amber-950/10 dark:via-slate-900"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                      {h.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                      <Calendar size={14} className="shrink-0" />
                      <span>
                        {isRange
                          ? `${formatDate(h.holidayDate)} – ${formatDate(h.endDate)}`
                          : formatDate(h.holidayDate)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHoliday(h.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    title="Delete holiday"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 text-[10px] font-semibold border-t border-slate-100 dark:border-slate-800">
                  {isRange && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      🎉 {h.daysCount} Days Range (ឈប់សម្រាក {h.daysCount} ថ្ងៃ)
                    </span>
                  )}
                  {h.recurring && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      Annual Recurring
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Affects Teachers & Students
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Holiday (Supports Single Day & Date Range) */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Register Official Holiday
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure a single holiday date or a multi-day range (e.g. Khmer New Year 3 days)
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(formData);
                }}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
                  {/* Mode Selector: Single Day vs Date Range */}
                  <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsRangeMode(false)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                        !isRangeMode
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      📅 Single Day (១ ថ្ងៃ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRangeMode(true)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                        isRangeMode
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      🗓️ Date Range (ចន្លោះច្រើនថ្ងៃ - ឧ. ៣ ថ្ងៃ)
                    </button>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Holiday Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Khmer New Year (ពិធីបុណ្យចូលឆ្នាំខ្មែរ)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Dates Configuration */}
                  {!isRangeMode ? (
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Holiday Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.holidayDate}
                        onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Start Date (ថ្ងៃចាប់ផ្ដើម) *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.holidayDate}
                            onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            End Date (ថ្ងៃបញ្ចប់) *
                          </label>
                          <input
                            type="date"
                            required
                            min={formData.holidayDate}
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Range Duration Banner */}
                      {formData.holidayDate && formData.endDate && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          <Calendar size={15} />
                          <span>
                            {getDaysCount() > 0
                              ? `រយៈពេលសរុប: ${getDaysCount()} ថ្ងៃ (${formData.holidayDate} ដល់ ${formData.endDate})`
                              : "ថ្ងៃបញ្ចប់ត្រូវតែក្រោយថ្ងៃចាប់ផ្ដើម"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.recurring}
                      onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="recurring" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Recurring Annual Holiday (កើតឡើងរៀងរាល់ឆ្នាំ)
                    </label>
                  </div>
                </div>

                {/* Pinned Sticky Footer */}
                <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || (isRangeMode && getDaysCount() <= 0)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Holiday"}
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
