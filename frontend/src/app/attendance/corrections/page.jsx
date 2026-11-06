"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import Portal from "@/components/common/Portal";

export default function AttendanceCorrectionsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    attendanceDate: new Date().toISOString().split("T")[0],
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=100");
      return res.data?.data?.content || [];
    },
  });

  const { data: correctionsData, isLoading, refetch } = useQuery({
    queryKey: ["attendance-corrections", status],
    queryFn: async () => {
      const res = await api.get(`/api/v1/attendance/corrections?status=${status}`);
      return res.data?.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/attendance/corrections", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["attendance-corrections"]);
      setShowModal(false);
      setFeedback("Correction request submitted!");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const reviewCorrection = async (id, approved) => {
    let rejectionReason = null;
    if (!approved) {
      rejectionReason = prompt("Reason for rejection:") || "Disapproved by manager";
    }

    try {
      await api.post(`/api/v1/attendance/corrections/${id}/review`, {
        approved,
        rejectionReason,
      });
      setFeedback(approved ? "✓ Adjustment approved & applied to record" : "Adjustment rejected");
      queryClient.invalidateQueries(["attendance-corrections"]);
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const records = correctionsData?.content || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Adjustments & Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit-protected attendance correction requests and manager authorization
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
            <span>Request Adjustment</span>
          </button>
        </div>
      </div>

      {/* Tabs / Status Filter */}
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
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Original Punches</th>
                <th className="py-3 px-4">Requested Times</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading corrections...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No {status.toLowerCase()} adjustments found</p>
                  </td>
                </tr>
              ) : (
                records.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{c.employeeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.employeeCode}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(c.attendanceDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      <div>In: {c.originalCheckIn ? formatTime(c.originalCheckIn) : "None"}</div>
                      <div>Out: {c.originalCheckOut ? formatTime(c.originalCheckOut) : "None"}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      <div>In: {c.requestedCheckIn ? formatTime(c.requestedCheckIn) : "None"}</div>
                      <div>Out: {c.requestedCheckOut ? formatTime(c.requestedCheckOut) : "None"}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300 truncate" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : c.status === "REJECTED"
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => reviewCorrection(c.id, true)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve adjustment"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => reviewCorrection(c.id, false)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Reject adjustment"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.approverName || "Reviewed"}
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

      {/* Modal: Request Adjustment */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Attendance Correction</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate({
                  employeeId: Number(formData.employeeId),
                  attendanceDate: formData.attendanceDate,
                  requestedCheckIn: formData.requestedCheckIn ? new Date(`${formData.attendanceDate}T${formData.requestedCheckIn}:00Z`).toISOString() : null,
                  requestedCheckOut: formData.requestedCheckOut ? new Date(`${formData.attendanceDate}T${formData.requestedCheckOut}:00Z`).toISOString() : null,
                  reason: formData.reason,
                });
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3.5 text-xs">
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.attendanceDate}
                    onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Requested Check-In Time</label>
                    <input
                      type="time"
                      value={formData.requestedCheckIn}
                      onChange={(e) => setFormData({ ...formData, requestedCheckIn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Requested Check-Out Time</label>
                    <input
                      type="time"
                      value={formData.requestedCheckOut}
                      onChange={(e) => setFormData({ ...formData, requestedCheckOut: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Justification Reason *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Explain why the terminal punch was missed (e.g. Off-site client assignment, terminal hardware power cut)..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
                  disabled={submitMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Adjustment"}
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

