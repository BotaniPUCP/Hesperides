"""Genera V016__seed_measurements_2026_and_fountains.sql (SPEC-103 §4.5).

Las medidas y evaluaciones del Bosque Húmedo, la fecha de las mediciones de
2026 y los 67 bebederos. Uso, desde la raíz del repositorio:

    python scripts/catastro/generar_actualizacion_2026.py
"""
import csv
import json

from fuentes import DATOS, FUENTES, RAIZ

SALIDA = RAIZ / "backend/src/main/resources/db/migration/V016__seed_measurements_2026_and_fountains.sql"
BEBEDEROS = DATOS / "fuentes-mapa/bebederos"
# El cliente confirma que midió en 2026, sin día: se registra el primero de enero.
FECHA_MEDICION = "2026-01-01"
NOTA_BH = "Medida en «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente."
NOTA_EVALUACION = "Evaluación de «mediciones forestales - Bosque Húmedo». Fecha no registrada en la fuente."
ORIGEN = {"Introducida": "INTRODUCED"}

# Cada archivo agrupa por tipo o por estado. Cuando agrupa por estado, manda
# el archivo: su campo de estado contradice al archivo en dos casos y se anota.
ARCHIVOS = {
    "tipo-fuente.geojson": ("FOUNTAIN", None),
    "tipo-llenador-de-botella.geojson": ("BOTTLE_FILLER", None),
    "nuevo.geojson": ("UNKNOWN", "NEW"),
    "por-deterioro.geojson": ("UNKNOWN", "DETERIORATED"),
    "por-baja-del-equipo.geojson": ("UNKNOWN", "DECOMMISSIONED"),
}
ESTADO_DEL_CAMPO = {"operativo": "OPERATIONAL", "nuevo": "NEW", "remodelación": "REMODELING"}


def q(texto):
    return "NULL" if texto in (None, "") else "'" + str(texto).replace("'", "''") + "'"


def n(texto):
    return "NULL" if texto in (None, "") else str(float(texto))


def si_no(texto):
    return {"Sí": "TRUE", "Si": "TRUE", "No": "FALSE", "": "NULL"}[texto.strip()]


def item(tipo, codigo):
    return (f"(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id "
            f"WHERE ct.code = '{tipo}' AND ci.code = '{codigo}')")


def bosque_humedo():
    with open(FUENTES / "mediciones-bosque-humedo.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def sql_medidas(filas):
    partes = [f"""-- Las 76 palmeras medidas se cargaron sin fecha (V014).
UPDATE green_elements SET measured_at = '{FECHA_MEDICION}'
 WHERE data_source = 'MEASURED' AND measured_at IS NULL;
"""]
    for r in filas:
        if not r["altura_m"]:
            continue
        partes.append(f"""UPDATE green_elements SET height_m = {n(r['altura_m'])}, trunk_height_m = {n(r['altura_fuste_m'])},
       dbh_cm = {n(r['dap_cm'])}, crown_radius_m = {n(r['radio_copa_m'])}, data_source = 'MEASURED',
       measured_at = '{FECHA_MEDICION}', notes = {q(NOTA_BH)}
 WHERE source_reference = {q(r['foto'])} AND deleted_at IS NULL;""")
    return "\n".join(partes) + "\n"


def sql_evaluaciones(filas):
    valores = ",\n".join(
        f"    ({q(r['foto'])}, {si_no(r['enfermedades'])}, {si_no(r['plagas'])}, {si_no(r['danos_mecanicos'])}, "
        f"{si_no(r['inclinacion'])}, {si_no(r['ramas_secas'])}, {si_no(r['cavidades'])}, {si_no(r['raices_expuestas'])}, "
        f"{si_no(r['interferencia'])}, {q(r['manejo_recomendado'])}, {q(r['observacion'])})"
        for r in filas)
    return f"""INSERT INTO green_element_assessments (green_element_id, assessed_on, has_disease, has_pests,
    has_mechanical_damage, is_leaning, has_dead_branches, has_cavities_or_rot, has_exposed_roots,
    interferes_with_infrastructure, recommended_management, observation, notes)
SELECT e.id, DATE '{FECHA_MEDICION}', v.enf, v.pla, v.dan, v.inc, v.ram, v.cav, v.rai, v.inf, v.manejo, v.obs, {q(NOTA_EVALUACION)}
  FROM (VALUES
{valores}
) AS v(ref, enf, pla, dan, inc, ram, cav, rai, inf, manejo, obs)
  JOIN green_elements e ON e.source_reference = v.ref AND e.deleted_at IS NULL;

-- Una ceiba del archivo que no exista en la base es un error de la fuente, no
-- algo que se omita en silencio.
DO $$ BEGIN
    IF (SELECT count(*) FROM green_element_assessments) <> {len(filas)} THEN
        RAISE EXCEPTION 'Evaluaciones del Bosque Húmedo sin ejemplar en la base';
    END IF;
END $$;
"""


def sql_origen(filas):
    especies = {(r["nombre_cientifico"], r["origen"]) for r in filas if r["origen"]}
    return "".join(f"UPDATE species SET origin_item_id = {item('SPECIES_ORIGIN', ORIGEN[o])} "
                   f"WHERE scientific_name = {q(e)};\n" for e, o in sorted(especies))


def _bebedero(archivo, feature):
    tipo, estado_archivo = ARCHIVOS[archivo]
    p = feature["properties"]
    estado_campo = ESTADO_DEL_CAMPO.get((p.get("COL5BBF1_4") or "").strip())
    estado = estado_archivo or estado_campo
    atributos = {"tipo": tipo, "estado": estado, "sector": p.get("COL5BBF1_5")}
    if estado_archivo and estado_campo and estado_campo != estado_archivo:
        atributos["nota"] = f"La fuente lo agrupa como {estado_archivo} pero su campo dice «{p['COL5BBF1_4']}»."
    lon, lat = feature["geometry"]["coordinates"][:2]
    return (f"    ({q(p['Name'])}, {q(p.get('COL5BBF1_3'))}, ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326), "
            f"{q(json.dumps({k: v for k, v in atributos.items() if v}, ensure_ascii=False))}::jsonb)")


def sql_bebederos():
    filas = [_bebedero(a, f) for a in ARCHIVOS
             for f in json.loads((BEBEDEROS / a).read_text(encoding="utf-8"))["features"]]
    return f"""INSERT INTO campus_features (code, feature_type_item_id, name, geom, attributes)
SELECT v.code, {item('FEATURE_TYPE', 'DRINKING_FOUNTAIN')}, v.name, v.geom, v.attrs
  FROM (VALUES
{",\n".join(filas)}
) AS v(code, name, geom, attrs);
""", len(filas)


def main():
    filas = bosque_humedo()
    bebederos, total = sql_bebederos()
    partes = [
        "-- Propiedad de SPEC-103 §4.5. ARCHIVO GENERADO: no se edita a mano.\n"
        "-- Lo produce scripts/catastro/generar_actualizacion_2026.py desde docs/dominio/datos/.\n",
        "-- Medidas de 2026\n" + sql_medidas(filas),
        "-- Evaluaciones del Bosque Húmedo\n" + sql_evaluaciones(filas),
        "-- Procedencia de las especies\n" + sql_origen(filas),
        "-- Bebederos\n" + bebederos,
    ]
    SALIDA.write_text("\n".join(partes), encoding="utf-8")
    print(f"Escrito {SALIDA.relative_to(RAIZ)}: {sum(1 for r in filas if r['altura_m'])} medidas, "
          f"{len(filas)} evaluaciones, {total} bebederos")


if __name__ == "__main__":
    main()
