// import { create } from "zustand";
// import { devtools, persist } from "zustand/middleware";

// const useSimulationStore = create(
//   devtools(
//     persist(
//       (set) => ({
//         // ===== STATE =====
//         startupIdea: {
//           name: "",
//           problem: "",
//           targetMarket: "",
//           revenueModel: "",
//           competitiveAdvantage: "",
//         },

//         isRunning: false,
//         overallScore: null,
//         recommendations: [],

//         // ===== ACTIONS =====
//         updateField: (field, value) =>
//           set((state) => ({
//             startupIdea: {
//               ...state.startupIdea,
//               [field]: value,
//             },
//           })),

//         startSimulation: () => set({ isRunning: true }),

//         finishSimulation: (score, recommendations) =>
//           set({
//             isRunning: false,
//             overallScore: score,
//             recommendations,
//           }),

//         resetSimulation: () =>
//           set({
//             startupIdea: {
//               name: "",
//               problem: "",
//               targetMarket: "",
//               revenueModel: "",
//               competitiveAdvantage: "",
//             },
//             isRunning: false,
//             overallScore: null,
//             recommendations: [],
//           }),
//       }),
//       {
//         name: "simulation-storage",
//       }
//     )
//   )
// );

// export default useSimulationStore;



import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/* ================= INITIAL STATE ================= */

const initialStartupIdea = {
  name: "",
  problem: "",
  targetMarket: "",
  revenueModel: "",
  competitiveAdvantage: "",
  additionalInfo: [],
};

const useSimulationStore = create(
  devtools(
    persist(
      (set, get) => ({
        /* ================= STATE ================= */

        startupIdea: { ...initialStartupIdea },

        isRunning: false,
        overallScore: null,
        recommendations: [],

        /* ================= BASIC FIELD UPDATE ================= */

        updateField: (field, value) =>
          set((state) => ({
            startupIdea: {
              ...state.startupIdea,
              [field]: value,
            },
          })),

        /* ================= ADDITIONAL INFO ================= */

        addAdditionalField: () =>
          set((state) => ({
            startupIdea: {
              ...state.startupIdea,
              additionalInfo: [
                ...(state.startupIdea.additionalInfo || []),
                { label: "", value: "" },
              ],
            },
          })),

        updateAdditionalField: (index, field, value) =>
          set((state) => {
            const existing = state.startupIdea.additionalInfo || [];
            const updated = [...existing];

            if (!updated[index]) return state;

            updated[index] = {
              ...updated[index],
              [field]: value,
            };

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
              additionalInfo:
                (state.startupIdea.additionalInfo || []).filter(
                  (_, i) => i !== index
                ),
            },
          })),

        /* ================= SIMULATION FLOW ================= */

        startSimulation: async () => {
          set({ isRunning: true });

          try {
            // 🔥 Replace with real backend later
            await new Promise((resolve) => setTimeout(resolve, 1500));

            set({
              overallScore: 82,
              recommendations: [
                "Validate target market assumptions",
                "Clarify revenue scalability",
                "Strengthen competitive differentiation",
              ],
            });
          } finally {
            set({ isRunning: false });
          }
        },

        finishSimulation: (score, recommendations) =>
          set({
            isRunning: false,
            overallScore: score,
            recommendations,
          }),

        /* ================= RESET ================= */

        resetSimulation: () =>
          set({
            startupIdea: { ...initialStartupIdea },
            isRunning: false,
            overallScore: null,
            recommendations: [],
          }),
      }),
      {
        name: "simulation-storage",

        // 🔥 CRITICAL FIX: Merge persisted state safely
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
          startupIdea: {
            ...initialStartupIdea,
            ...(persistedState?.startupIdea || {}),
          },
        }),
      }
    )
  )
);

export default useSimulationStore;