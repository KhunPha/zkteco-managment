import { create } from "zustand";
import api from "@/lib/api";

export const useAuthStore = create((set) => ({
  user: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user_data") || "null") : null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("access_token") : false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/api/v1/auth/login", { username, password });
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user_data", JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Invalid credentials or server unreachable";
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await api.post("/api/v1/auth/logout", { refreshToken }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      set({ user: null, isAuthenticated: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  checkAuth: async () => {
    try {
      const response = await api.get("/api/v1/auth/me");
      const user = response.data.data;
      localStorage.setItem("user_data", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch (err) {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

