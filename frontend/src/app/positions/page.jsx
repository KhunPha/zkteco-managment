"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Trash2, Building2, Search, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import Portal from "@/components/common/Portal";

export default function PositionsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    active: true,
  });

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["all-positions"],
    queryFn: async () => {
      const res = await api.get("/api/v1/positions");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/positions", {
        code: payload.code.trim().toUpperCase(),
        title: payload.title.trim(),
        description: payload.description ? payload.description.trim() : null,
        active: payload.active,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-positions"]);
      setShowModal(false);
      setFormData({ code: "", title: "", description: "", active: true });
    },
    onError: (err) => {
      alert("Failed to save position: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/v1/positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-positions"]);
    },
    onError: (err) => {
      alert("Failed to delete position: " + (err.response?.data?.message || err.message));
    },
  });

  const handleDelete = (pos) => {
    if (!confirm(`Delete position "${pos.title}" (${pos.code})?`)) return;
    deleteMutation.mutate(pos.id);
  };

  const filteredPositions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return positions;
    return positions.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [positions, search]);

  const activeCount = positions.filter((p) => p.active !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/departments"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Departments</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Job Titles</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Briefcase size={24} className="text-indigo-600 dark:text-indigo-400" />
            <span>Job Titles & Positions</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define organizational roles, staff designations, and position codes used in employee profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/departments"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
          >
            <Building2 size={15} className="text-slate-500" />
            <span>View Departments</span>
          </Link>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Total Positions
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {positions.length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Active Job Titles
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {activeCount}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Profile Linkage
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
            <span>Used in Employee Profiles</span>
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 max-w-md shadow-xs">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter by title, code, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-slate-400 hover:text-slate-600">
            ✕
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading positions...</div>
        ) : filteredPositions.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No positions or job titles found</p>
            <p className="text-xs text-slate-500 mt-1">Click &quot;Add Position&quot; above to create your first job title.</p>
          </div>
        ) : (
          filteredPositions.map((pos) => (
            <div
              key={pos.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {pos.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                      {pos.code}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      pos.active !== false
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {pos.active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(pos)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  title="Delete Position"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {pos.description ? (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {pos.description}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                  Standard organizational role
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Position */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Job Title</h3>
                    <p className="text-[11px] text-slate-500">Designation for employees & teachers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
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
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Position / Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Software Engineer, Accountant"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Position Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SWE, ACC, HRM, TCHR"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Short unique identifier</p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Role responsibilities, level, or department notes..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {createMutation.isPending ? "Saving..." : "Create Position"}
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

