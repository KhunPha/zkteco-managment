"use client";

import { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  Filter,
  Briefcase,
  Calendar,
  GraduationCap,
  BookOpen,
  GitFork,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Portal from "@/components/common/Portal";

const ALL_GRADES = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // "ALL", "EMPLOYEE", "TEACHER", "STUDENT"
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Form State
  const [assignMode, setAssignMode] = useState("EMPLOYEES"); // "EMPLOYEES", "TEACHERS", "STUDENTS", "DEPARTMENT", "BRANCH", "ALL"
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentAssignType, setStudentAssignType] = useState("STUDENTS"); // "STUDENTS" or "BATCH_CLASS"
  const [studentUnassignedOnly, setStudentUnassignedOnly] = useState(false);
  const [selectedStudentGrade, setSelectedStudentGrade] = useState("");
  const [selectedStudentClass, setSelectedStudentClass] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [personnelSearch, setPersonnelSearch] = useState("");

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

  const { data: unassignedSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["unassigned-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/schedules/unassigned-summary");
      return res.data?.data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/employees?staffType=EMPLOYEE&size=1000");
      return res.data?.data?.content || [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["all-teachers-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/teachers?size=1000");
      return res.data?.data?.content || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["all-students-schedule"],
    queryFn: async () => {
      const res = await api.get("/api/v1/students?size=2500");
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

  // Auto pre-select recommended shift based on assignMode
  const switchAssignMode = (mode) => {
    setAssignMode(mode);
    if (!shifts || shifts.length === 0) return;

    if (mode === "STUDENTS") {
      const studentShift = shifts.find((s) => s.name?.toLowerCase().includes("student")) || shifts[shifts.length - 1];
      if (studentShift) setFormData((prev) => ({ ...prev, shiftId: String(studentShift.id) }));
      // Flexible student study schedule: Monday to Saturday active
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
    } else if (mode === "TEACHERS") {
      const teacherShift = shifts.find((s) => s.name?.toLowerCase().includes("faculty") || s.name?.toLowerCase().includes("teacher")) || shifts[1] || shifts[0];
      if (teacherShift) setFormData((prev) => ({ ...prev, shiftId: String(teacherShift.id) }));
    } else if (mode === "EMPLOYEES") {
      const staffShift = shifts.find((s) => s.name?.toLowerCase().includes("standard") || s.name?.toLowerCase().includes("break")) || shifts[0];
      if (staffShift) setFormData((prev) => ({ ...prev, shiftId: String(staffShift.id) }));
    }
  };

  // Mutation for batch schedule creation
  const batchCreateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/schedules/batch", payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["all-schedules"]);
      queryClient.invalidateQueries(["unassigned-summary"]);
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["teachers"]);
      queryClient.invalidateQueries(["students"]);
      setShowModal(false);
      resetModalForm();
      setActionFeedback({
        type: "success",
        text: `Successfully assigned schedule to ${data?.length || 1} person(s)!`,
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
    if (!confirm(`Remove schedule assignment for ${name || "this person"}?`)) return;
    try {
      await api.delete(`/api/v1/schedules/${id}`);
      queryClient.invalidateQueries(["all-schedules"]);
      queryClient.invalidateQueries(["unassigned-summary"]);
      setActionFeedback({ type: "success", text: "Schedule removed successfully." });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetModalForm = () => {
    setAssignMode("EMPLOYEES");
    setSelectedEmployeeIds([]);
    setSelectedTeacherIds([]);
    setSelectedStudentIds([]);
    setSelectedStudentGrade("");
    setSelectedStudentClass("");
    setStudentAssignType("STUDENTS");
    setStudentUnassignedOnly(false);
    setSelectedDeptId("");
    setSelectedBranchId("");
    setPersonnelSearch("");
    const defaultShift = shifts && shifts.length > 0 ? String(shifts[0].id) : "";
    setFormData({
      shiftId: defaultShift,
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

  const openAssignModalWithPreset = (targetType) => {
    resetModalForm();
    if (targetType === "STUDENTS") {
      switchAssignMode("STUDENTS");
    } else if (targetType === "TEACHERS") {
      switchAssignMode("TEACHERS");
    } else {
      switchAssignMode("EMPLOYEES");
    }
    setShowModal(true);
  };

  // Filtered employees for picker inside modal
  const filteredEmployeesForModal = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      return (
        !personnelSearch ||
        emp.englishName?.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        emp.idNumber?.toLowerCase().includes(personnelSearch.toLowerCase())
      );
    });
  }, [employees, personnelSearch]);

  // Filtered teachers for picker inside modal
  const filteredTeachersForModal = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter((t) => {
      return (
        !personnelSearch ||
        t.englishName?.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        t.employeeCode?.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        t.idNumber?.toLowerCase().includes(personnelSearch.toLowerCase())
      );
    });
  }, [teachers, personnelSearch]);

  const toggleEmployeeSelect = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTeacherSelect = (id) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const studentGrades = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.grade) set.add(s.grade);
    });
    const arr = Array.from(set);
    return arr.length > 0 ? arr.sort() : ALL_GRADES;
  }, [students]);

  const studentClasses = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.className && (!selectedStudentGrade || s.grade === selectedStudentGrade)) {
        set.add(s.className);
      }
    });
    return Array.from(set).sort();
  }, [students, selectedStudentGrade]);

  const filteredStudentsForModal = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      if (selectedStudentGrade && s.grade !== selectedStudentGrade) return false;
      if (selectedStudentClass && s.className !== selectedStudentClass) return false;
      if (selectedBranchId && s.branchId && String(s.branchId) !== String(selectedBranchId)) return false;
      if (studentUnassignedOnly && s.scheduleAssigned) return false;
      if (!personnelSearch) return true;
      const term = personnelSearch.toLowerCase();
      return (
        (s.englishName || "").toLowerCase().includes(term) ||
        (s.studentCode || "").toLowerCase().includes(term) ||
        (s.idNumber || "").toLowerCase().includes(term) ||
        (s.className || "").toLowerCase().includes(term)
      );
    });
  }, [students, selectedStudentGrade, selectedStudentClass, selectedBranchId, studentUnassignedOnly, personnelSearch]);

  const toggleStudentSelect = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
      alert("Please select a work/school shift.");
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
        payload.targetPersonnelType = "EMPLOYEE";
      } else {
        payload.employeeIds = selectedEmployeeIds;
      }
    } else if (assignMode === "TEACHERS") {
      if (selectedTeacherIds.length === 0) {
        payload.targetPersonnelType = "TEACHER";
      } else {
        payload.employeeIds = selectedTeacherIds;
      }
    } else if (assignMode === "STUDENTS") {
      if (studentAssignType === "STUDENTS") {
        if (selectedStudentIds.length === 0) {
          alert("Please select at least one student from the list, or switch to 'Assign by Class / Grade Batch' mode.");
          return;
        }
        payload.studentIds = selectedStudentIds;
      } else {
        payload.targetPersonnelType = "STUDENT";
        if (selectedStudentGrade) payload.grade = selectedStudentGrade;
        if (selectedStudentClass) payload.className = selectedStudentClass;
        if (selectedBranchId) payload.branchId = Number(selectedBranchId);
      }
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
      payload.targetPersonnelType = "ALL";
    } else if (assignMode === "ALL") {
      payload.targetPersonnelType = "ALL";
    }

    batchCreateMutation.mutate(payload);
  };

  // Filtered schedules for main table
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter((s) => {
      const name = (s.employeeName || s.studentName || "").toLowerCase();
      const code = (s.employeeCode || s.studentCode || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || name.includes(term) || code.includes(term);
      const matchesShift = !shiftFilter || String(s.shiftId) === String(shiftFilter);
      const matchesDept = !deptFilter || s.departmentName === deptFilter || s.branchName === deptFilter;
      const matchesType = typeFilter === "ALL" || (s.personnelType || "EMPLOYEE") === typeFilter;

      return matchesSearch && matchesShift && matchesDept && matchesType;
    });
  }, [schedules, searchTerm, shiftFilter, deptFilter, typeFilter]);

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

  const hasUnassigned =
    unassignedSummary &&
    (unassignedSummary.unassignedEmployeesCount > 0 ||
      unassignedSummary.unassignedTeachersCount > 0 ||
      unassignedSummary.unassignedStudentsCount > 0);

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
            Assign work shifts and recurring attendance schedules to employees, teachers, and students
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
            <span>Assign Schedule (Batch or Single)</span>
          </button>
        </div>
      </div>

      {/* Unassigned Warning Banner */}
      {hasUnassigned && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800 rounded-2xl p-4 shadow-xs text-amber-950 dark:text-amber-200 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  Attendance Schedule Notification: Unassigned Personnel Detected
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  The following users do not have an active shift schedule. Unassigned users cannot calculate late penalties or attendance status properly.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {unassignedSummary.unassignedEmployeesCount > 0 && (
                    <button
                      onClick={() => openAssignModalWithPreset("EMPLOYEES")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                      title="Click to assign shift to Employees"
                    >
                      <Users size={12} />
                      <span>{unassignedSummary.unassignedEmployeesCount} Employee{unassignedSummary.unassignedEmployeesCount > 1 ? "s" : ""} Unassigned &rarr;</span>
                    </button>
                  )}
                  {unassignedSummary.unassignedTeachersCount > 0 && (
                    <button
                      onClick={() => openAssignModalWithPreset("TEACHERS")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                      title="Click to assign shift to Teachers"
                    >
                      <BookOpen size={12} />
                      <span>{unassignedSummary.unassignedTeachersCount} Teacher{unassignedSummary.unassignedTeachersCount > 1 ? "s" : ""} Unassigned &rarr;</span>
                    </button>
                  )}
                  {unassignedSummary.unassignedStudentsCount > 0 && (
                    <button
                      onClick={() => openAssignModalWithPreset("STUDENTS")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
                      title="Click to assign shift to Students"
                    >
                      <GraduationCap size={13} />
                      <span>{unassignedSummary.unassignedStudentsCount} Student{unassignedSummary.unassignedStudentsCount > 1 ? "s" : ""} Unassigned &rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                resetModalForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Batch Assign Shift</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Personnel Type Tabs */}
        <div className="sm:col-span-1 h-10 flex items-center gap-1 p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles (គ្រប់ផ្នែក)</option>
            <option value="EMPLOYEE">👨‍💼 Employees Staff</option>
            <option value="TEACHER">👩‍🏫 Academic Teachers</option>
            <option value="STUDENT">🎓 Students</option>
          </select>
        </div>

        <div className="sm:col-span-2 h-10 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
          <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
          <input
            type="text"
            placeholder="Search by name, code or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 font-medium p-0 leading-normal"
          />
        </div>

        <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
          <Clock size={15} className="text-slate-400 shrink-0 pointer-events-none" />
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full p-0 leading-normal"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Shifts</option>
            {shifts?.map((s) => (
              <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-1">
            <Building2 size={15} className="text-slate-400 shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer w-full"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Departments / Campuses</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {d.name}
                </option>
              ))}
              {branches?.map((b) => (
                <option key={b.id} value={b.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              refetch();
              refetchSummary();
            }}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
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
            Assigned Active Schedules ({filteredSchedules.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Assigned personnel follow their designated shift hours for daily attendance check-in/out.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Personnel</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department / Class</th>
                <th className="py-3 px-4">Campus / Branch</th>
                <th className="py-3 px-4">Assigned Shift</th>
                <th className="py-3 px-4">Working Days</th>
                <th className="py-3 px-4">Effective Range</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                    Loading schedules...
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarRange size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No schedules found</p>
                    <p className="text-[11px] mt-0.5">Click &quot;Assign Schedule&quot; above to assign shifts to employees, teachers, or students.</p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((sc) => {
                  const pType = sc.personnelType || "EMPLOYEE";
                  const personName = sc.employeeName || sc.studentName || "Unknown";
                  const personCode = sc.employeeCode || sc.studentCode || "-";
                  const deptOrClass = sc.className
                    ? `${sc.className}${sc.grade ? ` (${sc.grade})` : ""}`
                    : (sc.departmentName || "General");

                  return (
                    <tr key={sc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{personName}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                          PIN/Code: {personCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {pType === "STUDENT" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <GraduationCap size={11} />
                            <span>Student</span>
                          </span>
                        ) : pType === "TEACHER" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <BookOpen size={11} />
                            <span>Teacher</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Users size={11} />
                            <span>Staff</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {deptOrClass}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <GitFork size={11} className="text-indigo-500" />
                          <span>{sc.branchName || "Branch 1"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Clock size={12} className="text-indigo-500 shrink-0" />
                          <span>{sc.shiftName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {days.map((d) => (
                            <span
                              key={d.key}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                sc[d.key]
                                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                  : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                              }`}
                            >
                              {d.label[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(sc.effectiveFrom)} → {sc.effectiveTo ? formatDate(sc.effectiveTo) : "Ongoing"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => deleteSchedule(sc.id, personName)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Remove Assignment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
            <div className="w-full max-w-2xl my-auto max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarRange className="text-indigo-600" size={18} />
                    <span>Assign Shift Schedule</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure attendance shifts for employees, teachers, or students.</p>
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
                      Target Personnel Category *
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-[11px]">
                      <button
                        type="button"
                        onClick={() => switchAssignMode("EMPLOYEES")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "EMPLOYEES"
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <Users size={13} />
                        <span>Employees</span>
                        {unassignedSummary?.unassignedEmployeesCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                            {unassignedSummary.unassignedEmployeesCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => switchAssignMode("TEACHERS")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "TEACHERS"
                            ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <BookOpen size={13} />
                        <span>Teachers</span>
                        {unassignedSummary?.unassignedTeachersCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                            {unassignedSummary.unassignedTeachersCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => switchAssignMode("STUDENTS")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "STUDENTS"
                            ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <GraduationCap size={14} />
                        <span>Students</span>
                        {unassignedSummary?.unassignedStudentsCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                            {unassignedSummary.unassignedStudentsCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => switchAssignMode("DEPARTMENT")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "DEPARTMENT"
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <Briefcase size={13} />
                        <span>Department</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => switchAssignMode("BRANCH")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "BRANCH"
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <GitFork size={13} />
                        <span>Branch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => switchAssignMode("ALL")}
                        className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                          assignMode === "ALL"
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        <Layers size={13} />
                        <span>All</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Employees Picker */}
                  {assignMode === "EMPLOYEES" && (
                    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Select Employee(s) ({selectedEmployeeIds.length === 0 ? "All Active Staff" : `${selectedEmployeeIds.length} Selected`})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeIds(filteredEmployeesForModal.map((e) => e.id))}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeIds([])}
                            className="text-[11px] font-semibold text-slate-500 hover:underline"
                          >
                            Clear (All)
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Search employee by name, ID or code..."
                        value={personnelSearch}
                        onChange={(e) => setPersonnelSearch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />

                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                        {filteredEmployeesForModal.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs">No employees found</div>
                        ) : (
                          filteredEmployeesForModal.map((emp) => {
                            const isSelected = selectedEmployeeIds.includes(emp.id);
                            return (
                              <div
                                key={emp.id}
                                onClick={() => toggleEmployeeSelect(emp.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
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
                                      {emp.idNumber || emp.employeeCode} • {emp.departmentName || "Staff"}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                  {emp.branchName || "Branch 1"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Teachers Picker */}
                  {assignMode === "TEACHERS" && (
                    <div className="space-y-2 p-3 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                          Select Teacher(s) ({selectedTeacherIds.length === 0 ? "All Active Teachers" : `${selectedTeacherIds.length} Selected`})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherIds(filteredTeachersForModal.map((t) => t.id))}
                            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherIds([])}
                            className="text-[11px] font-semibold text-slate-500 hover:underline"
                          >
                            Clear (All)
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Search teacher by name, ID or code..."
                        value={personnelSearch}
                        onChange={(e) => setPersonnelSearch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />

                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                        {filteredTeachersForModal.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs">No teachers found</div>
                        ) : (
                          filteredTeachersForModal.map((t) => {
                            const isSelected = selectedTeacherIds.includes(t.id);
                            return (
                              <div
                                key={t.id}
                                onClick={() => toggleTeacherSelect(t.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {isSelected ? (
                                    <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                                  ) : (
                                    <Square size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-semibold block">{t.englishName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {t.idNumber || t.employeeCode} • {t.positionTitle || "Academic Faculty"}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                  {t.branchName || "Branch 1"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Students Targeting */}
                  {assignMode === "STUDENTS" && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-3">
                      {/* Sub-mode selector */}
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-purple-100/60 dark:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setStudentAssignType("STUDENTS")}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                            studentAssignType === "STUDENTS"
                              ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs"
                              : "text-purple-600 dark:text-purple-400 hover:text-purple-900"
                          }`}
                        >
                          <Users size={13} />
                          <span>Select Specific Students ({selectedStudentIds.length} Selected)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentAssignType("BATCH_CLASS")}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                            studentAssignType === "BATCH_CLASS"
                              ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs"
                              : "text-purple-600 dark:text-purple-400 hover:text-purple-900"
                          }`}
                        >
                          <Layers size={13} />
                          <span>Batch by Class / Grade</span>
                        </button>
                      </div>

                      {/* Sub-mode 1: Select Specific Students */}
                      {studentAssignType === "STUDENTS" && (
                        <div className="space-y-2.5">
                          {/* Filters Bar: Grade, Class, Unassigned toggle */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                                Filter by Grade
                              </label>
                              <select
                                value={selectedStudentGrade}
                                onChange={(e) => {
                                  setSelectedStudentGrade(e.target.value);
                                  setSelectedStudentClass("");
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">All Grades ({studentGrades.length})</option>
                                {studentGrades.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                                Filter by Class
                              </label>
                              <select
                                value={selectedStudentClass}
                                onChange={(e) => setSelectedStudentClass(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">All Classes ({studentClasses.length})</option>
                                {studentClasses.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                                Status Filter
                              </label>
                              <button
                                type="button"
                                onClick={() => setStudentUnassignedOnly(!studentUnassignedOnly)}
                                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center justify-between transition-colors ${
                                  studentUnassignedOnly
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <span>Unassigned Only</span>
                                <span className={`w-2 h-2 rounded-full ${studentUnassignedOnly ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                              </button>
                            </div>
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search student by name, student code, ID number (FBIS...), or class..."
                              value={personnelSearch}
                              onChange={(e) => setPersonnelSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                          </div>

                          {/* Selection Toolbar */}
                          <div className="flex items-center justify-between px-1 text-xs">
                            <span className="font-semibold text-purple-950 dark:text-purple-200 text-[11px]">
                              Showing {filteredStudentsForModal.length} students &bull;{" "}
                              <span className="text-purple-700 dark:text-purple-300 font-bold">
                                {selectedStudentIds.length} Selected
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const idsToAdd = filteredStudentsForModal.map((s) => s.id);
                                  setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
                                }}
                                className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                              >
                                Select All Filtered ({filteredStudentsForModal.length})
                              </button>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentIds([])}
                                className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                              >
                                Clear Selection
                              </button>
                            </div>
                          </div>

                          {/* Students List */}
                          <div className="max-h-56 overflow-y-auto divide-y divide-purple-100/60 dark:divide-purple-900/40 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 dark:border-purple-800/80 p-1">
                            {filteredStudentsForModal.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                No students match the selected filter or search term.
                              </div>
                            ) : (
                              filteredStudentsForModal.slice(0, 300).map((stu) => {
                                const isSelected = selectedStudentIds.includes(stu.id);
                                return (
                                  <div
                                    key={stu.id}
                                    onClick={() => toggleStudentSelect(stu.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                      isSelected
                                        ? "bg-purple-100/60 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100 font-semibold"
                                        : "hover:bg-purple-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {isSelected ? (
                                        <CheckSquare size={16} className="text-purple-600 shrink-0" />
                                      ) : (
                                        <Square size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                      )}
                                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                        {(stu.englishName || "S").charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-semibold block truncate text-xs">
                                          {stu.englishName || "Student"}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                          <span>{stu.idNumber || stu.studentCode}</span>
                                          <span>•</span>
                                          <span className="text-purple-600 dark:text-purple-400 font-sans font-medium">
                                            {stu.className || "Class -"}
                                          </span>
                                          {stu.grade && (
                                            <>
                                              <span>•</span>
                                              <span className="font-sans">{stu.grade}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      {stu.scheduleAssigned ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                                          {stu.currentShiftName || "Assigned"}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                          No Shift
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hidden sm:inline-block">
                                        {stu.branchName || "Branch 1"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {filteredStudentsForModal.length > 300 && (
                              <div className="py-2 text-center text-xs text-slate-400">
                                Showing first 300 of {filteredStudentsForModal.length} students. Use search or filters to narrow down.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-mode 2: Batch by Class / Grade */}
                      {studentAssignType === "BATCH_CLASS" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Grade Level (កម្រិតថ្នាក់)
                              </label>
                              <select
                                value={selectedStudentGrade}
                                onChange={(e) => {
                                  setSelectedStudentGrade(e.target.value);
                                  setSelectedStudentClass("");
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">All Grades (គ្រប់កម្រិតថ្នាក់)</option>
                                {studentGrades.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Class Section (បន្ទប់រៀន)
                              </label>
                              <select
                                value={selectedStudentClass}
                                onChange={(e) => setSelectedStudentClass(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              >
                                <option value="">All Classes in Grade</option>
                                {studentClasses.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Campus / Branch (Optional)
                            </label>
                            <select
                              value={selectedBranchId}
                              onChange={(e) => setSelectedBranchId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            >
                              <option value="">All Campuses / Branches</option>
                              {branches?.map((b) => (
                                <option key={b.id} value={b.id}>
                                  📍 {b.name} ({b.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
                            <span>
                              Will assign shift schedule to{" "}
                              <strong className="underline">
                                {selectedStudentClass || selectedStudentGrade || "All Active Students"}
                              </strong>
                            </span>
                            <span className="font-bold px-2 py-0.5 rounded-lg bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                              {
                                students.filter((s) => {
                                  if (selectedStudentGrade && s.grade !== selectedStudentGrade) return false;
                                  if (selectedStudentClass && s.className !== selectedStudentClass) return false;
                                  if (selectedBranchId && s.branchId && String(s.branchId) !== String(selectedBranchId)) return false;
                                  return true;
                                }).length
                              }{" "}
                              students
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 4: By Department */}
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
                    </div>
                  )}

                  {/* Mode 5: By Branch */}
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

                  {/* Mode 6: All Staff Notice */}
                  {assignMode === "ALL" && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
                      <Users className="text-indigo-600 shrink-0" size={24} />
                      <div>
                        <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                          Assign to All Active Personnel
                        </span>
                        <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                          Applies shift roster across all active staff and faculty.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Shift Selection */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Assigned Shift Profile *
                    </label>
                    <select
                      required
                      value={formData.shiftId}
                      onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
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
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Mon - Fri (5d)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyWeekdayPreset("MON_SAT")}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Mon - Sat (6d)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyWeekdayPreset("ALL_DAYS")}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
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
                          className={`py-2 rounded-xl font-bold text-center border transition-all cursor-pointer ${
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

                {/* Form Footer */}
                <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={batchCreateMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
