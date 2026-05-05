import { create } from "zustand";

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

const STORAGE_KEY = 'search_history';

export const useHistoryStore = create<State>((set) => ({
  history: [],
  loading: false,
  addHistory: (item: HistoryItem) => {
    set((state) => {
      const newHistory = [item, ...state.history].slice(0, 50); // Keep last 50 items
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return { history: newHistory };
    });
  },
  clearHistory: () => {
    set({ history: [] });
    localStorage.removeItem(STORAGE_KEY);
  },
  loadFromLocalStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        set({ history });
      }
    } catch (err) {
      console.error("Error loading history from localStorage:", err);
    }
  },
}));
