import re


def normalize_key(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip().casefold())


def split_values(value: str | None) -> list[str]:
    if not value:
        return []
    parts = re.split(r"[;|,]", value)
    return [part.strip() for part in parts if part.strip()]

