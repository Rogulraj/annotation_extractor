// DICOM File Service

import { apiClient } from '../api/client';
import type { 
  DicomFile, 
  DicomUploadRequest,
  DicomFiltersRequest, 
  DicomFileList
} from '../types/api.types';

export interface RequestOptions {
  signal?: AbortSignal;
}

class DicomService {
  async uploadDicom(data: DicomUploadRequest, options?: RequestOptions): Promise<DicomFile> {
    const formData = new FormData();
    formData.append('file', data.file);
    
    if (data.patient_id) formData.append('patient_id', data.patient_id);
    if (data.study_date) formData.append('study_date', data.study_date);
    if (data.modality) formData.append('modality', data.modality);
    if (data.body_part) formData.append('body_part', data.body_part);

    const response = await apiClient.post<DicomFile>('/dicom', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: options?.signal,
    });
    return response.data;
  }

  async listDicomFiles(filters?: DicomFiltersRequest, options?: RequestOptions): Promise<DicomFileList> {
    const response = await apiClient.get<DicomFileList>('/dicom', {
      params: filters,
      signal: options?.signal,
    });
    return response.data;
  }

  async getDicomFile(id: string, options?: RequestOptions): Promise<DicomFile> {
    const response = await apiClient.get<DicomFile>(`/dicom/${id}`, {
      signal: options?.signal,
    });
    return response.data;
  }

  async downloadDicom(id: string, options?: RequestOptions): Promise<Blob> {
    const response = await apiClient.get(`/dicom/${id}/download`, {
      responseType: 'blob',
      signal: options?.signal,
    });
    return response.data;
  }

  async deleteDicom(id: string, options?: RequestOptions): Promise<void> {
    await apiClient.delete(`/dicom/${id}`, {
      signal: options?.signal,
    });
  }
}

export const dicomService = new DicomService();
