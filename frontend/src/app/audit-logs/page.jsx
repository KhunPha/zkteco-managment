"use client";

import { useQuery } from "@tanstack/react-query";
import { History, RefreshCw, ShieldAlert, Terminal } from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await api.get("/api/v1/audit-logs");
      return res.data?.data;
    },
  });

  const logs = auditData?.content || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of all administrative actions, hardware commands, and profile adjustments
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <History size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No audit records logged yet</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {formatTime(log.createdAt)} ({formatDate(log.createdAt)})
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {log.username || "System Worker"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {log.entityType} {log.entityId ? `#${log.entityId}` : ""}
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-500 text-[11px]" title={log.newValues || log.oldValues}>
                      {log.newValues || log.oldValues || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

