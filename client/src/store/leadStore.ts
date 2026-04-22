import create from "zustand";
import { searchLeads } from "../services/searchService";
import type { Lead } from "../services/searchService";

type State = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  roleFilter: string | null;
  setRoleFilter: (role: string | null) => void;
  search: (query: string) => Promise<void>;
};

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
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Unknown error";
      set({ error: msg, loading: false });
    }
  },
}));
