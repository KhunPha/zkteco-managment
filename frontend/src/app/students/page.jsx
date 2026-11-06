"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  X,
  UserCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Check,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import api from "@/lib/api";
import ImageUploadDropzone from "@/components/common/ImageUploadDropzone";
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

const TARGET_GRADES = [
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
  "Graduated",
];

const getNextGradeValue = (grade) => {
  if (!grade) return "Grade 1";
  const g = grade.trim();
  if (g.toLowerCase().includes("kindergarten")) return "Grade 1";
  const idx = ALL_GRADES.indexOf(g);
  if (idx >= 0 && idx < ALL_GRADES.length - 1) {
    return ALL_GRADES[idx + 1];
  }
  if (g === "Grade 12") return "Graduated";
  return "Grade 1";
};

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [className, setClassName] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [showModal, setShowModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Promotion Form State
  const [promoteMode, setPromoteMode] = useState("BY_GRADE"); // BY_GRADE, FULL_ROLLOVER, SELECTED
  const [promoteTargetYear, setPromoteTargetYear] = useState("2027-2028");
  const [promoteSourceGrade, setPromoteSourceGrade] = useState("Grade 10");
  const [promoteTargetGrade, setPromoteTargetGrade] = useState("Grade 11");
  const [promoteTargetClass, setPromoteTargetClass] = useState("");
  const [promoteAutoClass, setPromoteAutoClass] = useState(true);
  const [promoteFeedback, setPromoteFeedback] = useState(null);

  // Grade Selection Roster State inside Promotion Modal
  const [gradeSelectedStudentIds, setGradeSelectedStudentIds] = useState([]);
  const [gradeSearchFilter, setGradeSearchFilter] = useState("");

  const [formData, setFormData] = useState({
    studentCode: "",
    englishName: "",
    khmerName: "",
    gender: "MALE",
    className: "Class 10A",
    grade: "Grade 10",
    academicYear: "2026-2027",
    parentContact: "",
    status: "ACTIVE",
    cardNumber: "",
    profileImageUrl: "",
  });

  const [loadingNextCode, setLoadingNextCode] = useState(false);

  const fetchNextStudentCode = async () => {
    setLoadingNextCode(true);
    try {
      const res = await api.get("/api/v1/students/next-code");
      if (res.data?.data?.nextCode) {
        setFormData((prev) => ({ ...prev, studentCode: res.data.data.nextCode }));
      }
    } catch (e) {
      console.warn("Failed to fetch next student code", e);
    } finally {
      setLoadingNextCode(false);
    }
  };

  const openCreateModal = async () => {
    setEditingStudentId(null);
    setFormData({
      studentCode: "",
      englishName: "",
      khmerName: "",
      gender: "MALE",
      className: "Class 10A",
      grade: "Grade 10",
      academicYear: "2026-2027",
      parentContact: "",
      status: "ACTIVE",
      cardNumber: "",
      profileImageUrl: "",
    });
    setShowModal(true);
    await fetchNextStudentCode();
  };

  const openEditModal = (student) => {
    setEditingStudentId(student.id);
    setFormData({
      studentCode: student.studentCode || "",
      englishName: student.englishName || "",
      khmerName: student.khmerName || "",
      gender: student.gender || "MALE",
      className: student.className || "Class 10A",
      grade: student.grade || "Grade 10",
      academicYear: student.academicYear || "2026-2027",
      parentContact: student.parentContact || "",
      status: student.status || "ACTIVE",
      cardNumber: student.cardNumber || "",
      profileImageUrl: student.profileImageUrl || "",
    });
    setShowModal(true);
  };

  const { data: allStudentsCountData } = useQuery({
    queryKey: ["all-students-count"],
    queryFn: async () => {
      const res = await api.get("/api/v1/students?size=1");
      return res.data?.data?.totalElements || 0;
    },
  });

  const { data: activeStudentsCountData } = useQuery({
    queryKey: ["active-students-count"],
    queryFn: async () => {
      const res = await api.get("/api/v1/students?status=ACTIVE&size=1");
      return res.data?.data?.totalElements || 0;
    },
  });

  const { data: studentsData, isLoading, refetch } = useQuery({
    queryKey: ["students", search, className, gradeFilter, statusFilter, page, pageSize],
    queryFn: async () => {
      let url = `/api/v1/students?page=${page}&size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (className) url += `&className=${encodeURIComponent(className)}`;
      if (gradeFilter) url += `&grade=${encodeURIComponent(gradeFilter)}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  const totalStudents = allStudentsCountData || studentsData?.totalElements || (studentsData?.content?.length || 0);
  const activeStudents = activeStudentsCountData || (studentsData?.content?.filter((s) => s.status === "ACTIVE").length || 0);

  // Query roster of students in the selected promotion grade
  const { data: gradeRosterData, isLoading: isLoadingGradeRoster } = useQuery({
    queryKey: ["grade-roster", promoteSourceGrade],
    queryFn: async () => {
      const res = await api.get(`/api/v1/students?grade=${encodeURIComponent(promoteSourceGrade)}&status=ACTIVE&size=500`);
      return res.data?.data?.content || [];
    },
    enabled: showPromoteModal && promoteMode === "BY_GRADE" && !!promoteSourceGrade,
  });

  // Automatically check all passing students when source grade roster loads
  useEffect(() => {
    if (gradeRosterData && Array.isArray(gradeRosterData)) {
      setGradeSelectedStudentIds(gradeRosterData.map((s) => s.id));
    }
  }, [gradeRosterData]);

  const handleSourceGradeChange = (newGrade) => {
    setPromoteSourceGrade(newGrade);
    setPromoteTargetGrade(getNextGradeValue(newGrade));
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const res = await api.put(`/api/v1/students/${id}/status?status=${newStatus}`);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingStudentId) {
        const res = await api.put(`/api/v1/students/${editingStudentId}`, payload);
        return res.data?.data;
      } else {
        const res = await api.post("/api/v1/students", payload);
        return res.data?.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
      setShowModal(false);
      setEditingStudentId(null);
      setFormData({
        studentCode: "",
        englishName: "",
        khmerName: "",
        gender: "MALE",
        className: "Class 10A",
        grade: "Grade 10",
        academicYear: "2026-2027",
        parentContact: "",
        status: "ACTIVE",
        cardNumber: "",
        profileImageUrl: "",
      });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/v1/students/promote", payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      setPromoteFeedback({ type: "success", text: data.message, breakdown: data.gradeBreakdown });
      queryClient.invalidateQueries(["students"]);
      queryClient.invalidateQueries(["device-users"]);
      queryClient.invalidateQueries(["batch-roster-users"]);
      setSelectedStudentIds([]);
    },
    onError: (err) => {
      setPromoteFeedback({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    },
  });

  const deleteStudent = async (id) => {
    if (!confirm("Are you sure you want to withdraw this student?")) return;
    try {
      await api.delete(`/api/v1/students/${id}`);
      queryClient.invalidateQueries(["students"]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const students = studentsData?.content || [];

  const isAllSelected = students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((x) => x !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const openPromoteModalForSelected = () => {
    setPromoteMode("SELECTED");
    setPromoteFeedback(null);
    setShowPromoteModal(true);
  };

  const openPromoteModalGeneral = () => {
    setPromoteMode("FULL_ROLLOVER");
    setPromoteFeedback(null);
    setShowPromoteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-cyan-950 via-indigo-950 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/30 text-cyan-200 border border-cyan-400/30">
              Student Attendance & Academic Roster
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Students Management</h1>
          <p className="text-xs text-cyan-200/80">
            Manage student enrollment profiles, classroom rosters, grade promotions, and biometric identification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {selectedStudentIds.length > 0 && (
            <button
              onClick={openPromoteModalForSelected}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer animate-in fade-in"
            >
              <TrendingUp size={15} />
              <span>Promote Selected ({selectedStudentIds.length})</span>
            </button>
          )}

          <button
            onClick={openPromoteModalGeneral}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-700/80 font-semibold text-xs shadow-md transition-all cursor-pointer"
            title="Auto-promote grades for the new academic year"
          >
            <TrendingUp size={15} className="text-amber-400" />
            <span>Annual Grade Promotion</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL STUDENTS</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {Number(totalStudents).toLocaleString()}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ACTIVE ROSTER</p>
            <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-0.5">
              {Number(activeStudents).toLocaleString()}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ACADEMIC PROGRAM</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              Kindergarten — Grade 12
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers size={20} />
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
              placeholder="Search code or student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
          >
            <option value="">All Grades</option>
            {ALL_GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
          >
            <option value="">All Classes</option>
            <option value="Class 12A">Class 12A</option>
            <option value="Class 12B">Class 12B</option>
            <option value="Class 11A">Class 11A</option>
            <option value="Class 10A">Class 10A</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Students</option>
            <option value="INACTIVE">Inactive Students</option>
            <option value="GRADUATED">Graduated</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            Students Roster ({studentsData?.totalElements || students.length})
          </span>
          <span className="text-slate-400 font-medium">Enrolled Students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Class & Grade</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Parent Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No students found</p>
                    <p className="text-[11px]">Click "Register Student" or import from School MIS.</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      selectedStudentIds.includes(s.id)
                        ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleSelectStudent(s.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          {s.profileImageUrl ? (
                            <img src={s.profileImageUrl} alt={s.englishName} className="w-full h-full object-cover" />
                          ) : (
                            s.englishName ? s.englishName[0].toUpperCase() : "S"
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{s.englishName}</span>
                          {s.khmerName && <span className="text-[11px] text-slate-400 block">{s.khmerName}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {s.studentCode}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">{s.className || "-"}</span>
                      <span className="text-[10px] text-slate-400">{s.grade || "Secondary"}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {s.academicYear || "2026-2027"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {s.parentContact || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                          updateStatusMutation.mutate({ id: s.id, newStatus: nextStatus });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                            : s.status === "GRADUATED"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                            : s.status === "SUSPENDED"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                        title={`Status: ${s.status} • Click to toggle Active/Inactive`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`} />
                        <span>{s.status}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student & Photo"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => deleteStudent(s.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Withdraw Student"
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
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{students.length > 0 ? page * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min((page + 1) * pageSize, studentsData?.totalElements || 0)}
            </span>{" "}
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{studentsData?.totalElements || 0}</span> enrolled students
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
              Page {page + 1} of {Math.max(1, studentsData?.totalPages || 1)}
            </span>
            <button
              onClick={() => setPage((p) => (p + 1 < (studentsData?.totalPages || 1) ? p + 1 : p))}
              disabled={page + 1 >= (studentsData?.totalPages || 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Register Student */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingStudentId ? "Edit Student Profile" : "Register Student Profile"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingStudentId
                      ? "Update student details, photo, and terminal credentials"
                      : "Add new student for classroom attendance & terminal access"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                  label="Student Photo (ID Card & Kiosk)"
                  helperText="Drag & drop student portrait (Shows on Live Gate Monitor and ID Badges)"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Student Code / Terminal PIN *
                      </label>
                      <button
                        type="button"
                        onClick={fetchNextStudentCode}
                        disabled={loadingNextCode}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        title="Generate fresh unique PIN"
                      >
                        <RefreshCw size={11} className={loadingNextCode ? "animate-spin" : ""} />
                        Auto-Generated
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 40002"
                      value={formData.studentCode}
                      onChange={(e) => setFormData({ ...formData, studentCode: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                      ✓ System auto-generates non-colliding numeric PIN across all personnel and machines.
                    </p>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">English Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chan Vutha"
                      value={formData.englishName}
                      onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Khmer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ចាន់ វុទ្ធា"
                      value={formData.khmerName}
                      onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Grade Level *</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                    >
                      {ALL_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Class / Section *</label>
                    <input
                      type="text"
                      required
                      placeholder="Class 12A"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Academic Year *</label>
                    <select
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                    >
                      <option value="2026-2027">2026-2027 (Current)</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2024-2025">2024-2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Parent Phone</label>
                    <input
                      type="text"
                      placeholder="+855 12 888 777"
                      value={formData.parentContact}
                      onChange={(e) => setFormData({ ...formData, parentContact: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60">
                  <label className="font-bold text-indigo-950 dark:text-indigo-200 block mb-1">
                    RFID Card Number (Auto-Sync to Terminals)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0005328754"
                    value={formData.cardNumber || ""}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                    ⚡ Saving this profile automatically uploads the Student PIN, Name, and RFID Card directly to all active ZKTeco machines.
                  </p>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending
                    ? (editingStudentId ? "Updating..." : "Saving...")
                    : (editingStudentId ? "Update Student" : "Save Student")}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Modal: Annual Grade Promotion & Rollover */}
      {showPromoteModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Annual Grade Promotion & Rollover
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      New School Year
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Advance students to their next grade level and transition Grade 12 to Graduated
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
              <button
                type="button"
                onClick={() => {
                  setPromoteMode("FULL_ROLLOVER");
                  setPromoteFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  promoteMode === "FULL_ROLLOVER"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <Sparkles size={14} />
                <span>1-Click Full School Rollover</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPromoteMode("BY_GRADE");
                  setPromoteFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  promoteMode === "BY_GRADE"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <Layers size={14} />
                <span>Promote Specific Grade</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPromoteMode("SELECTED");
                  setPromoteFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  promoteMode === "SELECTED"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                <UserCheck size={14} />
                <span>Selected Students ({selectedStudentIds.length})</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Promotion Flow Visualizer */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50/80 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp size={13} />
                  <span>Standard Grade Progression Path (Kindergarten to Grade 12)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
                  {ALL_GRADES.map((g) => (
                    <span key={g} className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs text-[10px]">
                        {g}
                      </span>
                      <ArrowRight size={11} className="text-slate-400" />
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-2xs text-[10px]">
                    Graduated 🎓
                  </span>
                </div>
              </div>

              {/* Feedback Alert if Available */}
              {promoteFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-200 ${
                    promoteFeedback.type === "success"
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {promoteFeedback.type === "success" ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{promoteFeedback.text}</span>
                  </div>

                  {promoteFeedback.breakdown && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                      <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        Breakdown by Grade:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(promoteFeedback.breakdown).map(([gradeKey, count]) => (
                          <span
                            key={gradeKey}
                            className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-[11px]"
                          >
                            {gradeKey}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Academic Year *
                  </label>
                  <select
                    value={promoteTargetYear}
                    onChange={(e) => setPromoteTargetYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="2027-2028">2027-2028 (Next Year)</option>
                    <option value="2028-2029">2028-2029</option>
                    <option value="2029-2030">2029-2030</option>
                    <option value="2026-2027">2026-2027</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    All promoted records will receive this new academic school year.
                  </p>
                </div>

                {promoteMode === "BY_GRADE" && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Source Grade to Promote *
                    </label>
                    <select
                      value={promoteSourceGrade}
                      onChange={(e) => handleSourceGradeChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                    >
                      {ALL_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(promoteMode === "BY_GRADE" || promoteMode === "SELECTED") && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Promote To Target Grade
                    </label>
                    <select
                      value={promoteTargetGrade}
                      onChange={(e) => setPromoteTargetGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                    >
                      {TARGET_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Auto Increment Classroom Checkbox */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoIncrementClass"
                  checked={promoteAutoClass}
                  onChange={(e) => setPromoteAutoClass(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="autoIncrementClass" className="cursor-pointer">
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Auto-advance classroom section names
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Automatically updates section numbering (e.g. <span className="font-mono text-indigo-600 dark:text-indigo-400">Class 1A</span> becomes <span className="font-mono text-indigo-600 dark:text-indigo-400">Class 2A</span>, and <span className="font-mono text-indigo-600 dark:text-indigo-400">Class 10B</span> becomes <span className="font-mono text-indigo-600 dark:text-indigo-400">Class 11B</span>).
                  </span>
                </label>
              </div>

              {/* Interactive Student Selection Roster for BY_GRADE */}
              {promoteMode === "BY_GRADE" && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                        <span>Select Students to Promote</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {promoteSourceGrade}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Uncheck any students who failed or must repeat {promoteSourceGrade}. Only checked students will advance!
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (gradeRosterData) setGradeSelectedStudentIds(gradeRosterData.map((s) => s.id));
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Select All ({gradeRosterData?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeSelectedStudentIds([])}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Summary badge counter */}
                  <div className="flex items-center justify-between gap-3 text-[11px] px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {gradeSelectedStudentIds.length} Passing (Promote to {promoteTargetGrade})
                      </span>
                      <span>•</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        ✕ {(gradeRosterData?.length || 0) - gradeSelectedStudentIds.length} Retained (Keep in {promoteSourceGrade})
                      </span>
                    </div>

                    <div className="relative max-w-xs">
                      <input
                        type="text"
                        placeholder="Filter by name/PIN..."
                        value={gradeSearchFilter}
                        onChange={(e) => setGradeSearchFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Scrollable Student List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                    {isLoadingGradeRoster ? (
                      <div className="p-4 text-center text-slate-400 text-xs">Loading students for {promoteSourceGrade}...</div>
                    ) : !gradeRosterData || gradeRosterData.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">No active students enrolled in {promoteSourceGrade}</div>
                    ) : (
                      gradeRosterData
                        .filter((s) => {
                          if (!gradeSearchFilter.trim()) return true;
                          const q = gradeSearchFilter.toLowerCase();
                          return (
                            s.englishName?.toLowerCase().includes(q) ||
                            s.studentCode?.toLowerCase().includes(q) ||
                            s.className?.toLowerCase().includes(q)
                          );
                        })
                        .map((s) => {
                          const isChecked = gradeSelectedStudentIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (isChecked) {
                                  setGradeSelectedStudentIds(gradeSelectedStudentIds.filter((id) => id !== s.id));
                                } else {
                                  setGradeSelectedStudentIds([...gradeSelectedStudentIds, s.id]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70"
                                  : "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 opacity-75"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by parent div
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                                />
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {s.englishName ? s.englishName[0].toUpperCase() : "S"}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                    {s.englishName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    PIN: {s.studentCode} • {s.className || "Class Section"}
                                  </span>
                                </div>
                              </div>

                              <div>
                                {isChecked ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    ✓ Promote to {promoteTargetGrade}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                    ✕ Retain in {promoteSourceGrade}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {promoteMode === "SELECTED" && selectedStudentIds.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>No students currently selected. Please check students on the table first.</span>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {promoteMode === "FULL_ROLLOVER" && "Operates across all active students (Kindergarten through Grade 12)."}
                {promoteMode === "BY_GRADE" && `${gradeSelectedStudentIds.length} passing student(s) selected to advance.`}
                {promoteMode === "SELECTED" && `${selectedStudentIds.length} student(s) selected.`}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={
                    promoteMutation.isPending ||
                    (promoteMode === "BY_GRADE" && gradeSelectedStudentIds.length === 0) ||
                    (promoteMode === "SELECTED" && selectedStudentIds.length === 0)
                  }
                  onClick={() => {
                    if (promoteMode === "BY_GRADE") {
                      // Promote only the checked passing students!
                      promoteMutation.mutate({
                        mode: "SELECTED",
                        targetAcademicYear: promoteTargetYear,
                        sourceGrade: promoteSourceGrade,
                        targetGrade: promoteTargetGrade,
                        targetClassName: promoteTargetClass || null,
                        autoIncrementClassNumber: promoteAutoClass,
                        studentIds: gradeSelectedStudentIds,
                        newStatus: "ACTIVE",
                      });
                    } else {
                      promoteMutation.mutate({
                        mode: promoteMode,
                        targetAcademicYear: promoteTargetYear,
                        sourceGrade: null,
                        targetGrade: promoteMode !== "FULL_ROLLOVER" ? promoteTargetGrade : null,
                        targetClassName: promoteTargetClass || null,
                        autoIncrementClassNumber: promoteAutoClass,
                        studentIds: promoteMode === "SELECTED" ? selectedStudentIds : null,
                        newStatus: "ACTIVE",
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <TrendingUp size={14} />
                  <span>
                    {promoteMutation.isPending
                      ? "Executing Promotion..."
                      : promoteMode === "BY_GRADE"
                      ? `Confirm & Promote ${gradeSelectedStudentIds.length} Students`
                      : promoteMode === "SELECTED"
                      ? `Confirm & Promote ${selectedStudentIds.length} Students`
                      : "Confirm & Execute 1-Click Rollover"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

