from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import GenerateBulletsRequestSerializer
from ..llm.prompt_builder import build_messages
from ..llm.client import generate_bullets_llm


class GenerateResumeBulletsView(APIView):
    def post(self, request):
        ser = GenerateBulletsRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = ser.validated_data

        messages = build_messages(payload)
        model = request.headers.get("X-LLM-Model", "gpt-4o-mini")  # or env default

        try:
            output = generate_bullets_llm(model=model, messages=messages)
        except Exception as e:
            return Response(
                {"error": "llm_error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "request_id": f"req_{request.id if hasattr(request, 'id') else 'local'}",
                "created_at": now(),
                "model": model,
                "output": output,
            },
            status=status.HTTP_200_OK,
        )
