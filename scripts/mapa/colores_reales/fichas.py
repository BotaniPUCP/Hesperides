"""Genera las fichas de apariencia (SPEC-109) desde la forma compacta de fichas.json y los tramos de tramos.json.

Uso, desde la raíz del repositorio: python scripts/mapa/colores_reales/fichas.py

fichas.json, por edificio:
  {"slug": {"planKey", "name", "folder", "notes", "roof", "wall", "faces": {...}, "zones": [opcional]}}
Una cara es el id de un tramo (se repite), {"tile", "once", "start", "beyond"} (una vez desde `once` metros
del centro, con otro tramo fuera), {"sameAs": cara} o {"pattern": {...}} (un patrón de SPEC-109 tal cual).
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent
LOOKS = AQUI.parents[2] / 'frontend/src/components/map3d/realLook/looks'


def tramo(tramos, clave, wall):
    t = tramos[clave]
    return {'kind': 'photo', 'wall': wall, 'photo': {'tile': clave, 'widthM': t['anchoM'], 'heightM': t['altoM']}}


def cara(regla, tramos, wall):
    if isinstance(regla, str):
        return tramo(tramos, regla, wall)
    if 'sameAs' in regla:
        return regla
    if 'pattern' in regla:
        return regla['pattern']
    c = tramo(tramos, regla['tile'], wall)
    if 'once' in regla:
        c['offsetM'] = regla['once']
        c['photo']['repeat'] = False
        if 'beyond' in regla:
            c['photo']['beyond'] = tramo(tramos, regla['beyond'], wall)
    if 'start' in regla:
        c['startM'] = regla['start']
    return c


def zona(z, tramos, base):
    wall = z.get('wall', base['wall'])
    out = {'id': z['id']}
    if 'where' in z:
        out['where'] = z['where']
    out['roof'] = z.get('roof', base['roof'])
    out['faces'] = {k: cara(v, tramos, wall) for k, v in z['faces'].items()}
    return out


def tramos_usados(faces):
    for v in faces.values():
        if isinstance(v, str):
            yield v
        elif 'tile' in v:
            yield v['tile']
            if 'beyond' in v:
                yield v['beyond']


def ficha(f, tramos):
    zonas = [zona({'id': 'edificio', **f}, tramos, f)] + [zona(z, tramos, f) for z in f.get('zones', [])]
    usados = {t for z in [f] + f.get('zones', []) for t in tramos_usados(z['faces'])}
    fotos = sorted({Path(tramos[t]['foto']).name for t in usados}) or f.get('photos', [])
    return {'planKey': f['planKey'], 'name': f['name'], 'folder': f['folder'], 'photos': fotos, 'notes': f['notes'], 'zones': zonas}


def main():
    tramos = json.loads((AQUI / 'tramos.json').read_text(encoding='utf-8'))
    fichas = json.loads((AQUI / 'fichas.json').read_text(encoding='utf-8'))
    for viejo in LOOKS.glob('*.json'):
        if viejo.name != 'atlas.json':
            viejo.unlink()
    for slug, f in fichas.items():
        (LOOKS / f'{slug}.json').write_text(json.dumps(ficha(f, tramos), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    nombres = sorted(fichas)
    ident = {s: ''.join(p.capitalize() if i else p for i, p in enumerate(s.replace('_', '-').split('-'))) for s in nombres}
    imports = '\n'.join(f"import {ident[s]} from './{s}.json';" for s in nombres)
    lista = ',\n  '.join(ident[s] for s in nombres)
    (LOOKS / 'index.ts').write_text(f"""import type {{ BuildingLook, PhotoAtlas }} from '../types';
import atlas from './atlas.json';
{imports}

/**
 * Las fichas de los edificios fotografiados (SPEC-109). ARCHIVO GENERADO por
 * scripts/mapa/colores_reales/fichas.py desde fichas.json: no se edita a mano.
 * `validateLooks` las revisa al cargar y detiene el visor si una está mal escrita.
 */
const files: unknown[] = [
  {lista},
];

export const BUILDING_LOOKS = files as BuildingLook[];

/** Los tramos de foto enderezados (los genera `scripts/mapa/colores_reales/enderezar.py`). */
export const PHOTO_ATLAS = atlas as unknown as PhotoAtlas;
export const PHOTO_ATLAS_URL = '/models/real-look/atlas.jpg';
""", encoding='utf-8')
    print(f'{len(fichas)} fichas')


if __name__ == '__main__':
    sys.exit(main())
