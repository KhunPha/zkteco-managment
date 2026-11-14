"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2, RefreshCw, Briefcase, ArrowRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import Portal from "@/components/common/Portal";

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  const { data: departments, isLoading } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/departments", {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        branchId: null,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-departments"]);
      setShowModal(false);
      setFormData({ code: "", name: "" });
    },
  });

  const deleteDepartment = async (id) => {
    if (!confirm("Remove this department?")) return;
    try {
      await api.delete(`/api/v1/departments/${id}`);
      queryClient.invalidateQueries(["all-departments"]);
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
            Departments & Faculties
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organizational units, academic faculties, and operational cost centers
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/positions"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
          >
            <Briefcase size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Manage Job Titles / Positions</span>
            <ArrowRight size={13} className="text-slate-400" />
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading departments...</div>
        ) : departments?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No departments found</p>
          </div>
        ) : (
          departments?.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{d.name}</h3>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{d.code}</span>
                </div>
                <button
                  onClick={() => deleteDepartment(d.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {d.branchName && (
                <div className="text-xs text-slate-500">
                  <span>Campus / Branch: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{d.branchName}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Department */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Department</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT, HR, ACAD, MKT"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Short uppercase unique identifier</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Information Technology"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Pinned Sticky Footer */}
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
                  {createMutation.isPending ? "Saving..." : "Create Department"}
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

