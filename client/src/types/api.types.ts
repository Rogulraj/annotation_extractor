// API Response Types matching Django backend schemas

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'radiologist' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface DicomFile {
  id: string;
  owner: number;
  file: string;
  original_filename: string;
  file_size: number;
  metadata: Record<string, any>;
  patient_id?: string;
  study_date?: string;
  modality?: string;
  body_part?: string;
  upload_date: string;
  updated_at: string;
  is_processed: boolean;
}

export interface DicomFileList {
  items: DicomFile[];
  count: number;
}

export interface Annotation {
  id: string;
  user: number;
  dicom_file: string;
  annotation_type: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'point' | 'freehand';
  label: string;
  coordinates: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
    [key: string]: any;
  };
  color: string;
  notes?: string;
  confidence_score?: number;
  is_ai_generated: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnotationList {
  items: Annotation[];
  count: number;
}

export interface AnnotationHistory {
  id: string;
  annotation: string;
  user?: number;
  action: 'created' | 'updated' | 'deleted' | 'verified';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  timestamp: string;
}

export interface AnnotationStats {
  total_annotations: number;
  total_dicom_files: number;
  annotations_by_type: Record<string, number>;
  annotations_by_label: Record<string, number>;
  recent_annotations: Annotation[];
  verified_count: number;
  unverified_count: number;
  ai_generated_count: number;
}

export interface UserStats {
  user: User;
  total_annotations: number;
  total_dicom_files: number;
  last_activity?: string;
}

// Request Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: 'radiologist' | 'admin';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface DicomUploadRequest {
  file: File;
  patient_id?: string;
  study_date?: string;
  modality?: string;
  body_part?: string;
}

export interface AnnotationCreateRequest {
  dicom_file_id: string;
  annotation_type: Annotation['annotation_type'];
  label: string;
  coordinates: Annotation['coordinates'];
  color?: string;
  notes?: string;
  confidence_score?: number;
  is_ai_generated?: boolean;
}

export interface AnnotationUpdateRequest {
  annotation_type?: Annotation['annotation_type'];
  label?: string;
  coordinates?: Annotation['coordinates'];
  color?: string;
  notes?: string;
  confidence_score?: number;
  is_verified?: boolean;
}

// Filter Types
export interface DicomFiltersRequest {
  patient_id?: string;
  modality?: string;
  start_date?: string;
  end_date?: string;
}

export interface AnnotationFiltersRequest {
  dicom_file_id?: string;
  label?: string;
  is_verified?: boolean;
}

// Error Response
export interface ErrorResponse {
  message: string;
}
