import { create } from "zustand";

interface TwinState {
  currentTwinEmployeeId: string | null;
  setCurrentTwin: (employeeId: string) => void;
}

export const useTwinStore = create<TwinState>((set) => ({
  currentTwinEmployeeId: null,
  setCurrentTwin: (employeeId) => set({ currentTwinEmployeeId: employeeId }),
}));
