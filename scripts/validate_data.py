"""Validate the bundled static datasets and metadata."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "data"


def main() -> None:
    properties = json.loads((ROOT / "properties.json").read_text(encoding="utf-8"))
    developments = json.loads((ROOT / "developments.json").read_text(encoding="utf-8"))
    metadata = json.loads((ROOT / "metadata.json").read_text(encoding="utf-8"))
    assert len(properties) == metadata["properties"]["count"]
    assert len(developments) == metadata["developments"]["count"]
    assert len({p["id"] for p in properties}) == len(properties)
    assert len({d["id"] for d in developments}) == len(developments)
    for collection in (properties, developments):
        for row in collection:
            lat, lon = row.get("latitude"), row.get("longitude")
            assert (lat is None) == (lon is None), row["id"]
            assert lat is None or (43.3 <= lat <= 44.0 and -80 <= lon <= -78.7), row["id"]
    usable = sum(d["latitude"] is not None for d in developments)
    assert usable == metadata["developments"]["geocodedCount"]
    assert len(developments) - usable == metadata["developments"]["excludedNoCoordinates"]
    assert metadata["dataMode"] == ("verified" if developments else "unavailable")
    print(f"Valid: {len(properties)} properties, {len(developments)} developments, {usable} geocoded")


if __name__ == "__main__":
    main()
