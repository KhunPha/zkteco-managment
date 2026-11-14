"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  School,
  Plus,
  Calendar,
  Layers,
  Users,
  BookOpen,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  ChevronRight,
  Search,
  Filter,
  DoorOpen,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  UserCheck,
  Sparkles,
  GitFork,
  Check,
  GraduationCap,
} from "lucide-react";
import api from "@/lib/api";

export default function AcademicClassesPage() {
  const queryClient = useQueryClient();

  // Active state
  const [selectedYear, setSelectedYear] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");

  // Modal States
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({
    code: "",
    name: "",
    khmerName: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    name: "",
    khmerName: "",
    sequenceOrder: 1,
    description: "",
  });

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({
    name: "",
    khmerName: "",
    gradeName: "",
    roomNumber: "",
    homeroomTeacherName: "",
    telegramChatId: "",
    maxStudents: 40,
    branchId: "",
  });

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyForm, setCopyForm] = useState({
    sourceAcademicYear: "",
    targetAcademicYear: "",
    copyTelegramChatIds: true,
  });

  const [studentsModalClass, setStudentsModalClass] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(""), 5000);
  };

  // =========================================================================
  // QUERIES
  // =========================================================================

  // 1. Academic Years
  const { data: yearsData, isLoading: yearsLoading, refetch: refetchYears } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const res = await api.get("/api/v1/academic/years");
      const d = res.data?.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
    },
  });
  const years = Array.isArray(yearsData) ? yearsData : [];

  // Set default selected year when years load
  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      const current = years.find((y) => y.isCurrent) || years[0];
      setSelectedYear(current.code);
    }
  }, [years, selectedYear]);

  // 2. Academic Grades for selected year
  const { data: gradesData, isLoading: gradesLoading, refetch: refetchGrades } = useQuery({
    queryKey: ["academic-grades", selectedYear],
    queryFn: async () => {
      if (!selectedYear) return [];
      const res = await api.get(`/api/v1/academic/grades?academicYear=${encodeURIComponent(selectedYear)}`);
      const d = res.data?.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
    },
    enabled: !!selectedYear,
  });
  const grades = Array.isArray(gradesData) ? gradesData : [];

  // 3. Academic Classes for selected year
  const { data: classesData, isLoading: classesLoading, refetch: refetchClasses } = useQuery({
    queryKey: ["academic-classes", selectedYear],
    queryFn: async () => {
      if (!selectedYear) return [];
      const res = await api.get(`/api/v1/academic/classes?academicYear=${encodeURIComponent(selectedYear)}`);
      const d = res.data?.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
    },
    enabled: !!selectedYear,
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // 4. Branches
  const { data: branchesData } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/branches");
      const d = res.data?.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
    },
  });
  const branches = Array.isArray(branchesData) ? branchesData : [];

  // 5. Teachers (for Homeroom Teacher suggestions)
  const { data: teachersData } = useQuery({
    queryKey: ["teachers-academic-select"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/teachers?size=1000");
        const d = res.data?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.content)) return d.content;
        return [];
      } catch {
        return [];
      }
    },
  });
  const teachers = Array.isArray(teachersData)
    ? teachersData
    : (Array.isArray(teachersData?.content) ? teachersData.content : []);

  // 6. Enrolled Students in selected class modal
  const { data: enrolledStudentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", studentsModalClass?.id],
    queryFn: async () => {
      if (!studentsModalClass?.id) return [];
      const res = await api.get(`/api/v1/academic/classes/${studentsModalClass.id}/students`);
      const d = res.data?.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
    },
    enabled: !!studentsModalClass?.id,
  });
  const enrolledStudents = Array.isArray(enrolledStudentsData) ? enrolledStudentsData : [];

  // =========================================================================
  // MUTATIONS
  // =========================================================================

  // Year Mutations
  const createYearMutation = useMutation({
    mutationFn: (data) => api.post("/api/v1/academic/years", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      setSelectedYear(res.data?.data?.code || yearForm.code);
      setYearModalOpen(false);
      showSuccess("Academic year created successfully");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to create academic year"),
  });

  const updateYearMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/api/v1/academic/years/${id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      if (res.data?.data?.code) setSelectedYear(res.data.data.code);
      setYearModalOpen(false);
      showSuccess("Academic year updated successfully");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to update academic year"),
  });

  const setCurrentYearMutation = useMutation({
    mutationFn: (id) => api.put(`/api/v1/academic/years/${id}/current`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      showSuccess("Active academic year updated");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to set active year"),
  });

  const deleteYearMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/academic/years/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      setSelectedYear("");
      showSuccess("Academic year deleted");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to delete academic year"),
  });

  // Grade Mutations
  const saveGradeMutation = useMutation({
    mutationFn: (data) =>
      editingGrade
        ? api.put(`/api/v1/academic/grades/${editingGrade.id}`, data)
        : api.post("/api/v1/academic/grades", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-grades", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      setGradeModalOpen(false);
      showSuccess(editingGrade ? "Grade level updated" : "Grade level created");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to save grade level"),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/academic/grades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-grades", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      showSuccess("Grade level deleted");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to delete grade level"),
  });

  // Class Mutations
  const saveClassMutation = useMutation({
    mutationFn: (data) =>
      editingClass
        ? api.put(`/api/v1/academic/classes/${editingClass.id}`, data)
        : api.post("/api/v1/academic/classes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-classes", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-grades", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      setClassModalOpen(false);
      showSuccess(editingClass ? "Classroom updated" : "Classroom created");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to save classroom"),
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/academic/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-classes", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-grades", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      showSuccess("Classroom deleted");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to delete classroom"),
  });

  // Copy Structure Mutation
  const copyStructureMutation = useMutation({
    mutationFn: (data) => api.post("/api/v1/academic/copy-structure", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      queryClient.invalidateQueries({ queryKey: ["academic-grades"] });
      queryClient.invalidateQueries({ queryKey: ["academic-classes"] });
      setSelectedYear(copyForm.targetAcademicYear);
      setCopyModalOpen(false);
      showSuccess(res.data?.data?.message || "Academic structure cloned successfully");
    },
    onError: (err) => showError(err.response?.data?.message || "Failed to copy academic structure"),
  });

  // =========================================================================
  // MODAL HANDLERS
  // =========================================================================

  const handleOpenYearModal = (year = null) => {
    if (year) {
      setEditingYear(year);
      setYearForm({
        code: year.code || "",
        name: year.name || "",
        khmerName: year.khmerName || "",
        startDate: year.startDate || "",
        endDate: year.endDate || "",
        isCurrent: Boolean(year.isCurrent),
      });
    } else {
      setEditingYear(null);
      // Auto-suggest next year
      const lastCode = years[0]?.code || "2026-2027";
      const parts = lastCode.split("-");
      const nextCode = parts.length === 2 && !isNaN(parts[1])
        ? `${parseInt(parts[1])}-${parseInt(parts[1]) + 1}`
        : "2027-2028";

      setYearForm({
        code: nextCode,
        name: `Academic Year ${nextCode}`,
        khmerName: `ឆ្នាំសិក្សា ${nextCode}`,
        startDate: "",
        endDate: "",
        isCurrent: false,
      });
    }
    setYearModalOpen(true);
  };

  const handleOpenGradeModal = (grade = null) => {
    if (grade) {
      setEditingGrade(grade);
      setGradeForm({
        name: grade.name || "",
        khmerName: grade.khmerName || "",
        sequenceOrder: grade.sequenceOrder || 1,
        description: grade.description || "",
      });
    } else {
      setEditingGrade(null);
      const nextSeq = grades.length > 0 ? Math.max(...grades.map((g) => g.sequenceOrder || 0)) + 1 : 1;
      setGradeForm({
        name: "",
        khmerName: "",
        sequenceOrder: nextSeq,
        description: "",
      });
    }
    setGradeModalOpen(true);
  };

  const handleOpenClassModal = (cls = null, presetGradeName = "") => {
    if (cls) {
      setEditingClass(cls);
      setClassForm({
        name: cls.name || "",
        khmerName: cls.khmerName || "",
        gradeName: cls.gradeName || "",
        roomNumber: cls.roomNumber || "",
        homeroomTeacherName: cls.homeroomTeacherName || "",
        telegramChatId: cls.telegramChatId || "",
        maxStudents: cls.maxStudents || 40,
        branchId: cls.branchId || (branches[0]?.id || ""),
      });
    } else {
      setEditingClass(null);
      const defaultGrade = presetGradeName || (grades[0]?.name || "");
      setClassForm({
        name: "",
        khmerName: "",
        gradeName: defaultGrade,
        roomNumber: "",
        homeroomTeacherName: "",
        telegramChatId: "",
        maxStudents: 40,
        branchId: branches[0]?.id || "",
      });
    }
    setClassModalOpen(true);
  };

  const handleOpenCopyModal = () => {
    setCopyForm({
      sourceAcademicYear: selectedYear || "2026-2027",
      targetAcademicYear: "",
      copyTelegramChatIds: true,
    });
    setCopyModalOpen(true);
  };

  // =========================================================================
  // FILTERED DATA
  // =========================================================================

  const currentYearObj = useMemo(() => {
    return years.find((y) => y.code === selectedYear) || null;
  }, [years, selectedYear]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.khmerName && c.khmerName.toLowerCase().includes(search.toLowerCase())) ||
        (c.gradeName && c.gradeName.toLowerCase().includes(search.toLowerCase())) ||
        (c.homeroomTeacherName && c.homeroomTeacherName.toLowerCase().includes(search.toLowerCase())) ||
        (c.roomNumber && c.roomNumber.toLowerCase().includes(search.toLowerCase()));

      const matchesGrade = gradeFilter === "ALL" || c.gradeName === gradeFilter;

      return matchesSearch && matchesGrade;
    });
  }, [classes, search, gradeFilter]);

  // Group classes by grade for the Tree / Grid View
  const groupedClassesByGrade = useMemo(() => {
    const map = new Map();
    // Pre-populate with all defined grades for the year
    grades.forEach((g) => {
      map.set(g.name, { grade: g, classes: [] });
    });

    // Populate classes
    classes.forEach((c) => {
      if (!map.has(c.gradeName)) {
        map.set(c.gradeName, {
          grade: { name: c.gradeName, khmerName: c.gradeName, sequenceOrder: 99 },
          classes: [],
        });
      }
      map.get(c.gradeName).classes.push(c);
    });

    return Array.from(map.values()).sort(
      (a, b) => (a.grade.sequenceOrder || 99) - (b.grade.sequenceOrder || 99)
    );
  }, [grades, classes]);

  const totalStudentsInYear = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  }, [classes]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Academic Year Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <School className="text-indigo-600 dark:text-indigo-400" size={26} />
              <span>Academic Classes & Grades (ថ្នាក់ និងកម្រិតសិក្សា)</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure different grade levels and classroom sections per academic year (ថ្នាក់រៀនខុសៗគ្នាតាមឆ្នាំសិក្សានីមួយៗ)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Switcher */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Calendar size={15} className="text-indigo-500 shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer pr-1"
            >
              {years.map((y) => (
                <option key={y.id} value={y.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                  {y.code} {y.isCurrent ? "★ Active Year" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Copy Structure Button */}
          <button
            type="button"
            onClick={handleOpenCopyModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
            title="Clone grades and classes to another academic year"
          >
            <Copy size={14} className="text-indigo-500" />
            <span>Copy Structure</span>
          </button>

          {/* Add Year Button */}
          <button
            type="button"
            onClick={() => handleOpenYearModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
          >
            <Calendar size={14} className="text-indigo-500" />
            <span>+ Year</span>
          </button>

          {/* Add Grade Button */}
          <button
            type="button"
            onClick={() => handleOpenGradeModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-all shadow-2xs active:scale-95"
          >
            <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>+ Add Grade</span>
          </button>

          {/* Add Class Button */}
          <button
            type="button"
            onClick={() => handleOpenClassModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={15} />
            <span>+ Create Class</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Academic Year Summary Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/60 dark:border-indigo-800/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/30 shrink-0">
              <School size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                  {currentYearObj?.code || selectedYear || "2026-2027"}
                </span>
                {currentYearObj?.isCurrent ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <Check size={11} /> Active Institutional Year
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => currentYearObj && setCurrentYearMutation.mutate(currentYearObj.id)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Set as Active Year
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {currentYearObj?.khmerName || currentYearObj?.name || `Academic Year ${selectedYear}`}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs min-w-[80px]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Grades</span>
              <span className="font-mono font-black text-base text-slate-800 dark:text-white">{grades.length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs min-w-[80px]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Classes</span>
              <span className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">{classes.length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs min-w-[80px]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Students</span>
              <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">{totalStudentsInYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & View Mode Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="h-9 min-w-[200px] flex-1 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search classes, rooms, teachers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none w-full p-0 font-medium"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grade Filter */}
          <div className="h-9 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer p-0"
            >
              <option value="ALL">All Grade Levels</option>
              {grades.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            By Grade (ថ្នាក់តាមកម្រិត)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "table"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Classes (តារាងសរុប)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: GRID VIEW (GROUPED BY GRADE LEVEL) */}
      {/* ========================================================================= */}
      {viewMode === "grid" && (
        <div className="space-y-6">
          {groupedClassesByGrade.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <School size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No grades or classes found for {selectedYear}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click "+ Add Grade" to create grade levels or "Copy Structure" to clone from another year.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenGradeModal()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  + Add First Grade
                </button>
                <button
                  type="button"
                  onClick={handleOpenCopyModal}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  Copy from Previous Year
                </button>
              </div>
            </div>
          ) : (
            groupedClassesByGrade
              .filter(({ grade }) => gradeFilter === "ALL" || grade.name === gradeFilter)
              .map(({ grade, classes: gradeClasses }) => {
                const totalInGrade = gradeClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);

                return (
                  <div
                    key={grade.name}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4"
                  >
                    {/* Grade Level Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs font-mono">
                          {grade.sequenceOrder || "G"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                              {grade.name}
                            </h2>
                            {grade.khmerName && grade.khmerName !== grade.name && (
                              <span className="text-xs text-slate-400 font-medium">({grade.khmerName})</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {gradeClasses.length} {gradeClasses.length === 1 ? "Class" : "Classes"} • {totalInGrade} Students
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {grade.id && (
                          <button
                            type="button"
                            onClick={() => handleOpenGradeModal(grade)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Edit Grade Level"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenClassModal(null, grade.name)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all"
                        >
                          <Plus size={13} />
                          <span>Add Class</span>
                        </button>
                      </div>
                    </div>

                    {/* Classes Grid */}
                    {gradeClasses.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No classes assigned to {grade.name} yet.
                        <button
                          type="button"
                          onClick={() => handleOpenClassModal(null, grade.name)}
                          className="text-indigo-600 dark:text-indigo-400 font-bold ml-1.5 hover:underline"
                        >
                          + Create {grade.name} Class
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {gradeClasses.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-400/50 transition-all hover:shadow-xs group space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                  <span>{cls.name}</span>
                                  {cls.khmerName && cls.khmerName !== cls.name && (
                                    <span className="text-[11px] font-normal text-slate-400">({cls.khmerName})</span>
                                  )}
                                </h3>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
                                  <DoorOpen size={11} className="text-slate-400" />
                                  <span>{cls.roomNumber || "Room Unassigned"}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenClassModal(cls)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  title="Edit Class"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${cls.name}?`)) {
                                      deleteClassMutation.mutate(cls.id);
                                    }
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Delete Class"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Details Strip */}
                            <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              {/* Homeroom Advisor */}
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <BookOpen size={11} /> Teacher
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                  {cls.homeroomTeacherName || "Not assigned"}
                                </span>
                              </div>

                              {/* Capacity Bar */}
                              <div className="pt-1">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="text-slate-400 font-medium flex items-center gap-1">
                                    <Users size={11} /> Enrollment
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                                    {cls.studentCount || 0} / {cls.maxStudents || 40}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      (cls.studentCount || 0) >= (cls.maxStudents || 40)
                                        ? "bg-rose-500"
                                        : "bg-indigo-600 dark:bg-indigo-400"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (((cls.studentCount || 0) / (cls.maxStudents || 40)) * 100))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* View Enrolled Students Link */}
                            <button
                              type="button"
                              onClick={() => setStudentsModalClass(cls)}
                              className="w-full py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1 transition-all"
                            >
                              <UserCheck size={12} />
                              <span>View Students ({cls.studentCount || 0})</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TABLE VIEW (FLAT LIST OF ALL CLASSES) */}
      {/* ========================================================================= */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Class / Section</th>
                  <th className="py-3 px-3">Grade Level</th>
                  <th className="py-3 px-3">Room / Facility</th>
                  <th className="py-3 px-3">Homeroom Teacher</th>
                  <th className="py-3 px-3 text-center">Enrollment</th>
                  <th className="py-3 px-3 text-center">Capacity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No classes found matching your criteria in Academic Year {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{cls.name}</span>
                          {cls.khmerName && cls.khmerName !== cls.name && (
                            <span className="text-[11px] text-slate-400 font-normal">({cls.khmerName})</span>
                          )}
                        </div>
                        {cls.branchName && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5 mt-0.5">
                            <GitFork size={10} /> {cls.branchName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          {cls.gradeName}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {cls.roomNumber || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {cls.homeroomTeacherName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStudentsModalClass(cls)}
                          className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
                        >
                          {cls.studentCount || 0} students
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                        {cls.maxStudents || 40} max
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenClassModal(cls)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${cls.name}?`)) {
                                deleteClassMutation.mutate(cls.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT ACADEMIC YEAR */}
      {/* ========================================================================= */}
      {yearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Calendar className="text-indigo-600" size={18} />
                <span>{editingYear ? "Edit Academic Year" : "Create New Academic Year"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingYear) {
                  updateYearMutation.mutate({ id: editingYear.id, data: yearForm });
                } else {
                  createYearMutation.mutate(yearForm);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Year Code (កូដឆ្នាំសិក្សា) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="2027-2028"
                  value={yearForm.code}
                  onChange={(e) => setYearForm({ ...yearForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  placeholder="Academic Year 2027-2028"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Name (Khmer / ភាសាខ្មែរ)
                </label>
                <input
                  type="text"
                  placeholder="ឆ្នាំសិក្សា ២០២៧-២០២៨"
                  value={yearForm.khmerName}
                  onChange={(e) => setYearForm({ ...yearForm, khmerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={yearForm.isCurrent}
                  onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Set as Active / Current Academic Year
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setYearModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createYearMutation.isPending || updateYearMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  {editingYear ? "Update Year" : "Create Year"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT GRADE LEVEL */}
      {/* ========================================================================= */}
      {gradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Layers className="text-indigo-600" size={18} />
                <span>{editingGrade ? "Edit Grade Level" : `Add Grade to ${selectedYear}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveGradeMutation.mutate({
                  ...gradeForm,
                  academicYear: selectedYear,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Grade Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 10, Kindergarten 1"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Grade Name (Khmer / ភាសាខ្មែរ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ថ្នាក់ទី ១០"
                  value={gradeForm.khmerName}
                  onChange={(e) => setGradeForm({ ...gradeForm, khmerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sequence / Level Order (លំដាប់ថ្នាក់)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={gradeForm.sequenceOrder}
                  onChange={(e) => setGradeForm({ ...gradeForm, sequenceOrder: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Used to sort grades from lowest to highest.</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details or track (e.g. Upper Secondary)"
                  value={gradeForm.description}
                  onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingGrade ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete ${editingGrade.name}?`)) {
                        deleteGradeMutation.mutate(editingGrade.id);
                        setGradeModalOpen(false);
                      }
                    }}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    Delete Grade
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGradeModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveGradeMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                  >
                    {editingGrade ? "Update Grade" : "Save Grade"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT CLASSROOM */}
      {/* ========================================================================= */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <School className="text-indigo-600" size={18} />
                <span>{editingClass ? "Edit Classroom" : `Create Class for ${selectedYear}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveClassMutation.mutate({
                  ...classForm,
                  academicYear: selectedYear,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10A"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Khmer Name (ឈ្មោះខ្មែរ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ថ្នាក់ ១០A"
                    value={classForm.khmerName}
                    onChange={(e) => setClassForm({ ...classForm, khmerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Grade Level (កម្រិតថ្នាក់) *
                  </label>
                  <select
                    required
                    value={classForm.gradeName}
                    onChange={(e) => setClassForm({ ...classForm, gradeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="">Select Grade</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name} ({g.khmerName || g.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Room / Location (បន្ទប់រៀន)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 201, Building B"
                    value={classForm.roomNumber}
                    onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Homeroom Teacher (គ្រូបន្ទុកថ្នាក់)
                  </label>
                  <input
                    type="text"
                    list="teacherSuggestions"
                    placeholder="e.g. Sok Sambath"
                    value={classForm.homeroomTeacherName}
                    onChange={(e) => setClassForm({ ...classForm, homeroomTeacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <datalist id="teacherSuggestions">
                    {(Array.isArray(teachers) ? teachers : []).map((t) => (
                      <option key={t.id} value={t.englishName || t.fullName}>
                        {t.khmerName ? `${t.khmerName} (${t.englishName})` : t.englishName}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Capacity (ចំនួនសិស្សអតិបរមា)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={classForm.maxStudents}
                    onChange={(e) => setClassForm({ ...classForm, maxStudents: parseInt(e.target.value) || 40 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Branch Selection */}
              {branches.length > 1 && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Campus / Branch (សាខា)
                  </label>
                  <select
                    value={classForm.branchId}
                    onChange={(e) => setClassForm({ ...classForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveClassMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  {editingClass ? "Update Class" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: COPY ACADEMIC STRUCTURE */}
      {/* ========================================================================= */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Copy className="text-indigo-600" size={18} />
                <span>Copy Structure to New Academic Year</span>
              </h3>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Clones all grade levels and classroom definitions from a source year to a new target year so you can adapt them for the new school year.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                copyStructureMutation.mutate(copyForm);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Source Academic Year (ចម្លងពីឆ្នាំ) *
                </label>
                <select
                  required
                  value={copyForm.sourceAcademicYear}
                  onChange={(e) => setCopyForm({ ...copyForm, sourceAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.code}>
                      {y.code} ({y.classCount} classes, {y.gradeCount} grades)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Academic Year (ទៅកាន់ឆ្នាំសិក្សាថ្មី) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2027-2028"
                  value={copyForm.targetAcademicYear}
                  onChange={(e) => setCopyForm({ ...copyForm, targetAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCopyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={copyStructureMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  {copyStructureMutation.isPending ? "Cloning..." : "Start Clone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ENROLLED STUDENTS IN CLASS */}
      {/* ========================================================================= */}
      {studentsModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {studentsModalClass.name} • Enrolled Students
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {studentsModalClass.gradeName} • Academic Year {studentsModalClass.academicYear} • {enrolledStudents.length} Students
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentsModalClass(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {studentsLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading enrolled student roster...
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active students currently enrolled in {studentsModalClass.name} for {studentsModalClass.academicYear}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {enrolledStudents.map((st, idx) => (
                    <div key={st.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] text-slate-400 w-6 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-600 shrink-0">
                          {st.englishName?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {st.englishName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            Code: {st.studentCode} {st.khmerName ? `• ${st.khmerName}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {st.gender}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          {st.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setStudentsModalClass(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

