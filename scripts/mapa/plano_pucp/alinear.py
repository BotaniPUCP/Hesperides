"""Ubica el plano PUCP (coordenadas locales del DXF) sobre el mapa (WGS84).

Encaja el muro perimetral del plano (L5_Muro Limite) con el límite del campus de
docs/dominio/datos/fuentes-mapa/perimetro-y-veredas.geojson mediante ICP con
semejanza (giro + escala + traslación), recortando el 20 % de pares más lejanos.
Las coordenadas geográficas se llevan a un plano local en metros (ENU) centrado en
el campus; a 1 km el error de esa aproximación es de milímetros.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from rutas import FUENTES, TRABAJO  # noqa: E402,F401

# WGS84
A, E2 = 6378137.0, 6.69437999014e-3


class PlanoLocal:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        s = math.sin(math.radians(lat0))
        self.rn = A / math.sqrt(1 - E2 * s * s)
        self.rm = A * (1 - E2) / (1 - E2 * s * s) ** 1.5
        self.c = math.cos(math.radians(lat0))

    def a_metros(self, lonlat):
        lonlat = np.asarray(lonlat, float)
        return np.column_stack([np.radians(lonlat[:, 0] - self.lon0) * self.rn * self.c,
                                np.radians(lonlat[:, 1] - self.lat0) * self.rm])

    def a_grados(self, xy):
        xy = np.asarray(xy, float)
        return np.column_stack([self.lon0 + np.degrees(xy[:, 0] / (self.rn * self.c)),
                                self.lat0 + np.degrees(xy[:, 1] / self.rm)])


def muestrear(segmentos, paso=1.0):
    """Puntos cada `paso` metros a lo largo de segmentos (N x 4: x0 y0 x1 y1)."""
    puntos = []
    for x0, y0, x1, y1 in segmentos:
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / paso))
        t = np.linspace(0, 1, n, endpoint=False)
        puntos.append(np.column_stack([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]))
    return np.vstack(puntos)


def anillos_a_segmentos(anillos):
    return np.vstack([np.column_stack([a[:-1], a[1:]]) for a in anillos])


_ARBOLES = {}


def cercanos(origen, destino):
    """Índice y distancia del punto de `destino` más cercano a cada punto de `origen` (árbol KD)."""
    from scipy.spatial import cKDTree
    clave = (id(destino), len(destino))
    if clave not in _ARBOLES:
        _ARBOLES.clear()
        _ARBOLES[clave] = cKDTree(destino)
    dist, idx = _ARBOLES[clave].query(origen)
    return idx, dist


def semejanza(p, q):
    """Escala, rotación y traslación que llevan p sobre q por mínimos cuadrados (Umeyama)."""
    mp, mq = p.mean(0), q.mean(0)
    pc, qc = p - mp, q - mq
    u, s, vt = np.linalg.svd(qc.T @ pc / len(p))
    d = np.sign(np.linalg.det(u @ vt))
    r = u @ np.diag([1, d]) @ vt
    escala = (s * [1, d]).sum() / (pc ** 2).sum(1).mean()
    return escala, r, mq - escala * r @ mp


def aplicar(t, p):
    escala, r, tr = t
    return escala * (p @ r.T) + tr


def icp(origen, destino, inicial, iteraciones=60, recorte=0.8):
    t = inicial
    for _ in range(iteraciones):
        movido = aplicar(t, origen)
        idx, dist = cercanos(movido, destino)
        quedan = dist <= np.quantile(dist, recorte)
        nueva = semejanza(origen[quedan], destino[idx[quedan]])
        if np.allclose(nueva[1], t[1], atol=1e-9) and abs(nueva[0] - t[0]) < 1e-9 and np.allclose(nueva[2], t[2], atol=1e-6):
            break
        t = nueva
    return t


def punto_a_segmentos(p, seg, bloque=500):
    """Distancia exacta de cada punto a la polilínea (segmentos N x 4)."""
    a, b = seg[:, :2], seg[:, 2:]
    ab = b - a
    largo2 = np.maximum((ab ** 2).sum(1), 1e-12)
    out = np.empty(len(p))
    for i in range(0, len(p), bloque):
        q = p[i:i + bloque, None, :]
        t = np.clip(((q - a) * ab).sum(-1) / largo2, 0, 1)
        out[i:i + bloque] = np.sqrt(((a + t[..., None] * ab - q) ** 2).sum(-1)).min(1)
    return out


def main():
    lineas = np.load(TRABAJO / 'lineas.npz')
    muro = lineas['L5_Muro_Limite'][:, [0, 1, 3, 4]]

    limite = next(f for f in json.load(open(FUENTES / 'perimetro-y-veredas.geojson', encoding='utf-8'))['features']
                  if f['properties']['layer'] == 'limite_campus')
    geom = limite['geometry']
    poligonos = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    exteriores = [np.array(p[0]) for p in poligonos]
    todos = np.vstack(exteriores)
    plano = PlanoLocal(todos[:, 1].mean(), todos[:, 0].mean())
    limite_m = [plano.a_metros(a) for a in exteriores]
    seg_limite = anillos_a_segmentos(limite_m)

    origen = muestrear(muro, 1.0)
    destino = muestrear(seg_limite, 1.0)
    print(f'muro del plano: {len(muro)} líneas → {len(origen)} puntos | límite del mapa: {len(destino)} puntos')

    # Arranque: centros y ejes principales; se prueban giros de 0 y 180° y la versión espejada.
    def eje(p):
        w, v = np.linalg.eigh(np.cov((p - p.mean(0)).T))
        return math.atan2(v[1, -1], v[0, -1])

    candidatos = []
    for espejo in (False, True):
        o = origen * ([-1, 1] if espejo else [1, 1])
        for extra in (0, math.pi):
            ang = eje(destino) - eje(o) + extra
            r = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
            inicial = (1.0, r, destino.mean(0) - r @ o.mean(0))
            t = icp(o, destino, inicial)
            _, d = cercanos(aplicar(t, o), destino)
            candidatos.append((np.median(d), espejo, extra, t))
            print(f'  espejo={espejo!s:<5} giro inicial +{math.degrees(extra):>3.0f}° → mediana {np.median(d):8.2f} m, '
                  f'escala {t[0]:.5f}, giro {math.degrees(math.atan2(t[1][1, 0], t[1][0, 0])):8.3f}°')
    mediana, espejo, _, t = min(candidatos, key=lambda c: c[0])
    escala, r, tr = t
    giro = math.degrees(math.atan2(r[1, 0], r[0, 0]))

    final = aplicar(t, origen * ([-1, 1] if espejo else [1, 1]))
    d = punto_a_segmentos(final, seg_limite)
    resumen = {
        'espejado': bool(espejo),
        'escala': round(float(escala), 6),
        'giro_grados': round(giro, 4),
        'traslacion_m': [round(float(v), 3) for v in tr],
        'origen_plano_local': {'lat': plano.lat0, 'lon': plano.lon0},
        'distancia_muro_a_limite_m': {
            'mediana': round(float(np.median(d)), 2), 'p75': round(float(np.quantile(d, 0.75)), 2),
            'p90': round(float(np.quantile(d, 0.9)), 2), 'p95': round(float(np.quantile(d, 0.95)), 2),
            'max': round(float(d.max()), 2),
            'menos_de_1m': f'{(d < 1).mean():.0%}', 'menos_de_3m': f'{(d < 3).mean():.0%}'},
        'perimetro_m': {'muro_plano': round(float(np.hypot(*(muro[:, 2:] - muro[:, :2]).T).sum()), 1),
                        'limite_mapa': round(float(np.hypot(*(seg_limite[:, 2:] - seg_limite[:, :2]).T).sum()), 1)},
    }
    (TRABAJO / 'alineacion.json').write_text(json.dumps(resumen, indent=2, ensure_ascii=False), encoding='utf-8')
    np.savez(TRABAJO / 'transformacion.npz', escala=escala, r=r, tr=tr, espejo=espejo,
             lat0=plano.lat0, lon0=plano.lon0)
    np.save(TRABAJO / 'muro_distancias.npy', np.column_stack([final, d]))
    print(json.dumps(resumen, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
