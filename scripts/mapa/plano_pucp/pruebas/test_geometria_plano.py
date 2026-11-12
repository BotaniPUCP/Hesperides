import sys
import unittest
from pathlib import Path

import numpy as np
import shapely
from shapely import affinity

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geometria_plano import (FONDO_M, adaptar_caseta, corte_con_piso, huaca, huella, muros_y_fondo,  # noqa: E402
                             patio_del_skp, separar, uv_por_cara, zonas_hundidas)

VACIO = shapely.Polygon()


def cara_vertical(x0, y0, x1, y1, z0, z1):
    """Cara vertical de (x0, y0) a (x1, y1), entre z0 y z1, en dos triángulos."""
    a, b, c, d = (x0, y0, z0), (x1, y1, z0), (x1, y1, z1), (x0, y0, z1)
    return np.array([[a, b, c], [a, c, d]], float)


def losa(x0, y0, x1, y1, z, paso=None):
    """Cara horizontal a la altura z, en dos triángulos o en una grilla de celdas de lado paso."""
    xs = np.arange(x0, x1 + 1e-9, paso) if paso else np.array([x0, x1])
    ys = np.arange(y0, y1 + 1e-9, paso) if paso else np.array([y0, y1])
    t = []
    for xa, xb in zip(xs[:-1], xs[1:]):
        for ya, yb in zip(ys[:-1], ys[1:]):
            a, b, c, d = (xa, ya, z), (xb, ya, z), (xb, yb, z), (xa, yb, z)
            t += [[a, b, c], [a, c, d]]
    return np.array(t, float)


def contorno(x0, y0, x1, y1):
    return [(x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)]


def caja(x0, y0, x1, y1, z0, z1):
    """Los cuatro lados y la tapa de una caja."""
    return np.concatenate([cara_vertical(*l, z0, z1) for l in contorno(x0, y0, x1, y1)] + [losa(x0, y0, x1, y1, z1)])


def claves(tri):
    return {tuple(np.round(t, 4).ravel()) for t in tri}


def normales(tri):
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    return n / np.linalg.norm(n, axis=1, keepdims=True)


def area_3d(tri):
    return float(np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1).sum() / 2)


class PruebasGeometriaPlano(unittest.TestCase):
    def test_patio_sin_losas(self):
        pisos = ((0, 3.5), (3.5, 7))
        muros = [cara_vertical(*l, z0, z1) for z0, z1 in pisos for l in contorno(0, 0, 20, 20)]
        muros_patio = np.concatenate([cara_vertical(*l, z0, z1) for z0, z1 in pisos for l in contorno(7, 7, 13, 13)])
        tri = np.concatenate(muros + [muros_patio, losa(0, 0, 20, 20, 3.5), losa(0, 0, 20, 20, 7.0, paso=2)])
        hueco_osm = shapely.box(7.3, 6.8, 13.2, 12.6)  # el patio de OSM, corrido unos centímetros
        patio = patio_del_skp(tri, [hueco_osm])
        self.assertTrue(30 < patio.area < 36, patio.area)  # el patio entre los muros, sin comerse el edificio
        edificio, _ = separar(tri, patio, VACIO, VACIO)
        horiz = np.abs(normales(edificio)[:, 2]) > 0.95
        c = edificio[:, :, :2].mean(axis=1)
        dentro = shapely.contains_xy(shapely.box(7.2, 7.2, 12.8, 12.8), c[:, 0], c[:, 1])
        self.assertFalse((horiz & dentro & (edificio[:, :, 2].mean(axis=1) >= 0.6)).any())
        self.assertTrue(claves(muros_patio) <= claves(edificio))
        losa_35 = edificio[horiz & np.isclose(edificio[:, :, 2].mean(axis=1), 3.5)]
        self.assertAlmostEqual(area_3d(losa_35), 400 - patio.area, places=3)  # el resto de la losa queda

    def test_canto_y_contrahuella(self):
        patio = shapely.box(7, 7, 13, 13)
        canto = cara_vertical(8, 10, 12, 10, 3.5, 3.7)
        muro = cara_vertical(8, 9, 12, 9, 3.5, 6.5)
        edificio, suelo = separar(np.concatenate([canto, muro]), patio, VACIO, VACIO)
        self.assertFalse(claves(canto) & (claves(edificio) | claves(suelo)))
        self.assertTrue(claves(muro) <= claves(edificio))

    def test_suelo_al_ras(self):
        hundido = shapely.box(50, 50, 60, 60)
        sardinel = caja(2, 2, 8, 2.15, 0.0, 0.3)
        piso = losa(10, 0, 14, 4, 0.0)
        piso_hundido = losa(52, 52, 56, 56, 0.0)
        edificio, suelo = separar(np.concatenate([sardinel, piso, piso_hundido]), VACIO, hundido, VACIO)
        self.assertTrue(claves(sardinel) <= claves(suelo))
        self.assertFalse(claves(sardinel) & claves(edificio))
        self.assertFalse(claves(piso) & (claves(edificio) | claves(suelo)))
        self.assertTrue(claves(piso_hundido) <= claves(suelo))  # dentro del desnivel no titila con el zócalo

    def test_baranda_en_desnivel(self):
        hundido = shapely.box(0, 0, 10, 10)
        cerca = cara_vertical(11, 2, 11, 8, 0.0, 1.1)
        lejos = cara_vertical(15, 2, 15, 8, 0.0, 1.1)
        muro = cara_vertical(10.5, 2, 10.5, 8, 0.0, 3.0)
        edificio, suelo = separar(np.concatenate([cerca, lejos, muro]), VACIO, hundido, VACIO)
        self.assertTrue(claves(cerca) <= claves(suelo))
        self.assertFalse(claves(cerca) & claves(edificio))
        self.assertTrue(claves(lejos) <= claves(edificio))
        self.assertFalse(claves(lejos) & claves(suelo))
        self.assertTrue(claves(muro) <= claves(edificio))

    def test_cubierto_por_el_plano(self):
        hundido = shapely.box(0, 0, 10, 10)
        grada = losa(1, 1, 3, 3, -1.0)
        _, suelo = separar(grada, VACIO, hundido, shapely.box(0, 0, 5, 5))
        self.assertEqual(len(suelo), 0)  # el fondo del plano ya lo dibuja

    def test_corte_solo_con_piso(self):
        corte = corte_con_piso(shapely.box(0, 0, 10, 10), losa(0, 0, 5, 10, -2.0))
        self.assertAlmostEqual(corte.area, 50, delta=1)
        self.assertLess(corte.bounds[2], 5.5)

    def test_uv_vertical(self):
        norte = cara_vertical(4, 3, 0, 3, 0, 3)
        uv = uv_por_cara(norte)
        self.assertEqual(uv.shape, (2, 3, 2))
        np.testing.assert_allclose(uv[:, :, 1], norte[:, :, 2])
        self.assertGreater(np.ptp(uv[:, :, 1]), 0)
        np.testing.assert_allclose(uv[:, :, 0], norte[:, :, 0])
        este = cara_vertical(5, 0, 5, 4, 0, 3)
        np.testing.assert_allclose(uv_por_cara(este), este[:, :, 1:])
        piso = losa(0, 0, 2, 2, 1.0)
        np.testing.assert_allclose(uv_por_cara(piso), piso[:, :, :2])

    def test_huella_sin_caras_verticales(self):
        self.assertAlmostEqual(huella(caja(0, 0, 4, 5, 0, 3)).area, 20)
        self.assertTrue(huella(cara_vertical(0, 0, 4, 0, 0, 3)).is_empty)

    def test_zonas_hundidas(self):
        suelo_plano = {'pav': np.concatenate([losa(0, 0, 10, 10, -2.0), losa(10, 0, 30, 10, 0.0)]),
                       'jard': losa(40, 0, 41, 1, -1.0)}  # 1 m² hundido: muy poco para ser un desnivel
        piezas = np.concatenate([losa(50, 0, 56, 6, -1.5),                          # patio hundido al aire libre
                                 losa(70, 0, 76, 6, -1.5), losa(70, 0, 76, 6, 3.0)])  # sótano bajo techo
        hundido, cubierto = zonas_hundidas(suelo_plano, piezas)
        dentro = lambda g, x, y: bool(shapely.contains_xy(g, x, y))
        self.assertTrue(dentro(hundido, 5, 5) and dentro(hundido, 53, 3))
        self.assertFalse(dentro(hundido, 20, 5) or dentro(hundido, 73, 3) or dentro(hundido, 40.5, 0.5))
        self.assertAlmostEqual(cubierto.area, 9.9 ** 2, delta=0.5)  # el piso del plano dentro del desnivel
        self.assertFalse(dentro(cubierto, 53, 3))

    def test_muros_y_fondo(self):
        corte = shapely.box(0, 0, 10, 10).difference(shapely.box(4, 4, 6, 6))
        muros, fondo = muros_y_fondo(corte)
        self.assertEqual(set(np.round(muros[:, :, 2].ravel(), 6)), {0.0, -FONDO_M})
        self.assertAlmostEqual(area_3d(muros), 48 * FONDO_M, places=6)
        c, n = muros.mean(axis=1), normales(muros)
        self.assertTrue((n[np.isclose(c[:, 0], 0), 0] > 0.99).all())  # miran hacia adentro de la abertura
        self.assertTrue((n[np.isclose(c[:, 0], 4), 0] < -0.99).all())
        self.assertTrue(np.allclose(fondo[:, :, 2], -FONDO_M))
        self.assertTrue((normales(fondo)[:, 2] > 0.99).all())
        self.assertAlmostEqual(huella(fondo).area, 96, places=6)

    def test_adaptar_caseta(self):
        plantilla = caja(100, 50, 103, 52, 0.2, 2.7)
        destino = affinity.rotate(shapely.box(0, 0, 6, 4), 30, origin=(0, 0))
        tri = adaptar_caseta(plantilla, destino, 8.0)
        self.assertEqual(tri.shape, plantilla.shape)
        self.assertAlmostEqual(tri[:, :, 2].min(), 0)
        self.assertAlmostEqual(tri[:, :, 2].max(), 8)
        casco = shapely.MultiPoint(tri[:, :, :2].reshape(-1, 2)).convex_hull
        self.assertLess(casco.symmetric_difference(destino).area, 1e-6)

    def test_huaca(self):
        capa = np.concatenate([caja(0, 0, 20, 3, 0.0, 4.9), losa(0, 3, 20, 6, -0.2)])
        muro, tope, etiqueta = huaca(capa)
        self.assertEqual(len(muro), 8)
        self.assertTrue((np.abs(normales(muro)[:, 2]) < 1e-9).all())
        self.assertEqual(set(np.round(tope[:, :, 2].ravel(), 6)), {4.9, 0.04})  # el piso apoyado a 4 cm
        self.assertEqual(etiqueta[2], 4.9)
        self.assertTrue(shapely.contains_xy(shapely.box(0, 0, 20, 6), etiqueta[0], etiqueta[1]))


if __name__ == '__main__':
    unittest.main()
