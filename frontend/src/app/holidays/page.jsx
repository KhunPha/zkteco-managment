"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, Calendar, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    holidayDate: new Date().toISOString().split("T")[0],
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
      const res = await api.post("/api/v1/holidays", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-holidays"]);
      setShowModal(false);
      setFormData({
        name: "",
        holidayDate: new Date().toISOString().split("T")[0],
        recurring: false,
        affectsTeachers: true,
        affectsStudents: true,
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Official Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Public national holidays, institutional closures, and academic vacation dates
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading holidays...</div>
        ) : holidays?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No holidays registered</p>
          </div>
        ) : (
          holidays?.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{h.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1 font-semibold">
                    <Calendar size={14} />
                    <span>{formatDate(h.holidayDate)}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteHoliday(h.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 text-[10px] font-semibold border-t border-slate-100 dark:border-slate-800">
                {h.recurring && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                    Annual Recurring
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Affects Staff & Students
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Holiday */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Calendar Holiday</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khmer New Year (ចូលឆ្នាំខ្មែរ)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={formData.holidayDate}
                  onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="recurring" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Recurring Every Year
                </label>
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
                  {createMutation.isPending ? "Saving..." : "Save Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

