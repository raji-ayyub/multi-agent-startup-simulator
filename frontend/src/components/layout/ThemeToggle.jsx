import { Moon, Sun } from "lucide-react";
import useUIStore from "../../store/uiStore";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/85 px-3 py-2 text-xs font-semibold text-slate-100 shadow-xl backdrop-blur transition hover:bg-slate-800 light-theme-toggle"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
