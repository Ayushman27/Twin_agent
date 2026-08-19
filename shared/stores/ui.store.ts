import { create } from "zustand";

interface Notification {
  id: string;
  message: string;
  read: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  notifications: Notification[];
  addNotification: (n: Notification) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
}));
