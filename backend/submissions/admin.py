from django.contrib import admin

from .models import Submission


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("title", "submitter", "status", "created_at", "decided_by")
    list_filter = ("status",)
    search_fields = ("title", "submitter__username")
    readonly_fields = ("created_at", "decided_at")
