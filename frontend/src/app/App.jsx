import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import AdminSidebar from "../components/layout/AdminSidebar";
import AdminTopbar from "../components/layout/AdminTopbar";
import ManagementSidebar from "../components/layout/ManagementSidebar";
import ManagementTopbar from "../components/layout/ManagementTopbar";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import ThemeToggle from "../components/layout/ThemeToggle";
import { getDefaultRouteForRole, useAuthStore } from "../store/authStore";
import useUIStore from "../store/uiStore";

const LoadingSpinner = () => (
  <div className="flex min-h-[70vh] items-center justify-center">
    <p className="text-lg text-slate-400">Loading...</p>
  </div>
);

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
const AgentHub = lazy(() => import("../pages/AgentHub"));
const NotificationsPage = lazy(() => import("../pages/Notifications"));
const ReportsPage = lazy(() => import("../pages/Reports"));
const CalendarPage = lazy(() => import("../pages/Calendar"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminSetup = lazy(() => import("../pages/admin/AdminSetup"));

const ProtectedRoute = ({ children, allowRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowRoles.length && !allowRoles.includes(user?.role)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  return children;
};

const SimulationLayout = ({ children }) => (
  <div className="app-shell flex min-h-[100dvh] bg-[#05090f] text-slate-100 lg:h-[100dvh]">
    <div className="hidden lg:block">
      <Sidebar />
    </div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Navbar />
      <main className="app-main min-w-0 flex-1 overflow-y-auto bg-[#0b1017] p-3 sm:p-5 md:p-6">{children}</main>
    </div>
  </div>
);

const ManagementLayout = ({ children }) => (
  <div className="app-shell management-shell flex min-h-[100dvh] bg-[#05090f] text-slate-100 lg:h-[100dvh]">
    <div className="hidden lg:block">
      <ManagementSidebar />
    </div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <ManagementTopbar />
      <main className="app-main min-w-0 flex-1 overflow-y-auto bg-[#0b1017] p-3 sm:p-5 md:p-6">{children}</main>
    </div>
  </div>
);

const AdminLayout = ({ children }) => (
  <div className="app-shell flex min-h-[100dvh] bg-[#05090f] text-slate-100 lg:h-[100dvh]">
    <div className="hidden lg:block">
      <AdminSidebar />
    </div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <AdminTopbar />
      <main className="app-main min-w-0 flex-1 overflow-y-auto bg-[#0b1017] p-3 sm:p-5 md:p-6">{children}</main>
    </div>
  </div>
);

const RoleAwareLayout = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role === "OPERATOR") return <ManagementLayout>{children}</ManagementLayout>;
  if (user?.role === "ADMIN") return <AdminLayout>{children}</AdminLayout>;
  return <SimulationLayout>{children}</SimulationLayout>;
};

export default function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    if (checkAuth) checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Toaster richColors position="top-center" />
        <ThemeToggle />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/admin/setup" element={<PublicRoute><AdminSetup /></PublicRoute>} />

          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />

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
                <RoleAwareLayout>
                  <Profile />
                </RoleAwareLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <RoleAwareLayout>
                  <Settings />
                </RoleAwareLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <RoleAwareLayout>
                  <AgentHub />
                </RoleAwareLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <RoleAwareLayout>
                  <NotificationsPage />
                </RoleAwareLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <RoleAwareLayout>
                  <ReportsPage />
                </RoleAwareLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <RoleAwareLayout>
                  <CalendarPage />
                </RoleAwareLayout>
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
          <Route
            path="/management/planner"
            element={
              <ProtectedRoute>
                <ManagementLayout>
                  <ManagementDashboard />
                </ManagementLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/signals"
            element={
              <ProtectedRoute>
                <ManagementLayout>
                  <ManagementDashboard />
                </ManagementLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowRoles={["ADMIN"]}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <div className="app-shell flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <h1 className="text-2xl">404 - Page Not Found</h1>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}
