"""Genera la migración que agrupa los edificios del campus según el plano oficial (SPEC-108 §4).

Parte de las entradas del plano (las relaciones de Nicolás con los nombres y las excepciones de Jean Piero, D-01 a
D-05) y de la tabla de principales que escribe generar_modelo.py (trabajo/edificios_plano_principales.json): la
huella, el alto y la base de cada uno. Los edificios del mapa se buscan por su source_ref de V011, nunca por id.

La migración es generada y no se regenera una vez publicada: una corrección posterior va en una migración nueva,
solo con el cambio (SPEC-108 §5.2). Por eso se niega a escribir una versión o una descripción que ya existen.

Uso: python generar_migracion.py <versión>      por ejemplo: python generar_migracion.py 040
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parents[1]))  # sql_util, en scripts/mapa
from relaciones import cargar_excepciones, entradas, leer_equivalencias, nombres_v011  # noqa: E402
from rutas import EQUIVALENCIAS, FUENTES, MIGRACIONES, TRABAJO  # noqa: E402
from sql_util import fallar, multipoligono, q, valores  # noqa: E402

DESCRIPCION = 'group_buildings_by_plan'
MIGRACION = re.compile(r'^V(\d+)__(.+)\.sql$')

CABECERA = """\
-- Propiedad de SPEC-108. ARCHIVO GENERADO: no se edita a mano ni se regenera.
-- Lo produce scripts/mapa/plano_pucp/generar_migracion.py desde las relaciones del plano
-- (frontend/src/components/map3d/equivalence/: final-relations.json, codes.json y
-- building-references.json), scripts/mapa/plano_pucp/excepciones.json y la tabla de principales
-- de generar_modelo.py. Una corrección posterior va en una migración nueva, solo con el cambio.
--
-- Contornos de los edificios sin pieza del SKP: (c) colaboradores de OpenStreetMap (ODbL)."""

DDL = """\
ALTER TABLE campus_buildings
    ADD COLUMN parent_building_id BIGINT REFERENCES campus_buildings(id),
    ADD COLUMN plan_key           VARCHAR(64),
    ADD COLUMN base_m             NUMERIC(6, 2);
CREATE UNIQUE INDEX uq_campus_buildings_plan_key ON campus_buildings(plan_key) WHERE plan_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_campus_buildings_parent ON campus_buildings(parent_building_id);

CREATE TABLE campus_building_codes (
    id             BIGSERIAL PRIMARY KEY,
    building_id    BIGINT       NOT NULL REFERENCES campus_buildings(id),
    code           VARCHAR(10)  NOT NULL,
    official_label VARCHAR(300) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP
);
CREATE UNIQUE INDEX uq_campus_building_codes_code ON campus_building_codes(code) WHERE deleted_at IS NULL;"""


def _destino(version: str, carpeta: Path) -> Path:
    """La ruta de la migración nueva. Flyway lee la versión como número: V40 y V040 son la misma."""
    if not version.isdigit():
        fallar(f'la versión debe ser un número, como 040; se recibió «{version}»')
    for archivo in sorted(carpeta.glob('V*.sql')):
        m = MIGRACION.match(archivo.name)
        if m and (int(m[1]) == int(version) or m[2] == DESCRIPCION):
            fallar(f'ya existe {archivo.name}: una migración publicada no se sobrescribe ni se regenera')
    return carpeta / f'V{version}__{DESCRIPCION}.sql'


def _datos():
    """(entradas del plano, principales por plan_key, source_ref por id del mapa)."""
    relaciones, codigos, referencias = leer_equivalencias(EQUIVALENCIAS)
    osm = json.loads((FUENTES / 'edificios-osm.geojson').read_text(encoding='utf-8'))['features']
    v011 = next(MIGRACIONES.glob('V011__*.sql')).read_text(encoding='utf-8')
    excepciones = cargar_excepciones(Path(__file__).parent / 'excepciones.json')
    # nombres_v011 comprueba que V011 siga el orden de edificios-osm.geojson: el id i es su fila i
    lista = entradas(relaciones, codigos, referencias, nombres_v011(v011, osm), excepciones)
    referencia = {str(i + 1): f['properties']['id'] for i, f in enumerate(osm)}
    principales = json.loads((TRABAJO / 'edificios_plano_principales.json').read_text(encoding='utf-8'))
    return lista, {p['plan_key']: p for p in principales}, referencia


def _comprobar(lista, principales, referencia):
    claves = [e.plan_key for e in lista]
    if len(set(claves)) != len(claves) or set(claves) != set(principales):
        fallar('las entradas del plano no coinciden con edificios_plano_principales.json: '
               'vuelve a correr generar_modelo.py')
    ids = [i for e in lista for i in e.map_ids]
    if len(set(ids)) != len(ids) or not set(ids) <= set(referencia):
        fallar('un edificio del mapa está en dos relaciones o no está en V011')
    codigos = [c for e in lista for c, _ in e.codigos]
    if len(set(codigos)) != len(codigos):
        fallar('un código oficial está en dos relaciones')


def _numero(valor):
    return 'NULL' if valor is None else repr(round(float(valor), 2))


def _principal(plan_key):
    return f'(SELECT id FROM campus_buildings WHERE plan_key = {q(plan_key)})'


def _del_mapa(map_ids, referencia):
    return 'source_ref IN (' + ', '.join(q(referencia[i]) for i in map_ids) + ')'


def _categoria_comun(map_ids, referencia):
    """La categoría de los edificios del grupo si todos tienen la misma; si alguno difiere o no tiene, NULL."""
    return ('(SELECT CASE WHEN count(DISTINCT category_item_id) = 1 AND count(category_item_id) = count(*) '
            f'THEN min(category_item_id) END FROM campus_buildings WHERE {_del_mapa(map_ids, referencia)})')


def _reusados(reusados, principales, referencia):
    """Paso 2: el edificio del mapa de una relación de uno solo pasa a ser su principal."""
    sentencias = []
    for e in reusados:
        p = principales[e.plan_key]
        origen = ", source = 'PUCP'" if e.geometria == 'skp' else ''
        sentencias.append(
            f'UPDATE campus_buildings SET plan_key = {q(e.plan_key)}, name = {q(e.nombre)}, '
            f'footprint = {multipoligono(p["huella"])}, height_m = {_numero(p["alto_m"])}, '
            f'base_m = {_numero(p["base_m"])}{origen}, updated_at = CURRENT_TIMESTAMP\n'
            f' WHERE source_ref = {q(referencia[e.map_ids[0]])};')
    return (f'-- {len(reusados)} edificios del mapa pasan a ser el principal de su relación: plan_key, nombre '
            "(D-03),\n--    huella, altura y base del SKP; source = 'PUCP' si la geometría es del SKP.\n"
            + '\n'.join(sentencias))


def _nuevos(grupos, solo_skp, principales, referencia):
    """Paso 3: un principal nuevo por grupo y por relación que solo está en el SKP."""
    filas = []
    for e in grupos + solo_skp:
        p = principales[e.plan_key]
        origen = 'PUCP' if e.geometria == 'skp' else 'OSM'
        categoria = _categoria_comun(e.map_ids, referencia) if e.map_ids else 'NULL'
        filas.append(f'({q(origen)}, {q(e.plan_key)}, {q(e.nombre)}, {categoria}, TRUE, '
                     f'{multipoligono(p["huella"])}, {_numero(p["alto_m"])}, {_numero(p["base_m"])})')
    return (f'-- {len(filas)} edificios principales nuevos: {len(grupos)} grupos y {len(solo_skp)} que solo están en '
            'el SKP.\n--    Su categoría es la de sus edificios del mapa si todos coinciden; si no, queda nula.\n'
            + valores('INSERT INTO campus_buildings '
                      '(source, plan_key, name, category_item_id, is_campus, footprint, height_m, base_m)', filas))


def _hijos(grupos, agrupados, referencia):
    """Paso 4: los edificios del mapa de un grupo apuntan a su principal."""
    return (f'-- {agrupados} edificios del mapa apuntan a su principal con parent_building_id.\n' + '\n'.join(
        f'UPDATE campus_buildings SET parent_building_id = {_principal(e.plan_key)}, updated_at = CURRENT_TIMESTAMP\n'
        f' WHERE {_del_mapa(e.map_ids, referencia)};' for e in grupos))


def _codigos_y_alias(codigos, alias):
    """Paso 5: los códigos oficiales y los alias de building-references.json, colgados del principal."""
    return (f'-- {len(codigos)} códigos oficiales, y los alias de building-references.json en '
            'campus_building_aliases.\n'
            + valores('INSERT INTO campus_building_codes (building_id, code, official_label)',
                      [f'({_principal(k)}, {q(c)}, {q(etiqueta)})' for k, c, etiqueta in codigos]) + '\n\n'
            + valores('INSERT INTO campus_building_aliases (building_id, alias)',
                      [f'({_principal(k)}, {q(a)})' for k, a in alias]))


def _comprobacion(principales, agrupados, codigos):
    """Paso 6: si la base no quedó con las cifras esperadas, la migración aborta entera (SPEC-108 §5.2)."""
    esperado = f'{principales} principales, {agrupados} agrupados y {codigos} códigos'
    return f"""\
-- Al final, un DO comprueba {esperado}; si no cuadra, aborta.
DO $$
DECLARE
    principals INT;
    keyed      INT;
    grouped    INT;
    codes      INT;
BEGIN
    SELECT count(*) FILTER (WHERE is_campus AND parent_building_id IS NULL), count(plan_key), count(parent_building_id)
      INTO principals, keyed, grouped
      FROM campus_buildings WHERE deleted_at IS NULL;
    SELECT count(*) INTO codes FROM campus_building_codes WHERE deleted_at IS NULL;
    IF principals <> {principales} OR keyed <> {principales} OR grouped <> {agrupados} OR codes <> {codigos} THEN
        RAISE EXCEPTION 'SPEC-108: se esperaban {esperado}; hay % (% con plan_key), % y %',
            principals, keyed, grouped, codes;
    END IF;
END $$;"""


def migracion(lista, principales, referencia) -> str:
    """El texto de la migración, en el orden de SPEC-108 §4."""
    _comprobar(lista, principales, referencia)
    reusados = [e for e in lista if len(e.map_ids) == 1]
    grupos = [e for e in lista if len(e.map_ids) > 1]
    solo_skp = [e for e in lista if not e.map_ids]
    codigos = [(e.plan_key, c, etiqueta) for e in lista for c, etiqueta in e.codigos]
    alias = [(e.plan_key, a) for e in lista for a in e.alias]
    agrupados = sum(len(e.map_ids) for e in grupos)
    partes = [CABECERA, DDL,
              _reusados(reusados, principales, referencia),
              _nuevos(grupos, solo_skp, principales, referencia),
              _hijos(grupos, agrupados, referencia),
              _codigos_y_alias(codigos, alias),
              _comprobacion(len(lista), agrupados, len(codigos))]
    return '\n\n'.join(partes) + '\n'


def main(version: str, carpeta: Path = MIGRACIONES) -> Path:
    destino = _destino(version, carpeta)
    lista, principales, referencia = _datos()
    destino.write_text(migracion(lista, principales, referencia), encoding='utf-8')
    print(f'{destino}: {len(lista)} principales, {destino.stat().st_size / 1e3:.0f} kB')
    return destino


if __name__ == '__main__':
    if len(sys.argv) != 2:
        fallar('uso: python generar_migracion.py <versión>, por ejemplo 040')
    main(sys.argv[1])
