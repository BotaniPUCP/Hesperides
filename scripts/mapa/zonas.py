"""SQL de sectores, secciones, jardines de reserva y zonas de supervisión."""
import csv

from sql_util import FUENTES, fallar, item, leer_geojson, multipoligono, q, valores

# El capataz identifica el sector en el mapa del cliente; el sector es territorio,
# no persona (SPEC-005 §4.4). Los verdes se numeran por superficie.
SECTORES = [
    ("SEC-VERDE-01", "Sector verde 01", "Alfonso", None),
    ("SEC-VERDE-02", "Sector verde 02", "Óscar", None),
    ("SEC-VERDE-03", "Sector verde 03", "Andrés", None),
    ("SEC-POLIDEPORT", "Sector Polideportivo", "campo depo",
     "Mantenimiento contratado por tres años con un tercero"),
    ("SEC-BOSQUE-HUM", "Sector Bosque húmedo", "Bosque húme",
     "Sin personal asignado; se atiende a demanda. Alberga fauna"),
]

USOS = {
    "Áreas de uso administrativo": "ADMINISTRATIVE",
    "Áreas de manejo sostenible y reducción de consumo de agua": "SUSTAINABLE",
    "Áreas de uso recreativo/descanso": "RECREATIONAL",
    "Áreas deportivas y recreación activa": "SPORTS",
    "Uso Institucional": "INSTITUTIONAL",
    "Áreas de conservación": "CONSERVATION",
}

DUENOS = {"DAF": "DAF", "Unidades": "UNIDADES"}


def sectores():
    filas = [f"({q(c)}, {q(n)}, {q(d)}, {item('ZONE_TYPE', 'SECTOR')})" for c, n, _, d in SECTORES]
    return valores("INSERT INTO zones (code, name, description, zone_type_item_id)", filas)


def _jefes():
    with (FUENTES / "capataz-por-seccion.csv").open(encoding="utf-8") as archivo:
        return {fila["feature_id"]: fila["jefe"] for fila in csv.DictReader(archivo)}


def _fila_seccion(codigo, nombre, sector, geometria, area, mapa, uso):
    padre = f"(SELECT id FROM zones WHERE code = '{sector}')" if sector else "NULL"
    uso_sql = item("USE_TYPE", uso) if uso else "NULL"
    return (f"({q(codigo)}, {q(nombre)}, {padre}, {item('ZONE_TYPE', 'SECTION')}, "
            f"{multipoligono(geometria)}, {area}, {q(mapa)}, {uso_sql})")


def secciones():
    """Las 521 áreas verdes y las 10 xerofíticas, que no tienen sector."""
    jefes, sector_de = _jefes(), {jefe: codigo for codigo, _, jefe, _ in SECTORES}
    filas = []
    for i, f in enumerate(leer_geojson("areas_verdes.geojson"), start=1):
        codigo, p = f"AV-{i:04d}", f["properties"]
        if p["Uso"] not in USOS:
            fallar(f"{codigo}: uso desconocido {p['Uso']!r}")
        filas.append(_fila_seccion(codigo, p["Nombre"] or p["código"] or codigo,
                                   sector_de.get(jefes.get(codigo, "")), f["geometry"],
                                   p["Área"], p["código"], USOS[p["Uso"]]))
    for i, f in enumerate(leer_geojson("xerofitica.geojson"), start=1):
        p = f["properties"]
        filas.append(_fila_seccion(f"XE-{i:04d}", p["Nombre"] or f"Área xerofítica {i}", None,
                                   f["geometry"], p["Área"], None, None))
    return valores("INSERT INTO zones (code, name, parent_zone_id, zone_type_item_id, boundary, "
                   "area_m2, map_code, use_type_item_id)", filas)


def unir_sectores():
    """El contorno y el área de un sector son la unión y la suma de sus secciones."""
    # Solo hijos de tipo sección: una sección también es padre (de sus
    # subsecciones) y no debe recibir la unión de sus hijas.
    return ("UPDATE zones s SET boundary = u.geom, area_m2 = u.area FROM (\n"
            "    SELECT parent_zone_id AS id, ST_Multi(ST_Union(boundary)) AS geom, SUM(area_m2) AS area\n"
            "      FROM zones\n"
            f"     WHERE parent_zone_id IS NOT NULL AND zone_type_item_id = {item('ZONE_TYPE', 'SECTION')}\n"
            "     GROUP BY parent_zone_id\n"
            ") u WHERE s.id = u.id;")


def reserva():
    """Jardines de reserva en una tabla temporal; las reglas se aplican en SQL."""
    filas, vistos = [], set()
    for i, f in enumerate(leer_geojson("jardines_reserva.geojson"), start=1):
        p = f["properties"]
        # Un jardín que repite nombre, código y área es un duplicado (JR-0021
        # repite a JR-0010, SPEC-102 §4.3): se conserva el primero. Mismo nombre
        # con otra área no es duplicado: «Jardín Palmeras» son dos jardines.
        clave = (p["Nombre"], p["código"], p["Área"])
        if not f.get("geometry") or clave in vistos:
            continue
        vistos.add(clave)
        filas.append(f"({q(f'JR-{i:04d}')}, {q(p['Nombre'])}, {q(DUENOS[p['Pertenecen']])}, "
                     f"{multipoligono(f['geometry'])})")
    return ("CREATE TEMP TABLE reserve_gardens (code TEXT, name TEXT, owner TEXT, "
            "geom GEOMETRY(MultiPolygon, 4326));\n"
            + valores("INSERT INTO reserve_gardens", filas))


def aplicar_reserva():
    """Un jardín solo en su sección la marca reservable; varios, se vuelven subsecciones."""
    return """CREATE TEMP TABLE reserve_in_section AS
SELECT r.*, s.id AS section_id, COUNT(*) OVER (PARTITION BY s.id) AS gardens_in_section
  FROM reserve_gardens r
  JOIN zones s ON ST_Within(ST_PointOnSurface(r.geom), s.boundary)
 WHERE s.zone_type_item_id = """ + item("ZONE_TYPE", "SECTION") + """;

UPDATE zones z SET is_reservable = TRUE, reservation_owner_item_id = """ + _dueno("r.owner") + """
  FROM reserve_in_section r WHERE z.id = r.section_id AND r.gardens_in_section = 1;

INSERT INTO zones (code, name, parent_zone_id, zone_type_item_id, boundary, area_m2,
                   is_reservable, reservation_owner_item_id)
SELECT s.code || '-' || ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY r.code), r.name, s.id,
       """ + item("ZONE_TYPE", "SUBSECTION") + """, r.geom, ROUND(ST_Area(r.geom::geography)::numeric, 2),
       TRUE, """ + _dueno("r.owner") + """
  FROM reserve_in_section r JOIN zones s ON s.id = r.section_id
 WHERE r.gardens_in_section > 1;"""


def _dueno(columna):
    return (f"(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id "
            f"WHERE ct.code = 'RESERVATION_OWNER' AND ci.code = {columna})")


def supervision():
    """Las 4 zonas de supervisión, supervisadas por defecto por el coordinador."""
    filas = [f"({q('ZS-' + f['properties']['ZONA'][-1])}, "
             f"{q('Zona de supervisión ' + f['properties']['ZONA'][-1])}, "
             f"{multipoligono(f['geometry'])}, {f['properties']['Area']})"
             for f in leer_geojson("supervisoress.geojson")]
    return ("WITH supervisor AS (\n"
            "    SELECT u.id FROM users u JOIN catalog_items r ON r.id = u.role_item_id\n"
            "     WHERE u.is_active AND u.deleted_at IS NULL AND r.code IN ('COORDINADOR', 'ADMIN')\n"
            "     ORDER BY (r.code = 'COORDINADOR') DESC, u.id LIMIT 1\n)\n"
            "INSERT INTO supervision_zones (code, name, supervisor_user_id, boundary, area_m2)\n"
            "SELECT v.code, v.name, s.id, v.boundary, v.area FROM supervisor s, (VALUES\n    "
            + ",\n    ".join(filas) + "\n) AS v(code, name, boundary, area);")
