"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Cpu,
  Users,
  Edit,
  PowerOff,
  Radio,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Upload,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import api from "@/lib/api";
import Portal from "@/components/common/Portal";
import KhmerPhoneInput from "@/components/common/KhmerPhoneInput";

export default function CompaniesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateAdminPassword, setShowCreateAdminPassword] = useState(false);

  // Standalone Admin Management Modal
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTargetCompany, setAdminTargetCompany] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
  });
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Credential presentation modal (after create or reset)
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [createdCredentialData, setCreatedCredentialData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const generateStrongPassword = () => {
    const specials = "!@#$%&*";
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnpqrstuvwxyz";
    const nums = "23456789";
    const all = specials + uppers + lowers + nums;
    let pwd = "";
    pwd += uppers.charAt(Math.floor(Math.random() * uppers.length));
    pwd += lowers.charAt(Math.floor(Math.random() * lowers.length));
    pwd += nums.charAt(Math.floor(Math.random() * nums.length));
    pwd += specials.charAt(Math.floor(Math.random() * specials.length));
    for (let i = 0; i < 8; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length));
    }
    return pwd;
  };

  const copyToClipboard = (text, fieldKey) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const [activeCompanyCode, setActiveCompanyCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active_company_code") || "default";
    }
    return "default";
  });

  const [formData, setFormData] = useState({
    companyCode: "",
    name: "",
    khmerName: "",
    logoUrl: "",
    plan: "PRO",
    status: "ACTIVE",
    maxUsers: 500,
    maxDevices: 10,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    licenseExpiresAt: "",
    adminUsername: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
  });

  // Query all companies (Super Admin only)
  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/companies");
      return res.data?.data || [];
    },
    enabled: Boolean(isSuperAdmin),
    staleTime: 10000,
  });

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.khmerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.companyCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contactName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlan = selectedPlan === "ALL" || c.plan === selectedPlan;
      return matchSearch && matchPlan;
    });
  }, [companies, searchQuery, selectedPlan]);

  // Overall metrics
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status === "ACTIVE").length;
    const totalEmployees = companies.reduce((acc, c) => acc + (c.employeeCount || 0), 0);
    const totalDevices = companies.reduce((acc, c) => acc + (c.deviceCount || 0), 0);
    return { total, active, totalEmployees, totalDevices };
  }, [companies]);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    const pwd = generateStrongPassword();
    setFormData({
      companyCode: "",
      name: "",
      khmerName: "",
      logoUrl: "",
      plan: "PRO",
      status: "ACTIVE",
      maxUsers: 500,
      maxDevices: 10,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      licenseExpiresAt: "",
      adminUsername: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: pwd,
    });
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingCompany(c);
    setFormData({
      companyCode: c.companyCode,
      name: c.name || "",
      khmerName: c.khmerName || "",
      logoUrl: c.logoUrl || "",
      plan: c.plan || "PRO",
      status: c.status || "ACTIVE",
      maxUsers: c.maxUsers || 500,
      maxDevices: c.maxDevices || 10,
      contactName: c.contactName || "",
      contactPhone: c.contactPhone || "",
      contactEmail: c.contactEmail || "",
      address: c.address || "",
      licenseExpiresAt: c.licenseExpiresAt ? c.licenseExpiresAt.substring(0, 10) : "",
      adminUsername: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setFeedback(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingCompany) {
        await api.put(`/api/v1/companies/${editingCompany.id}`, {
          name: formData.name,
          khmerName: formData.khmerName,
          logoUrl: formData.logoUrl,
          plan: formData.plan,
          status: formData.status,
          maxUsers: Number(formData.maxUsers),
          maxDevices: Number(formData.maxDevices),
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
          address: formData.address,
          licenseExpiresAt: formData.licenseExpiresAt ? new Date(formData.licenseExpiresAt).toISOString() : null,
        });
        setFeedback({ type: "success", text: "✓ បានកែប្រែទិន្នន័យក្រុមហ៊ុនជោគជ័យ (Company updated successfully)" });
        queryClient.invalidateQueries(["companies-list"]);
        setTimeout(() => {
          setModalOpen(false);
        }, 900);
      } else {
        const payload = {
          companyCode: formData.companyCode,
          name: formData.name,
          khmerName: formData.khmerName,
          logoUrl: formData.logoUrl,
          plan: formData.plan,
          status: formData.status,
          maxUsers: Number(formData.maxUsers),
          maxDevices: Number(formData.maxDevices),
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
          address: formData.address,
          licenseExpiresAt: formData.licenseExpiresAt ? new Date(formData.licenseExpiresAt).toISOString() : null,
          adminUsername: formData.adminUsername?.trim() || null,
          adminFullName: formData.adminFullName?.trim() || null,
          adminEmail: formData.adminEmail?.trim() || null,
          adminPassword: formData.adminPassword?.trim() || null,
        };

        const res = await api.post("/api/v1/companies", payload);
        const created = res.data?.data;
        queryClient.invalidateQueries(["companies-list"]);

        if (created?.adminUsername) {
          setModalOpen(false);
          setCreatedCredentialData({
            companyCode: created.companyCode,
            companyName: created.name,
            username: created.adminUsername,
            email: created.adminEmail,
            password: created.initialAdminPassword || formData.adminPassword,
          });
          setCredentialModalOpen(true);
        } else {
          setFeedback({ type: "success", text: "✓ បានចុះឈ្មោះក្រុមហ៊ុនថ្មីជោគជ័យ (New company registered successfully)" });
          setTimeout(() => {
            setModalOpen(false);
          }, 900);
        }
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.response?.data?.message || err.message || "Operation failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdminModal = (company) => {
    setAdminTargetCompany(company);
    const pwd = generateStrongPassword();
    setAdminFormData({
      username: company.adminUsername || `${company.companyCode}_admin`,
      fullName: company.contactName || `${company.name} Administrator`,
      email: company.adminEmail || company.contactEmail || `admin@${company.companyCode}.com`,
      password: pwd,
    });
    setAdminFeedback(null);
    setAdminModalOpen(true);
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminTargetCompany) return;
    setIsAdminSubmitting(true);
    setAdminFeedback(null);
    try {
      const res = await api.post(`/api/v1/companies/${adminTargetCompany.companyCode}/admin`, {
        username: adminFormData.username.trim(),
        fullName: adminFormData.fullName.trim(),
        email: adminFormData.email.trim(),
        password: adminFormData.password.trim(),
      });
      const data = res.data?.data;
      setAdminModalOpen(false);
      setCreatedCredentialData({
        companyCode: adminTargetCompany.companyCode,
        companyName: adminTargetCompany.name,
        username: data?.username || data?.adminUsername || adminFormData.username,
        email: data?.email || data?.adminEmail || adminFormData.email,
        password: adminFormData.password,
      });
      setCredentialModalOpen(true);
      queryClient.invalidateQueries(["companies-list"]);
    } catch (err) {
      setAdminFeedback({
        type: "error",
        text: err.response?.data?.message || err.message || "Failed to create/reset company administrator",
      });
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleToggleStatus = async (c) => {
    if (c.companyCode === "default") {
      alert("ក្រុមហ៊ុនគោល (Default Main HQ) មិនអាចបិទបានទេ!");
      return;
    }
    try {
      await api.patch(`/api/v1/companies/${c.id}/toggle-status`);
      queryClient.invalidateQueries(["companies-list"]);
    } catch (err) {
      alert("Toggle status failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSwitchActiveCompany = (companyCode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_company_code", companyCode);
      setActiveCompanyCode(companyCode);
    }
    // Invalidate main queries so all pages reload with new company header
    queryClient.invalidateQueries();
    window.location.reload();
  };

  // Route Guard: Restrict to System Super Admin
  if (user && !isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl shadow-sm border border-amber-200 dark:border-amber-800">
          🔒
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted / មិនមានសិទ្ធិចូលប្រើ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            The SaaS Multi-Tenant Management Console is exclusively accessible by Platform Super Administrators.
            To manage your company profile, branding, and logo, please visit Company Settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push("/settings/company")}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            My Company Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40">
        <div className="flex items-center gap-4">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 shrink-0">
            <Building2 size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Multi-Tenant Companies & Clients
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                SAAS CLOUD ARCHITECTURE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              គ្រប់គ្រងក្រុមហ៊ុនអតិថិជន កំណត់កូតាឧបករណ៍ និងញែកទិន្នន័យបុគ្គលិកដាច់ដោយឡែកពីគ្នា
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Reload Data"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>+ ចុះឈ្មោះក្រុមហ៊ុនថ្មី (New Client)</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Building2 size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              ក្រុមហ៊ុនសរុប (Total Companies)
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              កំពុងដំណើរការ (Active Clients)
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 shrink-0">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalEmployees}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              បុគ្គលិក Cloud សរុប (Personnel)
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
            <Cpu size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalDevices}
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              ម៉ាស៊ីន ZKTeco ភ្ជាប់ (Terminals)
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full sm:max-w-md h-10 flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
          <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ ឬ Company Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:outline-none focus:ring-0 p-0 leading-normal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ENTERPRISE", "PRO", "STARTER", "TRIAL"].map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedPlan === plan
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {plan === "ALL" ? "All Plans" : plan}
            </button>
          ))}
        </div>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-xs font-semibold">កំពុងទាញទិន្នន័យក្រុមហ៊ុន Cloud...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Building2 size={36} className="mx-auto text-slate-400" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">រកមិនឃើញក្រុមហ៊ុន</h4>
          <p className="text-xs text-slate-400">មិនមានក្រុមហ៊ុនណាត្រូវនឹងការស្វែងរករបស់អ្នកឡើយ។</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredCompanies.map((c) => {
            const isCurrentActive = activeCompanyCode === c.companyCode;

            return (
              <div
                key={c.id}
                className={`relative rounded-3xl p-5 border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                  isCurrentActive
                    ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/80 ring-2 ring-indigo-500/30"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Current Active Badge */}
                {isCurrentActive && (
                  <div className="absolute -top-2.5 right-5 px-3 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] shadow-md tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>ACTIVE CURRENT CONTEXT</span>
                  </div>
                )}

                {/* Top: Logo & Title */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                          {c.name}
                        </h3>
                        {c.khmerName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {c.khmerName}
                          </p>
                        )}
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          code: {c.companyCode}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 border ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {/* Quota meters */}
                  <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        បុគ្គលិក / Users:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {c.employeeCount || 0} / {c.maxUsers}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Cpu size={14} className="text-slate-400" />
                        ម៉ាស៊ីន ZKTeco:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {c.deviceCount || 0} / {c.maxDevices}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500" />
                        Subscription Plan:
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                        {c.plan}
                      </span>
                    </div>

                    {c.contactPhone && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {c.contactName || "Contact"}:
                        </span>
                        <span className="font-mono">{c.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="កែប្រែទិន្នន័យក្រុមហ៊ុន (Edit Company)"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      onClick={() => handleOpenAdminModal(c)}
                      className="p-2 rounded-xl text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      title="បង្កើត / កំណត់ Admin ក្រុមហ៊ុន (Create/Reset Company Admin)"
                    >
                      <Key size={15} />
                    </button>

                    {c.companyCode !== "default" && (
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          c.status === "ACTIVE"
                            ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        }`}
                        title={c.status === "ACTIVE" ? "Suspend Company" : "Activate Company"}
                      >
                        <PowerOff size={15} />
                      </button>
                    )}
                  </div>

                  {isCurrentActive ? (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      <span>កំពុងមើល</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSwitchActiveCompany(c.companyCode)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    >
                      <span>🔄 ប្តូរមកក្រុមហ៊ុននេះ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Company Modal */}
      {modalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {editingCompany ? "កែប្រែទិន្នន័យក្រុមហ៊ុន (Edit Company)" : "ចុះឈ្មោះក្រុមហ៊ុនថ្មី (Register Client Company)"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      SaaS Multi-Tenant Account & Quota Provisioning
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Company Code (Slug) *
                    </label>
                    <input
                      type="text"
                      disabled={Boolean(editingCompany)}
                      required
                      placeholder="e.g. aba_bank, rupp"
                      value={formData.companyCode}
                      onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                    />
                    <span className="text-[10px] text-slate-400">Unique identifier for sub-domain and database partitioning.</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Subscription Plan *
                    </label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="TRIAL">TRIAL (14 Days Demo)</option>
                      <option value="STARTER">STARTER (Up to 50 Users)</option>
                      <option value="PRO">PRO (Up to 500 Users)</option>
                      <option value="ENTERPRISE">ENTERPRISE (Unlimited)</option>
                    </select>
                  </div>
                </div>

                {/* Logo Uploader */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <Building2 size={22} className="text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Company Logo</span>
                    <span className="text-[10px] text-slate-400 block mb-1">PNG, JPG, SVG or WebP</span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm cursor-pointer active:scale-95 transition-all">
                      <Upload size={12} />
                      <span>{formData.logoUrl ? "Change Logo" : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fd = new FormData();
                            fd.append("file", file);
                            const res = await api.post("/api/v1/uploads/image", fd);
                            if (res.data?.data?.url) {
                              setFormData({ ...formData, logoUrl: res.data.data.url });
                            }
                          } catch (err) {
                            alert("Upload logo failed: " + err.message);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Company Legal Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation Ltd."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ឈ្មោះជាភាសាខ្មែរ (Khmer Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ក្រុមហ៊ុន អាក់មី ឯ.ក"
                      value={formData.khmerName}
                      onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Max Users Quota
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Max ZKTeco Devices Quota
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={formData.maxDevices}
                      onChange={(e) => setFormData({ ...formData, maxDevices: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sok Dara"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contact Phone
                    </label>
                    <KhmerPhoneInput
                      compact
                      value={formData.contactPhone}
                      onChange={(val) => setFormData({ ...formData, contactPhone: val })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. hr@company.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Provision Initial Company Admin (Create Mode Only) */}
                {!editingCompany && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                        <ShieldCheck size={16} />
                        <span>បង្កើតគណនី Admin ក្រុមហ៊ុនដំបូង (Initial Company Administrator)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = generateStrongPassword();
                          const slug = formData.companyCode ? formData.companyCode.trim().toLowerCase() : "company";
                          setFormData((prev) => ({
                            ...prev,
                            adminPassword: pwd,
                            adminUsername: prev.adminUsername || `${slug}_admin`,
                            adminEmail: prev.adminEmail || prev.contactEmail || `admin@${slug}.com`,
                            adminFullName: prev.adminFullName || prev.contactName || `${formData.name || "Company"} Admin`,
                          }));
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 cursor-pointer"
                      >
                        <span>🎲 បង្កើត Password ស្វ័យប្រវត្តិ</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      គណនីនេះនឹងទទួលបានសិទ្ធិ Role <b>ADMIN</b> គ្រប់គ្រងពេញលេញលើបុគ្គលិក ម៉ាស៊ីន និងរបាយការណ៍របស់ក្រុមហ៊ុននេះ (ទិន្នន័យដាច់ដោយឡែក)។
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Admin Username *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. aba_admin"
                          value={formData.adminUsername}
                          onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Admin Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sok Dara"
                          value={formData.adminFullName}
                          onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Admin Email *
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. admin@abamb.com.kh"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Initial Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showCreateAdminPassword ? "text" : "password"}
                            placeholder="Password"
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                            className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreateAdminPassword(!showCreateAdminPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showCreateAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      feedback.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.text}</span>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    <span>{editingCompany ? "រក្សាទុក (Save Changes)" : "បង្កើតក្រុមហ៊ុន (Register Company)"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Standalone Create / Reset Company Admin Modal */}
      {adminModalOpen && adminTargetCompany && (
        <Portal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      កំណត់ Company Super Admin (Admin Provisioning)
                    </h3>
                    <p className="text-xs text-slate-400">
                      ក្រុមហ៊ុន: <span className="font-bold text-indigo-600 dark:text-indigo-400">{adminTargetCompany.name}</span> ({adminTargetCompany.companyCode})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setAdminModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={14} />
                    <span>
                      {adminTargetCompany?.adminUsername 
                        ? `ផ្លាស់ប្តូរ Password សម្រាប់ Admin (Reset Password)` 
                        : `បង្កើតគណនី Admin ថ្មីសម្រាប់ក្រុមហ៊ុន`}
                    </span>
                  </div>
                  <span>
                    {adminTargetCompany?.adminUsername 
                      ? `គណនី '${adminTargetCompany.adminUsername}' នឹងត្រូវបានកំណត់ Password ថ្មីដោយជោគជ័យ។`
                      : `ប្រសិនបើ Username ឬ Email នេះមានរួចហើយ ប្រព័ន្ធនឹងធ្វើការផ្លាស់ប្តូរ Password ថ្មីដោយស្វ័យប្រវត្តិ។`}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFormData.username}
                    onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ឈ្មោះពេញ (Full Name)
                  </label>
                  <input
                    type="text"
                    value={adminFormData.fullName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    អ៊ីមែល (Email) *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password ថ្មី *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminFormData((prev) => ({ ...prev, password: generateStrongPassword() }))}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      🎲 បង្កើត Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {adminFeedback && (
                  <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <AlertCircle size={16} />
                    <span>{adminFeedback.text}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAdminModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>

                  <button
                    type="submit"
                    disabled={isAdminSubmitting}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAdminSubmitting && <Loader2 size={14} className="animate-spin" />}
                    <span>💾 {adminTargetCompany?.adminUsername ? "ផ្លាស់ប្តូរ Password (Update Password)" : "រក្សាទុក Admin (Save Admin Account)"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Credential Presentation Modal (After creation/reset) */}
      {credentialModalOpen && createdCredentialData && (
        <Portal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white text-center relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-2xl shadow-lg mb-3">
                  🎉
                </div>
                <h3 className="font-black text-lg sm:text-xl">បានកំណត់ / បង្កើតគណនី Admin ជោគជ័យ!</h3>
                <p className="text-xs text-indigo-200 mt-1">
                  ព័ត៌មានគណនីគ្រប់គ្រងសម្រាប់ {createdCredentialData.companyName}
                </p>

                <button
                  onClick={() => setCredentialModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Credential Rows */}
              <div className="p-6 space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                  {/* Company */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400">ក្រុមហ៊ុន (Company):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {createdCredentialData.companyName}{" "}
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">
                        ({createdCredentialData.companyCode})
                      </span>
                    </span>
                  </div>

                  {/* Login URL */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400">Login URL:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            typeof window !== "undefined" ? `${window.location.origin}/login` : "/login",
                            "url"
                          )
                        }
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        title="Copy Login URL"
                      >
                        {copiedField === "url" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400">Username:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {createdCredentialData.username}
                      </span>
                      <button
                        onClick={() => copyToClipboard(createdCredentialData.username, "username")}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        title="Copy Username"
                      >
                        {copiedField === "username" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  {createdCredentialData.email && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400">Email:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {createdCredentialData.email}
                        </span>
                        <button
                          onClick={() => copyToClipboard(createdCredentialData.email, "email")}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedField === "email" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Password:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                        {createdCredentialData.password}
                      </span>
                      <button
                        onClick={() => copyToClipboard(createdCredentialData.password, "password")}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedField === "password" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-700 dark:text-blue-300">
                  💡 <b>កំណត់សម្គាល់៖</b> សូមចម្លងពាក្យសម្ងាត់នេះផ្ញើជូនអតិថិជនឥឡូវនេះ។ នៅពេលពួកគាត់ Login ពួកគាត់នឹងមើលឃើញតែទិន្នន័យរបស់ក្រុមហ៊ុនពួកគាត់ប៉ុណ្ណោះ។
                </div>

                {/* Copy All Button */}
                <button
                  type="button"
                  onClick={() => {
                    const text = `🎉 ZKTeco Multi-Tenant Login Credentials\n\nCompany: ${createdCredentialData.companyName} (${createdCredentialData.companyCode})\nLogin Portal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nUsername: ${createdCredentialData.username}\nEmail: ${createdCredentialData.email || "N/A"}\nPassword: ${createdCredentialData.password}\n\nPlease keep your credentials safe and change password after first login.`;
                    copyToClipboard(text, "all");
                  }}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    copiedField === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {copiedField === "all" ? (
                    <>
                      <Check size={15} />
                      <span>✓ បានចម្លងព័ត៌មានទាំងអស់រួចរាល់! (Copied to Clipboard)</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>📋 ចម្លងព័ត៌មានគណនីទាំងអស់ (Copy Full Credentials to Send Client)</span>
                    </>
                  )}
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setCredentialModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    រួចរាល់ (Done)
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

