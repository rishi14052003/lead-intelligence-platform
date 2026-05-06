import { create } from "zustand";
import { useAuthStore } from "./authStore";

export interface HistoryItem {
  id: string;
  domain: string;
  date: string;
  leadsFound: number;
  leads: any[];
}

type State = {
  history: HistoryItem[];
  loading: boolean;
  addHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  loadFromLocalStorage: () => void;
};

const LEGACY_KEY = 'search_history';

function getStorageKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `search_history_${user.id}` : null;
}

export const useHistoryStore = create<State>((set) => ({
  history: [],
  loading: false,
  addHistory: (item: HistoryItem) => {
    set((state) => {
      const key = getStorageKey();
      const newHistory = [item, ...state.history].slice(0, 50); // Keep last 50 items
      if (key) {
        localStorage.setItem(key, JSON.stringify(newHistory));
      }
      return { history: newHistory };
    });
  },
  clearHistory: () => {
    const key = getStorageKey();
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(LEGACY_KEY);
    set({ history: [] });
  },
  loadFromLocalStorage: () => {
    try {
      const key = getStorageKey();
      if (!key) {
        set({ history: [] });
        return;
      }
      const stored = localStorage.getItem(key);
      if (stored) {
        const history = JSON.parse(stored);
        set({ history });
      } else {
        set({ history: [] });
      }
    } catch (err) {
      console.error("Error loading history from localStorage:", err);
      set({ history: [] });
    }
  },
}));

// Subscribe to auth changes: reload on login, clear on logout
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id !== prevState.user?.id) {
    if (state.user) {
      useHistoryStore.getState().loadFromLocalStorage();
    } else {
      useHistoryStore.setState({ history: [] });
    }
  }
});
