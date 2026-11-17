"""
Entorno del campus para el modo Atardecer del mapa (frontend/public/map/sunset/entorno.json).

Pide a Overpass los edificios, las vías y las áreas verdes de OpenStreetMap alrededor de la PUCP
y los guarda compactos: metros respecto de `origen` (x al este, y al norte), redondeados a 10 cm.
Lo que cae dentro del campus no se guarda: allí manda el modelo del mapa.

Datos © colaboradores de OpenStreetMap, ODbL (https://www.openstreetmap.org/copyright).

Uso: python entorno_osm.py ../../frontend/public/map/sunset/entorno.json
"""
import hashlib
import json
import math
import sys
import urllib.parse
import urllib.request

# Centro y caja del campus (de docs/datos/procesados/mapa/edificios-osm.geojson), y radio del entorno.
CENTRO = (-12.06984, -77.08043)
CAMPUS = {'lat': (-12.07704, -12.06265), 'lon': (-77.08552, -77.07533)}
RADIO_M = 2500
OVERPASS = 'https://overpass-api.de/api/interpreter'

# Ancho aproximado de cada clase de vía, en metros.
ANCHO = {
    'motorway': 22, 'trunk': 20, 'primary': 16, 'secondary': 13, 'tertiary': 10,
    'residential': 8, 'unclassified': 7, 'living_street': 6, 'service': 5,
}

M_LAT = 110574.0
M_LON = 111320.0 * math.cos(math.radians(CENTRO[0]))


def plano(lat, lon):
    return round((lon - CENTRO[1]) * M_LON, 1), round((lat - CENTRO[0]) * M_LAT, 1)


def en_campus(lat, lon):
    return CAMPUS['lat'][0] <= lat <= CAMPUS['lat'][1] and CAMPUS['lon'][0] <= lon <= CAMPUS['lon'][1]


def consulta(cuerpo):
    q = f'[out:json][timeout:180];({cuerpo});out geom;'
    req = urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({'data': q}).encode(),
                                 headers={'User-Agent': 'hesperides-map-builder'})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)['elements']


def altura(tags, osm_id):
    """La de OSM si la hay; si no, de 2 a 4 pisos, estable para cada edificio."""
    try:
        if 'height' in tags:
            return round(float(tags['height'].replace('m', '').strip()), 1)
        if 'building:levels' in tags:
            return round(float(tags['building:levels']) * 3.0, 1)
    except ValueError:
        pass
    h = int(hashlib.md5(str(osm_id).encode()).hexdigest()[:4], 16) / 65535
    return round(6 + h * 7, 1)


def anillo(geom):
    pts = [plano(g['lat'], g['lon']) for g in geom]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return [c for p in pts for c in p]


def main(salida):
    a = f'(around:{RADIO_M},{CENTRO[0]},{CENTRO[1]})'
    edificios, vias, verdes = [], [], []
    for e in consulta(f'way["building"]{a};'):
        g = e.get('geometry') or []
        if len(g) < 4:
            continue
        lat = sum(p['lat'] for p in g) / len(g)
        lon = sum(p['lon'] for p in g) / len(g)
        if en_campus(lat, lon):
            continue
        edificios.append([altura(e.get('tags', {}), e['id'])] + anillo(g))
    clases = '|'.join(ANCHO)
    for e in consulta(f'way["highway"~"^({clases})$"]{a};'):
        g = e.get('geometry') or []
        if len(g) < 2:
            continue
        vias.append([ANCHO[e['tags']['highway']]] + [c for p in g for c in plano(p['lat'], p['lon'])])
    for e in consulta(f'way["leisure"="park"]{a};way["landuse"~"^(grass|recreation_ground)$"]{a};way["leisure"="pitch"]{a};'):
        g = e.get('geometry') or []
        if len(g) < 4:
            continue
        lat = sum(p['lat'] for p in g) / len(g)
        lon = sum(p['lon'] for p in g) / len(g)
        if en_campus(lat, lon):
            continue
        verdes.append(anillo(g))
    datos = {
        'atribucion': '© colaboradores de OpenStreetMap, ODbL',
        'origen': list(CENTRO), 'radioM': RADIO_M,
        'edificios': edificios, 'vias': vias, 'verdes': verdes,
    }
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(datos, f, separators=(',', ':'))
    print(f'{len(edificios)} edificios, {len(vias)} vías, {len(verdes)} áreas verdes')


if __name__ == '__main__':
    main(sys.argv[1])
