"""Prepare static Toronto Development Pipeline data using official sources.

The pipeline itself has addresses but no coordinates. We join exact normalized
addresses to Toronto One Address Repository points. Unmatched or ambiguous
addresses stay in the output with null coordinates and are excluded at runtime.
Raw source files can be supplied for offline/reproducible imports.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "data"
PIPELINE_PACKAGE = "development-pipeline"
ADDRESS_PACKAGE = "address-points-municipal-toronto-one-address-repository"
CKAN = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id="
PIPELINE_PAGE = "https://open.toronto.ca/dataset/development-pipeline/"
ADDRESS_PAGE = "https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/"
USER_AGENT = "VicinityRadar/1.0 (static open-data research prototype)"


def request_json(url: str) -> dict:
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=60) as response:
        return json.load(response)


def package(name: str) -> dict:
    payload = request_json(CKAN + name)
    if not payload.get("success"):
        raise ValueError(f"CKAN package lookup failed: {name}")
    return payload["result"]


def resource(package_data: dict, name: str) -> dict:
    options = [r for r in package_data["resources"] if r.get("name") == name]
    if len(options) != 1 or not options[0].get("url"):
        raise ValueError(f"Cannot identify official resource: {name}")
    return options[0]


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=120) as response:
        with destination.open("wb") as output:
            shutil.copyfileobj(response, output)


def normalize_address(value: object) -> str:
    text = str(value or "").strip().upper()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*,\s*TORONTO.*$", "", text)
    text = re.sub(r"\.$", "", text)
    return text


def number(value: object) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        parsed = float(str(value).replace(",", ""))
    except ValueError:
        return None
    return parsed if parsed >= 0 and parsed < float("inf") else None


def geometry_point(raw: object) -> tuple[float, float] | None:
    try:
        geometry = json.loads(str(raw))
        if geometry["type"] == "Point":
            lon, lat = geometry["coordinates"]
        elif geometry["type"] == "MultiPoint" and len(geometry["coordinates"]) == 1:
            lon, lat = geometry["coordinates"][0]
        else:
            return None
        if 43.3 <= lat <= 44.0 and -80.0 <= lon <= -78.7:
            return round(lat, 7), round(lon, 7)
    except (ValueError, TypeError, KeyError, IndexError):
        pass
    return None


def pipeline_rows(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        rows = json.loads(path.read_text(encoding="utf-8-sig"))
    else:
        with path.open(encoding="utf-8-sig", newline="") as file:
            rows = list(csv.DictReader(file))
    if not isinstance(rows, list) or not rows:
        raise ValueError("Pipeline input is empty")
    required = {"Application Number", "Pipeline Status", "Address", "Proposed Residential Units", "Proposed Non-Residential Gross Floor Area"}
    if not required.issubset(rows[0]):
        raise ValueError(f"Unexpected pipeline schema; missing {sorted(required - set(rows[0]))}")
    return rows


def address_points(path: Path, wanted: set[str]) -> dict[str, set[tuple[float, float]]]:
    matches: dict[str, set[tuple[float, float]]] = {}
    with path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not {"ADDRESS_FULL", "geometry"}.issubset(reader.fieldnames or []):
            raise ValueError("Unexpected address point schema")
        for row in reader:
            key = normalize_address(row["ADDRESS_FULL"])
            if key not in wanted:
                continue
            point = geometry_point(row["geometry"])
            if point:
                matches.setdefault(key, set()).add(point)
    return matches


def classify_type(row: dict) -> str:
    residential = number(row.get("Proposed Residential Gross Floor Area"))
    units = number(row.get("Proposed Residential Units"))
    non_residential = number(row.get("Proposed Non-Residential Gross Floor Area"))
    has_residential = (residential or 0) > 0 or (units or 0) > 0
    has_non_residential = (non_residential or 0) > 0
    if has_residential and has_non_residential:
        return "mixed_use"
    if has_residential:
        return "residential"
    # Non-residential may be office, industrial, institutional, or another use.
    return "unknown"


def stage(status: object) -> str:
    # 'Active' is not evidence of approval or construction.
    return {"Under Review": "proposed", "Built": "built"}.get(status, "unknown")


def prepare(rows: list[dict], matches: dict[str, set[tuple[float, float]]]) -> tuple[list[dict], int]:
    records: list[dict] = []
    seen: dict[str, dict] = {}
    duplicates = 0
    for row in rows:
        application = str(row.get("Application Number") or "").strip()
        if not application:
            raise ValueError("Pipeline row missing Application Number")
        if application in seen:
            if row != seen[application]:
                raise ValueError(f"Conflicting rows share Application Number: {application}")
            duplicates += 1
            continue
        seen[application] = row
        address = str(row.get("Address") or "").strip() or None
        points = matches.get(normalize_address(address), set())
        # Multiple distinct points for one address are ambiguous for a 500 m search.
        point = next(iter(points)) if len(points) == 1 else None
        link = str(row.get("Application Information Centre Link") or "").strip() or None
        if link and not link.startswith(("https://", "http://")):
            link = None
        records.append({
            "id": application, "sourceProjectId": application, "name": None,
            "address": address, "latitude": point[0] if point else None,
            "longitude": point[1] if point else None,
            "stage": stage(row.get("Pipeline Status")),
            "originalStage": str(row.get("Pipeline Status") or "").strip() or None,
            "developmentType": classify_type(row), "originalDevelopmentType": None,
            "residentialUnits": number(row.get("Proposed Residential Units")),
            "nonResidentialGfaM2": number(row.get("Proposed Non-Residential Gross Floor Area")),
            "applicationReference": application, "sourceUrl": link,
            "sourceUpdatedAt": None,
            "dateReceived": str(row.get("Date Received") or "").strip() or None,
        })
    return records, duplicates


def write_json_atomic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as file:
        json.dump(value, file, ensure_ascii=False, separators=(",", ":"))
        file.write("\n")
        temporary = Path(file.name)
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Local official pipeline CSV or JSON")
    parser.add_argument("--address-input", type=Path, help="Local official Address Points - 4326.csv")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as directory:
        temporary = Path(directory)
        pipeline_resource = None
        address_resource = None
        pipeline_package = None
        if args.input:
            source = args.input
        else:
            pipeline_package = package(PIPELINE_PACKAGE)
            pipeline_resource = resource(pipeline_package, "Development Pipeline.json")
            source = temporary / "pipeline.json"
            download(pipeline_resource["url"], source)
        rows = pipeline_rows(source)
        if args.address_input:
            address_source = args.address_input
        else:
            address_package = package(ADDRESS_PACKAGE)
            address_resource = resource(address_package, "Address Points - 4326.csv")
            address_source = temporary / "addresses.csv"
            download(address_resource["url"], address_source)
        wanted = {normalize_address(row.get("Address")) for row in rows}
        matches = address_points(address_source, wanted)
        records, duplicates = prepare(rows, matches)
        geocoded = sum(record["latitude"] is not None for record in records)
        properties = json.loads((PUBLIC / "properties.json").read_text(encoding="utf-8"))
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        metadata = {
            "project": "Vicinity Radar", "dataMode": "verified",
            "properties": {"count": len(properties), "source": "Hines property pages and linked Google Maps coordinates", "retrievedAt": max(p["retrievedAt"] for p in properties)},
            "developments": {
                "count": len(records), "geocodedCount": geocoded,
                "excludedNoCoordinates": len(records) - geocoded,
                "rawCount": len(rows), "duplicateCount": duplicates,
                "source": "City of Toronto Development Pipeline", "sourceUrl": PIPELINE_PAGE,
                "sourceVersion": (pipeline_resource or {}).get("last_modified") or (pipeline_package or {}).get("metadata_modified"),
                "resourceUrl": (pipeline_resource or {}).get("url") or str(source),
                "addressSourceUrl": (address_resource or {}).get("url") or str(address_source),
                "preparedAt": stamp,
                "notes": "Coordinates are exact normalized-address matches to Toronto One Address Repository points. Multiple points or unmatched addresses are excluded. Active status and non-residential-only use stay unknown because the source does not specify construction or use type.",
            },
        }
        if not records or geocoded == 0:
            raise ValueError("No usable geocoded records; existing output preserved")
        write_json_atomic(PUBLIC / "developments.json", records)
        write_json_atomic(PUBLIC / "metadata.json", metadata)
        print(f"Pipeline rows: {len(rows)}; unique applications: {len(records)}; duplicates: {duplicates}")
        print(f"Geocoded: {geocoded}; excluded from radius search: {len(records) - geocoded}")
        print(f"Output bytes: {(PUBLIC / 'developments.json').stat().st_size}")


if __name__ == "__main__":
    main()
