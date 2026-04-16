import { create } from "zustand";

import api, { getApiErrorMessage } from "../api/axios";
import useNotificationStore from "./notificationStore";

export const DEFAULT_ROLE = "FOUNDER";

export const getDefaultRouteForRole = (role) => {
  switch (String(role || DEFAULT_ROLE).toUpperCase()) {
    case "OPERATOR":
      return "/management";
    case "ADMIN":
      return "/admin/dashboard";
    case "FOUNDER":
    default:
      return "/dashboard";
  }
};

const normalizeUser = (user) => {
  if (!user) return null;
  const fullName = user.full_name || user.fullName || user.name || "";
  return {
    ...user,
    role: String(user.role || DEFAULT_ROLE).toUpperCase(),
    title: user.title || "",
    name: fullName,
    fullName,
  };
};

const readPersistedSession = () => {
  try {
    const token = localStorage.getItem("accessToken");
    const rawUser = localStorage.getItem("authUser");
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    return {
      token: token || "",
      user: normalizeUser(parsedUser),
    };
  } catch {
    return { token: "", user: null };
  }
};

const persistSession = ({ accessToken, user }) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("authUser", JSON.stringify(normalizeUser(user)));
};

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authUser");
  useNotificationStore.getState().reset();
};

const initialSession = readPersistedSession();
let authCheckPromise = null;

export const useAuthStore = create((set, get) => ({
  user: initialSession.user,
  dashboardData: null,
  isAuthenticated: Boolean(initialSession.token && initialSession.user),
  hasHydrated: !initialSession.token,
  isLoading: false,
  error: null,

  checkAuth: async (force = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      clearSession();
      set({ user: null, isAuthenticated: false, hasHydrated: true, isLoading: false, error: null });
      return false;
    }
    if (!force && get().hasHydrated && get().isAuthenticated) {
      return true;
    }
    if (!force && authCheckPromise) {
      return authCheckPromise;
    }

    set({ isLoading: true, error: null });
    authCheckPromise = (async () => {
      try {
        const { data } = await api.get("/api/v1/auth/me");
        const user = normalizeUser(data);
        localStorage.setItem("authUser", JSON.stringify(user));
        set({ user, isAuthenticated: true, hasHydrated: true, isLoading: false, error: null });
        return true;
      } catch (error) {
        clearSession();
        set({
          user: null,
          isAuthenticated: false,
          hasHydrated: true,
          isLoading: false,
          error: getApiErrorMessage(error, "Session expired."),
        });
        return false;
      } finally {
        authCheckPromise = null;
      }
    })();
    return authCheckPromise;
  },

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/v1/auth/sign-in", { email, password });
      const user = normalizeUser(data.user);
      persistSession({ accessToken: data.access_token, user });
      set({ user, isAuthenticated: true, hasHydrated: true, isLoading: false, error: null });
      return { ok: true, route: getDefaultRouteForRole(user.role) };
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        hasHydrated: true,
        error: getApiErrorMessage(error, "Unable to sign in."),
      });
      return { ok: false, route: null };
    }
  },

  signup: async ({ fullName, email, password, role }) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        full_name: fullName,
        email,
        password,
        company_name: null,
        role: String(role || DEFAULT_ROLE).toUpperCase(),
      };
      const { data } = await api.post("/api/v1/auth/sign-up", payload);
      const user = normalizeUser(data.user);
      persistSession({ accessToken: data.access_token, user });
      set({ user, isAuthenticated: true, hasHydrated: true, isLoading: false, error: null });
      return { ok: true, route: getDefaultRouteForRole(user.role) };
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        hasHydrated: true,
        error: getApiErrorMessage(error, "Unable to create account."),
      });
      return { ok: false, route: null };
    }
  },

  registerAdmin: async ({ fullName, email, password, adminSecret }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/v1/auth/private-admin/register", {
        full_name: fullName,
        email,
        password,
        company_name: "PentraAI",
        admin_setup_secret: adminSecret,
        role: "ADMIN",
      });
      const user = normalizeUser(data.user);
      persistSession({ accessToken: data.access_token, user });
      set({ user, isAuthenticated: true, hasHydrated: true, isLoading: false, error: null });
      return { ok: true, route: getDefaultRouteForRole(user.role) };
    } catch (error) {
      set({
        isLoading: false,
        hasHydrated: true,
        error: getApiErrorMessage(error, "Unable to create admin account."),
      });
      return { ok: false, route: null };
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.patch("/api/v1/auth/profile", payload);
      const user = normalizeUser(data);
      localStorage.setItem("authUser", JSON.stringify(user));
      set({ user, isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, "Unable to update profile."),
      });
      return false;
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      set({ isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, "Unable to change password."),
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

  logout: () => {
    clearSession();
    set({
      user: null,
      dashboardData: null,
      isAuthenticated: false,
      hasHydrated: true,
      error: null,
    });
  },
}));
