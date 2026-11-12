"""Lector mínimo de campus_pucp.glb (glTF 2.0 de trimesh): triángulos por malla en el marco del DXF.

glTF usa Y hacia arriba y el nodo escala por 0,001 (posiciones en mm). En el marco del
DXF/SketchUp: x = x_gltf, y = -z_gltf, z = y_gltf, en metros.
"""
import json
import re
import struct
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from rutas import ENTRADA  # noqa: E402

TIPOS = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
COMPONENTES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def leer(ruta=ENTRADA / 'campus_pucp.glb'):
    datos = Path(ruta).read_bytes()
    largo_json = struct.unpack('<I', datos[12:16])[0]
    gltf = json.loads(datos[20:20 + largo_json])
    binario = datos[20 + largo_json + 8:]

    def accesor(i):
        a = gltf['accessors'][i]
        vista = gltf['bufferViews'][a['bufferView']]
        inicio = vista.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = a['count'] * COMPONENTES[a['type']]
        arr = np.frombuffer(binario, TIPOS[a['componentType']], n, inicio)
        return arr.reshape(a['count'], COMPONENTES[a['type']]) if COMPONENTES[a['type']] > 1 else arr

    mallas = []
    for nodo in gltf['nodes']:
        if 'mesh' not in nodo:
            continue
        m = np.array(nodo.get('matrix', np.eye(4).ravel()), float).reshape(4, 4).T  # glTF guarda por columnas
        for prim in gltf['meshes'][nodo['mesh']]['primitives']:
            pos = accesor(prim['attributes']['POSITION']).astype(float)
            pos = (np.c_[pos, np.ones(len(pos))] @ m.T)[:, :3]
            idx = accesor(prim['indices']).reshape(-1, 3) if 'indices' in prim else np.arange(len(pos)).reshape(-1, 3)
            marco = np.column_stack([pos[:, 0], -pos[:, 2], pos[:, 1]])  # al marco del DXF
            capa = re.search(r'(L\d+_[^_]+(?: [^_]+)*|Layer0)', nodo.get('name', ''))
            mallas.append({'nombre': nodo.get('name', ''), 'capa': capa.group(1) if capa else '?',
                           'tri': marco[idx]})
    return mallas


if __name__ == '__main__':
    for m in leer():
        t = m['tri'].reshape(-1, 3)
        print(f"{m['capa']:<24} {len(m['tri']):>7} triángulos  x {t[:, 0].min():7.1f}..{t[:, 0].max():7.1f}  "
              f"y {t[:, 1].min():7.1f}..{t[:, 1].max():7.1f}  z {t[:, 2].min():6.1f}..{t[:, 2].max():6.1f}  {m['nombre'][:60]}")
