import contextlib
import io
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from generar_migracion import DDL, main  # noqa: E402
from rutas import EQUIVALENCIAS, FUENTES, TRABAJO  # noqa: E402

DATOS = [EQUIVALENCIAS / 'final-relations.json', FUENTES / 'edificios-osm.geojson',
         TRABAJO / 'edificios_plano_principales.json']
REFERENCIA_OSM = r"'(?:way|relation|node)/\d+'"
POR_SOURCE_REF = rf"source_ref (?:= {REFERENCIA_OSM}|IN \({REFERENCIA_OSM}(?:, {REFERENCIA_OSM})*\))"


def filas(sql, encabezado):
    """Las filas del INSERT de sql_util.valores con ese encabezado: una por línea, hasta la que termina en «;»."""
    lineas = sql.splitlines()
    salida = []
    for linea in lineas[lineas.index(encabezado + ' VALUES') + 1:]:
        salida.append(linea)
        if linea.endswith(';'):
            return salida
    raise AssertionError(f'el INSERT «{encabezado}» no termina')


class PruebasMigracion(unittest.TestCase):
    def test_no_sobrescribe(self):
        with tempfile.TemporaryDirectory() as tmp:
            carpeta = Path(tmp)
            (carpeta / 'V999__x.sql').write_text('', encoding='utf-8')
            with self.assertRaises(SystemExit):
                main('999', carpeta)
            # Flyway lee la versión como número: V0999 es la misma versión que V999
            with self.assertRaises(SystemExit):
                main('0999', carpeta)
            self.assertEqual([p.name for p in carpeta.iterdir()], ['V999__x.sql'])

    def test_no_repite_la_descripcion(self):
        with tempfile.TemporaryDirectory() as tmp:
            carpeta = Path(tmp)
            (carpeta / 'V041__group_buildings_by_plan.sql').write_text('', encoding='utf-8')
            with self.assertRaises(SystemExit):
                main('042', carpeta)
            self.assertEqual([p.name for p in carpeta.iterdir()], ['V041__group_buildings_by_plan.sql'])

    def test_indices_unicos_solo_cuentan_filas_vivas(self):
        # INV-4: un borrado lógico libera la clave para otra fila
        unicos = re.findall(r'^CREATE UNIQUE INDEX .*$', DDL, re.M)
        self.assertEqual(len(unicos), 2)
        for indice in unicos:
            self.assertIn('deleted_at IS NULL', indice)

    @unittest.skipUnless(all(p.exists() for p in DATOS), 'faltan los datos')
    def test_sql(self):
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            ruta = main('999', Path(tmp))
            sql = ruta.read_text(encoding='utf-8')
        self.assertEqual(ruta.name, 'V999__group_buildings_by_plan.sql')
        self.assertTrue(sql.startswith('-- Propiedad de SPEC-108. ARCHIVO GENERADO'))
        self.assertIn('scripts/mapa/plano_pucp/generar_migracion.py', sql)
        self.assertIn('ALTER TABLE campus_buildings', sql)
        self.assertIn('CREATE TABLE campus_building_codes', sql)

        codigos = [re.match(r"    \(\(SELECT id FROM campus_buildings WHERE plan_key = '[^']+'\), '([^']+)', '", f)[1]
                   for f in filas(sql, 'INSERT INTO campus_building_codes (building_id, code, official_label)')]
        self.assertEqual(len(codigos), 127)
        self.assertEqual(len(set(codigos)), 127)
        self.assertNotIn('2', codigos)  # D-05: el Pabellón C no entra
        nuevos = filas(sql, 'INSERT INTO campus_buildings '
                            '(source, plan_key, name, category_item_id, is_campus, footprint, height_m, base_m)')
        self.assertEqual(len(nuevos), 42)
        self.assertTrue(all(", TRUE, ST_Multi(" in f for f in nuevos))

        # Los edificios del mapa se buscan solo por source_ref: nunca por id
        self.assertIsNone(re.search(r'\bid\s*(=|IN\b)', sql))
        refs = {r for clausula in re.findall(POR_SOURCE_REF, sql) for r in re.findall(REFERENCIA_OSM, clausula)}
        self.assertEqual(len(refs), 162)
        self.assertIsNone(re.search(REFERENCIA_OSM, re.sub(POR_SOURCE_REF, '', sql)))

        # source_ref nunca cambia: ningún UPDATE lo pone
        cambios = re.findall(r'^UPDATE campus_buildings SET (.*?)\n WHERE ', sql, re.M | re.S)
        self.assertEqual(len(cambios), 91 + 22)
        self.assertEqual(len(cambios), sql.count('UPDATE '))
        self.assertFalse([c for c in cambios if 'source_ref' in c])

        self.assertTrue(sql.rstrip().endswith('END $$;'))
        comprobacion = sql[sql.rindex('DO $$'):]
        for esperado in ('133', '71', '127'):
            self.assertRegex(comprobacion, rf'<> {esperado}\b')
        self.assertIn('RAISE EXCEPTION', comprobacion)


if __name__ == '__main__':
    unittest.main()
