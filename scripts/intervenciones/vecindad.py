"""SPEC-200 R2: check reviewed direct place-zone associations without database writes.

No proximity threshold, nearest-neighbor ranking or polygon contact authorizes an edge.
Null review rows are pending; [] explicitly records that there are no associated zones.
"""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path


def digest(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def indexed(rows):
    result = {}
    for row in rows:
        identifier = row.get("id")
        if type(identifier) is not int or identifier <= 0 or identifier in result:
            raise ValueError("Every snapshot row needs a unique positive id")
        result[identifier] = row
    return result


def snapshot(data):
    if data.get("schemaVersion") != 1:
        raise ValueError("Unsupported snapshot schema")
    places, zones = indexed(data["places"]), indexed(data["zones"])
    canonical = {"schemaVersion": 1, "places": sorted(places.values(), key=lambda r: r["id"]),
                 "zones": sorted(zones.values(), key=lambda r: r["id"])}
    return places, zones, digest(canonical)


def polygon_count(row):
    geometry = row.get("geometry") or {}
    if not row.get("geometryValid") or not geometry.get("coordinates"):
        return 0
    if geometry.get("type") == "Polygon":
        return 1
    if geometry.get("type") == "MultiPolygon":
        return len(geometry["coordinates"])
    return 0


def prepare(data):
    places, zones, revision = snapshot(data)
    return {"schemaVersion": 2, "selectionRule": "DIRECT_ASSOCIATIONS",
            "datasetRevision": revision, "reviewedBy": None, "reviewedAt": None,
            "placeZones": {str(k): None for k in sorted(places)},
            "multipartAcknowledged": [],
            "note": "Pending review. Null is not an approved empty neighborhood. No edge was inferred."}


def reviewed_rows(rows, known_keys, zones):
    result = {}
    if set(rows) != {str(k) for k in known_keys}:
        raise ValueError("Review rows must match the snapshot ids exactly")
    for key, values in rows.items():
        if values is None:
            continue
        if not isinstance(values, list) or any(type(v) is not int or v not in zones for v in values):
            raise ValueError("A reviewed row must contain known zone ids")
        if len(values) != len(set(values)):
            raise ValueError("Duplicate reviewed zone")
        result[int(key)] = set(values)
    return result


def validate(data, review):
    places, zones, revision = snapshot(data)
    if (review.get("schemaVersion") != 2 or review.get("selectionRule") != "DIRECT_ASSOCIATIONS"
            or "zoneNeighbors" in review or review.get("datasetRevision") != revision):
        raise ValueError("Stale or unsupported review: export and review the current dataset again")
    first = reviewed_rows(review["placeZones"], places, zones)
    acknowledged = review.get("multipartAcknowledged", [])
    if not isinstance(acknowledged, list) or any(type(z) is not int or z not in zones for z in acknowledged):
        raise ValueError("Unknown multipart acknowledgment")
    author, instant = review.get("reviewedBy"), review.get("reviewedAt")
    signed = isinstance(author, str) and bool(author.strip()) and isinstance(instant, str)
    if signed:
        try:
            signed = datetime.fromisoformat(instant.replace("Z", "+00:00")).tzinfo is not None
        except ValueError:
            signed = False
    results = []
    for identifier, place in sorted(places.items()):
        reasons = []
        roots = first.get(identifier)
        if not signed:
            reasons.append("review_author_or_timestamp_missing")
        if polygon_count(place) == 0:
            reasons.append("place_polygon_missing_or_invalid")
        if roots is None:
            reasons.append("place_neighbors_pending")
        else:
            if any(polygon_count(zones[z]) == 0 for z in roots):
                reasons.append("zone_polygon_missing_or_invalid")
            if any(polygon_count(zones[z]) > 1 and z not in acknowledged for z in roots):
                reasons.append("multipart_zone_meaning_pending")
        results.append({"placeId": identifier, "code": place.get("code"), "name": place.get("name"),
                        "eligibleZoneIds": sorted(roots) if roots is not None and not reasons else [],
                        "ready": not reasons, "reasons": reasons})
    return {"selectionRule": "DIRECT_ASSOCIATIONS", "datasetRevision": revision,
            "readyPlaces": sum(r["ready"] for r in results),
            "pendingPlaces": sum(not r["ready"] for r in results), "places": results}


def inspect_sources(root):
    folder = Path(root) / "docs/dominio/datos/fuentes-mapa"
    report = {"authorizesSelection": False, "placesFromDatabaseVerified": False, "sources": []}
    for filename, prefix in [("areas_verdes.geojson", "AV"), ("xerofitica.geojson", "XE")]:
        raw = (folder / filename).read_bytes()
        features = json.loads(raw)["features"]
        multipart = [f"{prefix}-{i:04d}" for i, feature in enumerate(features, 1)
                     if feature.get("geometry", {}).get("type") == "MultiPolygon"
                     and len(feature["geometry"]["coordinates"]) > 1]
        report["sources"].append({"file": filename, "sha256": hashlib.sha256(raw).hexdigest(),
                                  "zoneCount": len(features), "multipartZones": multipart})
    raw = (folder / "edificios-osm.geojson").read_bytes()
    buildings = json.loads(raw)["features"]
    library = [f["properties"] for f in buildings if f["properties"].get("id") == "way/157964892"]
    report["buildings"] = {"count": len(buildings), "sha256": hashlib.sha256(raw).hexdigest(),
                           "librarySource": library,
                           "note": "Building geometry is not proof of a registered place or of its neighbors."}
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["sources", "prepare", "validate"])
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument("--snapshot")
    parser.add_argument("--review")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        if args.action == "sources":
            result = inspect_sources(args.root)
        else:
            if not args.snapshot:
                parser.error("--snapshot is required")
            data = load(args.snapshot)
            if args.action == "prepare":
                result = prepare(data)
            else:
                if not args.review:
                    parser.error("--review is required")
                result = validate(data, load(args.review))
        Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.action == "validate" and (not result["places"] or result["pendingPlaces"]):
            parser.exit(2, "Review remains pending; the output does not enable selection.\n")
    except (ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Invalid neighborhood input: {error}\n")


if __name__ == "__main__":
    main()
