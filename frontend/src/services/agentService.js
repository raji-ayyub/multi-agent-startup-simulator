import api, { getApiErrorMessage } from "../api/axios";

export async function listAgentCatalog() {
  try {
    const { data } = await api.get("/api/v1/agents/catalog");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load agent catalog."));
  }
}

export async function listAgentRequests() {
  try {
    const { data } = await api.get("/api/v1/agents/requests");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load agent requests."));
  }
}

export async function listActiveAgents() {
  try {
    const { data } = await api.get("/api/v1/agents/active");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load approved agents."));
  }
}

export async function createAgentRequest(payload) {
  try {
    const { data } = await api.post("/api/v1/agents/requests", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to submit agent request."));
  }
}

export async function decideAgentRequest(requestId, payload) {
  try {
    const { data } = await api.patch(`/api/v1/agents/requests/${requestId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update agent request."));
  }
}

export async function getAdminOverview() {
  try {
    const { data } = await api.get("/api/v1/admin/overview");
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load admin overview."));
  }
}

export async function listUsers() {
  try {
    const { data } = await api.get("/api/v1/auth/users");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load users."));
  }
}
