"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  UserCheck,
  Clock,
  Search,
  Building2,
  Layers,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Filter,
  Briefcase,
  Calendar,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Portal from "@/components/common/Portal";

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Form State
  const [assignMode, setAssignMode] = useState("EMPLOYEES"); // "EMPLOYEES", "DEPARTMENT", "BRANCH", "ALL"
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState("");

  const [formData, setFormData] = useState({
    shiftId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  // Queries
  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["all-schedules"],
    queryFn: async () => {
      const res = await api.get("/api/v1/schedules");
      return res.data?.data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?size=500");
      return res.data?.data?.content || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
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

  const { data: shifts } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shifts");
      return res.data?.data || [];
    },
  });

  // Mutation for batch schedule creation
  const batchCreateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/schedules/batch", payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["all-schedules"]);
      setShowModal(false);
      resetModalForm();
      setActionFeedback({
        type: "success",
        text: `Successfully assigned schedule to ${data?.length || 1} employee(s)!`,
      });
      setTimeout(() => setActionFeedback(null), 5000);
    },
    onError: (err) => {
      setActionFeedback({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to assign schedule.",
      });
      setTimeout(() => setActionFeedback(null), 6000);
    },
  });

  const deleteSchedule = async (id, name) => {
    if (!confirm(`Remove schedule assignment for ${name || "this employee"}?`)) return;
    try {
      await api.delete(`/api/v1/schedules/${id}`);
      queryClient.invalidateQueries(["all-schedules"]);
      setActionFeedback({ type: "success", text: "Schedule removed successfully." });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetModalForm = () => {
    setAssignMode("EMPLOYEES");
    setSelectedEmployeeIds([]);
    setSelectedDeptId("");
    setSelectedBranchId("");
    setEmployeeSearch("");
    setEmployeeDeptFilter("");
    setFormData({
      shiftId: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    });
  };

  // Filtered employees for picker inside modal
  const filteredEmployeesForModal = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const matchesSearch =
        !employeeSearch ||
        emp.englishName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase());
      const matchesDept =
        !employeeDeptFilter ||
        String(emp.departmentId) === String(employeeDeptFilter) ||
        emp.departmentName?.toLowerCase() === employeeDeptFilter.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }, [employees, employeeSearch, employeeDeptFilter]);

  // Handle employee multi-selection
  const toggleEmployeeSelect = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFilteredEmployees = () => {
    const ids = filteredEmployeesForModal.map((e) => e.id);
    setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelectedEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  // Weekday Preset Helpers
  const applyWeekdayPreset = (preset) => {
    if (preset === "MON_FRI") {
      setFormData((prev) => ({
        ...prev,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      }));
    } else if (preset === "MON_SAT") {
      setFormData((prev) => ({
        ...prev,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      }));
    } else if (preset === "ALL_DAYS") {
      setFormData((prev) => ({
        ...prev,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      }));
    }
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.shiftId) {
      alert("Please select a work shift.");
      return;
    }

    let payload = {
      shiftId: Number(formData.shiftId),
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      monday: formData.monday,
      tuesday: formData.tuesday,
      wednesday: formData.wednesday,
      thursday: formData.thursday,
      friday: formData.friday,
      saturday: formData.saturday,
      sunday: formData.sunday,
    };

    if (assignMode === "EMPLOYEES") {
      if (selectedEmployeeIds.length === 0) {
        alert("Please select at least one employee.");
        return;
      }
      payload.employeeIds = selectedEmployeeIds;
    } else if (assignMode === "DEPARTMENT") {
      if (!selectedDeptId) {
        alert("Please select a department.");
        return;
      }
      payload.departmentId = Number(selectedDeptId);
    } else if (assignMode === "BRANCH") {
      if (!selectedBranchId) {
        alert("Please select a campus/branch.");
        return;
      }
      payload.branchId = Number(selectedBranchId);
    } else if (assignMode === "ALL") {
      payload.employeeIds = employees?.map((e) => e.id) || [];
    }

    batchCreateMutation.mutate(payload);
  };

  // Filtered schedules for main table
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShift = !shiftFilter || String(s.shiftId) === String(shiftFilter);
      const matchesDept = !deptFilter || s.departmentName === deptFilter;
      return matchesSearch && matchesShift && matchesDept;
    });
  }, [schedules, searchTerm, shiftFilter, deptFilter]);

  const totalPages = Math.ceil(filteredSchedules.length / pageSize) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = page * pageSize;
    return filteredSchedules.slice(start, start + pageSize);
  }, [filteredSchedules, page, pageSize]);

  const days = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarRange className="text-indigo-600 dark:text-indigo-400" size={26} />
            <span>Schedule & Roster Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign work shifts and recurring attendance schedules to individual staff or entire departments and branches
          </p>
        </div>

        <div className="flex items-center gap-3">
          {actionFeedback && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
              }`}
            >
              {actionFeedback.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{actionFeedback.text}</span>
            </span>
          )}

          <button
            onClick={() => {
              resetModalForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Assign Schedule (Single or Group)</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Shifts</option>
            {shifts?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Assigned Schedules ({filteredSchedules.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Employees without custom rosters follow standard shift hours.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department / Campus</th>
                <th className="py-3 px-4">Assigned Shift</th>
                <th className="py-3 px-4">Working Days</th>
                <th className="py-3 px-4">Effective Range</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                    Loading schedules...
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarRange size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No schedules found</p>
                    <p className="text-[11px] mt-0.5">Click &quot;Assign Schedule&quot; above to assign shifts to employees or groups.</p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{sc.employeeName}</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                        {sc.employeeCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {sc.departmentName || "General Staff"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sc.branchName || "Main Campus"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 inline-block">
                        {sc.shiftName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {days.map((d) => {
                          const active = sc[d.key];
                          return (
                            <span
                              key={d.key}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                active
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                  : "text-slate-300 dark:text-slate-700"
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDate(sc.effectiveFrom)} → {sc.effectiveTo ? formatDate(sc.effectiveTo) : "Ongoing"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteSchedule(sc.id, sc.employeeName)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Remove Assignment"
                      >
                        <Trash2 size={15} />
                      </button>
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
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredSchedules.length > 0 ? page * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min((page + 1) * pageSize, filteredSchedules.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredSchedules.length}</span> assigned schedules
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
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Assign Schedule (Single / Multi / Group) */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarRange className="text-indigo-600" size={18} />
                  <span>Assign Shift Schedule</span>
                </h3>
                <p className="text-[11px] text-slate-500">Easily assign by individual employees or entire groups/departments.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Target Mode Tabs */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Who do you want to schedule?
                </label>
                <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAssignMode("EMPLOYEES")}
                    className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      assignMode === "EMPLOYEES"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Users size={14} />
                    <span>Select User(s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode("DEPARTMENT")}
                    className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      assignMode === "DEPARTMENT"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Briefcase size={14} />
                    <span>Department</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode("BRANCH")}
                    className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      assignMode === "BRANCH"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Branch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode("ALL")}
                    className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      assignMode === "ALL"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Layers size={14} />
                    <span>All Staff ({employees?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Multi-Employee Picker */}
              {assignMode === "EMPLOYEES" && (
                <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-indigo-600" />
                      <span>Choose Employees ({selectedEmployeeIds.length} selected)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllFilteredEmployees}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Select All Filtered
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={clearSelectedEmployees}
                        className="text-[11px] font-semibold text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Filter row inside picker */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Filter employees by name/PIN..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <select
                      value={employeeDeptFilter}
                      onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Filter by Department</option>
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scrollable list of selectable employees */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                    {filteredEmployeesForModal.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">No employees match your filter.</div>
                    ) : (
                      filteredEmployeesForModal.map((emp) => {
                        const isSelected = selectedEmployeeIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => toggleEmployeeSelect(emp.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isSelected ? (
                                <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                              ) : (
                                <Square size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold block">{emp.englishName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {emp.employeeCode} • {emp.departmentName || "General Staff"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {emp.positionName || "Employee"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: By Department */}
              {assignMode === "DEPARTMENT" && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Choose Department / Group *
                  </label>
                  <select
                    required
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    All current and active members of this department will automatically receive this schedule.
                  </p>
                </div>
              )}

              {/* Mode 3: By Campus / Branch */}
              {assignMode === "BRANCH" && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Choose Campus / Branch *
                  </label>
                  <select
                    required
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Campus / Branch</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mode 4: All Staff Notice */}
              {assignMode === "ALL" && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
                  <Users className="text-indigo-600 shrink-0" size={24} />
                  <div>
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                      Assign to All Active Staff ({employees?.length || 0} employees)
                    </span>
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      Every employee across all departments will follow this shift roster.
                    </span>
                  </div>
                </div>
              )}

              {/* Shift Selection */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Shift Profile *</label>
                <select
                  required
                  value={formData.shiftId}
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Shift</option>
                  {shifts?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Effective Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Applicable Working Days */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Working Days Preset</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyWeekdayPreset("MON_FRI")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      Mon - Fri (5d)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWeekdayPreset("MON_SAT")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      Mon - Sat (6d)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWeekdayPreset("ALL_DAYS")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, [d.key]: !formData[d.key] })}
                      className={`py-2 rounded-xl font-bold text-center border transition-all ${
                        formData[d.key]
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              </div>

              {/* Form Footer - Pinned & Never Cut Off */}
              <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchCreateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchCreateMutation.isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>
                    {batchCreateMutation.isPending ? "Assigning Schedules..." : "Save & Apply Schedule"}
                  </span>
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
