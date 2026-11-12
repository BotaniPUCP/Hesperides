"""Endereza tramos de fachada de las fotos y los junta en un atlas (prueba de SPEC-109 con fotos reales).

Uso, desde la raíz del repositorio:
  python scripts/mapa/colores_reales/enderezar.py scripts/mapa/colores_reales/tramos.json <carpeta edificios-pucp>
    frontend/public/models/real-look/atlas.jpg frontend/src/components/map3d/realLook/looks/atlas.json
tramos.json: {"id": {"foto": "carpeta/archivo.jpg", "quad": [[x,y] TL, TR, BR, BL], "anchoM": 12, "altoM": 16}}
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

PX_POR_M = 64
ATLAS_ANCHO = 2048


def coeficientes(destino, origen):
    """Los 8 coeficientes de PIL.PERSPECTIVE: llevan cada punto de salida a su punto en la foto."""
    a, b = [], []
    for (x, y), (u, v) in zip(destino, origen):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(a, float), np.array(b, float)).tolist()


def enderezar(foto, t):
    """Quita la perspectiva del cuadrilátero; `ajuste` corrige lo que quede inclinado (pares origen→destino en el
    tramo ya enderezado) y `recorte` [x0, x1] se queda con la franja útil, que mide `anchoM`."""
    total_m = t.get('anchoTotalM', t['anchoM'])
    w, h = round(total_m * PX_POR_M), round(t['altoM'] * PX_POR_M)
    im = foto.transform((w, h), Image.PERSPECTIVE, coeficientes([(0, 0), (w, 0), (w, h), (0, h)], t['quad']), Image.BICUBIC)
    if 'ajuste' in t:
        origen, destino = zip(*t['ajuste'])
        im = im.transform((w, h), Image.PERSPECTIVE, coeficientes(destino, origen), Image.BICUBIC)
    if 'recorte' in t:
        x0, x1 = t['recorte']
        im = im.crop((x0, 0, x1, h)).resize((round(t['anchoM'] * PX_POR_M), h), Image.BICUBIC)
    if 'recorteArriba' in t:
        im = im.crop((0, t['recorteArriba'], im.size[0], im.size[1]))
    return im


def main(tramos_json, raiz, atlas_jpg, atlas_json):
    tramos = json.loads(Path(tramos_json).read_text(encoding='utf-8'))
    imagenes = {}
    for clave, t in tramos.items():
        foto = ImageOps.exif_transpose(Image.open(Path(raiz) / t['foto'])).convert('RGB')
        imagenes[clave] = enderezar(foto, t)
    # estantes: de izquierda a derecha, una fila nueva cuando no cabe
    x = y = alto_fila = 0
    lugares = {}
    for clave, im in sorted(imagenes.items(), key=lambda kv: -kv[1].size[1]):
        if x + im.size[0] > ATLAS_ANCHO:
            x, y, alto_fila = 0, y + alto_fila, 0
        lugares[clave] = (x, y)
        x += im.size[0]
        alto_fila = max(alto_fila, im.size[1])
    alto = 1 << (y + alto_fila - 1).bit_length()
    atlas = Image.new('RGB', (ATLAS_ANCHO, alto), (128, 128, 128))
    salida = {}
    for clave, (px, py) in lugares.items():
        im = imagenes[clave]
        atlas.paste(im, (px, py))
        # en coordenadas de textura (v hacia arriba en WebGL con flipY): fila de abajo = v0
        salida[clave] = [px / ATLAS_ANCHO, 1 - (py + im.size[1]) / alto, im.size[0] / ATLAS_ANCHO, im.size[1] / alto]
    atlas.save(atlas_jpg, quality=88)
    Path(atlas_json).write_text(json.dumps(salida, indent=2) + '\n', encoding='utf-8')
    print('atlas', atlas.size, {k: v.size for k, v in imagenes.items()})


if __name__ == '__main__':
    main(*sys.argv[1:])
