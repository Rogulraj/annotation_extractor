from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model extending Django's AbstractUser"""
    
    ROLE_CHOICES = (
        ("radiologist", "Radiologist"),
        ("admin", "Admin"),
    )
    
    role = models.CharField(
        max_length=16,
        choices=ROLE_CHOICES,
        default="radiologist",
        help_text="User role in the system"
    )
    
    email = models.EmailField(
        unique=True,
        help_text="Email address for the user"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_radiologist(self):
        return self.role == "radiologist"
    
    @property
    def is_admin(self):
        return self.role == "admin"
