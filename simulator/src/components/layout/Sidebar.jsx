import React, { useState } from "react";
import { FaLayerGroup, FaBell, FaCog } from "react-icons/fa";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const [mode, setMode] = useState("Simulation");

  const menuItems = [
    { title: "Dashboard", icon: <FaLayerGroup />, path: "/dashboard" },
    { title: "Simulations", icon: <FaLayerGroup />, path: "/simulation" },
    { title: "Reports", icon: <FaLayerGroup />, path: "/reports" },
  ];

  const systemItems = [
    { title: "Notifications", icon: <FaBell />, path: "/notifications" },
    { title: "Settings", icon: <FaCog />, path: "/settings" },
  ];

  return (
    <div className="flex flex-col w-64 bg-slate-950 text-slate-300 p-6 justify-between h-screen">
      {/* Logo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center mb-1">
          PentraAI <span className="ml-2 text-blue-500 text-xl">★</span>
        </h1>
        <p className="text-sm text-gray-400 mb-6">The Startup Consultant</p>

        {/* Main Menu */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center w-full p-2 rounded font-medium transition-colors duration-200 ${
                  isActive ? "text-blue-500 bg-slate-800" : "hover:text-blue-400 hover:bg-slate-800"
                }`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.title}
            </NavLink>
          ))}
        </div>

        {/* System Section */}
        <p className="mt-6 mb-2 text-xs text-gray-500 uppercase">System</p>
        <div className="space-y-2">
          {systemItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center w-full p-2 rounded font-medium text-gray-400 hover:text-blue-400 hover:bg-slate-800 transition-colors duration-200 ${
                  isActive ? "text-blue-500 bg-slate-800" : ""
                }`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.title}
            </NavLink>
          ))}
        </div>

        {/* Mode Toggle */}
        <p className="mt-6 mb-2 text-xs text-gray-500 uppercase">Mode</p>
        <div className="flex rounded-full bg-slate-800 p-1 w-full">
          {["Simulation", "Manage"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-sm font-medium py-1 rounded-full transition-colors duration-200 ${
                mode === m ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Card */}
      <div className="mt-6 space-y-4">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4 rounded-xl text-center">
          <span className="text-gray-400 text-xl">★</span>
          <p className="text-sm font-bold text-gray-100 mt-2">AI FOR RESULT ANALYTICS</p>
          <button className="mt-3 bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-900 transition">
            Try Now →
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <img
            src="https://i.pravatar.cc/40?img=5"
            alt="Profile"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="text-gray-100 font-semibold">Olivia Trent</p>
            <p className="text-gray-400 text-sm">Dev Lead</p>
          </div>
        </div>
      </div>
    </div>
  );
}