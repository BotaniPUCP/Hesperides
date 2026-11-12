"""Último paso: inserta los datos en las plantillas y escribe las páginas en trabajo/.

    plantilla.html    + datos.json    → plano-vs-mapa.html  (comparación en planta)
    plantilla_3d.html + datos_3d.json → plano-3d.html       (maqueta 3D)

Las páginas son autónomas: se abren con doble clic o se publican tal cual.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rutas import TRABAJO  # noqa: E402

AQUI = Path(__file__).parent
PAGINAS = [('plantilla.html', 'datos.json', 'plano-vs-mapa.html'),
           ('plantilla_3d.html', 'datos_3d.json', 'plano-3d.html')]


def main():
    for plantilla, datos, destino in PAGINAS:
        if not (TRABAJO / datos).exists():
            print(f'(se omite {destino}: falta {datos})')
            continue
        # «</» dentro del JSON cerraría la etiqueta <script>; «<\/» es el mismo texto para JSON.parse.
        texto = (TRABAJO / datos).read_text(encoding='utf-8').replace('</', '<\\/')
        pagina = (AQUI / plantilla).read_text(encoding='utf-8').replace('__DATOS__', texto)
        (TRABAJO / destino).write_text(pagina, encoding='utf-8')
        print(f'{TRABAJO / destino} ({len(pagina.encode()) / 1e6:.2f} MB)')


if __name__ == '__main__':
    main()
