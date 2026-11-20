from rest_framework import serializers

from .models import Submission


class SubmissionSerializer(serializers.ModelSerializer):
    submitter = serializers.CharField(source="submitter.username", read_only=True)
    decided_by = serializers.CharField(source="decided_by.username", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id", "submitter", "title", "content", "status", "created_at",
            "decided_by", "decided_at",
        ]
        read_only_fields = fields


class CreateSubmissionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.CharField(max_length=10000)


class DecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approved", "rejected"])


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(trim_whitespace=False)
