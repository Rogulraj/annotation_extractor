from django.db import models
from django.conf import settings
import os
import uuid


def dicom_upload_path(instance, filename):
    """Generate unique path for DICOM file uploads"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('dicoms', str(instance.owner.id), filename)


class DicomFile(models.Model):
    """Model for storing DICOM X-ray files"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dicom_files',
        help_text="User who uploaded this DICOM file"
    )
    
    file = models.FileField(
        upload_to=dicom_upload_path,
        help_text="DICOM file"
    )
    
    original_filename = models.CharField(
        max_length=255,
        help_text="Original filename of the uploaded file"
    )
    
    file_size = models.BigIntegerField(
        help_text="File size in bytes",
        null=True,
        blank=True
    )
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="DICOM metadata extracted from the file"
    )
    
    patient_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Patient ID from DICOM metadata"
    )
    
    study_date = models.DateField(
        blank=True,
        null=True,
        help_text="Study date from DICOM metadata"
    )
    
    modality = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Imaging modality (e.g., CR, DX)"
    )
    
    body_part = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Body part examined"
    )
    
    upload_date = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the file was uploaded"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time of last update"
    )
    
    is_processed = models.BooleanField(
        default=False,
        help_text="Whether DICOM metadata has been extracted"
    )
    
    class Meta:
        db_table = "dicom_files"
        ordering = ["-upload_date"]
        verbose_name = "DICOM File"
        verbose_name_plural = "DICOM Files"
        indexes = [
            models.Index(fields=["owner", "-upload_date"]),
            models.Index(fields=["patient_id"]),
            models.Index(fields=["study_date"]),
        ]
    
    def __str__(self):
        return f"{self.original_filename} - {self.owner.username}"
    
    def save(self, *args, **kwargs):
        """Override save to store file size"""
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override delete to remove file from storage"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)
