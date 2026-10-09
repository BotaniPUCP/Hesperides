"""Escribe docs/dominio/datos/ejemplares.csv: los ejemplares tal como quedan en la base.

Sale de la misma lista que la migración de carga, en el mismo orden, así que el
código EV de cada fila es el que tiene el ejemplar en el sistema. Usa el
estándar de carga de SPEC-103 §6.2: el archivo se puede corregir y volver a cargar.
"""
import csv

from fuentes import DATOS, FUENTES

SALIDA = DATOS / "ejemplares.csv"
# La fecha de las mediciones de 2026 (SPEC-103 §2.0): la fuente no la registra.
FECHA_2026 = "2026-01-01"

TIPOS = {
    "TREE": "Árbol", "SHRUB": "Arbusto", "GROUNDCOVER": "Cubresuelo", "POTTED_HERB": "Macetones (herbáceas)",
    "PALM": "Palmera", "HERB": "Planta herbácea", "SUCCULENT": "Planta suculenta", "HEDGE": "Seto (cerco vivo)",
    "CLIMBER": "Trepadora",
}

# Columnas del estándar, en su orden. Las informativas se exportan y se ignoran al cargar.
COLUMNAS = [
    "codigo", "nombre_cientifico", "latitud", "longitud", "cantidad", "referencia_catastro", "placa_antigua",
    "ubicacion_catastro", "fecha_medicion", "altura_m", "altura_fuste_m", "dap_cm", "radio_copa_m", "zunchado",
    "fecha_evaluacion", "enfermedades", "plagas", "danos_mecanicos", "inclinacion", "ramas_secas", "cavidades",
    "raices_expuestas", "interferencia", "manejo_recomendado", "observacion_evaluacion", "foto", "observaciones",
    "nombre_comun", "nombres_alternativos", "familia", "tipo_vegetacion", "tipo_elemento", "origen_medidas",
]
SI_NO = {"Sí": "si", "Si": "si", "No": "no", "": ""}


def bosque_humedo():
    """Referencia (BH1…) -> fila de la hoja «Bosque Húmedo»."""
    with open(FUENTES / "mediciones-bosque-humedo.csv", encoding="utf-8") as f:
        return {r["foto"].lower(): r for r in csv.DictReader(f)}


def _medidas(e, bh):
    if e.medidas:
        m = e.medidas
        return {"fecha_medicion": FECHA_2026, "altura_m": m["altura"], "altura_fuste_m": m["fuste"] or "",
                "dap_cm": m["dap"], "radio_copa_m": m["radio"], "zunchado": "si" if m["zunchado"] else "no"}
    if bh and bh["altura_m"]:
        return {"fecha_medicion": FECHA_2026, "altura_m": bh["altura_m"], "altura_fuste_m": bh["altura_fuste_m"],
                "dap_cm": bh["dap_cm"], "radio_copa_m": bh["radio_copa_m"], "zunchado": SI_NO[bh["zunchado"]]}
    return {}


def _evaluacion(bh):
    if not bh:
        return {}
    return {"fecha_evaluacion": FECHA_2026, "enfermedades": SI_NO[bh["enfermedades"]], "plagas": SI_NO[bh["plagas"]],
            "danos_mecanicos": SI_NO[bh["danos_mecanicos"]], "inclinacion": SI_NO[bh["inclinacion"]],
            "ramas_secas": SI_NO[bh["ramas_secas"]], "cavidades": SI_NO[bh["cavidades"]],
            "raices_expuestas": SI_NO[bh["raices_expuestas"]], "interferencia": SI_NO[bh["interferencia"]],
            "manejo_recomendado": bh["manejo_recomendado"], "observacion_evaluacion": bh["observacion"]}


def _fila(codigo, e, especie, bh):
    medidas = _medidas(e, bh)
    fila = {
        "codigo": codigo, "nombre_cientifico": especie.cientifico, "latitud": e.lat, "longitud": e.lon,
        "cantidad": e.cantidad, "referencia_catastro": e.referencia, "placa_antigua": e.codigo_antiguo or "",
        "ubicacion_catastro": e.ubicacion, "foto": e.foto, "observaciones": " ".join(e.notas),
        "nombre_comun": especie.comun, "nombres_alternativos": "|".join(especie.alternativos),
        "familia": especie.familia, "tipo_vegetacion": TIPOS[especie.tipo],
        "tipo_elemento": "Agrupación" if e.cantidad > 1 else "Ejemplar",
        # Sin medición no hay altura: «sin medir» dice la verdad (C-08).
        "origen_medidas": "Medido" if medidas else "Sin medir",
    }
    return {**fila, **medidas, **_evaluacion(bh)}


def escribir(ejemplares, especies, codigo_de):
    """`codigo_de(i)` da el código EV del i-ésimo ejemplar (desde 1), el mismo de la carga."""
    por_nombre = {e.cientifico: e for e in especies}
    bh = bosque_humedo()
    with open(SALIDA, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNAS, delimiter=";", restval="")
        w.writeheader()
        for i, e in enumerate(ejemplares, start=1):
            w.writerow(_fila(codigo_de(i), e, por_nombre[e.especie], bh.get(e.referencia.lower())))
    return SALIDA
