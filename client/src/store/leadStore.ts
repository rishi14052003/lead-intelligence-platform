import { create } from "zustand";
import { searchLeads } from "../services/searchService";
import { getSavedLeads, clearAllLeads } from "../services/leadService";
import { saveSearchResultsToStorage, getSearchResultsFromStorage, clearSearchResultsFromStorage } from "../services/searchResultsService";
import { useAuthStore } from "./authStore";
import type { Lead } from "../services/searchService";

type State = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  roleFilter: string | null;
  searchQuery: string | null;

  setRoleFilter: (role: string | null) => void;

  search: (query: string) => Promise<Lead[]>;

  restoreSearchResults: () => void;

  fetchSavedLeads: () => Promise<void>;

  clearLeads: () => void;

  clearAllSavedLeads: () => Promise<void>;
};

export const useLeadStore = create<State>((set) => ({
  leads: [],

  loading: false,

  error: null,

  roleFilter: null,

  searchQuery: null,

  setRoleFilter: (role) => {
    console.log("🎯 ROLE FILTER:", role);

    set({
      roleFilter: role,
    });
  },

  restoreSearchResults: () => {
    console.log("🔄 ATTEMPTING TO RESTORE SEARCH RESULTS FROM STORAGE");
    
    const stored = getSearchResultsFromStorage();
    if (stored) {
      console.log("✅ RESTORED SEARCH RESULTS:", stored.results.length, "results for query:", stored.query);
      set({
        leads: stored.results,
        searchQuery: stored.query,
      });
    } else {
      console.log("ℹ️ NO STORED SEARCH RESULTS FOUND");
    }
  },

  search: async (query: string) => {

    console.log("🚀 STORE SEARCH STARTED");

    console.log("📌 QUERY:", query);

    set({
      loading: true,
      error: null,
      leads: [],
    });

    try {

      console.log("📡 CALLING searchLeads()");

      const leads = await searchLeads(query);

      console.log("✅ RECEIVED LEADS:", leads);

      console.log("📊 LEADS COUNT:", leads?.length || 0);

      // Save search results to localStorage
      saveSearchResultsToStorage(query, leads);

      set({
        leads,
        searchQuery: query,
        loading: false,
      });

      return leads;

    } catch (err: unknown) {

      console.error("❌ SEARCH ERROR:", err);

      let msg = "Unknown error";

      if (typeof err === "string") {

        msg = err;

      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {

        msg = (err as { message: string }).message;
      }

      set({
        error: msg,
        loading: false,
      });

      return [];
    }
  },

  fetchSavedLeads: async () => {

    console.log("📥 FETCHING SAVED LEADS");

    set({
      loading: true,
      error: null,
    });

    try {

      const leads = await getSavedLeads();

      console.log("✅ SAVED LEADS:", leads);

      set({
        leads,
        loading: false,
      });

    } catch (err: unknown) {

      console.error("❌ FETCH SAVED LEADS ERROR:", err);

      let msg = "Unknown error";

      if (typeof err === "string") {
        msg = err;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        msg = (err as { message: string }).message;
      }

      set({
        error: msg,
        loading: false,
      });
    }
  },

  clearLeads: () => {

    console.log("🗑 CLEARING LEADS");

    clearSearchResultsFromStorage();

    set({
      leads: [],
      searchQuery: null,
      error: null,
    });
  },

  clearAllSavedLeads: async () => {

    console.log("🗑 CLEARING ALL SAVED LEADS");

    set({
      loading: true,
      error: null,
    });

    try {

      await clearAllLeads();

      set({
        leads: [],
        loading: false,
      });

      console.log("✅ ALL LEADS CLEARED");

    } catch (err: unknown) {

      console.error("❌ CLEAR ALL LEADS ERROR:", err);

      let msg = "Unknown error";

      if (typeof err === "string") {
        msg = err;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        msg = (err as { message: string }).message;
      }

      set({
        error: msg,
        loading: false,
      });
    }
  },
}));

// Subscribe to auth changes
useAuthStore.subscribe((state, prevState) => {

  console.log("👤 AUTH STATE CHANGED");

  if (state.user?.id !== prevState.user?.id) {

    if (!state.user) {

      console.log("❌ USER LOGGED OUT");

      useLeadStore.setState({
        leads: [],
      });
    }
  }
});