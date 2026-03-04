import { Link } from "react-router-dom";

export default function ModeSwitch({ mode = "simulation" }) {
  const isSimulation = mode === "simulation";
  return (
    <div className="mt-4 flex ">
      <Link
        to="/dashboard"
        className={`flex-1 rounded-l-full bg-slate-900 px-3 py-1 h-[2.4rem] flex items-center justify-center text-[11px] font-medium transition ${
          isSimulation ? "outline-8 z-10 outline-blue-400/20 text-white" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Simulation
      </Link>
      <Link
        to="/management"
        className={`flex-1 rounded-r-full bg-slate-900 px-3 py-1 h-[2.4rem] flex items-center justify-center text-[11px] font-medium transition ${
          !isSimulation ? "outline-8 z-10 outline-cyan-400/20 text-white" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Management
      </Link>
    </div>
  );
}
