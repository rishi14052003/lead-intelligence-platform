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

const LEGACY_KEY = "search_results";

function getStorageKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `search_results_${user.id}` : null;
}

export const useLeadStore = create<State>((set) => ({
  leads: [],

  loading: false,

  error: null,

  roleFilter: null,

  setRoleFilter: (role) => {
    console.log("🎯 ROLE FILTER:", role);

    set({
      roleFilter: role,
    });
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

      set({
        leads,
        loading: false,
      });

      // Save to localStorage
      const key = getStorageKey();

      if (key) {

        console.log("💾 SAVING TO LOCAL STORAGE:", key);

        localStorage.setItem(
          key,
          JSON.stringify(leads)
        );
      }

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

    const key = getStorageKey();

    if (key) {
      localStorage.removeItem(key);
    }

    localStorage.removeItem(LEGACY_KEY);

    set({
      leads: [],
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

  loadFromLocalStorage: () => {

    console.log("📂 LOADING FROM LOCAL STORAGE");

    try {

      const key = getStorageKey();

      if (!key) {

        console.log("❌ NO STORAGE KEY");

        set({
          leads: [],
        });

        return;
      }

      const stored = localStorage.getItem(key);

      if (stored) {

        const leads = JSON.parse(stored);

        console.log("✅ LOADED LEADS:", leads);

        set({
          leads,
        });

      } else {

        console.log("❌ NO SAVED LEADS");

        set({
          leads: [],
        });
      }

    } catch (err) {

      console.error("❌ LOCAL STORAGE ERROR:", err);

      set({
        leads: [],
      });
    }
  },
}));

// Subscribe to auth changes
useAuthStore.subscribe((state, prevState) => {

  console.log("👤 AUTH STATE CHANGED");

  if (state.user?.id !== prevState.user?.id) {

    if (state.user) {

      console.log("✅ USER LOGGED IN");

      useLeadStore.getState().loadFromLocalStorage();

    } else {

      console.log("❌ USER LOGGED OUT");

      useLeadStore.setState({
        leads: [],
      });
    }
  }
});