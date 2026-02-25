// src/store/authStore.js
import { create } from "zustand";

export const useAuthStore = create((set) => ({

  // ================= STATE =================
  user: null,
  dashboardData: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ================= CHECK AUTH =================
  checkAuth: () => {
    const savedUser = localStorage.getItem("mockUser");
    if (savedUser) {
      set({
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      });
    }
  },

  // ================= LOGIN (MOCK) =================
  login: async ({ identifier, password }) => {
    set({ isLoading: true, error: null });

    // Fake delay
    await new Promise((res) => setTimeout(res, 800));

    const mockUser = {
      fullName: "Basit Developer",
      email: identifier,
    };

    localStorage.setItem("mockUser", JSON.stringify(mockUser));

    set({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    return true;
  },

  // ================= SIGNUP (MOCK) =================
  signup: async ({ fullName, email }) => {
    set({ isLoading: true });

    await new Promise((res) => setTimeout(res, 800));

    const mockUser = { fullName, email };

    localStorage.setItem("mockUser", JSON.stringify(mockUser));

    set({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    return true;
  },

  // ================= FETCH DASHBOARD (MOCK) =================
  fetchDashboard: async () => {
    set({ isLoading: true });

    await new Promise((res) => setTimeout(res, 800));

    set({
      dashboardData: {
        stats: {
          marketViability: 78,
          investorConfidence: 64,
          customerDemand: 85,
        },
        messages: [
          "Your idea shows strong traction.",
          "Investors are moderately interested.",
          "Customer demand looks promising.",
        ],
      },
      isLoading: false,
    });
  },

  // ================= LOGOUT =================
  logout: () => {
    localStorage.removeItem("mockUser");

    set({
      user: null,
      dashboardData: null,
      isAuthenticated: false,
    });
  },

}));