import sys
import tempfile
import unittest
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import generar_sfx as gs  # noqa: E402


class Sonidos(unittest.TestCase):
    def test_hay_un_sonido_por_cada_momento(self):
        self.assertEqual(set(gs.SONIDOS), {"barrido", "clic", "pop", "campanita", "golpe", "papel"})

    def test_son_cortos_suaves_y_sin_saturar(self):
        for nombre, crear in gs.SONIDOS.items():
            onda = crear()
            duracion = len(onda) / gs.TASA
            self.assertGreater(duracion, 0.03, nombre)
            self.assertLess(duracion, 1.6, nombre)
            self.assertLessEqual(abs(onda).max(), 0.71, nombre)
            self.assertGreater(abs(onda).max(), 0.2, nombre)

    def test_empiezan_y_terminan_en_silencio(self):
        for nombre, crear in gs.SONIDOS.items():
            onda = crear()
            self.assertLess(abs(onda[:8]).max(), 0.05, nombre)
            self.assertLess(abs(onda[-8:]).max(), 0.05, nombre)

    def test_son_siempre_iguales(self):
        for nombre, crear in gs.SONIDOS.items():
            self.assertTrue((crear() == crear()).all(), nombre)

    def test_escribe_un_wav_por_sonido(self):
        with tempfile.TemporaryDirectory() as carpeta:
            gs.escribir_todos(Path(carpeta))
            for nombre in gs.SONIDOS:
                with wave.open(str(Path(carpeta) / f"{nombre}.wav")) as w:
                    self.assertEqual(w.getframerate(), gs.TASA)
                    self.assertEqual(w.getnchannels(), 1)


if __name__ == "__main__":
    unittest.main()
