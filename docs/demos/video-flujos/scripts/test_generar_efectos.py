import json
import sys
import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import generar_efectos as ge  # noqa: E402

NOMBRES = {"whoosh", "clic", "pop", "ding", "sello", "crujido"}


class GenerarEfectos(unittest.TestCase):
    def test_estan_todos_y_son_deterministas(self):
        a = ge.generar()
        b = ge.generar()
        self.assertEqual(set(a), NOMBRES)
        for nombre in NOMBRES:
            np.testing.assert_array_equal(a[nombre], b[nombre])

    def test_son_cortos_suaves_y_no_vacios(self):
        for nombre, s in ge.generar().items():
            dur = len(s) / ge.TASA
            self.assertGreater(dur, 0.02, nombre)
            self.assertLess(dur, 1.6, nombre)
            pico = float(np.max(np.abs(s)))
            self.assertLessEqual(pico, 0.6, f"{nombre}: sutil, sin saturar")
            self.assertGreater(float(np.sqrt(np.mean(s**2))), 0.005, nombre)

    def test_empiezan_y_terminan_en_silencio(self):
        # Sin clics de borde: el primer y el último milisegundo casi no suenan.
        m = ge.TASA // 1000
        for nombre, s in ge.generar().items():
            self.assertLess(float(np.max(np.abs(s[-m:]))), 0.02, nombre)

    def test_el_sello_es_grave_y_el_ding_agudo(self):
        e = ge.generar()

        def centroide(s):
            espectro = np.abs(np.fft.rfft(s))
            f = np.fft.rfftfreq(len(s), 1 / ge.TASA)
            return float(np.sum(f * espectro) / np.sum(espectro))

        self.assertLess(centroide(e["sello"]), 1200)
        self.assertGreater(centroide(e["ding"]), 1000)

    def test_escribe_wav_y_manifiesto(self):
        with tempfile.TemporaryDirectory() as d:
            ge.escribir(Path(d))
            manifiesto = json.loads((Path(d) / "manifiesto.json").read_text(encoding="utf-8"))
            self.assertEqual(set(manifiesto["efectos"]), NOMBRES)
            with wave.open(str(Path(d) / "sello.wav")) as w:
                self.assertEqual(w.getframerate(), ge.TASA)
                self.assertEqual(w.getnchannels(), 1)


if __name__ == "__main__":
    unittest.main()
