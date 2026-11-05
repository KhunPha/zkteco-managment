"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Fingerprint,
  Plus,
  RefreshCw,
  Search,
  Users,
  Shield,
  Trash2,
  ScanFace,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Edit,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Radio,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import api from "@/lib/api";

// Smart RFID Card number parser: supports decimal, Wiegand (e.g. 197, 27883), and Hex
function parseRfidCardInput(raw) {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  // Wiegand format: "197,27883" or "197 27883" or "197/27883"
  const wiegandMatch = trimmed.match(/^(\d{1,5})[,\s/]+(\d{1,5})$/);
  if (wiegandMatch) {
    const fac = parseInt(wiegandMatch[1], 10);
    const card = parseInt(wiegandMatch[2], 10);
    const combined = (fac * 65536) + card;
    return String(combined).padStart(10, "0");
  }
  // Hex format: "0xC56CEB" or "C56CEB"
  if (/^(0x)?[0-9a-fA-F]{6,8}$/.test(trimmed) && !/^\d+$/.test(trimmed)) {
    const hex = trimmed.replace(/^0x/i, "");
    const dec = parseInt(hex, 16);
    if (!isNaN(dec)) return String(dec).padStart(10, "0");
  }
  // Standard decimal digits (strip any non-numeric noise)
  const digits = trimmed.replace(/\D/g, "");
  return digits ? digits.padStart(10, "0") : "";
}

// POS confirmation beep via Web Audio API
function playScannerBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    if (success) {
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio context may be restricted before interaction, safe to ignore
  }
}

export default function DeviceUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Fast single-user card scan state
  const [quickScanUser, setQuickScanUser] = useState(null);
  const [quickCardInput, setQuickCardInput] = useState("");
  const [quickScanStatus, setQuickScanStatus] = useState("idle"); // idle, saving, success, error
  const [quickScanMsg, setQuickScanMsg] = useState("");
  const quickInputRef = useRef(null);

  // Rapid Batch Card Scanner state
  const [showBatchScan, setShowBatchScan] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchFilterMissingOnly, setBatchFilterMissingOnly] = useState(true);
  const [batchCardInput, setBatchCardInput] = useState("");
  const [batchStatus, setBatchStatus] = useState("idle");
  const [batchMsg, setBatchMsg] = useState("");
  const [batchSoundEnabled, setBatchSoundEnabled] = useState(true);
  const batchInputRef = useRef(null);

  // Create mapping state
  const [createForm, setCreateForm] = useState({
    deviceId: "",
    devicePin: "",
    nameOnDevice: "",
    privilege: "NORMAL_USER",
    employeeId: "",
    faceEnrolled: false,
    fingerprintCount: 0,
    cardNumber: "",
    password: "",
  });

  // Edit Biometrics state
  const [biometricsForm, setBiometricsForm] = useState({
    id: null,
    deviceId: "",
    devicePin: "",
    nameOnDevice: "",
    privilege: "NORMAL_USER",
    employeeId: "",
    faceEnrolled: false,
    fingerprintCount: 0,
    cardNumber: "",
    password: "",
  });

  // Multi-terminal sync state
  const [syncForm, setSyncForm] = useState({
    targetDeviceId: "",
    sourceDeviceId: "",
  });

  const { data: devices } = useQuery({
    queryKey: ["all-devices"],
    queryFn: async () => {
      const res = await api.get("/api/v1/devices?size=100");
      return res.data?.data?.content || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=100");
      return res.data?.data?.content || [];
    },
  });

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ["device-users", search, selectedDeviceId],
    queryFn: async () => {
      let url = `/api/v1/device-users?search=${encodeURIComponent(search)}`;
      if (selectedDeviceId) url += `&deviceId=${selectedDeviceId}`;
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/device-users", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["device-users"]);
      setShowCreateModal(false);
      setCreateForm({
        deviceId: "",
        devicePin: "",
        nameOnDevice: "",
        privilege: "NORMAL_USER",
        employeeId: "",
        faceEnrolled: false,
        fingerprintCount: 0,
        cardNumber: "",
        password: "",
      });
      showFeedback("User mapped and queued to terminal successfully", "success");
    },
    onError: (err) => {
      showFeedback(`Mapping failed: ${err.response?.data?.message || err.message}`, "error");
    },
  });

  // Update Biometrics Mutation
  const updateBiometricsMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/api/v1/device-users/${id}`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["device-users"]);
      setShowBiometricsModal(false);
      showFeedback("Biometrics & credentials updated and queued to terminal", "success");
    },
    onError: (err) => {
      showFeedback(`Update failed: ${err.response?.data?.message || err.message}`, "error");
    },
  });

  // Multi-terminal Sync Mutation
  const syncToDeviceMutation = useMutation({
    mutationFn: async ({ targetDeviceId, sourceDeviceId }) => {
      let url = `/api/v1/devices/${targetDeviceId}/sync-users-to-device`;
      if (sourceDeviceId) url += `?sourceDeviceId=${sourceDeviceId}`;
      const res = await api.post(url);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["devices"]);
      setShowSyncModal(false);
      showFeedback(`✓ Multi-Machine Sync: ${data.message || "Users pushed to target machine"}`, "success");
    },
    onError: (err) => {
      showFeedback(`Sync failed: ${err.response?.data?.message || err.message}`, "error");
    },
  });

  const showFeedback = (text, type = "success") => {
    setActionFeedback({ text, type });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to remove this device PIN mapping?")) return;
    try {
      await api.delete(`/api/v1/device-users/${id}`);
      queryClient.invalidateQueries(["device-users"]);
      showFeedback("Device mapping deleted", "success");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openBiometricsModal = (u) => {
    setSelectedUser(u);
    setBiometricsForm({
      id: u.id,
      deviceId: u.deviceId,
      devicePin: u.devicePin,
      nameOnDevice: u.nameOnDevice || "",
      privilege: u.privilege || "NORMAL_USER",
      employeeId: u.employeeId || "",
      faceEnrolled: Boolean(u.faceEnrolled),
      fingerprintCount: Number(u.fingerprintCount) || 0,
      cardNumber: u.cardNumber || "",
      password: "",
    });
    setShowBiometricsModal(true);
  };

  // Open quick scan for a single user
  const openQuickScanModal = (u) => {
    setQuickScanUser(u);
    setQuickCardInput(u.cardNumber || "");
    setQuickScanStatus("idle");
    setQuickScanMsg("");
    setTimeout(() => {
      quickInputRef.current?.focus();
      quickInputRef.current?.select();
    }, 80);
  };

  const handleQuickCardSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!quickScanUser) return;
    const cleanNumber = parseRfidCardInput(quickCardInput);
    if (!cleanNumber) {
      playScannerBeep(false);
      setQuickScanStatus("error");
      setQuickScanMsg("Please scan or enter a valid RFID card number");
      return;
    }
    setQuickScanStatus("saving");
    try {
      await api.post(`/api/v1/device-users/${quickScanUser.id}/enroll-biometrics?cardNumber=${cleanNumber}`);
      playScannerBeep(true);
      setQuickScanStatus("success");
      setQuickScanMsg(`Card ${cleanNumber} assigned & pushed to terminals!`);
      queryClient.invalidateQueries(["device-users"]);
      setTimeout(() => {
        setQuickScanUser(null);
      }, 700);
    } catch (err) {
      playScannerBeep(false);
      setQuickScanStatus("error");
      setQuickScanMsg(err.response?.data?.message || err.message);
    }
  };

  const handleClearCard = async () => {
    if (!quickScanUser) return;
    setQuickScanStatus("saving");
    try {
      await api.post(`/api/v1/device-users/${quickScanUser.id}/enroll-biometrics?cardNumber=`);
      setQuickScanStatus("success");
      setQuickScanMsg("Card unlinked from user");
      queryClient.invalidateQueries(["device-users"]);
      setTimeout(() => setQuickScanUser(null), 600);
    } catch (err) {
      setQuickScanStatus("error");
      setQuickScanMsg(err.response?.data?.message || err.message);
    }
  };

  // Batch scanner queue
  const batchQueue = (usersData?.content || []).filter((u) => {
    if (batchFilterMissingOnly) return !u.cardNumber;
    return true;
  });

  const currentBatchUser = batchQueue[batchIndex] || null;

  const openBatchScanner = () => {
    setBatchIndex(0);
    setBatchCardInput("");
    setBatchStatus("idle");
    setBatchMsg("");
    setShowBatchScan(true);
    setTimeout(() => {
      batchInputRef.current?.focus();
    }, 120);
  };

  const handleBatchCardSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentBatchUser) return;
    const cleanNumber = parseRfidCardInput(batchCardInput);
    if (!cleanNumber) {
      if (batchSoundEnabled) playScannerBeep(false);
      setBatchStatus("error");
      setBatchMsg("Please scan or enter a valid RFID card number");
      return;
    }
    setBatchStatus("saving");
    try {
      await api.post(`/api/v1/device-users/${currentBatchUser.id}/enroll-biometrics?cardNumber=${cleanNumber}`);
      if (batchSoundEnabled) playScannerBeep(true);
      setBatchStatus("success");
      setBatchMsg(`✓ Card ${cleanNumber} assigned to ${currentBatchUser.nameOnDevice || currentBatchUser.devicePin}!`);
      queryClient.invalidateQueries(["device-users"]);
      setBatchCardInput("");

      setTimeout(() => {
        if (batchIndex + 1 < batchQueue.length) {
          setBatchIndex((prev) => prev + 1);
          setBatchStatus("idle");
          setBatchMsg("");
          setTimeout(() => batchInputRef.current?.focus(), 50);
        } else {
          setBatchStatus("complete");
          setBatchMsg("All personnel in queue have been assigned cards!");
        }
      }, 550);
    } catch (err) {
      if (batchSoundEnabled) playScannerBeep(false);
      setBatchStatus("error");
      setBatchMsg(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Device Users & Biometrics Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage terminal biometric PINs, Fingerprint & Face ID enrollment, RFID cards, and multi-machine sync
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {actionFeedback && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
              }`}
            >
              {actionFeedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{actionFeedback.text}</span>
            </span>
          )}

          <button
            onClick={openBatchScanner}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            title="Fast Card Reader / USB Scanner mode"
          >
            <Zap size={15} className="text-amber-300 animate-pulse" />
            <span>Fast Card Scanner</span>
          </button>

          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
            title="Push users to another terminal or machine"
          >
            <ArrowRightLeft size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Sync to Other Machine</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            <span>Map Device User</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PIN or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="">All Terminals</option>
            {devices?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.serialNumber})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
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
                <th className="py-3 px-4">Terminal PIN</th>
                <th className="py-3 px-4">Name on Device</th>
                <th className="py-3 px-4">Assigned Personnel</th>
                <th className="py-3 px-4">Terminal Device</th>
                <th className="py-3 px-4">Privilege</th>
                <th className="py-3 px-4">Biometrics & Credentials</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading mappings...</td>
                </tr>
              ) : usersData?.content?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Fingerprint size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No device user mappings found</p>
                    <p className="text-[11px]">Click "Map Device User" or "Sync to Other Machine" to register users.</p>
                  </td>
                </tr>
              ) : (
                usersData?.content?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      PIN {u.devicePin}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {u.nameOnDevice || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {u.employeeName ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{u.employeeCode}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-500 font-semibold text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">{u.deviceName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{u.deviceSerialNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.privilege === "ADMIN" || u.privilege === "SUPER_ADMIN"
                          ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        {u.privilege}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Fingerprint Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            u.fingerprintCount > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                          title={`${u.fingerprintCount} fingerprints enrolled`}
                        >
                          <Fingerprint size={13} className={u.fingerprintCount > 0 ? "text-emerald-500" : "text-slate-400"} />
                          <span>{u.fingerprintCount > 0 ? `${u.fingerprintCount} FP` : "No FP"}</span>
                        </span>

                        {/* Face ID Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            u.faceEnrolled
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                          title={u.faceEnrolled ? "Face recognition biometric enrolled" : "No face enrolled"}
                        >
                          <ScanFace size={13} className={u.faceEnrolled ? "text-indigo-500" : "text-slate-400"} />
                          <span>{u.faceEnrolled ? "Face ID" : "No Face"}</span>
                        </span>

                        {/* Card Badge or Quick Scan Button */}
                        {u.cardNumber ? (
                          <button
                            type="button"
                            onClick={() => openQuickScanModal(u)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 transition-colors shadow-xs cursor-pointer"
                            title={`RFID Card: ${u.cardNumber} • Click to change or re-scan`}
                          >
                            <CreditCard size={12} className="text-cyan-600 dark:text-cyan-400" />
                            <span>{u.cardNumber}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openQuickScanModal(u)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50/60 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-dashed border-cyan-300 dark:border-cyan-800 transition-all hover:scale-105 cursor-pointer"
                            title="Scan RFID card with USB reader or type code"
                          >
                            <CreditCard size={11} className="text-cyan-500 animate-pulse" />
                            <span>+ Scan Card</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openQuickScanModal(u)}
                          className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                          title="Fast Card Scanner (USB/Keypad)"
                        >
                          <Zap size={15} />
                        </button>
                        <button
                          onClick={() => openBiometricsModal(u)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                          title="Manage Biometrics & Credentials (FP, Face ID, Card)"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Mapping"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Manage Biometrics & Enrollment */}
      {showBiometricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Enroll Biometrics & Credentials
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Terminal User ID (Keypad ID): <span className="font-mono font-bold text-indigo-600">{biometricsForm.devicePin}</span> • {biometricsForm.nameOnDevice || "No Name"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBiometricsModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateBiometricsMutation.mutate({
                  id: biometricsForm.id,
                  payload: {
                    deviceId: Number(biometricsForm.deviceId),
                    devicePin: biometricsForm.devicePin,
                    nameOnDevice: biometricsForm.nameOnDevice,
                    privilege: biometricsForm.privilege,
                    employeeId: biometricsForm.employeeId ? Number(biometricsForm.employeeId) : null,
                    faceEnrolled: biometricsForm.faceEnrolled,
                    fingerprintCount: Number(biometricsForm.fingerprintCount),
                    cardNumber: biometricsForm.cardNumber,
                    password: biometricsForm.password,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Terminal User ID & Name on Device */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Terminal User ID / Keypad PIN *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="e.g. 1001"
                    value={biometricsForm.devicePin}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, devicePin: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Numeric User ID for machine keypad.</p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Name on Terminal
                  </label>
                  <input
                    type="text"
                    value={biometricsForm.nameOnDevice}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, nameOnDevice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {/* Face ID Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${biometricsForm.faceEnrolled ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                    <ScanFace size={22} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">Face ID Recognition</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {biometricsForm.faceEnrolled
                        ? "Dual IR 3D facial biometric active on terminal"
                        : "Enable to mark face template enrolled for this user"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBiometricsForm({ ...biometricsForm, faceEnrolled: !biometricsForm.faceEnrolled })}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
                    biometricsForm.faceEnrolled
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {biometricsForm.faceEnrolled ? "Enrolled ✓" : "Enable"}
                </button>
              </div>

              {/* Fingerprint Count Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${biometricsForm.fingerprintCount > 0 ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                      <Fingerprint size={22} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">Fingerprint Enrollment</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Number of registered finger minutiae templates
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {biometricsForm.fingerprintCount} Fingers
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {[0, 1, 2, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setBiometricsForm({ ...biometricsForm, fingerprintCount: count })}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition-all text-xs border ${
                        biometricsForm.fingerprintCount === count
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {count === 0 ? "None (0)" : count === 1 ? "1 Finger" : count === 2 ? "2 Fingers" : "4 Fingers"}
                    </button>
                  ))}
                </div>
              </div>

              {/* RFID Card & Keypad Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    <span className="flex items-center gap-1.5">
                      <CreditCard size={13} className="text-cyan-600" />
                      <span>RFID Card / Badge Number</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0012938475"
                    value={biometricsForm.cardNumber}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, cardNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Card number printed on badge or swiped on terminal.</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    <span className="flex items-center gap-1.5">
                      <KeyRound size={13} className="text-amber-600" />
                      <span>Keypad Password (Numeric 1-8 Digits)</span>
                    </span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Optional Keypad Password"
                    value={biometricsForm.password}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, password: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Optional password entered on keypad to punch without finger/card.</p>
                </div>
              </div>

              {/* Privilege & Assigned Personnel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Terminal Privilege</label>
                  <select
                    value={biometricsForm.privilege}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, privilege: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="NORMAL_USER">Normal User (Punch Only)</option>
                    <option value="ENROLLER">Enroller (Can Enroll Others)</option>
                    <option value="ADMIN">Terminal Administrator</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Map to System Personnel</label>
                  <select
                    value={biometricsForm.employeeId}
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.englishName} (ID: {emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBiometricsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBiometricsMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  {updateBiometricsMutation.isPending ? "Syncing..." : "Save & Push to Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Sync Users to Other Machine */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sync Users to Other Machine
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Transfer all user PINs, names, and biometrics across terminals
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!syncForm.targetDeviceId) {
                  alert("Please select a target terminal");
                  return;
                }
                syncToDeviceMutation.mutate({
                  targetDeviceId: Number(syncForm.targetDeviceId),
                  sourceDeviceId: syncForm.sourceDeviceId ? Number(syncForm.sourceDeviceId) : null,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Terminal (Destination) *</label>
                <select
                  required
                  value={syncForm.targetDeviceId}
                  onChange={(e) => setSyncForm({ ...syncForm, targetDeviceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Select Destination Terminal</option>
                  {devices?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.serialNumber}) • {d.location || "General"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Source User Pool</label>
                <select
                  value={syncForm.sourceDeviceId}
                  onChange={(e) => setSyncForm({ ...syncForm, sourceDeviceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Active Personnel (Teachers, Staff & Enrolled Users)</option>
                  {devices?.map((d) => (
                    <option key={d.id} value={d.id}>
                      Only users from {d.name} ({d.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-500" />
                  <span>How multi-terminal sync works:</span>
                </p>
                <p>• Creates database mappings linking every person to the target terminal.</p>
                <p>• Queues protocol commands so when the destination terminal connects, all users are uploaded automatically into its memory.</p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncToDeviceMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  {syncToDeviceMutation.isPending ? "Synchronizing..." : "Start Sync to Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Map Device User (Create) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Map Biometric PIN to Personnel</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  deviceId: Number(createForm.deviceId),
                  devicePin: createForm.devicePin,
                  nameOnDevice: createForm.nameOnDevice,
                  privilege: createForm.privilege,
                  employeeId: createForm.employeeId ? Number(createForm.employeeId) : null,
                  faceEnrolled: createForm.faceEnrolled,
                  fingerprintCount: Number(createForm.fingerprintCount),
                  cardNumber: createForm.cardNumber,
                  password: createForm.password,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Terminal *</label>
                <select
                  required
                  value={createForm.deviceId}
                  onChange={(e) => setCreateForm({ ...createForm, deviceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Select Biometric Terminal</option>
                  {devices?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.serialNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Device PIN / Terminal User ID (Numeric) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="e.g. 1001"
                  value={createForm.devicePin}
                  onChange={(e) => setCreateForm({ ...createForm, devicePin: e.target.value.replace(/\D/g, "") })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Numeric keypad PIN (0-9) entered on physical terminal.</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Name on Terminal</label>
                <input
                  type="text"
                  placeholder="e.g. Sokha Chan"
                  value={createForm.nameOnDevice}
                  onChange={(e) => setCreateForm({ ...createForm, nameOnDevice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Map to System Employee / Personnel</label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const selectedEmp = employees?.find((emp) => String(emp.id) === String(empId));
                    setCreateForm({
                      ...createForm,
                      employeeId: empId,
                      devicePin: selectedEmp?.employeeCode || createForm.devicePin,
                      nameOnDevice: selectedEmp?.englishName || createForm.nameOnDevice,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned (Device Only)</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.englishName} (ID: {emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-cyan-600" />
                    <span>RFID Card / Badge Number (Optional)</span>
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0012938475"
                  value={createForm.cardNumber}
                  onChange={(e) => setCreateForm({ ...createForm, cardNumber: e.target.value.replace(/\D/g, "") })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Printed badge number or scanned from device.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Fingerprints Enrolled</label>
                  <select
                    value={createForm.fingerprintCount}
                    onChange={(e) => setCreateForm({ ...createForm, fingerprintCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>0 (None)</option>
                    <option value={1}>1 Finger</option>
                    <option value={2}>2 Fingers</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Face Recognition</label>
                  <select
                    value={createForm.faceEnrolled ? "true" : "false"}
                    onChange={(e) => setCreateForm({ ...createForm, faceEnrolled: e.target.value === "true" })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="false">Not Enrolled</option>
                    <option value="true">Enrolled (Active)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {createMutation.isPending ? "Mapping..." : "Save Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Quick Single-User Fast Card Scanner */}
      {quickScanUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 border border-cyan-100 dark:border-cyan-900 shadow-xs">
                  <CreditCard size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Fast Card Scanner</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      USB Reader / Keypad
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Terminal User ID: <span className="font-mono font-bold text-indigo-600">{quickScanUser.devicePin}</span> • {quickScanUser.nameOnDevice || "Staff"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickScanUser(null)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCardSubmit} className="space-y-4">
              {/* Animated Card Scanner Graphic */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-b from-cyan-50/70 to-indigo-50/40 dark:from-cyan-950/30 dark:to-indigo-950/30 border-2 border-dashed border-cyan-300 dark:border-cyan-700 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 animate-bounce">
                  <Radio size={26} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tap Card on USB Scanner or Enter Code
                </span>
                <span className="text-[11px] text-slate-400">
                  Pressing Enter will automatically save & push to all terminals!
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
                  RFID Card / Badge Number:
                </label>
                <div className="relative">
                  <input
                    ref={quickInputRef}
                    type="text"
                    autoFocus
                    placeholder="e.g. 0012938475 or 197, 27883"
                    value={quickCardInput}
                    onChange={(e) => setQuickCardInput(e.target.value)}
                    className="w-full px-4 py-3 text-lg rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 text-slate-900 dark:text-white font-mono tracking-wider text-center focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all shadow-inner"
                  />
                  {quickCardInput && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                      Clean: {parseRfidCardInput(quickCardInput) || "..."}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports standard 10-digit decimal, Wiegand (e.g. 197, 27883), or Hex.
                </p>
              </div>

              {quickScanMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    quickScanStatus === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {quickScanStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{quickScanMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                {quickScanUser.cardNumber ? (
                  <button
                    type="button"
                    onClick={handleClearCard}
                    disabled={quickScanStatus === "saving"}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 cursor-pointer"
                  >
                    Unlink Card
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">USB reader auto-submits on tap</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickScanUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickScanStatus === "saving"}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap size={14} />
                    <span>{quickScanStatus === "saving" ? "Pushing..." : "Save & Push to Devices"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Rapid Batch Card Scanner */}
      {showBatchScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30">
                  <Zap size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Rapid Batch Card Scanner</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Auto-Advance
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Scan cards continuously — each tap saves & auto-advances to the next person
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchScan(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {batchQueue.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white">All Personnel Have Cards Assigned!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Every user registered on the terminals currently has an active RFID badge.
                </p>
                <button
                  type="button"
                  onClick={() => setBatchFilterMissingOnly(false)}
                  className="text-xs text-indigo-600 font-bold underline cursor-pointer"
                >
                  Show all users to re-scan
                </button>
              </div>
            ) : currentBatchUser ? (
              <form onSubmit={handleBatchCardSubmit} className="space-y-4">
                {/* Progress Strip */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Personnel {batchIndex + 1} of {batchQueue.length}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBatchSoundEnabled(!batchSoundEnabled)}
                      className={`p-1 rounded-md text-xs flex items-center gap-1 cursor-pointer ${batchSoundEnabled ? "text-cyan-600" : "text-slate-400"}`}
                      title="Toggle Beep Sound"
                    >
                      {batchSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      <span className="text-[10px]">{batchSoundEnabled ? "Audio On" : "Muted"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchFilterMissingOnly(!batchFilterMissingOnly);
                        setBatchIndex(0);
                      }}
                      className="text-[10px] underline text-indigo-600 cursor-pointer"
                    >
                      {batchFilterMissingOnly ? "Show All Users" : "Missing Cards Only"}
                    </button>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${Math.round(((batchIndex + 1) / batchQueue.length) * 100)}%` }}
                  />
                </div>

                {/* Current Target Personnel Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {currentBatchUser.nameOnDevice ? currentBatchUser.nameOnDevice[0].toUpperCase() : "#"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">
                        {currentBatchUser.nameOnDevice || "No Name"}
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                        Terminal PIN: {currentBatchUser.devicePin}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={batchIndex === 0}
                      onClick={() => {
                        setBatchIndex(batchIndex - 1);
                        setBatchStatus("idle");
                        setBatchMsg("");
                        setTimeout(() => batchInputRef.current?.focus(), 50);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                      title="Previous Person"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={batchIndex + 1 >= batchQueue.length}
                      onClick={() => {
                        setBatchIndex(batchIndex + 1);
                        setBatchStatus("idle");
                        setBatchMsg("");
                        setTimeout(() => batchInputRef.current?.focus(), 50);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                      title="Next Person"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Rapid Scanner Input */}
                <div>
                  <input
                    ref={batchInputRef}
                    type="text"
                    autoFocus
                    placeholder="TAP CARD ON USB SCANNER NOW..."
                    value={batchCardInput}
                    onChange={(e) => setBatchCardInput(e.target.value)}
                    className="w-full px-4 py-4 text-xl rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border-2 border-cyan-400 dark:border-cyan-600 text-slate-900 dark:text-white font-mono tracking-widest text-center focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-center text-slate-400 mt-1">
                    Wedge scanner sends Enter key automatically. Or type and press Enter.
                  </p>
                </div>

                {batchMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      batchStatus === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {batchStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{batchMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400">
                    Saved & pushed to both terminals instantly
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (batchIndex + 1 < batchQueue.length) {
                        setBatchIndex(batchIndex + 1);
                        setBatchStatus("idle");
                        setBatchMsg("");
                        setTimeout(() => batchInputRef.current?.focus(), 50);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    Skip to next person $\rightarrow$
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white">Batch Enrollment Complete!</h4>
                <p className="text-xs text-slate-400">All personnel in the queue have been scanned.</p>
                <button
                  onClick={() => setShowBatchScan(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
