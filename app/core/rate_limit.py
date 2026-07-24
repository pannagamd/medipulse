from time import monotonic

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.rate_limit_enabled or request.url.path == "/health":
            return await call_next(request)

        now = monotonic()
        window_start = now - settings.rate_limit_window_seconds
        client_host = request.client.host if request.client else "unknown"
        key = f"{client_host}:{request.url.path}"
        hits = [timestamp for timestamp in self._hits.get(key, []) if timestamp >= window_start]

        if len(hits) >= settings.rate_limit_requests:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
            )

        hits.append(now)
        self._hits[key] = hits
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_requests)
        response.headers["X-RateLimit-Window-Seconds"] = str(settings.rate_limit_window_seconds)
        return response
