"""Paso 3: empareja los edificios del plano con los de OpenStreetMap y arma la lista de casos.

Un edificio del plano (P) y uno de OSM (O) se relacionan si al menos la mitad de
cualquiera de los dos queda dentro del otro. Los grupos conectados por esas relaciones
dan el tipo de caso:

    1:1  coincide | desplazado | forma distinta
    1:N  el plano agrupa varios edificios de OSM (candidato a lugar combinado)
    N:1  OSM agrupa varios edificios del plano
    N:M  mixto
    0:1  solo en OSM: no está en el plano
    1:0  solo en el plano: nuevo

Escribe trabajo/emparejamiento.json y trabajo/casos.md.
"""
import json
import sys
from pathlib import Path

import numpy as np
import shapely
from shapely import affinity
from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).parent))
from alinear import PlanoLocal  # noqa: E402
from rutas import FUENTES, TRABAJO  # noqa: E402

UMBRAL = 0.5          # fracción de un edificio que debe quedar dentro del otro
IOU_COINCIDE = 0.75
DESPLAZAMIENTO_MIN = 2.0  # m
MEJORA_MIN = 0.10     # cuánto debe mejorar el IoU al centrar para llamarlo desplazado
ALTO_DIF = 3.0        # m de diferencia de altura (solo alturas medidas en OSM)

TIPOS = {
    'coincide': 'Coincide',
    'desplazado': 'Desplazado',
    'forma': 'Forma distinta',
    'plano_agrupa': 'El plano agrupa varios de OSM',
    'osm_agrupa': 'OSM agrupa varios del plano',
    'mixto': 'Mixto',
    'solo_osm': 'No está en el plano',
    'solo_plano': 'Solo en el plano',
}


def iou(a, b):
    union = a.union(b).area
    return a.intersection(b).area / union if union else 0.0


def main():
    t = np.load(TRABAJO / 'transformacion.npz')
    plano_local = PlanoLocal(float(t['lat0']), float(t['lon0']))
    unidades = list(np.load(TRABAJO / 'edificios_plano_local.npy', allow_pickle=True))
    for u in unidades:
        u['g'] = shapely.from_wkb(u['geom'])

    voc = json.loads((FUENTES / 'vocabulario-edificios.json').read_text(encoding='utf-8'))
    osm = []
    for f in json.load(open(FUENTES / 'edificios-osm.geojson', encoding='utf-8'))['features']:
        p = f['properties']
        anillos = [plano_local.a_metros(np.array(a)) for a in f['geometry']['coordinates']]
        termino = voc['vocabulario'].get(p['id'])
        nombre = termino['t'] if isinstance(termino, dict) else termino or p['n'] or None
        osm.append({'id': p['id'], 'nombre': nombre, 'campus': bool(p['c']),
                    'alto': None if p['e'] else p['h'], 'pisos': p.get('lv'),
                    'g': Polygon(anillos[0], anillos[1:]).buffer(0)})

    arbol = shapely.STRtree([o['g'] for o in osm])
    padre = {}

    def raiz(n):
        while padre.setdefault(n, n) != n:
            padre[n] = padre[padre[n]]
            n = padre[n]
        return n

    relaciones = []
    for i, u in enumerate(unidades):
        raiz(('P', i))
        for j in arbol.query(u['g'], predicate='intersects'):
            inter = u['g'].intersection(osm[j]['g']).area
            if inter >= UMBRAL * osm[j]['g'].area or inter >= UMBRAL * u['g'].area:
                relaciones.append((i, int(j), inter))
                padre[raiz(('P', i))] = raiz(('O', int(j)))
    relacionados_osm = {j for _, j, _ in relaciones}
    for j, o in enumerate(osm):
        if o['campus'] or j in relacionados_osm:
            raiz(('O', j))

    grupos = {}
    for nodo in list(padre):
        grupos.setdefault(raiz(nodo), []).append(nodo)

    casos = []
    for nodos in grupos.values():
        ps = sorted(i for k, i in nodos if k == 'P')
        os_ = sorted(j for k, j in nodos if k == 'O')
        gp = shapely.union_all([unidades[i]['g'] for i in ps]) if ps else None
        go = shapely.union_all([osm[j]['g'] for j in os_]) if os_ else None
        caso = {'plano': [unidades[i]['codigo'] for i in ps], 'osm': [osm[j]['id'] for j in os_],
                'nombres': [osm[j]['nombre'] for j in os_ if osm[j]['nombre']],
                'osm_fuera_del_campus': [osm[j]['id'] for j in os_ if not osm[j]['campus']],
                'area_plano': round(gp.area, 1) if gp else None, 'area_osm': round(go.area, 1) if go else None}
        if ps and os_:
            caso['iou'] = round(iou(gp, go), 3)
        if not os_:
            caso['tipo'] = 'solo_plano'
        elif not ps:
            caso['tipo'] = 'solo_osm'
        elif len(ps) == 1 and len(os_) == 1:
            dx, dy = go.centroid.x - gp.centroid.x, go.centroid.y - gp.centroid.y
            centrado = iou(affinity.translate(gp, dx, dy), go)
            caso['desplazamiento_m'] = round(float(np.hypot(dx, dy)), 2)
            caso['iou_centrado'] = round(centrado, 3)
            if caso['iou'] >= IOU_COINCIDE:
                caso['tipo'] = 'coincide'
            elif np.hypot(dx, dy) >= DESPLAZAMIENTO_MIN and centrado - caso['iou'] >= MEJORA_MIN and centrado >= 0.7:
                caso['tipo'] = 'desplazado'
            else:
                caso['tipo'] = 'forma'
        elif len(ps) == 1:
            caso['tipo'] = 'plano_agrupa'
        elif len(os_) == 1:
            caso['tipo'] = 'osm_agrupa'
        else:
            caso['tipo'] = 'mixto'
        if ps:
            altos = [unidades[i]['alto'] for i in ps if unidades[i]['alto'] > 0.5]
            caso['alto_plano'] = round(max(altos), 1) if altos else None
            caso['base_plano'] = round(min(unidades[i]['base'] for i in ps), 1)
        medidos = [osm[j]['alto'] for j in os_ if osm[j]['alto']]
        caso['alto_osm_medido'] = max(medidos) if medidos else None
        geom = gp if gp is not None else go
        caso['centro'] = [round(geom.centroid.x, 1), round(geom.centroid.y, 1)]
        caso['caja'] = [round(v, 1) for v in (gp.union(go) if gp is not None and go is not None else geom).bounds]
        casos.append(caso)

    orden = list(TIPOS)
    casos.sort(key=lambda c: (orden.index(c['tipo']), -(c['area_plano'] or c['area_osm'] or 0)))
    for n, c in enumerate(casos, 1):
        c['numero'] = n
    (TRABAJO / 'emparejamiento.json').write_text(json.dumps(casos, ensure_ascii=False, indent=1), encoding='utf-8')

    conteo = {k: sum(1 for c in casos if c['tipo'] == k) for k in TIPOS}
    print('casos por tipo:', conteo)
    print('edificios del plano en algún caso con OSM:', sum(len(c['plano']) for c in casos if c['osm']), 'de', len(unidades))
    print('edificios OSM del campus emparejados:', sum(1 for c in casos if c['plano'] for j in c['osm']
                                                     if j not in c['osm_fuera_del_campus']),
          'de', sum(1 for o in osm if o['campus']))
    escribir_informe(casos, conteo)


def nombres(c):
    return ', '.join(c['nombres']) if c['nombres'] else ', '.join(c['osm']) or '—'


def escribir_informe(casos, conteo):
    l = ['# Plano PUCP vs OpenStreetMap: casos', '',
         'Generado por `scripts/mapa/plano_pucp/emparejar.py`. Un edificio del plano y uno de OSM se relacionan '
         'si al menos la mitad de uno queda dentro del otro.', '',
         '| Tipo | Casos |', '|---|---|'] + [f'| {TIPOS[k]} | {n} |' for k, n in conteo.items()] + ['']

    def tabla(titulo, filas, cabecera):
        if not filas:
            return
        l.extend([f'## {titulo}', '', '| ' + ' | '.join(cabecera) + ' |', '|' + '---|' * len(cabecera)])
        l.extend('| ' + ' | '.join(str(x) for x in f) + ' |' for f in filas)
        l.append('')

    def m2(v):
        return f'{v:,.0f}'.replace(',', '.') if v else '—'

    tabla('No está en el plano (posible edificio inexistente)',
          [(c['numero'], nombres(c), ', '.join(c['osm']), m2(c['area_osm'])) for c in casos if c['tipo'] == 'solo_osm'],
          ['#', 'Nombre en Hesperides', 'OSM', 'Área m²'])
    tabla('Solo en el plano (posible edificio nuevo o que OSM no tiene)',
          [(c['numero'], ', '.join(c['plano']), m2(c['area_plano']), c['alto_plano'] or '—') for c in casos
           if c['tipo'] == 'solo_plano' and (c['area_plano'] or 0) >= 20],
          ['#', 'Código del plano', 'Área m²', 'Alto m'])
    tabla('Desplazados (misma forma, otra posición)',
          [(c['numero'], nombres(c), c['plano'][0], c['desplazamiento_m'], c['iou'], c['iou_centrado']) for c in casos
           if c['tipo'] == 'desplazado'],
          ['#', 'Nombre', 'Plano', 'Desplazamiento m', 'IoU', 'IoU centrado'])
    tabla('Forma distinta',
          [(c['numero'], nombres(c), c['plano'][0], m2(c['area_plano']), m2(c['area_osm']), c['iou']) for c in casos
           if c['tipo'] == 'forma'],
          ['#', 'Nombre', 'Plano', 'Área plano', 'Área OSM', 'IoU'])
    tabla('El plano agrupa varios edificios de OSM (candidatos a lugar combinado)',
          [(c['numero'], c['plano'][0], nombres(c), len(c['osm']), c['iou']) for c in casos if c['tipo'] == 'plano_agrupa'],
          ['#', 'Plano', 'Edificios de OSM', 'Cuántos', 'IoU'])
    tabla('OSM agrupa varios edificios del plano',
          [(c['numero'], nombres(c), ', '.join(c['plano']), c['iou']) for c in casos if c['tipo'] == 'osm_agrupa'],
          ['#', 'Edificio de OSM', 'Piezas del plano', 'IoU'])
    tabla('Mixtos',
          [(c['numero'], nombres(c), ', '.join(c['plano']), c['iou']) for c in casos if c['tipo'] == 'mixto'],
          ['#', 'Edificios de OSM', 'Edificios del plano', 'IoU'])
    tabla('Nivel de suelo: base bajo el suelo del modelo',
          [(c['numero'], nombres(c), ', '.join(c['plano']), c['base_plano']) for c in casos
           if c.get('base_plano') is not None and c['base_plano'] < -1],
          ['#', 'Nombre', 'Plano', 'Base m'])
    tabla('Alturas que difieren más de 3 m (solo alturas medidas en OSM)',
          [(c['numero'], nombres(c), c['alto_plano'], c['alto_osm_medido']) for c in casos
           if c.get('alto_plano') and c['alto_osm_medido'] and abs(c['alto_plano'] - c['alto_osm_medido']) > ALTO_DIF],
          ['#', 'Nombre', 'Alto plano m', 'Alto OSM m'])
    tabla('OSM los marca fuera del campus',
          [(c['numero'], nombres(c), ', '.join(c['plano']), ', '.join(c['osm_fuera_del_campus'])) for c in casos
           if c['osm_fuera_del_campus']],
          ['#', 'Nombre', 'Plano', 'OSM fuera del campus'])
    (TRABAJO / 'casos.md').write_text('\n'.join(l), encoding='utf-8')


if __name__ == '__main__':
    main()
