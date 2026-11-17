"""Música de fondo original para el video de la historia, sintetizada: sin licencias de terceros.

Tres secciones que siguen la historia: mañana tranquila, problema más melancólico y, desde que
aparece Hespo, completa y luminosa. Determinista (semilla fija): cada ejecución da el mismo WAV.

Uso: python scripts/generar_musica.py [--salida public/musica/historia.wav] [--duracion 80]
"""

import argparse
import wave
from pathlib import Path

import numpy as np

TASA = 44100
BPM = 92
PULSO = 60 / BPM
COMPAS = 4 * PULSO

# Notas en Hz (afinación temperada, La4 = 440).
def nota(nombre: str) -> float:
    orden = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    octava = int(nombre[-1])
    return 440.0 * 2 ** ((orden[nombre[0]] + 12 * (octava - 4)) / 12)

ACORDES = {
    "G": ["G3", "B3", "D4"],
    "D": ["D3", "F4", "A3"],  # F4 se corrige a F#: abajo
    "Em": ["E3", "G3", "B3"],
    "C": ["C3", "E3", "G3"],
}
FSOSTENIDO = lambda f: f * 2 ** (1 / 12)
PENTATONICA = ["G4", "A4", "B4", "D5", "E5", "G5"]
PENTATONICA_GRAVE = ["E4", "G4", "A4", "B4", "D5"]


def frecuencias(acorde: str) -> list[float]:
    fs = [nota(n) for n in ACORDES[acorde]]
    if acorde == "D":
        fs[1] = FSOSTENIDO(nota("F3"))  # F#3
    return fs


def envolvente(n: int, ataque: float, caida: float) -> np.ndarray:
    t = np.arange(n) / TASA
    env = np.minimum(1.0, t / max(ataque, 1e-4))
    return env * np.exp(-t / caida)


def pad(frecs: list[float], dur: float) -> np.ndarray:
    n = int(dur * TASA)
    t = np.arange(n) / TASA
    s = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in frecs)
    ataque = np.minimum(1.0, t / 0.5)
    salida = np.minimum(1.0, (dur - t) / 0.4)
    return s * ataque * np.clip(salida, 0, 1) / len(frecs)


def marimba(f: float, dur: float = 0.6) -> np.ndarray:
    n = int(dur * TASA)
    t = np.arange(n) / TASA
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return s * envolvente(n, 0.004, 0.22)


def bajo(f: float, dur: float) -> np.ndarray:
    n = int(dur * TASA)
    t = np.arange(n) / TASA
    return (np.sin(2 * np.pi * f / 2 * t) + 0.3 * np.sin(2 * np.pi * f * t)) * envolvente(n, 0.01, 0.5)


def shaker(rng: np.random.Generator) -> np.ndarray:
    n = int(0.09 * TASA)
    ruido = rng.standard_normal(n)
    ruido = np.diff(ruido, prepend=0)  # agudos: deriva el ruido
    return ruido * envolvente(n, 0.005, 0.025)


def sumar(destino: np.ndarray, sonido: np.ndarray, inicio: float, ganancia: float, paneo: float = 0.0):
    i = int(inicio * TASA)
    if i >= destino.shape[0]:
        return
    fin = min(destino.shape[0], i + len(sonido))
    trozo = sonido[: fin - i] * ganancia
    destino[i:fin, 0] += trozo * (1 - paneo) / 1.0
    destino[i:fin, 1] += trozo * (1 + paneo) / 1.0


def generar(duracion: float) -> np.ndarray:
    rng = np.random.default_rng(2026)
    mezcla = np.zeros((int(duracion * TASA), 2))
    compases = int(np.ceil(duracion / COMPAS))
    for c in range(compases):
        t0 = c * COMPAS
        if t0 < 14:
            seccion, progresion = "manana", ["G", "D", "Em", "C"]
        elif t0 < 33:
            seccion, progresion = "problema", ["Em", "C", "G", "D"]
        else:
            seccion, progresion = "solucion", ["G", "D", "Em", "C"]
        acorde = progresion[c % 4]
        frecs = frecuencias(acorde)
        sumar(mezcla, pad(frecs, COMPAS), t0, 0.16 if seccion != "problema" else 0.19)
        if seccion != "manana":
            for b in (0, 2):
                sumar(mezcla, bajo(frecs[0], PULSO * 1.8), t0 + b * PULSO, 0.22)
        escala = PENTATONICA_GRAVE if seccion == "problema" else PENTATONICA
        probabilidad = {"manana": 0.35, "problema": 0.25, "solucion": 0.6}[seccion]
        for octavo in range(8):
            if rng.random() < probabilidad:
                f = nota(escala[rng.integers(len(escala))])
                sumar(mezcla, marimba(f), t0 + octavo * PULSO / 2, 0.2, paneo=0.3 if octavo % 2 else -0.3)
        if seccion == "solucion":
            for octavo in range(1, 8, 2):
                sumar(mezcla, shaker(rng), t0 + octavo * PULSO / 2, 0.05)
    # Fundidos de entrada y salida.
    t = np.arange(mezcla.shape[0]) / TASA
    mezcla *= np.clip(t / 1.5, 0, 1)[:, None] * np.clip((duracion - t) / 3.0, 0, 1)[:, None]
    return mezcla / np.max(np.abs(mezcla)) * 0.7


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", default="public/musica/historia.wav")
    parser.add_argument("--duracion", type=float, default=80.0)
    args = parser.parse_args()
    datos = (generar(args.duracion) * 32767).astype(np.int16)
    salida = Path(args.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(salida), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(TASA)
        w.writeframes(datos.tobytes())
    print(f"{salida}: {args.duracion:.1f} s")


if __name__ == "__main__":
    main()
