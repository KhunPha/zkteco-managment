import { create } from "zustand";

export const useThemeStore = create((set) => ({
  darkMode: false,
  language: "en",
  mobileSidebarOpen: false,

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

  initTheme: () => {
    if (typeof window !== "undefined") {
      const isDark = localStorage.getItem("theme_mode") === "dark";
      const lang = localStorage.getItem("app_lang") || "en";
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set({ darkMode: isDark, language: lang });
    }
  },

  toggleDarkMode: () => {
    set((state) => {
      const nextMode = !state.darkMode;
      if (typeof window !== "undefined") {
        localStorage.setItem("theme_mode", nextMode ? "dark" : "light");
        if (nextMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return { darkMode: nextMode };
    });
  },

  setLanguage: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", lang);
    }
    set({ language: lang });
  },
}));

