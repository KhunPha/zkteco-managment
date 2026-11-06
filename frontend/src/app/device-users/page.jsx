"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Fingerprint,
  Cpu,
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
  ArrowUpDown,
  Edit,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Radio,
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  GraduationCap,
  Briefcase,
  History,
  Loader2,
  Calendar,
  Filter,
  UserCheck,
  Camera,
} from "lucide-react";
import api from "@/lib/api";
import Pagination from "@/components/common/Pagination";
import Portal from "@/components/common/Portal";
import WebcamFaceEnrollModal from "@/components/biometrics/WebcamFaceEnrollModal";

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
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [sortBy, setSortBy] = useState("PIN_ASC"); // PIN_ASC, PIN_DESC, NAME_ASC, NAME_DESC, FP_FIRST, NO_FP_FIRST, CARD_FIRST, RECENT
  const [biometricFilter, setBiometricFilter] = useState("ALL"); // ALL, HAS_FP, NO_FP, HAS_CARD, NO_CARD
  const [personnelFilter, setPersonnelFilter] = useState("ALL"); // ALL, TEACHER, STUDENT, UNMAPPED
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
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

  // Webcam Face ID Enrollment Modal state
  const [faceEnrollPerson, setFaceEnrollPerson] = useState(null);

  // Card History & Annual Renewal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardModalUser, setCardModalUser] = useState(null);
  const [cardChangeForm, setCardChangeForm] = useState({
    newCardNumber: "",
    academicYear: "2026-2027",
    notes: "Annual RFID Card Renewal",
  });
  const [cardChangeMsg, setCardChangeMsg] = useState(null);
  const [cardChangeLoading, setCardChangeLoading] = useState(false);

  // Rapid Batch Card Scanner state
  const [showBatchScan, setShowBatchScan] = useState(false);
  const [batchAcademicYear, setBatchAcademicYear] = useState("2026-2027");
  const [batchPersonnelType, setBatchPersonnelType] = useState("ALL"); // ALL, STUDENT, TEACHER, STAFF
  const [batchGrade, setBatchGrade] = useState("ALL"); // ALL, Grade 12, Grade 11, etc.
  const [batchStatusFilter, setBatchStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [batchFilterMissingOnly, setBatchFilterMissingOnly] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
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

  // Remote Machine Fingerprint Enrollment & Cross-Terminal Sync
  const [isSyncingAllFp, setIsSyncingAllFp] = useState(false);
  const [enrollTargetGate, setEnrollTargetGate] = useState("192.168.1.202");
  const [enrollFingerIndex, setEnrollFingerIndex] = useState(0);
  const [isEnrollingFp, setIsEnrollingFp] = useState(false);
  const [enrollFeedback, setEnrollFeedback] = useState(null);

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
    queryKey: ["device-users", search, selectedDeviceId, statusFilter, biometricFilter, personnelFilter, sortBy, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/device-users?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}`;
      if (selectedDeviceId) url += `&deviceId=${selectedDeviceId}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (biometricFilter !== "ALL") url += `&biometricFilter=${biometricFilter}`;
      if (personnelFilter !== "ALL") url += `&personnelType=${personnelFilter}`;
      if (sortBy) url += `&sortBy=${sortBy}`;
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  // Toggle User Status Mutation (ACTIVE <-> INACTIVE)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const res = await api.put(`/api/v1/device-users/${id}/status?status=${newStatus}`);
      return res.data?.data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
      showFeedback(`User ${vars.name || ''} marked ${vars.newStatus}`, "success");
    },
    onError: (err) => {
      showFeedback(`Status change failed: ${err.response?.data?.message || err.message}`, "error");
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

  // Group device users by PIN so each person appears ONCE across both machines
  const groupedUsers = useMemo(() => {
    const rawList = usersData?.content || [];
    if (selectedDeviceId) {
      // If user filtered by a specific device, show only that device's rows
      return rawList.map((u) => ({
        ...u,
        deviceIds: [u.deviceId],
        deviceNames: [u.deviceName],
        deviceUserIds: [u.id],
      }));
    }
    const map = new Map();
    for (const u of rawList) {
      const key = u.devicePin || `id-${u.id}`;
      if (!map.has(key)) {
        map.set(key, {
          ...u,
          deviceIds: [u.deviceId],
          deviceNames: [u.deviceName],
          deviceUserIds: [u.id],
        });
      } else {
        const existing = map.get(key);
        if (!existing.deviceIds.includes(u.deviceId)) {
          existing.deviceIds.push(u.deviceId);
          existing.deviceNames.push(u.deviceName);
          existing.deviceUserIds.push(u.id);
        }
        if (!existing.cardNumber && u.cardNumber) existing.cardNumber = u.cardNumber;
        if (u.faceEnrolled) existing.faceEnrolled = true;
        if (u.fingerprintCount > existing.fingerprintCount) existing.fingerprintCount = u.fingerprintCount;
        if (!existing.employeeId && u.employeeId) existing.employeeId = u.employeeId;
        if (!existing.employeeName && u.employeeName) existing.employeeName = u.employeeName;
        if (!existing.nameOnDevice && u.nameOnDevice) existing.nameOnDevice = u.nameOnDevice;
      }
    }
    return Array.from(map.values());
  }, [usersData, selectedDeviceId]);

  // Update Biometrics Mutation
  const updateBiometricsMutation = useMutation({
    mutationFn: async ({ id, payload, allDeviceUserIds }) => {
      const ids = allDeviceUserIds && allDeviceUserIds.length > 0 ? allDeviceUserIds : [id];
      await Promise.all(
        ids.map((targetId) => api.put(`/api/v1/device-users/${targetId}`, payload))
      );
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["device-users"]);
      setShowBiometricsModal(false);
      showFeedback("Biometrics & credentials updated and pushed to all terminals", "success");
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

  const deleteUser = async (u) => {
    const ids = u.deviceUserIds || [u.id];
    const msg = ids.length > 1
      ? `Remove user PIN ${u.devicePin} (${u.nameOnDevice}) from all ${ids.length} terminals?`
      : `Remove user PIN ${u.devicePin} (${u.nameOnDevice}) from terminal?`;
    if (!confirm(msg)) return;
    try {
      await Promise.all(ids.map((targetId) => api.delete(`/api/v1/device-users/${targetId}`)));
      queryClient.invalidateQueries(["device-users"]);
      showFeedback("User mapping removed from all terminals", "success");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openBiometricsModal = (u) => {
    setSelectedUser(u);
    setBiometricsForm({
      id: u.id,
      allDeviceUserIds: u.deviceUserIds || [u.id],
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
    setEnrollFeedback(null);
    setShowBiometricsModal(true);
  };

  // Open quick scan for a single user (pushes to all machines linked to this person)
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
      const ids = quickScanUser.deviceUserIds || [quickScanUser.id];
      await Promise.all(
        ids.map((devUserId) =>
          api.post(`/api/v1/device-users/${devUserId}/enroll-biometrics?cardNumber=${cleanNumber}`)
        )
      );
      playScannerBeep(true);
      setQuickScanStatus("success");
      setQuickScanMsg(`Card ${cleanNumber} assigned & pushed to all ${ids.length} terminals!`);
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
      const ids = quickScanUser.deviceUserIds || [quickScanUser.id];
      await Promise.all(
        ids.map((devUserId) =>
          api.post(`/api/v1/device-users/${devUserId}/enroll-biometrics?cardNumber=`)
        )
      );
      setQuickScanStatus("success");
      setQuickScanMsg(`Card unlinked from all ${ids.length} machines`);
      queryClient.invalidateQueries(["device-users"]);
      setTimeout(() => setQuickScanUser(null), 600);
    } catch (err) {
      setQuickScanStatus("error");
      setQuickScanMsg(err.response?.data?.message || err.message);
    }
  };

  const handleSyncAllFingerprints = async () => {
    setIsSyncingAllFp(true);
    setActionFeedback({ type: "info", text: "Syncing fingerprints across Gate 1 & Gate 2..." });
    try {
      const res = await api.post("/api/v1/device-users/sync-all-fingerprints");
      const resData = res.data?.data;
      const total = resData?.totalTemplatesInSystem || 0;
      setActionFeedback({
        type: "success",
        text: `Fingerprint sync complete! All ${total} templates distributed across all gates without ZKTime.`
      });
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
    } catch (err) {
      setActionFeedback({
        type: "error",
        text: "FP Sync failed: " + (err.response?.data?.message || err.message)
      });
    } finally {
      setIsSyncingAllFp(false);
    }
  };

  const handleClearAllFingerprints = async () => {
    if (!window.confirm("WARNING: Are you sure you want to remove ALL old fingerprint data from both physical terminals and database? Users, names, and card numbers will NOT be deleted.")) {
      return;
    }
    setIsSyncingAllFp(true);
    setActionFeedback({ type: "info", text: "Wiping all old fingerprints from physical terminals..." });
    try {
      await api.post("/api/v1/device-users/clear-all-fingerprints");
      setActionFeedback({
        type: "success",
        text: "All old fingerprint templates removed from physical machines! Terminals are now completely clear of duplicate fingerprints."
      });
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
    } catch (err) {
      setActionFeedback({
        type: "error",
        text: "Clear FP failed: " + (err.response?.data?.message || err.message)
      });
    } finally {
      setIsSyncingAllFp(false);
    }
  };

  const handleRemoteEnrollFingerprint = async () => {
    if (!biometricsForm.devicePin) {
      alert("User PIN is required for remote enrollment");
      return;
    }
    setIsEnrollingFp(true);
    setEnrollFeedback({
      type: "loading",
      text: "Machine sensor activated! Please touch your finger 3 times on the terminal sensor now..."
    });
    try {
      const res = await api.post(
        `/api/v1/device-users/enroll-fingerprint?pin=${biometricsForm.devicePin}&fingerIndex=${enrollFingerIndex}&targetIp=${enrollTargetGate}`
      );
      const resData = res.data?.data;
      if (resData?.success) {
        setEnrollFeedback({
          type: "success",
          text: resData.message || "Fingerprint captured & synchronized to all machines!"
        });
        setBiometricsForm((prev) => ({
          ...prev,
          fingerprintCount: Math.max(prev.fingerprintCount || 0, 1)
        }));
        queryClient.invalidateQueries(["device-users"]);
        queryClient.invalidateQueries(["batch-roster-users"]);
      } else {
        setEnrollFeedback({
          type: "error",
          text: resData?.message || "Enrollment timed out or was cancelled by user"
        });
      }
    } catch (err) {
      setEnrollFeedback({
        type: "error",
        text: "Enrollment failed: " + (err.response?.data?.message || err.message)
      });
    } finally {
      setIsEnrollingFp(false);
    }
  };

  // Batch scanner queue (deduplicated: each unique person appears only 1 time!)
  const batchQueue = useMemo(() => {
    return groupedUsers.filter((u) => {
      if (batchFilterMissingOnly) return !u.cardNumber;
      return true;
    });
  }, [groupedUsers, batchFilterMissingOnly]);

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
      const ids = currentBatchUser.deviceUserIds || [currentBatchUser.id];
      await Promise.all(
        ids.map((devUserId) =>
          api.post(`/api/v1/device-users/${devUserId}/enroll-biometrics?cardNumber=${cleanNumber}`)
        )
      );
      if (batchSoundEnabled) playScannerBeep(true);
      setBatchStatus("success");
      setBatchMsg(`✓ Card ${cleanNumber} assigned & pushed to both machines!`);
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Device Users & Biometrics Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hardware biometric PINs, Fingerprint & Face ID enrollment, RFID cards, and dual-terminal sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {actionFeedback && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs animate-fade-in ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : actionFeedback.type === "info"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {actionFeedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{actionFeedback.text}</span>
            </span>
          )}

          {/* Quick Scanner */}
          <button
            onClick={openBatchScanner}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 hover-lift active:scale-95 transition-all cursor-pointer"
            title="Fast Card Reader / USB Scanner mode"
          >
            <Zap size={14} className="text-amber-300 animate-pulse" />
            <span>Fast Card Scanner</span>
          </button>

          {/* Sync All FP */}
          <button
            onClick={handleSyncAllFingerprints}
            disabled={isSyncingAllFp}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover-lift active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Sync all fingerprints between Gate 1 (192.168.1.201) and Gate 2 (192.168.1.202) directly without ZKTime"
          >
            <Fingerprint size={14} className={isSyncingAllFp ? "animate-spin" : ""} />
            <span>{isSyncingAllFp ? "Syncing..." : "Sync All FP"}</span>
          </button>

          {/* Sync to Other Machine */}
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover-lift active:scale-95 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
            title="Push users to another terminal or machine"
          >
            <ArrowRightLeft size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Sync Machine</span>
          </button>

          {/* Clear Old FP Data */}
          <button
            onClick={handleClearAllFingerprints}
            disabled={isSyncingAllFp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-bold text-xs hover-lift active:scale-95 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Remove all old fingerprint templates from physical machines to eliminate duplicate fingerprint errors"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>Clear Old FP</span>
          </button>

          {/* Map Device User */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/25 hover-lift active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Map Device User</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover-lift">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Total Mapped PINs
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {usersData?.totalElements?.toLocaleString() ?? "..."}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Across all terminals</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div
          onClick={() => {
            setBiometricFilter(biometricFilter === "HAS_FP" ? "ALL" : "HAS_FP");
            setPage(0);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs flex items-center justify-between hover-lift ${
            biometricFilter === "HAS_FP"
              ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/80"
          }`}
          title="Click to filter users with registered fingerprints"
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Fingerprint Active
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {biometricFilter === "HAS_FP" ? `${usersData?.totalElements ?? 0} Matched` : "Filter Has FP"}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {biometricFilter === "HAS_FP" ? "Active Filter (Click to Reset)" : "Click to view FP users"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Fingerprint size={20} />
          </div>
        </div>

        <div
          onClick={() => {
            setBiometricFilter(biometricFilter === "HAS_CARD" ? "ALL" : "HAS_CARD");
            setPage(0);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-xs flex items-center justify-between hover-lift ${
            biometricFilter === "HAS_CARD"
              ? "border-cyan-500 dark:border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-800/80"
          }`}
          title="Click to filter users with active RFID card badges"
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
              RFID Smart Badges
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {biometricFilter === "HAS_CARD" ? `${usersData?.totalElements ?? 0} Matched` : "Filter Has Card"}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {biometricFilter === "HAS_CARD" ? "Active Filter (Click to Reset)" : "Click to view cardholders"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-900/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover-lift">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Connected Hardware
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {devices?.length || 2} Gates Active
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Gate 1 (.201) & Gate 2 (.202)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Cpu size={20} />
          </div>
        </div>
      </div>

      {/* Personnel Category Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setPersonnelFilter("ALL");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            personnelFilter === "ALL"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users size={14} />
          <span>All Personnel</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelFilter("STUDENT");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            personnelFilter === "STUDENT"
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap size={14} className={personnelFilter === "STUDENT" ? "text-white" : "text-cyan-500"} />
          <span>Students</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelFilter("TEACHER");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            personnelFilter === "TEACHER"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase size={14} className={personnelFilter === "TEACHER" ? "text-white" : "text-amber-500"} />
          <span>Teachers & Staff</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPersonnelFilter("UNMAPPED");
            setPage(0);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            personnelFilter === "UNMAPPED"
              ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <KeyRound size={14} className={personnelFilter === "UNMAPPED" ? "text-white" : "text-purple-500"} />
          <span>Unlinked Keypad PINs</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search PIN, Name, Card #, ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(0);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <ArrowUpDown size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="PIN_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Numeric PIN (1 → 99999)</option>
              <option value="PIN_DESC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Numeric PIN (99999 → 1)</option>
              <option value="NAME_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Name (A → Z)</option>
              <option value="NAME_DESC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Name (Z → A)</option>
              <option value="FP_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Has Fingerprint First</option>
              <option value="NO_FP_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Needs Fingerprint First</option>
              <option value="CARD_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Has Card Badge First</option>
              <option value="RECENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sort: Recently Updated</option>
            </select>
          </div>

          {/* Biometrics Filter */}
          <select
            value={biometricFilter}
            onChange={(e) => {
              setBiometricFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Biometrics</option>
            <option value="HAS_FP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Has Fingerprint (FP ✓)</option>
            <option value="NO_FP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Missing Fingerprint (No FP ✗)</option>
            <option value="HAS_CARD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Has RFID Card Badge</option>
            <option value="NO_CARD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Missing Card Badge</option>
          </select>

          {/* Terminal Gate Filter */}
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Terminals</option>
            {devices?.map((d) => (
              <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {d.name} ({d.serialNumber})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Status</option>
            <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Active Users</option>
            <option value="INACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Inactive Users</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
          >
            <option value={15} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">15 / page</option>
            <option value={25} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">25 / page</option>
            <option value={50} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">50 / page</option>
            <option value={100} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">100 / page</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          title="Refresh User List"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""} />
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider select-none text-[11px]">
                <th
                  onClick={() => {
                    setSortBy(sortBy === "PIN_ASC" ? "PIN_DESC" : "PIN_ASC");
                    setPage(0);
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Click to toggle PIN sort (1→99999 or 99999→1)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Terminal PIN</span>
                    <ArrowUpDown
                      size={12}
                      className={sortBy.startsWith("PIN") ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-600"}
                    />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy(sortBy === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                    setPage(0);
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Click to toggle Name sort (A→Z or Z→A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name on Device</span>
                    <ArrowUpDown
                      size={12}
                      className={sortBy.startsWith("NAME") ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-600"}
                    />
                  </div>
                </th>
                <th className="py-3 px-4">Assigned Personnel</th>
                <th className="py-3 px-4">Terminal Device</th>
                <th className="py-3 px-4">Privilege</th>
                <th
                  onClick={() => {
                    setSortBy(sortBy === "FP_FIRST" ? "NO_FP_FIRST" : "FP_FIRST");
                    setPage(0);
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  title="Click to toggle Fingerprint sort"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Biometrics & Credentials</span>
                    <ArrowUpDown
                      size={12}
                      className={sortBy.includes("FP") ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 dark:text-slate-600"}
                    />
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                    <span>Loading device mappings...</span>
                  </td>
                </tr>
              ) : usersData?.content?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 dark:text-slate-500">
                    <Fingerprint size={36} className="mx-auto mb-2.5 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No device users found</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Try adjusting filters or click "Map Device User" to assign a new PIN.
                    </p>
                  </td>
                </tr>
              ) : (
                usersData?.content?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    {/* PIN */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/50 inline-block">
                        PIN {u.devicePin}
                      </span>
                    </td>

                    {/* Name on Device */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {u.nameOnDevice || "-"}
                    </td>

                    {/* Assigned Personnel */}
                    <td className="py-3 px-4">
                      {u.studentName ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.studentName}</span>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                              <GraduationCap size={11} />
                              <span>{u.studentGrade || "Student"} • {u.studentClassName || u.studentCode}</span>
                            </span>
                          </div>
                        </div>
                      ) : u.employeeName ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${u.personnelType === 'TEACHER' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.employeeName}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                              {u.personnelType === 'TEACHER' ? (
                                <>
                                  <Users size={11} className="text-amber-500" />
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Teacher • {u.departmentName || "Academic Affairs"}</span>
                                </>
                              ) : (
                                <>
                                  <Briefcase size={11} className="text-slate-400" />
                                  <span>{u.departmentName || u.positionTitle || u.employeeCode}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Terminal Device */}
                    <td className="py-3 px-4">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">{u.deviceName}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{u.deviceSerialNumber}</span>
                    </td>

                    {/* Privilege */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        u.privilege === "ADMIN" || u.privilege === "SUPER_ADMIN"
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}>
                        {u.privilege}
                      </span>
                    </td>

                    {/* Biometrics & Credentials */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Fingerprint Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                            u.fingerprintCount > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 shadow-2xs"
                              : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-700/50"
                          }`}
                          title={`${u.fingerprintCount} fingerprints enrolled`}
                        >
                          <Fingerprint size={12} className={u.fingerprintCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"} />
                          <span>{u.fingerprintCount > 0 ? `${u.fingerprintCount} FP` : "No FP"}</span>
                        </span>

                        {/* Face ID Badge & Quick Webcam Enrollment Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setFaceEnrollPerson({
                              id: u.employeeId || u.studentId || u.id,
                              code: u.devicePin,
                              name: u.personnelName || u.nameOnDevice || `User ${u.devicePin}`,
                              khmerName: u.personnelKhmerName,
                              type: u.personnelType || (u.studentId ? "STUDENT" : "EMPLOYEE"),
                              departmentOrClass: u.departmentName || u.studentClassName || "Device User",
                              photoUrl: u.profileImageUrl,
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            u.faceEnrolled
                              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 shadow-2xs hover:bg-indigo-100"
                              : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-700/50 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50"
                          }`}
                          title={
                            u.faceEnrolled
                              ? "Face recognition biometric active • Click to re-enroll with webcam"
                              : "No face enrolled • Click to enroll Face ID via Webcam"
                          }
                        >
                          <ScanFace size={12} className={u.faceEnrolled ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"} />
                          <span>{u.faceEnrolled ? "Face ID ✓" : "📷 Enroll Face"}</span>
                        </button>

                        {/* Card Badge or Quick Scan Button */}
                        {u.cardNumber ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openCardModal(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 transition-colors shadow-2xs cursor-pointer"
                              title={`Active RFID Card: ${u.cardNumber} • Click to change card or view history`}
                            >
                              <CreditCard size={12} className="text-cyan-600 dark:text-cyan-400" />
                              <span>{u.cardNumber}</span>
                            </button>
                            {u.cardHistoryCount > 1 ? (
                              <button
                                type="button"
                                onClick={() => openCardModal(u)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 cursor-pointer shadow-2xs"
                                title={`${u.cardHistoryCount - 1} previous card(s) in history`}
                              >
                                <History size={10} />
                                <span>{u.cardHistoryCount - 1} past</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCardModal(u)}
                                className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Annual renewal & card history"
                              >
                                <History size={11} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openQuickScanModal(u)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50/60 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-dashed border-cyan-300 dark:border-cyan-700 transition-all cursor-pointer"
                            title="Scan RFID card with USB reader or type code"
                          >
                            <CreditCard size={11} className="text-cyan-500 animate-pulse" />
                            <span>+ Card</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = (u.status || "ACTIVE") === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                          toggleStatusMutation.mutate({
                            id: u.id,
                            newStatus: nextStatus,
                            name: u.studentName || u.employeeName || u.nameOnDevice || u.devicePin,
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          (u.status || "ACTIVE") === "ACTIVE"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        title={`Status: ${u.status || "ACTIVE"} • Click to toggle`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (u.status || "ACTIVE") === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`} />
                        <span>{u.status || "ACTIVE"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openCardModal(u)}
                          className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                          title="Annual Card Renewal & History Audit"
                        >
                          <CreditCard size={15} />
                        </button>
                        <button
                          onClick={() => openQuickScanModal(u)}
                          className="p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer"
                          title="Fast Card Scanner (USB/Keypad)"
                        >
                          <Zap size={15} />
                        </button>
                        <button
                          onClick={() => openBiometricsModal(u)}
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          title="Manage Biometrics & Credentials (FP, Face ID, Card)"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
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

        {/* Pagination Footer */}
        <Pagination
          currentPage={usersData?.pageNumber ?? page}
          totalPages={usersData?.totalPages ?? 1}
          totalElements={usersData?.totalElements ?? 0}
          pageSize={pageSize}
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          itemLabel="device users"
        />
      </div>

      {/* MODAL 1: Manage Biometrics & Enrollment */}
      {showBiometricsModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="min-h-full flex items-center justify-center p-2 sm:p-4">
              <div className="w-full max-w-lg my-auto max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
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
                  className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs"
                >
                  <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
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

              </div>

              {/* Pinned Sticky Footer - Never Cut Off */}
              <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBiometricsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBiometricsMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {updateBiometricsMutation.isPending ? "Syncing..." : "Save & Push to Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  )}

      {/* MODAL 2: Sync Users to Other Machine */}
      {showSyncModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sync Users to Other Machine
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transfer all user PINs, names, and biometrics across terminals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
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
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Terminal (Destination) *
                  </label>
                  <select
                    required
                    value={syncForm.targetDeviceId}
                    onChange={(e) => setSyncForm({ ...syncForm, targetDeviceId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Select Destination Terminal</option>
                    {devices?.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {d.name} ({d.serialNumber}) • {d.location || "General"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Source User Pool
                  </label>
                  <select
                    value={syncForm.sourceDeviceId}
                    onChange={(e) => setSyncForm({ ...syncForm, sourceDeviceId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Active Personnel (Teachers, Staff & Enrolled Users)</option>
                    {devices?.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        Only users from {d.name} ({d.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>How multi-terminal sync works:</span>
                  </p>
                  <p>• Creates database mappings linking every person to the target terminal.</p>
                  <p>• Queues protocol commands so when the destination terminal connects, all users are uploaded automatically into its memory.</p>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncToDeviceMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={14} />
                  <span>{syncToDeviceMutation.isPending ? "Synchronizing..." : "Start Sync to Machine"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* MODAL 3: Map Device User (Create) */}
      {showCreateModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Map Biometric PIN to Personnel
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Assign a terminal keypad user ID and link with database profile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
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
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Terminal *
                  </label>
                  <select
                    required
                    value={createForm.deviceId}
                    onChange={(e) => setCreateForm({ ...createForm, deviceId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Select Biometric Terminal</option>
                    {devices?.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{d.name} ({d.serialNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Device PIN / Keypad User ID *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      placeholder="e.g. 1001"
                      value={createForm.devicePin}
                      onChange={(e) => setCreateForm({ ...createForm, devicePin: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Numeric keypad PIN (0-9).</p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Name on Terminal
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sokha Chan"
                      value={createForm.nameOnDevice}
                      onChange={(e) => setCreateForm({ ...createForm, nameOnDevice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Map to System Employee / Personnel
                  </label>
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Unassigned (Device Only)</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={emp.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Printed badge number or scanned from device.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Fingerprints Enrolled
                    </label>
                    <select
                      value={createForm.fingerprintCount}
                      onChange={(e) => setCreateForm({ ...createForm, fingerprintCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value={0} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">0 (None)</option>
                      <option value={1} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">1 Finger</option>
                      <option value={2} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">2 Fingers</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Face Recognition
                    </label>
                    <select
                      value={createForm.faceEnrolled ? "true" : "false"}
                      onChange={(e) => setCreateForm({ ...createForm, faceEnrolled: e.target.value === "true" })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="false" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Not Enrolled</option>
                      <option value="true" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Enrolled (Active)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? "Mapping..." : "Save Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* MODAL 4: Quick Single-User Fast Card Scanner */}
      {quickScanUser && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/25">
                  <CreditCard size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Fast Card Scanner</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      USB Reader
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PIN <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{quickScanUser.devicePin}</span> • {quickScanUser.nameOnDevice || "Staff"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickScanUser(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCardSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {/* Animated Card Scanner Graphic */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-b from-cyan-50/70 to-indigo-50/40 dark:from-cyan-950/30 dark:to-indigo-950/30 border-2 border-dashed border-cyan-300 dark:border-cyan-700 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 animate-bounce">
                    <Radio size={28} />
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
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                {quickScanUser.cardNumber ? (
                  <button
                    type="button"
                    onClick={handleClearCard}
                    disabled={quickScanStatus === "saving"}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 cursor-pointer transition-colors"
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
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickScanStatus === "saving"}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={14} />
                    <span>{quickScanStatus === "saving" ? "Pushing..." : "Save & Push to Devices"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* MODAL 5: Rapid Batch Card Scanner */}
      {showBatchScan && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/30">
                  <Zap size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Rapid Batch Card Scanner</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Auto-Advance
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Continuous RFID assignment • Auto-saves & syncs to physical terminals
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Academic Year Selector */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Calendar size={13} className="text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500">Year:</span>
                  <select
                    value={batchAcademicYear}
                    onChange={(e) => setBatchAcademicYear(e.target.value)}
                    className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {yr} {yr === "2026-2027" ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Beep Sound Toggle */}
                <button
                  type="button"
                  onClick={() => setBatchSoundEnabled(!batchSoundEnabled)}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${
                    batchSoundEnabled ? "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title={batchSoundEnabled ? "Audio Chime Enabled" : "Audio Muted"}
                >
                  {batchSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchScan(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Role & Grade Selection Filter Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Filter size={13} className="text-indigo-500" />
                    <span>Select Group to Scan:</span>
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {batchQueue.length} personnel in queue
                  </span>
                </div>

                {/* Personnel Type Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL", label: "All Personnel", icon: Users },
                    { id: "STUDENT", label: "Students", icon: GraduationCap },
                    { id: "TEACHER", label: "Teachers", icon: Users },
                    { id: "STAFF", label: "Staff", icon: Briefcase },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const count = tab.id === "ALL" 
                      ? allRosterUsers.length 
                      : allRosterUsers.filter(u => u.personnelType === tab.id).length;
                    const isActive = batchPersonnelType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleFilterChange(setBatchPersonnelType, tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Icon size={13} />
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Grade Pills (Visible for ALL or STUDENT) */}
                {(batchPersonnelType === "ALL" || batchPersonnelType === "STUDENT") && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Grade:</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange(setBatchGrade, "ALL")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        batchGrade === "ALL"
                          ? "bg-cyan-600 text-white font-bold shadow-xs"
                          : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      All Grades
                    </button>
                    {STUDENT_GRADES.map((grd) => {
                      const count = allRosterUsers.filter(u => u.studentGrade && u.studentGrade.toLowerCase().includes(grd.toLowerCase())).length;
                      const isActive = batchGrade === grd;
                      return (
                        <button
                          key={grd}
                          type="button"
                          onClick={() => handleFilterChange(setBatchGrade, grd)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? "bg-cyan-600 text-white font-bold shadow-xs"
                              : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span>{grd}</span>
                          <span className={`text-[9px] px-1 rounded-full ${isActive ? "bg-white/25" : "bg-slate-100 dark:bg-slate-700"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Search & Renewal Mode Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, PIN, or class..."
                      value={batchSearchQuery}
                      onChange={(e) => handleFilterChange(setBatchSearchQuery, e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                      {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleFilterChange(setBatchStatusFilter, st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            batchStatusFilter === st
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                        >
                          {st === "ALL" ? "All Status" : st === "ACTIVE" ? "Active Only" : "Inactive Only"}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFilterChange(setBatchFilterMissingOnly, !batchFilterMissingOnly)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        batchFilterMissingOnly
                          ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                      title="Toggle between scanning only people missing cards or all personnel for annual renewal"
                    >
                      <UserCheck size={13} />
                      <span>{batchFilterMissingOnly ? "Missing Cards Only" : "All (Annual Renewal)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {batchQueue.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Check size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white">No Personnel In This Selection</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {batchFilterMissingOnly 
                      ? "All personnel in this selection currently have assigned cards. Switch to 'All (Annual Renewal)' to re-issue new cards." 
                      : "No users matched the selected role, grade, or search filter."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFilterMissingOnly(false);
                      setBatchGrade("ALL");
                      setBatchPersonnelType("ALL");
                      setBatchSearchQuery("");
                      setBatchIndex(0);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer hover:bg-indigo-500 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : currentBatchUser ? (
                <form onSubmit={handleBatchCardSubmit} className="space-y-4">
                  {/* Progress Strip */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>
                      Personnel <span className="font-bold text-indigo-600 dark:text-indigo-400">{batchIndex + 1}</span> of {batchQueue.length}
                      {currentBatchUser.studentGrade && ` • ${currentBatchUser.studentGrade}`}
                      {currentBatchUser.personnelType === "TEACHER" && " • Teachers"}
                      {currentBatchUser.personnelType === "STAFF" && " • Staff"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Math.round(((batchIndex + 1) / batchQueue.length) * 100)}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${Math.round(((batchIndex + 1) / batchQueue.length) * 100)}%` }}
                    />
                  </div>

                  {/* Current Target Personnel Spotlight Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-md shrink-0">
                        {currentBatchUser.studentName
                          ? currentBatchUser.studentName[0].toUpperCase()
                          : currentBatchUser.employeeName
                          ? currentBatchUser.employeeName[0].toUpperCase()
                          : (currentBatchUser.nameOnDevice ? currentBatchUser.nameOnDevice[0].toUpperCase() : "#")}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block text-base">
                          {currentBatchUser.studentName || currentBatchUser.employeeName || currentBatchUser.nameOnDevice || "No Name"}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            PIN {currentBatchUser.devicePin}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            (currentBatchUser.status || "ACTIVE") === "ACTIVE"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (currentBatchUser.status || "ACTIVE") === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`} />
                            <span>{currentBatchUser.status || "ACTIVE"}</span>
                          </span>
                          {currentBatchUser.personnelType === "STUDENT" ? (
                            <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                              <GraduationCap size={12} />
                              <span>{currentBatchUser.studentGrade || "Student"} • {currentBatchUser.studentClassName || currentBatchUser.studentCode}</span>
                            </span>
                          ) : currentBatchUser.personnelType === "TEACHER" ? (
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Users size={12} />
                              <span>Teacher • {currentBatchUser.departmentName || "Academic Affairs"}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              <Briefcase size={12} />
                              <span>{currentBatchUser.departmentName || currentBatchUser.positionTitle || "Staff"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Current Card</span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {currentBatchUser.cardNumber && currentBatchUser.cardNumber !== "0"
                            ? currentBatchUser.cardNumber
                            : "No Card"}
                        </span>
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
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Next Person"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* High-Speed RFID Scanner Input Box */}
                  <div>
                    <div className="relative">
                      <input
                        ref={batchInputRef}
                        type="text"
                        autoFocus
                        placeholder="TAP CARD ON USB SCANNER NOW..."
                        value={batchCardInput}
                        onChange={(e) => setBatchCardInput(e.target.value)}
                        className="w-full px-4 py-4 text-xl rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border-2 border-cyan-400 dark:border-cyan-600 text-slate-900 dark:text-white font-mono tracking-widest text-center focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all shadow-inner"
                      />
                      {batchCardInput && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/80 px-2.5 py-1 rounded-lg border border-cyan-300 dark:border-cyan-700">
                          Parsed: {parseRfidCardInput(batchCardInput)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-center text-slate-400 mt-1">
                      USB Wedge scanner automatically sends Enter. Card is archived into {batchAcademicYear} history & pushed to terminals.
                    </p>
                  </div>

                  {/* Status Alert Banner */}
                  {batchMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        batchStatus === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-in fade-in"
                      }`}
                    >
                      {batchStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{batchMsg}</span>
                    </div>
                  )}

                  {/* Next Up Queue Preview Strip */}
                  {batchQueue.length > batchIndex + 1 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Next in line:</span>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs overflow-x-auto">
                        {batchQueue.slice(batchIndex + 1, batchIndex + 4).map((nu, i) => (
                          <span key={nu.id} className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] whitespace-nowrap shadow-2xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {i + 1}. {nu.studentName || nu.employeeName || nu.nameOnDevice}
                            </span>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                              ({nu.studentGrade || nu.departmentName || nu.personnelType})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sparkles size={12} className="text-indigo-500" />
                      <span>Saved under {batchAcademicYear} & pushed to both ZKTeco terminals</span>
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
                      className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
                    >
                      Skip to next person $\rightarrow$
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                    <Check size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white">Batch Enrollment Complete!</h4>
                  <p className="text-xs text-slate-400">All personnel in this selection have been scanned.</p>
                  <button
                    onClick={() => setShowBatchScan(false)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer hover:bg-indigo-500 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* MODAL 6: Card Number Annual Update & Audit History */}
      {showCardModal && cardModalUser && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/30">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Annual RFID Card Update & History</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PIN <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{cardModalUser.devicePin}</span> •{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {cardModalUser.employeeName || cardModalUser.studentName || cardModalUser.nameOnDevice}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* Active Card Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Current Active Card
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-200 dark:border-cyan-800 inline-block">
                      {cardModalUser.cardNumber || "No Card Assigned"}
                    </span>
                    {cardModalUser.cardNumber && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-500 dark:text-slate-400 text-left sm:text-right">
                  <span className="block text-[11px]">Synced to Terminals</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {cardModalUser.deviceName || "Both Terminals (.201 / .202)"}
                  </span>
                </div>
              </div>

              {/* Change / Re-Issue Card Form */}
              <form onSubmit={handleCardChangeSubmit} className="space-y-3.5 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span>Assign New Card (Annual Renewal / Replacement)</span>
                  </h4>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Previous card will be preserved in history
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      New Card Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Scan or enter new card"
                      value={cardChangeForm.newCardNumber}
                      onChange={(e) => setCardChangeForm({ ...cardChangeForm, newCardNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {cardChangeForm.newCardNumber && (
                      <span className="text-[10px] text-cyan-600 font-mono mt-0.5 block">
                        Parsed: {parseRfidCardInput(cardChangeForm.newCardNumber)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Academic Year *
                    </label>
                    <select
                      value={cardChangeForm.academicYear}
                      onChange={(e) => setCardChangeForm({ ...cardChangeForm, academicYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                    >
                      {ACADEMIC_YEARS.map((yr) => (
                        <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {yr} {yr === "2026-2027" ? "(Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Renewal Reason / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual renewal"
                      value={cardChangeForm.notes}
                      onChange={(e) => setCardChangeForm({ ...cardChangeForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {cardChangeMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      cardChangeMsg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {cardChangeMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{cardChangeMsg.text}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={cardChangeLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={14} />
                    <span>{cardChangeLoading ? "Updating..." : "Update Card & Save Old to History"}</span>
                  </button>
                </div>
              </form>

              {/* Historical Card Numbers Timeline Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <History size={14} className="text-slate-400" />
                    <span>Card History Audit Trail ({userCardHistory.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Complete record of every card assigned</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Card Number</th>
                        <th className="py-2.5 px-3">Academic Year</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Issued Date</th>
                        <th className="py-2.5 px-3">Replaced Date</th>
                        <th className="py-2.5 px-3">Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingCardHistory ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Loading card history...
                          </td>
                        </tr>
                      ) : userCardHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No previous card history on file.
                          </td>
                        </tr>
                      ) : (
                        userCardHistory.map((ch) => (
                          <tr
                            key={ch.id}
                            className={
                              ch.status === "ACTIVE"
                                ? "bg-emerald-50/30 dark:bg-emerald-950/20 font-medium"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400"
                            }
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {ch.cardNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {ch.academicYear || "2025-2026"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {ch.status === "ACTIVE" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  REPLACED
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {ch.issuedDate || "-"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {ch.replacedAt ? ch.replacedAt.split("T")[0] : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {ch.notes || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Webcam Face ID Enrollment Modal */}
      <WebcamFaceEnrollModal
        isOpen={Boolean(faceEnrollPerson)}
        person={faceEnrollPerson}
        onClose={() => setFaceEnrollPerson(null)}
        onSuccess={() => {
          queryClient.invalidateQueries(["device-users"]);
          refetch();
        }}
      />
    </div>
  );
}
