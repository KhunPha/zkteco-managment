"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Clock,
  Download,
  RotateCcw,
  Users,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { formatTime } from "@/lib/utils";

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    model: "ZKTeco K40",
    ipAddress: "192.168.1.201",
    port: 4370,
    commKey: "0",
    integrationType: "ADMS_PUSH",
    location: "Main Gate Lobby",
  });

  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ["devices", search],
    queryFn: async () => {
      const res = await api.get(`/api/v1/devices?search=${encodeURIComponent(search)}`);
      return res.data?.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/devices", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["devices"]);
      setShowModal(false);
      setFormData({
        name: "",
        serialNumber: "",
        model: "ZKTeco K40",
        ipAddress: "192.168.1.201",
        port: 4370,
        commKey: "0",
        integrationType: "ADMS_PUSH",
        location: "",
      });
      setActionFeedback({
        text: "Terminal registered successfully",
        type: "success",
      });
      setTimeout(() => setActionFeedback(null), 5000);
    },
    onError: (err) => {
      setActionFeedback({
        text: `Registration failed: ${err.response?.data?.message || err.message}`,
        type: "error",
      });
      setTimeout(() => setActionFeedback(null), 5000);
    },
  });

  const triggerOp = async (deviceId, opName, url) => {
    setActionFeedback({ text: `Sending ${opName}...`, type: "loading" });
    try {
      const res = await api.post(url);
      const isSuccess = res.data?.data !== false;
      setActionFeedback({
        text: `${isSuccess ? "✓" : "⚠"} ${opName}: ${res.data?.message || "Completed"}`,
        type: isSuccess ? "success" : "warning",
      });
      queryClient.invalidateQueries(["devices"]);
      queryClient.invalidateQueries(["device-users"]);
    } catch (err) {
      setActionFeedback({
        text: `✗ ${opName} failed: ${err.response?.data?.message || err.message}`,
        type: "error",
      });
    }
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const syncAllTerminals = async () => {
    if (!confirm("Synchronize all active employees and biometric mappings across all registered terminals?")) return;
    setActionFeedback({ text: "Broadcasting synchronization to all terminals...", type: "loading" });
    try {
      const res = await api.post("/api/v1/devices/sync-all-users");
      setActionFeedback({
        text: `✓ Multi-Terminal Sync: ${res.data?.message || "Sync complete"}`,
        type: "success",
      });
      queryClient.invalidateQueries(["devices"]);
      queryClient.invalidateQueries(["device-users"]);
    } catch (err) {
      setActionFeedback({
        text: `✗ Multi-Terminal Sync failed: ${err.response?.data?.message || err.message}`,
        type: "error",
      });
    }
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const deleteDevice = async (id) => {
    if (!confirm("Are you sure you want to remove this device registration?")) return;
    try {
      await api.delete(`/api/v1/devices/${id}`);
      queryClient.invalidateQueries(["devices"]);
      setActionFeedback({ text: "Device removed", type: "success" });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Biometric Terminals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered ZKTeco terminals communicating via standalone TCP/IP socket (4370) or ADMS HTTP Push
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {actionFeedback && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : actionFeedback.type === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  : actionFeedback.type === "loading"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 animate-pulse"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
              }`}
            >
              {actionFeedback.type === "success" && <CheckCircle2 size={13} />}
              {actionFeedback.type === "warning" && <AlertTriangle size={13} />}
              <span>{actionFeedback.text}</span>
            </span>
          )}

          <button
            onClick={syncAllTerminals}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
            title="Broadcast all user mappings across every active biometric terminal"
          >
            <ArrowRightLeft size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Sync All Terminals</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            <span>Register Terminal</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SN, IP, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Terminals Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Terminal Device</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Network / Protocol</th>
                <th className="py-3 px-4">Connection Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Terminal Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading devices...</td>
                </tr>
              ) : devicesData?.content?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Cpu size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No biometric terminals found</p>
                    <p className="text-[11px]">Click "Register Terminal" above to add your first ZKTeco device.</p>
                  </td>
                </tr>
              ) : (
                devicesData?.content?.map((device) => {
                  const isOnline = device.connectionStatus === "ONLINE";
                  return (
                    <tr key={device.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isOnline ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            <Cpu size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{device.name}</span>
                            <span className="text-[11px] text-slate-400">{device.model || "ZKTeco Terminal"} • {device.location || "Main Campus"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {device.serialNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-700 dark:text-slate-300 block">
                            {device.ipAddress ? `${device.ipAddress}:${device.port}` : "Push Server (ADMS)"}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                            {device.integrationType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isOnline
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{device.connectionStatus}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {device.lastCommunication ? formatTime(device.lastCommunication) : "Never"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test Ping */}
                          <button
                            onClick={() => triggerOp(device.id, "Test Ping", `/api/v1/devices/${device.id}/test-connection`)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Test Connection (Ping Terminal)"
                          >
                            <Wifi size={15} />
                          </button>

                          {/* Sync Users to this Terminal */}
                          <button
                            onClick={() => triggerOp(device.id, "Sync Users to Terminal", `/api/v1/devices/${device.id}/sync-users-to-device`)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Sync All Users to this Terminal"
                          >
                            <Users size={15} />
                          </button>

                          {/* Sync Time */}
                          <button
                            onClick={() => triggerOp(device.id, "Sync Time", `/api/v1/devices/${device.id}/sync-time`)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Synchronize Device Clock"
                          >
                            <Clock size={15} />
                          </button>

                          {/* Download Logs */}
                          <button
                            onClick={() => triggerOp(device.id, "Download Logs", `/api/v1/devices/${device.id}/pull-logs`)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Download Attendance Logs"
                          >
                            <Download size={15} />
                          </button>

                          {/* Reboot Terminal */}
                          <button
                            onClick={() => triggerOp(device.id, "Reboot", `/api/v1/devices/${device.id}/restart`)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Restart Terminal Remotely"
                          >
                            <RotateCcw size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteDevice(device.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Terminal Registration"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Register Terminal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Biometric Terminal</h3>
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Terminal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lobby Terminal Gate 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Serial Number (SN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZK987654321"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Device Model</label>
                  <input
                    type="text"
                    placeholder="e.g. SenseFace 4a / uFace800"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Protocol / Mode *</label>
                  <select
                    value={formData.integrationType}
                    onChange={(e) => setFormData({ ...formData, integrationType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="ADMS_PUSH">ADMS HTTP Push (Cloud / Central Server)</option>
                    <option value="TCP_PULL">TCP/IP Standalone Socket (Port 4370)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Physical Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Campus Gate"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">IP Address (Optional for Push)</label>
                  <input
                    type="text"
                    placeholder="192.168.1.201"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  {createMutation.isPending ? "Registering..." : "Save Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
