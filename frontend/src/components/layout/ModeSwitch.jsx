import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function ModeSwitch({ mode = "simulation" }) {
  const { user } = useAuthStore();
  if (user?.role === "ADMIN") return null;
  const isSimulation = mode === "simulation";
  return (
    <div className="mode-switch mt-4 flex rounded-full border p-1">
      <Link
        to="/dashboard"
        className={`mode-switch-link flex h-[2.4rem] flex-1 items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium transition ${
          isSimulation ? "is-active z-10" : ""
        }`}
      >
        Simulation
      </Link>
      <Link
        to="/management"
        className={`mode-switch-link flex h-[2.4rem] flex-1 items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium transition ${
          !isSimulation ? "is-active z-10" : ""
        }`}
      >
        Management
      </Link>
    </div>
  );
}
