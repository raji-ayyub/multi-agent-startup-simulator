import { create } from "zustand";
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth"; 
// 🔁 Change to your real backend URL

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // only if using cookies
});

// Attach token automatically (JWT support)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ================= LOGIN =================
  login: async ({ identifier, password }) => {
    try {
      set({ isLoading: true, error: null });

      const { data } = await axiosInstance.post("/login", {
        identifier,
        password,
      });

      // If backend returns token
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      set({
        user: data.user,
        role: data.role,
        isAuthenticated: true,
        isLoading: false,
      });

    } catch (err) {
      set({
        isLoading: false,
        error: err.response?.data?.message || "Login failed",
      });
    }
  },

  // ================= SIGNUP =================
  signup: async ({ fullName, email, password, role }) => {
    try {
      set({ isLoading: true, error: null });

      const { data } = await axiosInstance.post("/signup", {
        fullName,
        email,
        password,
        role,
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      set({
        user: data.user,
        role: data.role,
        isAuthenticated: true,
        isLoading: false,
      });

    } catch (err) {
      set({
        isLoading: false,
        error: err.response?.data?.message || "Signup failed",
      });
    }
  },

  // ================= REQUEST RESET =================
  resetPassword: async (email) => {
    try {
      set({ isLoading: true, error: null });

      await axiosInstance.post("/forgot-password", { email });

      set({ isLoading: false });

    } catch (err) {
      set({
        isLoading: false,
        error: err.response?.data?.message || "Reset request failed",
      });
    }
  },

  // ================= CONFIRM RESET =================
  resetPasswordConfirm: async (token, newPassword) => {
    try {
      set({ isLoading: true, error: null });

      await axiosInstance.post("/reset-password", {
        token,
        newPassword,
      });

      set({ isLoading: false });

    } catch (err) {
      set({
        isLoading: false,
        error: err.response?.data?.message || "Password reset failed",
      });
    }
  },

  // ================= LOGOUT =================
  logout: () => {
    localStorage.removeItem("token");

    set({
      user: null,
      role: null,
      isAuthenticated: false,
    });
  },
}));