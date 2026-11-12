import contextlib
import hashlib
import io
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from shapely.geometry import shape

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from glb_escritor import escribir_glb  # noqa: E402
import generar_modelo  # noqa: E402
from glb import leer  # noqa: E402
from relaciones import cargar_excepciones, entradas, leer_equivalencias, nombres_v011  # noqa: E402
from rutas import ENTRADA, EQUIVALENCIAS, FUENTES, MIGRACIONES, MODELO_SKP, TRABAJO  # noqa: E402

EXC = cargar_excepciones(Path(__file__).resolve().parents[1] / 'excepciones.json')
DATOS_REALES = all(p.exists() for p in (MODELO_SKP, ENTRADA / 'campus_pucp.glb', TRABAJO / 'transformacion.npz',
                                        EQUIVALENCIAS / 'final-relations.json', FUENTES / 'edificios-osm.geojson'))


def partes_glb(ruta):
    """El JSON y el binario de un GLB."""
    datos = Path(ruta).read_bytes()
    largo = struct.unpack('<I', datos[12:16])[0]
    return json.loads(datos[20:20 + largo]), datos[20 + largo + 8:]


def accesor(gltf, binario, i):
    a = gltf['accessors'][i]
    vista = gltf['bufferViews'][a['bufferView']]
    n = {'VEC2': 2, 'VEC3': 3}[a['type']]
    inicio = vista.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(binario, '<f4', a['count'] * n, inicio).reshape(-1, n)


class PruebasGlb(unittest.TestCase):
    def test_ida_y_vuelta(self):
        azar = np.random.default_rng(7)
        a = np.array([[[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 1, 0], [0, 0, -1]]], float) + 0.123456
        b = azar.uniform(-700, 700, (5, 3, 3))
        uv = azar.uniform(-50, 50, (5, 3, 2))
        with tempfile.TemporaryDirectory() as carpeta:
            ruta = Path(carpeta) / 'modelo.glb'
            sha = escribir_glb(ruta, [('edificio-a', a, None), ('unified:lugar-prestado', b, uv)])
            self.assertEqual(sha, hashlib.sha256(ruta.read_bytes()).hexdigest())
            mallas = leer(ruta)
            gltf, binario = partes_glb(ruta)
        self.assertEqual([m['nombre'] for m in mallas], ['edificio-a', 'unified:lugar-prestado'])
        for malla, tri in zip(mallas, (a, b)):
            self.assertEqual(len(malla['tri']), len(tri))
            # glb.leer devuelve el marco del plano: (x, −z, y) del visor
            np.testing.assert_allclose(malla['tri'], tri[:, :, [0, 2, 1]] * [1, -1, 1], atol=1e-4)
        primitivas = [m['primitives'][0] for m in gltf['meshes']]
        self.assertEqual([sorted(p['attributes']) for p in primitivas], [['POSITION'], ['POSITION', 'TEXCOORD_0']])
        self.assertTrue(all('indices' not in p for p in primitivas))
        np.testing.assert_allclose(accesor(gltf, binario, primitivas[1]['attributes']['TEXCOORD_0']), uv.reshape(-1, 2), atol=1e-4)
        posicion = gltf['accessors'][primitivas[1]['attributes']['POSITION']]
        np.testing.assert_allclose(posicion['min'], b.reshape(-1, 3).min(axis=0), atol=1e-4)
        np.testing.assert_allclose(posicion['max'], b.reshape(-1, 3).max(axis=0), atol=1e-4)

    def test_nodo_vacio(self):
        with tempfile.TemporaryDirectory() as carpeta, self.assertRaises(ValueError):
            escribir_glb(Path(carpeta) / 'modelo.glb', [('vacio', np.zeros((0, 3, 3)), None)])

    @unittest.skipUnless(DATOS_REALES, 'faltan los datos del plano')
    def test_modelo_real(self):
        with tempfile.TemporaryDirectory() as carpeta:
            recursos, trabajo = Path(carpeta) / 'mapa', Path(carpeta) / 'trabajo'
            with contextlib.redirect_stdout(io.StringIO()):
                generar_modelo.main(recursos, trabajo)
            ruta_glb = recursos / 'edificios-plano.glb'
            manifiesto = json.loads((recursos / 'edificios-plano.json').read_text(encoding='utf-8'))
            principales = json.loads((trabajo / 'edificios_plano_principales.json').read_text(encoding='utf-8'))
            mallas = leer(ruta_glb)
            peso, sha = ruta_glb.stat().st_size, hashlib.sha256(ruta_glb.read_bytes()).hexdigest()

        relaciones, codigos, refs = leer_equivalencias(EQUIVALENCIAS)
        osm = json.loads((FUENTES / 'edificios-osm.geojson').read_text(encoding='utf-8'))['features']
        sql = next(MIGRACIONES.glob('V011__*.sql')).read_text(encoding='utf-8')
        ents = entradas(relaciones, codigos, refs, nombres_v011(sql, osm), EXC)
        con_malla = [e.plan_key for e in ents if e.geometria != 'mapa']
        self.assertEqual(len(con_malla), 126)
        edificios = [k for k, v in manifiesto['nodes'].items() if v == 'edificio']
        self.assertEqual(len(edificios), 124)
        # Las dos rampas de los estacionamientos pasan enteras a suelo (D-08): sin nodo ni prisma
        self.assertEqual(len(manifiesto['groundOnly']), 2)
        self.assertEqual(manifiesto['groundOnly'], sorted(manifiesto['groundOnly']))
        self.assertEqual(set(edificios) | set(manifiesto['groundOnly']), set(con_malla))
        self.assertEqual(edificios, [k for k in con_malla if k not in manifiesto['groundOnly']])
        nombres = [m['nombre'] for m in mallas]
        self.assertEqual(nombres, list(manifiesto['nodes']))
        self.assertEqual({v for v in manifiesto['nodes'].values() if v != 'edificio'},
                         {'suelo', 'jardin', 'muro', 'huaca-muro', 'huaca-tope', 'decoracion'})

        pabellon_c = [r['id'] for r in relaciones if '2' in (r.get('codes') or [r.get('code')])]
        self.assertTrue(pabellon_c)
        self.assertFalse(set(pabellon_c) & set(nombres))

        self.assertGreater(len(manifiesto['sunken']), 0)
        self.assertTrue(all(s['polygon']['type'] == 'Polygon' and shape(s['polygon']).is_valid and s['floorM'] < 0
                            for s in manifiesto['sunken']))
        self.assertLess(peso, 12_000_000)
        self.assertEqual(manifiesto['version'], sha)
        transformacion = np.load(TRABAJO / 'transformacion.npz')
        self.assertEqual(manifiesto['anchor'], {'lat': float(transformacion['lat0']), 'lon': float(transformacion['lon0'])})
        self.assertEqual(manifiesto['huaca']['label'], 'Camino Prehispánico')

        self.assertEqual([p['plan_key'] for p in principales], [e.plan_key for e in ents])
        huellas = [shape(p['huella']) for p in principales]
        self.assertTrue(all(h.geom_type in ('Polygon', 'MultiPolygon') and h.is_valid and not h.is_empty for h in huellas))
        self.assertTrue(all(p['alto_m'] > p['base_m'] for p in principales))


if __name__ == '__main__':
    unittest.main()
