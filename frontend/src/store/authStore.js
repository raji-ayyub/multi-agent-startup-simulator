import { create } from "zustand";
import api, { getApiErrorMessage } from "../api/axios";

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    name: user.full_name || user.fullName || user.name || "",
    fullName: user.full_name || user.fullName || user.name || "",
  };
};

const persistSession = ({ accessToken, user }) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("authUser", JSON.stringify(normalizeUser(user)));
};

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authUser");
};

export const useAuthStore = create((set) => ({
  user: null,
  dashboardData: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    const token = localStorage.getItem("accessToken");
    const savedUserRaw = localStorage.getItem("authUser");
    const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;

    if (!token || !savedUser?.email) {
      clearSession();
      set({ user: null, isAuthenticated: false, error: null });
      return false;
    }

    try {
      const { data } = await api.get("/api/v1/auth/profile", {
        params: { email: savedUser.email },
      });

      const user = normalizeUser(data);
      localStorage.setItem("authUser", JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        error: null,
      });

      return true;
    } catch (error) {
      clearSession();
      set({
        user: null,
        isAuthenticated: false,
        error: getApiErrorMessage(error, "Session expired."),
      });
      return false;
    }
  },

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });

    try {
      const { data } = await api.post("/api/v1/auth/sign-in", { email, password });
      const user = normalizeUser(data.user);

      persistSession({ accessToken: data.access_token, user });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        error: getApiErrorMessage(error, "Unable to sign in."),
      });
      return false;
    }
  },

  signup: async ({ fullName, email, password }) => {
    set({ isLoading: true, error: null });

    try {
      const payload = {
        full_name: fullName,
        email,
        password,
        company_name: null,
      };

      const { data } = await api.post("/api/v1/auth/sign-up", payload);
      const user = normalizeUser(data.user);

      persistSession({ accessToken: data.access_token, user });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        error: getApiErrorMessage(error, "Unable to create account."),
      });
      return false;
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });

    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      set({ isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, "Unable to request password reset."),
      });
      return false;
    }
  },

  resetPasswordConfirm: async (token, newPassword) => {
    set({ isLoading: true, error: null });

    try {
      await api.post("/api/v1/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      set({ isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, "Unable to reset password."),
      });
      return false;
    }
  },

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

  logout: () => {
    clearSession();
    set({
      user: null,
      dashboardData: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
