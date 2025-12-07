// Authentication TanStack Query Hooks

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/token-storage';
import type { LoginRequest, RegisterRequest, User } from '../types/api.types';
import type { RequestOptions } from '../services/auth.service';

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};

// Query: Get Current User
export function useCurrentUser(options?: RequestOptions & { enabled?: boolean; staleTime?: number }) {
  const key = authKeys.currentUser();
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 300_000; // 5 minutes
  const { isAuthenticated } = useAuthStore();

  return useQuery<User>({
    queryKey: key,
    queryFn: ({ signal }) => authService.getCurrentUser({ signal }),
    enabled: enabled && isAuthenticated,
    staleTime,
    retry: false,
  });
}

// Mutation: Login
export function useLogin() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({ data, options }: { data: LoginRequest; options?: RequestOptions }) => {
      const tokenResponse = await authService.login(data, options);
      // Store tokens
      tokenStorage.setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
      // Fetch and set current user
      const user = await authService.getCurrentUser();
      setUser(user);
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

// Mutation: Register
export function useRegister() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({ data, options }: { data: RegisterRequest; options?: RequestOptions }) => {
      const tokenResponse = await authService.register(data, options);
      // Store tokens
      tokenStorage.setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
      // Fetch and set current user
      const user = await authService.getCurrentUser();
      setUser(user);
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

// Mutation: Logout
export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      logout();
      queryClient.clear(); // Clear all queries
    },
  });
}

