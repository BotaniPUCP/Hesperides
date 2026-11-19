import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from relaciones import cargar_excepciones, entradas, leer_equivalencias, nombres_v011, piezas_sin_relacion  # noqa: E402
from rutas import EQUIVALENCIAS, FUENTES, MIGRACIONES  # noqa: E402

EXC = cargar_excepciones(Path(__file__).resolve().parents[1] / 'excepciones.json')
CODIGOS = [{'code': 'A', 'label': 'ETIQ A'}, {'code': 'B', 'label': 'ETIQ B'}, {'code': '39', 'label': 'MAESTRANZA'},
           {'code': '2', 'label': 'PABELLÓN C'}, {'code': '62', 'label': 'X'}]


def rel(id, codes=(), name='', map_ids=(), skp=()):
    return {'id': id, 'code': codes[0] if codes else '', 'codes': list(codes), 'name': name, 'mapIds': list(map_ids), 'skpIds': list(skp)}


class PruebasRelaciones(unittest.TestCase):
    def un(self, r, refs=None, bd=None):
        return entradas([r], CODIGOS, refs or {}, bd or {}, EXC)[0]

    def test_regla_de_nombres(self):
        bd = {'1': 'Bd uno', '3': 'Bd tres', '5': 'Bd uno'}
        r = rel('r', ['A', '62'], 'Rel', ['5', '1', '3'])
        e = self.un(r, {'A': {'name': 'Ref', 'aliases': ['x']}}, bd)
        self.assertEqual((e.nombre, e.origen_nombre), ('Ref', 'Corrección de building-references.json'))
        self.assertEqual(self.un(r, {}, bd).nombre, 'Instituto de Ciencias Ómicas y Biotecnología Aplicada')
        self.assertEqual(self.un(rel('r', ['A'], 'Rel', ['22', '1']), {}, bd).nombre, 'Aulas Móviles A')
        self.assertEqual(self.un(rel('r', ['A'], 'Rel', ['1']), {}, bd).nombre, 'Rel')
        self.assertEqual(self.un(rel('r', ['A'], '', ['5', '1', '3']), {}, bd).nombre, 'Bd uno / Bd tres')
        e = self.un(rel('r', ['B', 'A'], '', []), {}, bd)
        self.assertEqual(e.nombre, 'ETIQ A / ETIQ B')
        self.assertEqual(e.codigos, (('B', 'ETIQ B'), ('A', 'ETIQ A')))

    def test_excepciones(self):
        self.assertEqual(self.un(rel(EXC['izquierda'], ['A'], 'n', ['1'], ['P1'])).geometria, 'mapa')
        self.assertEqual(self.un(rel(EXC['caseta'], ['A'], 'n', ['1'], ['P1'])).geometria, 'adaptada')
        self.assertEqual(self.un(rel('x', ['A'], 'n', ['1'], [])).geometria, 'mapa')
        self.assertEqual(self.un(rel('x', ['A'], 'n', ['1'], ['P1'])).geometria, 'skp')

    def test_lugar_prestado(self):
        e = entradas([rel('m', ['39'], 'Maestranza', ['1'], ['C-161', 'C-1970', 'C-5'])], CODIGOS, {}, {}, EXC)
        self.assertEqual(len(e), 2)
        self.assertEqual(e[0].piezas, ('C-5',))
        lp = e[1]
        self.assertEqual((lp.plan_key, lp.nombre, lp.piezas, lp.alias, lp.map_ids),
                         ('unified:lugar-prestado', 'Lugar prestado', ('C-161', 'C-1970'), ('Caseta junto a Maestranza',), ()))

    def test_retirados(self):
        rels = [rel('p', ['2'], 'Pabellón C', ['1'], ['C-9']), rel('q', ['A'], 'Q', [], ['C-1'])]
        self.assertEqual([e.plan_key for e in entradas(rels, CODIGOS, {}, {}, EXC)], ['q'])
        self.assertEqual(piezas_sin_relacion(rels, ['C-9', 'C-1', 'C-2'], EXC), ['C-2'])

    def test_orden_v011(self):
        sql = "    ('OSM', 'way/1', 'Uno'),\n    ('OSM', 'way/2', NULL),\n"
        osm = [{'properties': {'id': 'way/1'}}, {'properties': {'id': 'way/2'}}]
        self.assertEqual(nombres_v011(sql, osm), {'1': 'Uno', '2': None})
        with self.assertRaises(ValueError):
            nombres_v011(sql, osm[::-1])

    @unittest.skipUnless((EQUIVALENCIAS / 'final-relations.json').exists() and (FUENTES / 'edificios-osm.geojson').exists(), 'faltan los datos')
    def test_datos_reales(self):
        relaciones, codigos, refs = leer_equivalencias(EQUIVALENCIAS)
        osm = json.loads((FUENTES / 'edificios-osm.geojson').read_text(encoding='utf-8'))['features']
        sql = next(MIGRACIONES.glob('V011__*.sql')).read_text(encoding='utf-8')
        e = entradas(relaciones, codigos, refs, nombres_v011(sql, osm), EXC)
        self.assertEqual(len(e), 133)
        self.assertEqual(sum(len(x.map_ids) == 1 for x in e), 91)
        self.assertEqual(sum(len(x.map_ids) > 1 for x in e), 22)
        self.assertEqual(sum(len(x.map_ids) for x in e if len(x.map_ids) > 1), 71)
        self.assertEqual(sum(not x.map_ids for x in e), 20)
        self.assertEqual(len({c for x in e for c, _ in x.codigos}), 127)
        por_clave = {x.plan_key: x for x in e}
        self.assertEqual(por_clave['249a8c11-620a-48d6-98aa-df74d1f90f69'].geometria, 'mapa')
        self.assertEqual(por_clave['b9a4a553-9c25-45f2-b2fc-43592ab2b917'].geometria, 'adaptada')
        self.assertEqual(por_clave['unified:lugar-prestado'].nombre, 'Lugar prestado')
        artes = next(x for x in e if any(c == 'C51' for c, _ in x.codigos))
        self.assertEqual(len(artes.map_ids), 13)


if __name__ == '__main__':
    unittest.main()
