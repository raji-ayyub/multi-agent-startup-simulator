import { create } from "zustand";
import {
  createManagementWorkspace,
  generateManagementPlan,
  getManagementWorkspace,
  listManagementWorkspaces,
  updateManagementWorkspace,
} from "../services/managementService";

const defaultWorkspaceForm = {
  company_name: "",
  workspace_name: "",
  description: "",
  industry: "",
  stage: "",
  annual_revenue: "",
  employee_count: 0,
  qualifications: [],
};

const useManagementStore = create((set, get) => ({
  isLoading: false,
  isSaving: false,
  isPlanning: false,
  error: null,
  workspaces: [],
  activeWorkspace: null,
  latestPlan: null,
  planHistory: [],
  newWorkspaceForm: { ...defaultWorkspaceForm },

  setWorkspaceFormField: (field, value) =>
    set((state) => ({
      newWorkspaceForm: {
        ...state.newWorkspaceForm,
        [field]: value,
      },
    })),

  resetWorkspaceForm: () =>
    set({
      newWorkspaceForm: { ...defaultWorkspaceForm },
    }),

  fetchWorkspaces: async (ownerEmail) => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await listManagementWorkspaces(ownerEmail);
      const activeWorkspace =
        workspaces.find((item) => item.workspace_id === get().activeWorkspace?.workspace_id) || workspaces[0] || null;
      set({
        isLoading: false,
        workspaces,
        activeWorkspace,
      });
      return workspaces;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.message || "Unable to load workspaces.",
      });
      return [];
    }
  },

  createWorkspace: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const created = await createManagementWorkspace(payload);
      set((state) => ({
        isSaving: false,
        workspaces: [created, ...state.workspaces.filter((item) => item.workspace_id !== created.workspace_id)],
        activeWorkspace: created,
        latestPlan: null,
      }));
      return created;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to create workspace.",
      });
      throw error;
    }
  },

  selectWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const detail = await getManagementWorkspace(workspaceId);
      set({ isLoading: false, activeWorkspace: detail });
      return detail;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.message || "Unable to load workspace.",
      });
      return null;
    }
  },

  updateActiveWorkspace: async (payload) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    set({ isSaving: true, error: null });
    try {
      const updated = await updateManagementWorkspace(workspaceId, payload);
      set((state) => ({
        isSaving: false,
        activeWorkspace: updated,
        workspaces: state.workspaces.map((item) => (item.workspace_id === updated.workspace_id ? updated : item)),
      }));
      return updated;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to update workspace.",
      });
      throw error;
    }
  },

  createPlan: async ({ objective, time_horizon_weeks }) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    set({ isPlanning: true, error: null });
    try {
      const plan = await generateManagementPlan(workspaceId, {
        objective,
        time_horizon_weeks,
      });
      const historyItem = {
        id: `${workspaceId}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...plan,
      };
      set((state) => ({
        isPlanning: false,
        latestPlan: plan,
        planHistory: [historyItem, ...state.planHistory].slice(0, 25),
      }));
      return plan;
    } catch (error) {
      set({
        isPlanning: false,
        error: error?.message || "Unable to generate plan.",
      });
      throw error;
    }
  },
}));

export default useManagementStore;
