import { create } from "zustand";
import {
  deleteSimulation,
  extractSimulationFile,
  getSimulation,
  intakeSimulationTurn,
  listSimulations,
  rerunSimulation,
  runSimulation,
} from "../services/simulationService";

const INITIAL_IDEA = {
  name: "",
  problem: "",
  targetMarket: "",
  revenueModel: "",
  competitiveAdvantage: "",
  additionalInfo: [],
  startupName: "",
  elevatorPitch: "",
  problemStatement: "",
  targetAudience: "",
  problemUrgency: "HIGH",
  primaryTargetSegment: "",
  geography: "",
  marketSizeEstimate: "",
  customerBehaviorPainPoints: "",
  competitorPatterns: "",
  monthlyBurn: "",
  estimatedCac: "",
  currentCashInHand: "",
  marketingStrategy: "",
};

const DEFAULT_METRICS = {
  marketViability: null,
  investorConfidence: null,
  customerDemand: null,
};

try {
  localStorage.removeItem("simulation-storage");
} catch {
  // ignore storage access issues
}

const mapSummaryToRecent = (item) => ({
  id: item.simulation_id,
  name: item.startup_name,
  createdAt: item.created_at,
  status: item.status || "completed",
  score: item.overall_score,
  metrics: item.metrics || DEFAULT_METRICS,
});

const useSimulationStore = create((set, get) => ({
  startupIdea: { ...INITIAL_IDEA },
  isRunning: false,
  isLoadingHistory: false,
  overallScore: null,
  recommendations: [],
  simulationError: null,
  lastSimulationResult: null,
  recentSimulations: [],
  activeSimulation: null,
  dashboardMetrics: { ...DEFAULT_METRICS },

  updateField: (field, value) =>
    set((state) => ({
      startupIdea: {
        ...state.startupIdea,
        [field]: value,
      },
    })),

  patchIdeaFields: (payload) =>
    set((state) => ({
      startupIdea: {
        ...state.startupIdea,
        ...payload,
      },
    })),

  addAdditionalField: () =>
    set((state) => ({
      startupIdea: {
        ...state.startupIdea,
        additionalInfo: [...(state.startupIdea.additionalInfo || []), { label: "", value: "" }],
      },
    })),

  updateAdditionalField: (index, field, value) =>
    set((state) => {
      const updated = [...(state.startupIdea.additionalInfo || [])];
      if (!updated[index]) return state;
      updated[index] = { ...updated[index], [field]: value };
      return {
        startupIdea: {
          ...state.startupIdea,
          additionalInfo: updated,
        },
      };
    }),

  removeAdditionalField: (index) =>
    set((state) => ({
      startupIdea: {
        ...state.startupIdea,
        additionalInfo: (state.startupIdea.additionalInfo || []).filter((_, i) => i !== index),
      },
    })),

  fetchSimulations: async () => {
    set({ isLoadingHistory: true, simulationError: null });
    try {
      const data = await listSimulations();
      const recent = data.map(mapSummaryToRecent);
      const latest = recent[0] || null;
      set({
        isLoadingHistory: false,
        recentSimulations: recent,
        overallScore: latest?.score ?? null,
        dashboardMetrics: latest?.metrics || { ...DEFAULT_METRICS },
      });
      return recent;
    } catch (error) {
      set({
        isLoadingHistory: false,
        simulationError: error?.message || "Unable to load simulation history.",
      });
      return [];
    }
  },

  fetchSimulationDetail: async (simulationId) => {
    set({ simulationError: null });
    try {
      const detail = await getSimulation(simulationId);
      set({
        activeSimulation: detail,
        lastSimulationResult: detail,
      });
      return detail;
    } catch (error) {
      set({
        simulationError: error?.message || "Unable to load simulation details.",
      });
      return null;
    }
  },

  rerunSimulationFromExisting: async ({ simulationId, overrides = {}, runAsNewVersion = false }) => {
    set({ isRunning: true, simulationError: null });
    try {
      const response = await rerunSimulation(simulationId, {
        ...overrides,
        run_as_new_version: Boolean(runAsNewVersion),
      });
      const summary = mapSummaryToRecent({
        simulation_id: response.simulation_id,
        startup_name: response.startup_name,
        created_at: new Date().toISOString(),
        status: response.status,
        overall_score: response.overall_score,
        metrics: response.metrics,
      });

      set((state) => ({
        isRunning: false,
        overallScore: response.overall_score,
        recommendations: response.recommendations || [],
        simulationError: null,
        lastSimulationResult: response,
        activeSimulation: response,
        dashboardMetrics: response.metrics || { ...DEFAULT_METRICS },
        recentSimulations: [summary, ...state.recentSimulations.filter((x) => x.id !== summary.id)].slice(0, 50),
      }));
      return response;
    } catch (error) {
      set({
        isRunning: false,
        simulationError: error?.message || "Simulation rerun failed.",
      });
      throw error;
    }
  },

  removeSimulation: async (simulationId) => {
    set({ simulationError: null });
    try {
      await deleteSimulation(simulationId);
      set((state) => {
        const filtered = state.recentSimulations.filter((item) => item.id !== simulationId);
        const shouldClearActive = state.activeSimulation?.simulation_id === simulationId;
        return {
          recentSimulations: filtered,
          activeSimulation: shouldClearActive ? null : state.activeSimulation,
          lastSimulationResult: shouldClearActive ? null : state.lastSimulationResult,
        };
      });
      return true;
    } catch (error) {
      set({
        simulationError: error?.message || "Unable to delete simulation.",
      });
      return false;
    }
  },

  startSimulation: async () => {
    const { startupIdea } = get();
    return get().launchSimulationFromBrief(startupIdea);
  },

  launchSimulationFromBrief: async (brief) => {
    set({ isRunning: true, simulationError: null });
    try {
      set((state) => ({
        startupIdea: {
          ...state.startupIdea,
          ...brief,
          name: brief.startupName || state.startupIdea.name,
          problem: brief.problemStatement || state.startupIdea.problem,
          targetMarket: brief.primaryTargetSegment || state.startupIdea.targetMarket,
          revenueModel: brief.marketingStrategy || state.startupIdea.revenueModel,
          competitiveAdvantage: brief.elevatorPitch || state.startupIdea.competitiveAdvantage,
        },
      }));

      const response = await runSimulation(get().startupIdea);
      const summary = mapSummaryToRecent({
        simulation_id: response.simulation_id,
        startup_name: response.startup_name,
        created_at: new Date().toISOString(),
        status: response.status,
        overall_score: response.overall_score,
        metrics: response.metrics,
      });

      set((state) => ({
        isRunning: false,
        overallScore: response.overall_score,
        recommendations: response.recommendations || [],
        simulationError: null,
        lastSimulationResult: response,
        activeSimulation: response,
        dashboardMetrics: response.metrics || { ...DEFAULT_METRICS },
        recentSimulations: [summary, ...state.recentSimulations.filter((x) => x.id !== summary.id)].slice(0, 50),
      }));

      return response;
    } catch (error) {
      set({
        isRunning: false,
        simulationError: error?.message || "Simulation failed.",
      });
      throw error;
    }
  },

  runIntakeTurn: async ({ draft, userMessage, history }) => {
    try {
      const response = await intakeSimulationTurn({ draft, userMessage, history });
      if (response?.collected_fields) {
        set((state) => ({
          startupIdea: {
            ...state.startupIdea,
            ...response.collected_fields,
          },
        }));
      }
      return response;
    } catch (error) {
      set({
        simulationError: error?.message || "Unable to process intake conversation.",
      });
      throw error;
    }
  },

  uploadIntakeFile: async (file) => {
    try {
      const response = await extractSimulationFile(file);
      set({ simulationError: null });
      return response;
    } catch (error) {
      set({
        simulationError: error?.message || "Unable to read uploaded file.",
      });
      throw error;
    }
  },

  saveDraft: (draft) => {
    localStorage.setItem("simulationDraft", JSON.stringify(draft));
  },

  loadDraft: () => {
    const raw = localStorage.getItem("simulationDraft");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearDraft: () => {
    localStorage.removeItem("simulationDraft");
  },

  finishSimulation: (score, recommendations) =>
    set({
      isRunning: false,
      overallScore: score,
      recommendations,
    }),

  resetSimulation: () =>
    set({
      startupIdea: { ...INITIAL_IDEA },
      isRunning: false,
      overallScore: null,
      recommendations: [],
      simulationError: null,
      lastSimulationResult: null,
      activeSimulation: null,
      dashboardMetrics: { ...DEFAULT_METRICS },
    }),
}));

export default useSimulationStore;
