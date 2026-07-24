"""Run database seed. Ensures ProjectFixed code is loaded (not sibling Project/)."""
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.db.seed import run_seed  # noqa: E402


if __name__ == "__main__":
    run_seed()

