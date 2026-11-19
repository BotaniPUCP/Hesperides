"""Prepara trabajo/datos.json para la página de comparación plano PUCP vs mapa actual.

Todo en metros de un plano local (x este, y norte) centrado en el campus; el plano ya
ubicado con la transformación de alinear_edificios.py. Requiere haber corrido
separar_edificios.py y emparejar.py.
"""
import json
import sys
from pathlib import Path

import numpy as np
import shapely

sys.path.insert(0, str(Path(__file__).parent))
from alinear import FUENTES, PlanoLocal  # noqa: E402
from rutas import TRABAJO  # noqa: E402

SUELO = 91.44
T = np.load(TRABAJO / 'transformacion.npz')
R, TR = T['r'], T['tr']
PLANO = PlanoLocal(float(T['lat0']), float(T['lon0']))
LINEAS = np.load(TRABAJO / 'lineas.npz')


def horizontales(capa, zmin=-1e9, zmax=1e9):
    l = LINEAS[capa]
    return l[(np.abs(l[:, 2] - l[:, 5]) < 0.01) & (l[:, 2] >= zmin) & (l[:, 2] <= zmax)]


def seg2d(lineas):
    """Segmentos 2D ubicados, sin los de largo cero ni duplicados (techo y base se proyectan igual)."""
    s = np.column_stack([lineas[:, [0, 1]] @ R.T + TR, lineas[:, [3, 4]] @ R.T + TR])
    s = s[np.hypot(s[:, 2] - s[:, 0], s[:, 3] - s[:, 1]) > 0.05]
    a, b = np.round(s[:, :2], 1), np.round(s[:, 2:], 1)
    swap = (a[:, 0] > b[:, 0]) | ((a[:, 0] == b[:, 0]) & (a[:, 1] > b[:, 1]))
    return np.unique(np.column_stack([np.where(swap[:, None], b, a), np.where(swap[:, None], a, b)]), axis=0)


def main():
    plano = {  # capas de líneas de contexto; los edificios van como polígonos (edificios_plano)
        'muro': seg2d(LINEAS['L5_Muro_Limite']),
        'huacas': seg2d(horizontales('L6_Huacas')),
        'jardineria': seg2d(LINEAS['L2_Suelo_Jardinería']),
        'capa0': seg2d(horizontales('0')),
    }
    casos = json.loads((TRABAJO / 'emparejamiento.json').read_text(encoding='utf-8'))
    caso_de = {}
    for c in casos:
        for codigo in c['plano']:
            caso_de[('P', codigo)] = c['numero']
        for osm_id in c['osm']:
            caso_de[('O', osm_id)] = c['numero']

    voc = json.loads((FUENTES / 'vocabulario-edificios.json').read_text(encoding='utf-8'))
    osm = []
    for f in json.load(open(FUENTES / 'edificios-osm.geojson', encoding='utf-8'))['features']:
        p = f['properties']
        termino = voc['vocabulario'].get(p['id'])
        osm.append({
            'id': p['id'], 'nombre': termino['t'] if isinstance(termino, dict) else termino or p['n'] or None,
            'campus': bool(p['c']), 'alto_osm': p['h'], 'alto_osm_estimado': bool(p['e']),
            'pisos': int(p['lv']) if str(p.get('lv', '')).isdigit() else None,
            'anillos': [np.round(PLANO.a_metros(np.array(a)), 1).tolist() for a in f['geometry']['coordinates']],
            'caso': caso_de.get(('O', p['id']))})

    unidades = []
    for u in np.load(TRABAJO / 'edificios_plano_local.npy', allow_pickle=True):
        g = shapely.from_wkb(u['geom'])
        unidades.append({
            'codigo': u['codigo'], 'tipo': 'edificio' if u['capa'].startswith('L3') else 'caseta',
            'anillos': [np.round(np.array(r.coords)[:, :2], 1).tolist()
                        for parte in shapely.get_parts(g) for r in [parte.exterior, *parte.interiors]],
            'area': round(u['area'], 1), 'alto': round(u['alto'], 1) if u['alto'] > 0.5 else None,
            'base': round(u['base'], 1), 'patios': u['patios'], 'piezas': u['piezas'],
            'caso': caso_de.get(('P', u['codigo']))})

    limite = next(f for f in json.load(open(FUENTES / 'perimetro-y-veredas.geojson', encoding='utf-8'))['features']
                  if f['properties']['layer'] == 'limite_campus')['geometry']
    poligonos = limite['coordinates'] if limite['type'] == 'MultiPolygon' else [limite['coordinates']]

    datos = {
        'alineacion': json.loads((TRABAJO / 'alineacion.json').read_text(encoding='utf-8')),
        'plano': {k: np.round(v, 1).ravel().tolist() for k, v in plano.items()},
        'casos': casos,
        'edificios_plano': unidades,
        'osm': osm,
        'limite': [np.round(PLANO.a_metros(np.array(p[0])), 1).tolist() for p in poligonos],
    }
    texto = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
    (TRABAJO / 'datos.json').write_text(texto, encoding='utf-8')
    print(f'datos.json: {len(texto) / 1e6:.2f} MB | casos {len(casos)} | plano {len(unidades)} | osm {len(osm)}')


if __name__ == '__main__':
    main()
