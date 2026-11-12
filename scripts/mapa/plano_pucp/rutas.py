"""Rutas del flujo del plano PUCP.

Los datos pesados (el export del SketchUp y lo que se calcula a partir de él) viven
fuera del repositorio: por defecto en la carpeta hermana `plano-pucp-datos`, o donde
indique la variable de entorno PLANO_PUCP_DATOS.

    plano-pucp-datos/
      export/    campus_pucp.glb, campus_pucp_lineas.dxf, resumen.json (export del .skp)
      trabajo/   resultados intermedios y finales de estos scripts
"""
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
FUENTES = RAIZ / 'docs/datos/procesados/mapa'
DATOS = Path(os.environ.get('PLANO_PUCP_DATOS', RAIZ.parent / 'plano-pucp-datos'))
ENTRADA = DATOS / 'export'
TRABAJO = DATOS / 'trabajo'
TRABAJO.mkdir(parents=True, exist_ok=True)
