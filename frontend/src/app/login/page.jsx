"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Fingerprint } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [localError, setLocalError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "admin",
      password: "Admin@123456",
    },
  });

  const onSubmit = async (data) => {
    setLocalError("");
    const success = await login(data.username, data.password);
    if (success) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <Fingerprint size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ZKTeco Attendance</h1>
          <p className="text-xs text-indigo-200">Enterprise Biometric Management Platform</p>
        </div>

        {/* Error Alert */}
        {(error || localError) && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error || localError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Username or Email</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                {...register("username", { required: "Username is required" })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 text-sm text-white placeholder-slate-400 transition-all"
                placeholder="admin"
              />
            </div>
            {errors.username && (
              <p className="text-[11px] text-rose-400">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                {...register("password", { required: "Password is required" })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 text-sm text-white placeholder-slate-400 transition-all"
                placeholder="••••••••••••"
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
            <ShieldCheck size={14} />
            <span>Default Super Admin Credentials</span>
          </div>
          <div className="flex justify-between font-mono text-[11px] text-slate-300">
            <span>User: <strong className="text-white">admin</strong></span>
            <span>Pass: <strong className="text-white">Admin@123456</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

