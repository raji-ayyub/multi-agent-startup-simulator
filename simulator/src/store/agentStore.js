import { create } from "zustand";
import { devtools } from "zustand/middleware";

const useAgentStore = create(
  devtools((set) => ({
    agents: {
      market: {
        score: null,
        analysis: "",
        risks: [],
      },
      customer: {
        score: null,
        analysis: "",
        risks: [],
      },
      investor: {
        score: null,
        analysis: "",
        risks: [],
      },
    },

    setAgentResult: (agentName, data) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [agentName]: data,
        },
      })),

    clearAgents: () =>
      set({
        agents: {
          market: { score: null, analysis: "", risks: [] },
          customer: { score: null, analysis: "", risks: [] },
          investor: { score: null, analysis: "", risks: [] },
        },
      }),
  }))
);

export default useAgentStore;
