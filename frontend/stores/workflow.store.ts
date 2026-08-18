import { create } from "zustand";

interface WorkflowState {
  selectedTaskId: string | null;
  selectedAgentId: string | null;
  setSelectedTask: (id: string | null) => void;
  setSelectedAgent: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  selectedTaskId: null,
  selectedAgentId: null,
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
}));
