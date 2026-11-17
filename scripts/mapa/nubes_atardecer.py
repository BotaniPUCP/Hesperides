"""
Máscara de nubes del modo Atardecer del mapa (frontend/public/map/sunset/clouds.webp).

Fuente: «Kloppenheim 06 (Pure Sky)» de Poly Haven, de Greg Zaal y Jarod Guest, CC0
(https://polyhaven.com/a/kloppenheim_06_puresky), el JPG tonemapeado de 8192 × 4096.
Del panorama se toma la mitad de arriba: la nube es lo menos azul que el cielo de su
alrededor, o lo que se aparta de él en brillo. Guarda el brillo de la nube respecto
del cielo (R) y la máscara (G); el shader las colorea con la paleta del atardecer.

Uso: python nubes_atardecer.py kloppenheim_06_puresky.jpg nubes_rg.png vista_previa.png
Después, de nubes_rg.png se recorta de 0° a 45° de elevación (filas 512 a 1024) y se
guarda como WebP con alfa: luminancia = brillo, alfa = máscara.
"""
import sys
from PIL import Image
import numpy as np

Image.MAX_IMAGE_PIXELS = None


def box(x, r, axis):
    # Caja de radio r a lo largo de un eje; en horizontal, con vuelta (el panorama es continuo).
    if axis == 1:
        p = np.concatenate([x[:, -r - 1:], x, x[:, :r]], axis=1)
    else:
        p = np.concatenate([np.repeat(x[:1], r + 1, 0), x, np.repeat(x[-1:], r, 0)], axis=0)
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    if axis == 1:
        return ((c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)).astype(np.float32)
    return ((c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)).astype(np.float32)


def blur(x, s):
    r = max(1, int(round(s * 0.9)))
    for _ in range(3):
        x = box(box(x, r, 1), r, 0)
    return x


src, out, prev = sys.argv[1:4]
im = Image.open(src).convert('RGB')
W, H = im.size
up = im.crop((0, 0, W, H // 2)).resize((4096, 1024), Image.LANCZOS)
a = np.asarray(up).astype(np.float32) / 255
R, G, B = a[..., 0], a[..., 1], a[..., 2]
lum = 0.2126 * R + 0.7152 * G + 0.0722 * B
blue = (B - R) / (B + 0.05)


def mask(bb, bl):
    m = np.clip(((bb - blue) - 0.04) / 0.12, 0, 1)
    return np.maximum(m, np.clip((np.abs(lum - bl) - 0.05) / 0.1, 0, 1) * 0.8)


# Cielo de referencia: el suavizado local, en dos pasadas (la segunda sin las nubes de la primera).
m = mask(blur(blue, 45), blur(lum, 45))
w = 1 - m
wb = np.maximum(blur(w, 45), 1e-3)
bb, bl = blur(blue * w, 45) / wb, blur(lum * w, 45) / wb
m = blur(mask(bb, bl), 1)
shade = np.clip(0.5 + (lum - bl) * 1.8, 0, 1)
print('mask mean', float(m.mean()))
Image.fromarray((np.stack([shade, m, np.zeros_like(m)], -1) * 255).astype(np.uint8)).save(out)


def small(x):
    return np.stack([np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((1024, 256)))] * 3, -1)


Image.fromarray(np.concatenate([np.asarray(up.resize((1024, 256))), small(m), small(shade * m)], 0)).save(prev)
