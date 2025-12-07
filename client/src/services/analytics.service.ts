// Analytics Service

import { apiClient } from '../api/client';
import type { 
  AnnotationStats, 
  UserStats,
  AnnotationHistory 
} from '../types/api.types';

export interface RequestOptions {
  signal?: AbortSignal;
}

class AnalyticsService {
  async getAnnotationStats(options?: RequestOptions): Promise<AnnotationStats> {
    const response = await apiClient.get<AnnotationStats>('/analytics/annotation-stats', {
      signal: options?.signal,
    });
    return response.data;
  }

  async getUserStats(options?: RequestOptions): Promise<UserStats> {
    const response = await apiClient.get<UserStats>('/analytics/user-stats', {
      signal: options?.signal,
    });
    return response.data;
  }

  async getAnnotationHistory(annotationId: string, options?: RequestOptions): Promise<AnnotationHistory[]> {
    const response = await apiClient.get<AnnotationHistory[]>(`/analytics/annotation-history/${annotationId}`, {
      signal: options?.signal,
    });
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
