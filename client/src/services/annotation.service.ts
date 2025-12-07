// Annotation Service

import { apiClient } from '../api/client';
import type { 
  Annotation, 
  AnnotationCreateRequest, 
  AnnotationUpdateRequest,
  AnnotationFiltersRequest, 
  AnnotationList
} from '../types/api.types';

export interface RequestOptions {
  signal?: AbortSignal;
}

class AnnotationService {
  async createAnnotation(data: AnnotationCreateRequest, options?: RequestOptions): Promise<Annotation> {
    const response = await apiClient.post<Annotation>('/annotations', data, {
      signal: options?.signal,
    });
    return response.data;
  }

  async listAnnotations(filters?: AnnotationFiltersRequest, options?: RequestOptions): Promise<AnnotationList> {
    const response = await apiClient.get<AnnotationList>('/annotations', {
      params: filters,
      signal: options?.signal,
    });
    return response.data;
  }

  async getAnnotation(id: string, options?: RequestOptions): Promise<Annotation> {
    const response = await apiClient.get<Annotation>(`/annotations/${id}`, {
      signal: options?.signal,
    });
    return response.data;
  }

  async updateAnnotation(id: string, data: AnnotationUpdateRequest, options?: RequestOptions): Promise<Annotation> {
    const response = await apiClient.patch<Annotation>(`/annotations/${id}`, data, {
      signal: options?.signal,
    });
    return response.data;
  }

  async deleteAnnotation(id: string, options?: RequestOptions): Promise<void> {
    await apiClient.delete(`/annotations/${id}`, {
      signal: options?.signal,
    });
  }
}

export const annotationService = new AnnotationService();
