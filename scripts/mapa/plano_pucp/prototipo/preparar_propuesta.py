"""Datos de la página de comparación: el mapa actual frente a la propuesta.

La propuesta replica /mapa/unificado de la rama 3d-test/relaciones-edificios-skp-completo: relaciones de
Nicolás (final-relations.json), nombres y excepciones de Jean Piero (unification.ts), piezas del SKP
(campus.glb). El mapa actual es lo que carga V011: edificios de OSM con el nombre del vocabulario y las capas
del suelo. Todo en metros locales (x este, y norte) del plano tangente de scripts/mapa/plano_pucp.
"""
import base64
import gzip
import json
import math
import pickle
import re
import sys
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import shape

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from alinear import PlanoLocal  # noqa: E402
from glb import leer  # noqa: E402
from rutas import FUENTES, RAIZ, TRABAJO  # noqa: E402

AQUI = Path(__file__).parent
RAMA = Path(__file__).resolve().parents[4] / 'frontend'
EQ = RAMA / 'src/components/map3d/equivalence'
PASO = 0.02
KIOSK, LEFT_ONLY, TEMPLATE = 'b9a4a553-9c25-45f2-b2fc-43592ab2b917', '249a8c11-620a-48d6-98aa-df74d1f90f69', 'C-3446'
pl = PlanoLocal(-12.06959406186667, -77.08018609824998)
T = np.load(TRABAJO / 'transformacion.npz')
R, TR = T['r'], T['tr']

rel = json.loads((EQ / 'final-relations.json').read_text(encoding='utf-8'))['relations']
lista_codigos = json.loads((EQ / 'codes.json').read_text(encoding='utf-8'))
etiqueta = {c['code']: c['label'] for c in lista_codigos}
referencias = json.loads((EQ / 'building-references.json').read_text(encoding='utf-8'))
osm = json.loads((FUENTES / 'edificios-osm.geojson').read_text(encoding='utf-8'))['features']
sql = (RAIZ / 'backend/src/main/resources/db/migration/V011__seed_map_data.sql').read_text(encoding='utf-8')
filas = re.findall(r"^\s+\('OSM', '([^']+)', (NULL|'(?:[^']|'')*')", sql, re.M)
assert [f[0] for f in filas] == [f['properties']['id'] for f in osm]
nombre_bd = {str(i + 1): (n[1:-1].replace("''", "'") if n != 'NULL' else None) for i, (_, n) in enumerate(filas)}
piezas_info = pickle.load(open(AQUI / 'piezas.pkl', 'rb'))


def local(geom):
    return shapely.transform(geom, lambda c: pl.a_metros(c))


def anillos(geom, simplificar=0.0):
    """Polígonos como listas de anillos planos [x0, y0, x1, y1, …] en unidades de 5 cm."""
    if simplificar:
        geom = geom.simplify(simplificar)
    salida = []
    for p in getattr(geom, 'geoms', [geom]):
        if p.geom_type != 'Polygon' or p.area < 0.05:
            continue
        rings = []
        for r in [p.exterior, *p.interiors]:
            xy = np.round(np.asarray(r.coords)[:-1] * 20).astype(int)
            if len(xy) >= 3:
                rings.append(xy.ravel().tolist())
        if rings:
            salida.append(rings)
    return salida


edif = {str(i + 1): {'geom': local(shape(f['geometry'])).buffer(0), 'alto': f['properties']['h'],
                     'estimada': f['properties'].get('e') == 1, 'campus': bool(f['properties']['c']),
                     'ref': f['properties']['id']} for i, f in enumerate(osm)}

# ---------- Piezas del SKP en metros locales ----------
piezas = {}
for m in leer(RAMA / 'public/models/equivalence/campus.glb'):
    tri = m['tri'].copy()
    tri[:, :, 0] += 350
    tri[:, :, 1] += 350
    tri[:, :, 2] += 91.4397 - 91.44
    tri[:, :, :2] = (tri[:, :, :2].reshape(-1, 2) @ R.T + TR).reshape(-1, 3, 2)
    piezas[m['nombre']] = tri


def marco_horizontal(p):
    """horizontalFrame de unificationGeometry.ts sobre puntos (x, z) del visor."""
    unicos = sorted({(round(x, 5), round(z, 5)): (x, z) for x, z in p}.values())
    cruz = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    def mitad(lista):
        h = []
        for q in lista:
            while len(h) > 1 and cruz(h[-2], h[-1], q) <= 0:
                h.pop()
            h.append(q)
        return h[:-1]
    casco = mitad(unicos) + mitad(unicos[::-1])
    mejor = {'area': math.inf}
    for i, a in enumerate(casco):
        b = casco[(i + 1) % len(casco)]
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        c, s = math.cos(ang), math.sin(ang)
        u = c * p[:, 0] + s * p[:, 1]
        v = -s * p[:, 0] + c * p[:, 1]
        area = (u.max() - u.min()) * (v.max() - v.min())
        if area < mejor['area'] - 1e-6:
            mejor = {'ang': ang, 'u0': u.min(), 'u1': u.max(), 'v0': v.min(), 'v1': v.max(), 'area': area}
    if mejor['u1'] - mejor['u0'] < mejor['v1'] - mejor['v0']:
        mejor = {'ang': mejor['ang'] + math.pi / 2, 'u0': mejor['v0'], 'u1': mejor['v1'], 'v0': -mejor['u1'], 'v1': -mejor['u0'], 'area': mejor['area']}
    return mejor


def adaptar_caseta(tri, destino, alto):
    """adaptKiosk: la forma de la plantilla, en el rectángulo y la orientación del edificio del mapa."""
    p = tri.reshape(-1, 3)
    vis = np.column_stack([p[:, 0], -p[:, 1]])          # (x, z) del visor
    meta = np.asarray(destino.exterior.coords)[:-1]
    de, a = marco_horizontal(vis), marco_horizontal(np.column_stack([meta[:, 0], -meta[:, 1]]))
    c, s, tc, ts = math.cos(de['ang']), math.sin(de['ang']), math.cos(a['ang']), math.sin(a['ang'])
    u = a['u0'] + (c * vis[:, 0] + s * vis[:, 1] - de['u0']) / (de['u1'] - de['u0']) * (a['u1'] - a['u0'])
    v = a['v0'] + (-s * vis[:, 0] + c * vis[:, 1] - de['v0']) / (de['v1'] - de['v0']) * (a['v1'] - a['v0'])
    x, z = tc * u - ts * v, ts * u + tc * v
    h = (p[:, 2] - p[:, 2].min()) / (p[:, 2].max() - p[:, 2].min()) * alto
    return np.column_stack([x, -z, h]).reshape(-1, 3, 3)


def poligonos_xy(t):
    a = np.abs((t[:, 1, 0] - t[:, 0, 0]) * (t[:, 2, 1] - t[:, 0, 1]) - (t[:, 1, 1] - t[:, 0, 1]) * (t[:, 2, 0] - t[:, 0, 0])) / 2
    t = t[a > 1e-3]
    return shapely.union_all(shapely.polygons(np.concatenate([t[:, :, :2], t[:, :1, :2]], axis=1))).buffer(0) if len(t) else shapely.Polygon()


def ahuecar(tri, map_ids):
    """Vacía los patios: el SKP modela losas enteras (y el piso al ras) que cruzan los patios.

    1. Patios: los huecos de las huellas de OSM relacionadas, ajustados a los muros del propio SKP
       (celdas que forman los muros en planta). Dentro se recortan todas las caras horizontales.
    2. Todas las caras horizontales al ras del suelo (|z| < 0,6 m): el piso del edificio, de un patio o de un
       pórtico. Quedan a la altura del zócalo o del césped y parpadean contra ellos (z-fighting); el suelo del
       mapa ya dibuja ese nivel.
    Devuelve los triángulos y los m² quitados.
    """
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    horiz = np.abs(n[:, 2]) > 0.95
    z = tri[:, :, 2].mean(axis=1)
    huecos = [shapely.Polygon(r) for i in map_ids for p in getattr(edif[i]['geom'], 'geoms', [edif[i]['geom']])
              for r in p.interiors if shapely.Polygon(r).area > 20]
    patio = shapely.Polygon()
    if huecos:
        vert = tri[(np.abs(n[:, 2]) < 0.2) & (np.ptp(tri[:, :, 2], axis=1) > 0.5)]
        lineas = []
        for t in vert:
            d = ((t[:, None, :2] - t[None, :, :2]) ** 2).sum(-1)
            a, b = np.unravel_index(d.argmax(), d.shape)
            if d[a, b] > 0.01:
                lineas.append(shapely.LineString([t[a, :2], t[b, :2]]))
        muros = shapely.union_all(lineas).buffer(0.15) if lineas else shapely.Polygon()
        partes = []
        for h in huecos:
            # El patio del SKP: lo que queda libre de muros alrededor del patio de OSM (hasta 1,5 m más allá),
            # quedándose con las zonas que caen sobre todo dentro del patio. Así no se come un ala del edificio.
            zona = h.buffer(1.5).difference(muros)
            elegidas = [c for c in shapely.get_parts(zona) if c.area > 4 and c.intersection(h).area > 0.6 * c.area]
            partes.append(shapely.union_all(elegidas) if elegidas else h.buffer(-0.3))
        patio = shapely.union_all(partes)
        DEPURA.append((round(sum(h.area for h in huecos)), round(patio.area)))
    # Suelo: lo que está entero al ras (pisos, sardineles, gradas) y, dentro de un desnivel al aire libre,
    # todo lo que queda bajo el nivel del suelo (pisos, rampas, gradas y muros de contención). Se dibuja con el
    # material del suelo; si el fondo del plano ya lo cubre, se descarta para no duplicarlo.
    c = tri[:, :, :2].mean(axis=1)
    zmax, zmin = tri[:, :, 2].max(axis=1), tri[:, :, 2].min(axis=1)
    en_hundido = shapely.contains_xy(HUNDIDO, c[:, 0], c[:, 1])
    en_patio = shapely.contains_xy(patio, c[:, 0], c[:, 1]) if not patio.is_empty else np.zeros(len(tri), bool)
    # En un desnivel o un patio (y hasta 2 m de su borde), todo lo que no sube más de 2 m es suelo: pisos,
    # rampas, gradas, muros de contención, barandas y los taludes o cubiertas inclinadas que nacen del suelo
    # (aunque una losa o una vereda quede encima o al lado).
    cerca = shapely.contains_xy(HUNDIDO_BORDE, c[:, 0], c[:, 1])
    a_suelo = (np.abs(tri[:, :, 2]).max(axis=1) <= 0.6) | ((zmax <= 2.05) & (cerca | en_patio))
    # Un piso a la misma altura que el zócalo, fuera de un desnivel, ya lo dibuja el zócalo: se descarta.
    coplanar = horiz & (np.abs(z) < 0.05) & ~en_hundido
    suelo_out = tri[a_suelo & ~coplanar & ~shapely.contains_xy(CUBIERTO, c[:, 0], c[:, 1])]
    recortado = float(poligonos_xy(tri[a_suelo & horiz]).area) if (a_suelo & horiz).any() else 0.0
    # En los patios, los cantos de las losas quitadas y las contrahuellas (piezas de menos de 0,6 m de alto) sobran.
    canto = np.zeros(len(tri), bool)
    if not patio.is_empty:
        borde = patio.buffer(0.4)
        shapely.prepare(borde)
        canto = ~horiz & (zmin >= 0.6) & (zmax - zmin < 0.6) & shapely.contains_xy(borde, c[:, 0], c[:, 1])
    salida = [tri[~horiz & ~a_suelo & ~canto]]
    sel = tri[horiz & ~a_suelo]
    if len(sel) and patio.is_empty:
        salida.append(sel)
    elif len(sel):
        shapely.prepare(patio)
        polys = shapely.polygons(np.concatenate([sel[:, :, :2], sel[:, :1, :2]], axis=1))
        toca = shapely.intersects(patio, polys)
        salida.append(sel[~toca])
        m = patio
        for t, p in zip(sel[toca], polys[toca]):
            resto = p.difference(m)
            recortado += p.area - resto.area
            if resto.area < 1e-3:
                continue
            zt = t[:, 2].mean()
            for q in shapely.get_parts(shapely.constrained_delaunay_triangles(resto)):
                c = np.asarray(q.exterior.coords)[:3]
                if len(c) == 3:
                    salida.append(np.column_stack([c, np.full(3, zt)])[None])
    # Una pieza que era solo suelo queda vacía como edificio: se dibuja solo como suelo.
    return np.concatenate(salida), suelo_out, recortado


# ---------- Desniveles: suelo hundido del plano y pisos al aire libre bajo cero de los edificios ----------
_MALLAS_PLANO = leer()


def _capa_plano(nombre):
    t = np.concatenate([m['tri'] for m in _MALLAS_PLANO if m['capa'] == nombre]).copy()
    t[:, :, 2] -= 91.44
    t[:, :, :2] = (t[:, :, :2].reshape(-1, 2) @ R.T + TR).reshape(-1, 3, 2)
    return t


SUELO_PLANO = {'pav': _capa_plano('L1_Suelo Pavimento'), 'jard': _capa_plano('L2_Suelo Jardinería')}
RETIRADOS = {'2'}  # Pabellón C: el usuario pidió quitarlo (12 nov 2026)
PIEZAS_RETIRADAS = {p for r in rel if set(r.get('codes') or ([r['code']] if r['code'] else [])) & RETIRADOS for p in r['skpIds']}
_todo = np.concatenate([t for k, t in piezas.items() if k not in PIEZAS_RETIRADAS])
_n = np.cross(_todo[:, 1] - _todo[:, 0], _todo[:, 2] - _todo[:, 0])
_n /= np.linalg.norm(_n, axis=1, keepdims=True) + 1e-12
_h, _z = np.abs(_n[:, 2]) > 0.95, _todo[:, :, 2].mean(axis=1)
ENCIMA = poligonos_xy(_todo[_h & (_z >= -0.3)]).buffer(0.2)
shapely.prepare(ENCIMA)
_bajo = _todo[_h & (_z < -0.3)]
_c = _bajo[:, :, :2].mean(axis=1)
SKP_LIBRE = _bajo[~shapely.contains_xy(ENCIMA, _c[:, 0], _c[:, 1])]
_hund = shapely.union_all([poligonos_xy(t[t[:, :, 2].mean(axis=1) < -0.3]) for t in SUELO_PLANO.values()] + [poligonos_xy(SKP_LIBRE)])
_hund = _hund.buffer(0.3).buffer(-0.3)
HUNDIDO = shapely.union_all([p for p in shapely.get_parts(_hund) if p.area > 8]).simplify(0.1).buffer(0.1)
shapely.prepare(HUNDIDO)
HUNDIDO_LIBRE = HUNDIDO.difference(ENCIMA)
shapely.prepare(HUNDIDO_LIBRE)
HUNDIDO_BORDE = HUNDIDO.buffer(2.0)
shapely.prepare(HUNDIDO_BORDE)
# Fondo de los desniveles según las capas de suelo del plano (pavimento y jardinería)
PISO_PLANO = {}
for _k, _t in SUELO_PLANO.items():
    _cc = _t[:, :, :2].mean(axis=1)
    PISO_PLANO[_k] = _t[shapely.contains_xy(HUNDIDO, _cc[:, 0], _cc[:, 1]) & (_t[:, :, 2].mean(axis=1) < -0.02)]
CUBIERTO = poligonos_xy(np.concatenate(list(PISO_PLANO.values()))).buffer(-0.05)
shapely.prepare(CUBIERTO)
SUELO_EDIFICIOS, EDIF_RESTANTE = [], []


class Paquete:
    def __init__(self):
        self.pos, self.idx, self.nv, self.ni = [], [], 0, 0

    def agregar(self, tri):
        q = np.round(tri.reshape(-1, 3) / PASO).astype(np.int32)
        unicos, inverso = np.unique(q, axis=0, return_inverse=True)
        assert np.abs(unicos).max() < 32767, 'coordenada fuera de Int16'
        e = {'voff': self.nv, 'vcount': len(unicos), 'ioff': self.ni, 'icount': len(inverso)}
        self.pos.append(unicos.astype(np.int16).ravel())
        self.idx.append(inverso.astype(np.uint32).ravel())
        self.nv += len(unicos)
        self.ni += len(inverso)
        return e

    def binario(self):
        i = np.concatenate(self.idx).astype('<u4').tobytes()
        return i + np.concatenate(self.pos).astype('<i2').tobytes(), len(i)


# ---------- Entradas de la vista unificada (unifiedEntries) ----------
entradas = []
for r in rel:
    asignados = r.get('codes') or ([r['code']] if r['code'] else [])
    heredado = ' / '.join(dict.fromkeys(nombre_bd[i].strip() for i in sorted(r['mapIds'], key=int) if nombre_bd[i] and nombre_bd[i].strip()))
    meta = [referencias[c] for c in asignados if c in referencias]
    propio = next((m['name'] for m in meta if m.get('name')), None)
    por_codigo = ' / '.join(c['label'] for c in lista_codigos if c['code'] in asignados)
    if propio:
        nombre, origen = propio, 'Corrección de building-references.json'
    elif '62' in asignados:
        nombre, origen = 'Instituto de Ciencias Ómicas y Biotecnología Aplicada', 'Fijado en unification.ts'
    elif '22' in r['mapIds']:
        nombre, origen = 'Aulas Móviles A', 'Fijado en unification.ts'
    elif (r.get('name') or '').strip():
        nombre, origen = r['name'].strip(), 'Escrito en la relación'
    elif heredado:
        nombre, origen = heredado, 'Nombre del mapa actual'
    elif por_codigo:
        nombre, origen = por_codigo, 'Etiqueta oficial del código'
    else:
        nombre, origen = 'Sin nombre', '—'
    fuente = 'adaptada' if r['id'] == KIOSK else 'mapa' if r['id'] == LEFT_ONLY or not r['skpIds'] else 'skp'
    entradas.append({'id': r['id'], 'nombre': nombre, 'origen_nombre': origen, 'fuente': fuente, 'skp': list(r['skpIds']),
                     'mapa': list(r['mapIds']), 'codigos': asignados,
                     'alias': list(dict.fromkeys(a for m in meta for a in m['aliases'])),
                     'pisos': [f for m in meta for f in m.get('floors', [])], 'avisos': []})
padre = next(e for e in entradas if '39' in e['codigos'])
separadas = ['C-161', 'C-1970']
if all(p in padre['skp'] for p in separadas):
    padre['skp'] = [p for p in padre['skp'] if p not in separadas]
    entradas.append({'id': 'unified:lugar-prestado', 'nombre': 'Lugar prestado', 'origen_nombre': 'Fijado en unification.ts',
                     'fuente': 'skp', 'skp': separadas, 'mapa': [], 'codigos': [], 'alias': ['Caseta junto a Maestranza'],
                     'pisos': [], 'avisos': ['Jean Piero la separó a mano de la relación de Maestranza (código 39), solo en la vista unificada.']})
usadas = {p for r in rel for p in r['skpIds']}
for p in piezas:
    if p not in usadas:
        entradas.append({'id': f'unassigned:{p}', 'nombre': f'Pieza SKP sin relación · {p}', 'origen_nombre': '—', 'fuente': 'skp',
                         'skp': [p], 'mapa': [], 'codigos': [], 'alias': [], 'pisos': [], 'avisos': []})

# Relaciones que el usuario pidió quitar de la propuesta (12 nov 2026): el Pabellón C (código 2).
RETIRADOS = {'2'}
entradas = [e for e in entradas if not set(e['codigos']) & RETIRADOS]

# ---------- Geometría, medidas y avisos ----------
NOTAS = {
    'C47': 'El nombre «CIGA» viene del mapa actual, pero el CIGA oficial es C48, otro edificio.',
    'C48': 'Este es el CIGA oficial (C48). El mapa actual le pone «CIGA» a otro edificio (C47).',
}
paquete = Paquete()
DEPURA = []
ahuecados = []
repetidos = {}
for e in entradas:
    if not e['id'].startswith('unassigned:'):
        repetidos.setdefault(e['nombre'], []).append(e['id'])
for e in entradas:
    sin_rel = e['id'].startswith('unassigned:')
    e['relacion'] = 'sin_relacion' if sin_rel else 'solo_skp' if not e['mapa'] else 'solo_mapa' if not e['skp'] else 'varios' if len(e['mapa']) > 1 else 'uno'
    huella_skp = shapely.union_all([shapely.from_wkb(piezas_info[p]['huella']) for p in e['skp']]).buffer(0) if e['skp'] else None
    huella_mapa = shapely.union_all([edif[i]['geom'] for i in e['mapa']]).buffer(0) if e['mapa'] else None
    if e['skp']:
        tri = np.concatenate([piezas[p] for p in e['skp']])
        e['alto_skp'], e['base_skp'] = round(float(tri[:, :, 2].max()), 1), round(float(tri[:, :, 2].min()), 1)
        e['area_skp'] = round(huella_skp.area, 1)
    if e['mapa']:
        e['area_mapa'] = round(huella_mapa.area, 1)
        e['edificios_mapa'] = [{'id': int(i), 'nombre': nombre_bd[i], 'alto': edif[i]['alto'], 'estimada': edif[i]['estimada']} for i in sorted(e['mapa'], key=int)]
    if huella_skp is not None and huella_mapa is not None and huella_skp.area > 0:
        e['iou'] = round(huella_skp.intersection(huella_mapa).area / huella_skp.union(huella_mapa).area, 2)
        e['separacion'] = round(huella_skp.centroid.distance(huella_mapa.centroid), 1)
    if e['fuente'] == 'skp':
        tri, suelo_e, recortado = ahuecar(np.concatenate([piezas[p] for p in e['skp']]), e['mapa'])
        SUELO_EDIFICIOS.append(suelo_e)
        EDIF_RESTANTE.append(tri)
        if recortado > 20:
            ahuecados.append((round(recortado), e['nombre'][:50]))
        e['malla'] = paquete.agregar(tri) if len(tri) else None
    elif e['fuente'] == 'adaptada':
        destino = edif[e['mapa'][0]]['geom']
        destino = max(getattr(destino, 'geoms', [destino]), key=lambda g: g.area)
        tri = adaptar_caseta(piezas[TEMPLATE], destino, edif[e['mapa'][0]]['alto'] or 8)
        e['malla'] = paquete.agregar(tri)
        e['avisos'].append(f'Excepción de Jean Piero: toma la forma de la caseta {TEMPLATE} del SKP, estirada a las medidas de este '
                           f'edificio del mapa ({e["area_mapa"]:.0f} m²) y con 8 m de alto, que es la altura estimada del mapa.')
        e['avisos'].append(f'En el mapa actual se llama «{nombre_bd[e["mapa"][0]]}», pero está a 7 m de Estudios Generales Ciencias.')
    if e['fuente'] == 'mapa':
        e['prismas'] = [{'anillos': anillos(edif[i]['geom']), 'alto': edif[i]['alto'] or 8} for i in e['mapa']]
        if e['id'] == LEFT_ONLY:
            e['avisos'].append(f'Excepción de Jean Piero: usa la geometría del mapa ({e["area_mapa"]:.0f} m², 8 m estimados) aunque el SKP '
                               f'tiene la pieza ({e["area_skp"]:.0f} m², {e["alto_skp"]:.1f} m).')
    if sin_rel:
        continue
    if len(repetidos[e['nombre']]) > 1:
        e['avisos'].append(f'Nombre repetido: hay {len(repetidos[e["nombre"]])} edificios que se llaman igual.')
    if e.get('iou') is not None and e['iou'] < 0.4 and e['fuente'] == 'skp':
        e['avisos'].append(f'El SKP y el mapa casi no se superponen (IoU {e["iou"]:.2f}): revisar si la relación es correcta.')
    if e['skp'] and len(e['skp']) > 1:
        lejos = []
        for p in e['skp']:
            resto = shapely.union_all([shapely.from_wkb(piezas_info[q]['huella']) for q in e['skp'] if q != p])
            d = shapely.from_wkb(piezas_info[p]['huella']).distance(resto)
            if d > 15:
                lejos.append(d)
        if lejos:
            e['avisos'].append(f'Incluye {len(lejos)} pieza{"s" if len(lejos) > 1 else ""} a más de {int(min(lejos))} m del resto del edificio.')
    if re.match(r'Desconocido_\d+', e['nombre']):
        e['avisos'].append('Sin identificar: la relación no tiene nombre ni código oficial.')
    for c in e['codigos']:
        if c in NOTAS:
            e['avisos'].append(NOTAS[c])
    e['codigos'] = [{'codigo': c, 'etiqueta': etiqueta.get(c, '—')} for c in e['codigos']]


# ---------- Mapa actual ----------
de_entrada = {i: e['id'] for e in entradas for i in e['mapa']}
hoy = [{'id': int(i), 'nombre': nombre_bd[i], 'alto': b['alto'] or 8, 'estimada': b['estimada'], 'entrada': de_entrada.get(i),
        'area': round(b['geom'].area, 1), 'anillos': anillos(b['geom'])} for i, b in edif.items() if b['campus']]
jardines = []
for f in json.loads((FUENTES / 'areas_verdes.geojson').read_text(encoding='utf-8'))['features']:
    n = f['properties'].get('Nombre')
    if n and not str(n).startswith('AV-'):
        g = local(shape(f['geometry'])).buffer(0)
        p = g.representative_point()
        jardines.append({'nombre': n, 'x': round(p.x, 1), 'y': round(p.y, 1), 'area': round(g.area)})
puertas = [[round(c, 1) for c in pl.a_metros([f['geometry']['coordinates'][:2]])[0]]
           for f in json.loads((FUENTES / 'puertas_entradas.geojson').read_text(encoding='utf-8'))['features']]
entorno = [{'alto': b['alto'] or 8, 'anillos': anillos(b['geom'], 0.2)} for b in edif.values() if not b['campus']]


def capa(nombre, filtro=None, simplificar=0.15):
    fs = json.loads((FUENTES / nombre).read_text(encoding='utf-8'))['features']
    return [a for f in fs if not filtro or filtro(f) for a in anillos(local(shape(f['geometry'])).buffer(0), simplificar)]


perimetro = json.loads((FUENTES / 'perimetro-y-veredas.geojson').read_text(encoding='utf-8'))['features']
suelo = {
    'campus': anillos(local(shape(next(f for f in perimetro if f['properties']['layer'] == 'limite_campus')['geometry'])).buffer(0), 0.2),
    'veredas': [a for f in perimetro if f['properties']['layer'] != 'limite_campus' for a in anillos(local(shape(f['geometry'])).buffer(0), 0.1)],
    'verdes': capa('areas_verdes.geojson'),
    'xerofitica': capa('xerofitica.geojson'),
    'estacionamientos': capa('playas_de_estacionamiento.geojson'),
}

# ---------- Desniveles en la propuesta: capas del cliente abiertas, fondo del hundimiento y muros ----------
def _poligonos(lista):
    return [shapely.Polygon(np.asarray(p[0]).reshape(-1, 2) / 20, [np.asarray(h).reshape(-1, 2) / 20 for h in p[1:]]).buffer(0) for p in lista]


piso = dict(PISO_PLANO)
# Lo de los edificios que pasó a ser suelo (pisos, sardineles, gradas, rampas y muros de los desniveles)
piso['banda'] = np.concatenate(SUELO_EDIFICIOS) if SUELO_EDIFICIOS else np.zeros((0, 3, 3))
_pisos = np.concatenate([piso['pav'], piso['jard'], piso['banda']])
# El zócalo se abre solo donde hay piso debajo (piso, rampa o gradas). Un techo no cuenta: en vista oblicua,
# por la abertura se vería igual el vacío.
_cubre = _pisos
_nn = np.cross(_cubre[:, 1] - _cubre[:, 0], _cubre[:, 2] - _cubre[:, 0])
_nn /= np.linalg.norm(_nn, axis=1, keepdims=True) + 1e-12
CORTE = HUNDIDO.intersection(poligonos_xy(_cubre[np.abs(_nn[:, 2]) > 0.2]).buffer(0.05))
CORTE = shapely.union_all([p for p in shapely.get_parts(CORTE.buffer(-0.05).buffer(0.05)) if p.area > 2])
_cielo = HUNDIDO.difference(CORTE)
print(f'desniveles: el zócalo se abre en {CORTE.area:.0f} m² de {HUNDIDO.area:.0f} m²; quedan cerradas {_cielo.area:.1f} m² sin nada debajo')

hundido = {}
for estado, (dx, dy) in {'corr': (2.5, 2.5), 'sin': (0.0, 0.0)}.items():
    # Las capas del cliente se corren con la corrección; el hueco se calcula en su marco para que en el mundo
    # quede siempre donde está el desnivel del plano.
    H = shapely.transform(CORTE, lambda p, d=np.array([dx, dy]): p - d)
    cortes = {}
    for nombre in ('verdes', 'xerofitica', 'estacionamientos', 'veredas'):
        quitar, poner = [], []
        for i, p in enumerate(_poligonos(suelo[nombre])):
            if p.intersects(H):
                quitar.append(i)
                poner.extend(anillos(p.difference(H)))
        cortes[nombre] = {'quitar': quitar, 'poner': poner}
    cortes['campus'] = anillos(shapely.union_all(_poligonos(suelo['campus'])).difference(H))
    hundido[estado] = cortes
_cp = _pisos[:, :, :2].mean(axis=1)
muros_hundidos = []
FONDO_CERRADO = 10.5  # bajo el piso más hondo del plano (−9,3 m)
for p in shapely.get_parts(CORTE):
    # Cada abertura es una caja cerrada: muros bajo el zócalo hasta el fondo común, y un fondo. Así una rendija
    # entre dos niveles muestra suelo y no el cielo.
    muros_hundidos.append({'anillos': [np.round(np.asarray(r.coords)[:-1] * 20).astype(int).ravel().tolist() for r in [p.exterior, *p.interiors]],
                           'fondo': FONDO_CERRADO})
hundido['piso'] = {k: paquete.agregar(t) for k, t in piso.items() if len(t)}
hundido['muros'] = muros_hundidos
hundido['fondo'] = {'anillos': anillos(CORTE), 'alto': FONDO_CERRADO}

# ---------- Huaca: el Camino Prehispánico (capa L6 del plano), muros de tapial ----------
_hu = _capa_plano('L6_Huacas')
_nh = np.cross(_hu[:, 1] - _hu[:, 0], _hu[:, 2] - _hu[:, 0])
_nh /= np.linalg.norm(_nh, axis=1, keepdims=True) + 1e-12
_tope = np.abs(_nh[:, 2]) > 0.7
_th = _hu[_tope].copy()
# El piso del camino queda al ras o bajo el zócalo: se apoya 4 cm encima para verse y no titilar con él
_bajo_h = _th[:, :, 2].mean(axis=1) < 0.1
_th[_bajo_h, :, 2] = np.maximum(_th[_bajo_h, :, 2], 0.04)
_fh = poligonos_xy(_hu)
_ph = max(shapely.get_parts(_fh), key=lambda q: q.area).representative_point()
hundido['huaca'] = {'tope': paquete.agregar(_th), 'muro': paquete.agregar(_hu[~_tope]),
                    'etiqueta': [round(_ph.x, 1), round(_ph.y, 1), round(float(_hu[:, :, 2].max()), 1)]}
print(f'huaca: {len(_hu)} triángulos ({_tope.sum()} arriba, {(~_tope).sum()} muros), huella {_fh.area:.0f} m², alto {_hu[:, :, 2].max():.1f} m')
_arbol_piso = shapely.STRtree(shapely.polygons(np.concatenate([_pisos[:, :, :2], _pisos[:, :1, :2]], axis=1)))
print(f'desniveles: {len(list(shapely.get_parts(HUNDIDO)))} zonas, {HUNDIDO.area:.0f} m²; fondo {len(piso["pav"])} triángulos de piso y '
      f'{len(piso["jard"])} de jardín; muros en {len(muros_hundidos)} zonas de más de 1,6 m')

# ---------- Vegetación (docs/datos/procesados/ejemplares.csv, formas de plantShape.ts) ----------
import csv  # noqa: E402
TIPOS_PLANTA = {'Árbol': 0, 'Palmera': 1, 'Arbusto': 2, 'Planta herbácea': 3, 'Trepadora': 4}
TIPICA = {0: (7, 3.2), 1: (8, 3), 2: (1.7, 1.2), 3: (0.8, 0.7), 4: (2, 1.6)}
plantas = []
with open(RAIZ / 'docs/datos/procesados/ejemplares.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f, delimiter=';'):
        tipo = TIPOS_PLANTA.get(r['tipo_vegetacion'], 0)
        try:
            x, y = pl.a_metros([[float(r['longitud']), float(r['latitud'])]])[0]
        except ValueError:
            continue
        num = lambda v: float(v) if v not in ('', None) else None
        h, rc = num(r['altura_m']), num(r['radio_copa_m'])
        semilla = sum(ord(c) * (i + 1) for i, c in enumerate(r['nombre_cientifico'] or r['codigo']))
        h = h if h and h > 0.3 else TIPICA[tipo][0] * (0.84 + (semilla % 100) / 100 * 0.32)
        rc = rc if rc and rc > 0.2 else TIPICA[tipo][1] * (0.9 + (semilla // 7 % 100) / 100 * 0.2)
        # En la propuesta, una planta dentro de un desnivel se apoya en su fondo
        base = 0.0
        if shapely.contains_xy(HUNDIDO, x, y):
            idx = _arbol_piso.query(shapely.Point(x, y), predicate='intersects')
            if len(idx):
                base = float(_pisos[idx][:, :, 2].mean(axis=1).max())
        plantas.append([round(x * 20), round(y * 20), round(h * 10), round(rc * 10), tipo, semilla % 6, round(base * 10)])

binario, bytes_indices = paquete.binario()
comprimido = gzip.compress(binario, 9)
for e in entradas:
    e.pop('skp_huella', None)
    e['piezas'] = len(e.pop('skp'))
    e.pop('mapa')
datos = {'paso': PASO, 'bytes_indices': bytes_indices, 'entradas': entradas, 'hoy': hoy, 'entorno': entorno, 'suelo': suelo, 'plantas': plantas,
         'jardines': jardines, 'puertas': puertas, 'hundido': hundido,
         'binario': base64.b64encode(comprimido).decode('ascii')}
texto = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
(TRABAJO / 'datos_propuesta.json').write_text(texto, encoding='utf-8')
print('DEPURA (hueco OSM, máscara, celdas elegidas, celdas):', DEPURA)
print('patios y pisos al ras recortados (m², edificio):', sorted(ahuecados, reverse=True))
cuenta = lambda k: {v: sum(1 for e in entradas if e[k] == v) for v in sorted({e[k] for e in entradas})}
print(f'entradas {len(entradas)} | fuente {cuenta("fuente")} | relación {cuenta("relacion")} | con avisos '
      f'{sum(1 for e in entradas if e["avisos"])} | binario {len(binario) / 1e6:.2f} MB → gzip {len(comprimido) / 1e6:.2f} MB | '
      f'json {len(texto) / 1e6:.2f} MB')
