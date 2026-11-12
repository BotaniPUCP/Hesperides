"""Entradas del plano: una por relación de edificio, con nombre y geometría resueltos.

Porta `unifiedEntries` de frontend/src/components/map3d/equivalence/unification.ts.
Las excepciones (de Jean Piero) viven en excepciones.json: nada fijado aquí.
"""
import json
import re
from dataclasses import dataclass, replace
from pathlib import Path

ORIGEN_REFERENCIAS = 'Corrección de building-references.json'
ORIGEN_FIJO = 'Fijado en unification.ts'
ORIGEN_RELACION = 'Escrito en la relación'
ORIGEN_BD = 'Nombre del mapa actual'
ORIGEN_CODIGO = 'Etiqueta oficial del código'


@dataclass(frozen=True)
class Entrada:
    plan_key: str
    nombre: str
    origen_nombre: str
    codigos: tuple  # (código, etiqueta oficial)
    map_ids: tuple  # ids de la base, en el orden de V011
    piezas: tuple
    alias: tuple
    geometria: str  # 'skp', 'mapa' o 'adaptada'


def leer_equivalencias(carpeta: Path):
    """Devuelve (relaciones, códigos, referencias)."""
    def leer(nombre):
        return json.loads((carpeta / nombre).read_text(encoding='utf-8'))
    return leer('final-relations.json')['relations'], leer('codes.json'), leer('building-references.json')


def nombres_v011(sql: str, osm: list) -> dict:
    """Nombre de cada edificio por id (1, 2, … en el orden de V011)."""
    filas = re.findall(r"^\s+\('OSM', '([^']+)', (NULL|'(?:[^']|'')*')", sql, re.M)
    if [f[0] for f in filas] != [f['properties']['id'] for f in osm]:
        raise ValueError('El orden de V011 no coincide con edificios-osm.geojson')
    return {str(i + 1): (n[1:-1].replace("''", "'") if n != 'NULL' else None) for i, (_, n) in enumerate(filas)}


def cargar_excepciones(ruta: Path) -> dict:
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def _asignados(r):
    return r.get('codes') or ([r['code']] if r.get('code') else [])


def entradas(relaciones, codigos, referencias, nombre_bd, excepciones):
    etiqueta = {c['code']: c['label'] for c in codigos}
    fijos = excepciones['nombres_fijos']
    retirados = set(excepciones['retirados'])
    salida = []
    for r in relaciones:
        asignados = _asignados(r)
        if set(asignados) & retirados:
            continue
        heredado = ' / '.join(dict.fromkeys(
            nombre_bd[i].strip() for i in sorted(r['mapIds'], key=int) if nombre_bd.get(i) and nombre_bd[i].strip()))
        meta = [referencias[c] for c in asignados if c in referencias]
        propio = next((m['name'] for m in meta if m.get('name')), None)
        por_codigo = ' / '.join(c['label'] for c in codigos if c['code'] in asignados)
        fijo = next((fijos[f'codigo:{c}'] for c in asignados if f'codigo:{c}' in fijos), None) \
            or next((fijos[f'mapa:{i}'] for i in r['mapIds'] if f'mapa:{i}' in fijos), None)
        if propio:
            nombre, origen = propio, ORIGEN_REFERENCIAS
        elif fijo:
            nombre, origen = fijo, ORIGEN_FIJO
        elif (r.get('name') or '').strip():
            nombre, origen = r['name'].strip(), ORIGEN_RELACION
        elif heredado:
            nombre, origen = heredado, ORIGEN_BD
        elif por_codigo:
            nombre, origen = por_codigo, ORIGEN_CODIGO
        else:
            nombre, origen = 'Sin nombre', '—'
        if r['id'] == excepciones['caseta']:
            geometria = 'adaptada'
        elif r['id'] == excepciones['izquierda'] or not r['skpIds']:
            geometria = 'mapa'
        else:
            geometria = 'skp'
        salida.append(Entrada(
            plan_key=r['id'], nombre=nombre, origen_nombre=origen,
            codigos=tuple((c, etiqueta.get(c, '—')) for c in asignados),
            map_ids=tuple(r['mapIds']), piezas=tuple(r['skpIds']),
            alias=tuple(dict.fromkeys(a for m in meta for a in m['aliases'])), geometria=geometria))
    sep = excepciones['separada']
    for i, padre in enumerate(salida):
        if any(c == sep['de_codigo'] for c, _ in padre.codigos) and all(p in padre.piezas for p in sep['piezas']):
            salida[i] = replace(padre, piezas=tuple(p for p in padre.piezas if p not in sep['piezas']))
            salida.append(Entrada(plan_key=sep['plan_key'], nombre=sep['nombre'], origen_nombre=ORIGEN_FIJO, codigos=(),
                                  map_ids=(), piezas=tuple(sep['piezas']), alias=tuple(sep['alias']), geometria='skp'))
            break
    return salida


def piezas_sin_relacion(relaciones, todas, excepciones):
    """Piezas del SKP que ninguna relación usa; las de las relaciones retiradas cuentan como usadas."""
    usadas = {p for r in relaciones for p in r['skpIds']}
    return [p for p in todas if p not in usadas]
