"""Escritor mínimo de GLB (glTF 2.0 binario): un nodo por malla, sin índice.

Basado en writeGlb de frontend/scripts/build-equivalence-assets.mjs. Cada malla lleva solo POSITION (float32) y,
si tiene, TEXCOORD_0: sin índice, cada cara conserva sus vértices y el visor le calcula su propia normal (D-11).
"""
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

MAGIA, VERSION, TROZO_JSON, TROZO_BIN = 0x46546C67, 2, 0x4E4F534A, 0x004E4942
FLOTANTE = 5126


def escribir_glb(ruta: Path, nodos: list[tuple[str, np.ndarray, np.ndarray | None]]) -> str:
    """Escribe los nodos (nombre, triángulos (n, 3, 3) en el marco del visor, UV (n, 3, 2) o None) y devuelve el
    sha256 del archivo."""
    binario, vistas, accesores, mallas = bytearray(), [], [], []

    def agregar(valores, tipo, limites=False):
        vistas.append({'buffer': 0, 'byteOffset': len(binario), 'byteLength': valores.nbytes})
        binario.extend(valores.tobytes())
        a = {'bufferView': len(vistas) - 1, 'componentType': FLOTANTE, 'count': len(valores), 'type': tipo}
        if limites:
            a['min'], a['max'] = valores.min(axis=0).tolist(), valores.max(axis=0).tolist()
        accesores.append(a)
        return len(accesores) - 1

    for nombre, tri, uv in nodos:
        pos = np.ascontiguousarray(tri, '<f4').reshape(-1, 3)
        if not len(pos):
            raise ValueError(f'El nodo {nombre} no tiene triángulos')
        atributos = {'POSITION': agregar(pos, 'VEC3', limites=True)}
        if uv is not None:
            uv = np.ascontiguousarray(uv, '<f4').reshape(-1, 2)
            if len(uv) != len(pos):
                raise ValueError(f'El nodo {nombre} tiene {len(uv)} UV para {len(pos)} vértices')
            atributos['TEXCOORD_0'] = agregar(uv, 'VEC2')
        mallas.append({'name': nombre, 'primitives': [{'attributes': atributos}]})

    gltf = {'asset': {'version': '2.0', 'generator': 'Hesperides generar_modelo.py'}, 'scene': 0,
            'scenes': [{'nodes': list(range(len(mallas)))}],
            'nodes': [{'name': m['name'], 'mesh': i} for i, m in enumerate(mallas)],
            'meshes': mallas, 'accessors': accesores, 'bufferViews': vistas,
            'buffers': [{'byteLength': len(binario)}]}
    texto = json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    texto += b' ' * (-len(texto) % 4)
    binario.extend(b'\0' * (-len(binario) % 4))
    datos = b''.join([struct.pack('<III', MAGIA, VERSION, 28 + len(texto) + len(binario)),
                      struct.pack('<II', len(texto), TROZO_JSON), texto,
                      struct.pack('<II', len(binario), TROZO_BIN), bytes(binario)])
    Path(ruta).write_bytes(datos)
    return hashlib.sha256(datos).hexdigest()
