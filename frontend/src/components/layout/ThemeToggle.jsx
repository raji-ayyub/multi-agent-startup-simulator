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
      className="light-theme-toggle fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur transition hover:opacity-95"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
