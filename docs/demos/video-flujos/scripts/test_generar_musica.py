import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import generar_musica as gm  # noqa: E402


class Secciones(unittest.TestCase):
    def test_por_omision_son_las_de_la_historia(self):
        cortes = gm.leer_secciones(None)
        self.assertEqual(gm.seccion_en(0, cortes), "manana")
        self.assertEqual(gm.seccion_en(20, cortes), "problema")
        self.assertEqual(gm.seccion_en(40, cortes), "solucion")

    def test_se_pueden_elegir_por_tiempo(self):
        cortes = gm.leer_secciones("0:manana,50:problema,70:solucion,190:manana")
        self.assertEqual(gm.seccion_en(49.9, cortes), "manana")
        self.assertEqual(gm.seccion_en(50, cortes), "problema")
        self.assertEqual(gm.seccion_en(100, cortes), "solucion")
        self.assertEqual(gm.seccion_en(195, cortes), "manana")

    def test_rechaza_secciones_desconocidas_o_desordenadas(self):
        with self.assertRaises(ValueError):
            gm.leer_secciones("0:fiesta")
        with self.assertRaises(ValueError):
            gm.leer_secciones("10:manana,5:solucion")
        with self.assertRaises(ValueError):
            gm.leer_secciones("5:manana")


if __name__ == "__main__":
    unittest.main()
