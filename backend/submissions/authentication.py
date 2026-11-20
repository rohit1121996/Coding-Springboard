from rest_framework.authentication import SessionAuthentication


class SessionAuthenticationWithChallenge(SessionAuthentication):
    """Use HTTP 401 when a request has no authenticated session."""

    def authenticate_header(self, request):
        return "Session"
