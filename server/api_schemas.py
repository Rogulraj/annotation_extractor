"""Pydantic schemas for API request/response validation"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, UUID4
from ninja import Schema


# Auth Schemas
class RegisterSchema(Schema):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="radiologist", pattern="^(radiologist|admin)$")


class LoginSchema(Schema):
    username: str
    password: str


class TokenSchema(Schema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserSchema(Schema):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


# DICOM File Schemas
class DicomFileUploadSchema(Schema):
    patient_id: Optional[str] = None
    study_date: Optional[str] = None
    modality: Optional[str] = None
    body_part: Optional[str] = None


class DicomFileSchema(Schema):
    id: UUID4
    original_filename: str
    file_size: Optional[int]
    metadata: Dict[str, Any]
    patient_id: Optional[str]
    study_date: Optional[datetime]
    modality: Optional[str]
    body_part: Optional[str]
    upload_date: datetime
    updated_at: datetime
    is_processed: bool
    owner: UserSchema


class DicomFileListSchema(Schema):
    count: int
    results: List[DicomFileSchema]


# Annotation Schemas
class AnnotationCreateSchema(Schema):
    dicom_file_id: UUID4
    annotation_type: str = Field(default="rectangle")
    label: str
    coordinates: Dict[str, Any]
    color: str = Field(default="#FF0000", pattern="^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    is_ai_generated: bool = Field(default=False)


class AnnotationUpdateSchema(Schema):
    annotation_type: Optional[str] = None
    label: Optional[str] = None
    coordinates: Optional[Dict[str, Any]] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    is_verified: Optional[bool] = None


class AnnotationSchema(Schema):
    id: UUID4
    user: UserSchema
    dicom_file_id: UUID4
    annotation_type: str
    label: str
    coordinates: Dict[str, Any]
    color: str
    notes: Optional[str]
    confidence_score: Optional[float]
    is_ai_generated: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class AnnotationListSchema(Schema):
    count: int
    results: List[AnnotationSchema]


# Analytics Schemas
class AnnotationStatsSchema(Schema):
    total_annotations: int
    total_dicom_files: int
    annotations_by_type: Dict[str, int]
    annotations_by_label: Dict[str, int]
    recent_annotations: List[AnnotationSchema]
    verified_count: int
    unverified_count: int
    ai_generated_count: int


class UserStatsSchema(Schema):
    user: UserSchema
    total_annotations: int
    total_dicom_files: int
    last_activity: Optional[datetime]


# Error Schemas
class ErrorSchema(Schema):
    message: str
    code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SuccessSchema(Schema):
    message: str
    data: Optional[Dict[str, Any]] = None
