"""Escribe docs/dominio/datos/ejemplares.csv: los ejemplares tal como quedan en la base.

Sale de la misma lista que la migración de carga, en el mismo orden, así que el
código EV de cada fila es el que tiene el ejemplar en el sistema.
"""
import csv

from fuentes import DATOS

SALIDA = DATOS / "ejemplares.csv"

TIPOS = {
    "TREE": "Árbol", "SHRUB": "Arbusto", "GROUNDCOVER": "Cubresuelo", "POTTED_HERB": "Macetones (herbáceas)",
    "PALM": "Palmera", "HERB": "Planta herbácea", "SUCCULENT": "Planta suculenta", "HEDGE": "Seto (cerco vivo)",
    "CLIMBER": "Trepadora",
}

COLUMNAS = [
    "codigo", "referencia_catastro", "placa_antigua", "nombre_cientifico", "nombre_comun", "nombres_alternativos",
    "familia", "tipo_vegetacion", "tipo_elemento", "cantidad", "ubicacion_catastro", "latitud", "longitud",
    "origen_medidas", "altura_m", "altura_fuste_m", "dap_cm", "radio_copa_m", "zunchado", "foto", "observaciones",
]


def _fila(codigo, e, especie):
    m = e.medidas or {}
    return {
        "codigo": codigo,
        "referencia_catastro": e.referencia,
        "placa_antigua": e.codigo_antiguo or "",
        "nombre_cientifico": especie.cientifico,
        "nombre_comun": especie.comun,
        "nombres_alternativos": "|".join(especie.alternativos),
        "familia": especie.familia,
        "tipo_vegetacion": TIPOS[especie.tipo],
        "tipo_elemento": "Agrupación" if e.cantidad > 1 else "Ejemplar",
        "cantidad": e.cantidad,
        "ubicacion_catastro": e.ubicacion,
        "latitud": e.lat,
        "longitud": e.lon,
        # Sin medición no hay altura: «sin medir» dice la verdad (C-08).
        "origen_medidas": "Medido" if m else "Sin medir",
        "altura_m": m.get("altura", ""),
        "altura_fuste_m": m.get("fuste", ""),
        "dap_cm": m.get("dap", ""),
        "radio_copa_m": m.get("radio", ""),
        "zunchado": ("Sí" if m["zunchado"] else "No") if m else "",
        "foto": e.foto,
        "observaciones": " ".join(e.notas),
    }


def escribir(ejemplares, especies, codigo_de):
    """`codigo_de(i)` da el código EV del i-ésimo ejemplar (desde 1), el mismo de la carga."""
    por_nombre = {e.cientifico: e for e in especies}
    with open(SALIDA, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNAS)
        w.writeheader()
        for i, e in enumerate(ejemplares, start=1):
            w.writerow(_fila(codigo_de(i), e, por_nombre[e.especie]))
    return SALIDA
