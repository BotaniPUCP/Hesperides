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
from PIL import Image, ImageDraw, ImageOps

PX_POR_M = 40
LADO_MAX_PX = 560   # un tramo nunca pasa de esto: el atlas debe caber en 4096 × 4096 (celulares)
ATLAS_ANCHO = 4096
CLAVE = (255, 0, 255)


def coeficientes(destino, origen):
    """Los 8 coeficientes de PIL.PERSPECTIVE: llevan cada punto de salida a su punto en la foto."""
    a, b = [], []
    for (x, y), (u, v) in zip(destino, origen):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(a, float), np.array(b, float)).tolist()


MINIATURA = (760, 570)


def miniatura_a_foto(puntos, tamano):
    """Esquinas medidas sobre la miniatura de la hoja de contacto (la foto reducida a caber en 760 × 570)."""
    k = min(MINIATURA[0] / tamano[0], MINIATURA[1] / tamano[1])
    return [[x / k, y / k] for x, y in puntos]


def enderezar(foto, t):
    """Quita la perspectiva del cuadrilátero; `ajuste` corrige lo que quede inclinado (pares origen→destino en el
    tramo ya enderezado) y `recorte` [x0, x1] se queda con la franja útil, que mide `anchoM`."""
    total_m = t.get('anchoTotalM', t['anchoM'])
    escala = min(PX_POR_M, LADO_MAX_PX / max(total_m, t['altoM']))
    w, h = round(total_m * escala), round(t['altoM'] * escala)
    if 'tapar' in t:
        foto = foto.copy()
        d = ImageDraw.Draw(foto)
        for caja in t['tapar']:
            d.rectangle(caja, fill=CLAVE)
    quad = t['quad'] if 'quad' in t else miniatura_a_foto(t['quadMiniatura'], foto.size)
    im = foto.transform((w, h), Image.PERSPECTIVE, coeficientes([(0, 0), (w, 0), (w, h), (0, h)], quad), Image.BICUBIC)
    if 'ajuste' in t:
        k = escala / 64  # los pares del ajuste se midieron a 64 px por metro
        origen, destino = zip(*[([x * k, y * k], [u * k, v * k]) for (x, y), (u, v) in t['ajuste']])
        im = im.transform((w, h), Image.PERSPECTIVE, coeficientes(destino, origen), Image.BICUBIC)
    if 'recorte' in t:
        x0, x1 = t['recorte']
        x0, x1 = x0 * escala / 64, x1 * escala / 64  # el recorte se midió a 64 px por metro
        im = im.crop((round(x0), 0, round(x1), h)).resize((round(t['anchoM'] * escala), h), Image.BICUBIC)
    if 'recorteArriba' in t:
        im = im.crop((0, round(t['recorteArriba'] * escala / 64), im.size[0], im.size[1]))
    return im


def igualar(im, referencia, peso=0.8):
    """Lleva media y desvío de cada canal hacia los de la referencia: dos fotos del mismo ladrillo con distinta luz
    o distinto procesado del teléfono terminan del mismo color."""
    a, r = np.asarray(im, float), np.asarray(referencia, float)
    ma, sa = a.mean((0, 1)), a.std((0, 1)) + 1e-6
    mr, sr = r.mean((0, 1)), r.std((0, 1))
    b = (a - ma) / sa * sr + mr
    return Image.fromarray(np.clip(a * (1 - peso) + b * peso, 0, 255).astype(np.uint8))


def ensanchar(m, veces=2):
    """Unos píxeles más alrededor de la máscara, por el filtrado de la textura."""
    for _ in range(veces):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


def rellenar_por_filas(a, hueco):
    """Cada píxel del hueco toma el válido más cercano de su misma fila: las fachadas van en bandas horizontales
    (pisos, ventanas), así que un árbol delante se cubre con la continuación de su banda y no con un color plano."""
    a = a.copy()
    x = np.arange(a.shape[1])
    for y in range(a.shape[0]):
        ok = ~hueco[y]
        if ok.all() or not ok.any():
            continue
        xs = x[ok]
        i = np.clip(np.searchsorted(xs, x), 1, len(xs) - 1) if len(xs) > 1 else np.zeros_like(x)
        izq, der = xs[np.maximum(i - 1, 0)], xs[i]
        cerca = np.where(np.abs(x - izq) <= np.abs(der - x), izq, der)
        a[y, hueco[y]] = a[y, cerca[hueco[y]]]
    return a


def fondo(im):
    """Lo que no es edificio en un tramo: el cielo (claro y sin color, unido al borde de arriba), que se pinta con
    el color clave para que el shader ponga el muro, y el follaje (verde que domina), que se rellena por filas."""
    a = np.asarray(im, float) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hi, lo = a.max(-1), a.min(-1)
    claro = (hi > 0.82) & (hi - lo < 0.12)
    # cielo es lo claro unido al borde de arriba: un muro blanco a media fachada no lo es
    cielo = np.zeros_like(claro)
    cielo[0] = claro[0]
    while True:
        crece = claro & (cielo | np.roll(cielo, 1, 0) | np.roll(cielo, 1, 1) | np.roll(cielo, -1, 1))
        if (crece == cielo).all():
            break
        cielo = crece
    verde = (g > r + 0.04) & (g > b + 0.02)
    return ensanchar(cielo), ensanchar(verde)


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
    for clave, (cielo, verde) in mascaras.items():
        a = rellenar_por_filas(np.asarray(imagenes[clave]), verde & ~cielo)
        a[cielo] = CLAVE
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
    alto = (y + alto_fila + 3) // 4 * 4
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
