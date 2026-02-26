import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useSimulationStore from "../../store/simulationStore";
import useAgentStore from "../../store/agentStore";

export default function SimulationRunner() {
  const navigate = useNavigate();
  const { finishSimulation } = useSimulationStore();
  const { setAgentResult } = useAgentStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Fake AI results (replace later with real API)
      setAgentResult("market", {
        score: 78,
        analysis: "Strong growth potential with moderate competition.",
        risks: ["High competition", "Market saturation risk"],
      });

      setAgentResult("customer", {
        score: 70,
        analysis: "Customer demand exists but onboarding friction possible.",
        risks: ["Adoption barrier"],
      });

      setAgentResult("investor", {
        score: 82,
        analysis: "High scalability and recurring revenue potential.",
        risks: ["Early-stage uncertainty"],
      });

      finishSimulation(77, [
        "Refine customer acquisition strategy.",
        "Strengthen competitive differentiation.",
        "Validate pricing model through MVP testing.",
      ]);

      navigate("/simulation/results");
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"
      />

      <h2 className="text-xl font-semibold">
        Multi-Agent Simulation Running...
      </h2>

      <p className="text-slate-400">
        Market, Customer, and Investor agents are analyzing your strategy.
      </p>
    </div>
  );
}
