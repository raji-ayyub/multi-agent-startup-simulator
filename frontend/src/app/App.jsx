import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

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
const IdeaForm = lazy(() => import("../pages/simulation/IdeaForm"));
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

// Layouts
const AuthLayout = ({ children }) => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/dashboard";

  return (
    <div className="flex h-screen bg-[#05090f] text-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {showNavbar ? <Navbar /> : null}
        <main className={`flex-1 overflow-y-auto ${showNavbar ? "p-8" : "p-5 md:p-6"} bg-[#0b1017]`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    if (checkAuth) checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
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
          <Route path="/dashboard" element={<ProtectedRoute><AuthLayout><Dashboard /></AuthLayout></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><AuthLayout><IdeaForm /></AuthLayout></ProtectedRoute>} />
          <Route path="/simulation/run" element={<ProtectedRoute><AuthLayout><SimulationRunner /></AuthLayout></ProtectedRoute>} />
          <Route path="/simulation/results" element={<ProtectedRoute><AuthLayout><ResultsView /></AuthLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AuthLayout><Profile /></AuthLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AuthLayout><Settings /></AuthLayout></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<div className="flex items-center justify-center min-h-screen bg-slate-950 text-white"><h1 className="text-2xl">404 - Page Not Found</h1></div>} />
        </Routes>
      </Suspense>
    </Router>
  );
}
