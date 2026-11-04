"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitFork, Plus, Trash2, MapPin, Phone, Mail } from "lucide-react";
import api from "@/lib/api";

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["all-branches"],
    queryFn: async () => {
      const res = await api.get("/api/v1/branches");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/branches", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-branches"]);
      setShowModal(false);
      setFormData({ code: "", name: "", address: "", phone: "", email: "" });
    },
  });

  const deleteBranch = async (id) => {
    if (!confirm("Remove this branch?")) return;
    try {
      await api.delete(`/api/v1/branches/${id}`);
      queryClient.invalidateQueries(["all-branches"]);
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
            Branches & Campuses
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-branch physical locations and campus attendance networks
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Campus Branch</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading branches...</div>
        ) : branches?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <GitFork size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No branches registered</p>
          </div>
        ) : (
          branches?.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{b.name}</h3>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{b.code}</span>
                </div>
                <button
                  onClick={() => deleteBranch(b.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{b.address || "Main City Campus"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{b.phone || "+855 23 888 999"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Campus Branch</h3>
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PP-MAIN, SR-CAMPUS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siem Reap Branch Campus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. National Road 6, Siem Reap, Cambodia"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+855 63 999 888"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sr@enterprise.edu.kh"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                  {createMutation.isPending ? "Saving..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

