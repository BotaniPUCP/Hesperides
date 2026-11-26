"""Export the allowlisted public layers, without reading the operational database."""

import csv
import json
from collections import Counter

from capas import _vocabulario
from plano_pucp.relaciones import nombres_v011
from sql_util import DATOS, RAIZ, leer_geojson

MAP_COMPONENTS = RAIZ / "frontend/src/components/map3d"
OUTPUT = MAP_COMPONENTS / "demo/campus.json"


def geometry_for_demo(geometry):
    def compact(coordinates):
        if isinstance(coordinates[0], (int, float)):
            return [round(value, 6) for value in coordinates[:2]]
        return [compact(part) for part in coordinates]

    return {"type": geometry["type"], "coordinates": compact(geometry["coordinates"])}


def feature(geometry, **properties):
    return {"type": "Feature", "geometry": geometry_for_demo(geometry), "properties": properties}


def read_csv(name, delimiter=","):
    with (DATOS / name).open(encoding="utf-8") as source:
        return list(csv.DictReader(source, delimiter=delimiter))


def building_look_keys(osm):
    migration = RAIZ / "backend/src/main/resources/db/migration/V011__seed_map_data.sql"
    # Relations identify footprints by their V011 row number. Assert the order before using it.
    nombres_v011(migration.read_text(encoding="utf-8"), osm)
    relations_path = MAP_COMPONENTS / "equivalence/final-relations.json"
    relations = json.loads(relations_path.read_text(encoding="utf-8"))["relations"]
    counts = Counter(map_id for relation in relations for map_id in relation["mapIds"])
    # A facade is laid out for one building. Only match unambiguous OSM footprints.
    return {
        int(map_id): relation["id"]
        for relation in relations
        if len(relation["mapIds"]) == 1
        for map_id in relation["mapIds"]
        if counts[map_id] == 1
    }


def buildings():
    vocabulary, category_by_name = _vocabulario()
    osm = leer_geojson("edificios-osm.geojson")
    look_keys = building_look_keys(osm)
    for index, original in enumerate(osm, start=1):
        props = original["properties"]
        campus = bool(props["c"])
        term = vocabulary["vocabulario"].get(props["id"])
        name = term["t"] if isinstance(term, dict) else term or props["n"] or None
        levels = str(props.get("lv"))
        yield feature(
            original["geometry"], id=index, name=name if campus else None, inferredName=False,
            category=category_by_name.get(name) if campus else None, campus=campus,
            heightM=props["h"], levels=int(levels) if levels.isdigit() else None, source="OSM",
            aliases=vocabulary["alias"].get(name) if campus else None,
            parentId=None, planKey=look_keys.get(index) if campus else None, baseM=None, codes=None,
        )


def gardens():
    layers = (
        ("areas_verdes.geojson", "AV", "Área verde", "GREEN_AREA"),
        ("xerofitica.geojson", "XE", "Jardín xerofítico", "XEROPHYTIC"),
    )
    for source, prefix, label, landscape in layers:
        for index, original in enumerate(leer_geojson(source), start=1):
            code = f"{prefix}-{index:04}"
            name = original["properties"]["Nombre"] or f"{label} {index}"
            yield feature(
                original["geometry"], code=code, name=name, landscapeType=landscape,
                description=None, parentCode=None, mapCode=None, useType=None, reservable=False,
                reservationOwner=None, areaM2=None, irrigationCurrent=None, irrigationProject=None,
            )


def vegetation():
    species = {row["nombre_cientifico"]: row for row in read_csv("especies.csv")}
    for index, row in enumerate(read_csv("ejemplares.csv", ";"), start=1):
        if not row["longitud"] or not row["latitud"]:
            continue
        plant = species[row["nombre_cientifico"]]
        point = {"type": "Point", "coordinates": [float(row["longitud"]), float(row["latitud"])]}
        # Local display IDs; no field records, photos, evaluations or measurements.
        yield feature(
            point, code=f"V-{index:04}", speciesSlug=plant["slug"], commonName=plant["nombre_comun"],
            scientificName=plant["nombre_cientifico"], typeCode=plant["tipo"],
            typeLabel=row["tipo_vegetacion"], quantity=int(row["cantidad"] or 1), heightM=None,
            crownRadiusM=None,
        )


def main():
    boundary = next(row["geometry"] for row in leer_geojson("perimetro-y-veredas.geojson")
                    if row["properties"]["layer"] == "limite_campus")
    points = boundary["coordinates"][0]
    origin = {
        axis: round((min(point[i] for point in points) + max(point[i] for point in points)) / 2, 6)
        for i, axis in enumerate(("lon", "lat"))
    }
    layers = {
        "features": [feature(boundary, type="CAMPUS_BOUNDARY", typeLabel="Campus", name="Campus PUCP",
                             code=None, attributes=None)],
        "buildings": list(buildings()),
        "sections": list(gardens()),
        "vegetation": list(vegetation()),
        "sectors": [], "subsections": [], "supervisionZones": [], "references": [],
    }

    def encode(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    # Next emits this as a fingerprinted static chunk; new data gets a new URL.
    collections = [
        f'    "{key}":{{"type":"FeatureCollection","features":[\n'
        + ",\n".join(f"      {encode(row)}" for row in rows) + "\n    ]}"
        for key, rows in layers.items()
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text('{\n  "version":1,\n  "origin":' + encode(origin)
                      + ',\n  "attributionRequired":true,\n  "layers":{\n'
                      + ",\n".join(collections) + "\n  }\n}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
