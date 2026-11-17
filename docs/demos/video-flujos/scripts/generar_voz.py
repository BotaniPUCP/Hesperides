"""Genera un MP3 por frase del guion y el manifiesto que usa el video.

Solo se genera lo que cambió: una frase se reutiliza si su archivo existe y
coinciden la voz y el texto guardados en el manifiesto.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Awaitable, Callable

RAIZ = Path(__file__).resolve().parent.parent

# texto, voz, destino y velocidad opcional de edge-tts («+10%»).
Sintetizar = Callable[..., Awaitable[None]]
Medir = Callable[[Path], float]


class VozNoDisponible(Exception):
    """El servicio no ofrece la voz pedida: no se cambia de acento en silencio."""


class ErrorDeVoz(Exception):
    """No se pudo generar una frase."""

    def __init__(self, frase_id: str, causa: BaseException):
        super().__init__(f"Falló la frase {frase_id}: {causa}")
        self.frase_id = frase_id


def cargar_guion(ruta: Path) -> dict:
    return json.loads(ruta.read_text(encoding="utf-8"))


def texto_de_frase(frase: dict) -> str:
    return frase.get("textoVoz") or frase["texto"]


def comprobar_voz(voz: str, disponibles: list[str]) -> None:
    if voz not in disponibles:
        raise VozNoDisponible(f"La voz {voz} no está disponible")


def _leer_manifiesto(ruta: Path, voz: str, velocidad: str | None) -> dict:
    if ruta.exists():
        manifiesto = json.loads(ruta.read_text(encoding="utf-8"))
        if manifiesto["voz"] == voz and manifiesto.get("velocidad") == velocidad:
            return manifiesto
    # Otra voz u otra velocidad: se regenera todo.
    return {"voz": voz, "frases": {}, **({"velocidad": velocidad} if velocidad else {})}


def _guardar_manifiesto(ruta: Path, manifiesto: dict) -> None:
    temporal = ruta.with_suffix(".json.tmp")
    temporal.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporal, ruta)


async def generar(
    guion: dict,
    ruta_manifiesto: Path,
    salida: Path,
    sintetizar: Sintetizar,
    medir: Medir,
    solo: set[str] | None = None,
) -> dict:
    voz = guion["voz"]
    velocidad = guion.get("velocidad")
    salida.mkdir(parents=True, exist_ok=True)
    manifiesto = _leer_manifiesto(ruta_manifiesto, voz, velocidad)

    for frase in (f for escena in guion["escenas"] for f in escena["frases"]):
        frase_id = frase["id"]
        if solo is not None and frase_id not in solo:
            continue

        texto = texto_de_frase(frase)
        archivo = f"{frase_id}.mp3"
        destino = salida / archivo
        previa = manifiesto["frases"].get(frase_id)
        if previa and previa["texto"] == texto and destino.exists():
            continue

        # Un audio solo toma su nombre definitivo si terminó entero.
        temporal = destino.with_suffix(".mp3.tmp")
        try:
            await (sintetizar(texto, voz, temporal, velocidad) if velocidad else sintetizar(texto, voz, temporal))
            duracion = medir(temporal)
            os.replace(temporal, destino)
        except Exception as causa:
            temporal.unlink(missing_ok=True)
            raise ErrorDeVoz(frase_id, causa) from causa

        manifiesto["frases"][frase_id] = {"archivo": archivo, "duracion": duracion, "texto": texto}
        _guardar_manifiesto(ruta_manifiesto, manifiesto)

    _guardar_manifiesto(ruta_manifiesto, manifiesto)
    return manifiesto


async def _sintetizar_con_edge(texto: str, voz: str, destino: Path, velocidad: str | None = None) -> None:
    import edge_tts

    await edge_tts.Communicate(texto, voz, rate=velocidad or "+0%").save(str(destino))


def _medir_mp3(ruta: Path) -> float:
    from mutagen.mp3 import MP3

    return MP3(ruta).info.length


async def _voces_disponibles() -> list[str]:
    import edge_tts

    return [voz["ShortName"] for voz in await edge_tts.list_voices()]


def _leer_argumentos(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--guion", default="guion.json", help="Guion del video, relativo al proyecto")
    parser.add_argument("--voz", help="Reemplaza la voz del guion")
    parser.add_argument("--salida", default="public/voz", help="Carpeta de los audios")
    parser.add_argument("--solo", help="Identificadores separados por coma")
    return parser.parse_args(argv)


async def _principal() -> int:
    argumentos = _leer_argumentos()
    guion = cargar_guion(RAIZ / argumentos.guion)
    if argumentos.voz:
        guion["voz"] = argumentos.voz

    try:
        comprobar_voz(guion["voz"], await _voces_disponibles())
    except VozNoDisponible as error:
        print(error, file=sys.stderr)
        return 2

    salida = RAIZ / argumentos.salida
    solo = set(argumentos.solo.split(",")) if argumentos.solo else None
    try:
        manifiesto = await generar(guion, salida / "manifiesto.json", salida, _sintetizar_con_edge, _medir_mp3, solo)
    except ErrorDeVoz as error:
        print(error, file=sys.stderr)
        return 1

    print(f"{len(manifiesto['frases'])} frases con voz {manifiesto['voz']} en {salida}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(asyncio.run(_principal()))
