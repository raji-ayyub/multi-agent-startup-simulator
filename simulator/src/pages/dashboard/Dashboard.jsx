import React, { useState } from "react";
import EnvisioningModal from "../../components/EnvisioningModal"; // Correct relative path

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock user & data
  const user = { fullName: "John Doe" };
  const dashboardData = {
    stats: { marketViability: 72, investorConfidence: 65, customerDemand: 88 },
    messages: ["Welcome to PentraAI!", "Your first simulation is ready."],
  };
  const isLoading = false;

  const metrics = [
    { title: "Market Viability", score: dashboardData.stats.marketViability },
    { title: "Investor Confidence", score: dashboardData.stats.investorConfidence },
    { title: "Customer Demand", score: dashboardData.stats.customerDemand },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-8">
      {/* Greeting */}
      <h1 className="text-3xl font-bold mb-2">
        Hello {user.fullName.split(" ")[0]}
      </h1>
      <p className="text-gray-400 mb-6">Welcome to PentraAI</p>

      {/* Simulation CTA */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h2 className="text-lg font-semibold mb-2">
          Ready to simulate your first startup idea?
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-semibold"
        >
          Start New Simulation
        </button>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map(({ title, score }) => (
          <div key={title} className="bg-gray-800 p-4 rounded">
            <div className="flex justify-between mb-1">
              <h3 className="text-sm text-gray-400">{title}</h3>
              <span className="text-sm text-gray-300">
                {isLoading ? "--%" : `${score}%`}
              </span>
            </div>
            <div
              className={`h-6 rounded ${
                isLoading ? "bg-gray-700 animate-pulse" : "bg-green-500"
              }`}
              style={{ width: isLoading ? "100%" : `${score}%` }}
            />
          </div>
        ))}
      </div>

      {/* Messages */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Messages</h2>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          </div>
        ) : dashboardData.messages.length ? (
          <ul className="space-y-2">
            {dashboardData.messages.map((msg, idx) => (
              <li key={idx} className="bg-gray-700 p-2 rounded">
                {msg}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No messages yet.</p>
        )}
      </div>

      {/* Envisioning Modal */}
      {isModalOpen && <EnvisioningModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}