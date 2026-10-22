"""Validate and publish the manually reviewed Hines seed file.

Edit data/hines_seed.json to add or correct properties. Coordinates require a
documented source URL; this script never geocodes or guesses them.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "data" / "hines_seed.json"
OUTPUT = ROOT / "public" / "data" / "properties.json"
METADATA = ROOT / "public" / "data" / "metadata.json"


def write_json_atomic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write("\n")
        temporary = Path(file.name)
    os.replace(temporary, path)


def main() -> None:
    properties = json.loads(SEED.read_text(encoding="utf-8"))
    if not isinstance(properties, list) or not properties:
        raise ValueError("Expected a nonempty property list")
    ids: set[str] = set()
    for property_record in properties:
        for field in ("id", "name", "address", "city", "province", "sourceUrl", "retrievedAt"):
            if not property_record.get(field):
                raise ValueError(f"Property {property_record.get('id')} lacks {field}")
        if property_record["id"] in ids:
            raise ValueError(f"Duplicate property id: {property_record['id']}")
        ids.add(property_record["id"])
        lat, lon = property_record.get("latitude"), property_record.get("longitude")
        if (lat is None) != (lon is None):
            raise ValueError(f"Incomplete coordinates: {property_record['id']}")
        if lat is not None and (not 43.3 <= lat <= 44.0 or not -80.0 <= lon <= -78.7 or not property_record.get("coordinateSourceUrl")):
            raise ValueError(f"Unverified or out-of-area coordinates: {property_record['id']}")
    write_json_atomic(OUTPUT, properties)
    if METADATA.exists():
        metadata = json.loads(METADATA.read_text(encoding="utf-8"))
        metadata["properties"] = {
            "count": len(properties),
            "source": "Hines property pages and linked Google Maps coordinates",
            "retrievedAt": max(record["retrievedAt"] for record in properties),
        }
        write_json_atomic(METADATA, metadata)
    print(f"Published {len(properties)} verified properties to {OUTPUT}")


if __name__ == "__main__":
    main()
