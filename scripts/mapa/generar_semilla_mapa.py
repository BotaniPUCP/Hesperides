"""Genera V011__seed_map_data.sql a partir de las fuentes de docs/dominio/datos.

La carga del mapa no se escribe a mano: este script la produce desde archivos
versionados, para que cualquiera pueda repetirla y revisar de dónde sale cada
fila (SPEC-102 §4). Uso, desde la raíz del repositorio:

    python scripts/mapa/generar_semilla_mapa.py
"""
from capas import edificios, elementos, referencias
from sql_util import RAIZ
from zonas import aplicar_reserva, reserva, secciones, sectores, supervision, unir_sectores

SALIDA = RAIZ / "backend/src/main/resources/db/migration/V011__seed_map_data.sql"

CABECERA = """-- Propiedad de SPEC-102 §4 y SPEC-005 §4.4. ARCHIVO GENERADO: no se edita a mano.
-- Lo produce scripts/mapa/generar_semilla_mapa.py desde docs/dominio/datos/.
-- Para cambiar un dato, se corrige la fuente y se vuelve a generar.
--
-- Contornos y alturas de edificios: (c) colaboradores de OpenStreetMap (ODbL).
"""

BLOQUES = [
    ("Sectores", sectores),
    ("Secciones: areas verdes y xerofiticas", secciones),
    ("Contorno y area de cada sector", unir_sectores),
    ("Jardines de reserva", reserva),
    ("Reserva aplicada a secciones y subsecciones", aplicar_reserva),
    ("Zonas de supervision", supervision),
    ("Referencias", referencias),
    ("Edificios", edificios),
    ("Mobiliario y elementos del campus", elementos),
]


def main():
    partes = [CABECERA]
    for titulo, generar in BLOQUES:
        partes.append(f"-- {'=' * 70}\n-- {titulo}\n-- {'=' * 70}\n{generar()}\n")
    SALIDA.write_text("\n".join(partes), encoding="utf-8")
    print(f"Escrito {SALIDA.relative_to(RAIZ)} ({SALIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
