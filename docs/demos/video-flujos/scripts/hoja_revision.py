"""Arma la hoja de contactos de una corrida de scripts/revisar.ts (miniaturas con su etiqueta).

Uso: python scripts/hoja_revision.py out/revision/corrida-N/hoja.json
"""
import json
import math
import sys

from PIL import Image, ImageDraw, ImageFont

ANCHO, ALTO, COLUMNAS, ROTULO = 480, 270, 4, 26


def fuente(tamano: int):
    for nombre in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            continue
    return ImageFont.load_default()


def main(ruta: str) -> None:
    with open(ruta, encoding="utf-8") as f:
        datos = json.load(f)
    cuadros = datos["cuadros"]
    filas = math.ceil(len(cuadros) / COLUMNAS)
    hoja = Image.new("RGB", (COLUMNAS * ANCHO, 40 + filas * (ALTO + ROTULO)), "white")
    dibujo = ImageDraw.Draw(hoja)
    dibujo.text((10, 8), datos["titulo"], fill="black", font=fuente(22))
    letra = fuente(17)
    for i, c in enumerate(cuadros):
        x = (i % COLUMNAS) * ANCHO
        y = 40 + (i // COLUMNAS) * (ALTO + ROTULO)
        with Image.open(c["archivo"]) as img:
            hoja.paste(img.convert("RGB").resize((ANCHO, ALTO), Image.LANCZOS), (x, y))
        dibujo.text((x + 6, y + ALTO + 3), c["etiqueta"], fill="black", font=letra)
    hoja.save(datos["salida"])


if __name__ == "__main__":
    main(sys.argv[1])
