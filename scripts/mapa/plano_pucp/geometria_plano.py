"""Reglas de geometría de los modelos del plano: patios (D-07), suelo (D-08), desniveles (D-09) y huaca (D-10).

Todo trabaja sobre triángulos (n, 3, 3) en metros locales: x este, y norte y z desde el suelo del modelo, como
los entrega glb.leer() después de aplicar la transformación del plano. Porta las reglas del prototipo aprobado
(prototipo/preparar_propuesta.py: ahuecar, poligonos_xy, adaptar_caseta y los bloques de desniveles y huaca).
"""
import math

import numpy as np
import shapely
from shapely.geometry import MultiPolygon, Polygon

SUELO_MAX_M = 0.6         # entero al ras: |z| ≤ 0,6 m pasa a suelo (D-08)
BAJO_MAX_M = 2.05         # en un desnivel o un patio, lo que no supera 2 m de alto pasa a suelo (D-08)
BORDE_M = 2.0             # … y hasta 2 m del borde del desnivel (D-08)
GUIA_PATIO_M = 1.5        # el patio de OSM guía hasta 1,5 m alrededor (D-07)
CANTO_MAX_M = 0.6         # cantos de losa y contrahuellas del patio: piezas de menos de 0,6 m de alto (D-07)
HUNDIDO_UMBRAL_M = -0.3   # el suelo baja de −0,3 m: desnivel (D-09)
FONDO_M = 10.5            # fondo cerrado de las aberturas, bajo el piso más hondo del plano (−9,3 m) (D-09)
COPLANAR_M = 0.05         # un piso a menos de 5 cm del zócalo titila contra él (D-08)

Area = Polygon | MultiPolygon


def _normales(tri):
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


def _horizontales(tri):
    return np.abs(_normales(tri)[:, 2]) > 0.95


def _dentro(area, tri):
    """Qué caras tienen su centro (en planta) dentro del área."""
    if area.is_empty:
        return np.zeros(len(tri), bool)
    shapely.prepare(area)
    c = tri[:, :, :2].mean(axis=1)
    return shapely.contains_xy(area, c[:, 0], c[:, 1])


def _area(geom):
    return Polygon() if geom.is_empty else geom


def huella(tri) -> Area:
    """Unión de la proyección en planta de las caras no verticales (poligonos_xy del prototipo)."""
    a = np.abs((tri[:, 1, 0] - tri[:, 0, 0]) * (tri[:, 2, 1] - tri[:, 0, 1])
               - (tri[:, 1, 1] - tri[:, 0, 1]) * (tri[:, 2, 0] - tri[:, 0, 0])) / 2
    t = tri[a > 1e-3]
    if not len(t):
        return Polygon()
    return _area(shapely.union_all(shapely.polygons(np.concatenate([t[:, :, :2], t[:, :1, :2]], axis=1))).buffer(0))


def patio_del_skp(tri, huecos: list[Polygon]) -> Area:
    """D-07: el contorno de los patios según los muros del propio SKP, con el patio de OSM como guía.

    Los muros en planta (caras verticales de más de 0,5 m de alto) parten la zona hasta GUIA_PATIO_M alrededor
    de cada hueco de OSM. Se quedan las celdas que caen sobre todo dentro del hueco: así el patio no se come un
    ala del edificio. Si los muros no cierran ninguna celda, el patio es el hueco de OSM achicado 0,3 m. Los
    huecos de 20 m² o menos no son patios.
    """
    huecos = [h for h in huecos if h.area > 20]
    if not huecos:
        return Polygon()
    n = _normales(tri)
    vert = tri[(np.abs(n[:, 2]) < 0.2) & (np.ptp(tri[:, :, 2], axis=1) > 0.5)]
    lineas = []
    for t in vert:
        d = ((t[:, None, :2] - t[None, :, :2]) ** 2).sum(-1)
        a, b = np.unravel_index(d.argmax(), d.shape)
        if d[a, b] > 0.01:
            lineas.append(shapely.LineString([t[a, :2], t[b, :2]]))
    muros = shapely.union_all(lineas).buffer(0.15) if lineas else Polygon()
    partes = []
    for h in huecos:
        zona = h.buffer(GUIA_PATIO_M).difference(muros)
        elegidas = [c for c in shapely.get_parts(zona) if c.area > 4 and c.intersection(h).area > 0.6 * c.area]
        partes.append(shapely.union_all(elegidas) if elegidas else h.buffer(-0.3))
    return _area(shapely.union_all(partes))


def piso_en_hundido(suelo_plano: dict[str, np.ndarray], hundido: Area) -> dict[str, np.ndarray]:
    """El fondo de los desniveles según las capas de suelo del plano: sus caras dentro del hundimiento y bajo cero."""
    return {k: t[_dentro(hundido, t) & (t[:, :, 2].mean(axis=1) < -0.02)] for k, t in suelo_plano.items()}


def zonas_hundidas(suelo_plano: dict[str, np.ndarray], piezas: np.ndarray) -> tuple[Area, Area]:
    """D-09: el hundimiento y lo que ya cubre el fondo del plano dentro de él.

    El hundimiento junta el suelo del plano que baja de HUNDIDO_UMBRAL_M (capas de pavimento y jardinería) y los
    pisos de las piezas del SKP bajo ese nivel que están al aire libre: sin ninguna cara horizontal encima, como
    un sótano bajo techo. Quedan las zonas de más de 8 m². Lo cubierto es la huella del piso del plano dentro del
    hundimiento (piso_en_hundido), achicada 5 cm: lo de los edificios que cae ahí ya está dibujado.
    """
    horiz, z = _horizontales(piezas), piezas[:, :, 2].mean(axis=1)
    encima = huella(piezas[horiz & (z >= HUNDIDO_UMBRAL_M)]).buffer(0.2)
    bajo = piezas[horiz & (z < HUNDIDO_UMBRAL_M)]
    libre = bajo[~_dentro(encima, bajo)]
    hund = shapely.union_all([huella(t[t[:, :, 2].mean(axis=1) < HUNDIDO_UMBRAL_M]) for t in suelo_plano.values()]
                             + [huella(libre)]).buffer(0.3).buffer(-0.3)
    hundido = _area(shapely.union_all([p for p in shapely.get_parts(hund) if p.area > 8]).simplify(0.1).buffer(0.1))
    pisos = [t for t in piso_en_hundido(suelo_plano, hundido).values() if len(t)]
    cubierto = _area(huella(np.concatenate(pisos)).buffer(-0.05)) if pisos else Polygon()
    return hundido, cubierto


def separar(tri, patio: Area, hundido: Area, cubierto: Area) -> tuple[np.ndarray, np.ndarray]:
    """D-07 y D-08: la parte de edificio y la de suelo de un edificio del SKP.

    Suelo: lo que está entero al ras (|z| ≤ SUELO_MAX_M) y, dentro de un patio o de un desnivel (hasta BORDE_M de
    su borde), lo que no sube más de BAJO_MAX_M: pisos, gradas, rampas, muros de contención, barandas y taludes.
    Se descarta el piso a la altura del zócalo fuera de un desnivel (titila contra él) y lo que ya cubre el fondo
    del plano. En los patios se quitan las losas a cualquier altura y sus cantos y contrahuellas; las losas que
    cruzan el borde del patio se recortan.
    """
    n = _normales(tri)
    horiz = np.abs(n[:, 2]) > 0.95
    zmax, zmin = tri[:, :, 2].max(axis=1), tri[:, :, 2].min(axis=1)
    en_hundido = _dentro(hundido, tri)
    en_patio = _dentro(patio, tri)
    cerca = _dentro(hundido.buffer(BORDE_M), tri)
    a_suelo = (np.abs(tri[:, :, 2]).max(axis=1) <= SUELO_MAX_M) | ((zmax <= BAJO_MAX_M) & (cerca | en_patio))
    coplanar = horiz & (np.abs(tri[:, :, 2].mean(axis=1)) < COPLANAR_M) & ~en_hundido
    suelo = tri[a_suelo & ~coplanar & ~_dentro(cubierto, tri)]
    canto = np.zeros(len(tri), bool)
    if not patio.is_empty:
        canto = ~horiz & (zmin >= SUELO_MAX_M) & (zmax - zmin < CANTO_MAX_M) & _dentro(patio.buffer(0.4), tri)
    salida = [tri[~horiz & ~a_suelo & ~canto]]
    sel, n_sel = tri[horiz & ~a_suelo], n[horiz & ~a_suelo]
    if patio.is_empty or not len(sel):
        salida.append(sel)
        return np.concatenate(salida), suelo
    polys = shapely.polygons(np.concatenate([sel[:, :, :2], sel[:, :1, :2]], axis=1))
    toca = shapely.intersects(patio, polys)
    salida.append(sel[~toca])
    recortes = []
    for t, nt, resto in zip(sel[toca], n_sel[toca], shapely.difference(polys[toca], patio)):
        if resto.area < 1e-3:
            continue
        for q in shapely.get_parts(shapely.constrained_delaunay_triangles(resto)):
            xy = np.asarray(q.exterior.coords)[:3, :2]
            if len(xy) < 3:
                continue
            # La altura sale del plano de la cara original, y se conserva el sentido de su normal
            z = t[0, 2] - (nt[0] * (xy[:, 0] - t[0, 0]) + nt[1] * (xy[:, 1] - t[0, 1])) / nt[2]
            giro = (xy[1, 0] - xy[0, 0]) * (xy[2, 1] - xy[0, 1]) - (xy[1, 1] - xy[0, 1]) * (xy[2, 0] - xy[0, 0])
            nuevo = np.column_stack([xy, z])
            recortes.append(nuevo if (giro > 0) == (nt[2] > 0) else nuevo[[0, 2, 1]])
    if recortes:
        salida.append(np.stack(recortes))
    return np.concatenate(salida), suelo


def corte_con_piso(hundido: Area, pisos: np.ndarray) -> Area:
    """D-09: el zócalo se abre solo donde hay piso debajo (piso, rampa o gradas), no donde solo se vería el vacío."""
    no_vertical = pisos[np.abs(_normales(pisos)[:, 2]) > 0.2]
    corte = hundido.intersection(huella(no_vertical).buffer(0.05))
    partes = [p for p in shapely.get_parts(corte.buffer(-0.05).buffer(0.05)) if p.area > 2]
    return _area(shapely.union_all(partes)) if partes else Polygon()


def muros_y_fondo(corte: Area) -> tuple[np.ndarray, np.ndarray]:
    """D-09: cada abertura es una caja cerrada, con muros de 0 a −FONDO_M (el zócalo ya no se recorta en la
    geometría) y un fondo a −FONDO_M. Los muros miran hacia adentro de la abertura y el fondo hacia arriba."""
    muros, fondo = [], []
    for p in shapely.get_parts(shapely.orient_polygons(corte)):
        for anillo in [p.exterior, *p.interiors]:
            xy = np.asarray(anillo.coords)[:, :2]
            a, b = xy[:-1], xy[1:]
            largo = np.linalg.norm(b - a, axis=1) > 1e-9
            a, b = a[largo], b[largo]
            cero, hondo = np.zeros((len(a), 1)), np.full((len(a), 1), -FONDO_M)
            a0, b0, ah, bh = np.hstack([a, cero]), np.hstack([b, cero]), np.hstack([a, hondo]), np.hstack([b, hondo])
            muros.append(np.stack([a0, b0, bh, a0, bh, ah], axis=1).reshape(-1, 3, 3))
        for q in shapely.get_parts(shapely.constrained_delaunay_triangles(p)):
            xy = np.asarray(q.exterior.coords)[:3, :2]
            giro = (xy[1, 0] - xy[0, 0]) * (xy[2, 1] - xy[0, 1]) - (xy[1, 1] - xy[0, 1]) * (xy[2, 0] - xy[0, 0])
            fondo.append(np.column_stack([xy if giro > 0 else xy[[0, 2, 1]], np.full(3, -FONDO_M)]))
    vacio = np.zeros((0, 3, 3))
    return (np.concatenate(muros) if muros else vacio), (np.stack(fondo) if fondo else vacio)


def uv_por_cara(tri) -> np.ndarray:
    """Coordenadas de textura en metros, proyectadas según la orientación de cada cara: desde arriba en pisos y
    rampas (|nz| ≥ |nx| y |ny|), de frente en gradas y muros. Desde arriba, una cara vertical quedaría en franjas."""
    a = np.abs(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]))
    arriba = (a[:, 2] >= a[:, 0]) & (a[:, 2] >= a[:, 1])
    este_oeste = ~arriba & (a[:, 0] >= a[:, 1])
    uv = tri[:, :, [0, 2]].copy()           # caras que miran al norte o al sur: (x, z)
    uv[arriba] = tri[arriba][:, :, [0, 1]]
    uv[este_oeste] = tri[este_oeste][:, :, [1, 2]]
    return uv


def _marco_horizontal(p):
    """horizontalFrame de unificationGeometry.ts: el rectángulo mínimo de puntos (x, z) del visor, con u a lo largo."""
    unicos = sorted({(round(x, 5), round(z, 5)): (x, z) for x, z in p}.values())

    def cruz(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

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
        mejor = {'ang': mejor['ang'] + math.pi / 2, 'u0': mejor['v0'], 'u1': mejor['v1'],
                 'v0': -mejor['u1'], 'v1': -mejor['u0'], 'area': mejor['area']}
    return mejor


def adaptar_caseta(plantilla, destino: Polygon, alto: float) -> np.ndarray:
    """adaptKiosk (D-04): la forma de la plantilla, en el rectángulo y la orientación del edificio del mapa, de 0 a
    alto metros."""
    p = plantilla.reshape(-1, 3)
    vis = np.column_stack([p[:, 0], -p[:, 1]])          # (x, z) del visor
    meta = np.asarray(destino.exterior.coords)[:-1]
    de, a = _marco_horizontal(vis), _marco_horizontal(np.column_stack([meta[:, 0], -meta[:, 1]]))
    c, s, tc, ts = math.cos(de['ang']), math.sin(de['ang']), math.cos(a['ang']), math.sin(a['ang'])
    u = a['u0'] + (c * vis[:, 0] + s * vis[:, 1] - de['u0']) / (de['u1'] - de['u0']) * (a['u1'] - a['u0'])
    v = a['v0'] + (-s * vis[:, 0] + c * vis[:, 1] - de['v0']) / (de['v1'] - de['v0']) * (a['v1'] - a['v0'])
    x, z = tc * u - ts * v, ts * u + tc * v
    h = (p[:, 2] - p[:, 2].min()) / (p[:, 2].max() - p[:, 2].min()) * alto
    return np.column_stack([x, -z, h]).reshape(-1, 3, 3)


def huaca(capa_l6) -> tuple[np.ndarray, np.ndarray, list[float]]:
    """D-10: el Camino Prehispánico (capa L6). Devuelve los muros, la parte de arriba y la etiqueta [x, y, z].

    El piso del camino queda al ras o bajo el zócalo: se apoya a 4 cm para verse y no titilar con él. La etiqueta
    va sobre la parte más grande de la huella, a la altura del muro más alto.
    """
    tope = np.abs(_normales(capa_l6)[:, 2]) > 0.7
    arriba = capa_l6[tope].copy()
    bajo = arriba[:, :, 2].mean(axis=1) < 0.1
    arriba[bajo, :, 2] = np.maximum(arriba[bajo, :, 2], 0.04)
    punto = max(shapely.get_parts(huella(capa_l6)), key=lambda q: q.area).representative_point()
    etiqueta = [round(punto.x, 1), round(punto.y, 1), round(float(capa_l6[:, :, 2].max()), 1)]
    return capa_l6[~tope], arriba, etiqueta
