"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Key, Globe, Shield, Check, Copy, Send, Bell, Sparkles, AlertCircle, GraduationCap, Briefcase, BookOpen, Users, CheckCircle2, Plus, Trash2, Layers, Building2, Upload, Camera, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import api from "@/lib/api";
import KhmerPhoneInput from "@/components/common/KhmerPhoneInput";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["all-settings"],
    queryFn: async () => {
      const res = await api.get("/api/v1/settings");
      return res.data?.data || [];
    },
  });

  // Current Tenant Company Profile Query
  const { data: currentCompany, refetch: refetchCompany } = useQuery({
    queryKey: ["current-company-profile"],
    queryFn: async () => {
      const res = await api.get("/api/v1/companies/current");
      return res.data?.data || null;
    },
  });

  const [companyForm, setCompanyForm] = useState(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (currentCompany && !companyForm) {
      setCompanyForm({
        name: currentCompany.name || "",
        khmerName: currentCompany.khmerName || "",
        logoUrl: currentCompany.logoUrl || "",
        contactName: currentCompany.contactName || "",
        contactPhone: currentCompany.contactPhone || "",
        contactEmail: currentCompany.contactEmail || "",
        address: currentCompany.address || "",
      });
    }
  }, [currentCompany]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/api/v1/uploads/image", fd);
      const url = res.data?.data?.url;
      if (url) {
        setCompanyForm((prev) => ({ ...prev, logoUrl: url }));
      }
    } catch (err) {
      alert("Logo upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveCompany = async (e) => {
    if (e) e.preventDefault();
    if (!companyForm) return;
    setIsSavingCompany(true);
    setCompanyFeedback(null);
    try {
      await api.put("/api/v1/companies/current", companyForm);
      setCompanyFeedback({ type: "success", text: "✓ បានកែប្រែព័ត៌មានក្រុមហ៊ុន និង Logo ជោគជ័យ (Saved successfully)" });
      refetchCompany();
      queryClient.invalidateQueries(["companies-list"]);
    } catch (err) {
      setCompanyFeedback({ type: "error", text: "Error: " + (err.response?.data?.message || err.message) });
    } finally {
      setIsSavingCompany(false);
      setTimeout(() => setCompanyFeedback(null), 4000);
    }
  };

  // Telegram Settings Query
  const { data: tgSettings, refetch: refetchTg } = useQuery({
    queryKey: ["telegram-settings"],
    queryFn: async () => {
      const res = await api.get("/api/v1/telegram/settings");
      return res.data?.data || {};
    },
  });

  // Academic Years for selecting which academic year to pull classes from
  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years-settings"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/academic/years");
        const d = res.data?.data;
        return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
      } catch {
        return [];
      }
    },
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYear) {
      const current = academicYears.find((y) => y.isCurrent) || academicYears[0];
      setSelectedAcademicYear(current.code);
    }
  }, [academicYears, selectedAcademicYear]);

  // Available Student Classes for Telegram Assignment from Academic Classes by Academic Year
  const { data: availableClasses = [] } = useQuery({
    queryKey: ["student-classes", selectedAcademicYear],
    queryFn: async () => {
      const param = selectedAcademicYear ? `?academicYear=${encodeURIComponent(selectedAcademicYear)}` : "";
      const res = await api.get(`/api/v1/telegram/student-classes${param}`);
      return res.data?.data || [];
    },
  });

  const [tgForm, setTgForm] = useState(null);
  const [testingTarget, setTestingTarget] = useState(null);
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [tgFeedback, setTgFeedback] = useState(null);

  useEffect(() => {
    if (tgSettings && !tgForm) {
      let initialCustomGroups = Array.isArray(tgSettings.customGroups) ? [...tgSettings.customGroups] : [];
      const legacyChat = tgSettings.staffChatId || tgSettings.chatId;
      if (legacyChat && !initialCustomGroups.some((g) => g.chatId === legacyChat)) {
        initialCustomGroups.unshift({
          id: "grp_staffs",
          name: "Staffs Attendance Group (ក្រុមបុគ្គលិក)",
          chatId: legacyChat,
          target: "STAFF",
          enabled: true,
        });
      }

      setTgForm({
        enabled: tgSettings.enabled ?? false,
        botToken: tgSettings.botToken ?? "",
        notifyLateOnly: tgSettings.notifyLateOnly ?? false,
        customGroups: initialCustomGroups,
        studentClassGroups: Array.isArray(tgSettings.studentClassGroups) ? tgSettings.studentClassGroups : [],
      });
    }
  }, [tgSettings]);

  const handleAddClassGroup = (className = "") => {
    const existingClasses = (tgForm?.studentClassGroups || []).map((g) => g.className);
    const candidate = className || availableClasses.find((c) => !existingClasses.includes(c)) || (availableClasses[0] || "Class 8A");
    const newClassGroup = {
      id: "class_" + Date.now(),
      className: candidate,
      chatId: "",
      enabled: true,
    };
    setTgForm((prev) => ({
      ...prev,
      studentClassGroups: [...(prev?.studentClassGroups || []), newClassGroup],
    }));
  };

  const handleUpdateClassGroup = (index, field, value) => {
    setTgForm((prev) => {
      const updated = [...(prev?.studentClassGroups || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, studentClassGroups: updated };
    });
  };

  const handleDeleteClassGroup = (index) => {
    setTgForm((prev) => {
      const updated = (prev?.studentClassGroups || []).filter((_, i) => i !== index);
      return { ...prev, studentClassGroups: updated };
    });
  };

  const handleAutoPopulateClasses = () => {
    if (!availableClasses || availableClasses.length === 0) return;
    const existingMap = new Map((tgForm?.studentClassGroups || []).map((g) => [g.className?.toLowerCase(), g]));
    const combined = [...(tgForm?.studentClassGroups || [])];
    let addedCount = 0;
    for (const c of availableClasses) {
      if (!existingMap.has(c.toLowerCase())) {
        combined.push({
          id: "class_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          className: c,
          chatId: "",
          enabled: true,
        });
        addedCount++;
      }
    }
    setTgForm((prev) => ({ ...prev, studentClassGroups: combined }));
    if (addedCount > 0) {
      setTgFeedback({ type: "success", text: `✓ Auto-filled ${addedCount} classes from Academic Year ${selectedAcademicYear || 'current'}` });
      setTimeout(() => setTgFeedback(null), 3500);
    } else {
      setTgFeedback({ type: "success", text: `All ${availableClasses.length} classes from Academic Year ${selectedAcademicYear || 'current'} are already listed.` });
      setTimeout(() => setTgFeedback(null), 3500);
    }
  };

  const handleAddCustomGroup = () => {
    const newGroup = {
      id: "grp_" + Date.now(),
      name: "",
      chatId: "",
      target: "ALL",
      enabled: true,
    };
    setTgForm((prev) => ({
      ...prev,
      customGroups: [...(prev?.customGroups || []), newGroup],
    }));
  };

  const handleUpdateCustomGroup = (index, field, value) => {
    setTgForm((prev) => {
      const updated = [...(prev?.customGroups || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customGroups: updated };
    });
  };

  const handleDeleteCustomGroup = (index) => {
    setTgForm((prev) => {
      const updated = (prev?.customGroups || []).filter((_, i) => i !== index);
      return { ...prev, customGroups: updated };
    });
  };

  const handleSaveTg = async () => {
    if (!tgForm) return;
    setIsSavingTg(true);
    try {
      const payload = {
        ...tgForm,
        teacherChatId: "",
        staffChatId: "",
        studentChatId: "",
        chatId: "",
        notifyTeacher: false,
        notifyStaff: false,
        notifyStudent: false,
        notifyEmployee: false,
      };
      await api.post("/api/v1/telegram/settings", payload);
      setTgFeedback({ type: "success", text: "✓ Telegram settings and custom groups saved successfully" });
      const refreshed = await refetchTg();
      if (refreshed?.data) {
        setTgForm({
          enabled: refreshed.data.enabled ?? false,
          botToken: refreshed.data.botToken ?? "",
          notifyLateOnly: refreshed.data.notifyLateOnly ?? false,
          customGroups: Array.isArray(refreshed.data.customGroups) ? refreshed.data.customGroups : [],
          studentClassGroups: Array.isArray(refreshed.data.studentClassGroups) ? refreshed.data.studentClassGroups : [],
        });
      }
    } catch (err) {
      setTgFeedback({ type: "error", text: "Error saving: " + err.message });
    } finally {
      setIsSavingTg(false);
      setTimeout(() => setTgFeedback(null), 4000);
    }
  };

  const handleTestTg = async (target = "all", customName = "") => {
    setTestingTarget(target);
    const targetLabel = target === "teacher" ? "Teachers Group (ក្រុមគ្រូបង្រៀន)" :
                        target === "staff" ? "Staffs Group (ក្រុមបុគ្គលិក)" :
                        target === "student" ? "Students Group (ក្រុមសិស្ស)" :
                        target === "all" ? "All Configured Groups" :
                        (customName || "Custom Group");
    setTgFeedback({ type: "loading", text: `Sending test alert to ${targetLabel}...` });
    try {
      const res = await api.post(`/api/v1/telegram/test?target=${target}`);
      setTgFeedback({
        type: res.data?.data ? "success" : "error",
        text: res.data?.message || `Test completed for ${targetLabel}`,
      });
    } catch (err) {
      setTgFeedback({ type: "error", text: "Test failed: " + (err.response?.data?.message || err.message) });
    } finally {
      setTestingTarget(null);
      setTimeout(() => setTgFeedback(null), 6000);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put(`/api/v1/settings/${key}`, { value });
      setSaveFeedback(`✓ Setting '${key}' updated`);
      queryClient.invalidateQueries(["all-settings"]);
      setTimeout(() => setSaveFeedback(""), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const copyMisKey = () => {
    navigator.clipboard.writeText("mis-secret-api-key-enterprise-2026");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const findVal = (key, fallback) => {
    return settings?.find((s) => s.settingKey === key)?.settingValue || fallback;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System & Integration Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organization preferences, biometric protocol defaults, and external School MIS keys
          </p>
        </div>
        {saveFeedback && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            {saveFeedback}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Profile & Brand Identity Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ព័ត៌មានក្រុមហ៊ុន និង Logo (Company Profile & Branding)</span>
                  {currentCompany?.plan && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                      {currentCompany.plan} PLAN
                    </span>
                  )}
                  {currentCompany?.companyCode && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      code: {currentCompany.companyCode}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ផ្លាស់ប្តូរឈ្មោះក្រុមហ៊ុន ឡូហ្គោ លេខទូរស័ព្ទ និងអាសយដ្ឋានសម្រាប់បង្ហាញលើរបាយការណ៍ និង Header ប្រព័ន្ធ
                </p>
              </div>
            </div>

            {companyFeedback && (
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 animate-in fade-in ${
                  companyFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400"
                }`}
              >
                <span>{companyFeedback.text}</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-5">
            {/* Logo Upload Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                {companyForm?.logoUrl ? (
                  <img
                    src={companyForm.logoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-indigo-400 p-2 text-center">
                    <Building2 size={28} />
                    <span className="text-[9px] font-bold mt-1 text-slate-400">No Logo</span>
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                  Company Official Logo (ឡូហ្គោក្រុមហ៊ុន)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  គាំទ្រទម្រង់ PNG, JPG, SVG ឬ WebP (ទំហំល្អបំផុត៖ 256x256px ឬរូបច្បាស់កម្រិត HD)
                </p>
                <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer transition-all active:scale-95">
                    <Upload size={13} />
                    <span>{companyForm?.logoUrl ? "ប្តូរ Logo ថ្មី (Change)" : "Upload Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {companyForm?.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm({ ...companyForm, logoUrl: "" })}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      លុប Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Company Legal Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation Ltd."
                  value={companyForm?.name || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ឈ្មោះក្រុមហ៊ុនជាភាសាខ្មែរ (Khmer Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ក្រុមហ៊ុន អាក់មី ឯ.ក"
                  value={companyForm?.khmerName || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, khmerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Person (អ្នកទទួលបន្ទុក)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sok Dara"
                  value={companyForm?.contactName || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number (លេខទូរស័ព្ទ)
                </label>
                <KhmerPhoneInput
                  value={companyForm?.contactPhone || ""}
                  onChange={(val) => setCompanyForm({ ...companyForm, contactPhone: val })}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Official Email (អ៊ីមែលផ្លូវការ)
                </label>
                <input
                  type="email"
                  placeholder="e.g. hr@company.com"
                  value={companyForm?.contactEmail || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Office / Campus Address (អាសយដ្ឋាន)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phnom Penh, Cambodia"
                  value={companyForm?.address || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSavingCompany}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSavingCompany ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>រក្សាទុកព័ត៌មានក្រុមហ៊ុន (Save Company Info)</span>
              </button>
            </div>
          </form>
        </div>

        {/* General Settings Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Globe size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">General & Timezone</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Organization Display Name
              </label>
              <input
                type="text"
                defaultValue={findVal("COMPANY_NAME", "Enterprise Biometrics Organization")}
                onBlur={(e) => updateSetting("COMPANY_NAME", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Operational Timezone
              </label>
              <input
                type="text"
                readOnly
                value="Asia/Phnom_Penh (UTC+07:00)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">UTC storage with Phnom Penh local calculation.</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Standard Late Arrival Grace Period (Minutes)
              </label>
              <input
                type="number"
                defaultValue={findVal("LATE_GRACE_MINUTES", "15")}
                onBlur={(e) => updateSetting("LATE_GRACE_MINUTES", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* School MIS Integration Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Key size={18} className="text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">School MIS Integration Layer</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                MIS Webhook Synchronization Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="mis-secret-api-key-enterprise-2026"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300"
                />
                <button
                  onClick={copyMisKey}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Pass this header as <code>X-MIS-API-KEY</code> in external MIS webhooks.</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                MIS Sync Webhook Endpoint
              </label>
              <input
                type="text"
                readOnly
                value="/api/v1/mis/webhook/sync-personnel"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-indigo-600 font-semibold"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block">External MIS Compatibility</span>
              <p>Supports teacher synchronization, class grade assignments, and student roster imports with conflict resolution.</p>
            </div>
          </div>
        </div>

        {/* Telegram Attendance Bot Card - 3 Dedicated Groups */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 shadow-xs">
                <Send size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Telegram Attendance Bot & 3-Group Alerts</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                    Instant Push
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                    3 Dedicated Groups
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Route real-time punch notifications into 3 distinct Telegram groups: <b>Teachers</b>, <b>Staffs</b>, and <b>Students</b> with auto-categorization
                </p>
              </div>
            </div>

            {tgFeedback && (
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 animate-fade-in ${
                  tgFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                    : tgFeedback.type === "loading"
                    ? "bg-sky-50 text-sky-600 border-sky-200 animate-pulse"
                    : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400"
                }`}
              >
                <span>{tgFeedback.text}</span>
              </span>
            )}
          </div>

          {/* Master Bot Configuration */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-xs">
                  Enable Real-Time Telegram Broadcast System
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Master switch to dispatch instant Telegram notifications when employees, teachers, or students punch
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTgForm((prev) => ({ ...prev, enabled: !prev?.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer self-start sm:self-auto shrink-0 ${
                  tgForm?.enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    tgForm?.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="font-semibold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                Telegram Bot API Token *
              </label>
              <input
                type="text"
                placeholder="e.g. 7123456789:AAFlkjhsdf892374jhksdf..."
                value={tgForm?.botToken || ""}
                onChange={(e) => setTgForm({ ...tgForm, botToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                One bot token connects to all your Telegram groups. Add your bot as <b>Administrator</b> to each Telegram group (Student Class Groups or Custom Groups below). Create a free bot with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">@BotFather</a>.
              </p>
            </div>
          </div>

          {/* Student Class Telegram Groups (Manual assignment by Class) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Student Telegram Groups by Class (ចាត់តាំង Telegram តាមថ្នាក់សិស្ស)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold">
                      {(tgForm?.studentClassGroups || []).length} { (tgForm?.studentClassGroups || []).length === 1 ? 'Class' : 'Classes' }
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ចាត់តាំង Telegram Group ដោយដៃតាមថ្នាក់នីមួយៗ (Class 8A, 10A, 12B...) ដើម្បីឱ្យអាណាព្យាបាល និងគ្រូប្រចាំថ្នាក់ទទួលបានវត្តមានសិស្សក្នុងថ្នាក់នោះ (បុគ្គលិក និងគ្រូមិនបាច់ទេ)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {academicYears.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year:</span>
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.code}>
                          {y.code} {y.isCurrent ? "★ (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAutoPopulateClasses}
                  disabled={availableClasses.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title={`Add all classes from Academic Year ${selectedAcademicYear || 'current'} at once`}
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Auto-fill Classes ({availableClasses.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddClassGroup()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>+ Add Class Group</span>
                </button>
              </div>
            </div>

            {/* Class Groups List */}
            {(!tgForm?.studentClassGroups || tgForm.studentClassGroups.length === 0) ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <GraduationCap size={28} className="mx-auto text-slate-400 opacity-60" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  មិនទាន់មានការចាត់តាំង Telegram តាមថ្នាក់សិស្សនៅឡើយទេ។ ចុច <b>"+ Add Class Group"</b> ឬ <b>"Auto-fill Classes"</b> ដើម្បីចាត់តាំងតាមថ្នាក់។
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tgForm.studentClassGroups.map((group, idx) => (
                  <div
                    key={group.id || idx}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {group.className || `Class #${idx + 1}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteClassGroup(idx)}
                        title="Remove Class Group"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {/* Select / Enter Class */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ថ្នាក់ (Class Name) *
                        </label>
                        {availableClasses.length > 0 ? (
                          <select
                            value={group.className || ""}
                            onChange={(e) => handleUpdateClassGroup(idx, "className", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          >
                            {availableClasses.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            {!availableClasses.includes(group.className) && group.className && (
                              <option value={group.className}>{group.className} (Custom)</option>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Class 8A"
                            value={group.className || ""}
                            onChange={(e) => handleUpdateClassGroup(idx, "className", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        )}
                      </div>

                      {/* Telegram Group Chat ID */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Telegram Group Chat ID *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. -1005316595198"
                          value={group.chatId || ""}
                          onChange={(e) => handleUpdateClassGroup(idx, "chatId", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Active Toggle Switch */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          Active Class Alerts
                        </span>
                        <input
                          type="checkbox"
                          checked={group.enabled ?? true}
                          onChange={(e) => handleUpdateClassGroup(idx, "enabled", e.target.checked)}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Test Class Alert Button */}
                    <button
                      type="button"
                      disabled={testingTarget !== null || !group.chatId}
                      onClick={() => handleTestTg("class_" + (group.id || group.className), `Class ${group.className}`)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/50 dark:hover:bg-cyan-800 text-cyan-700 dark:text-cyan-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={12} className={testingTarget === ("class_" + (group.id || group.className)) ? "animate-spin" : ""} />
                      <span>{testingTarget === ("class_" + (group.id || group.className)) ? "Testing..." : `Test ${group.className || "Class"} Group`}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Unlimited Custom Telegram Groups Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Custom Alert Groups & Channels</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-semibold">
                      {(tgForm?.customGroups || []).length} Custom { (tgForm?.customGroups || []).length === 1 ? 'Group' : 'Groups' }
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    បន្ថែមក្រុម Telegram តាមចិត្ត (សាខាទី២, ថ្នាក់ដឹកនាំ, សន្តិសុខ, អាណាព្យាបាល...) ដោយគ្មានកំណត់
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomGroup}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>+ Add Telegram Group</span>
              </button>
            </div>

            {/* Custom Groups List */}
            {(!tgForm?.customGroups || tgForm.customGroups.length === 0) ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  មិនទាន់មានក្រុមបន្ថែមនៅឡើយទេ។ ចុច <b>"+ Add Telegram Group"</b> ដើម្បីបន្ថែមក្រុមថ្មីតាមតម្រូវការ។
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomGroup}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400 underline cursor-pointer"
                >
                  Create your first custom alert channel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tgForm.customGroups.map((group, idx) => (
                  <div
                    key={group.id || idx}
                    className="p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/20 flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Name input + Delete button */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Campus 2, Security Team"
                          value={group.name || ""}
                          onChange={(e) => handleUpdateCustomGroup(idx, "name", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 font-bold text-xs text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomGroup(idx)}
                          title="Delete Group"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Chat / Channel ID */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Group / Channel ID *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. -1009876543210"
                          value={group.chatId || ""}
                          onChange={(e) => handleUpdateCustomGroup(idx, "chatId", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Target Audience Filter */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Target Personnel Filter
                        </label>
                        <select
                          value={group.target || "ALL"}
                          onChange={(e) => handleUpdateCustomGroup(idx, "target", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          <option value="ALL">🌐 All Personnel (បុគ្គលិក & សិស្សទាំងអស់)</option>
                          <option value="TEACHER">👨‍🏫 Teachers Only (លោកគ្រូ-អ្នកគ្រូ)</option>
                          <option value="STAFF">💼 Staffs Only (បុគ្គលិកទូទៅ)</option>
                          <option value="STUDENT">🎓 Students Only (សិស្សានុសិស្ស)</option>
                        </select>
                      </div>

                      {/* Active Toggle Switch */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          Active Notifications
                        </span>
                        <input
                          type="checkbox"
                          checked={group.enabled ?? true}
                          onChange={(e) => handleUpdateCustomGroup(idx, "enabled", e.target.checked)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Test Button */}
                    <button
                      type="button"
                      disabled={testingTarget !== null || !group.chatId}
                      onClick={() => handleTestTg(group.id, group.name)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/50 dark:hover:bg-violet-800 text-violet-700 dark:text-violet-300 font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={12} className={testingTarget === group.id ? "animate-spin" : ""} />
                      <span>{testingTarget === group.id ? "Testing..." : `Test ${group.name || "Group"}`}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Filter & Action Controls */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
              <input
                type="checkbox"
                checked={tgForm?.notifyLateOnly ?? false}
                onChange={(e) => setTgForm({ ...tgForm, notifyLateOnly: e.target.checked })}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Only notify when Arrival is Late (After Grace Period)
              </span>
            </label>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => handleTestTg("all")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} className={testingTarget === "all" ? "animate-spin text-sky-500" : "text-sky-500"} />
                <span>{testingTarget === "all" ? "Testing All..." : "Test All Groups"}</span>
              </button>

              <button
                type="button"
                disabled={isSavingTg}
                onClick={handleSaveTg}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{isSavingTg ? "Saving..." : "Save Telegram Config"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

