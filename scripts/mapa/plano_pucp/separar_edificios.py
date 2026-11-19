"""Paso 2: un polígono por edificio (y por caseta) del plano, con su altura.

1. Triángulos de las capas L3 (edificios) y L4 (casetas) del GLB, sin duplicados.
2. Piezas = triángulos conectados por vértices compartidos (cada sólido de SketchUp).
3. Huella de cada pieza = unión de sus triángulos vistos desde arriba.
4. Edificio = piezas cuyas huellas se superponen (base y techo modelados aparte, etc.).
   Las que solo se tocan por un borde quedan separadas.
5. Se ubica con la transformación del paso 1 y se exporta en WGS84.
"""
import json
import sys
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import mapping

sys.path.insert(0, str(Path(__file__).parent))
from alinear import PlanoLocal  # noqa: E402
from glb import leer  # noqa: E402

from rutas import TRABAJO  # noqa: E402
SUELO = 91.44
T = np.load(TRABAJO / 'transformacion.npz')
R, TR = T['r'], T['tr']
PLANO = PlanoLocal(float(T['lat0']), float(T['lon0']))


class Conjuntos:
    def __init__(self, n):
        self.p = np.arange(n)

    def raiz(self, i):
        while self.p[i] != i:
            self.p[i] = self.p[self.p[i]]
            i = self.p[i]
        return i

    def unir(self, a, b):
        ra, rb = self.raiz(a), self.raiz(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)


def piezas(tri):
    """Etiqueta de pieza conexa por triángulo (vértices iguales al milímetro)."""
    claves = np.round(tri.reshape(-1, 3) * 1000).astype(np.int64)
    _, vertice = np.unique(claves, axis=0, return_inverse=True)
    vertice = vertice.reshape(-1, 3)
    c = Conjuntos(vertice.max() + 1)
    for a, b, d in vertice:
        c.unir(a, b)
        c.unir(a, d)
    raiz = np.array([c.raiz(v) for v in vertice[:, 0]])
    _, etiqueta = np.unique(raiz, return_inverse=True)
    return etiqueta


def huella(tri2d):
    """Unión de triángulos 2D con área (las paredes verticales se proyectan como líneas y se descartan)."""
    a = 0.5 * np.abs((tri2d[:, 1, 0] - tri2d[:, 0, 0]) * (tri2d[:, 2, 1] - tri2d[:, 0, 1])
                     - (tri2d[:, 2, 0] - tri2d[:, 0, 0]) * (tri2d[:, 1, 1] - tri2d[:, 0, 1]))
    tri2d = tri2d[a > 1e-4]
    if not len(tri2d):
        return None
    poligonos = shapely.polygons(np.concatenate([tri2d, tri2d[:, :1]], axis=1))
    return shapely.union_all(shapely.make_valid(poligonos), grid_size=0.01)


def procesar(capa, mallas):
    tri = np.concatenate([m['tri'] for m in mallas if m['capa'] == capa])
    claves = np.sort(np.round(tri * 1000).astype(np.int64).reshape(len(tri), -1).reshape(len(tri), 3, 3), axis=1)
    _, unicos = np.unique(claves.reshape(len(tri), -1), axis=0, return_index=True)
    tri = tri[np.sort(unicos)]
    tri[:, :, :2] = (tri[:, :, :2].reshape(-1, 2) @ R.T + TR).reshape(-1, 3, 2)  # ubicado (metros locales)
    etiqueta = piezas(tri)
    print(f'{capa}: {len(tri)} triángulos únicos → {etiqueta.max() + 1} piezas', file=sys.stderr)

    lista = []
    for k in range(etiqueta.max() + 1):
        t = tri[etiqueta == k]
        h = huella(t[:, :, :2])
        if h is None or h.area < 0.5:
            continue
        lista.append({'huella': h, 'zmin': float(t[:, :, 2].min()), 'zmax': float(t[:, :, 2].max()), 'triangulos': len(t)})

    # Edificio = piezas que se superponen en planta (no basta con tocarse).
    huellas = [p['huella'] for p in lista]
    arbol = shapely.STRtree(huellas)
    c = Conjuntos(len(lista))
    for i, j in zip(*arbol.query(huellas, predicate='intersects')):
        if i < j:
            inter = huellas[i].intersection(huellas[j]).area
            if inter > 0.5 or inter > 0.1 * min(huellas[i].area, huellas[j].area):
                c.unir(i, j)
    grupos = {}
    for i in range(len(lista)):
        grupos.setdefault(c.raiz(i), []).append(lista[i])

    salida = []
    for miembros in grupos.values():
        geom = shapely.union_all([m['huella'] for m in miembros], grid_size=0.01).buffer(0)
        geom = shapely.simplify(geom, 0.05, preserve_topology=True)
        zmin = min(m['zmin'] for m in miembros)
        zmax = max(m['zmax'] for m in miembros)
        poligonos = list(geom.geoms) if hasattr(geom, 'geoms') else [geom]
        salida.append({'capa': capa, 'geom': geom, 'area': geom.area, 'alto': zmax - SUELO, 'base': zmin - SUELO,
                       'piezas': len(miembros), 'triangulos': sum(m['triangulos'] for m in miembros),
                       'patios': sum(len(p.interiors) for p in poligonos if p.geom_type == 'Polygon'),
                       'partes': len(poligonos)})
    return salida


def a_wgs84(geom):
    def mover(coords):
        c = np.asarray(coords)
        return PLANO.a_grados(c[:, :2]).round(7).tolist()
    return shapely.transform(geom, lambda c: np.asarray(mover(c)))


def main():
    mallas = leer()
    edificios = procesar('L3_Huellas Edificios', mallas) + procesar('L4_Huellas casetas', mallas)

    # Interior del campus según el propio plano: el contorno del suelo (pavimento + jardinería), 41,8 ha.
    # El muro no sirve: tiene cortes de más de 10 m y no cierra.
    suelo = np.concatenate([m['tri'] for m in mallas if m['capa'] in ('L1_Suelo Pavimento', 'L2_Suelo Jardinería')])
    suelo = suelo[:, :, :2].copy()
    suelo = (suelo.reshape(-1, 2) @ R.T + TR).reshape(-1, 3, 2)
    piezas_suelo = shapely.get_parts(huella(suelo))
    campus = shapely.Polygon(max(piezas_suelo, key=lambda p: shapely.Polygon(p.exterior).area).exterior)
    print(f'interior del campus según el suelo del plano: {campus.area / 1e4:.1f} ha', file=sys.stderr)

    edificios.sort(key=lambda e: (e['capa'], -e['area']))
    features = []
    for i, e in enumerate(edificios, 1):
        e['codigo'] = f"{'E' if e['capa'].startswith('L3') else 'C'}{i:03d}"
        e['fuera'] = bool(campus is not None and not campus.contains(e['geom'].representative_point()))
        features.append({'type': 'Feature', 'properties': {
            'codigo': e['codigo'], 'capa': e['capa'], 'area_m2': round(e['area'], 1),
            'alto_m': round(e['alto'], 1) if e['alto'] > 0.5 else None, 'base_m': round(e['base'], 1),
            'piezas': e['piezas'], 'patios': e['patios'], 'partes': e['partes'], 'fuera_del_muro': e['fuera']},
            'geometry': mapping(a_wgs84(e['geom']))})
    (TRABAJO / 'edificios_plano.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                                                             ensure_ascii=False), encoding='utf-8')
    np.save(TRABAJO / 'edificios_plano_local.npy', np.array([e | {'geom': shapely.to_wkb(e['geom'])} for e in edificios],
                                                         dtype=object), allow_pickle=True)

    for capa in ('L3_Huellas Edificios', 'L4_Huellas casetas'):
        g = [e for e in edificios if e['capa'] == capa]
        areas = np.array([e['area'] for e in g])
        con_alto = [e for e in g if e['alto'] > 0.5]
        print(f"\n{capa}: {len(g)} unidades | área total {areas.sum():,.0f} m² | mediana {np.median(areas):.0f} m² | "
              f"< 10 m²: {(areas < 10).sum()} | con volumen: {len(con_alto)} | con patios: {sum(1 for e in g if e['patios'])} | "
              f"en varias partes: {sum(1 for e in g if e['partes'] > 1)}")
    print('\nfuera del muro:', [(e['codigo'], round(e['area']), round(e['alto'], 1)) for e in edificios if e['fuera']])
    print('más altos:', [(e['codigo'], round(e['alto'], 1), round(e['area'])) for e in sorted(edificios, key=lambda e: -e['alto'])[:8]])
    print('base bajo el suelo:', [(e['codigo'], round(e['base'], 1), round(e['area'])) for e in edificios if e['base'] < -1])
    print('más grandes:', [(e['codigo'], round(e['area']), e['piezas']) for e in sorted(edificios, key=lambda e: -e['area'])[:8]])


if __name__ == '__main__':
    main()
