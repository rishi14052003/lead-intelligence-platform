import { create } from "zustand";
import { useAuthStore } from "./authStore";

export interface HistoryItem {
  id: string;
  domain: string;
  date: string;
  leadsFound: number;
  leads?: any[];
}

type State = {
  history: HistoryItem[];
  loading: boolean;
  addHistory: (item: HistoryItem) => void;
  removeHistoryItem: (id: string) => void;
  removeHistoryByDomain: (domain: string) => void;
  clearHistory: () => void;
  loadFromLocalStorage: () => void;
};

const LEGACY_KEY = 'search_history';

function getStorageKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `search_history_${user.id}` : null;
}

function persistHistory(history: HistoryItem[]): void {
  const key = getStorageKey();
  if (key) {
    localStorage.setItem(key, JSON.stringify(history));
  }
}

export const useHistoryStore = create<State>((set) => ({
  history: [],
  loading: false,
  addHistory: (item: HistoryItem) => {
    set((state) => {
      const newHistory = [item, ...state.history].slice(0, 50); // Keep last 50 items
      persistHistory(newHistory);
      return { history: newHistory };
    });
  },
  removeHistoryItem: (id: string) => {
    set((state) => {
      const newHistory = state.history.filter((item) => item.id !== id);
      persistHistory(newHistory);
      return { history: newHistory };
    });
  },
  removeHistoryByDomain: (domain: string) => {
    set((state) => {
      const targetDomain = domain.trim().toLowerCase();
      const newHistory = state.history.filter(
        (item) => item.domain.trim().toLowerCase() !== targetDomain
      );
      persistHistory(newHistory);
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
