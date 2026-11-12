"""Paso 0: guarda las líneas útiles de campus_pucp_lineas.dxf en trabajo/lineas.npz.

El DXF pesa ~300 MB y solo trae entidades LINE; leerlo toma ~10 s, así que los demás
scripts usan este caché. Cada fila: x0 y0 z0 x1 y1 z1, en metros del modelo (marco
local de SketchUp, sin ubicar). Las claves son los nombres de capa con «_» en vez de
espacios.
"""
import collections
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from rutas import ENTRADA, TRABAJO  # noqa: E402

CAPAS = {'L2_Suelo Jardinería', 'L3_Huellas Edificios', 'L4_Huellas casetas', 'L5_Muro Limite', 'L6_Huacas',
         '0', 'Layer0'}
EJE = {'10': 0, '20': 1, '30': 2, '11': 3, '21': 4, '31': 5}


def main():
    lineas = collections.defaultdict(list)
    with open(ENTRADA / 'campus_pucp_lineas.dxf', encoding='utf-8', errors='replace') as archivo:
        pares = iter(archivo)
        en_entidades, capa, punto = False, None, [0.0] * 6
        for codigo in pares:
            valor = next(pares).strip()
            codigo = codigo.strip()
            if not en_entidades:
                en_entidades = codigo == '2' and valor == 'ENTITIES'
                continue
            if codigo == '0':
                if capa in CAPAS:
                    lineas[capa].append(punto)
                capa, punto = None, [0.0] * 6
            elif codigo == '8':
                capa = valor
            elif codigo in EJE:
                punto[EJE[codigo]] = float(valor)
    np.savez_compressed(TRABAJO / 'lineas.npz', **{k.replace(' ', '_'): np.array(v) for k, v in lineas.items()})
    print({k: len(v) for k, v in lineas.items()})


if __name__ == '__main__':
    main()
