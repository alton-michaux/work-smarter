from rest_framework import serializers

class ExperienceInputSerializer(serializers.Serializer):
    experience_id = serializers.CharField()
    role_title = serializers.CharField()
    company = serializers.CharField()
    location = serializers.CharField(required=False, allow_blank=True, default="")
    start_date = serializers.CharField()  # "YYYY-MM" is fine; validate later if you want
    end_date = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    current_role = serializers.BooleanField(default=False)

    raw_tasks = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    existing_bullets = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )


class GenerateBulletsRequestSerializer(serializers.Serializer):
    language = serializers.CharField(default="en")
    target_role = serializers.CharField()
    seniority_level = serializers.ChoiceField(choices=["intern", "junior", "mid", "senior", "staff", "lead"])
    industry = serializers.CharField(required=False, allow_blank=True, default="")

    style = serializers.DictField(required=False, default=dict)
    constraints = serializers.DictField(required=False, default=dict)

    job_description = serializers.CharField(required=False, allow_blank=True, default="")
    experiences = ExperienceInputSerializer(many=True)

    def validate(self, attrs):
        # Hard stop if we have nothing to work with
        for exp in attrs["experiences"]:
            if not exp.get("raw_tasks") and not exp.get("existing_bullets"):
                raise serializers.ValidationError(
                    f"Insufficient content for {exp['experience_id']}: provide raw_tasks or existing_bullets."
                )
        return attrs


class GenerateBulletsResponseSerializer(serializers.Serializer):
    request_id = serializers.CharField()
    created_at = serializers.DateTimeField()
    model = serializers.CharField()
    output = serializers.DictField()  # the LLM JSON payload (validated separately if you want)
