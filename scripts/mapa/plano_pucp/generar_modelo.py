"""Genera el modelo de los edificios del plano, su manifiesto y la tabla de principales (D-06).

Parte de las piezas del SKP de Jean Piero (campus.glb), las relaciones de Nicolás con las excepciones de
excepciones.json, la transformación del plano (transformacion.npz) y las capas L1, L2 y L6 del plano. Sigue el
flujo del prototipo aprobado (prototipo/preparar_propuesta.py) con las reglas de geometria_plano:

  backend/src/main/resources/mapa/edificios-plano.glb   un nodo por edificio con malla (nombre = plan_key), el
                                                        suelo, los desniveles, la huaca y la decoración
  backend/src/main/resources/mapa/edificios-plano.json  manifiesto: versión, anclaje, nodos, principales que son
                                                        solo suelo (sin malla ni prisma), desniveles y huaca
  trabajo/edificios_plano_principales.json              huella, alto y base de cada principal (para la migración)

Uso: python generar_modelo.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import mapping, shape

sys.path.insert(0, str(Path(__file__).parent))
import geometria_plano as g  # noqa: E402
from alinear import PlanoLocal, aplicar  # noqa: E402
from glb import leer  # noqa: E402
from glb_escritor import escribir_glb  # noqa: E402
from relaciones import cargar_excepciones, entradas, leer_equivalencias, nombres_v011, piezas_sin_relacion  # noqa: E402
from rutas import EQUIVALENCIAS, FUENTES, MIGRACIONES, MODELO_SKP, RECURSOS_MAPA, TRABAJO  # noqa: E402

SUELO_PLANO_M = 91.44             # cota del suelo del plano: z = 0 del modelo
ORIGEN_SKP = (350, 350, 91.4397)  # origen con el que se exportó campus.glb (build-equivalence-assets.mjs)
CAPAS_SUELO = {'pav': 'L1_Suelo Pavimento', 'jard': 'L2_Suelo Jardinería'}
CAPA_HUACA = 'L6_Huacas'
ETIQUETA_HUACA = 'Camino Prehispánico'
ALTO_POR_DEFECTO_M = 8.0          # el de un edificio del mapa sin altura (DEFAULT_HEIGHT_M del visor)
PRECISION_M = 0.001               # grilla de las huellas y los desniveles en WGS84


def _al_mapa(tri, transformacion):
    """Lleva los triángulos del marco del plano a metros locales con la transformación del plano."""
    t = (float(transformacion['escala']), transformacion['r'], transformacion['tr'])
    tri = tri.copy()
    tri[:, :, :2] = aplicar(t, tri[:, :, :2].reshape(-1, 2)).reshape(-1, 3, 2)
    return tri


def _piezas_skp(transformacion):
    """Las piezas de campus.glb en metros locales, por id de pieza."""
    piezas = {}
    for m in leer(MODELO_SKP):
        tri = m['tri'] + [ORIGEN_SKP[0], ORIGEN_SKP[1], ORIGEN_SKP[2] - SUELO_PLANO_M]
        piezas[m['nombre']] = _al_mapa(tri, transformacion)
    return piezas


def _capa_plano(mallas, nombre, transformacion):
    tri = np.concatenate([m['tri'] for m in mallas if m['capa'] == nombre]) - [0, 0, SUELO_PLANO_M]
    return _al_mapa(tri, transformacion)


def _al_visor(tri):
    """Del marco local (x este, y norte, z arriba) al del visor: (x, z, −y)."""
    return np.stack([tri[:, :, 0], tri[:, :, 2], -tri[:, :, 1]], axis=-1)


def _wgs84(geom, plano):
    """Geometría en metros locales a GeoJSON en WGS84 (lon, lat).

    Primero se ajusta a una grilla de 1 mm, que conserva la validez: la unión de miles de triángulos deja astillas
    con vértices a 1e-10 m, que en grados caen en el mismo número y dejan anillos degenerados. a_grados es afín por
    eje, así que después no se pierde la validez (redondear los grados, en cambio, sí la rompería).
    """
    return mapping(shapely.transform(shapely.set_precision(geom, PRECISION_M), plano.a_grados))


def _pisos_en_planta(pisos):
    """Las caras de piso con área en planta (sin las verticales) y su huella, para _piso_del_desnivel."""
    a = np.abs(np.cross(pisos[:, 1] - pisos[:, 0], pisos[:, 2] - pisos[:, 0])[:, 2]) / 2
    pisos = pisos[a > 1e-3]
    return pisos, shapely.polygons(np.concatenate([pisos[:, :, :2], pisos[:, :1, :2]], axis=1))


def _piso_del_desnivel(parte, pisos, plantas):
    """La cota en que se apoyan las plantas de una abertura: el nivel de piso, en pasos de 10 cm, que más área
    ocupa dentro de ella. Cada cara pesa por la parte de su huella que cae en la abertura."""
    area = shapely.area(shapely.intersection(plantas, parte))
    niveles, cual = np.unique(np.round(pisos[:, :, 2].mean(axis=1), 1), return_inverse=True)
    return float(niveles[np.bincount(cual, weights=area).argmax()])


def main(recursos: Path = RECURSOS_MAPA, trabajo: Path = TRABAJO):
    transformacion = np.load(TRABAJO / 'transformacion.npz')
    plano = PlanoLocal(float(transformacion['lat0']), float(transformacion['lon0']))

    # 1. Piezas del SKP, relaciones y edificios del mapa, en metros locales
    piezas = _piezas_skp(transformacion)
    relaciones, codigos, referencias = leer_equivalencias(EQUIVALENCIAS)
    osm = json.loads((FUENTES / 'edificios-osm.geojson').read_text(encoding='utf-8'))['features']
    sql = next(MIGRACIONES.glob('V011__*.sql')).read_text(encoding='utf-8')
    excepciones = cargar_excepciones(Path(__file__).parent / 'excepciones.json')
    lista = entradas(relaciones, codigos, referencias, nombres_v011(sql, osm), excepciones)
    sueltas = piezas_sin_relacion(relaciones, list(piezas), excepciones)
    mapa = {str(i + 1): (shapely.transform(shape(f['geometry']), plano.a_metros).buffer(0), f['properties'].get('h'))
            for i, f in enumerate(osm)}
    mallas_plano = leer()
    suelo_plano = {k: _capa_plano(mallas_plano, capa, transformacion) for k, capa in CAPAS_SUELO.items()}

    # 2. Desniveles: lo que baja del suelo del plano y de las piezas en uso (el Pabellón C ya no está)
    en_uso = np.concatenate([piezas[p] for e in lista for p in e.piezas] + [piezas[p] for p in sueltas])
    hundido, cubierto = g.zonas_hundidas(suelo_plano, en_uso)

    # 3. Cada edificio separa su parte de suelo (D-07, D-08); la caseta toma la forma de su plantilla (D-04).
    #    Si todo pasa a ser suelo (las rampas de los estacionamientos), el principal queda sin nodo y sin prisma.
    edificios, solo_suelo, suelos = {}, {}, []
    for e in lista:
        if e.geometria == 'skp':
            tri = np.concatenate([piezas[p] for p in e.piezas])
            huecos = [shapely.Polygon(r) for i in e.map_ids for p in shapely.get_parts(mapa[i][0]) for r in p.interiors]
            edificio, suelo = g.separar(tri, g.patio_del_skp(tri, huecos), hundido, cubierto)
            suelos.append(suelo)
            if len(edificio):
                edificios[e.plan_key] = edificio
            else:
                solo_suelo[e.plan_key] = tri
        elif e.geometria == 'adaptada':
            destino, alto = mapa[e.map_ids[0]]
            destino = max(shapely.get_parts(destino), key=lambda q: q.area)
            edificios[e.plan_key] = g.adaptar_caseta(piezas[excepciones['plantilla_caseta']], destino, alto or ALTO_POR_DEFECTO_M)
    decoracion = []
    for p in sueltas:
        resto, suelo = g.separar(piezas[p], shapely.Polygon(), hundido, cubierto)
        decoracion.append(resto)
        suelos.append(suelo)

    # 4. Aberturas de los desniveles: solo donde hay piso debajo, cerradas con muros y fondo (D-09)
    piso = g.piso_en_hundido(suelo_plano, hundido)
    banda = np.concatenate(suelos)
    pisos = np.concatenate([piso['pav'], piso['jard'], banda])
    corte = g.corte_con_piso(hundido, pisos)
    muros, fondo = g.muros_y_fondo(corte)

    # 5. Huaca (D-10)
    huaca_muro, huaca_tope, (hx, hy, hz) = g.huaca(_capa_plano(mallas_plano, CAPA_HUACA, transformacion))

    # 6. GLB, manifiesto y tabla de principales
    nodos = [(k, _al_visor(t), None, 'edificio') for k, t in edificios.items()]
    for nombre, tri, tipo in [('suelo', np.concatenate([piso['pav'], banda]), 'suelo'),
                              ('jardin-hundido', piso['jard'], 'jardin'),
                              ('muros-desnivel', muros, 'muro'), ('fondo-desnivel', fondo, 'muro'),
                              ('huaca-muro', huaca_muro, 'huaca-muro'), ('huaca-tope', huaca_tope, 'huaca-tope')]:
        nodos.append((nombre, _al_visor(tri), g.uv_por_cara(tri), tipo))
    nodos.append(('decoracion', _al_visor(np.concatenate(decoracion)), None, 'decoracion'))

    recursos.mkdir(parents=True, exist_ok=True)
    trabajo.mkdir(parents=True, exist_ok=True)
    version = escribir_glb(recursos / 'edificios-plano.glb', [(n, t, uv) for n, t, uv, _ in nodos])
    hlon, hlat = plano.a_grados([[hx, hy]])[0]
    con_planta = _pisos_en_planta(pisos)
    manifiesto = {
        'version': version,
        'anchor': {'lat': plano.lat0, 'lon': plano.lon0},
        'nodes': {n: tipo for n, _, _, tipo in nodos},
        'groundOnly': sorted(solo_suelo),
        'sunken': [{'polygon': _wgs84(p, plano), 'floorM': _piso_del_desnivel(p, *con_planta)} for p in shapely.get_parts(corte)],
        'huaca': {'label': ETIQUETA_HUACA, 'at': [float(hlat), float(hlon), hz]},
    }
    (recursos / 'edificios-plano.json').write_text(json.dumps(manifiesto, ensure_ascii=False, separators=(',', ':')) + '\n',
                                                   encoding='utf-8')

    principales = []
    for e in lista:
        # El de solo suelo toma todas sus piezas: sin ellas su huella quedaría vacía
        tri = edificios.get(e.plan_key, solo_suelo.get(e.plan_key))
        if tri is not None:
            huella, alto, base = g.huella(tri), float(tri[:, :, 2].max()), float(tri[:, :, 2].min())
        else:  # D-04: sin malla, el principal toma la unión de sus edificios del mapa
            huella = shapely.union_all([mapa[i][0] for i in e.map_ids])
            alturas = [mapa[i][1] for i in e.map_ids if mapa[i][1] is not None]
            alto, base = (max(alturas) if alturas else None), 0.0
        principales.append({'plan_key': e.plan_key, 'huella': _wgs84(huella, plano),  # + 0.0: sin «−0.0»
                            'alto_m': None if alto is None else round(alto, 2) + 0.0, 'base_m': round(base, 2) + 0.0})
    (trabajo / 'edificios_plano_principales.json').write_text(json.dumps(principales, ensure_ascii=False), encoding='utf-8')

    tipos = {}
    for _, t, _, tipo in nodos:
        tipos.setdefault(tipo, [0, 0])
        tipos[tipo][0] += 1
        tipos[tipo][1] += len(t)
    peso = (recursos / 'edificios-plano.glb').stat().st_size
    print(f'entradas {len(lista)}: {len(edificios)} con malla, {len(solo_suelo)} solo suelo {sorted(solo_suelo)} y '
          f'{len(lista) - len(edificios) - len(solo_suelo)} con el prisma del mapa; '
          f'{len(sueltas)} piezas sin relación como decoración')
    print('nodos (cantidad, triángulos): ' + ', '.join(f'{k} {n} / {c}' for k, (n, c) in tipos.items()))
    print(f'desniveles: {len(shapely.get_parts(hundido))} zonas, {hundido.area:.0f} m²; el zócalo se abre en '
          f'{len(manifiesto["sunken"])} polígonos, {corte.area:.0f} m²; pisos de '
          f'{min(s["floorM"] for s in manifiesto["sunken"]):.1f} a {max(s["floorM"] for s in manifiesto["sunken"]):.1f} m')
    print(f'huaca: {len(huaca_muro)} triángulos de muro y {len(huaca_tope)} arriba; etiqueta a {hz} m')
    print(f'GLB {peso / 1e6:.2f} MB, versión {version[:12]}…; {len(principales)} principales en '
          f'{trabajo / "edificios_plano_principales.json"}')


if __name__ == '__main__':
    main()
