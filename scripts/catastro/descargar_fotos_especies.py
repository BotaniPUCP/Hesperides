#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descarga las 230 fotografías de especies desde Wikimedia Commons
y las deposita en la bandeja inbox/species-photos/ junto con fotos-especies.csv,
listas para ser procesadas por SpeciesPhotoInboxService (SPEC-104).

Uso:
    py scripts/catastro/descargar_fotos_especies.py
"""

import csv
import os
import shutil
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CSV_ORIGEN = BASE_DIR / "docs" / "dominio" / "datos" / "fotos-especies-creditos.csv"
INBOX_DIR = BASE_DIR / "inbox" / "species-photos"

USER_AGENT = "HesperidesBot/1.0 (hesperides@pucp.edu.pe; PUCP DP2 educational project)"


def extraer_nombre_archivo_wiki(fuente_url: str) -> str:
    """Extrae el nombre del archivo de Wikimedia Commons a partir de su URL de ficha."""
    partes = fuente_url.split("File:")
    if len(partes) < 2:
        return ""
    nombre = partes[1].split("&")[0].split("?")[0]
    return urllib.parse.unquote(nombre)


def main():
    if not CSV_ORIGEN.exists():
        print(f"Error: No se encontró el archivo de origen en {CSV_ORIGEN}")
        sys.exit(1)

    INBOX_DIR.mkdir(parents=True, exist_ok=True)

    # Copiar fotos-especies.csv a la bandeja requerida por InboxFolder.java
    csv_destino = INBOX_DIR / "fotos-especies.csv"
    shutil.copyfile(CSV_ORIGEN, csv_destino)
    print(f"Copiado {csv_destino.name} a {INBOX_DIR}")

    with open(CSV_ORIGEN, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        filas = list(reader)

    total = len(filas)
    print(f"Procesando {total} fotos de especies para la bandeja local...\n")

    descargadas = 0
    omitidas = 0
    fallidas = 0

    for i, fila in enumerate(filas, start=1):
        nombre_archivo = fila.get("foto", "").strip()
        fuente_url = fila.get("fuente", "").strip()
        especie = fila.get("nombre_cientifico", "").strip()

        if not nombre_archivo or not fuente_url:
            continue

        destino = INBOX_DIR / nombre_archivo

        # Idempotencia: Si ya fue descargada y no está vacía, no volver a descargar
        if destino.exists() and destino.stat().st_size > 1024:
            omitidas += 1
            continue

        nombre_wiki = extraer_nombre_archivo_wiki(fuente_url)
        if not nombre_wiki:
            print(f"[{i}/{total}] Advertencia: no se pudo extraer nombre wiki de {fuente_url}")
            fallidas += 1
            continue

        # Usar Special:FilePath de Wikimedia Commons con ancho maximo 1600px (SPEC-104)
        nombre_wiki_enc = urllib.parse.quote(nombre_wiki.replace(" ", "_"))
        url_descarga = f"https://commons.wikimedia.org/wiki/Special:FilePath/{nombre_wiki_enc}?width=1600"

        req = urllib.request.Request(
            url_descarga,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "image/webp,image/apng,image/*,*/*",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    data = resp.read()
                    with open(destino, "wb") as out:
                        out.write(data)
                    descargadas += 1
                    print(f"[{i}/{total}] OK: {nombre_archivo} ({especie}) - {len(data) // 1024} KB")
                else:
                    print(f"[{i}/{total}] Error HTTP {resp.status} al descargar {nombre_archivo}")
                    fallidas += 1
        except Exception as e:
            print(f"[{i}/{total}] Error al descargar {nombre_archivo}: {e}")
            fallidas += 1

        # Cortesía con la API de Wikimedia para no ser bloqueados por rate limit
        time.sleep(0.15)

    print("\n" + "=" * 50)
    print(f"Resumen de descarga:")
    print(f"  Descargadas nuevas: {descargadas}")
    print(f"  Ya existentes (omitidas): {omitidas}")
    print(f"  Fallos: {fallidas}")
    print(f"  Directorio destino: {INBOX_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
