import { useNavigate } from "react-router-dom";
import useAgentStore from "../../store/agentStore";

export default function ResultsView() {
  const navigate = useNavigate();
  const { agents } = useAgentStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Simulation Results</h1>
        <p className="text-slate-400 mt-2">
          Stakeholder-level evaluation of your strategy
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(agents).map(([key, agent]) => (
          <div
            key={key}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold capitalize mb-2">
              {key} Agent
            </h3>

            <p className="text-sm text-slate-400 mb-3">
              Score: {agent.score ?? 0}/100
            </p>

            <p className="text-sm text-slate-300 mb-3">
              {agent.analysis || "No analysis yet."}
            </p>

            <ul className="text-xs text-red-400 space-y-1">
              {agent.risks?.map((risk, i) => (
                <li key={i}>• {risk}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold"
      >
        View Strategy Dashboard
      </button>
    </div>
  );
}
