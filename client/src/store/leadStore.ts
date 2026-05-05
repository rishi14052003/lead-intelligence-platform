import { create } from "zustand";
import { searchLeads } from "../services/searchService";
import { getSavedLeads, clearAllLeads } from "../services/leadService";
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

const STORAGE_KEY = 'search_results';

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
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
    set({ leads: [], error: null });
    localStorage.removeItem(STORAGE_KEY);
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
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const leads = JSON.parse(stored);
        set({ leads });
      }
    } catch (err) {
      console.error("Error loading from localStorage:", err);
    }
  },
}));
