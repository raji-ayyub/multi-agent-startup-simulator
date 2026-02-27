import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { runSimulation } from "../services/simulationService";

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const currencyToNumber = (value) => {
  if (value == null) return 0;
  const normalized = String(value).replace(/[^0-9.]/g, "");
  return Number.parseFloat(normalized || "0");
};

const buildSimulationResult = (idea, fallbackName = "Untitled Simulation") => {
  const urgencyBoost = { LOW: 2, MEDIUM: 5, HIGH: 10, CRITICAL: 13 }[idea.problemUrgency] || 0;
  const burn = currencyToNumber(idea.monthlyBurn);
  const cash = currencyToNumber(idea.currentCashInHand);
  const cac = currencyToNumber(idea.estimatedCac);

  const marketViability = clamp(
    48 +
      urgencyBoost +
      (idea.primaryTargetSegment ? 10 : 0) +
      (idea.marketSizeEstimate ? 8 : 0) +
      (idea.competitorPatterns ? 4 : 0),
    35,
    95
  );

  const investorConfidence = clamp(
    42 +
      (idea.elevatorPitch ? 8 : 0) +
      (idea.marketingStrategy ? 6 : 0) +
      (cash > 0 && burn > 0 ? Math.min((cash / Math.max(burn, 1)) * 6, 25) : 4),
    30,
    94
  );

  const customerDemand = clamp(
    46 +
      (idea.targetAudience ? 10 : 0) +
      (idea.customerBehaviorPainPoints ? 10 : 0) +
      (cac > 0 ? Math.max(16 - Math.round(cac / 200), 0) : 6),
    32,
    96
  );

  const overallScore = Math.round((marketViability + investorConfidence + customerDemand) / 3);
  const startupName = idea.startupName || idea.name || fallbackName;

  return {
    startupName,
    overallScore,
    marketViability,
    investorConfidence,
    customerDemand,
  };
};

const useSimulationStore = create(
  devtools(
    persist(
      (set, get) => ({
        startupIdea: { ...INITIAL_IDEA },
        isRunning: false,
        overallScore: null,
        recommendations: [],
        simulationError: null,
        recentSimulations: [],
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

        startSimulation: async () => {
          set({ isRunning: true, simulationError: null });
          try {
            const { startupIdea, recentSimulations } = get();
            const response = await runSimulation(startupIdea);
            const result = {
              startupName: response.startup_name,
              overallScore: response.overall_score,
              marketViability: response.metrics.marketViability,
              investorConfidence: response.metrics.investorConfidence,
              customerDemand: response.metrics.customerDemand,
            };
            const recommendations =
              response.recommendations || [
                "Validate your strongest assumption with 10 customer interviews.",
                "Tighten CAC forecasting before budget expansion.",
                "Prioritize one segment before scaling channels.",
              ];

            const simulation = {
              id: response.simulation_id || Date.now(),
              name: result.startupName,
              createdAt: new Date().toISOString(),
              status: "Completed",
              score: result.overallScore,
              metrics: {
                marketViability: result.marketViability,
                investorConfidence: result.investorConfidence,
                customerDemand: result.customerDemand,
              },
            };

            set({
              isRunning: false,
              overallScore: result.overallScore,
              recommendations,
              simulationError: null,
              dashboardMetrics: simulation.metrics,
              recentSimulations: [simulation, ...recentSimulations].slice(0, 8),
            });
          } catch (error) {
            set({
              isRunning: false,
              simulationError: error?.message || "Simulation failed.",
            });
            throw error;
          }
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
            const { startupIdea, recentSimulations } = get();
            const response = await runSimulation(startupIdea);
            const result = {
              startupName: response.startup_name,
              overallScore: response.overall_score,
              marketViability: response.metrics.marketViability,
              investorConfidence: response.metrics.investorConfidence,
              customerDemand: response.metrics.customerDemand,
            };
            const recommendations =
              response.recommendations || [
                "Benchmark top three competitors by pricing and positioning.",
                "Stress-test runway using a worst-case CAC scenario.",
                "Prioritize one acquisition channel for the next sprint.",
              ];

            const simulation = {
              id: response.simulation_id || Date.now(),
              name: result.startupName,
              createdAt: new Date().toISOString(),
              status: "Completed",
              score: result.overallScore,
              metrics: {
                marketViability: result.marketViability,
                investorConfidence: result.investorConfidence,
                customerDemand: result.customerDemand,
              },
            };

            set({
              isRunning: false,
              overallScore: result.overallScore,
              recommendations,
              simulationError: null,
              dashboardMetrics: simulation.metrics,
              recentSimulations: [simulation, ...recentSimulations].slice(0, 8),
            });

            return simulation;
          } catch (error) {
            set({
              isRunning: false,
              simulationError: error?.message || "Simulation failed.",
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
          }),
      }),
      {
        name: "simulation-storage",
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
          startupIdea: {
            ...INITIAL_IDEA,
            ...(persistedState?.startupIdea || {}),
          },
          dashboardMetrics: {
            ...DEFAULT_METRICS,
            ...(persistedState?.dashboardMetrics || {}),
          },
          recentSimulations: Array.isArray(persistedState?.recentSimulations)
            ? persistedState.recentSimulations
            : [],
        }),
      }
    )
  )
);

export default useSimulationStore;
