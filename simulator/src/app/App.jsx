

// // src/app/App.jsx

// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// import { useAuthStore } from "../store/authStore";

// // Layout
// import Sidebar from "../components/layout/Sidebar";
// import Navbar from "../components/layout/Navbar";

// // Simulation Pages
// import IdeaForm from "../pages/simulation/IdeaForm";
// import SimulationRunner from "../pages/simulation/SimulationRunner";

// // Dashboard
// import StrategyDashboard from "../pages/dashboard/StrategyDashboard";

// // Workforce AI Pages
// import DocumentUpload from "../pages/workforce/DocumentUpload";
// import WorkforceDashboard from "../pages/workforce/WorkforceDashboard";

// // Profile & Settings
// import Profile from "../pages/Profile";
// import Settings from "../pages/Settings";

// // Auth Pages
// import Login from "../pages/auth/Login";
// import Signup from "../pages/auth/Signup";
// import ForgotPassword from "../pages/auth/ForgotPassword";
// import ResetPassword from "../pages/auth/ResetPassword";

// /* ===============================
//    🔐 Protected Route Wrapper
// ================================ */
// function ProtectedRoute({ children, roles }) {
//   const { isAuthenticated, role } = useAuthStore();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   // Role-based access
//   if (roles && !roles.includes(role)) {
//     return (
//       <div className="text-center mt-20">
//         <h1 className="text-3xl font-bold">403</h1>
//         <p className="text-slate-400 mt-2">
//           You do not have permission to access this page
//         </p>
//       </div>
//     );
//   }

//   return children;
// }

// /* ===============================
//    🚫 Public Route (Block when logged in)
// ================================ */
// function PublicRoute({ children }) {
//   const { isAuthenticated } = useAuthStore();

//   if (isAuthenticated) {
//     return <Navigate to="/simulation" replace />;
//   }

//   return children;
// }

// export default function App() {
//   const { isAuthenticated } = useAuthStore();

//   return (
//     <Router>
//       <div className="flex h-screen bg-slate-950 text-slate-100">

//         {/* Sidebar only when authenticated */}
//         {isAuthenticated && <Sidebar />}

//         <div className="flex flex-col flex-1 overflow-hidden">

//           {/* Navbar only when authenticated */}
//           {isAuthenticated && <Navbar />}

//           <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
//             <Routes>

//               {/* ================= PUBLIC ROUTES ================= */}
//               <Route
//                 path="/login"
//                 element={<PublicRoute><Login /></PublicRoute>}
//               />
//               <Route
//                 path="/signup"
//                 element={<PublicRoute><Signup /></PublicRoute>}
//               />
//               <Route
//                 path="/forgot-password"
//                 element={<PublicRoute><ForgotPassword /></PublicRoute>}
//               />
//               <Route
//                 path="/reset-password"
//                 element={<PublicRoute><ResetPassword /></PublicRoute>}
//               />

//               {/* ================= DEFAULT ================= */}
//               <Route
//                 path="/"
//                 element={
//                   isAuthenticated
//                     ? <Navigate to="/simulation" replace />
//                     : <Navigate to="/login" replace />
//                 }
//               />

//               {/* ================= PROTECTED ROUTES ================= */}

//               {/* Simulation - accessible to all roles */}
//               <Route
//                 path="/simulation"
//                 element={<ProtectedRoute><IdeaForm /></ProtectedRoute>}
//               />
//               <Route
//                 path="/simulation/run"
//                 element={<ProtectedRoute><SimulationRunner /></ProtectedRoute>}
//               />

//               {/* Strategy Dashboard - only Admin */}
//               <Route
//                 path="/dashboard"
//                 element={<ProtectedRoute roles={["Admin"]}><StrategyDashboard /></ProtectedRoute>}
//               />

//               {/* Workforce AI - only Company & Admin */}
//               <Route
//                 path="/workforce/upload"
//                 element={<ProtectedRoute roles={["Admin", "Company"]}><DocumentUpload /></ProtectedRoute>}
//               />
//               <Route
//                 path="/workforce/dashboard"
//                 element={<ProtectedRoute roles={["Admin", "Company"]}><WorkforceDashboard /></ProtectedRoute>}
//               />

//               {/* Profile & Settings - all authenticated users */}
//               <Route
//                 path="/profile"
//                 element={<ProtectedRoute><Profile /></ProtectedRoute>}
//               />
//               <Route
//                 path="/settings"
//                 element={<ProtectedRoute><Settings /></ProtectedRoute>}
//               />

//               {/* ================= 404 FALLBACK ================= */}
//               <Route
//                 path="*"
//                 element={
//                   <div className="text-center mt-20">
//                     <h1 className="text-3xl font-bold">404</h1>
//                     <p className="text-slate-400 mt-2">Page not found</p>
//                   </div>
//                 }
//               />

//             </Routes>
//           </main>
//         </div>
//       </div>
//     </Router>
//   );
// }

// src/app/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import React, { Suspense, lazy } from "react";

// Layouts
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[70vh]">
    <p className="text-slate-400">Loading...</p>
  </div>
);

// Lazy-loaded Pages
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const IdeaForm = lazy(() => import("../pages/simulation/IdeaForm"));
const SimulationRunner = lazy(() => import("../pages/simulation/SimulationRunner"));
const StrategyDashboard = lazy(() => import("../pages/dashboard/StrategyDashboard"));
const DocumentUpload = lazy(() => import("../pages/workforce/DocumentUpload"));
const WorkforceDashboard = lazy(() => import("../pages/workforce/WorkforceDashboard"));
const Profile = lazy(() => import("../pages/Profile"));
const Settings = lazy(() => import("../pages/Settings"));
const About = lazy(() => import("../pages/About"));

// =====================
// Reusable Error Pages
// =====================
const ErrorPage = ({ code, message }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh]">
    <h1 className="text-3xl font-bold">{code}</h1>
    <p className="text-slate-400 mt-2">{message}</p>
  </div>
);

const NotFound = () => <ErrorPage code="404" message="Page not found" />;
const Forbidden = () => <ErrorPage code="403" message="You do not have permission to access this page" />;

// =====================
// Default route per role
// =====================
const getDefaultRoute = (role) => {
  switch (role) {
    case "Admin": return "/dashboard";
    case "Company": return "/simulation";
    case "Analyst": return "/simulation";
    default: return "/simulation";
  }
};

// =====================
// Protected Route Wrapper
// =====================
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !roles.includes(role)) return <Forbidden />;

  return children;
};

// =====================
// Public Route Wrapper
// =====================
const PublicRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (isAuthenticated) return <Navigate to={getDefaultRoute(role)} replace />;

  return children;
};

// =====================
// Layout Components
// =====================
const AuthLayout = ({ children }) => (
  <div className="flex h-screen bg-slate-950 text-slate-100">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {children}
      </main>
    </div>
  </div>
);

const PublicLayout = ({ children }) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
    {children}
  </div>
);

// =====================
// App Component
// =====================
export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route
            path="/login"
            element={<PublicRoute><PublicLayout><Login /></PublicLayout></PublicRoute>}
          />
          <Route
            path="/signup"
            element={<PublicRoute><PublicLayout><Signup /></PublicLayout></PublicRoute>}
          />
          <Route
            path="/forgot-password"
            element={<PublicRoute><PublicLayout><ForgotPassword /></PublicLayout></PublicRoute>}
          />
          <Route
            path="/reset-password"
            element={<PublicRoute><PublicLayout><ResetPassword /></PublicLayout></PublicRoute>}
          />
           <Route
            path="/about"
            element={
              <PublicRoute>
                <AuthLayout>
                  <About />
                </AuthLayout>
              </PublicRoute>
            }
          />

          {/* DEFAULT ROUTE */}
          <Route
            path="/"
            element={
              isAuthenticated
                ? <Navigate to="/simulation" replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/simulation"
            element={<ProtectedRoute><AuthLayout><IdeaForm /></AuthLayout></ProtectedRoute>}
          />
          <Route
            path="/simulation/run"
            element={<ProtectedRoute><AuthLayout><SimulationRunner /></AuthLayout></ProtectedRoute>}
          />

          <Route
            path="/dashboard"
            element={<ProtectedRoute roles={["Admin"]}><AuthLayout><StrategyDashboard /></AuthLayout></ProtectedRoute>}
          />

          <Route
            path="/workforce/upload"
            element={<ProtectedRoute roles={["Admin","Company"]}><AuthLayout><DocumentUpload /></AuthLayout></ProtectedRoute>}
          />
          <Route
            path="/workforce/dashboard"
            element={<ProtectedRoute roles={["Admin","Company"]}><AuthLayout><WorkforceDashboard /></AuthLayout></ProtectedRoute>}
          />

          <Route
            path="/profile"
            element={<ProtectedRoute><AuthLayout><Profile /></AuthLayout></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><AuthLayout><Settings /></AuthLayout></ProtectedRoute>}
          />

          {/* 404 FALLBACK */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </Router>
  );
}