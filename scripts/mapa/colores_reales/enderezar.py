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


def igualar(im, referencia, peso=0.8):
    """Lleva media y desvío de cada canal hacia los de la referencia: dos fotos del mismo ladrillo con distinta luz
    o distinto procesado del teléfono terminan del mismo color."""
    a, r = np.asarray(im, float), np.asarray(referencia, float)
    ma, sa = a.mean((0, 1)), a.std((0, 1)) + 1e-6
    mr, sr = r.mean((0, 1)), r.std((0, 1))
    b = (a - ma) / sa * sr + mr
    return Image.fromarray(np.clip(a * (1 - peso) + b * peso, 0, 255).astype(np.uint8))


CLAVE = (255, 0, 255)


def fondo(im):
    """Lo que no es edificio en un tramo: cielo (claro y sin color) y follaje (verde que domina). Se pinta con el
    color clave, que el shader reemplaza por lo que sigue fuera del tramo; se ensancha 2 px por el filtrado."""
    a = np.asarray(im, float) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hi, lo = a.max(-1), a.min(-1)
    cielo = (hi > 0.82) & (hi - lo < 0.12)
    verde = (g > r + 0.04) & (g > b + 0.02)
    m = cielo | verde
    for _ in range(2):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


def main(tramos_json, raiz, atlas_jpg, atlas_json):
    tramos = json.loads(Path(tramos_json).read_text(encoding='utf-8'))
    imagenes = {}
    for clave, t in tramos.items():
        foto = ImageOps.exif_transpose(Image.open(Path(raiz) / t['foto'])).convert('RGB')
        imagenes[clave] = enderezar(foto, t)
    mascaras = {clave: fondo(imagenes[clave]) for clave, t in tramos.items() if t.get('quitarFondo')}
    for clave, t in tramos.items():
        if 'igualarA' in t:
            imagenes[clave] = igualar(imagenes[clave], imagenes[t['igualarA']])
    for clave, m in mascaras.items():
        a = np.asarray(imagenes[clave]).copy()
        a[m] = CLAVE
        imagenes[clave] = Image.fromarray(a)
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
