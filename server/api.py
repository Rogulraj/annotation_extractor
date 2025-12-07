"""Main API module with all endpoints"""

from typing import List, Optional
from datetime import datetime
import os
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.db import transaction
from django.http import FileResponse
from ninja import NinjaAPI, File, Form
from ninja.files import UploadedFile
from ninja.pagination import paginate

from accounts.models import User
from dicom_manager.models import DicomFile
from annotations.models import Annotation, AnnotationHistory
from api_auth import AuthBearer, create_access_token, create_refresh_token, hash_password
from api_schemas import (
    RegisterSchema, LoginSchema, TokenSchema, UserSchema,
    DicomFileSchema, DicomFileListSchema, DicomFileUploadSchema,
    AnnotationCreateSchema, AnnotationUpdateSchema, AnnotationSchema, AnnotationListSchema,
    AnnotationStatsSchema, UserStatsSchema,
    ErrorSchema, SuccessSchema
)

# Initialize API with authentication
api = NinjaAPI(title="DICOM Annotation API", version="1.0.0")
auth = AuthBearer()


# ============================================================================
# Authentication Endpoints
# ============================================================================

@api.post("/auth/register", response={201: TokenSchema, 400: ErrorSchema})
def register(request, data: RegisterSchema):
    """Register a new user"""
    # Check if user already exists
    if User.objects.filter(username=data.username).exists():
        return 400, {"message": "Username already exists"}
    
    if User.objects.filter(email=data.email).exists():
        return 400, {"message": "Email already exists"}
    
    # Create new user
    user = User.objects.create(
        username=data.username,
        email=data.email,
        role=data.role,
    )
    user.set_password(data.password)
    user.save()
    
    # Generate tokens
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    
    return 201, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@api.post("/auth/login", response={200: TokenSchema, 401: ErrorSchema})
def login(request, data: LoginSchema):
    """Login user and get tokens"""
    user = authenticate(username=data.username, password=data.password)
    
    if not user:
        return 401, {"message": "Invalid credentials"}
    
    if not user.is_active:
        return 401, {"message": "User account is disabled"}
    
    # Generate tokens
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    
    return 200, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@api.get("/auth/me", auth=auth, response=UserSchema)
def get_current_user(request):
    """Get current authenticated user info"""
    return request.user


@api.post("/auth/refresh", response={200: TokenSchema, 401: ErrorSchema})
def refresh_token(request, refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        import jwt
        from django.conf import settings
        
        payload = jwt.decode(
            refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        if payload.get("type") != "refresh":
            return 401, {"message": "Invalid token type"}
        
        user = User.objects.filter(id=payload.get("user_id")).first()
        if not user or not user.is_active:
            return 401, {"message": "User not found or inactive"}
        
        # Generate new tokens
        access_token = create_access_token(user)
        new_refresh_token = create_refresh_token(user)
        
        return 200, {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return 401, {"message": "Invalid or expired refresh token"}


# ============================================================================
# DICOM File Management Endpoints
# ============================================================================

@api.post("/dicom", auth=auth, response={201: DicomFileSchema, 400: ErrorSchema})
def upload_dicom(
    request,
    file: UploadedFile = File(...),
    patient_id: str = Form(None),
    study_date: str = Form(None),
    modality: str = Form(None),
    body_part: str = Form(None)
):
    """Upload a DICOM file"""
    try:
        # Create DICOM file record
        dicom_file = DicomFile.objects.create(
            owner=request.user,
            file=file,
            original_filename=file.name,
            patient_id=patient_id,
            modality=modality,
            body_part=body_part
        )
        
        # Parse study date if provided
        if study_date:
            try:
                dicom_file.study_date = datetime.strptime(study_date, "%Y-%m-%d").date()
                dicom_file.save()
            except ValueError:
                pass
        
        # TODO: Extract actual DICOM metadata using pydicom
        # This would be done in a background task ideally
        
        return 201, dicom_file
    except Exception as e:
        return 400, {"message": f"Error uploading file: {str(e)}"}


@api.get("/dicom", auth=auth, response=List[DicomFileSchema])
@paginate
def list_dicom_files(
    request,
    patient_id: Optional[str] = None,
    modality: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """List DICOM files with optional filtering"""
    queryset = DicomFile.objects.filter(owner=request.user)
    
    # Apply filters
    if patient_id:
        queryset = queryset.filter(patient_id=patient_id)
    if modality:
        queryset = queryset.filter(modality=modality)
    if start_date:
        queryset = queryset.filter(study_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(study_date__lte=end_date)
    
    return queryset


@api.get("/dicom/{dicom_id}", auth=auth, response={200: DicomFileSchema, 404: ErrorSchema})
def get_dicom_file(request, dicom_id: str):
    """Get specific DICOM file details"""
    try:
        dicom_file = DicomFile.objects.get(id=dicom_id, owner=request.user)
        return 200, dicom_file
    except DicomFile.DoesNotExist:
        return 404, {"message": "DICOM file not found"}


@api.get("/dicom/{dicom_id}/download", auth=auth)
def download_dicom_file(request, dicom_id: str):
    """Download DICOM file"""
    try:
        dicom_file = DicomFile.objects.get(id=dicom_id, owner=request.user)
        return FileResponse(
            dicom_file.file.open(),
            as_attachment=True,
            filename=dicom_file.original_filename
        )
    except DicomFile.DoesNotExist:
        return api.create_response(request, {"message": "DICOM file not found"}, status=404)


@api.delete("/dicom/{dicom_id}", auth=auth, response={204: None, 404: ErrorSchema})
def delete_dicom_file(request, dicom_id: str):
    """Delete DICOM file and its annotations"""
    try:
        dicom_file = DicomFile.objects.get(id=dicom_id, owner=request.user)
        dicom_file.delete()
        return 204, None
    except DicomFile.DoesNotExist:
        return 404, {"message": "DICOM file not found"}


# ============================================================================
# Annotation Endpoints
# ============================================================================

@api.post("/annotations", auth=auth, response={201: AnnotationSchema, 400: ErrorSchema})
def create_annotation(request, data: AnnotationCreateSchema):
    """Create a new annotation"""
    try:
        # Verify user has access to the DICOM file
        dicom_file = DicomFile.objects.get(id=data.dicom_file_id, owner=request.user)
        
        with transaction.atomic():
            # Create annotation
            annotation = Annotation.objects.create(
                user=request.user,
                dicom_file=dicom_file,
                annotation_type=data.annotation_type,
                label=data.label,
                coordinates=data.coordinates,
                color=data.color,
                notes=data.notes,
                confidence_score=data.confidence_score,
                is_ai_generated=data.is_ai_generated
            )
            
            # Create history entry
            AnnotationHistory.objects.create(
                annotation=annotation,
                user=request.user,
                action="created",
                new_data={
                    "label": annotation.label,
                    "coordinates": annotation.coordinates,
                    "annotation_type": annotation.annotation_type
                }
            )
        
        return 201, annotation
    except DicomFile.DoesNotExist:
        return 400, {"message": "DICOM file not found or access denied"}
    except Exception as e:
        return 400, {"message": f"Error creating annotation: {str(e)}"}


@api.get("/annotations", auth=auth, response=List[AnnotationSchema])
@paginate
def list_annotations(
    request,
    dicom_file_id: Optional[str] = None,
    label: Optional[str] = None,
    is_verified: Optional[bool] = None
):
    """List annotations with optional filtering"""
    queryset = Annotation.objects.filter(user=request.user)
    
    if dicom_file_id:
        queryset = queryset.filter(dicom_file__id=dicom_file_id)
    if label:
        queryset = queryset.filter(label__icontains=label)
    if is_verified is not None:
        queryset = queryset.filter(is_verified=is_verified)
    
    return queryset


@api.get("/annotations/{annotation_id}", auth=auth, response={200: AnnotationSchema, 404: ErrorSchema})
def get_annotation(request, annotation_id: str):
    """Get specific annotation"""
    try:
        annotation = Annotation.objects.get(id=annotation_id, user=request.user)
        return 200, annotation
    except Annotation.DoesNotExist:
        return 404, {"message": "Annotation not found"}


@api.patch("/annotations/{annotation_id}", auth=auth, response={200: AnnotationSchema, 404: ErrorSchema})
def update_annotation(request, annotation_id: str, data: AnnotationUpdateSchema):
    """Update an annotation"""
    try:
        annotation = Annotation.objects.get(id=annotation_id, user=request.user)
        
        with transaction.atomic():
            # Store old data for history
            old_data = {
                "label": annotation.label,
                "coordinates": annotation.coordinates,
                "annotation_type": annotation.annotation_type,
                "is_verified": annotation.is_verified
            }
            
            # Update fields if provided
            for field, value in data.dict(exclude_unset=True).items():
                setattr(annotation, field, value)
            annotation.save()
            
            # Create history entry
            AnnotationHistory.objects.create(
                annotation=annotation,
                user=request.user,
                action="updated",
                old_data=old_data,
                new_data={
                    "label": annotation.label,
                    "coordinates": annotation.coordinates,
                    "annotation_type": annotation.annotation_type,
                    "is_verified": annotation.is_verified
                }
            )
        
        return 200, annotation
    except Annotation.DoesNotExist:
        return 404, {"message": "Annotation not found"}


@api.delete("/annotations/{annotation_id}", auth=auth, response={204: None, 404: ErrorSchema})
def delete_annotation(request, annotation_id: str):
    """Delete an annotation"""
    try:
        annotation = Annotation.objects.get(id=annotation_id, user=request.user)
        
        with transaction.atomic():
            # Create history entry before deletion
            AnnotationHistory.objects.create(
                annotation=annotation,
                user=request.user,
                action="deleted",
                old_data={
                    "label": annotation.label,
                    "coordinates": annotation.coordinates,
                    "annotation_type": annotation.annotation_type
                }
            )
            annotation.delete()
        
        return 204, None
    except Annotation.DoesNotExist:
        return 404, {"message": "Annotation not found"}


# ============================================================================
# Analytics Endpoints
# ============================================================================

@api.get("/analytics/annotation-stats", auth=auth, response=AnnotationStatsSchema)
def get_annotation_stats(request):
    """Get annotation statistics for the current user"""
    user_annotations = Annotation.objects.filter(user=request.user)
    user_dicom_files = DicomFile.objects.filter(owner=request.user)
    
    # Count annotations by type
    annotations_by_type = {}
    for ann_type, _ in Annotation.ANNOTATION_TYPES:
        count = user_annotations.filter(annotation_type=ann_type).count()
        if count > 0:
            annotations_by_type[ann_type] = count
    
    # Count annotations by label
    from django.db.models import Count
    label_counts = user_annotations.values('label').annotate(count=Count('id')).order_by('-count')[:10]
    annotations_by_label = {item['label']: item['count'] for item in label_counts}
    
    # Get recent annotations
    recent_annotations = user_annotations.order_by('-created_at')[:10]
    
    return {
        "total_annotations": user_annotations.count(),
        "total_dicom_files": user_dicom_files.count(),
        "annotations_by_type": annotations_by_type,
        "annotations_by_label": annotations_by_label,
        "recent_annotations": list(recent_annotations),
        "verified_count": user_annotations.filter(is_verified=True).count(),
        "unverified_count": user_annotations.filter(is_verified=False).count(),
        "ai_generated_count": user_annotations.filter(is_ai_generated=True).count(),
    }


@api.get("/analytics/user-stats", auth=auth, response=UserStatsSchema)
def get_user_stats(request):
    """Get user statistics"""
    user = request.user
    user_annotations = Annotation.objects.filter(user=user)
    user_dicom_files = DicomFile.objects.filter(owner=user)
    
    last_annotation = user_annotations.order_by('-created_at').first()
    last_activity = last_annotation.created_at if last_annotation else None
    
    return {
        "user": user,
        "total_annotations": user_annotations.count(),
        "total_dicom_files": user_dicom_files.count(),
        "last_activity": last_activity
    }


@api.get("/analytics/annotation-history/{annotation_id}", auth=auth)
def get_annotation_history(request, annotation_id: str):
    """Get history of changes for an annotation"""
    try:
        annotation = Annotation.objects.get(id=annotation_id, user=request.user)
        history = AnnotationHistory.objects.filter(annotation=annotation).order_by('-timestamp')
        
        return [
            {
                "id": str(h.id),
                "action": h.action,
                "user": h.user.username if h.user else None,
                "timestamp": h.timestamp,
                "old_data": h.old_data,
                "new_data": h.new_data
            }
            for h in history
        ]
    except Annotation.DoesNotExist:
        return api.create_response(request, {"message": "Annotation not found"}, status=404)
