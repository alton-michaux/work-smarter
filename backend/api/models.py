from django.db import models

class Resume(models.Model):
    user = models.CharField(max_length=255)
    file = models.FileField(upload_to='resumes/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}'s Resume"
    
class Project(models.Model):
    name = models.CharField(max_length=100)

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True)
    is_done = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    notes = models.TextField(blank=True)
    created_at = models.DateField(auto_now_add=True)
    is_subtask = models.BooleanField(default=False)
    carry_over = models.BooleanField(default=True)
