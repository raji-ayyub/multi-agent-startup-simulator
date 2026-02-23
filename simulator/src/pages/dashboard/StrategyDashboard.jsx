// src/pages/dashboard/StrategyDashboard.jsx

import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import useSimulationStore from "../../store/simulationStore";
import useAgentStore from "../../store/agentStore";

export default function StrategyDashboard() {
  const { overallScore, recommendations } = useSimulationStore();
  const { agents } = useAgentStore();

  const radarData = [
    { subject: "Market", score: agents.market.score || 0 },
    { subject: "Customer", score: agents.customer.score || 0 },
    { subject: "Investor", score: agents.investor.score || 0 },
  ];

  const riskData = [
    { name: "Market Risk", value: agents.market.risks?.length || 0 },
    { name: "Customer Risk", value: agents.customer.risks?.length || 0 },
    { name: "Investor Risk", value: agents.investor.risks?.length || 0 },
  ];

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-3xl font-bold">Strategy Dashboard</h1>
        <p className="text-slate-400 mt-2">
          Aggregated multi-agent strategic evaluation
        </p>
      </div>

      {/* ================= OVERALL SCORE ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400">Overall Strategy Score</p>
            <h2 className="text-5xl font-bold mt-2 text-indigo-500">
              {overallScore ?? 0}/100
            </h2>
          </div>

          <div className="text-right">
            <p className="text-slate-400 text-sm">
              Composite evaluation across all agents
            </p>
          </div>
        </div>
      </motion.div>

      {/* ================= CHARTS SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">
            Agent Performance Comparison
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
              <PolarRadiusAxis stroke="#94a3b8" />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Bar Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">
            Risk Distribution
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ================= AGENT SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {Object.entries(agents).map(([key, agent]) => (
          <motion.div
            key={key}
            whileHover={{ y: -4 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <h4 className="text-lg font-semibold capitalize mb-2">
              {key} Agent
            </h4>

            <p className="text-sm text-slate-400 mb-4">
              Score: {agent.score ?? 0}/100
            </p>

            <p className="text-sm text-slate-300 line-clamp-4">
              {agent.analysis || "No analysis available yet."}
            </p>
          </motion.div>
        ))}

      </div>

      {/* ================= RECOMMENDATIONS ================= */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8"
      >
        <h3 className="text-lg font-semibold mb-4">
          Strategic Recommendations
        </h3>

        <ul className="space-y-3">
          {recommendations?.length > 0 ? (
            recommendations.map((rec, index) => (
              <li
                key={index}
                className="bg-slate-800 p-4 rounded-xl text-sm text-slate-300"
              >
                {rec}
              </li>
            ))
          ) : (
            <p className="text-slate-500 text-sm">
              No recommendations generated yet.
            </p>
          )}
        </ul>
      </motion.div>
    </div>
  );
}
