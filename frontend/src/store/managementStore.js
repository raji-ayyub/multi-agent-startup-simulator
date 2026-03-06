import { create } from "zustand";
import {
  addWorkspaceTeamMember,
  createManagementWorkspace,
  deleteWorkspaceTeamMember,
  generateManagementPlan,
  getManagementWorkspace,
  listManagementPlans,
  listManagementWorkspaces,
  listWorkspaceTeamMembers,
  updateManagementWorkspace,
  updateWorkspaceTeamMember,
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

  loadWorkspacePlanHistory: async (workspaceId) => {
    if (!workspaceId) return [];
    try {
      return await listManagementPlans(workspaceId, 25);
    } catch {
      return [];
    }
  },

  fetchWorkspaces: async (ownerEmail) => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await listManagementWorkspaces(ownerEmail);
      const activeWorkspace =
        workspaces.find((item) => item.workspace_id === get().activeWorkspace?.workspace_id) || workspaces[0] || null;
      const planHistory = activeWorkspace ? await get().loadWorkspacePlanHistory(activeWorkspace.workspace_id) : [];
      set({
        isLoading: false,
        workspaces,
        activeWorkspace,
        latestPlan: planHistory[0] || null,
        planHistory,
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
      const planHistory = await get().loadWorkspacePlanHistory(workspaceId);
      set({
        isLoading: false,
        activeWorkspace: detail,
        latestPlan: planHistory[0] || null,
        planHistory,
      });
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
      set((state) => ({
        isPlanning: false,
        latestPlan: plan,
        planHistory: [plan, ...state.planHistory.filter((item) => item.plan_id !== plan.plan_id)].slice(0, 25),
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

  refreshActiveWorkspaceTeam: async () => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return [];
    try {
      const teamMembers = await listWorkspaceTeamMembers(workspaceId);
      set((state) => {
        const activeWorkspace = state.activeWorkspace
          ? { ...state.activeWorkspace, team_members: teamMembers }
          : state.activeWorkspace;
        const workspaces = state.workspaces.map((item) =>
          item.workspace_id === workspaceId ? { ...item, team_members: teamMembers } : item
        );
        return { activeWorkspace, workspaces };
      });
      return teamMembers;
    } catch (error) {
      set({
        error: error?.message || "Unable to load team members.",
      });
      return [];
    }
  },

  addTeamMember: async (payload) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    set({ isSaving: true, error: null });
    try {
      const member = await addWorkspaceTeamMember(workspaceId, payload);
      set((state) => {
        const currentMembers = state.activeWorkspace?.team_members || [];
        const teamMembers = [...currentMembers, member];
        const activeWorkspace = state.activeWorkspace
          ? { ...state.activeWorkspace, team_members: teamMembers }
          : state.activeWorkspace;
        const workspaces = state.workspaces.map((item) =>
          item.workspace_id === workspaceId ? { ...item, team_members: teamMembers } : item
        );
        return { isSaving: false, activeWorkspace, workspaces };
      });
      return member;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to add team member.",
      });
      throw error;
    }
  },

  updateTeamMember: async (memberId, payload) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    set({ isSaving: true, error: null });
    try {
      const updatedMember = await updateWorkspaceTeamMember(workspaceId, memberId, payload);
      set((state) => {
        const currentMembers = state.activeWorkspace?.team_members || [];
        const teamMembers = currentMembers.map((item) => (item.member_id === memberId ? updatedMember : item));
        const activeWorkspace = state.activeWorkspace
          ? { ...state.activeWorkspace, team_members: teamMembers }
          : state.activeWorkspace;
        const workspaces = state.workspaces.map((item) =>
          item.workspace_id === workspaceId ? { ...item, team_members: teamMembers } : item
        );
        return { isSaving: false, activeWorkspace, workspaces };
      });
      return updatedMember;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to update team member.",
      });
      throw error;
    }
  },

  deleteTeamMember: async (memberId) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return false;
    set({ isSaving: true, error: null });
    try {
      await deleteWorkspaceTeamMember(workspaceId, memberId);
      set((state) => {
        const currentMembers = state.activeWorkspace?.team_members || [];
        const teamMembers = currentMembers.filter((item) => item.member_id !== memberId);
        const activeWorkspace = state.activeWorkspace
          ? { ...state.activeWorkspace, team_members: teamMembers }
          : state.activeWorkspace;
        const workspaces = state.workspaces.map((item) =>
          item.workspace_id === workspaceId ? { ...item, team_members: teamMembers } : item
        );
        return { isSaving: false, activeWorkspace, workspaces };
      });
      return true;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to delete team member.",
      });
      throw error;
    }
  },
}));

export default useManagementStore;
