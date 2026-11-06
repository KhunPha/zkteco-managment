import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8484";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh on 401 or 403 (expired/invalid auth)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Both 401 Unauthorized and 403 Forbidden (from Spring Security when JWT expires)
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            const refreshRes = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refreshToken: refreshToken,
            });

            if (refreshRes.data?.data) {
              const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
              localStorage.setItem("access_token", accessToken);
              localStorage.setItem("refresh_token", newRefresh);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          } catch (refreshErr) {
            // Failed to refresh - clear session and redirect to login
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
        } else {
          // No refresh token available - clear session and redirect
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_data");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

