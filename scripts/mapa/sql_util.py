"""Utilidades para escribir SQL de carga a partir de las fuentes del mapa."""
import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FUENTES = RAIZ / "docs/dominio/datos/fuentes-mapa"
DATOS = RAIZ / "docs/dominio/datos"


def q(texto):
    """Literal SQL; None o vacío se vuelven NULL."""
    if texto is None or texto == "":
        return "NULL"
    return "'" + str(texto).replace("'", "''") + "'"


def item(tipo, codigo):
    """Subconsulta al id de un ítem de catálogo por su tipo y código."""
    return (f"(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id "
            f"WHERE ct.code = '{tipo}' AND ci.code = '{codigo}')")


def multipoligono(geometria):
    """GeoJSON a MultiPolygon válido en WGS 84.

    ST_MakeValid corrige anillos del shapefile que se autointersecan; Force2D
    descarta la Z=0 del origen; Multi unifica polígono y multipolígono.
    """
    texto = json.dumps(geometria, separators=(",", ":"))
    return (f"ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D("
            f"ST_SetSRID(ST_GeomFromGeoJSON('{texto}'), 4326))), 3))")


def geometria(geometria_json):
    """GeoJSON de cualquier tipo, en WGS 84 y sin Z."""
    texto = json.dumps(geometria_json, separators=(",", ":"))
    return f"ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON('{texto}'), 4326))"


def punto(lat, lon):
    return f"ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)"


def slug(texto):
    """Código de catálogo: mayúsculas sin tildes, separadas por guion bajo."""
    ascii_ = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "_", ascii_.upper()).strip("_")[:50]


def leer_geojson(nombre):
    return json.loads((FUENTES / nombre).read_text(encoding="utf-8"))["features"]


def numero(texto):
    """Número con coma o punto decimal, como vienen los CSV del cliente."""
    return float(str(texto).strip().replace(",", "."))


def fallar(mensaje):
    """Fail fast: un dato que no se puede mapear detiene la generación."""
    sys.exit(f"ERROR: {mensaje}")


def valores(encabezado, filas):
    """Un INSERT con varias filas, legible en el diff."""
    return encabezado + " VALUES\n    " + ",\n    ".join(filas) + ";"
