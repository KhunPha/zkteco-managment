"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  Clock,
  Download,
  RotateCcw,
  Users,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Sliders,
  Volume2,
  Lock,
  Unlock,
  Power,
  Activity,
  HardDrive,
  Info,
  ShieldCheck,
  VolumeX,
  Fingerprint,
  Radio,
  KeyRound,
  ShieldAlert,
  Check,
  Globe,
  Save,
  DoorOpen,
  DoorClosed,
  Network,
  Wrench,
  Coffee,
  Bell,
  ArrowRight,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { formatTime } from "@/lib/utils";
import Portal from "@/components/common/Portal";

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Selected device for full hardware control modal
  const [controlDevice, setControlDevice] = useState(null);
  const [controlActionLoading, setControlActionLoading] = useState(false);
  const [controlMessage, setControlMessage] = useState(null);
  const [controlTab, setControlTab] = useState("telemetry");
  const [menuParams, setMenuParams] = useState(null);
  const [isParamsLoading, setIsParamsLoading] = useState(false);
  const [isSavingParams, setIsSavingParams] = useState(false);
  const [doorUnlockDuration, setDoorUnlockDuration] = useState(5);
  const [commForm, setCommForm] = useState({
    IPAddress: "",
    NetMask: "",
    GATEIPAddress: "",
  });
  const [paramForm, setParamForm] = useState({
    MThreshold: "35",
    VThreshold: "15",
    Door1Delay: "5",
    Door1SensorType: "1",
    Language: "83",
  });

  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    model: "IN01-A/ID",
    ipAddress: "192.168.1.201",
    port: 4370,
    commKey: "0",
    integrationType: "TCP_PULL",
    location: "Main Gate Lobby",
  });

  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ["devices", search],
    queryFn: async () => {
      const res = await api.get(`/api/v1/devices?search=${encodeURIComponent(search)}`);
      return res.data?.data;
    },
  });

  // Query live status when control modal is open
  const {
    data: liveStatus,
    isLoading: isLiveStatusLoading,
    refetch: refetchLiveStatus,
  } = useQuery({
    queryKey: ["device-live-status", controlDevice?.id],
    queryFn: async () => {
      if (!controlDevice?.id) return null;
      const res = await api.get(`/api/v1/devices/${controlDevice.id}/live-status`);
      return res.data?.data;
    },
    enabled: !!controlDevice?.id,
    refetchInterval: controlDevice ? 8000 : false,
  });

  // Query shifts to display 2-shift work & break schedules
  const { data: systemShifts = [] } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shifts");
      return res.data?.data || [];
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
        model: "IN01-A/ID",
        ipAddress: "192.168.1.201",
        port: 4370,
        commKey: "0",
        integrationType: "TCP_PULL",
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

  const triggerOp = async (deviceId, opName, url, body = null) => {
    setActionFeedback({ text: `Dispatching ${opName}...`, type: "loading" });
    try {
      const res = body ? await api.post(url, body) : await api.post(url);
      const isSuccess = res.data?.data?.success !== false && res.data?.data !== false;
      const message = res.data?.data?.message || res.data?.message || "Operation completed successfully";
      
      setActionFeedback({
        text: `${isSuccess ? "✓" : "⚠"} ${opName}: ${message}`,
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

  const fetchMenuParams = async (deviceId) => {
    if (!deviceId) return;
    setIsParamsLoading(true);
    try {
      const res = await api.get(`/api/v1/devices/${deviceId}/menu-parameters`);
      const params = res.data?.data?.parameters;
      if (params) {
        setMenuParams(params);
        setCommForm({
          IPAddress: params.IPAddress || "",
          NetMask: params.NetMask || "255.255.255.0",
          GATEIPAddress: params.GATEIPAddress || "0.0.0.0",
        });
        setParamForm({
          MThreshold: params.MThreshold || "35",
          VThreshold: params.VThreshold || "15",
          Door1Delay: params.Door1Delay || "5",
          Door1SensorType: params.Door1SensorType || "1",
          Language: params.Language || "83",
        });
      }
    } catch (err) {
      console.error("Failed to fetch menu parameters:", err);
    } finally {
      setIsParamsLoading(false);
    }
  };

  const openControlModal = (device) => {
    setControlDevice(device);
    setControlMessage(null);
    setControlTab("telemetry");
    fetchMenuParams(device.id);
  };

  const saveMenuParams = async (patch) => {
    if (!controlDevice) return;
    setIsSavingParams(true);
    setControlMessage(null);
    try {
      const res = await api.post(`/api/v1/devices/${controlDevice.id}/menu-parameters`, patch);
      const data = res.data?.data;
      if (data?.success) {
        setControlMessage({
          type: "success",
          text: data.message || "Parameters committed to physical terminal memory successfully!",
        });
        setMenuParams((prev) => ({ ...prev, ...patch }));
        queryClient.invalidateQueries(["devices"]);
      } else {
        setControlMessage({
          type: "error",
          text: data?.error || "Failed to commit parameters to terminal",
        });
      }
    } catch (err) {
      setControlMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setIsSavingParams(false);
      setTimeout(() => setControlMessage(null), 8000);
    }
  };

  const handleRemoteControl = async (action, voiceIndex = 0) => {
    if (!controlDevice) return;
    if (action === "RESTART" && !confirm(`Are you sure you want to REBOOT terminal "${controlDevice.name}"?`)) return;
    if (action === "POWER_OFF" && !confirm(`Are you sure you want to POWER OFF terminal "${controlDevice.name}"? It will need to be manually powered on.`)) return;
    if (action === "CLEAR_LOGS" && !confirm(`WARNING: Clear all stored attendance punch records on terminal "${controlDevice.name}"? Make sure all logs have been downloaded first!`)) return;
    if (action === "CLEAR_ADMIN" && !confirm(`RESCUE PHYSICAL MENU: Remove administrator lockout on terminal "${controlDevice.name}"? This allows immediate keypad access to the device settings menu using M/OK.`)) return;
    if (action === "UNLOCK_DOOR" && !confirm(`Trigger door relay on "${controlDevice.name}" for ${voiceIndex} second(s)?`)) return;

    setControlActionLoading(true);
    setControlMessage(null);

    try {
      const res = await api.post(`/api/v1/devices/${controlDevice.id}/control`, {
        action,
        voiceIndex,
      });
      const data = res.data?.data;
      setControlMessage({
        type: data?.success ? "success" : "error",
        text: data?.message || "Action executed",
      });
      refetchLiveStatus();
      queryClient.invalidateQueries(["devices"]);
    } catch (err) {
      setControlMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setControlActionLoading(false);
      setTimeout(() => setControlMessage(null), 7000);
    }
  };

  const syncAllClocks = async () => {
    setActionFeedback({ text: "Synchronizing hardware clocks across all terminals...", type: "loading" });
    try {
      const res = await api.post("/api/v1/devices/sync-all-time");
      const list = res.data?.data || [];
      const successfulCount = list.filter((r) => r.success).length;
      setActionFeedback({
        text: `✓ Clock Sync: Synchronized ${successfulCount}/${list.length} terminals to computer time`,
        type: "success",
      });
      queryClient.invalidateQueries(["devices"]);
    } catch (err) {
      setActionFeedback({
        text: `✗ Clock Sync failed: ${err.response?.data?.message || err.message}`,
        type: "error",
      });
    }
    setTimeout(() => setActionFeedback(null), 7000);
  };

  const syncAllTerminals = async () => {
    if (!confirm("Synchronize all active employees, students, and card mappings across all registered terminals?")) return;
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Biometric Terminals & Machine Control</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full remote hardware management for ZKTeco IN01-A terminals: Clock Synchronization, Diagnostics, Reboot, Audio Test & User Sync.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {actionFeedback && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs animate-fade-in ${
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

          {/* Sync All Clocks Button */}
          <button
            onClick={syncAllClocks}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all border border-amber-200 dark:border-amber-800 shadow-2xs hover-lift active:scale-95"
            title="Synchronize hardware clocks across all terminals with computer local time in 1-click"
          >
            <Clock size={15} className="text-amber-600 dark:text-amber-400" />
            <span>Sync Time All Terminals</span>
          </button>

          {/* Sync All Personnel Button */}
          <button
            onClick={syncAllTerminals}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-2xs hover-lift active:scale-95"
            title="Broadcast all user mappings across every active biometric terminal"
          >
            <ArrowRightLeft size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Sync All Personnel</span>
          </button>

          {/* Register Terminal Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover-lift active:scale-95 transition-all"
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
                <th className="py-3 px-4 text-right">Machine Operations</th>
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
                          <div className={`p-2.5 rounded-xl ${isOnline ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            <Cpu size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{device.name}</span>
                            <span className="text-[11px] text-slate-400">{device.model || "IN01-A/ID"} • {device.location || "Main Campus"}</span>
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
                          {/* Full Control Center Button */}
                          <button
                            onClick={() => openControlModal(device)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/60 hover:from-indigo-100 hover:to-indigo-200/80 dark:from-indigo-950/70 dark:to-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs hover-lift active:scale-95"
                            title="Open Virtual Terminal Menu & Hardware Telemetry"
                          >
                            <Sliders size={14} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Machine Menu</span>
                          </button>

                          {/* Quick Sync Time */}
                          <button
                            onClick={() => triggerOp(device.id, "Sync Time", `/api/v1/devices/${device.id}/sync-time`)}
                            className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:scale-110 active:scale-95 transition-all"
                            title="Sync Hardware Clock to Computer Time"
                          >
                            <Clock size={15} />
                          </button>

                          {/* Quick Speaker Voice Test */}
                          <button
                            onClick={() => triggerOp(device.id, "Speaker Test", `/api/v1/devices/${device.id}/control`, { action: "TEST_VOICE", voiceIndex: 0 })}
                            className="p-1.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:scale-110 active:scale-95 transition-all"
                            title="Play Voice Prompt ('Thank You!') on Device Speaker"
                          >
                            <Volume2 size={15} />
                          </button>

                          {/* Test Ping */}
                          <button
                            onClick={() => triggerOp(device.id, "Test Ping", `/api/v1/devices/${device.id}/test-connection`)}
                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all"
                            title="Test Connection (Ping Terminal)"
                          >
                            <Wifi size={15} />
                          </button>

                          {/* Sync Users to this Terminal */}
                          <button
                            onClick={() => triggerOp(device.id, "Sync Users to Terminal", `/api/v1/devices/${device.id}/sync-users-to-device`)}
                            className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:scale-110 active:scale-95 transition-all"
                            title="Sync All Users to this Terminal"
                          >
                            <Users size={15} />
                          </button>

                          {/* Download Logs */}
                          <button
                            onClick={() => triggerOp(device.id, "Download Logs", `/api/v1/devices/${device.id}/pull-logs`)}
                            className="p-1.5 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:scale-110 active:scale-95 transition-all"
                            title="Download Attendance Logs"
                          >
                            <Download size={15} />
                          </button>

                          {/* Reboot Terminal */}
                          <button
                            onClick={() => triggerOp(device.id, "Reboot", `/api/v1/devices/${device.id}/restart`)}
                            className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:scale-110 active:scale-95 transition-all"
                            title="Restart Terminal Remotely"
                          >
                            <RotateCcw size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteDevice(device.id)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:scale-110 active:scale-95 transition-all"
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

      {/* Terminal Control Center & Virtual Machine Menu Modal */}
      {controlDevice && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="min-h-full flex items-center justify-center p-2 sm:p-4">
              <div className="w-full max-w-4xl my-auto h-[88vh] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sliders size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      ZKTeco IN01-A Virtual Machine Menu
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Remote Console
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {controlDevice.name} • {controlDevice.ipAddress}:{controlDevice.port} (SN: {controlDevice.serialNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setControlDevice(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Menu Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-x-auto shrink-0 scrollbar-none">
              {[
                { id: "telemetry", label: "Status & Diagnostics", icon: Activity },
                { id: "shifts", label: "2-Shift & Break Time", icon: Coffee },
                { id: "comm", label: "Comm. (Network)", icon: Network },
                { id: "sound", label: "Sound & Voice", icon: Volume2 },
                { id: "biometrics", label: "Att. & Biometrics", icon: Fingerprint },
                { id: "access", label: "Access & Relay", icon: DoorOpen },
                { id: "rescue", label: "Data Mgt. & Rescue", icon: ShieldAlert },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = controlTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setControlTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Feedback inside Modal */}
            {controlMessage && (
              <div className="px-6 pt-3 shrink-0">
                <div
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    controlMessage.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {controlMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{controlMessage.text}</span>
                </div>
              </div>
            )}

            {/* Scrollable Tab Content with min-h-0 to ensure flawless scrolling */}
            <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
              {/* TAB 1: STATUS & DIAGNOSTICS */}
              {controlTab === "telemetry" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={14} className="text-indigo-600 dark:text-indigo-400" />
                        Live Hardware Diagnostics
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Real-time parameters, memory allocation, and drift status from physical terminal
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        refetchLiveStatus();
                        fetchMenuParams(controlDevice.id);
                      }}
                      disabled={isLiveStatusLoading || isParamsLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <RefreshCw size={13} className={isLiveStatusLoading || isParamsLoading ? "animate-spin" : ""} />
                      <span>Refresh Telemetry</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Clock & Drift */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Clock size={14} className="text-amber-500" />
                          Hardware Clock
                        </span>
                        {liveStatus?.driftSeconds !== null && liveStatus?.driftSeconds !== undefined && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              Math.abs(liveStatus.driftSeconds) < 2
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {Math.abs(liveStatus.driftSeconds) < 2
                              ? `In Sync (${Math.abs(liveStatus.driftSeconds)}s)`
                              : `Drift: ${liveStatus.driftSeconds > 0 ? "+" : ""}${liveStatus.driftSeconds}s`}
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {liveStatus?.machineTime || "Querying..."}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Computer: {liveStatus?.computerTime ? liveStatus.computerTime.split(".")[0] : "--"}
                      </div>
                    </div>

                    {/* Firmware & Hardware Platform */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-indigo-500" />
                        Firmware & Platform
                      </span>
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate" title={menuParams?.["~DeviceName"] || liveStatus?.firmwareVersion}>
                        {menuParams?.["~DeviceName"] ? `${menuParams["~DeviceName"]} (Ver 6.60)` : (liveStatus?.firmwareVersion || "IN01-A/ID")}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        Platform: {menuParams?.["~Platform"] || liveStatus?.platform || "ZMM200_TFT"}
                      </div>
                    </div>

                    {/* Stored Users & Punches */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <HardDrive size={14} className="text-sky-500" />
                        EEPROM Memory Storage
                      </span>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {(menuParams?.live_users_count ?? liveStatus?.usersCount)?.toLocaleString() ?? "--"} Users Mapped
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(menuParams?.live_att_count ?? liveStatus?.attendanceCount)?.toLocaleString() ?? "--"} Punches in Log Buffer
                      </div>
                    </div>
                  </div>

                  {/* Quick Diagnostics Action Bar */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                      Quick Action Triggers
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("SYNC_TIME")}
                        className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 text-left transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                          <Clock size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-amber-950 dark:text-amber-200 block">
                            Sync Clock with Computer
                          </span>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                            Align terminal clock with server time (UTC+7)
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("TEST_VOICE", 0)}
                        className="p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/80 dark:hover:bg-sky-900/40 text-left transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs shrink-0">
                          <Volume2 size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-sky-950 dark:text-sky-200 block">
                            Test Speaker Voice Prompt
                          </span>
                          <span className="text-[11px] text-sky-700/80 dark:text-sky-400/80">
                            Plays "Thank You!" audio prompt on physical device speaker
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: 2-SHIFT WORK & SCHEDULED BREAK TIME */}
              {controlTab === "shifts" && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Coffee size={15} className="text-amber-500" />
                        2-Shift System & Scheduled Break Configuration
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        Shift 1 + Break + Shift 2
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Understand how 2-Shift working days (Morning Shift 1 + Lunch Break + Afternoon Shift 2) operate on ZKTeco terminals and how hours are calculated without penalty.
                    </p>
                  </div>

                  {/* Visual 2-Shift Progression Diagram */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={15} className="text-indigo-600 dark:text-indigo-400" />
                        Daily 2-Shift Flow (Standard 8.0 Net Work Hours)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                        ✓ Break Time Excluded from Late Calculation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Step 1: Shift 1 (Morning) */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 relative overflow-hidden shadow-2xs hover-lift">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Shift 1 • Morning
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-mono">
                            F1 / F2
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          07:30 / 08:00 → 11:30 / 12:00
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Staff & teachers check in for the morning block. Standard target: <strong>4.0 Hours</strong>.
                        </p>
                        <div className="pt-1 text-[10px] font-semibold text-slate-400">
                          Punch: <strong className="text-slate-700 dark:text-slate-200">Check-In</strong> (Morning arrival)
                        </div>
                      </div>

                      {/* Step 2: Scheduled Break / Lunch */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 relative overflow-hidden shadow-2xs hover-lift">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                            <Coffee size={12} />
                            Scheduled Break (Lunch)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono">
                            Break Window
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200 font-mono">
                          11:30 / 12:00 → 13:00 / 13:30
                        </div>
                        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                          1.0 – 1.5h Rest & Lunch. <strong>Auto-excluded</strong> from work time. Staff leaving for lunch are never penalized!
                        </p>
                        <div className="pt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Punches: <strong className="text-emerald-900 dark:text-emerald-100">Break-Out → Break-In</strong>
                        </div>
                      </div>

                      {/* Step 3: Shift 2 (Afternoon) */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 relative overflow-hidden shadow-2xs hover-lift">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full pointer-events-none" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            Shift 2 • Afternoon
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-mono">
                            F3 / F4
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          13:00 / 13:30 → 16:30 / 17:30
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Staff return from lunch and complete the day. Standard target: <strong>4.0 Hours</strong>.
                        </p>
                        <div className="pt-1 text-[10px] font-semibold text-slate-400">
                          Punch: <strong className="text-slate-700 dark:text-slate-200">Check-Out</strong> (Evening leave)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ZKTeco Physical Keypad Function Key Shortcut Reference */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Radio size={14} className="text-indigo-600 dark:text-indigo-400" />
                        ZKTeco IN01-A Physical Terminal Keypad State Keys (F1 – F4)
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Physical Keypad Shortcuts</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 inline-block">
                          [F1 Key]
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1">
                          Check-In
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Start of Shift 1 (Morning Arrival)
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-block">
                          [F2 Key]
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1">
                          Break-Out
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          End of Shift 1 (Leave for Lunch)
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-block">
                          [F3 Key]
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1">
                          Break-In
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Start of Shift 2 (Return from Lunch)
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 inline-block">
                          [F4 Key]
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1">
                          Check-Out
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          End of Shift 2 (Evening Dismissal)
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
                      <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Smart Auto-Pairing Active:</strong> Even if personnel forget to press F1–F4 on the keypad and just tap their card or fingerprint, the attendance processing engine automatically pairs their first morning scan as <strong>Shift 1</strong>, midday scans as <strong>Break Window</strong>, and evening scans as <strong>Shift 2</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Live Shifts with Break Schedules */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarRange size={14} className="text-indigo-600 dark:text-indigo-400" />
                        Active 2-Shift Work Schedules in System
                      </span>
                      <a
                        href="/shifts"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Manage All Shifts</span>
                        <ArrowRight size={13} />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {systemShifts.filter((s) => s.breakStart && s.breakEnd).map((shift) => (
                        <div
                          key={shift.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 hover-lift"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {shift.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {shift.code}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between font-mono">
                              <span className="text-slate-500">Shift 1 (Morning):</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {shift.startTime} → {shift.breakStart}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-emerald-600 dark:text-emerald-400">
                              <span>Lunch Break:</span>
                              <span className="font-bold">
                                {shift.breakStart} → {shift.breakEnd}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span className="text-slate-500">Shift 2 (Afternoon):</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {shift.breakEnd} → {shift.endTime}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-slate-500">Target Net Work:</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {shift.workHours}h (Break Excluded)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMM. (NETWORK MENU) */}
              {controlTab === "comm" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Network size={14} className="text-indigo-600 dark:text-indigo-400" />
                      Physical Comm. Menu (Ethernet Parameters)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Directly configure IN01-A on-board network interface parameters stored in device EEPROM.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Info size={14} className="shrink-0" />
                      Hardware Notice
                    </p>
                    <p className="text-[11px] text-indigo-700/90 dark:text-indigo-400/90 leading-relaxed">
                      Writing network parameters modifies the terminal's physical IP table. If you alter the IP Address, remember to update the terminal registration IP so the server daemon can reconnect.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Terminal IP Address (IPAddress)
                      </label>
                      <input
                        type="text"
                        value={commForm.IPAddress}
                        onChange={(e) => setCommForm({ ...commForm, IPAddress: e.target.value })}
                        placeholder="192.168.1.201"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">Current on device: {menuParams?.IPAddress || "--"}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subnet Mask (NetMask)
                      </label>
                      <input
                        type="text"
                        value={commForm.NetMask}
                        onChange={(e) => setCommForm({ ...commForm, NetMask: e.target.value })}
                        placeholder="255.255.255.0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">Current on device: {menuParams?.NetMask || "--"}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Default Gateway (GATEIPAddress)
                      </label>
                      <input
                        type="text"
                        value={commForm.GATEIPAddress}
                        onChange={(e) => setCommForm({ ...commForm, GATEIPAddress: e.target.value })}
                        placeholder="0.0.0.0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">Current on device: {menuParams?.GATEIPAddress || "--"}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ZK Protocol Port
                      </label>
                      <input
                        type="text"
                        disabled
                        value="4370"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-mono cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400">Default ZKTeco TCP/UDP socket listener</span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingParams}
                      onClick={() => saveMenuParams(commForm)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <Save size={15} />
                      <span>{isSavingParams ? "Saving to Terminal..." : "Commit Network Parameters"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SOUND & VOICE */}
              {controlTab === "sound" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      Physical Personalize Menu (Voice & Keypad Sounds)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Manage voice prompts ("Thank You", "Please Try Again") and keypad click sounds.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Voice Prompts Toggle */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          Voice Prompts (VoiceOn)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Spoken greeting upon successful/failed scans
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingParams}
                        onClick={() => saveMenuParams({ VoiceOn: menuParams?.VoiceOn === "1" ? "0" : "1" })}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                          menuParams?.VoiceOn === "1"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {menuParams?.VoiceOn === "1" ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        <span>{menuParams?.VoiceOn === "1" ? "Enabled" : "Muted"}</span>
                      </button>
                    </div>

                    {/* Keypad Beep Toggle */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          Keypad Beep (KeyPadBeep)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Audio click feedback on terminal key press
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingParams}
                        onClick={() => saveMenuParams({ KeyPadBeep: menuParams?.KeyPadBeep === "1" ? "0" : "1" })}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                          menuParams?.KeyPadBeep === "1"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>{menuParams?.KeyPadBeep === "1" ? "Beep ON" : "Beep OFF"}</span>
                      </button>
                    </div>

                    {/* Terminal Language Selector */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Globe size={14} className="text-sky-500" />
                          System Language (Language)
                        </label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Current code: {menuParams?.Language || "83"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={paramForm.Language}
                          onChange={(e) => {
                            setParamForm({ ...paramForm, Language: e.target.value });
                            saveMenuParams({ Language: e.target.value });
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                        >
                          <option value="83" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">83 - English / International Voice Prompts</option>
                          <option value="69" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">69 - Spanish</option>
                          <option value="86" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">86 - Simplified Chinese</option>
                          <option value="84" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">84 - Traditional Chinese</option>
                        </select>
                        <button
                          type="button"
                          disabled={controlActionLoading}
                          onClick={() => handleRemoteControl("TEST_VOICE", 0)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                        >
                          <Volume2 size={14} />
                          <span>Test Speaker</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BIOMETRICS & THRESHOLDS */}
              {controlTab === "biometrics" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Fingerprint size={14} className="text-indigo-600 dark:text-indigo-400" />
                      Physical System Menu (Attendance & Biometric Parameters)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure 1:N and 1:1 fingerprint matching thresholds for false match prevention vs quick recognition.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1:N Matching Threshold */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          1:N Match Threshold (MThreshold)
                        </span>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {paramForm.MThreshold}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="55"
                        value={paramForm.MThreshold}
                        onChange={(e) => setParamForm({ ...paramForm, MThreshold: e.target.value })}
                        className="w-full accent-indigo-600"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Threshold for 1-to-many fingerprint search across all stored templates. Standard default: <strong>35</strong>. Higher values require clearer prints; lower values match faster.
                      </p>
                    </div>

                    {/* 1:1 Verification Threshold */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          1:1 Verify Threshold (VThreshold)
                        </span>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {paramForm.VThreshold}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="40"
                        value={paramForm.VThreshold}
                        onChange={(e) => setParamForm({ ...paramForm, VThreshold: e.target.value })}
                        className="w-full accent-indigo-600"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Threshold when user first scans RFID badge or enters PIN before touching sensor. Standard default: <strong>15</strong>.
                      </p>
                    </div>

                    {/* Biometric Engine Info */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 sm:col-span-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        Biometric Engine Information
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ZKTeco Biometric Core Version: <strong className="font-mono text-slate-800 dark:text-slate-200">ZKFP v{menuParams?.["~ZKFPVersion"] || "10"}</strong> • Platform: <strong className="font-mono text-slate-800 dark:text-slate-200">{menuParams?.["~Platform"] || "ZMM200_TFT"}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingParams}
                      onClick={() => saveMenuParams({
                        MThreshold: paramForm.MThreshold,
                        VThreshold: paramForm.VThreshold,
                      })}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <Save size={15} />
                      <span>{isSavingParams ? "Saving to Terminal..." : "Commit Biometric Thresholds"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ACCESS CONTROL & RELAY */}
              {controlTab === "access" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <DoorOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                      Physical Access Control & Door Relay Menu
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Remotely release magnetic door locks and adjust relay hold times.
                    </p>
                  </div>

                  {/* Remote Door Unlock Trigger Card */}
                  <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                          <DoorOpen size={18} className="text-emerald-600 dark:text-emerald-400" />
                          Remote Door Lock Release
                        </span>
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                          Sends electrical signal to terminal physical relay to open turnstile or magnetic lock
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={doorUnlockDuration}
                          onChange={(e) => setDoorUnlockDuration(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value={1} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">1 Second Release</option>
                          <option value={3} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">3 Seconds Release</option>
                          <option value={5} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">5 Seconds Release</option>
                          <option value={10} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">10 Seconds Release</option>
                        </select>

                        <button
                          type="button"
                          disabled={controlActionLoading}
                          onClick={() => handleRemoteControl("UNLOCK_DOOR", doorUnlockDuration)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                        >
                          <Unlock size={15} />
                          <span>Unlock Door Now</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Relay Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Relay Hold Delay (Door1Delay)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="255"
                          value={paramForm.Door1Delay}
                          onChange={(e) => setParamForm({ ...paramForm, Door1Delay: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                        />
                        <span className="text-xs text-slate-400 font-semibold shrink-0">seconds</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Duration relay stays unlocked upon scan (1 - 255s)</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Door Sensor Type (Door1SensorType)
                      </label>
                      <select
                        value={paramForm.Door1SensorType}
                        onChange={(e) => setParamForm({ ...paramForm, Door1SensorType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                      >
                        <option value="0" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">0 - None (Disabled)</option>
                        <option value="1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">1 - Normal Open (NO)</option>
                        <option value="2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">2 - Normal Closed (NC)</option>
                      </select>
                      <span className="text-[10px] text-slate-400">Magnetic sensor state for door open monitoring</span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingParams}
                      onClick={() => saveMenuParams({
                        Door1Delay: paramForm.Door1Delay,
                        Door1SensorType: paramForm.Door1SensorType,
                      })}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <Save size={15} />
                      <span>{isSavingParams ? "Saving to Terminal..." : "Commit Access Control Settings"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: DATA MGT & ADMIN RESCUE */}
              {controlTab === "rescue" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
                      Physical Data Mgt. & Keypad Admin Rescue Menu
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Emergency recovery tools to unlock keypad lockout, flush log buffers, and control machine power.
                    </p>
                  </div>

                  {/* ADMIN KEYPAD RESCUE CARD */}
                  <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/80 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                        <KeyRound size={20} />
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                          Emergency Physical Keypad Rescue: Clear Admin Privilege
                        </h5>
                        <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                          If an administrator locked the physical keypad menu (or left the company without providing the PIN/fingerprint), clicking below sends <strong>CMD_CLEAR_ADMIN</strong> directly to the terminal processor. It immediately clears on-device manager permissions so anyone can press <strong>M/OK</strong> to access physical device menus.
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1">
                          ✓ Safe Operation: All enrolled employees, students, cards, and attendance punches are 100% preserved.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("CLEAR_ADMIN")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                      >
                        <Unlock size={15} />
                        <span>Clear Device Admin Lockout Now</span>
                      </button>
                    </div>
                  </div>

                  {/* DATA & MAINTENANCE GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Flush punch buffer */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Trash2 size={14} className="text-rose-500" />
                        Clear Stored Attendance Punch Buffer
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Flushes on-device attendance records from memory buffer. Ensure logs are downloaded first.
                      </p>
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("CLEAR_LOGS")}
                        className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>Flush Attendance Logs</span>
                      </button>
                    </div>

                    {/* Remote Soft Reboot */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <RotateCcw size={14} className="text-orange-500" />
                        Soft Restart Terminal (Reboot)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Reboots IN01-A Linux microkernel. The device will restart and reconnect in ~15 seconds.
                      </p>
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("RESTART")}
                        className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        <span>Reboot Machine</span>
                      </button>
                    </div>

                    {/* Lock Keypad & Sensor */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock size={14} className="text-slate-500" />
                        Freeze Terminal Keypad & Sensor
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Temporarily locks down the physical keyboard and biometric sensor (for exams or off-hours).
                      </p>
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("DISABLE")}
                        className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        <Lock size={13} />
                        <span>Lock Keypad</span>
                      </button>
                    </div>

                    {/* Unlock Keypad */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Unlock size={14} className="text-emerald-500" />
                        Unfreeze Keypad & Sensor
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Restores terminal keypad and sensor for normal check-in attendance operations.
                      </p>
                      <button
                        type="button"
                        disabled={controlActionLoading}
                        onClick={() => handleRemoteControl("ENABLE")}
                        className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        <Unlock size={13} />
                        <span>Unlock Keypad</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/40 dark:bg-slate-900/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                pyzk protocol connected: {controlDevice.ipAddress}:4370
              </span>
              <button
                type="button"
                onClick={() => setControlDevice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Close Machine Console
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )}

      {/* Modal Dialog: Register Terminal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="min-h-full flex items-center justify-center p-2 sm:p-4">
              <div className="w-full max-w-lg my-auto max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Biometric Terminal</h3>
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
                      placeholder="e.g. BYRQ222260008"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Device Model</label>
                    <input
                      type="text"
                      placeholder="e.g. IN01-A/ID"
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
                      <option value="TCP_PULL">TCP/IP Standalone Socket (Port 4370)</option>
                      <option value="ADMS_PUSH">ADMS HTTP Push (Cloud / Central Server)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Physical Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Gate Lobby"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">IP Address</label>
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
              </div>

              {/* Pinned Sticky Footer - Never Cut Off */}
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
                  {createMutation.isPending ? "Registering..." : "Save Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  )}
    </div>
  );
}
