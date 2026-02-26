// // src/components/layout/Navbar.jsx

// import { useState } from "react";
// import { Bell } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import useSimulationStore from "../../store/simulationStore";
// import { useAuthStore } from "../../store/authStore";

// export default function Navbar() {
//   const { overallScore } = useSimulationStore();
//   const { user, logout } = useAuthStore();
//   const navigate = useNavigate();

//   const [showNotifications, setShowNotifications] = useState(false);
//   const [showUserMenu, setShowUserMenu] = useState(false);

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   return (
//     <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-8 relative">

//       {/* ================= LEFT SECTION ================= */}
//       <div>
//         <h2 className="text-lg font-semibold">
//           Multi-Agent Strategy Simulator
//         </h2>
//         <p className="text-xs text-slate-400">
//           Strategic Intelligence for Founders
//         </p>
//       </div>

//       {/* ================= RIGHT SECTION ================= */}
//       <div className="flex items-center gap-6 relative">

//         {/* ===== Overall Score Indicator ===== */}
//         {overallScore !== null && (
//           <div className="bg-slate-800 px-4 py-2 rounded-xl text-sm">
//             Score:{" "}
//             <span
//               className={`font-semibold ${
//                 overallScore > 75
//                   ? "text-green-400"
//                   : overallScore > 50
//                   ? "text-yellow-400"
//                   : "text-red-400"
//               }`}
//             >
//               {overallScore}/100
//             </span>
//           </div>
//         )}

//         {/* ===== Notifications ===== */}
//         <div className="relative">
//           <button
//             onClick={() => {
//               setShowNotifications(!showNotifications);
//               setShowUserMenu(false);
//             }}
//             className="relative p-2 rounded-lg hover:bg-slate-800 transition"
//           >
//             <Bell size={20} />
//             <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1.5 rounded-full">
//               2
//             </span>
//           </button>

//           {showNotifications && (
//             <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50">
//               <div className="p-4 border-b border-slate-800 font-medium">
//                 Notifications
//               </div>

//               <div className="p-4 space-y-3 text-sm text-slate-300">
//                 <p>📊 Simulation completed successfully</p>
//                 <p>📄 Document analysis ready</p>
//               </div>

//               <div className="p-3 text-center text-indigo-400 hover:bg-slate-800 cursor-pointer rounded-b-xl">
//                 View All
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ===== User Dropdown ===== */}
//         <div className="relative">
//           <button
//             onClick={() => {
//               setShowUserMenu(!showUserMenu);
//               setShowNotifications(false);
//             }}
//             className="flex items-center gap-3 bg-slate-800 px-3 py-2 rounded-xl hover:bg-slate-700 transition"
//           >
//             <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-semibold">
//               {user?.name?.charAt(0) || "U"}
//             </div>
//             <span className="hidden md:block text-sm">
//               {user?.name || "User"}
//             </span>
//           </button>

//           {showUserMenu && (
//             <div className="absolute right-0 mt-3 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50">

//               <button
//                 onClick={() => navigate("/profile")}
//                 className="w-full text-left px-4 py-3 hover:bg-slate-800 rounded-t-xl"
//               >
//                 👤 Profile
//               </button>

//               <button
//                 onClick={() => navigate("/settings")}
//                 className="w-full text-left px-4 py-3 hover:bg-slate-800"
//               >
//                 ⚙ Settings
//               </button>

//               <div className="border-t border-slate-800" />

//               <button
//                 onClick={handleLogout}
//                 className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-800 rounded-b-xl"
//               >
//                 🚪 Logout
//               </button>

//             </div>
//           )}
//         </div>

//       </div>
//     </header>
//   );
// }


// src/components/layout/Navbar.jsx

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSimulationStore from "../../store/simulationStore";
import { useAuthStore } from "../../store/authStore";

export default function Navbar() {
  const { overallScore } = useSimulationStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-8 relative">

      {/* ===== LEFT SECTION ===== */}
      <div>
        <h2 className="text-lg font-semibold">
          Multi-Agent Strategy Simulator
        </h2>
        <p className="text-xs text-slate-400">
          Strategic Intelligence for Founders
        </p>
      </div>

      {/* ===== RIGHT SECTION ===== */}
      <div className="flex items-center gap-6 relative">

        {/* ===== Overall Score ===== */}
        {overallScore !== null && (
          <div className="bg-slate-800 px-4 py-2 rounded-xl text-sm">
            Score:{" "}
            <span
              className={`font-semibold ${
                overallScore > 75
                  ? "text-green-400"
                  : overallScore > 50
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {overallScore}/100
            </span>
          </div>
        )}

        {/* ===== Notifications ===== */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1.5 rounded-full">
              2
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50">
              <div className="p-4 border-b border-slate-800 font-medium">
                Notifications
              </div>
              <div className="p-4 space-y-3 text-sm text-slate-300">
                <p>Simulation completed successfully</p>
                <p>Document analysis ready</p>
              </div>
              <div className="p-3 text-center text-indigo-400 hover:bg-slate-800 cursor-pointer rounded-b-xl">
                View All
              </div>
            </div>
          )}
        </div>

        {/* ===== User Dropdown ===== */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 bg-slate-800 px-3 py-2 rounded-xl hover:bg-slate-700 transition"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-semibold">
              {user?.name?.charAt(0) || "U"}
            </div>
            <span className="hidden md:block text-sm">{user?.name || "User"}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50">

              <button
                onClick={() => navigate("/profile")}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 rounded-t-xl"
              >
                👤 Profile
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="w-full text-left px-4 py-3 hover:bg-slate-800"
              >
                ⚙ Settings
              </button>

              <div className="border-t border-slate-800" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-800 rounded-b-xl"
              >
                 Logout
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
