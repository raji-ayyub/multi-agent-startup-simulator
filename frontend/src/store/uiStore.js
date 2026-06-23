// src/store/uiStore.js
import { create } from "zustand";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "light";
};

const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: getInitialTheme(),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("theme", next);
      return { theme: next };
    }),
  setTheme: (theme) =>
    set(() => {
      const normalized = theme === "light" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("theme", normalized);
      return { theme: normalized };
    }),
}));

export default useUIStore;
