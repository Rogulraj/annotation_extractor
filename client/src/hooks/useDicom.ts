// DICOM Files TanStack Query Hooks

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dicomService } from '../services/dicom.service';
import type { DicomFile, DicomUploadRequest, DicomFiltersRequest, DicomFileList } from '../types/api.types';
import type { RequestOptions } from '../services/dicom.service';

export const dicomKeys = {
  all: ['dicoms'] as const,
  lists: () => [...dicomKeys.all, 'list'] as const,
  list: (filters?: DicomFiltersRequest) => [...dicomKeys.lists(), filters ?? {}] as const,
  details: () => [...dicomKeys.all, 'detail'] as const,
  detail: (id: string) => [...dicomKeys.details(), id] as const,
};

// Query: List DICOM Files
export function useDicomFiles(
  filters?: DicomFiltersRequest,
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const key = useMemo(() => dicomKeys.list(filters), [filters]);
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 30_000;

  return useQuery<DicomFileList>({
    queryKey: key,
    queryFn: ({ signal }) => dicomService.listDicomFiles(filters, { signal }),
    enabled,
    staleTime,
  });
}

// Query: Get Single DICOM File
export function useDicomFile(
  id?: string,
  options?: RequestOptions & { enabled?: boolean; staleTime?: number }
) {
  const enabled = (options?.enabled ?? true) && !!id;
  const key = useMemo(() => dicomKeys.detail(id ?? ''), [id]);
  const staleTime = options?.staleTime ?? 30_000;

  return useQuery<DicomFile>({
    queryKey: key,
    queryFn: ({ signal }) => dicomService.getDicomFile(id as string, { signal }),
    enabled,
    staleTime,
  });
}

// Mutation: Upload DICOM File
export function useUploadDicom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, options }: { data: DicomUploadRequest; options?: RequestOptions }) =>
      dicomService.uploadDicom(data, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dicomKeys.lists() });
    },
  });
}

// Mutation: Delete DICOM File
export function useDeleteDicom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: RequestOptions }) =>
      dicomService.deleteDicom(id, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dicomKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dicomKeys.lists() });
    },
  });
}

// Mutation: Download DICOM File
export function useDownloadDicom() {
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: RequestOptions }) =>
      dicomService.downloadDicom(id, options),
    onSuccess: (blob, { id }) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dicom-${id}.dcm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
