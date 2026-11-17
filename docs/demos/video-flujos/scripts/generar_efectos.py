"""Efectos de sonido originales para el video de la historia, sintetizados: sin sonidos de terceros.

Suaves, para ir debajo de la voz: whoosh (cambio de escena), clic (tocar en el celular o la
laptop), pop (Hespo brota), ding (aparece el pin o un check), sello (golpe sordo del sello) y
crujido (la rama que se raja). Deterministas (semillas fijas): cada ejecución da los mismos WAV.

Uso: python scripts/generar_efectos.py [--salida public/efectos]
"""

import argparse
import json
import wave
from pathlib import Path

import numpy as np

TASA = 44100
VERSION = 1


def _t(dur: float) -> np.ndarray:
    return np.arange(int(dur * TASA)) / TASA


def _paso_bajo(x: np.ndarray, corte: np.ndarray | float) -> np.ndarray:
    """Filtro de un polo con corte (Hz) que puede variar en el tiempo."""
    corte = np.broadcast_to(np.asarray(corte, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * corte / TASA)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def _cerrar(s: np.ndarray, ms: float = 6.0) -> np.ndarray:
    """Rampa corta al final y al inicio: sin clics de borde."""
    n = max(1, int(TASA * ms / 1000))
    s = s.copy()
    s[:n] *= np.linspace(0, 1, n)
    s[-n:] *= np.linspace(1, 0, n)
    return s


def _normalizar(s: np.ndarray, pico: float) -> np.ndarray:
    return s / np.max(np.abs(s)) * pico


def whoosh(rng: np.random.Generator) -> np.ndarray:
    t = _t(0.7)
    u = t / t[-1]
    ruido = rng.standard_normal(len(t))
    # El filtro se abre y se cierra con la envolvente: aire que pasa.
    corte = 300 + 2200 * np.sin(np.pi * u) ** 2
    s = _paso_bajo(ruido, corte) - _paso_bajo(ruido, 120.0)
    return _cerrar(_normalizar(s * np.sin(np.pi * u) ** 3, 0.22))


def clic() -> np.ndarray:
    t = _t(0.05)
    s = np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) + 0.5 * np.sin(2 * np.pi * 1100 * t) * np.exp(-t / 0.01)
    return _cerrar(_normalizar(s, 0.3), 3)


def pop() -> np.ndarray:
    t = _t(0.22)
    # Tono que sube rápido, como algo que brota; cola corta.
    f = 260 + 520 * (1 - np.exp(-t / 0.03))
    fase = 2 * np.pi * np.cumsum(f) / TASA
    s = np.sin(fase) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.06)
    return _cerrar(_normalizar(s, 0.32))


def ding() -> np.ndarray:
    t = _t(1.3)
    base = 1318.5  # Mi6: brillante pero suave
    parciales = [(1.0, 1.0, 0.5), (2.76, 0.35, 0.25), (5.4, 0.12, 0.12)]
    s = sum(a * np.sin(2 * np.pi * base * k * t) * np.exp(-t / d) for k, a, d in parciales)
    s *= 1 - np.exp(-t / 0.002)
    return _cerrar(_normalizar(s, 0.22), 20)


def sello(rng: np.random.Generator) -> np.ndarray:
    t = _t(0.4)
    f = 70 + 80 * np.exp(-t / 0.03)
    golpe = np.sin(2 * np.pi * np.cumsum(f) / TASA) * np.exp(-t / 0.09)
    papel = _paso_bajo(_paso_bajo(rng.standard_normal(len(t)), 500.0), 500.0) * np.exp(-t / 0.02)
    papel = papel / np.max(np.abs(papel))
    return _cerrar(_normalizar(golpe + 0.25 * papel, 0.5))


def crujido(rng: np.random.Generator) -> np.ndarray:
    t = _t(0.6)
    s = np.zeros(len(t))
    # Fibras que ceden: chasquidos cortos cada vez más espaciados y más débiles.
    momento = 0.0
    for k in range(9):
        i = int(momento * TASA)
        n = int(0.012 * TASA)
        if i + n >= len(s):
            break
        grano = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.003 * TASA))
        s[i : i + n] += grano * (0.9**k)
        momento += 0.02 + 0.05 * rng.random() * (1 + k / 4)
    s = _paso_bajo(s, 2600.0) - 0.3 * _paso_bajo(s, 200.0)
    return _cerrar(_normalizar(s, 0.38))


def generar() -> dict[str, np.ndarray]:
    return {
        "whoosh": whoosh(np.random.default_rng(11)),
        "clic": clic(),
        "pop": pop(),
        "ding": ding(),
        "sello": sello(np.random.default_rng(23)),
        "crujido": crujido(np.random.default_rng(37)),
    }


def escribir(carpeta: Path) -> None:
    carpeta.mkdir(parents=True, exist_ok=True)
    efectos = generar()
    for nombre, s in efectos.items():
        with wave.open(str(carpeta / f"{nombre}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(TASA)
            w.writeframes((s * 32767).astype(np.int16).tobytes())
    manifiesto = {"version": VERSION, "efectos": {n: round(len(s) / TASA, 3) for n, s in efectos.items()}}
    (carpeta / "manifiesto.json").write_text(json.dumps(manifiesto, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", default="public/efectos")
    args = parser.parse_args()
    escribir(Path(args.salida))
    print(f"{args.salida}: {len(generar())} efectos")


if __name__ == "__main__":
    main()
