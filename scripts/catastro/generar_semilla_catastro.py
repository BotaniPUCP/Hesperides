"""Genera V014__seed_green_inventory.sql y docs/dominio/datos/ejemplares.csv desde docs/dominio/datos.

Uso, desde la raíz del repositorio:

    python scripts/catastro/generar_semilla_catastro.py
"""
import tabla_ejemplares
from fuentes import RAIZ, especies, ejemplares

SALIDA = RAIZ / "backend/src/main/resources/db/migration/V014__seed_green_inventory.sql"
CODIGO = "EV-{:06d}"

CABECERA = """-- Propiedad del inventario verde (docs/inventario-verde/README.md). ARCHIVO GENERADO:
-- no se edita a mano. Lo produce scripts/catastro/generar_semilla_catastro.py desde
-- docs/dominio/datos/. Para cambiar un dato, se corrige la fuente y se vuelve a generar.
"""


def q(texto):
    if texto is None or texto == "":
        return "NULL"
    return "'" + str(texto).replace("'", "''") + "'"


def n(valor):
    return "NULL" if valor is None else repr(valor)


def item(tipo, codigo):
    return (f"(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id "
            f"WHERE ct.code = '{tipo}' AND ci.code = '{codigo}')")


def sql_especies(lista):
    filas = ",\n".join(
        f"    ({q(e.cientifico)}, {q(e.slug)}, {q(e.comun)}, {q(e.familia)}, {item('SPECIES_TYPE', e.tipo)})"
        for e in lista)
    alternativos = ",\n".join(
        f"    ((SELECT id FROM species WHERE scientific_name = {q(e.cientifico)}), {q(nombre)})"
        for e in lista for nombre in e.alternativos)
    return (f"INSERT INTO species (scientific_name, slug, common_name, family, species_type_item_id) VALUES\n"
            f"{filas};\n\nINSERT INTO species_common_names (species_id, name) VALUES\n{alternativos};\n")


def _fila_ejemplar(i, e):
    m = e.medidas or {}
    tipo = "GROUP" if e.cantidad > 1 else "INDIVIDUAL"
    return (f"    ({q(CODIGO.format(i))}, '{tipo}', {q(e.especie)}, {e.lon}, {e.lat}, {e.cantidad}, "
            f"{q(e.referencia)}, {q(e.ubicacion)}, {q(e.codigo_antiguo)}, {q(e.foto)}, "
            f"{n(m.get('altura'))}, {n(m.get('fuste'))}, {n(m.get('dap'))}, {n(m.get('radio'))}, "
            f"{n(m.get('zunchado')).upper() if m else 'NULL'}, '{'MEASURED' if m else 'UNKNOWN'}', "
            f"{q(' '.join(e.notas))})")


def sql_ejemplares(lista):
    filas = ",\n".join(_fila_ejemplar(i, e) for i, e in enumerate(lista, start=1))
    return f"""-- Los cargados figuran como registrados por el primer ADMIN activo: aun no
-- existe un usuario «Sistema» (SPEC-004).
WITH registrador AS (
    SELECT u.id FROM users u JOIN catalog_items r ON r.id = u.role_item_id
     WHERE r.code = 'ADMIN' AND u.is_active AND u.deleted_at IS NULL ORDER BY u.id LIMIT 1
)
INSERT INTO green_elements (code, element_type_item_id, species_id, location, quantity, source_reference,
    source_location, legacy_code, photo_url, height_m, trunk_height_m, dbh_cm, crown_radius_m, is_banded,
    data_source, notes, registered_by_user_id)
SELECT v.code, t.id, s.id, ST_SetSRID(ST_MakePoint(v.lon, v.lat), 4326), v.cantidad, v.ref, v.ubicacion, v.codigo_antiguo,
       v.foto, v.altura, v.fuste, v.dap, v.radio, v.zunchado, v.origen, v.notas, r.id
  FROM registrador r, (VALUES
{filas}
) AS v(code, tipo, especie, lon, lat, cantidad, ref, ubicacion, codigo_antiguo, foto, altura, fuste, dap,
       radio, zunchado, origen, notas)
  JOIN species s ON s.scientific_name = v.especie
  JOIN catalog_items t ON t.code = v.tipo
  JOIN catalog_types tt ON tt.id = t.catalog_type_id AND tt.code = 'GREEN_ELEMENT_TYPE';

-- El siguiente ejemplar que se registre en el sistema continua la numeracion.
SELECT setval('green_element_code_seq', {len(lista)});
"""


def main():
    especie_de, lista = especies()
    todos = ejemplares(especie_de)
    partes = [CABECERA, "-- Especies y sus otros nombres\n", sql_especies(lista),
              "\n-- Ejemplares del catastro\n", sql_ejemplares(todos)]
    SALIDA.write_text("\n".join(partes), encoding="utf-8")
    print(f"Escrito {SALIDA.relative_to(RAIZ)}: {len(lista)} especies, {len(todos)} ejemplares, "
          f"{sum(1 for e in todos if e.medidas)} medidos")
    # Misma lista y mismo orden que la carga: el código EV de cada fila es el del sistema.
    tabla = tabla_ejemplares.escribir(todos, lista, CODIGO.format)
    print(f"Escrito {tabla.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
