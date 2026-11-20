from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if response.status_code == 400:
        response.data = {
            "code": "validation_error",
            "message": "Please correct the highlighted fields.",
            "field_errors": response.data,
        }
    else:
        codes = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed"}
        response.data = {
            "code": codes.get(response.status_code, "request_error"),
            "message": str(response.data.get("detail", "The request could not be completed.")),
        }
    return response
