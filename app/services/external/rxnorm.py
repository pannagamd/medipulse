import asyncio

import httpx


_MAX_ATTEMPTS = 3
_BACKOFF_BASE = 1.0  # seconds; attempt 0→0s wait, 1→1s, 2→2s


class RxNormAdapter:
    base_url = "https://rxnav.nlm.nih.gov/REST"
    # Reduced from 15 s — fail fast so the worker is not blocked indefinitely
    timeout = httpx.Timeout(10.0)

    async def approximate_match(self, name: str) -> dict | None:
        """Return the top RxNorm approximate-match candidate for *name*.

        Retries up to ``_MAX_ATTEMPTS`` times with linear backoff on transient
        network/timeout errors.  Raises the last ``httpx`` exception on
        exhaustion so callers can map it to HTTP 503.
        """
        last_exc: Exception | None = None
        for attempt in range(_MAX_ATTEMPTS):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(
                        f"{self.base_url}/approximateTerm.json",
                        params={"term": name},
                    )
                    response.raise_for_status()
                candidates = response.json().get("approximateGroup", {}).get("candidate", [])
                return candidates[0] if candidates else None
            except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
                last_exc = exc
                if attempt < _MAX_ATTEMPTS - 1:
                    await asyncio.sleep(_BACKOFF_BASE * (attempt + 1))
        raise last_exc  # type: ignore[misc]
