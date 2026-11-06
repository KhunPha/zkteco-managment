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
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import ImageUploadDropzone from "@/components/common/ImageUploadDropzone";
import Portal from "@/components/common/Portal";

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  const initialForm = {
    employeeCode: "",
    englishName: "",
    khmerName: "",
    gender: "FEMALE",
    email: "",
    phoneNumber: "",
    departmentId: "4", // Academic Affairs
    positionId: "4",   // Lecturer / Instructor
    branchId: "1",     // Main Campus
    employmentType: "FULL_TIME",
    employmentStartDate: new Date().toISOString().split("T")[0],
    employmentStatus: "ACTIVE",
    profileImageUrl: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const [loadingNextCode, setLoadingNextCode] = useState(false);

  const fetchNextTeacherCode = async () => {
    setLoadingNextCode(true);
    try {
      const res = await api.get("/api/v1/employees/next-code");
      if (res.data?.data?.nextCode) {
        setFormData((prev) => ({ ...prev, employeeCode: res.data.data.nextCode }));
      }
    } catch (err) {
      console.warn("Failed to fetch next teacher code", err);
    } finally {
      setLoadingNextCode(false);
    }
  };

  const openCreateModal = async () => {
    setEditingTeacherId(null);
    setFormData(initialForm);
    setShowModal(true);
    await fetchNextTeacherCode();
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

  // Query employees with Academic Affairs department (ID 4) or Teacher search
  const { data: teachersData, isLoading, refetch } = useQuery({
    queryKey: ["teachers", search, status, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/employees?departmentId=4&page=${page}&size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
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
      };

      if (editingTeacherId) {
        const res = await api.put(`/api/v1/employees/${editingTeacherId}`, cleanPayload);
        return res.data?.data;
      } else {
        const res = await api.post("/api/v1/employees", cleanPayload);
        return res.data?.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["employees"]);
      setShowModal(false);
      setEditingTeacherId(null);
      setFormData(initialForm);
    },
    onError: (err) => {
      alert("Error saving teacher: " + (err.response?.data?.message || err.message));
    },
  });

  const updateTeacherStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const res = await api.put(`/api/v1/employees/${id}/status?status=${newStatus}`);
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
    setFormData({
      employeeCode: teacher.employeeCode,
      englishName: teacher.englishName,
      khmerName: teacher.khmerName || "",
      gender: teacher.gender || "FEMALE",
      email: teacher.email || "",
      phoneNumber: teacher.phoneNumber || "",
      departmentId: teacher.departmentId ? String(teacher.departmentId) : "4",
      positionId: teacher.positionId ? String(teacher.positionId) : "4",
      branchId: teacher.branchId ? String(teacher.branchId) : "1",
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
      await api.delete(`/api/v1/employees/${id}`);
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["employees"]);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const teachers = teachersData?.content || [];
  const totalTeachers = teachers.length;
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

      {/* Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 text-xs">
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
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
                <th className="py-3 px-4">Khmer Name</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Position / Title</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading teachers...</td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
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
                          <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-semibold">{t.employeeCode}</span>
                        </div>
                      </div>
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
                          Auto-Generated
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={!!editingTeacherId}
                      placeholder="e.g. 40002"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono disabled:opacity-50"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                      ✓ System auto-generates non-colliding numeric PIN across all personnel and machines.
                    </p>
                  </div>
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
                    <input
                      type="text"
                      placeholder="+855 12 345 678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
    </div>
  );
}

