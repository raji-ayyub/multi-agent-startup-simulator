import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthStore } from "../store/authStore";
import Sidebar from "../components/layout/Sidebar";
import ManagementSidebar from "../components/layout/ManagementSidebar";
import ManagementTopbar from "../components/layout/ManagementTopbar";
import Navbar from "../components/layout/Navbar";
import ThemeToggle from "../components/layout/ThemeToggle";
import useUIStore from "../store/uiStore";

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[70vh]">
    <p className="text-slate-400 text-lg">Loading...</p>
  </div>
);

// Lazy-loaded pages
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const Landing = lazy(() => import("../pages/Landing"));
const About = lazy(() => import("../pages/About"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const ManagementDashboard = lazy(() => import("../pages/management/ManagementDashboard"));
const SimulationRunner = lazy(() => import("../pages/simulation/SimulationRunner"));
const ResultsView = lazy(() => import("../pages/simulation/ResultsView"));
const Profile = lazy(() => import("../pages/Profile"));
const Settings = lazy(() => import("../pages/Settings"));

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Public Route
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const SimulationLayout = ({ children }) => {
  return (
    <div className="flex min-h-[100dvh] bg-[#05090f] text-slate-100 lg:h-[100dvh]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#0b1017] p-3 sm:p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
};

const ManagementLayout = ({ children }) => {
  return (
    <div className="flex min-h-[100dvh] bg-[#040910] text-slate-100 lg:h-[100dvh]">
      <div className="hidden lg:block">
        <ManagementSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ManagementTopbar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#09111d] p-3 sm:p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    if (checkAuth) checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Toaster richColors position="top-center" />
        <ThemeToggle />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Default Route */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <Dashboard />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulation"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <ResultsView />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulation/run"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <SimulationRunner />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulation/results"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <ResultsView />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <Profile />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SimulationLayout>
                  <Settings />
                </SimulationLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/management"
            element={
              <ProtectedRoute>
                <ManagementLayout>
                  <ManagementDashboard />
                </ManagementLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div className="flex items-center justify-center min-h-screen bg-slate-950 text-white"><h1 className="text-2xl">404 - Page Not Found</h1></div>} />
        </Routes>
      </Suspense>
    </Router>
  );
}
