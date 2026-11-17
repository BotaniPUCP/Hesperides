"""Efectos de sonido originales, sintetizados con numpy: sin sonidos descargados ni licencias.

Suaves y cortos, para ir debajo de la voz: barrido (cambio de escena), clic (pulsar un botón),
pop y campanita (el globo que aparece, Hespo que brota), golpe (el sello «Cerrada») y papel (las
hojas de cálculo). Deterministas (semilla fija): cada ejecución da los mismos WAV.

Uso: python scripts/generar_sfx.py [--salida public/sfx]
"""

import argparse
import wave
from pathlib import Path

import numpy as np

TASA = 44100
PICO = 0.7


def _t(duracion: float) -> np.ndarray:
    return np.arange(int(duracion * TASA)) / TASA


def _bordes(onda: np.ndarray, entrada: float = 0.004, salida: float = 0.02) -> np.ndarray:
    """Rampa corta al empezar y al terminar: nada de chasquidos."""
    n = len(onda)
    env = np.ones(n)
    a, b = max(1, int(entrada * TASA)), max(1, int(salida * TASA))
    env[:a] = np.linspace(0, 1, a)
    env[-b:] = np.linspace(1, 0, b)
    return onda * env


def _normalizar(onda: np.ndarray, pico: float = PICO) -> np.ndarray:
    return _bordes(onda) / np.max(np.abs(onda)) * pico


def _ruido(n: int, semilla: int) -> np.ndarray:
    return np.random.default_rng(semilla).standard_normal(n)


def _pasabajos(x: np.ndarray, corte: np.ndarray | float) -> np.ndarray:
    """Filtro de un polo, con corte que puede variar en el tiempo (Hz)."""
    corte = np.broadcast_to(np.asarray(corte, dtype=float), x.shape)
    alfa = 1 - np.exp(-2 * np.pi * corte / TASA)
    y = np.zeros_like(x)
    acum = 0.0
    for i in range(len(x)):
        acum += alfa[i] * (x[i] - acum)
        y[i] = acum
    return y


def barrido() -> np.ndarray:
    """Aire que pasa: ruido filtrado que sube y baja, 0,7 s."""
    t = _t(0.7)
    forma = np.sin(np.pi * t / t[-1]) ** 2
    corte = 300 + 2200 * forma
    aire = _pasabajos(_ruido(len(t), 11), corte) - _pasabajos(_ruido(len(t), 11), 120)
    return _normalizar(aire * forma, 0.5)


def clic() -> np.ndarray:
    """Pulsar un botón: un golpecito seco y agudo, 60 ms."""
    t = _t(0.06)
    tono = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 140)
    golpe = _pasabajos(_ruido(len(t), 3), 5000) * np.exp(-t * 300)
    return _normalizar(tono + 0.6 * golpe, 0.55)


def pop() -> np.ndarray:
    """Algo que brota: tono que sube rápido y se apaga, 0,22 s."""
    t = _t(0.22)
    frecuencia = 260 + 520 * (1 - np.exp(-t * 40))
    fase = 2 * np.pi * np.cumsum(frecuencia) / TASA
    return _normalizar(np.sin(fase) * np.exp(-t * 18) * (1 - np.exp(-t * 400)), 0.6)


def campanita() -> np.ndarray:
    """Un «ding» cálido: dos parciales de campana que se apagan, 1,2 s."""
    t = _t(1.2)
    base = 1318.5  # Mi6
    onda = np.sin(2 * np.pi * base * t) * np.exp(-t * 4) + 0.4 * np.sin(2 * np.pi * base * 2.76 * t) * np.exp(-t * 7)
    return _normalizar(onda * (1 - np.exp(-t * 600)), 0.45)


def golpe() -> np.ndarray:
    """El sello que cae: un golpe grave y apagado, 0,35 s."""
    t = _t(0.35)
    cuerpo = np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 14)
    papel = _pasabajos(_ruido(len(t), 7), 1800) * np.exp(-t * 60)
    return _normalizar(cuerpo + 0.5 * papel, 0.7)


def papel() -> np.ndarray:
    """Una hoja que se asienta: roce de papel, 0,3 s."""
    t = _t(0.3)
    forma = np.sin(np.pi * t / t[-1]) * np.exp(-t * 4)
    roce = _pasabajos(_ruido(len(t), 23), 3500) - _pasabajos(_ruido(len(t), 23), 600)
    return _normalizar(roce * forma, 0.4)


SONIDOS = {"barrido": barrido, "clic": clic, "pop": pop, "campanita": campanita, "golpe": golpe, "papel": papel}


def escribir_todos(carpeta: Path) -> None:
    carpeta.mkdir(parents=True, exist_ok=True)
    for nombre, crear in SONIDOS.items():
        datos = (crear() * 32767).astype(np.int16)
        with wave.open(str(carpeta / f"{nombre}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(TASA)
            w.writeframes(datos.tobytes())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", default="public/sfx")
    args = parser.parse_args()
    escribir_todos(Path(args.salida))
    print(f"{len(SONIDOS)} efectos en {args.salida}")


if __name__ == "__main__":
    main()
