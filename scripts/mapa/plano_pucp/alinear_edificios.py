"""Refina la ubicación del plano encajando sus huellas de edificios con las de OpenStreetMap.

Parte de la transformación del ajuste por perímetro (transformacion.npz), recorta
el 40 % de pares más lejanos (edificios que solo están en una fuente) y prueba
dos modelos: semejanza libre (con escala) y rígido (escala fija en 1).
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from alinear import (FUENTES, PlanoLocal, anillos_a_segmentos, aplicar, cercanos, muestrear,  # noqa: E402
                     punto_a_segmentos, semejanza)

from rutas import TRABAJO  # noqa: E402
SUELO = 91.44


def icp(origen, destino, t, rigido, recorte=0.6, iteraciones=80):
    for _ in range(iteraciones):
        idx, dist = cercanos(aplicar(t, origen), destino)
        quedan = dist <= np.quantile(dist, recorte)
        e, r, tr = semejanza(origen[quedan], destino[idx[quedan]])
        if rigido:  # misma rotación, escala 1: se recalcula la traslación
            e = 1.0
            tr = destino[idx[quedan]].mean(0) - r @ origen[quedan].mean(0)
        nueva = (e, r, tr)
        if abs(e - t[0]) < 1e-9 and np.allclose(r, t[1], atol=1e-10) and np.allclose(tr, t[2], atol=1e-5):
            return nueva
        t = nueva
    return t


def main():
    previa = np.load(TRABAJO / 'transformacion.npz')
    plano = PlanoLocal(float(previa['lat0']), float(previa['lon0']))
    lineas = np.load(TRABAJO / 'lineas.npz')['L3_Huellas_Edificios']
    base = lineas[(np.abs(lineas[:, 2] - lineas[:, 5]) < 0.01) & (np.abs(lineas[:, 2] - SUELO) < 0.05)]
    origen = muestrear(base[:, [0, 1, 3, 4]], 1.0)

    osm = json.load(open(FUENTES / 'edificios-osm.geojson', encoding='utf-8'))['features']
    anillos = [plano.a_metros(np.array(a)) for f in osm if f['properties']['c'] == 1
               for a in f['geometry']['coordinates']]
    seg_osm = anillos_a_segmentos(anillos)
    destino = muestrear(seg_osm, 1.0)
    print(f'huellas del plano a nivel de suelo: {len(base)} aristas → {len(origen)} puntos | '
          f'OSM campus: {len(anillos)} anillos → {len(destino)} puntos')

    inicial = (float(previa['escala']), previa['r'], previa['tr'])
    resultados = {}
    for nombre, rigido in (('semejanza', False), ('rigido', True)):
        t = icp(origen, destino, inicial, rigido)
        d = punto_a_segmentos(aplicar(t, origen), seg_osm)
        giro = math.degrees(math.atan2(t[1][1, 0], t[1][0, 0]))
        resultados[nombre] = (t, d)
        print(f'{nombre:<10} escala {t[0]:.5f}  giro {giro:8.4f}°  traslación {t[2].round(2)}  '
              f'mediana {np.median(d):.2f} m  p75 {np.quantile(d, .75):.2f}  p90 {np.quantile(d, .9):.2f}  '
              f'<1 m {(d < 1).mean():.0%}  <2 m {(d < 2).mean():.0%}')

    elegido = 'semejanza' if np.median(resultados['semejanza'][1]) < np.median(resultados['rigido'][1]) - 0.1 else 'rigido'
    t, d = resultados[elegido]
    np.savez(TRABAJO / 'transformacion.npz', escala=t[0], r=t[1], tr=t[2], espejo=False,
             lat0=plano.lat0, lon0=plano.lon0, modelo=elegido)
    (TRABAJO / 'alineacion.json').write_text(json.dumps({
        'metodo': f'ICP sobre huellas de edificios (L3 a z={SUELO}) contra OSM campus, recorte 60 %',
        'modelo': elegido, 'escala': round(float(t[0]), 6),
        'giro_grados': round(math.degrees(math.atan2(t[1][1, 0], t[1][0, 0])), 4),
        'traslacion_m': [round(float(v), 3) for v in t[2]],
        'origen_plano_local': {'lat': plano.lat0, 'lon': plano.lon0},
        'distancia_huella_plano_a_osm_m': {q: round(float(np.quantile(d, v)), 2) for q, v in
                                            (('p25', .25), ('mediana', .5), ('p75', .75), ('p90', .9))},
    }, indent=2, ensure_ascii=False), encoding='utf-8')
    print('elegido:', elegido)


if __name__ == '__main__':
    main()
