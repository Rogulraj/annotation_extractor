// Analytics TanStack Query Hooks

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { AnnotationStats, UserStats, AnnotationHistory } from '../types/api.types';
import type { RequestOptions } from '../services/analytics.service';

export const analyticsKeys = {
  all: ['analytics'] as const,
  annotationStats: () => [...analyticsKeys.all, 'annotation-stats'] as const,
  userStats: () => [...analyticsKeys.all, 'user-stats'] as const,
  annotationHistory: (id: string) => [...analyticsKeys.all, 'annotation-history', id] as const,
};

// Query: Get Annotation Statistics
export function useAnnotationStats(
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const key = analyticsKeys.annotationStats();
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 60_000; // 1 minute

  return useQuery<AnnotationStats>({
    queryKey: key,
    queryFn: ({ signal }) => analyticsService.getAnnotationStats({ signal }),
    enabled,
    staleTime,
  });
}

// Query: Get User Statistics
export function useUserStats(
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const key = analyticsKeys.userStats();
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 60_000; // 1 minute

  return useQuery<UserStats>({
    queryKey: key,
    queryFn: ({ signal }) => analyticsService.getUserStats({ signal }),
    enabled,
    staleTime,
  });
}

// Query: Get Annotation History
export function useAnnotationHistory(
  annotationId: string,
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const key = analyticsKeys.annotationHistory(annotationId);
  const enabled = (options?.enabled ?? true) && !!annotationId;
  const staleTime = options?.staleTime ?? 300_000; // 5 minutes

  return useQuery<AnnotationHistory[]>({
    queryKey: key,
    queryFn: ({ signal }) => analyticsService.getAnnotationHistory(annotationId, { signal }),
    enabled,
    staleTime,
  });
}
