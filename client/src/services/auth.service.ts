// Authentication Service

import { apiClient } from '../api/client';
import type { 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse, 
  User 
} from '../types/api.types';

export interface RequestOptions {
  signal?: AbortSignal;
}

class AuthService {
  async register(data: RegisterRequest, options?: RequestOptions): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/register', data, {
      signal: options?.signal,
    });
    return response.data;
  }

  async login(data: LoginRequest, options?: RequestOptions): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', data, {
      signal: options?.signal,
    });
    return response.data;
  }

  async getCurrentUser(options?: RequestOptions): Promise<User> {
    const response = await apiClient.get<User>('/auth/me', {
      signal: options?.signal,
    });
    return response.data;
  }

  async refreshToken(refreshToken: string, options?: RequestOptions): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    }, {
      signal: options?.signal,
    });
    return response.data;
  }
}

export const authService = new AuthService();
