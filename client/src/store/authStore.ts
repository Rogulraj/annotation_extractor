// Authentication Zustand Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/api.types';
import { tokenStorage } from '../utils/token-storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: tokenStorage.hasValidToken(),
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      logout: () => {
        tokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
