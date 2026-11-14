"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Phone,
  Mail,
  Trash2,
  Edit2,
  UserCheck,
  GraduationCap,
  Briefcase,
  Calendar,
  X,
  Camera,
  Activity,
  GitFork,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import ImageUploadDropzone from "@/components/common/ImageUploadDropzone";
import Portal from "@/components/common/Portal";
import WebcamFaceEnrollModal from "@/components/biometrics/WebcamFaceEnrollModal";
import KhmerPhoneInput from "@/components/common/KhmerPhoneInput";

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [faceEnrollPerson, setFaceEnrollPerson] = useState(null);

  const [formData, setFormData] = useState({
    employeeCode: "",
    idNumber: "",
    englishName: "",
    khmerName: "",
    gender: "FEMALE",
    email: "",
    phoneNumber: "",
    departmentId: "",
    positionId: "",
    branchId: "",
    employmentType: "FULL_TIME",
    employmentStartDate: new Date().toISOString().split("T")[0],
    employmentStatus: "ACTIVE",
    profileImageUrl: "",
    shiftId: "",
  });
  const [loadingNextCode, setLoadingNextCode] = useState(false);
  const [batchYear, setBatchYear] = useState("26");
  const [loadingNextId, setLoadingNextId] = useState(false);

  const fetchNextTeacherCode = async () => {
    setLoadingNextCode(true);
    try {
      const res = await api.get("/api/v1/teachers/next-code");
      if (res.data?.data?.nextCode) {
        setFormData((prev) => ({ ...prev, employeeCode: res.data.data.nextCode }));
      }
    } catch (err) {
      console.warn("Failed to fetch next teacher code", err);
    } finally {
      setLoadingNextCode(false);
    }
  };

  const fetchNextTeacherId = async (yr) => {
    const yearToFetch = yr !== undefined ? yr : batchYear;
    setLoadingNextId(true);
    try {
      const res = await api.get(`/api/v1/teachers/next-id-number?year=${yearToFetch}`);
      if (res.data?.data?.nextIdNumber) {
        setFormData((prev) => ({ ...prev, idNumber: res.data.data.nextIdNumber }));
      }
    } catch (err) {
      console.warn("Failed to fetch next teacher ID", err);
    } finally {
      setLoadingNextId(false);
    }
  };

  const handleYearChange = (yr) => {
    const cleaned = yr.replace(/\D/g, "").slice(-2);
    setBatchYear(cleaned);
    if (cleaned.length >= 1) {
      fetchNextTeacherId(cleaned);
    }
  };

  const { data: departments = [] } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["all-positions"],
    queryFn: async () => {
      const res = await api.get("/api/v1/positions");
      return res.data?.data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["all-branches"],
    queryFn: async () => {
      const res = await api.get("/api/v1/branches");
      return res.data?.data || [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shifts");
      return res.data?.data || [];
    },
  });

  const { data: unassignedSummary } = useQuery({
    queryKey: ["unassigned-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/schedules/unassigned-summary");
      return res.data?.data;
    },
  });

  // Dynamically resolve Academic / Teaching department across all tenant institutions
  const acadDept = departments?.find(
    (d) => d.code === "ACAD" || d.name?.toLowerCase().includes("acad") || d.name?.toLowerCase().includes("teach")
  );
  const acadDeptId = acadDept?.id;

  // Dynamically resolve teacher position & default branch for the current tenant
  const teacherPosition = positions?.find(
    (p) =>
      p.title?.toLowerCase().includes("lecturer") ||
      p.title?.toLowerCase().includes("instructor") ||
      p.title?.toLowerCase().includes("teacher")
  );
  const defaultBranch = branches?.[0]; // first branch for the current tenant

  // Build a dynamic initial form using tenant-specific IDs resolved from loaded data
  // NOTE: must be defined AFTER acadDeptId, teacherPosition, defaultBranch
  const getInitialForm = () => ({
    employeeCode: "",
    idNumber: "",
    englishName: "",
    khmerName: "",
    gender: "FEMALE",
    email: "",
    phoneNumber: "",
    departmentId: acadDeptId ? String(acadDeptId) : "",        // tenant's ACAD dept
    positionId: teacherPosition?.id ? String(teacherPosition.id) : "", // tenant's teacher position
    branchId: defaultBranch?.id ? String(defaultBranch.id) : "",       // tenant's first branch
    employmentType: "FULL_TIME",
    employmentStartDate: new Date().toISOString().split("T")[0],
    employmentStatus: "ACTIVE",
    profileImageUrl: "",
    shiftId: "",
  });

  const openCreateModal = async () => {
    setEditingTeacherId(null);
    const initialYear = "26";
    setBatchYear(initialYear);
    const initialForm = getInitialForm();
    const teacherShift = shifts?.find((s) => s.name?.toLowerCase().includes("teacher") || s.name?.toLowerCase().includes("faculty"));
    if (teacherShift) {
      initialForm.shiftId = String(teacherShift.id);
    } else if (shifts?.[0]?.id) {
      initialForm.shiftId = String(shifts[0].id);
    }
    setFormData(initialForm);
    setShowModal(true);
    await Promise.all([fetchNextTeacherCode(), fetchNextTeacherId(initialYear)]);
  };

  // Query dedicated teachers endpoint
  const { data: teachersData, isLoading, refetch } = useQuery({
    queryKey: ["teachers", search, status, branchId, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/teachers?page=${page}&size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
      if (branchId) url += `&branchId=${branchId}`;
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const cleanPayload = {
        ...payload,
        departmentId: payload.departmentId ? Number(payload.departmentId) : null,
        positionId: payload.positionId ? Number(payload.positionId) : null,
        branchId: payload.branchId ? Number(payload.branchId) : null,
        staffType: "TEACHER",
        isTeacher: true,
      };

      if (editingTeacherId) {
        const res = await api.put(`/api/v1/teachers/${editingTeacherId}`, cleanPayload);
        return res.data?.data;
      } else {
        const res = await api.post("/api/v1/teachers", cleanPayload);
        return res.data?.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["employees"]);
      setShowModal(false);
      setEditingTeacherId(null);
      setFormData(getInitialForm());
    },
    onError: (err) => {
      alert("Error saving teacher: " + (err.response?.data?.message || err.message));
    },
  });

  const updateTeacherStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const res = await api.put(`/api/v1/teachers/${id}/status?status=${newStatus}`);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
    },
    onError: (err) => {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    },
  });

  const openEditModal = (teacher) => {
    setEditingTeacherId(teacher.id);
    let extractedYear = "26";
    if (teacher.idNumber && teacher.idNumber.match(/^FBIST(\d{2})/i)) {
      extractedYear = teacher.idNumber.match(/^FBIST(\d{2})/i)[1];
    } else if (teacher.employmentStartDate) {
      extractedYear = teacher.employmentStartDate.slice(2, 4);
    }
    setBatchYear(extractedYear);
    setFormData({
      employeeCode: teacher.employeeCode,
      idNumber: teacher.idNumber || "",
      englishName: teacher.englishName,
      khmerName: teacher.khmerName || "",
      gender: teacher.gender || "FEMALE",
      email: teacher.email || "",
      phoneNumber: teacher.phoneNumber || "",
      departmentId: teacher.departmentId ? String(teacher.departmentId) : (acadDeptId ? String(acadDeptId) : ""),
      positionId: teacher.positionId ? String(teacher.positionId) : (teacherPosition?.id ? String(teacherPosition.id) : ""),
      branchId: teacher.branchId ? String(teacher.branchId) : (defaultBranch?.id ? String(defaultBranch.id) : ""),
      employmentType: teacher.employmentType || "FULL_TIME",
      employmentStartDate: teacher.employmentStartDate || new Date().toISOString().split("T")[0],
      employmentStatus: teacher.employmentStatus || "ACTIVE",
      profileImageUrl: teacher.profileImageUrl || "",
    });
    setShowModal(true);
  };

  const deleteTeacher = async (id) => {
    if (!confirm("Are you sure you want to delete this teacher profile?")) return;
    try {
      await api.delete(`/api/v1/teachers/${id}`);
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["all-schedules"]);
      queryClient.invalidateQueries(["unassigned-summary"]);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const teachers = teachersData?.content || [];
  const totalTeachers = teachersData?.totalElements || teachers.length;
  const activeTeachers = teachers.filter((t) => t.employmentStatus === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-teal-900 via-indigo-900 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
              Academic Faculty & Instructors
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Teachers Management</h1>
          <p className="text-xs text-indigo-200/80">
            Manage academic lecturers, teaching schedules, and biometric terminal attendance
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add New Teacher</span>
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalTeachers}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Faculty</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeTeachers}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Academic Department</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">Academic Affairs (ACAD)</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
        </div>
      </div>

      {/* Schedule Alert Banner */}
      {unassignedSummary?.unassignedTeachersCount > 0 && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800 rounded-2xl p-4 shadow-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Schedule Assignment Alert: {unassignedSummary.unassignedTeachersCount} Teacher{unassignedSummary.unassignedTeachersCount > 1 ? "s" : ""} Unassigned
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                Faculty members without an assigned shift schedule cannot track their morning/afternoon instructional shifts.
              </p>
            </div>
          </div>
          <Link
            href="/schedules"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span>Assign in Schedules &rarr;</span>
          </Link>
        </div>
      )}

      {/* Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 text-xs">
          <div className="h-10 flex items-center gap-2.5 min-w-[240px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition-all">
            <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
            <input
              type="text"
              placeholder="Search teacher by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 font-medium text-xs p-0 leading-normal"
            />
          </div>

          <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:border-teal-500 transition-all">
            <Activity size={15} className="text-slate-400 shrink-0 pointer-events-none" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer p-0 leading-normal"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
              <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Active</option>
              <option value="PROBATION" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Probation</option>
              <option value="SUSPENDED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Suspended</option>
            </select>
          </div>

          <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:border-teal-500 transition-all">
            <GitFork size={15} className="text-slate-400 shrink-0 pointer-events-none" />
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer p-0 leading-normal"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Branches (គ្រប់សាខា)</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  📍 {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Teachers"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white">Teachers Roster ({teachers.length})</span>
          <span className="text-slate-400 font-medium">Faculty Members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Teacher ID (អត្តលេខ)</th>
                <th className="py-3 px-4">Code / PIN</th>
                <th className="py-3 px-4">Khmer Name</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Position / Title</th>
                <th className="py-3 px-4">Branch (សាខា)</th>
                <th className="py-3 px-4">Shift / Schedule</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">Loading teachers...</td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <BookOpen size={36} className="mx-auto mb-2 opacity-40 text-teal-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No teachers found</p>
                    <p className="text-[11px] mt-0.5">Click "Add New Teacher" above to register faculty</p>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-teal-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden border border-slate-200 dark:border-slate-700">
                          {t.profileImageUrl ? (
                            <img src={t.profileImageUrl} alt={t.englishName} className="w-full h-full object-cover" />
                          ) : (
                            t.englishName ? t.englishName.charAt(0) : "T"
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{t.englishName}</p>
                          <span className="text-[10px] text-slate-400">{t.email || "Faculty"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {t.idNumber || ("FBIST" + String(t.employeeCode).padStart(4, "0"))}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        PIN: {t.employeeCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {t.khmerName || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {t.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{t.positionTitle || "Lecturer / Instructor"}</p>
                        <span className="text-[10px] text-slate-400">{t.departmentName || "Academic Affairs"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap">
                        <GitFork size={12} className="text-indigo-500 shrink-0" />
                        <span>{t.branchName || "Branch 1"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {t.scheduleAssigned ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                          <Clock size={11} className="text-emerald-500 shrink-0" />
                          <span>{t.currentShiftName || "Assigned"}</span>
                        </span>
                      ) : (
                        <Link
                          href="/schedules"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                          title="Click to assign schedule"
                        >
                          <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                          <span>Not Assigned</span>
                        </Link>
                      )}
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      {t.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                          <Mail size={12} className="text-slate-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                      {t.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                          <Phone size={12} className="text-slate-400" />
                          <span>{t.phoneNumber}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {t.employmentStartDate}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = t.employmentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                          updateTeacherStatusMutation.mutate({ id: t.id, newStatus: nextStatus });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          t.employmentStatus === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                            : t.employmentStatus === "PROBATION"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                        title={`Status: ${t.employmentStatus} • Click to toggle Active/Inactive`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          t.employmentStatus === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`} />
                        <span>{t.employmentStatus}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFaceEnrollPerson({
                              id: t.id,
                              code: t.employeeCode,
                              name: t.englishName,
                              khmerName: t.khmerName,
                              type: "TEACHER",
                              departmentOrClass: "Faculty / Teacher",
                              photoUrl: t.profileImageUrl,
                            })
                          }
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="ចុះឈ្មោះ Face ID តាម Webcam (Enroll Face ID)"
                        >
                          <Camera size={15} />
                        </button>
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteTeacher(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Teacher"
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

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{teachers.length > 0 ? page * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min((page + 1) * pageSize, teachersData?.totalElements || 0)}
            </span>{" "}
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{teachersData?.totalElements || 0}</span> faculty teachers
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-600 dark:text-slate-400">
              Page {page + 1} of {Math.max(1, teachersData?.totalPages || 1)}
            </span>
            <button
              onClick={() => setPage((p) => (p + 1 < (teachersData?.totalPages || 1) ? p + 1 : p))}
              disabled={page + 1 >= (teachersData?.totalPages || 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Teacher */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingTeacherId ? "Edit Teacher Profile" : "Register New Teacher"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Faculty profile, credentials, and classroom department
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingTeacherId(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                <ImageUploadDropzone
                  value={formData.profileImageUrl || ""}
                  onChange={(url) => setFormData({ ...formData, profileImageUrl: url })}
                  label="Teacher Profile Photo"
                  helperText="Drag & drop teacher photo (Shows on Live Kiosk and Academic Roster)"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Teacher ID (អត្តលេខ)
                      </label>
                      <button
                        type="button"
                        onClick={() => fetchNextTeacherId(batchYear)}
                        disabled={loadingNextId}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        title="Calculate next sequential ID for chosen year"
                      >
                        <RefreshCw size={11} className={loadingNextId ? "animate-spin" : ""} />
                        <span>{loadingNextId ? "Generating..." : "Auto ID"}</span>
                      </button>
                    </div>

                    {/* Batch Year Selector Chips */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Year:</span>
                      {["25", "26", "27", "28"].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => handleYearChange(yr)}
                          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            batchYear === yr
                              ? "bg-teal-600 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="YY"
                        value={batchYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="w-10 px-1 py-0.5 text-xs text-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white"
                        title="Custom 2-digit Year (e.g. 24, 25, 26, 27)"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. FBIST260001"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                    />
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
                      ✓ Auto ID: FBIST + Year ({batchYear}) + 4-digit auto index ({formData.idNumber || `FBIST${batchYear}0001`})
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Teacher Code / Terminal PIN *
                      </label>
                      {!editingTeacherId && (
                        <button
                          type="button"
                          onClick={fetchNextTeacherCode}
                          disabled={loadingNextCode}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                          title="Generate fresh unique PIN"
                        >
                          <RefreshCw size={11} className={loadingNextCode ? "animate-spin" : ""} />
                          <span>{loadingNextCode ? "Generating..." : "Auto-Generated"}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={!!editingTeacherId}
                      placeholder="Auto-generated PIN (e.g. 1)"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono disabled:opacity-50"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                      ✓ System auto-generates non-colliding numeric PIN across all personnel and machines.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Campus / Branch
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {branches?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      English Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sophea Chan"
                      value={formData.englishName}
                      onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Khmer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ចាន់ សុភា"
                      value={formData.khmerName}
                      onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Academic Department *
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Position / Title *
                    </label>
                    <select
                      value={formData.positionId}
                      onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {positions?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="teacher@enterprise.edu.kh"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Phone Number
                    </label>
                    <KhmerPhoneInput
                      value={formData.phoneNumber}
                      onChange={(val) => setFormData({ ...formData, phoneNumber: val })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Employment Type
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="FULL_TIME">Full-Time Faculty</option>
                      <option value="PART_TIME">Part-Time Lecturer</option>
                      <option value="CONTRACT">Adjunct / Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={formData.employmentStartDate}
                      onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Assigned Shift / Schedule (វេនបង្រៀន)
                  </label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs cursor-pointer"
                  >
                    <option value="">Select Shift (Optional)</option>
                    {shifts?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">If selected, an active recurring teaching shift will automatically be created for this faculty member.</p>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTeacherId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : editingTeacherId ? "Update Teacher" : "Save Teacher"}
                </button>
              </div>
            </form>
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
          queryClient.invalidateQueries(["teachers"]);
          refetch();
        }}
      />
    </div>
  );
}

