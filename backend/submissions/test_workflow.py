import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase

from .models import Submission


class WorkflowSecurityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.alice = User.objects.create_user(username="alice", password="strong-test-password")
        cls.bob = User.objects.create_user(username="bob", password="strong-test-password")
        cls.reviewer = User.objects.create_user(username="reviewer", password="strong-test-password")
        cls.reviewer.groups.add(Group.objects.create(name="reviewer"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.csrf = self.client.get("/api/csrf").json()["csrfToken"]

    def post(self, path, data):
        return self.client.post(
            path,
            data=json.dumps(data),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.csrf,
        )

    def login(self, username):
        response = self.post(
            "/api/session", {"username": username, "password": "strong-test-password"}
        )
        self.assertEqual(response.status_code, 200)
        self.csrf = self.client.get("/api/csrf").json()["csrfToken"]

    def test_login_requires_csrf_and_rejects_bad_password(self):
        response = self.client.post(
            "/api/session",
            data=json.dumps({"username": "alice", "password": "strong-test-password"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        response = self.post("/api/session", {"username": "alice", "password": "wrong"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "invalid_credentials")

    def test_submitter_creates_and_sees_only_own_submissions(self):
        Submission.objects.create(submitter=self.bob, title="Private", content="Bob's document")
        self.login("alice")
        response = self.post("/api/submissions", {"title": "  Proposal  ", "content": "  Body  "})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "pending")
        self.assertEqual(response.json()["title"], "Proposal")
        listing = self.client.get("/api/submissions").json()
        self.assertEqual(len(listing), 1)
        self.assertEqual(listing[0]["submitter"], "alice")
        bob_id = Submission.objects.get(submitter=self.bob).pk
        self.assertEqual(self.client.get(f"/api/submissions/{bob_id}").status_code, 404)

    def test_invalid_payload_and_unauthorized_actions(self):
        self.login("alice")
        response = self.post("/api/submissions", {"title": " ", "content": ""})
        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.json()["field_errors"])
        response = self.post("/api/submissions", {"title": "x" * 201, "content": "body"})
        self.assertEqual(response.status_code, 400)
        submission = Submission.objects.create(submitter=self.alice, title="A", content="B")
        response = self.post(f"/api/submissions/{submission.pk}/decision", {"decision": "approved"})
        self.assertEqual(response.status_code, 403)

    def test_reviewer_decides_once_and_cannot_submit(self):
        submission = Submission.objects.create(submitter=self.alice, title="A", content="B")
        self.login("reviewer")
        self.assertEqual(self.post("/api/submissions", {"title": "X", "content": "Y"}).status_code, 403)
        response = self.post(f"/api/submissions/{submission.pk}/decision", {"decision": "approved"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "approved")
        self.assertEqual(response.json()["decided_by"], "reviewer")
        response = self.post(f"/api/submissions/{submission.pk}/decision", {"decision": "rejected"})
        self.assertEqual(response.status_code, 409)
        submission.refresh_from_db()
        self.assertEqual(submission.status, "approved")
        self.assertEqual(len(self.client.get("/api/submissions?status=pending").json()), 0)

    def test_reviewer_can_reject_and_invalid_decision_fails(self):
        submission = Submission.objects.create(submitter=self.bob, title="B", content="Body")
        self.login("reviewer")
        response = self.post(f"/api/submissions/{submission.pk}/decision", {"decision": "maybe"})
        self.assertEqual(response.status_code, 400)
        response = self.post(f"/api/submissions/{submission.pk}/decision", {"decision": "rejected"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "rejected")

    def test_csrf_is_required_for_authenticated_writes(self):
        self.login("alice")
        response = self.client.post(
            "/api/submissions",
            data=json.dumps({"title": "A", "content": "B"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_anonymous_user_cannot_read_submissions(self):
        response = self.client.get("/api/submissions")
        self.assertEqual(response.status_code, 401)
