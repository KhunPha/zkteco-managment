"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Check, X, RefreshCw, Calendar } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=100");
      return res.data?.data?.content || [];
    },
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["all-leave-types"],
    queryFn: async () => {
      const res = await api.get("/api/v1/leaves/types");
      return res.data?.data || [];
    },
  });

  const { data: requestsData, isLoading, refetch } = useQuery({
    queryKey: ["leave-requests", status],
    queryFn: async () => {
      const res = await api.get(`/api/v1/leaves/requests?status=${status}`);
      return res.data?.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/leaves/requests", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["leave-requests"]);
      setShowModal(false);
      setFeedback("Leave request submitted successfully");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const reviewLeave = async (id, approved) => {
    let rejectionReason = null;
    if (!approved) {
      rejectionReason = prompt("Reason for rejection:") || "Disapproved";
    }

    try {
      await api.post(`/api/v1/leaves/requests/${id}/review`, { approved, rejectionReason });
      setFeedback(approved ? "✓ Leave approved" : "Leave rejected");
      queryClient.invalidateQueries(["leave-requests"]);
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const records = requestsData?.content || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Leave Requests & Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Statutory annual leave, sick leave, maternity leave, and absence authorizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {feedback && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {feedback}
            </span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center justify-between gap-4 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1">
          {["PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                status === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Category</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading leave requests...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No {status.toLowerCase()} leave requests</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{r.employeeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.employeeCode}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {r.leaveTypeName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {r.totalDays} days
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300 truncate" title={r.reason}>
                      {r.reason || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : r.status === "REJECTED"
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => reviewLeave(r.id, true)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve Leave"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => reviewLeave(r.id, false)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Reject Leave"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.approverName || "Reviewed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Apply Leave */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Apply for Leave</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate({
                  employeeId: Number(formData.employeeId),
                  leaveTypeId: Number(formData.leaveTypeId),
                  startDate: formData.startDate,
                  endDate: formData.endDate,
                  reason: formData.reason,
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Leave Category *</label>
                <select
                  required
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.paid ? "Paid" : "Unpaid"})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Detail reason for leave..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  disabled={submitMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

