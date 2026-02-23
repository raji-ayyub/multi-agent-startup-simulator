// // src/components/layout/Sidebar.jsx

// import { NavLink } from "react-router-dom";
// import { Brain, BarChart3, PlayCircle, ChevronLeft, FileText } from "lucide-react";
// import { motion } from "framer-motion";
// import useUIStore from "../../store/uiStore";

// export default function Sidebar() {
//   const { sidebarOpen, toggleSidebar } = useUIStore();

//   return (
//     <motion.aside
//       animate={{ width: sidebarOpen ? 260 : 90 }}
//       className="h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300"
//     >
//       {/* Logo Section */}
//       <div className="flex items-center justify-between px-6 py-6">
//         {sidebarOpen && (
//           <h1 className="text-xl font-bold text-indigo-500 tracking-wide">
//             StrategySim
//           </h1>
//         )}

//         <button
//           onClick={toggleSidebar}
//           className="p-2 rounded-lg hover:bg-slate-800 transition"
//         >
//           <ChevronLeft
//             size={18}
//             className={`transition-transform ${
//               sidebarOpen ? "" : "rotate-180"
//             }`}
//           />
//         </button>
//       </div>

//       {/* Navigation Links */}
//       <nav className="flex-1 px-4 space-y-3">

//         <SidebarLink
//           to="/simulation"
//           icon={<Brain size={20} />}
//           label="New Simulation"
//           sidebarOpen={sidebarOpen}
//         />

//         <SidebarLink
//           to="/simulation/run"
//           icon={<PlayCircle size={20} />}
//           label="Run Simulation"
//           sidebarOpen={sidebarOpen}
//         />

//         <SidebarLink
//           to="/dashboard"
//           icon={<BarChart3 size={20} />}
//           label="Dashboard"
//           sidebarOpen={sidebarOpen}
//         />

//         {/* ===== Workforce AI Link ===== */}
//         <SidebarLink
//           to="/workforce/upload"
//           icon={<FileText size={20} />}
//           label="Workforce AI"
//           sidebarOpen={sidebarOpen}
//         />

//       </nav>

//       {/* Footer */}
//       <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800">
//         {sidebarOpen ? "Multi-Agent AI v1.0" : "v1.0"}
//       </div>
//     </motion.aside>
//   );
// }

// function SidebarLink({ to, icon, label, sidebarOpen }) {
//   return (
//     <NavLink
//       to={to}
//       className={({ isActive }) =>
//         `flex items-center gap-4 p-3 rounded-xl transition-all duration-200
//          ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"}`
//       }
//     >
//       {icon}
//       {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
//     </NavLink>
//   );
// }


// src/components/layout/Sidebar.jsx

import { NavLink } from "react-router-dom";
import { Brain, BarChart3, PlayCircle, ChevronLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import useUIStore from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { role } = useAuthStore();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 260 : 90 }}
      className="h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300"
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-6 py-6">
        {sidebarOpen && (
          <h1 className="text-xl font-bold text-indigo-500 tracking-wide">
            StrategySim
          </h1>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-800 transition"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-3">

        {/* Simulation accessible to all roles */}
        <SidebarLink
          to="/simulation"
          icon={<Brain size={20} />}
          label="New Simulation"
          sidebarOpen={sidebarOpen}
        />

        <SidebarLink
          to="/simulation/run"
          icon={<PlayCircle size={20} />}
          label="Run Simulation"
          sidebarOpen={sidebarOpen}
        />

        {/* Dashboard - Admin only */}
        {role === "Admin" && (
          <SidebarLink
            to="/dashboard"
            icon={<BarChart3 size={20} />}
            label="Dashboard"
            sidebarOpen={sidebarOpen}
          />
        )}

        {/* Workforce AI - Admin & Company */}
        {(role === "Admin" || role === "Company") && (
          <SidebarLink
            to="/workforce/upload"
            icon={<FileText size={20} />}
            label="Workforce AI"
            sidebarOpen={sidebarOpen}
          />
        )}

      </nav>

      {/* Footer */}
      <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-800">
        {sidebarOpen ? "Multi-Agent AI v1.0" : "v1.0"}
      </div>
    </motion.aside>
  );
}

function SidebarLink({ to, icon, label, sidebarOpen }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 p-3 rounded-xl transition-all duration-200
         ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300"}`
      }
    >
      {icon}
      {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
    </NavLink>
  );
}
