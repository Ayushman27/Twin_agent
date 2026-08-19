import { create } from "zustand";

interface OrganizationState {
  currentOrganizationId: string | null;
  setCurrentOrganization: (id: string) => void;
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  currentOrganizationId: null,
  setCurrentOrganization: (id) => set({ currentOrganizationId: id }),
}));
