// Annotations TanStack Query Hooks

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { annotationService } from '../services/annotation.service';
import type { 
  Annotation, 
  AnnotationCreateRequest, 
  AnnotationUpdateRequest,
  AnnotationFiltersRequest, 
  AnnotationList
} from '../types/api.types';
import type { RequestOptions } from '../services/annotation.service';

export const annotationKeys = {
  all: ['annotations'] as const,
  lists: () => [...annotationKeys.all, 'list'] as const,
  list: (filters?: AnnotationFiltersRequest) => [...annotationKeys.lists(), filters ?? {}] as const,
  details: () => [...annotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...annotationKeys.details(), id] as const,
};

// Query: List Annotations
export function useAnnotations(
  filters?: AnnotationFiltersRequest,
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const key = useMemo(() => annotationKeys.list(filters), [filters]);
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 30_000;

  return useQuery<AnnotationList>({
    queryKey: key,
    queryFn: ({ signal }) => annotationService.listAnnotations(filters, { signal }),
    enabled,
    staleTime,
  });
}

// Query: Get Single Annotation
export function useAnnotation(
  id?: string,
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const enabled = (options?.enabled ?? true) && !!id;
  const key = useMemo(() => annotationKeys.detail(id ?? ''), [id]);
  const staleTime = options?.staleTime ?? 30_000;

  return useQuery<Annotation>({
    queryKey: key,
    queryFn: ({ signal }) => annotationService.getAnnotation(id as string, { signal }),
    enabled,
    staleTime,
  });
}

// Mutation: Create Annotation
export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, options }: { data: AnnotationCreateRequest; options?: RequestOptions }) =>
      annotationService.createAnnotation(data, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.lists() });
    },
  });
}

// Mutation: Update Annotation
export function useUpdateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, options }: { id: string; data: AnnotationUpdateRequest; options?: RequestOptions }) =>
      annotationService.updateAnnotation(id, data, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: annotationKeys.lists() });
    },
  });
}

// Mutation: Delete Annotation
export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: RequestOptions }) =>
      annotationService.deleteAnnotation(id, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: annotationKeys.lists() });
    },
  });
}
