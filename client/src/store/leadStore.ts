import { create } from "zustand";
import { searchLeads } from "../services/searchService";
import { getSavedLeads, clearAllLeads } from "../services/leadService";
import { useAuthStore } from "./authStore";
import type { Lead } from "../services/searchService";

type State = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  roleFilter: string | null;
  setRoleFilter: (role: string | null) => void;
  search: (query: string) => Promise<Lead[]>;
  fetchSavedLeads: () => Promise<void>;
  clearLeads: () => void;
  clearAllSavedLeads: () => Promise<void>;
  loadFromLocalStorage: () => void;
};

const LEGACY_KEY = 'search_results';

function getStorageKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `search_results_${user.id}` : null;
}

export const useLeadStore = create<State>((set) => ({
  leads: [],
  loading: false,
  error: null,
  roleFilter: null,
  setRoleFilter: (role) => set({ roleFilter: role }),
  search: async (query: string) => {
    set({ loading: true, error: null, leads: [] });
    try {
      const leads = await searchLeads(query);
      set({ leads, loading: false });
      // Save to localStorage
      const key = getStorageKey();
      if (key) {
        localStorage.setItem(key, JSON.stringify(leads));
      }
      return leads;
    } catch (err: unknown) {
      let msg = "Unknown error";
      if (typeof err === "string") msg = err;
      else if (typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string") msg = (err as { message: string }).message;
      set({ error: msg, loading: false });
      return [];
    }
  },
  fetchSavedLeads: async () => {
    set({ loading: true, error: null });
    try {
      const leads = await getSavedLeads();
      set({ leads, loading: false });
    } catch (err: unknown) {
      let msg = "Unknown error";
      if (typeof err === "string") msg = err;
      else if (typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string") msg = (err as { message: string }).message;
      set({ error: msg, loading: false });
    }
  },
  clearLeads: () => {
    const key = getStorageKey();
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(LEGACY_KEY);
    set({ leads: [], error: null });
  },
  clearAllSavedLeads: async () => {
    set({ loading: true, error: null });
    try {
      await clearAllLeads();
      set({ leads: [], loading: false });
    } catch (err: unknown) {
      let msg = "Unknown error";
      if (typeof err === "string") msg = err;
      else if (typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string") msg = (err as { message: string }).message;
      console.error("Clear all leads error:", err);
      set({ error: msg, loading: false });
    }
  },
  loadFromLocalStorage: () => {
    try {
      const key = getStorageKey();
      if (!key) {
        set({ leads: [] });
        return;
      }
      const stored = localStorage.getItem(key);
      if (stored) {
        const leads = JSON.parse(stored);
        set({ leads });
      } else {
        set({ leads: [] });
      }
    } catch (err) {
      console.error("Error loading from localStorage:", err);
      set({ leads: [] });
    }
  },
}));

// Subscribe to auth changes: reload on login, clear on logout
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id !== prevState.user?.id) {
    if (state.user) {
      useLeadStore.getState().loadFromLocalStorage();
    } else {
      useLeadStore.setState({ leads: [] });
    }
  }
});
