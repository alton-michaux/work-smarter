from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models import ResumeProfile, WorkExperience, Education, Skill
from api.serializers import ResumeProfileSerializer, WorkExperienceSerializer, EducationSerializer, SkillSerializer


class ResumeProfileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        profile, _ = ResumeProfile.objects.get_or_create(user=request.user)
        return Response(ResumeProfileSerializer(profile).data)

    def partial_update(self, request, pk=None):
        profile, _ = ResumeProfile.objects.get_or_create(user=request.user)
        serializer = ResumeProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WorkExperienceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        return WorkExperience.objects.filter(profile=profile)

    def perform_create(self, serializer):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class EducationViewSet(viewsets.ModelViewSet):
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        return Education.objects.filter(profile=profile)

    def perform_create(self, serializer):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        return Skill.objects.filter(profile=profile)

    def perform_create(self, serializer):
        profile, _ = ResumeProfile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)
