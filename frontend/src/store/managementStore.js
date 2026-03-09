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

function createAgentEvent({ phase, status, message }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    phase,
    status,
    message,
  };
}

const useManagementStore = create((set, get) => ({
  isLoading: false,
  isSaving: false,
  isPlanning: false,
  error: null,
  workspaces: [],
  activeWorkspace: null,
  latestPlan: null,
  planHistory: [],
  agentEvents: [],
  newWorkspaceForm: { ...defaultWorkspaceForm },

  logAgentEvent: ({ phase, status, message }) =>
    set((state) => ({
      agentEvents: [createAgentEvent({ phase, status, message }), ...state.agentEvents].slice(0, 120),
    })),

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
    get().logAgentEvent({
      phase: "workspace-sync",
      status: "RUNNING",
      message: "Syncing management workspaces.",
    });
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
      get().logAgentEvent({
        phase: "workspace-sync",
        status: "DONE",
        message: `Loaded ${workspaces.length} workspace(s).`,
      });
      return workspaces;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.message || "Unable to load workspaces.",
      });
      get().logAgentEvent({
        phase: "workspace-sync",
        status: "ERROR",
        message: error?.message || "Workspace sync failed.",
      });
      return [];
    }
  },

  createWorkspace: async (payload) => {
    get().logAgentEvent({
      phase: "workspace-create",
      status: "RUNNING",
      message: `Creating workspace '${payload?.workspace_name || "Untitled"}'.`,
    });
    set({ isSaving: true, error: null });
    try {
      const created = await createManagementWorkspace(payload);
      set((state) => ({
        isSaving: false,
        workspaces: [created, ...state.workspaces.filter((item) => item.workspace_id !== created.workspace_id)],
        activeWorkspace: created,
        latestPlan: null,
      }));
      get().logAgentEvent({
        phase: "workspace-create",
        status: "DONE",
        message: `Workspace '${created.workspace_name}' created.`,
      });
      return created;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to create workspace.",
      });
      get().logAgentEvent({
        phase: "workspace-create",
        status: "ERROR",
        message: error?.message || "Workspace creation failed.",
      });
      throw error;
    }
  },

  selectWorkspace: async (workspaceId) => {
    get().logAgentEvent({
      phase: "workspace-select",
      status: "RUNNING",
      message: "Loading selected workspace context.",
    });
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
      get().logAgentEvent({
        phase: "workspace-select",
        status: "DONE",
        message: `Workspace '${detail.workspace_name}' loaded.`,
      });
      return detail;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.message || "Unable to load workspace.",
      });
      get().logAgentEvent({
        phase: "workspace-select",
        status: "ERROR",
        message: error?.message || "Workspace load failed.",
      });
      return null;
    }
  },

  updateActiveWorkspace: async (payload) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    get().logAgentEvent({
      phase: "workspace-update",
      status: "RUNNING",
      message: "Updating workspace profile.",
    });
    set({ isSaving: true, error: null });
    try {
      const updated = await updateManagementWorkspace(workspaceId, payload);
      set((state) => ({
        isSaving: false,
        activeWorkspace: updated,
        workspaces: state.workspaces.map((item) => (item.workspace_id === updated.workspace_id ? updated : item)),
      }));
      get().logAgentEvent({
        phase: "workspace-update",
        status: "DONE",
        message: `Workspace '${updated.workspace_name}' updated.`,
      });
      return updated;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to update workspace.",
      });
      get().logAgentEvent({
        phase: "workspace-update",
        status: "ERROR",
        message: error?.message || "Workspace update failed.",
      });
      throw error;
    }
  },

  createPlan: async ({ objective, time_horizon_weeks }) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    get().logAgentEvent({
      phase: "plan-run",
      status: "RUNNING",
      message: `Running planning agents for '${objective}'.`,
    });
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
      get().logAgentEvent({
        phase: "plan-run",
        status: "DONE",
        message: `Plan generated for ${time_horizon_weeks} week horizon.`,
      });
      return plan;
    } catch (error) {
      set({
        isPlanning: false,
        error: error?.message || "Unable to generate plan.",
      });
      get().logAgentEvent({
        phase: "plan-run",
        status: "ERROR",
        message: error?.message || "Plan generation failed.",
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
    get().logAgentEvent({
      phase: "team-update",
      status: "RUNNING",
      message: `Adding team member '${payload?.name || "Unnamed"}'.`,
    });
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
      get().logAgentEvent({
        phase: "team-update",
        status: "DONE",
        message: "Team member added.",
      });
      return member;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to add team member.",
      });
      get().logAgentEvent({
        phase: "team-update",
        status: "ERROR",
        message: error?.message || "Add team member failed.",
      });
      throw error;
    }
  },

  updateTeamMember: async (memberId, payload) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return null;
    get().logAgentEvent({
      phase: "team-update",
      status: "RUNNING",
      message: `Updating team member '${payload?.name || memberId}'.`,
    });
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
      get().logAgentEvent({
        phase: "team-update",
        status: "DONE",
        message: "Team member updated.",
      });
      return updatedMember;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to update team member.",
      });
      get().logAgentEvent({
        phase: "team-update",
        status: "ERROR",
        message: error?.message || "Update team member failed.",
      });
      throw error;
    }
  },

  deleteTeamMember: async (memberId) => {
    const workspaceId = get().activeWorkspace?.workspace_id;
    if (!workspaceId) return false;
    get().logAgentEvent({
      phase: "team-update",
      status: "RUNNING",
      message: "Removing team member.",
    });
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
      get().logAgentEvent({
        phase: "team-update",
        status: "DONE",
        message: "Team member removed.",
      });
      return true;
    } catch (error) {
      set({
        isSaving: false,
        error: error?.message || "Unable to delete team member.",
      });
      get().logAgentEvent({
        phase: "team-update",
        status: "ERROR",
        message: error?.message || "Delete team member failed.",
      });
      throw error;
    }
  },
}));

export default useManagementStore;
