"""
Centralized exception handling.
All errors return a standard {success, error: {code, message, details}} envelope.
"""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


# ── Standard error response ───────────────────────────────────
def error_response(
    code: str,
    message: str,
    details: dict = None,
    status_code: int = 400,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        },
    )


# ── Custom exceptions ─────────────────────────────────────────
class TwinAgentException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class BadRequestException(TwinAgentException):
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            code="BAD_REQUEST",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class NotFoundException(TwinAgentException):
    def __init__(self, resource: str, resource_id: str = ""):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} not found" + (f": {resource_id}" if resource_id else ""),
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedException(TwinAgentException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenException(TwinAgentException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ConflictException(TwinAgentException):
    def __init__(self, message: str):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


class ValidationException(TwinAgentException):
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


# ── Register handlers ─────────────────────────────────────────
def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(TwinAgentException)
    async def twin_agent_exception_handler(
        request: Request, exc: TwinAgentException
    ) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.details, exc.status_code)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        return error_response("HTTP_ERROR", exc.detail, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            "VALIDATION_ERROR",
            "Request validation failed",
            {"errors": jsonable_encoder(exc.errors())},
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return error_response(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
