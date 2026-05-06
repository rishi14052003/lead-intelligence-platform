import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  createdAt: string;
}

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user: User) =>
        set(() => ({
          user,
          isAuthenticated: !!user,
        })),

      setToken: (token: string) =>
        set(() => ({
          token,
        })),

      setLoading: (loading: boolean) =>
        set(() => ({
          isLoading: loading,
        })),

      setError: (error: string | null) =>
        set(() => ({
          error,
        })),

      logout: () =>
        set(() => ({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })),

      clearError: () =>
        set(() => ({
          error: null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
