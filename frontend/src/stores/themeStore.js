import { create } from "zustand";

export const useThemeStore = create((set) => ({
  darkMode: typeof window !== "undefined" ? localStorage.getItem("theme_mode") === "dark" : false,
  language: typeof window !== "undefined" ? localStorage.getItem("app_lang") || "en" : "en",

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

