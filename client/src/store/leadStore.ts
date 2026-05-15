import { create } from "zustand";
import { searchLeadsWithPagination } from "../services/searchService"; // CHANGE #10: Import pagination function
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
  abortController: AbortController | null; // CHANGE #9: Track current request
  debounceTimer: NodeJS.Timeout | null; // CHANGE #9: Track debounce timer
  // CHANGE #10: Pagination state
  totalLeads: number;
  currentPage: number;
  hasMore: boolean;
  lastQuery: string | null;
  lastLocation: string | null;

  setRoleFilter: (role: string | null) => void;

  search: (query: string, location?: string) => Promise<Lead[]>;

  loadMore: () => Promise<void>; // CHANGE #10: Load next page

  restoreSearchResults: () => void;

  fetchSavedLeads: () => Promise<void>;

  clearLeads: () => void;

  clearAllSavedLeads: () => Promise<void>;
};

export const useLeadStore = create<State>((set, get) => ({
  leads: [],

  loading: false,

  error: null,

  roleFilter: null,

  searchQuery: null,

  abortController: null,

  debounceTimer: null,

  // CHANGE #10: Initialize pagination state
  totalLeads: 0,
  currentPage: 1,
  hasMore: false,
  lastQuery: null,
  lastLocation: null,

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
      const displayQuery =
        stored.location?.trim()
          ? `${stored.query}, ${stored.location.trim()}`
          : stored.query;
      console.log("✅ RESTORED SEARCH RESULTS:", stored.results.length, "results for query:", displayQuery);
      set({
        leads: stored.results,
        searchQuery: displayQuery,
      });
    } else {
      console.log("ℹ️ NO STORED SEARCH RESULTS FOUND");
    }
  },

  search: async (query: string, location?: string): Promise<Lead[]> => {

    console.log("🚀 STORE SEARCH STARTED");

    console.log("📌 QUERY:", query);
    console.log("📍 LOCATION:", location || "Not specified");

    // CHANGE #9: Cancel previous request if exists
    const state = get();
    if (state.abortController) {
      console.log("❌ Cancelling previous search request");
      state.abortController.abort();
    }

    // CHANGE #9: Clear previous debounce timer
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // CHANGE #9: Create new AbortController for this request
    const newAbortController = new AbortController();
    set({
      abortController: newAbortController,
    });

    set({
      loading: true,
      error: null,
      leads: [],
    });

    // CHANGE #9: Wrap debounce in Promise for proper async handling
    return new Promise<Lead[]>((resolve) => {
      const debounceTimer = setTimeout(async () => {
        try {

          console.log("📡 CALLING searchLeads()");

          // CHANGE #10: Use pagination-aware search function
          const response = await searchLeadsWithPagination(query, location, newAbortController.signal, 1);

          // Only update state if request wasn't aborted
          if (!newAbortController.signal.aborted) {
            const leads = response.data || [];
            console.log("✅ RECEIVED LEADS:", leads);

            console.log("📊 LEADS COUNT:", leads?.length || 0);

            // Save search results to localStorage with location
            saveSearchResultsToStorage(query, leads, location);

            // CHANGE #10: Store pagination info
            set({
              leads,
              searchQuery: location ? `${query}, ${location}` : query,
              loading: false,
              totalLeads: response.total || 0,
              currentPage: response.page || 1,
              hasMore: response.hasMore || false,
              lastQuery: query,
              lastLocation: location || null,
            });

            resolve(leads);
          } else {
            console.log("⏹️ Search request was cancelled");
            resolve([]);
          }

        } catch (err: unknown) {

          // CHANGE #9: Only handle error if request wasn't cancelled
          if (!newAbortController.signal.aborted) {
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
          } else {
            console.log("⏹️ Search request was cancelled");
          }

          resolve([]);
        } finally {
          // Store the debounce timer reference for cleanup
          set({ debounceTimer });
        }
      }, 300); // 300ms debounce delay
    });
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

  // CHANGE #10: Load more leads from next page
  loadMore: async () => {
    const state = get();
    
    if (!state.hasMore || state.loading) {
      console.log("⏸️ No more leads or already loading");
      return;
    }

    if (!state.lastQuery) {
      console.log("❌ No previous search query");
      return;
    }

    const nextPage = state.currentPage + 1;
    console.log(`📄 Loading page ${nextPage}...`);

    set({ loading: true });

    try {
      // CHANGE #10: Use pagination-aware function
      const response = await searchLeadsWithPagination(state.lastQuery, state.lastLocation || undefined, undefined, nextPage);
      const moreLeads = response.data || [];
      
      set({
        leads: [...state.leads, ...moreLeads],
        currentPage: nextPage,
        hasMore: response.hasMore || false,
        loading: false,
      });

      console.log(`✅ Loaded ${moreLeads.length} more leads`);
    } catch (err) {
      console.error("❌ Error loading more leads:", err);
      set({ loading: false });
    }
  },

  clearLeads: () => {

    console.log("🗑 CLEARING LEADS");

    clearSearchResultsFromStorage();

    set({
      leads: [],
      searchQuery: null,
      error: null,
      // CHANGE #10: Reset pagination on clear
      totalLeads: 0,
      currentPage: 1,
      hasMore: false,
      lastQuery: null,
      lastLocation: null,
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