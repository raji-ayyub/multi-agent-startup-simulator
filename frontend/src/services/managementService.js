import api, { getApiErrorMessage } from "../api/axios";

const getCurrentUserEmail = () => {
  try {
    const raw = localStorage.getItem("authUser");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.email || null;
  } catch {
    return null;
  }
};

export async function listManagementWorkspaces(ownerEmail = null) {
  const email = ownerEmail || getCurrentUserEmail();
  if (!email) return [];
  try {
    const { data } = await api.get("/api/v1/management/workspaces", {
      params: { owner_email: email, limit: 50 },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load management workspaces."));
  }
}

export async function createManagementWorkspace(payload) {
  try {
    const { data } = await api.post("/api/v1/management/workspaces", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create management workspace."));
  }
}

export async function updateManagementWorkspace(workspaceId, payload) {
  try {
    const { data } = await api.patch(`/api/v1/management/workspaces/${workspaceId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update management workspace."));
  }
}

export async function getManagementWorkspace(workspaceId) {
  try {
    const { data } = await api.get(`/api/v1/management/workspaces/${workspaceId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load workspace details."));
  }
}

export async function generateManagementPlan(workspaceId, payload) {
  try {
    const { data } = await api.post(`/api/v1/management/workspaces/${workspaceId}/plan`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to generate management plan."));
  }
}
