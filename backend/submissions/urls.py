from django.urls import path

from . import views

urlpatterns = [
    path("csrf", views.CsrfView.as_view()),
    path("session", views.SessionView.as_view()),
    path("me", views.MeView.as_view()),
    path("submissions", views.SubmissionListCreateView.as_view()),
    path("submissions/<uuid:pk>", views.SubmissionDetailView.as_view()),
    path("submissions/<uuid:pk>/decision", views.DecisionView.as_view()),
]
