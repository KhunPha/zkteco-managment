"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  UserX,
  CalendarDays,
  Briefcase,
  AlertCircle,
  TrendingUp,
  UserCheck,
  GraduationCap,
  Users,
  ArrowUpDown,
  Filter,
  User,
  Check,
  ChevronDown,
  X,
  ExternalLink,
  BarChart3,
  ListFilter,
  Printer,
  Activity,
  GitFork,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import Pagination from "@/components/common/Pagination";

export default function ReportsPage() {
  const getToday = () => new Date().toISOString().split("T")[0];
  const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [personnelType, setPersonnelType] = useState("ALL"); // ALL, STUDENT, TEACHER, EMPLOYEE
  const [orderBy, setOrderBy] = useState("ROLE_STUDENT_FIRST"); // ROLE_STUDENT_FIRST, ROLE_TEACHER_FIRST, ROLE_EMPLOYEE_FIRST, DATE_DESC, DATE_ASC, NAME_ASC
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState("this-month");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Individual User Selection State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const userDropdownRef = useRef(null);

  // View Mode: "DETAILED" (daily punch timesheet) vs "PER_USER_SUMMARY" (each user summarized)
  const [viewMode, setViewMode] = useState("DETAILED");

  // Individual User Direct Inspection Modal State
  const [inspectingUser, setInspectingUser] = useState(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Quick date presets for HR
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const t = getToday();
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "last-7-days") {
      const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(d7);
      setEndDate(getToday());
    } else if (preset === "this-month") {
      setStartDate(getStartOfMonth());
      setEndDate(getToday());
    } else if (preset === "last-month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    }
  };

  const { data: departments = [] } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const res = await api.get("/api/v1/departments");
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

  // Helper to safely extract arrays from Spring Data Page, custom items, or lists
  const extractArray = (res) => {
    if (!res) return [];
    const d = res.data?.data !== undefined ? res.data.data : res.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.content)) return d.content;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  };

  // Query Personnel/Users Roster for the User Selector (Combines device-users, employees & students)
  const { data: userRoster = [], isLoading: isRosterLoading } = useQuery({
    queryKey: ["report-user-roster"],
    queryFn: async () => {
      try {
        const [devUsersRes, empRes, stuRes] = await Promise.allSettled([
          api.get("/api/v1/device-users?page=0&size=5000"),
          api.get("/api/v1/employees?page=0&size=5000"),
          api.get("/api/v1/students?page=0&size=5000"),
        ]);

        const devUsers = devUsersRes.status === "fulfilled" ? extractArray(devUsersRes.value) : [];
        const employees = empRes.status === "fulfilled" ? extractArray(empRes.value) : [];
        const students = stuRes.status === "fulfilled" ? extractArray(stuRes.value) : [];

        const userMap = new Map();

        // 1. Process Device Users (hardware synced status, device PINs)
        devUsers.forEach((u) => {
          const code = String(u.devicePin || u.employeeCode || u.studentCode || "").trim();
          if (!code) return;
          const isStudent = u.personnelType === "STUDENT" || Boolean(u.studentId);
          const isTeacher = u.personnelType === "TEACHER";
          const role = isStudent ? "STUDENT" : isTeacher ? "TEACHER" : (u.personnelType || "EMPLOYEE");
          userMap.set(code, {
            id: u.employeeId || u.studentId || u.id,
            employeeId: u.employeeId,
            studentId: u.studentId,
            code: code,
            devicePin: u.devicePin || code,
            name: u.studentName || u.employeeName || u.nameOnDevice || `User #${code}`,
            khmerName: u.personnelKhmerName || "",
            personnelType: role,
            departmentOrClass: isStudent
              ? `${u.studentGrade || "Student"} ${u.studentClassName || ""}`.trim()
              : (u.departmentName || "Staff"),
          });
        });

        // 2. Process Employees & Teachers
        employees.forEach((e) => {
          const code = String(e.employeeCode || e.devicePin || e.id || "").trim();
          if (!code) return;
          const isTeacher = (e.positionTitle || "").toLowerCase().includes("teacher") ||
                            (e.positionTitle || "").toLowerCase().includes("lecturer") ||
                            (e.positionTitle || "").toLowerCase().includes("instructor");
          const role = isTeacher ? "TEACHER" : "EMPLOYEE";
          const name = e.englishName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || `Staff #${code}`;
          const existing = userMap.get(code);
          userMap.set(code, {
            id: e.id,
            employeeId: e.id,
            studentId: null,
            code: code,
            devicePin: e.devicePin || code,
            name: name,
            khmerName: e.khmerName || (existing ? existing.khmerName : ""),
            personnelType: existing?.personnelType === "TEACHER" ? "TEACHER" : role,
            departmentOrClass: e.departmentName || (existing ? existing.departmentOrClass : "Staff"),
          });
        });

        // 3. Process Students
        students.forEach((s) => {
          const code = String(s.studentCode || s.id || "").trim();
          if (!code) return;
          const existing = userMap.get(code);
          userMap.set(code, {
            id: s.id,
            employeeId: null,
            studentId: s.id,
            code: code,
            devicePin: code,
            name: s.englishName || `Student #${code}`,
            khmerName: s.khmerName || (existing ? existing.khmerName : ""),
            personnelType: "STUDENT",
            departmentOrClass: `${s.grade || "Student"} ${s.className || ""}`.trim(),
          });
        });

        const list = Array.from(userMap.values());
        // Sort: Teachers, Employees, then Students; alphabetically by name
        list.sort((a, b) => {
          const orderMap = { TEACHER: 1, EMPLOYEE: 2, STUDENT: 3 };
          const diff = (orderMap[a.personnelType] || 4) - (orderMap[b.personnelType] || 4);
          if (diff !== 0) return diff;
          return (a.name || "").localeCompare(b.name || "");
        });

        return list;
      } catch (err) {
        console.error("Failed to load user roster:", err);
        return [];
      }
    },
    staleTime: 300000,
  });

  // Filtered User Roster for the Combobox Popup
  const filteredUserRoster = useMemo(() => {
    let list = userRoster;
    if (userRoleFilter !== "ALL") {
      list = list.filter((u) => u.personnelType === userRoleFilter);
    }
    if (userSearchTerm.trim()) {
      const q = userSearchTerm.toLowerCase().trim();
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.code && u.code.toLowerCase().includes(q)) ||
          (u.devicePin && u.devicePin.toLowerCase().includes(q)) ||
          (u.khmerName && u.khmerName.toLowerCase().includes(q)) ||
          (u.departmentOrClass && u.departmentOrClass.toLowerCase().includes(q))
      );
    }
    return list;
  }, [userRoster, userRoleFilter, userSearchTerm]);

  // Main Attendance Report Query
  const {
    data: rawReportRecords = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "report-preview",
      startDate,
      endDate,
      departmentId,
      branchId,
      status,
      personnelType,
      orderBy,
      selectedUser?.code,
      selectedUser?.employeeId,
      selectedUser?.studentId,
    ],
    queryFn: async () => {
      let url = `/api/v1/attendance/reports?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (branchId) url += `&branchId=${branchId}`;
      if (status) url += `&status=${status}`;
      if (selectedUser) {
        if (selectedUser.employeeId) url += `&employeeId=${selectedUser.employeeId}`;
        if (selectedUser.studentId) url += `&studentId=${selectedUser.studentId}`;
        if (selectedUser.code) url += `&userCode=${encodeURIComponent(selectedUser.code)}`;
      } else {
        if (personnelType && personnelType !== "ALL") url += `&personnelType=${personnelType}`;
      }
      if (orderBy) url += `&orderBy=${orderBy}`;
      const res = await api.get(url);
      return extractArray(res);
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Direct matching helper for individual user filtering
  const matchUserRecord = (user, record) => {
    if (!user || !record) return false;
    const uCode = String(user.code || user.devicePin || "").trim().toLowerCase();
    const uEmpId = user.employeeId != null ? String(user.employeeId) : null;
    const uStuId = user.studentId != null ? String(user.studentId) : null;
    const uName = (user.name || "").trim().toLowerCase();

    const rEmpCode = String(record.employeeCode || "").trim().toLowerCase();
    const rStuCode = String(record.studentCode || "").trim().toLowerCase();
    const rEmpId = record.employeeId != null ? String(record.employeeId) : null;
    const rStuId = record.studentId != null ? String(record.studentId) : null;
    const rEmpName = (record.employeeName || "").trim().toLowerCase();
    const rStuName = (record.studentName || "").trim().toLowerCase();

    // 1. Check code / PIN match
    if (uCode && (rEmpCode === uCode || rStuCode === uCode)) return true;
    // 2. Check Database ID match
    if (uEmpId && rEmpId && uEmpId === rEmpId) return true;
    if (uStuId && rStuId && uStuId === rStuId) return true;
    // 3. Fallback name match
    if (uName && (rEmpName === uName || rStuName === uName)) return true;

    return false;
  };

  // Client-side quick search by Name, Code, Grade or Class + Role sorting + Single User Filter
  const filteredRecords = useMemo(() => {
    let list = Array.isArray(rawReportRecords) ? [...rawReportRecords] : [];
    // Remove scheduled rest days from report
    list = list.filter((r) => r.status !== "REST_DAY");

    if (selectedUser) {
      list = list.filter((r) => matchUserRecord(selectedUser, r));
    } else if (personnelType !== "ALL") {
      list = list.filter((r) => r.personnelType === personnelType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
          (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
          (r.studentName && r.studentName.toLowerCase().includes(q)) ||
          (r.studentCode && r.studentCode.toLowerCase().includes(q)) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q)) ||
          (r.studentGrade && r.studentGrade.toLowerCase().includes(q)) ||
          (r.studentClassName && r.studentClassName.toLowerCase().includes(q))
      );
    }
    // Stable sorting
    list.sort((a, b) => {
      if (orderBy === "ROLE_STUDENT_FIRST") {
        const orderMap = { STUDENT: 1, TEACHER: 2, EMPLOYEE: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_TEACHER_FIRST") {
        const orderMap = { TEACHER: 1, EMPLOYEE: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_EMPLOYEE_FIRST") {
        const orderMap = { EMPLOYEE: 1, TEACHER: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "NAME_ASC") {
        const nameA = a.studentName || a.employeeName || "";
        const nameB = b.studentName || b.employeeName || "";
        return nameA.localeCompare(nameB);
      } else if (orderBy === "DATE_ASC") {
        return (a.attendanceDate || "").localeCompare(b.attendanceDate || "");
      }
      return (b.attendanceDate || "").localeCompare(a.attendanceDate || "");
    });
    return list;
  }, [rawReportRecords, searchQuery, personnelType, orderBy, selectedUser]);

  // Aggregate stats per EACH USER for the "Per User Summary" view
  const perUserSummaries = useMemo(() => {
    const map = new Map();

    let baseList = Array.isArray(rawReportRecords) ? [...rawReportRecords] : [];
    // Remove scheduled rest days from user summaries
    baseList = baseList.filter((r) => r.status !== "REST_DAY");

    if (selectedUser) {
      baseList = baseList.filter((r) => matchUserRecord(selectedUser, r));
    } else if (personnelType !== "ALL") {
      baseList = baseList.filter((r) => r.personnelType === personnelType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter(
        (r) =>
          (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
          (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
          (r.studentName && r.studentName.toLowerCase().includes(q)) ||
          (r.studentCode && r.studentCode.toLowerCase().includes(q)) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q)) ||
          (r.studentGrade && r.studentGrade.toLowerCase().includes(q)) ||
          (r.studentClassName && r.studentClassName.toLowerCase().includes(q))
      );
    }

    baseList.forEach((r) => {
      const code = r.studentCode || r.employeeCode || String(r.employeeId || r.studentId || "UNKNOWN");
      const name = r.studentName || r.employeeName || "Unknown";
      const khmerName = r.khmerName || "";
      const role = r.personnelType || "EMPLOYEE";
      const deptOrClass =
        r.departmentName ||
        (r.studentGrade ? `${r.studentGrade} ${r.studentClassName || ""}`.trim() : "Staff");

      if (!map.has(code)) {
        map.set(code, {
          code,
          name,
          khmerName,
          personnelType: role,
          deptOrClass,
          branchName: r.branchName || "Branch 1",
          employeeId: r.employeeId,
          studentId: r.studentId,
          totalRecords: 0,
          present: 0,
          late: 0,
          absent: 0,
          onLeave: 0,
          holiday: 0,
          totalWorkMinutes: 0,
          totalLateMinutes: 0,
        });
      }

      const item = map.get(code);
      item.totalRecords += 1;
      if (r.status === "PRESENT") item.present += 1;
      else if (r.status === "LATE") item.late += 1;
      else if (r.status === "ABSENT") item.absent += 1;
      else if (r.status === "ON_LEAVE") item.onLeave += 1;
      else if (r.status === "HOLIDAY") item.holiday += 1;

      item.totalWorkMinutes += r.totalWorkMinutes || 0;
      item.totalLateMinutes += r.lateMinutes || 0;
    });

    const list = Array.from(map.values());
    list.forEach((u) => {
      u.totalHours = (u.totalWorkMinutes / 60).toFixed(1);
      u.punctualityRate =
        u.totalRecords > 0 ? Math.round(((u.present + u.late) / u.totalRecords) * 100) : 0;
    });

    // Sorting by role or name
    list.sort((a, b) => {
      if (orderBy === "ROLE_TEACHER_FIRST") {
        const orderMap = { TEACHER: 1, EMPLOYEE: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_STUDENT_FIRST") {
        const orderMap = { STUDENT: 1, TEACHER: 2, EMPLOYEE: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      } else if (orderBy === "ROLE_EMPLOYEE_FIRST") {
        const orderMap = { EMPLOYEE: 1, TEACHER: 2, STUDENT: 3 };
        const aVal = orderMap[a.personnelType] || 4;
        const bVal = orderMap[b.personnelType] || 4;
        if (aVal !== bVal) return aVal - bVal;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

    return list;
  }, [rawReportRecords, searchQuery, personnelType, orderBy, selectedUser]);

  // Daily punch records for the currently inspected user in modal
  const inspectingUserRecords = useMemo(() => {
    if (!inspectingUser) return [];
    return (Array.isArray(rawReportRecords) ? rawReportRecords : [])
      .filter((r) => r.status !== "REST_DAY" && matchUserRecord(inspectingUser, r))
      .sort((a, b) => (b.attendanceDate || "").localeCompare(a.attendanceDate || ""));
  }, [inspectingUser, rawReportRecords]);

  // Executive stats for the currently inspected user in modal
  const inspectingUserStats = useMemo(() => {
    const total = inspectingUserRecords.length;
    const present = inspectingUserRecords.filter((r) => r.status === "PRESENT").length;
    const late = inspectingUserRecords.filter((r) => r.status === "LATE").length;
    const absent = inspectingUserRecords.filter((r) => r.status === "ABSENT").length;
    const onLeave = inspectingUserRecords.filter((r) => r.status === "ON_LEAVE").length;
    const totalMinutes = inspectingUserRecords.reduce((acc, r) => acc + (r.totalWorkMinutes || 0), 0);
    const totalLateMinutes = inspectingUserRecords.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const punctualityRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, onLeave, totalHours, punctualityRate, totalLateMinutes };
  }, [inspectingUserRecords]);

  // Reset to first page when filtering changes
  useEffect(() => {
    setPage(0);
  }, [startDate, endDate, departmentId, branchId, status, personnelType, orderBy, searchQuery, selectedUser, viewMode]);

  // Current Company Tenant Information (for header and print branding)
  const { data: currentCompany } = useQuery({
    queryKey: ["currentCompany"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/companies/current");
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 300000,
  });

  const currentItemsCount = viewMode === "DETAILED" ? filteredRecords.length : perUserSummaries.length;
  const totalPages = Math.ceil(currentItemsCount / pageSize) || 1;

  const paginatedDetailedRecords = useMemo(() => {
    const startIdx = page * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, page, pageSize]);

  const paginatedSummaries = useMemo(() => {
    const startIdx = page * pageSize;
    return perUserSummaries.slice(startIdx, startIdx + pageSize);
  }, [perUserSummaries, page, pageSize]);

  // Executive HR Analytics
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "PRESENT").length;
    const late = filteredRecords.filter((r) => r.status === "LATE").length;
    const absent = filteredRecords.filter((r) => r.status === "ABSENT").length;
    const onLeave = filteredRecords.filter((r) => r.status === "ON_LEAVE").length;
    const totalMinutes = filteredRecords.reduce((acc, r) => acc + (r.totalWorkMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const punctualityRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, late, absent, onLeave, totalHours, punctualityRate };
  }, [filteredRecords]);

  // Export handler with target user and format support (Summary vs Detailed)
  const handleDownload = async (format, targetUser = null, reportKind = null) => {
    setIsExporting(true);
    try {
      const u = targetUser || selectedUser;
      const isSummary =
        reportKind === "SUMMARY" ||
        (!reportKind && viewMode === "PER_USER_SUMMARY" && !targetUser);

      const endpoint = isSummary
        ? `/api/v1/attendance/reports/export/summary/${format}`
        : `/api/v1/attendance/reports/export/${format}`;

      let url = `${endpoint}?startDate=${startDate}&endDate=${endDate}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      if (branchId) url += `&branchId=${branchId}`;
      if (status) url += `&status=${status}`;
      if (personnelType && personnelType !== "ALL") url += `&personnelType=${personnelType}`;
      if (orderBy) url += `&orderBy=${orderBy}`;
      if (u) {
        if (u.employeeId) url += `&employeeId=${u.employeeId}`;
        if (u.studentId) url += `&studentId=${u.studentId}`;
        if (u.code) url += `&userCode=${encodeURIComponent(u.code)}`;
      }

      const res = await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const extension = format === "excel" ? "xlsx" : format;
      const rolePrefix =
        personnelType === "STUDENT"
          ? "Students"
          : personnelType === "TEACHER"
          ? "Teachers"
          : personnelType === "EMPLOYEE"
          ? "Staff"
          : "Workforce";

      const kindPrefix = isSummary ? "Attendance-Summary-Report" : "Attendance-Timesheet";
      const userSlug = u ? `-${(u.name || "").replace(/\s+/g, "_")}-${u.code}` : "";
      a.download = `${rolePrefix}-${kindPrefix}${userSlug}-${startDate}-to-${endDate}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Timesheet & Academic Report
              </span>
              {selectedUser && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <User size={11} />
                  <span>Single User Filter: {selectedUser.name}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight">Workforce & Academic Attendance Reports</h1>
            <p className="text-xs text-indigo-200/80">
              Generate and export timesheets for each individual user or entire organization with accurate 2-shift punch audits
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleDownload("excel")}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={viewMode === "PER_USER_SUMMARY" ? "Download Excel Summary Report" : "Download Detailed Timesheet Excel"}
            >
              <FileSpreadsheet size={16} />
              <span>
                {viewMode === "PER_USER_SUMMARY"
                  ? "Excel Summary (.xlsx)"
                  : selectedUser
                  ? `Excel (${selectedUser.name.split(" ")[0]})`
                  : personnelType === "TEACHER"
                  ? "Excel Teachers (.xlsx)"
                  : personnelType === "STUDENT"
                  ? "Excel Students (.xlsx)"
                  : personnelType === "EMPLOYEE"
                  ? "Excel Staff (.xlsx)"
                  : "Excel (.xlsx)"}
              </span>
            </button>
            <button
              onClick={() => handleDownload("pdf")}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={viewMode === "PER_USER_SUMMARY" ? "Download Executive PDF Summary Report" : "Download Printable Timesheet PDF"}
            >
              <FileText size={16} />
              <span>
                {viewMode === "PER_USER_SUMMARY"
                  ? "PDF Summary (.pdf)"
                  : selectedUser
                  ? `PDF (${selectedUser.name.split(" ")[0]})`
                  : personnelType === "TEACHER"
                  ? "Print Teachers PDF"
                  : personnelType === "STUDENT"
                  ? "Print Students PDF"
                  : personnelType === "EMPLOYEE"
                  ? "Print Staff PDF"
                  : "Print PDF"}
              </span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Print this report view directly via browser printer"
            >
              <Printer size={16} />
              <span>Print {viewMode === "PER_USER_SUMMARY" ? "Summary" : "Timesheet"}</span>
            </button>
            <button
              onClick={() => handleDownload("csv")}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-700/80 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
              title="Export comma-separated values"
            >
              <Download size={16} />
              <span>CSV</span>
            </button>
          </div>
        </div>

      {/* Category Tabs: All Personnel, Students, Teachers, Staff */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setPersonnelType("ALL")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "ALL"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users size={15} />
          <span>All Personnel</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("STUDENT")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "STUDENT"
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserCheck size={15} className={personnelType === "STUDENT" ? "text-white" : "text-cyan-500"} />
          <span>Enrolled Students</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("TEACHER")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "TEACHER"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap size={15} className={personnelType === "TEACHER" ? "text-white" : "text-amber-500"} />
          <span>Teachers & Academic</span>
        </button>

        <button
          type="button"
          onClick={() => setPersonnelType("EMPLOYEE")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover-lift ${
            personnelType === "EMPLOYEE"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase size={15} className={personnelType === "EMPLOYEE" ? "text-white" : "text-emerald-500"} />
          <span>Staff & Officers</span>
        </button>
      </div>

      {/* HR Executive KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Records</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <CalendarDays size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.present}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late Arrivals</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{metrics.late}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Clock size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{metrics.absent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
            <UserX size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">On Leave</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{metrics.onLeave}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <Briefcase size={18} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Hours</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{metrics.totalHours}h</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Date Presets & Filter Strip */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500 flex-wrap">
            <span>Quick Range:</span>
            <div className="flex items-center gap-1">
              {[
                { id: "today", label: "Today" },
                { id: "last-7-days", label: "Last 7 Days" },
                { id: "this-month", label: "This Month" },
                { id: "last-month", label: "Last Month" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activePreset === p.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Detailed Controls with Individual User Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. INDIVIDUAL USER SELECTOR COMBOBOX */}
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen((prev) => !prev)}
              className={`w-full h-11 flex items-center justify-between gap-2.5 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                selectedUser
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-900 dark:text-indigo-200 shadow-xs shadow-indigo-500/10"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    selectedUser ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <User size={13} />
                </div>
                <div className="truncate text-left">
                  <p className="truncate font-bold leading-tight">
                    {selectedUser ? selectedUser.name : "👤 All Personnel (Select Each User)"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">
                    {selectedUser ? `PIN: ${selectedUser.code} • ${selectedUser.personnelType}` : "Click to get individual user report"}
                  </p>
                </div>
              </div>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-[calc(100vw-2rem)] sm:w-96 max-w-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="h-9 flex items-center gap-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
                    <Search size={14} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
                    <input
                      type="text"
                      placeholder="Search name, PIN, employee/student code..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 text-xs p-0 leading-normal"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                    {[
                      { id: "ALL", label: "Everyone" },
                      { id: "TEACHER", label: "Teachers" },
                      { id: "STUDENT", label: "Students" },
                      { id: "EMPLOYEE", label: "Staff" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setUserRoleFilter(r.id)}
                        className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          userRoleFilter === r.id
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {/* Reset to All Users Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setIsUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 px-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer ${
                      !selectedUser ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                        👥
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">All Personnel (Everyone)</p>
                        <p className="text-[10px] text-slate-400">View combined records for all users</p>
                      </div>
                    </div>
                    {!selectedUser && <Check size={15} className="text-indigo-600" />}
                  </button>

                  {isRosterLoading ? (
                    <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-indigo-500" />
                      <span>Loading personnel directory...</span>
                    </div>
                  ) : filteredUserRoster.length === 0 ? (
                    <div className="p-5 text-center text-slate-400 text-xs">No matching users found</div>
                  ) : (
                    <>
                      <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Showing {Math.min(filteredUserRoster.length, 100)} of {filteredUserRoster.length} users</span>
                        {userRoleFilter !== "ALL" && <span className="font-bold text-indigo-500 uppercase">{userRoleFilter}S</span>}
                      </div>
                      {filteredUserRoster.slice(0, 100).map((u) => {
                        const isSelected = selectedUser && selectedUser.code === u.code;
                        return (
                          <button
                            key={u.code || u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsUserDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 px-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer ${
                              isSelected ? "bg-indigo-50/70 dark:bg-indigo-950/40" : ""
                            }`}
                          >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                                u.personnelType === "STUDENT"
                                  ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 border-cyan-200"
                                  : u.personnelType === "TEACHER"
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200"
                              }`}
                            >
                              {u.personnelType === "STUDENT" ? "🎓" : u.personnelType === "TEACHER" ? "👨‍🏫" : "💼"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                                <span className="text-[9px] px-1 py-0.2 rounded font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {u.personnelType}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                PIN: <strong className="font-mono text-slate-600 dark:text-slate-300">{u.code}</strong> • {u.departmentOrClass}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check size={15} className="text-indigo-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </>
                )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Search Box */}
          <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
            <input
              type="text"
              placeholder="Search table records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 font-medium text-xs p-0 leading-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3. From Date */}
          <div className="h-10 sm:h-11 flex items-center gap-2 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Calendar size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <span className="text-slate-400 font-semibold text-[11px] shrink-0">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            />
          </div>

          {/* 4. To Date */}
          <div className="h-10 sm:h-11 flex items-center gap-2 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Calendar size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <span className="text-slate-400 font-semibold text-[11px] shrink-0">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            />
          </div>
        </div>

        {/* Secondary Filter Row: Category, Department, Branch, Status, Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-1">
          {/* Personnel Category Selector */}
          <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Filter size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <select
              value={personnelType}
              onChange={(e) => setPersonnelType(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Personnel Roles</option>
              <option value="TEACHER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🎓 Teachers & Faculty</option>
              <option value="STUDENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🎒 Enrolled Students</option>
              <option value="EMPLOYEE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">💼 Staff & Officers</option>
            </select>
          </div>

          {/* Branch Filter Selector */}
          <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <GitFork size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Branches (គ្រប់សាខា)</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  📍 {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Department (for staff/teachers) */}
          {personnelType !== "STUDENT" ? (
            <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
              <Building2 size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Departments</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-medium text-xs">
              <Building2 size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
              <span>All Academic Grades</span>
            </div>
          )}

          {/* Status */}
          <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Activity size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
              <option value="PRESENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">✓ Present</option>
              <option value="LATE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">⚠ Late Arrival</option>
              <option value="ABSENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">✕ Absent</option>
              <option value="ON_LEAVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">★ On Leave</option>
              <option value="HOLIDAY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Official Holiday</option>
            </select>
          </div>

          {/* Order By Selector */}
          <div className="h-10 sm:h-11 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <ArrowUpDown size={15} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer w-full text-xs p-0 leading-normal"
            >
              <option value="ROLE_TEACHER_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Teachers First</option>
              <option value="ROLE_STUDENT_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Students First</option>
              <option value="ROLE_EMPLOYEE_FIRST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Staff First</option>
              <option value="DATE_DESC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Latest Date First</option>
              <option value="DATE_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Earliest Date First</option>
              <option value="NAME_ASC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Order: Name (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Selected User Filter Indicator Banner */}
        {selectedUser && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {selectedUser.personnelType === "STUDENT" ? "🎓" : selectedUser.personnelType === "TEACHER" ? "👨‍🏫" : "💼"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-100 text-sm">
                    {selectedUser.name}
                  </span>
                  {selectedUser.khmerName && (
                    <span className="text-slate-500 font-medium">({selectedUser.khmerName})</span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100">
                    {selectedUser.personnelType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  PIN / Code: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedUser.code}</strong> • {selectedUser.departmentOrClass} • Showing only this user's attendance records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer shadow-2xs"
              >
                <X size={14} />
                <span>Show All Users</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Error loading report: {error?.message || "Failed to fetch attendance records"}</span>
        </div>
      )}

      {/* Main Table Container with View Mode Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* View Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode("DETAILED");
                setPage(0);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewMode === "DETAILED"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileText size={14} />
              <span>Detailed Daily Punches</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-[10px] font-mono">
                {filteredRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("PER_USER_SUMMARY");
                setPage(0);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewMode === "PER_USER_SUMMARY"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users size={14} />
              <span>Each User Summary (Grouped)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-[10px] font-mono">
                {perUserSummaries.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline mr-1">
              Period: {startDate} → {endDate}
            </span>
            {viewMode === "PER_USER_SUMMARY" ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload("excel", null, "SUMMARY")}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Export Grouped Summary to Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf", null, "SUMMARY")}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 font-bold text-[11px] border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title="Export Grouped Summary to PDF (.pdf)"
                >
                  <FileText size={13} />
                  <span>PDF Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                  title="Print Grouped Summary Table"
                >
                  <Printer size={13} />
                  <span>Print Summary</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload("excel", null, "DETAILED")}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Export Detailed Timesheet to Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf", null, "DETAILED")}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 font-bold text-[11px] border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title="Export Detailed Timesheet to PDF (.pdf)"
                >
                  <FileText size={13} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                  title="Print Detailed Timesheet"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DETAILED DAILY PUNCH RECORDS                                      */}
        {/* ========================================================================= */}
        {viewMode === "DETAILED" && (
          <div className="overflow-x-auto max-h-[660px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] z-10 shadow-2xs">
                <tr>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 w-12">#</th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[95px]">Date</th>
                  <th rowSpan={2} className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 min-w-[210px]">Personnel & Role</th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Dept / Class</th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Branch (សាខា)</th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Shift Rule</th>
                  <th colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-400/5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-extrabold normal-case">
                      <span>🌅 Shift 1 (Morning)</span>
                    </div>
                  </th>
                  <th colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-800 bg-indigo-500/5 dark:bg-indigo-400/5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-extrabold normal-case">
                      <span>🌆 Shift 2 (Afternoon)</span>
                    </div>
                  </th>
                  <th rowSpan={2} className="py-3 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px] whitespace-nowrap">Late</th>
                  <th rowSpan={2} className="py-3 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px] whitespace-nowrap">Net Work</th>
                  <th rowSpan={2} className="py-3 px-3 text-center min-w-[110px]">Status</th>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-1.5 px-2.5 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[85px]">First In</th>
                  <th className="py-1.5 px-2.5 text-center bg-amber-500/5 dark:bg-amber-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[85px]">Last Out</th>
                  <th className="py-1.5 px-2.5 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/40 dark:border-slate-800/60 min-w-[85px]">First In</th>
                  <th className="py-1.5 px-2.5 text-center bg-indigo-500/5 dark:bg-indigo-400/5 border-r border-slate-200/80 dark:border-slate-800 min-w-[85px]">Last Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-14 text-center text-slate-400">
                      <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                      <p className="font-semibold">Loading HR attendance report...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      <FileSpreadsheet size={36} className="mx-auto mb-2 opacity-40 text-indigo-500" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No attendance records found</p>
                      <p className="text-[11px] mt-0.5">Try adjusting your date range, user selection, or filters</p>
                    </td>
                  </tr>
                ) : (
                  paginatedDetailedRecords.map((r, idx) => {
                    const isStudent = r.personnelType === "STUDENT";
                    const isTeacher = r.personnelType === "TEACHER";
                    const displayName = isStudent ? (r.studentName || r.employeeName) : (r.employeeName || r.studentName);
                    const displayCode = isStudent ? (r.studentCode || r.employeeCode) : (r.employeeCode || r.studentCode);
                    const s1In = r.shift1CheckIn || r.firstCheckIn;
                    const s1Out = r.shift1CheckOut;
                    const s2In = r.shift2CheckIn;
                    const s2Out = r.shift2CheckOut || (r.lastCheckOut && r.lastCheckOut !== r.shift1CheckOut ? r.lastCheckOut : null);

                    return (
                      <tr
                        key={r.id || `${r.attendanceDate}-${idx}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px] border-r border-slate-100 dark:border-slate-800">
                          {page * pageSize + idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {r.attendanceDate}
                        </td>
                        {/* PERSONNEL & ROLE */}
                        <td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border ${
                                isStudent
                                  ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                  : isTeacher
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                              }`}
                            >
                              {isStudent ? (
                                <UserCheck size={15} />
                              ) : isTeacher ? (
                                <GraduationCap size={15} />
                              ) : (
                                <Briefcase size={15} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {displayName}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                    isStudent
                                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                                      : isTeacher
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  }`}
                                >
                                  {r.personnelType || "STAFF"}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                                PIN: {displayCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* DEPARTMENT / CLASS */}
                        <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {isStudent ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                {r.studentGrade || "Student"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {r.studentClassName || "General"}
                              </span>
                            </div>
                          ) : (
                            <span>{r.departmentName || "Staff"}</span>
                          )}
                        </td>

                        {/* BRANCH */}
                        <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap">
                            <GitFork size={11} className="text-indigo-500 shrink-0" />
                            <span>{r.branchName || "Branch 1"}</span>
                          </span>
                        </td>

                        {/* SHIFT */}
                        <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block text-center truncate max-w-[130px]">
                            {r.shiftName || "Standard Full"}
                          </span>
                        </td>

                        {/* SHIFT 1: First In */}
                        <td className="py-3 px-2 text-center bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-100 dark:border-slate-800/40">
                          {s1In ? (
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {formatTime(s1In)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* SHIFT 1: Last Out (Lunch Out) */}
                        <td className="py-3 px-2 text-center bg-amber-500/[0.02] dark:bg-amber-400/[0.02] border-r border-slate-200/80 dark:border-slate-800">
                          {s1Out ? (
                            <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                              {formatTime(s1Out)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* SHIFT 2: First In (Lunch In) */}
                        <td className="py-3 px-2 text-center bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-100 dark:border-slate-800/40">
                          {s2In ? (
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              {formatTime(s2In)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* SHIFT 2: Last Out (Evening Out) */}
                        <td className="py-3 px-2 text-center bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border-r border-slate-200/80 dark:border-slate-800">
                          {s2Out ? (
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {formatTime(s2Out)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-300 dark:text-slate-600 text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* LATE */}
                        <td className="py-3 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {r.lateMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20 whitespace-nowrap text-xs">
                              <Clock size={11} className="shrink-0" />
                              +{r.lateMinutes}m
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              <CheckCircle2 size={12} className="shrink-0" />
                              On Time
                            </span>
                          )}
                        </td>

                        {/* NET WORK */}
                        <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {r.totalWorkMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                              {Math.floor(r.totalWorkMinutes / 60)}h {r.totalWorkMinutes % 60}m
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">0h 0m</span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                              r.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                : r.status === "LATE"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                : r.status === "ABSENT"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                : r.status === "ON_LEAVE"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {r.status === "PRESENT" && <CheckCircle2 size={11} />}
                            {r.status === "LATE" && <Clock size={11} />}
                            {r.status === "ABSENT" && <UserX size={11} />}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: EACH USER SUMMARY (Aggregated totals per person)                  */}
        {/* ========================================================================= */}
        {viewMode === "PER_USER_SUMMARY" && (
          <div className="overflow-x-auto max-h-[660px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] z-10 shadow-2xs">
                <tr>
                  <th className="py-3.5 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 w-12">#</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-200/60 dark:border-slate-800 min-w-[220px]">Personnel & Role</th>
                  <th className="py-3.5 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[140px]">Department / Class</th>
                  <th className="py-3.5 px-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Branch (សាខា)</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[90px]">Days Active</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[80px] bg-emerald-500/5">Present</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[80px] bg-amber-500/5">Late</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[80px] bg-rose-500/5">Absent</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[80px]">Leave</th>
                  <th className="py-3.5 px-2.5 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[100px]">Total Hours</th>
                  <th className="py-3.5 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 min-w-[130px]">Punctuality Rate</th>
                  <th className="py-3.5 px-3 text-center min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-14 text-center text-slate-400">
                      <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                      <p className="font-semibold">Calculating user summaries...</p>
                    </td>
                  </tr>
                ) : perUserSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      <Users size={36} className="mx-auto mb-2 opacity-40 text-indigo-500" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No user records found</p>
                      <p className="text-[11px] mt-0.5">Try selecting a different date range or category</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSummaries.map((u, idx) => {
                    const isStudent = u.personnelType === "STUDENT";
                    const isTeacher = u.personnelType === "TEACHER";

                    return (
                      <tr
                        key={u.code || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[10px] border-r border-slate-100 dark:border-slate-800">
                          {page * pageSize + idx + 1}
                        </td>
                        {/* USER INFO */}
                        <td className="py-3.5 px-3.5 border-r border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border ${
                                isStudent
                                  ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                  : isTeacher
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                              }`}
                            >
                              {isStudent ? (
                                <UserCheck size={15} />
                              ) : isTeacher ? (
                                <GraduationCap size={15} />
                              ) : (
                                <Briefcase size={15} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {u.name}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                    isStudent
                                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                                      : isTeacher
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  }`}
                                >
                                  {u.personnelType}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                                PIN: {u.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* DEPT / CLASS */}
                        <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {u.deptOrClass}
                        </td>

                        {/* BRANCH */}
                        <td className="py-3.5 px-3 border-r border-slate-100 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap">
                            <GitFork size={11} className="text-indigo-500 shrink-0" />
                            <span>{u.branchName || "Branch 1"}</span>
                          </span>
                        </td>

                        {/* TOTAL DAYS */}
                        <td className="py-3.5 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {u.totalRecords}
                        </td>

                        {/* PRESENT */}
                        <td className="py-3.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 bg-emerald-500/[0.02]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs">
                            {u.present}
                          </span>
                        </td>

                        {/* LATE */}
                        <td className="py-3.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 bg-amber-500/[0.02]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs">
                            {u.late}
                          </span>
                        </td>

                        {/* ABSENT */}
                        <td className="py-3.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 bg-rose-500/[0.02]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono font-bold text-xs">
                            {u.absent}
                          </span>
                        </td>

                        {/* LEAVE */}
                        <td className="py-3.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono font-bold text-xs">
                            {u.onLeave}
                          </span>
                        </td>

                        {/* TOTAL HOURS */}
                        <td className="py-3.5 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                          {u.totalHours}h
                        </td>

                        {/* PUNCTUALITY RATE */}
                        <td className="py-3.5 px-3 border-r border-slate-100 dark:border-slate-800 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              {u.punctualityRate}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  u.punctualityRate >= 90
                                    ? "bg-emerald-500"
                                    : u.punctualityRate >= 75
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${u.punctualityRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingUser(u);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                              title={`Inspect ${u.name}'s daily attendance records`}
                            >
                              <FileText size={12} />
                              <span>Inspect Logs</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload("excel", u)}
                              disabled={isExporting}
                              className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                              title={`Export ${u.name} timesheet to Excel`}
                            >
                              <FileSpreadsheet size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload("pdf", u)}
                              disabled={isExporting}
                              className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                              title={`Print ${u.name} timesheet PDF`}
                            >
                              <FileText size={13} />
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
        )}

        {/* High-Performance Pagination Footer */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={currentItemsCount}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 100, 200]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          itemLabel={viewMode === "DETAILED" ? "attendance records" : "users"}
        />
      </div>

      {/* ========================================================================= */}
      {/* INDIVIDUAL PERSONNEL INSPECT LOGS MODAL                                   */}
      {/* ========================================================================= */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl font-bold text-lg flex items-center justify-center shrink-0 border shadow-xs ${
                    inspectingUser.personnelType === "STUDENT"
                      ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 border-cyan-200"
                      : inspectingUser.personnelType === "TEACHER"
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200"
                      : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200"
                  }`}
                >
                  {inspectingUser.personnelType === "STUDENT" ? "🎓" : inspectingUser.personnelType === "TEACHER" ? "👨‍🏫" : "💼"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {inspectingUser.name}
                    </h2>
                    {inspectingUser.khmerName && (
                      <span className="text-slate-500 font-medium">({inspectingUser.khmerName})</span>
                    )}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        inspectingUser.personnelType === "STUDENT"
                          ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                          : inspectingUser.personnelType === "TEACHER"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      }`}
                    >
                      {inspectingUser.personnelType}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    PIN / Code: <strong className="font-mono text-slate-700 dark:text-slate-300">{inspectingUser.code}</strong> • {inspectingUser.deptOrClass || inspectingUser.departmentOrClass} • Period: {startDate} to {endDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload("excel", inspectingUser)}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 font-bold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Download Excel Timesheet"
                >
                  <FileSpreadsheet size={13} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf", inspectingUser)}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 font-bold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title="Download PDF Timesheet"
                >
                  <FileText size={13} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingUser(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mini Stat KPI Cards */}
            <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 shrink-0 text-center">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Days Scheduled</p>
                <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">{inspectingUserStats.total}</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Present</p>
                <p className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">{inspectingUserStats.present}</p>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Late</p>
                <p className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-0.5">{inspectingUserStats.late}</p>
              </div>
              <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800">
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Absent</p>
                <p className="text-base font-extrabold font-mono text-rose-700 dark:text-rose-300 mt-0.5">{inspectingUserStats.absent}</p>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Total Work</p>
                <p className="text-base font-extrabold font-mono text-indigo-700 dark:text-indigo-300 mt-0.5">{inspectingUserStats.totalHours}h</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Punctuality</p>
                <p className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{inspectingUserStats.punctualityRate}%</p>
              </div>
            </div>

            {/* Modal Daily Punches Table */}
            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Date</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Shift</th>
                    <th className="py-2.5 px-2.5 text-center min-w-[80px]">S1 In</th>
                    <th className="py-2.5 px-2.5 text-center min-w-[80px]">S1 Out</th>
                    <th className="py-2.5 px-2.5 text-center min-w-[80px]">S2 In</th>
                    <th className="py-2.5 px-2.5 text-center min-w-[80px]">S2 Out</th>
                    <th className="py-2.5 px-2 text-center min-w-[70px]">Late</th>
                    <th className="py-2.5 px-2 text-center min-w-[70px]">Work</th>
                    <th className="py-2.5 px-3 text-center min-w-[90px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectingUserRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-40 text-indigo-500" />
                        <p className="font-bold">No daily attendance records found for this user in this period</p>
                      </td>
                    </tr>
                  ) : (
                    inspectingUserRecords.map((r, idx) => {
                      const s1In = r.shift1CheckIn || r.firstCheckIn;
                      const s1Out = r.shift1CheckOut;
                      const s2In = r.shift2CheckIn;
                      const s2Out = r.shift2CheckOut || (r.lastCheckOut && r.lastCheckOut !== r.shift1CheckOut ? r.lastCheckOut : null);
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">{r.attendanceDate}</td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]">{r.shiftName || "Standard Shift"}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold">{s1In ? formatTime(s1In) : "--:--"}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-amber-600">{s1Out ? formatTime(s1Out) : "--:--"}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-indigo-600">{s2In ? formatTime(s2In) : "--:--"}</td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-indigo-600">{s2Out ? formatTime(s2Out) : "--:--"}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-rose-600 font-bold">{r.lateMinutes > 0 ? `${r.lateMinutes}m` : "-"}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold">{r.totalWorkMinutes > 0 ? `${(r.totalWorkMinutes / 60).toFixed(1)}h` : "-"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : r.status === "LATE"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : r.status === "ABSENT"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
              <p className="text-[11px] text-slate-400 font-mono">
                Showing {inspectingUserRecords.length} punch records for {inspectingUser.name}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(inspectingUser);
                    setViewMode("DETAILED");
                    setPage(0);
                    setInspectingUser(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  <ExternalLink size={13} />
                  <span>Filter Main Table to this User</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingUser(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE PRINT DOCUMENT (Visible ONLY when browser Print Dialog opens)     */}
      {/* ========================================================================= */}
      <div className="hidden print:block font-sans text-slate-900 bg-white p-6">
        {/* Printable Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentCompany?.logoUrl && (
                <img
                  src={currentCompany.logoUrl}
                  alt={currentCompany.name || "Company Logo"}
                  className="w-16 h-16 object-contain rounded-lg border border-slate-300 p-1"
                />
              )}
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {currentCompany?.khmerName || currentCompany?.name || "CAMBODIA BIOMETRICS INSTITUTION"}
                </h1>
                {currentCompany?.khmerName && currentCompany?.name && (
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {currentCompany.name}
                  </p>
                )}
                <h2 className="text-sm font-bold text-slate-700 mt-0.5">
                  {viewMode === "PER_USER_SUMMARY"
                    ? "PERSONNEL & STUDENT ATTENDANCE SUMMARY REPORT"
                    : "DETAILED ATTENDANCE TIMESHEET AUDIT"}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 font-mono">
                  <span><strong>Date Period:</strong> {startDate} to {endDate}</span>
                  <span><strong>Category:</strong> {personnelType}</span>
                  {departmentId && <span><strong>Department ID:</strong> {departmentId}</span>}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono shrink-0">
              <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              <p>Total Records: {viewMode === "PER_USER_SUMMARY" ? perUserSummaries.length : filteredRecords.length}</p>
              {currentCompany?.contactPhone && <p>Tel: {currentCompany.contactPhone}</p>}
              {currentCompany?.contactEmail && <p>Email: {currentCompany.contactEmail}</p>}
            </div>
          </div>
        </div>

        {/* Printable Table: Per-User Summary or Detailed Punches */}
        {viewMode === "PER_USER_SUMMARY" ? (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-900 text-slate-900 font-bold uppercase text-[10px]">
                <th className="py-2 px-1 text-center border border-slate-300 w-8">#</th>
                <th className="py-2 px-2 border border-slate-300">Personnel & Role</th>
                <th className="py-2 px-2 border border-slate-300">Department / Class</th>
                <th className="py-2 px-1 text-center border border-slate-300">Days Active</th>
                <th className="py-2 px-1 text-center border border-slate-300 bg-emerald-50">Present</th>
                <th className="py-2 px-1 text-center border border-slate-300 bg-amber-50">Late</th>
                <th className="py-2 px-1 text-center border border-slate-300 bg-rose-50">Absent</th>
                <th className="py-2 px-1 text-center border border-slate-300 bg-blue-50">Leave</th>
                <th className="py-2 px-1.5 text-center border border-slate-300">Total Hours</th>
                <th className="py-2 px-1.5 text-center border border-slate-300">Punctuality Rate</th>
              </tr>
            </thead>
            <tbody>
              {perUserSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-500 border border-slate-300">
                    No summary attendance records found.
                  </td>
                </tr>
              ) : (
                perUserSummaries.map((u, idx) => (
                  <tr key={u.code || idx} className="border-b border-slate-200">
                    <td className="py-1.5 px-1 text-center font-mono border border-slate-300">{idx + 1}</td>
                    <td className="py-1.5 px-2 border border-slate-300">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {u.personnelType} &bull; PIN: {u.code}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300">{u.deptOrClass}</td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold border border-slate-300">{u.totalRecords}</td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold text-emerald-800 border border-slate-300 bg-emerald-50/40">{u.present}</td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold text-amber-800 border border-slate-300 bg-amber-50/40">{u.late}</td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold text-rose-800 border border-slate-300 bg-rose-50/40">{u.absent}</td>
                    <td className="py-1.5 px-1 text-center font-mono font-bold text-blue-800 border border-slate-300 bg-blue-50/40">{u.onLeave}</td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold border border-slate-300">{u.totalHours}h</td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold border border-slate-300">{u.punctualityRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-900 text-slate-900 font-bold uppercase">
                <th className="py-2 px-1 text-center border border-slate-300 w-8">#</th>
                <th className="py-2 px-2 border border-slate-300">Date</th>
                <th className="py-2 px-2 border border-slate-300">Personnel & Role</th>
                <th className="py-2 px-2 border border-slate-300">Dept / Class</th>
                <th className="py-2 px-1 text-center border border-slate-300">S1 In</th>
                <th className="py-2 px-1 text-center border border-slate-300">S1 Out</th>
                <th className="py-2 px-1 text-center border border-slate-300">S2 In</th>
                <th className="py-2 px-1 text-center border border-slate-300">S2 Out</th>
                <th className="py-2 px-1 text-center border border-slate-300">Late</th>
                <th className="py-2 px-1 text-center border border-slate-300">Work</th>
                <th className="py-2 px-1.5 text-center border border-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => {
                const s1In = r.shift1CheckIn || r.firstCheckIn;
                const s1Out = r.shift1CheckOut;
                const s2In = r.shift2CheckIn;
                const s2Out = r.shift2CheckOut || (r.lastCheckOut && r.lastCheckOut !== r.shift1CheckOut ? r.lastCheckOut : null);
                return (
                  <tr key={r.id || idx} className="border-b border-slate-200">
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{idx + 1}</td>
                    <td className="py-1 px-2 font-mono border border-slate-300">{r.attendanceDate}</td>
                    <td className="py-1 px-2 border border-slate-300 font-semibold">{r.studentName || r.employeeName}</td>
                    <td className="py-1 px-2 border border-slate-300">{r.departmentName || `${r.studentGrade || ""} ${r.studentClassName || ""}`.trim()}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{s1In ? formatTime(s1In) : "--:--"}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{s1Out ? formatTime(s1Out) : "--:--"}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{s2In ? formatTime(s2In) : "--:--"}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{s2Out ? formatTime(s2Out) : "--:--"}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{r.lateMinutes > 0 ? `${r.lateMinutes}m` : "-"}</td>
                    <td className="py-1 px-1 text-center font-mono border border-slate-300">{r.totalWorkMinutes > 0 ? `${(r.totalWorkMinutes / 60).toFixed(1)}h` : "-"}</td>
                    <td className="py-1 px-1.5 text-center font-bold border border-slate-300">{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Printable Signature Section */}
        <div className="grid grid-cols-3 gap-8 pt-12 mt-8 text-center text-xs font-semibold break-inside-avoid">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-800">PREPARED BY</p>
            <div className="h-16"></div>
            <p className="border-t border-slate-400 pt-1 text-slate-600 font-normal">Attendance Registrar / Date</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-800">VERIFIED BY</p>
            <div className="h-16"></div>
            <p className="border-t border-slate-400 pt-1 text-slate-600 font-normal">HR / Academic Supervisor / Date</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-800">APPROVED BY</p>
            <div className="h-16"></div>
            <p className="border-t border-slate-400 pt-1 text-slate-600 font-normal">Institution Director / Seal</p>
          </div>
        </div>
      </div>
    </>
  );
}
