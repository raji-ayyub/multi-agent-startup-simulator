import api, { getApiErrorMessage } from "../api/axios";

const toBackendPayload = (brief) => ({
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
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Simulation request failed."));
  }
}
