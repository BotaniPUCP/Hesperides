"""Prepara trabajo/datos_3d.json para la vista 3D: el modelo del plano ubicado y los casos.

Mallas del GLB ya ubicadas (metros locales, x este, y norte, z desde el suelo del modelo),
cuantizadas a 2 cm en Int16, con índices Uint32, todo comprimido con gzip y en base64.
Los triángulos de edificios y casetas se asignan al edificio del plano (paso 2) que
contiene su centro. Requiere separar_edificios.py, emparejar.py y preparar_datos.py.
"""
import base64
import gzip
import json
import sys
from pathlib import Path

import numpy as np
import shapely

sys.path.insert(0, str(Path(__file__).parent))
from glb import leer  # noqa: E402
from rutas import TRABAJO  # noqa: E402

SUELO = 91.44
PASO = 0.02  # m por unidad de Int16
T = np.load(TRABAJO / 'transformacion.npz')
R, TR = T['r'], T['tr']


def triangulos(mallas, capas):
    tri = np.concatenate([m['tri'] for m in mallas if m['capa'] in capas])
    claves = np.sort(np.round(tri * 1000).astype(np.int64), axis=1).reshape(len(tri), -1)
    _, unicos = np.unique(claves, axis=0, return_index=True)
    tri = tri[np.sort(unicos)].copy()
    tri[:, :, :2] = (tri[:, :, :2].reshape(-1, 2) @ R.T + TR).reshape(-1, 3, 2)
    tri[:, :, 2] -= SUELO
    return tri


class Paquete:
    """Acumula mallas indexadas y las empaqueta en un solo binario."""

    def __init__(self):
        self.pos, self.idx, self.nv, self.ni = [], [], 0, 0

    def agregar(self, tri):
        q = np.round(tri.reshape(-1, 3) / PASO).astype(np.int32)
        unicos, inverso = np.unique(q, axis=0, return_inverse=True)
        assert np.abs(unicos).max() < 32767, 'coordenada fuera de Int16'
        entrada = {'voff': self.nv, 'vcount': len(unicos), 'ioff': self.ni, 'icount': len(inverso)}
        self.pos.append(unicos.astype(np.int16).ravel())
        self.idx.append(inverso.astype(np.uint32).ravel())
        self.nv += len(unicos)
        self.ni += len(inverso)
        return entrada

    def binario(self):
        indices = np.concatenate(self.idx).astype('<u4').tobytes()
        posiciones = np.concatenate(self.pos).astype('<i2').tobytes()
        return indices + posiciones, {'bytes_indices': len(indices), 'bytes_posiciones': len(posiciones)}


def main():
    mallas = leer()
    paquete = Paquete()
    grupos = {}
    for nombre, capas in {'pavimento': ['L1_Suelo Pavimento'], 'jardineria': ['L2_Suelo Jardinería'],
                          'muro': ['L5_Muro Limite'], 'huacas': ['L6_Huacas']}.items():
        grupos[nombre] = paquete.agregar(triangulos(mallas, capas))

    unidades = list(np.load(TRABAJO / 'edificios_plano_local.npy', allow_pickle=True))
    geoms = [shapely.from_wkb(u['geom']).buffer(0.6) for u in unidades]
    tri = triangulos(mallas, ['L3_Huellas Edificios', 'L4_Huellas casetas'])
    centros = shapely.points(tri[:, :, :2].mean(axis=1))
    i_tri, i_uni = shapely.STRtree(geoms).query(centros, predicate='within')
    asignado = np.full(len(tri), -1)
    asignado[i_tri] = i_uni
    print(f'triángulos de edificios: {len(tri)} | asignados a un edificio del plano: {(asignado >= 0).sum()}', file=sys.stderr)

    datos_paginas = json.loads((TRABAJO / 'datos.json').read_text(encoding='utf-8'))
    caso_de = {u['codigo']: u['caso'] for u in datos_paginas['edificios_plano']}
    salida_unidades = []
    for k, u in enumerate(unidades):
        propios = tri[asignado == k]
        if not len(propios):
            continue
        salida_unidades.append({'codigo': u['codigo'], 'tipo': 'edificio' if u['capa'].startswith('L3') else 'caseta',
                                'alto': round(u['alto'], 1) if u['alto'] > 0.5 else None, 'base': round(u['base'], 1),
                                'area': round(u['area'], 1), 'caso': caso_de.get(u['codigo']),
                                **paquete.agregar(propios)})

    binario, tamanos = paquete.binario()
    comprimido = gzip.compress(binario, 9)
    casos = [{k: c.get(k) for k in ('numero', 'tipo', 'plano', 'osm', 'nombres', 'iou', 'desplazamiento_m', 'iou_centrado',
                                    'area_plano', 'area_osm', 'alto_plano', 'base_plano', 'alto_osm_medido')}
             for c in datos_paginas['casos']]
    osm = [{k: b[k] for k in ('id', 'nombre', 'campus', 'alto_osm', 'alto_osm_estimado', 'pisos', 'anillos', 'caso')}
           for b in datos_paginas['osm']]
    datos = {'paso': PASO, 'bytes_indices': tamanos['bytes_indices'], 'grupos': grupos, 'unidades': salida_unidades, 'casos': casos, 'osm': osm,
             'limite': datos_paginas['limite'], 'binario': base64.b64encode(comprimido).decode('ascii')}
    texto = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
    (TRABAJO / 'datos_3d.json').write_text(texto, encoding='utf-8')
    print(f"binario {len(binario) / 1e6:.2f} MB ({tamanos}) → gzip {len(comprimido) / 1e6:.2f} MB | "
          f"datos_3d.json {len(texto) / 1e6:.2f} MB | grupos { {k: v['icount'] // 3 for k, v in grupos.items()} } "
          f"| edificios con malla {len(salida_unidades)}")


if __name__ == '__main__':
    main()
