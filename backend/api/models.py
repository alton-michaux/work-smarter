from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
# To extend the existing User model from AllAuth, create a separate Profile model with a OneToOneField to User.
# Example:
# class Profile(models.Model):
#     user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
#     # Add custom fields here, e.g.:
#     # bio = models.TextField(blank=True)
#     # avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
#
# Then, use signals to automatically create/update the Profile when a User is created.

class Resume(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="resume", null=False, blank=False)
    file = models.FileField(upload_to='resumes/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}'s Resume"
    
class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects", null=False, blank=False)
    name = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks", null=False, blank=False)
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    begin_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    title = models.TextField()
    category = models.TextField(null=True)
    is_done = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    description = models.TextField(blank=True)
    created_at = models.DateField(auto_now_add=True)
    is_subtask = models.BooleanField(default=False)
    carry_over = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        if self.is_done and not self.end_date:
            self.end_date = timezone.now().date()
        elif not self.is_done and self.end_date:
            self.end_date = None
        super().save(*args, **kwargs)
