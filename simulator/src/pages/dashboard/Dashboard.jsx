import React, { useEffect, useState, lazy, Suspense } from "react";
import { FaRocket } from "react-icons/fa";
import { useAuthStore } from "../../store/authStore";

// :white_check_mark: Lazy-load the modal with explicit .jsx extension
const EnvisioningModal = lazy(() => import("./components/EnvisioningModal.jsx"));

export default function Dashboard() {
  const { user, dashboardData, fetchDashboard, isLoading } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch dashboard data on mount
  useEffect(() => {
    if (!dashboardData) fetchDashboard();
  }, [dashboardData, fetchDashboard]);

  // Metrics array
  const metrics = [
    { title: "Market Viability", score: dashboardData?.stats?.marketViability || 0 },
    { title: "Investor Confidence", score: dashboardData?.stats?.investorConfidence || 0 },
    { title: "Customer Demand", score: dashboardData?.stats?.customerDemand || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-8">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-2">
        Hello {user?.fullName?.split(" ")[0] || "User"}
      </h1>
      <p className="text-gray-400 mb-6">Welcome to PentraAI</p>

      {/* Simulation CTA */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8 text-center">
        <div className="flex justify-center mb-4">
          <FaRocket className="text-4xl text-gray-400" />
        </div>
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
              <span className="text-sm text-gray-300">{isLoading ? "--%" : `${score}%`}</span>
            </div>
            {isLoading ? (
              <div className="h-6 bg-gray-700 rounded animate-pulse"></div>
            ) : (
              <div className="h-6 bg-green-500 rounded transition-all duration-500" style={{ width: `${score}%` }}></div>
            )}
          </div>
        ))}
      </div>

      {/* Messages Section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Messages</h2>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          </div>
        ) : dashboardData?.messages?.length ? (
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

      {/* Lazy-loaded Envisioning Modal */}
      {isModalOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 flex items-center justify-center text-white">
              Loading Modal...
            </div>
          }
        >
          <EnvisioningModal onClose={() => setIsModalOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}