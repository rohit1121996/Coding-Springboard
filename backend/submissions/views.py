from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import Http404
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Submission
from .serializers import (
    CreateSubmissionSerializer,
    DecisionSerializer,
    LoginSerializer,
    SubmissionSerializer,
)


def is_reviewer(user):
    return user.groups.filter(name="reviewer").exists()


def user_data(user):
    return {"username": user.username, "role": "reviewer" if is_reviewer(user) else "submitter"}


def error(code, message, status_code):
    return Response({"code": code, "message": message}, status=status_code)


def visible_submissions(user):
    queryset = Submission.objects.select_related("submitter", "decided_by")
    return queryset if is_reviewer(user) else queryset.filter(submitter=user)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return error("invalid_credentials", "Invalid username or password.", 401)
        login(request, user)
        return Response(user_data(user))

    def delete(self, request):
        logout(request)
        return Response(status=204)


class MeView(APIView):
    def get(self, request):
        return Response(user_data(request.user))


class SubmissionListCreateView(APIView):
    def get(self, request):
        queryset = visible_submissions(request.user)

        requested_status = request.query_params.get("status")
        if requested_status:
            if requested_status not in Submission.Status.values:
                return error("validation_error", "Invalid status filter.", 400)
            queryset = queryset.filter(status=requested_status)

        return Response(SubmissionSerializer(queryset, many=True).data)

    def post(self, request):
        if is_reviewer(request.user):
            return error("forbidden", "Only submitters can create submissions.", 403)
        serializer = CreateSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = Submission.objects.create(
            submitter=request.user, **serializer.validated_data
        )
        return Response(SubmissionSerializer(submission).data, status=201)


class SubmissionDetailView(APIView):
    def get(self, request, pk):
        submission = visible_submissions(request.user).filter(pk=pk).first()
        if submission is None:
            raise Http404
        return Response(SubmissionSerializer(submission).data)


class DecisionView(APIView):
    def post(self, request, pk):
        if not is_reviewer(request.user):
            return error("forbidden", "Only reviewers can decide submissions.", 403)
        serializer = DecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            changed = Submission.objects.filter(
                pk=pk, status=Submission.Status.PENDING
            ).update(
                status=serializer.validated_data["decision"],
                decided_by=request.user,
                decided_at=timezone.now(),
            )
            if not changed:
                if not Submission.objects.filter(pk=pk).exists():
                    raise Http404
                return error("conflict", "This submission has already been decided.", 409)

        submission = Submission.objects.select_related("submitter", "decided_by").get(pk=pk)
        return Response(SubmissionSerializer(submission).data)
