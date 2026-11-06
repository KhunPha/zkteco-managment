"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Phone,
  Mail,
  Trash2,
  Edit,
  UserCheck,
  UserX,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Portal from "@/components/common/Portal";
import ImageUploadDropzone from "@/components/common/ImageUploadDropzone";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const initialForm = {
    employeeCode: "",
    englishName: "",
    khmerName: "",
    gender: "MALE",
    email: "",
    phoneNumber: "",
    departmentId: "",
    positionId: "",
    branchId: "",
    employmentType: "FULL_TIME",
    employmentStartDate: new Date().toISOString().split("T")[0],
    employmentStatus: "ACTIVE",
    profileImageUrl: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const openCreateModal = () => {
    setEditingEmployeeId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployeeId(emp.id);
    setFormData({
      employeeCode: emp.employeeCode || "",
      englishName: emp.englishName || "",
      khmerName: emp.khmerName || "",
      gender: emp.gender || "MALE",
      email: emp.email || "",
      phoneNumber: emp.phoneNumber || "",
      departmentId: emp.departmentId ? String(emp.departmentId) : "",
      positionId: emp.positionId ? String(emp.positionId) : "",
      branchId: emp.branchId ? String(emp.branchId) : "",
      employmentType: emp.employmentType || "FULL_TIME",
      employmentStartDate: emp.employmentStartDate ? emp.employmentStartDate.split("T")[0] : new Date().toISOString().split("T")[0],
      employmentStatus: emp.employmentStatus || "ACTIVE",
      profileImageUrl: emp.profileImageUrl || "",
    });
    setShowModal(true);
  };

  const { data: departments } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
      return res.data?.data || [];
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["all-positions"],
    queryFn: async () => {
      const res = await api.get("/api/v1/positions");
      return res.data?.data || [];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["all-branches"],
    queryFn: async () => {
      const res = await api.get("/api/v1/branches");
      return res.data?.data || [];
    },
  });

  const { data: allEmployeesCountData } = useQuery({
    queryKey: ["all-employees-count"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=1");
      return res.data?.data?.totalElements || 0;
    },
  });

  const { data: activeEmployeesCountData } = useQuery({
    queryKey: ["active-employees-count"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?status=ACTIVE&size=1");
      return res.data?.data?.totalElements || 0;
    },
  });

  const { data: employeesData, isLoading, refetch } = useQuery({
    queryKey: ["employees", search, departmentId, status],
    queryFn: async () => {
      let url = `/api/v1/employees?search=${encodeURIComponent(search)}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (status) url += `&status=${status}`;
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  const totalEmployees = allEmployeesCountData || employeesData?.totalElements || (employeesData?.content?.length || 0);
  const activeEmployees = activeEmployeesCountData || (employeesData?.content?.filter((e) => e.employmentStatus === "ACTIVE").length || 0);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/employees", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["employees"]);
      setShowModal(false);
      setFormData(initialForm);
    },
    onError: (err) => {
      alert("Error creating employee: " + (err.response?.data?.message || err.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(`/api/v1/employees/${editingEmployeeId}`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["employees"]);
      setShowModal(false);
      setEditingEmployeeId(null);
      setFormData(initialForm);
    },
    onError: (err) => {
      alert("Error updating employee: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteEmployee = async (id) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    try {
      await api.delete(`/api/v1/employees/${id}`);
      queryClient.invalidateQueries(["employees"]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              Workforce Personnel & Operations
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Employees Management</h1>
          <p className="text-xs text-teal-200/80">
            Manage workforce personnel, organizational assignments, departments, and biometric linkages
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL EMPLOYEES</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {Number(totalEmployees).toLocaleString()}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ACTIVE WORKFORCE</p>
            <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-0.5">
              {Number(activeEmployees).toLocaleString()}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ORGANIZATION UNITS</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {departments?.length || 4} Active Departments
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            Employees Directory ({employeesData?.totalElements || employeesData?.content?.length || 0})
          </span>
          <span className="text-slate-400 font-medium">Staff & Workforce</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading employees...</td>
                </tr>
              ) : employeesData?.content?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No employees found</p>
                    <p className="text-[11px]">Click "Add Employee" to register staff.</p>
                  </td>
                </tr>
              ) : (
                employeesData?.content?.map((emp) => {
                  const isActive = emp.employmentStatus === "ACTIVE";
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {emp.profileImageUrl ? (
                              <img src={emp.profileImageUrl} alt={emp.englishName} className="w-full h-full object-cover" />
                            ) : (
                              emp.englishName?.[0]?.toUpperCase() || "E"
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{emp.englishName}</span>
                            {emp.khmerName && (
                              <span className="text-[11px] text-slate-400 block">{emp.khmerName}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {emp.employeeCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">{emp.departmentName || "General"}</span>
                        <span className="text-[11px] text-slate-400">{emp.positionTitle || "Staff"}</span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{emp.email || "-"}</div>
                        <div className="text-slate-400">{emp.phoneNumber || "-"}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {formatDate(emp.employmentStartDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{emp.employmentStatus}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Edit Employee / Update PIN"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => deleteEmployee(emp.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Deactivate Employee"
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

      {/* Modal: Add / Edit Employee */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
              <div className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingEmployeeId ? "Edit Employee & Terminal PIN" : "Register New Employee"}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const payload = {
                      ...formData,
                      departmentId: formData.departmentId ? Number(formData.departmentId) : null,
                      positionId: formData.positionId ? Number(formData.positionId) : null,
                      branchId: formData.branchId ? Number(formData.branchId) : null,
                    };
                    if (editingEmployeeId) {
                      updateMutation.mutate(payload);
                    } else {
                      createMutation.mutate(payload);
                    }
                  }}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                    <ImageUploadDropzone
                      value={formData.profileImageUrl || ""}
                      onChange={(url) => setFormData({ ...formData, profileImageUrl: url })}
                      label="Employee Profile Photo"
                      helperText="Drag & drop staff photo (Shows on Live Kiosk and Personnel Directory)"
                    />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Employee Code / Terminal User ID (Numeric) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="e.g. 1001"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Numeric keypad PIN (0-9). Typed on the ZKTeco device to punch or enroll.
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">English Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sok Dara"
                    value={formData.englishName}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Khmer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. សុខ ដារ៉ា"
                    value={formData.khmerName}
                    onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sok.dara@enterprise.edu.kh"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+855 12 345 678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Position / Job Title</label>
                  <select
                    value={formData.positionId}
                    onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Position</option>
                    {positions?.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Campus / Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Branch</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Employment Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.employmentStartDate}
                    onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              </div>

              {/* Pinned Action Footer */}
              <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {editingEmployeeId
                    ? (updateMutation.isPending ? "Updating..." : "Update Employee")
                    : (createMutation.isPending ? "Saving..." : "Create Employee")}
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

