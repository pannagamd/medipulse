import asyncio

import httpx


_MAX_ATTEMPTS = 3
_BACKOFF_BASE = 1.0  # seconds


class OpenFDAAdapter:
    base_url = "https://api.fda.gov/drug/label.json"
    # Reduced from 20 s to fail fast; FDA API is normally fast
    timeout = httpx.Timeout(10.0)

    async def label_by_name(self, name: str, limit: int = 1) -> dict | None:
        """Return the first openFDA drug label for *name*.

        Retries up to ``_MAX_ATTEMPTS`` times with linear backoff.  A genuine
        404 from the API (medicine not found) returns ``None`` immediately
        without retrying.  Raises the last ``httpx`` exception on exhaustion.
        """
        params = {
            "search": f'openfda.generic_name:"{name}" OR openfda.brand_name:"{name}"',
            "limit": limit,
        }
        last_exc: Exception | None = None
        for attempt in range(_MAX_ATTEMPTS):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(self.base_url, params=params)
                    if response.status_code == 404:
                        # Medicine genuinely not in openFDA — no point retrying
                        return None
                    response.raise_for_status()
                results = response.json().get("results", [])
                return results[0] if results else None
            except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
                last_exc = exc
                if attempt < _MAX_ATTEMPTS - 1:
                    await asyncio.sleep(_BACKOFF_BASE * (attempt + 1))
        raise last_exc  # type: ignore[misc]
