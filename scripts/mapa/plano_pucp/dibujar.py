"""Dibuja en PNG (sin librerías de gráficos) capas del plano ya ubicado y del mapa actual.

Uso: python dibujar.py salida.png [escala_px_m] [xmin ymin xmax ymax]
"""
import json
import struct
import sys
import zlib
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from alinear import FUENTES, PlanoLocal, anillos_a_segmentos  # noqa: E402

from rutas import TRABAJO  # noqa: E402


def transformacion():
    t = np.load(TRABAJO / 'transformacion.npz')
    espejo = bool(t['espejo'])
    return (lambda p: float(t['escala']) * ((p * ([-1, 1] if espejo else [1, 1])) @ t['r'].T) + t['tr'],
            PlanoLocal(float(t['lat0']), float(t['lon0'])))


def segmentos_plano(capa, mover, solo_horizontales=True, z=None):
    lineas = np.load(TRABAJO / 'lineas.npz')[capa]
    if solo_horizontales:
        lineas = lineas[np.abs(lineas[:, 2] - lineas[:, 5]) < 0.01]
    if z is not None:
        lineas = lineas[np.abs(lineas[:, 2] - z) < 0.05]
    return np.column_stack([mover(lineas[:, [0, 1]]), mover(lineas[:, [3, 4]])])


def segmentos_geojson(nombre, plano, filtro=lambda f: True):
    datos = json.load(open(FUENTES / nombre, encoding='utf-8'))
    anillos = []
    for f in datos['features']:
        if not filtro(f):
            continue
        g = f['geometry']
        polis = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for p in polis:
            anillos += [plano.a_metros(np.array(a)) for a in p]
    return anillos_a_segmentos(anillos) if anillos else np.zeros((0, 4))


def dibujar(ruta, capas, px_m=1.5, caja=None):
    """capas: lista de (segmentos N x 4 en metros, color rgb, grosor_px)."""
    if caja is None:
        todo = np.vstack([s[:, :2] for s, _, _ in capas if len(s)] + [s[:, 2:] for s, _, _ in capas if len(s)])
        caja = (*todo.min(0) - 10, *todo.max(0) + 10)
    x0, y0, x1, y1 = caja
    w, h = int((x1 - x0) * px_m) + 1, int((y1 - y0) * px_m) + 1
    img = np.full((h, w, 3), 255, np.uint8)
    for seg, color, grosor in capas:
        if not len(seg):
            continue
        largo = np.hypot(seg[:, 2] - seg[:, 0], seg[:, 3] - seg[:, 1])
        n = np.maximum(2, (largo * px_m * 2).astype(int))
        rep = np.repeat(np.arange(len(seg)), n)
        t = np.concatenate([np.linspace(0, 1, k) for k in n])
        xs = ((seg[rep, 0] + (seg[rep, 2] - seg[rep, 0]) * t) - x0) * px_m
        ys = (y1 - (seg[rep, 1] + (seg[rep, 3] - seg[rep, 1]) * t)) * px_m
        for dx in range(-(grosor // 2), grosor - grosor // 2):
            for dy in range(-(grosor // 2), grosor - grosor // 2):
                xi, yi = (xs + dx).astype(int), (ys + dy).astype(int)
                ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
                img[yi[ok], xi[ok]] = color
    raw = b''.join(b'\x00' + img[y].tobytes() for y in range(h))

    def chunk(tipo, datos):
        return struct.pack('>I', len(datos)) + tipo + datos + struct.pack('>I', zlib.crc32(tipo + datos) & 0xffffffff)
    Path(ruta).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))
    return w, h


if __name__ == '__main__':
    mover, plano = transformacion()
    px = float(sys.argv[2]) if len(sys.argv) > 2 else 1.5
    caja = tuple(map(float, sys.argv[3:7])) if len(sys.argv) > 6 else None
    capas = [
        (segmentos_geojson('edificios-osm.geojson', plano), (90, 150, 255), 2),
        (segmentos_plano('L3_Huellas_Edificios', mover, z=91.44), (0, 0, 0), 1),
        (segmentos_plano('L5_Muro_Limite', mover), (255, 150, 0), 1),
        (segmentos_geojson('perimetro-y-veredas.geojson', plano, lambda f: f['properties']['layer'] == 'limite_campus'),
         (220, 0, 0), 2),
    ]
    print(dibujar(sys.argv[1], capas, px, caja))
