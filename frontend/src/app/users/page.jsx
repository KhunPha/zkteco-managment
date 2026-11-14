"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, Trash2, Search, RefreshCw, Key, Building2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatTime } from "@/lib/utils";
import ImageUploadDropzone from "@/components/common/ImageUploadDropzone";
import Portal from "@/components/common/Portal";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(() => (isSuperAdmin ? "all" : (user?.companyCode || "default")));
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    profileImageUrl: "",
    companyCode: user?.companyCode || "default",
    roles: ["ADMIN"],
  });

  const { data: companiesList = [] } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/companies");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(isSuperAdmin),
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const res = await api.get("/api/v1/roles");
      return res.data?.data || [];
    },
  });

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ["users", search, selectedCompany],
    queryFn: async () => {
      let url = `/api/v1/users?search=${encodeURIComponent(search)}`;
      if (selectedCompany && selectedCompany !== "all") {
        url += `&companyCode=${encodeURIComponent(selectedCompany)}`;
      }
      const res = await api.get(url);
      return res.data?.data;
    },
  });

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormError("");
    setFormData({
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      profileImageUrl: "",
      companyCode: user?.companyCode || "default",
      roles: ["ADMIN"],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUserId(u.id);
    setFormError("");
    setFormData({
      username: u.username,
      email: u.email,
      password: "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      profileImageUrl: u.profileImageUrl || "",
      companyCode: u.companyCode || "default",
      roles: u.roles?.length ? [u.roles[0]] : ["ADMIN"],
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    try {
      if (editingUserId) {
        const updatePayload = {
          email: formData.email.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          profileImageUrl: formData.profileImageUrl,
          companyCode: formData.companyCode,
          roles: formData.roles,
        };
        if (formData.password && formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }
        await api.put(`/api/v1/users/${editingUserId}`, updatePayload);
      } else {
        await api.post("/api/v1/users", formData);
      }
      queryClient.invalidateQueries(["users"]);
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || "Failed to save user account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to deactivate this user account?")) return;
    try {
      await api.delete(`/api/v1/users/${id}`);
      queryClient.invalidateQueries(["users"]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const users = usersData?.content || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Accounts & Roles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            RBAC administrators, HR staff, and supervisor security credentials
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Create User</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="h-10 flex items-center gap-2.5 flex-1 min-w-[200px] max-w-sm px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
            <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none select-none" />
            <input
              type="text"
              placeholder="Search username, email, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 font-medium p-0 leading-normal"
            />
          </div>

          {isSuperAdmin ? (
            <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
              <Building2 size={15} className="text-slate-400 shrink-0 pointer-events-none" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-0 font-semibold cursor-pointer p-0"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🏢 All Companies / Tenants</option>
                {companiesList.map((c) => (
                  <option key={c.companyCode} value={c.companyCode} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    🏢 {c.name} ({c.companyCode})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="h-10 flex items-center gap-2 px-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Building2 size={15} />
              <span>ស្ថាប័ន: {user?.companyCode}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 self-end sm:self-auto rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Refresh Users List"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Company Tenant</th>
                <th className="py-3 px-4">Roles</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading user accounts...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const company = companiesList.find((c) => c.companyCode === u.companyCode);
                  const companyName = company ? company.name : (u.companyCode || "default");

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} alt={u.username} className="w-full h-full object-cover" />
                            ) : (
                              u.username ? u.username[0].toUpperCase() : "U"
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.username}</span>
                            <span className="text-[10px] text-slate-400">{u.fullName || "User"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          <Building2 size={12} className="text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{companyName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r === "SUPER_ADMIN"
                                  ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                                  : r === "ADMIN"
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {r === "SUPER_ADMIN" ? "👑 SUPER_ADMIN (Owner)" : r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {u.lastLoginAt ? formatTime(u.lastLoginAt) : "Never"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.active
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-rose-50 text-rose-600 border border-rose-200"
                        }`}>
                          {u.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(!u.roles?.includes("SUPER_ADMIN") || isSuperAdmin) && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-colors"
                              title="កែប្រែ / ប្តូរ Password (Edit User / Reset Password)"
                            >
                              <Key size={15} />
                            </button>
                          )}
                          {u.username !== "admin" && (!u.roles?.includes("SUPER_ADMIN") || isSuperAdmin) && (
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                              title="Deactivate User"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {/* Modal: Create User */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md my-auto max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUserId ? "Edit User / Reset Password" : "Create User Account"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3.5 text-xs">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold">
                    {formError}
                  </div>
                )}

                <ImageUploadDropzone
                  value={formData.profileImageUrl || ""}
                  onChange={(url) => setFormData({ ...formData, profileImageUrl: url })}
                  label="User Profile Avatar"
                  helperText="Drag & drop user photo (PNG, JPG, WEBP)"
                />

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Username * {editingUserId && <span className="text-[10px] text-slate-400">(Cannot be changed)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUserId)}
                    placeholder="e.g. hr_manager"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="hr@enterprise.edu.kh"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {editingUserId ? "New Password (ទុកទទេបើមិនចង់ប្តូរ)" : "Initial Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    placeholder={editingUserId ? "Leave empty to keep current password" : "••••••••••••"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {isSuperAdmin ? (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company / Client Tenant *</label>
                    <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Building2 size={15} className="text-slate-400 shrink-0 pointer-events-none" />
                      <select
                        value={formData.companyCode}
                        onChange={(e) => {
                          const newCompany = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            companyCode: newCompany,
                            // If switching to a client company, automatically remove SUPER_ADMIN
                            roles: newCompany !== "default" && prev.roles[0] === "SUPER_ADMIN" ? ["ADMIN"] : prev.roles,
                          }));
                        }}
                        className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none font-semibold cursor-pointer py-1"
                      >
                        <option value="default" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Main Institution (SaaS Owner / HQ)</option>
                        {companiesList
                          .filter((c) => c.companyCode !== "default")
                          .map((c) => (
                            <option key={c.companyCode} value={c.companyCode} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              🏢 {c.name} ({c.companyCode})
                            </option>
                          ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      When this user logs in, they will automatically be isolated to this company's devices, attendance, and records.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-0.5">ស្ថាប័ន / Company Tenant:</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-500" />
                      <span>{user?.companyCode}</span>
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">System Role *</label>
                    {isSuperAdmin && formData.companyCode !== "default" && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        (Client Company restricted to ADMIN & lower)
                      </span>
                    )}
                  </div>
                  <select
                    value={formData.roles[0]}
                    onChange={(e) => setFormData({ ...formData, roles: [e.target.value] })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {roles
                      ?.filter((r) => {
                        // Non-super-admins can NEVER assign SUPER_ADMIN
                        if (!isSuperAdmin && r.name === "SUPER_ADMIN") return false;
                        // Client companies can NEVER have a SUPER_ADMIN account
                        if (formData.companyCode !== "default" && r.name === "SUPER_ADMIN") return false;
                        return true;
                      })
                      .map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name === "SUPER_ADMIN" ? "👑 " : r.name === "ADMIN" ? "🏢 " : ""}
                          {r.name} - {r.description}
                        </option>
                      ))}
                  </select>
                  {!isSuperAdmin && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Client company administrators can assign ADMIN, HR_MANAGER, SUPERVISOR, and EMPLOYEE roles.
                    </p>
                  )}
                </div>
              </div>

              {/* Pinned Sticky Footer - Never Cut Off */}
              <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingUserId ? "Save Changes" : "Create Account"}
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

