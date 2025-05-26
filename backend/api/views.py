from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume
from .serializers import ResumeSerializer
import openai

class ResumeViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # Save the uploaded file
        resume = Resume(file=file)
        resume.save()

        # Analyze the resume with OpenAI API
        openai.api_key = request.data.get('api_key')  # Assuming API key is sent in the request
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=f"Analyze this resume: {file.name}",
            max_tokens=150
        )

        # Return the suggestions
        return Response({"suggestions": response.choices[0].text.strip()}, status=status.HTTP_201_CREATED)

    def list(self, request):
        resumes = Resume.objects.all()
        serializer = ResumeSerializer(resumes, many=True)
        return Response(serializer.data)