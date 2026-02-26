import { create } from "zustand";

const useWorkforceStore = create((set) => ({
  analysis: null,
  setAnalysis: (data) => set({ analysis: data }),
}));

export default useWorkforceStore;
