"""Publish only the render data needed by the public campus viewer."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import struct

from sql_util import RAIZ

DEMO = RAIZ / "frontend/src/components/map3d/demo"
ASSETS = RAIZ / "frontend/public/map/demo"
MODEL = RAIZ / "backend/src/main/resources/mapa/edificios-plano"
ZONE_FIELDS = ("code", "name", "parentCode", "mapCode", "landscapeType", "reservable",
               "areaM2", "useType", "irrigationCurrent", "irrigationProject")
FIELDS = {
    "sectors": ZONE_FIELDS,
    "sections": ZONE_FIELDS,
    "subsections": ZONE_FIELDS,
    "buildings": ("id", "name", "inferredName", "category", "campus", "heightM", "levels",
                  "baseM", "source", "parentId", "planKey", "aliases", "codes"),
    "features": ("code", "name", "type", "typeLabel"),
    "vegetation": ("code", "commonName", "scientificName", "speciesSlug", "typeCode", "typeLabel",
                   "heightM", "crownRadiusM", "quantity"),
}
NULL_FIELDS = {
    "sectors": ("description", "reservationOwner"),
    "sections": ("description", "reservationOwner"),
    "subsections": ("description", "reservationOwner"),
    "features": ("attributes",),
}
FEATURE_TYPES = {
    "CAMPUS_BOUNDARY", "GATE", "PARKING", "WASTE_BIN", "DRINKING_FOUNTAIN", "FAUNA",
}
MANIFEST_FIELDS = ("version", "anchor", "nodes", "groundOnly", "sunken", "huaca",
                   "adjustments", "stairs", "pieces", "floorSteps")
GLTF_FIELDS = ("scene", "scenes", "nodes", "meshes", "accessors", "bufferViews", "buffers")


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def read_layers(source):
    payload = json.loads(source.read_text(encoding="utf-8"))
    response = payload.get("data", payload)
    layers = {}
    for layer, fields in FIELDS.items():
        layers[layer] = [
            {
                "type": "Feature",
                "geometry": row["geometry"],
                "properties": ({field: row["properties"][field] for field in fields}
                               | dict.fromkeys(NULL_FIELDS.get(layer, ()))),
            }
            for row in response["layers"][layer]["features"]
            if layer != "features" or row["properties"]["type"] in FEATURE_TYPES
        ]
    layers.update(references=[], supervisionZones=[])
    if not any(row["properties"]["type"] == "CAMPUS_BOUNDARY" for row in layers["features"]):
        raise ValueError("Falta el contorno del campus")
    return response, layers


def strip_notes(value):
    if isinstance(value, dict):
        return {key: strip_notes(item) for key, item in value.items() if key not in {"why", "extras"}}
    if isinstance(value, list):
        return [strip_notes(item) for item in value]
    return value


def render_asset(path):
    raw = path.read_bytes()
    magic, version, size = struct.unpack_from("<4sII", raw)
    json_size, json_type = struct.unpack_from("<I4s", raw, 12)
    if (magic, version, size, json_type) != (b"glTF", 2, len(raw), b"JSON"):
        raise ValueError("El modelo no es un GLB 2.0 válido")
    source = json.loads(raw[20:20 + json_size])
    render_only = {"asset": {"version": "2.0"}, **{key: strip_notes(source[key]) for key in GLTF_FIELDS}}
    for collection in (render_only["buffers"], render_only["scenes"], render_only["nodes"], render_only["meshes"]):
        if any("uri" in item or "extensions" in item for item in collection):
            raise ValueError("El modelo público debe ser autónomo")
    data = encode(render_only).encode("utf-8")
    data += b" " * ((-len(data)) % 4)
    binary = raw[20 + json_size:]
    return (struct.pack("<4sII", b"glTF", 2, 20 + len(data) + len(binary))
            + struct.pack("<I4s", len(data), b"JSON") + data + binary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layers", type=Path, required=True,
                        help="JSON de GET /api/v1/map/layers del entorno de desarrollo")
    args = parser.parse_args()
    response, layers = read_layers(args.layers)
    source_manifest = json.loads(MODEL.with_suffix(".json").read_text(encoding="utf-8"))
    manifest = {key: strip_notes(source_manifest[key]) for key in MANIFEST_FIELDS if key in source_manifest}
    buildings = {row["properties"]["planKey"] for row in layers["buildings"]
                 if row["properties"]["campus"] and row["properties"]["parentId"] is None}
    mesh_keys = {key for key, kind in manifest["nodes"].items() if kind == "edificio"}
    if not mesh_keys.intersection(buildings) or not set(manifest["groundOnly"]).issubset(buildings):
        raise ValueError("Las capas no corresponden al modelo de esta versión")

    asset = render_asset(MODEL.with_suffix(".glb"))
    digest = hashlib.sha256(asset).hexdigest()[:16]
    filename = f"campus-{digest}.glb.gz"
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / filename).write_bytes(gzip.compress(asset, compresslevel=9, mtime=0))
    (DEMO / "plan.json").write_text(
        encode({"url": f"/map/demo/{filename}", "manifest": manifest}) + "\n", encoding="utf-8",
    )

    collections = [
        f'    "{name}":{{"type":"FeatureCollection","features":[\n'
        + ",\n".join(f"      {encode(row)}" for row in rows) + "\n    ]}"
        for name, rows in layers.items()
    ]
    metadata = {key: response[key] for key in ("version", "origin", "attributionRequired")}
    (DEMO / "campus.json").write_text(
        encode(metadata)[:-1] + ',\n  "layers":{\n' + ",\n".join(collections) + "\n  }\n}\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
