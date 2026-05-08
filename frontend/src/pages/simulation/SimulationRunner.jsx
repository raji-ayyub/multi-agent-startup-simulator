import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useSimulationStore from "../../store/simulationStore";

export default function SimulationRunner() {
  const navigate = useNavigate();
  const { startSimulation, simulationError, runningActivity } = useSimulationStore();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await startSimulation();
        if (active) navigate("/simulation/results");
      } catch (err) {
        if (active) {
          setError(err?.message || simulationError || "Simulation failed. No result was produced.");
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [navigate, simulationError, startSimulation]);

  return (
    <div className="app-view flex h-full flex-col items-center justify-center space-y-6 text-center">
      {!error ? (
        <>
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/25" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-400 border-r-cyan-300" />
            <Loader2 size={24} className="animate-spin text-cyan-200" />
          </div>

          <h2 className="app-heading text-xl font-semibold">Multi-Agent Simulation Running...</h2>
          <div className="max-w-2xl space-y-2">
            <p className="app-copy">
              {runningActivity?.message || "The backend simulation engine is pressure-testing your startup strategy."}
            </p>
            <p className="app-muted text-sm">
              Current operation: {String(runningActivity?.phase || "backend_simulation").replaceAll("_", " ")}
            </p>
          </div>
        </>
      ) : (
        <div className="app-status-danger max-w-xl rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
