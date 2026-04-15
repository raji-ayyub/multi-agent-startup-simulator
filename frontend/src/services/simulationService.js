import api, { getApiErrorMessage } from "../api/axios";

const SIMULATIONS_CACHE_TTL_MS = 20000;
const simulationsCache = new Map();
const simulationsInFlight = new Map();

const getCurrentUserEmail = () => {
  try {
    const raw = localStorage.getItem("authUser");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.email || null;
  } catch {
    return null;
  }
};

const toBackendPayload = (brief) => ({
  owner_email: getCurrentUserEmail(),
  startup_name: brief.startupName || brief.name || "",
  elevator_pitch: brief.elevatorPitch || "",
  problem_statement: brief.problemStatement || brief.problem || "",
  target_audience: brief.targetAudience || brief.targetMarket || "",
  problem_urgency: brief.problemUrgency || "HIGH",
  primary_target_segment: brief.primaryTargetSegment || brief.targetMarket || "",
  geography: brief.geography || "",
  market_size_estimate: brief.marketSizeEstimate || "",
  customer_behavior_pain_points: brief.customerBehaviorPainPoints || brief.problem || "",
  competitor_patterns: brief.competitorPatterns || "",
  monthly_burn: brief.monthlyBurn || "",
  estimated_cac: brief.estimatedCac || "",
  current_cash_in_hand: brief.currentCashInHand || "",
  marketing_strategy: brief.marketingStrategy || brief.revenueModel || "",
});

export async function runSimulation(brief) {
  try {
    const { data } = await api.post("/api/v1/simulations/run", toBackendPayload(brief));
    invalidateSimulationsCache();
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Simulation request failed."));
  }
}

export async function intakeSimulationTurn(payload) {
  try {
    const { data } = await api.post("/api/v1/simulations/intake/turn", {
      draft: payload?.draft || {},
      user_message: payload?.userMessage || "",
      history: Array.isArray(payload?.history) ? payload.history : [],
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Intake assistant request failed."));
  }
}

export async function extractSimulationFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/api/v1/simulations/intake/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to read uploaded file."));
  }
}

export async function listSimulations() {
  const email = getCurrentUserEmail() || "__anonymous__";
  const cacheKey = `list:${email}`;
  const now = Date.now();
  const cached = simulationsCache.get(cacheKey);
  if (cached && now - cached.ts < SIMULATIONS_CACHE_TTL_MS) {
    return cached.items;
  }

  if (simulationsInFlight.has(cacheKey)) {
    return simulationsInFlight.get(cacheKey);
  }

  const request = (async () => {
    try {
      const { data } = await api.get("/api/v1/simulations", {
        params: email !== "__anonymous__" ? { email, limit: 50 } : { limit: 50 },
      });
      const items = Array.isArray(data) ? data : [];
      simulationsCache.set(cacheKey, { ts: Date.now(), items });
      return items;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Unable to load simulations."));
    } finally {
      simulationsInFlight.delete(cacheKey);
    }
  })();

  simulationsInFlight.set(cacheKey, request);
  return request;
}

export function invalidateSimulationsCache() {
  simulationsCache.clear();
  simulationsInFlight.clear();
}

export async function getSimulation(simulationId) {
  try {
    const { data } = await api.get(`/api/v1/simulations/${simulationId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load simulation details."));
  }
}

export async function rerunSimulation(simulationId, payload) {
  try {
    const { data } = await api.post(`/api/v1/simulations/${simulationId}/rerun`, payload || {});
    invalidateSimulationsCache();
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to rerun simulation."));
  }
}

export async function deleteSimulation(simulationId) {
  try {
    const { data } = await api.delete(`/api/v1/simulations/${simulationId}`);
    invalidateSimulationsCache();
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete simulation."));
  }
}
