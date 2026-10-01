"""SQL de referencias, edificios y mobiliario del campus."""
import csv
import json

from sql_util import (DATOS, FUENTES, fallar, geometria, item, leer_geojson, multipoligono,
                      numero, punto, q, slug, valores)

RESIDUOS = ["No Aprovechables", "Papel y Cartón", "Plástico", "Vidrio", "Pilas", "Peligrosos",
            "RAEE", "Metales", "Aniquem", "Intermedios Plastico", "Intermedios Metal"]


def _csv(ruta):
    with ruta.open(encoding="utf-8") as archivo:
        return list(csv.DictReader(archivo))


def categorias(tipo, nombres):
    """Ítems de catálogo con el texto original como etiqueta."""
    filas = [f"((SELECT id FROM catalog_types WHERE code = '{tipo}'), {q(slug(n))}, {q(n)}, {i})"
             for i, n in enumerate(nombres, start=1)]
    return valores("INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)", filas)


def referencias():
    """Las 411 referencias oficiales, su jerarquía y sus alias (SPEC-005 §4.4.4)."""
    refs = _csv(DATOS / "referencias-oficiales.csv")
    nombres = list(dict.fromkeys(r["categoria"] for r in refs))
    filas = [f"({q(r['codigo'])}, {q(r['nombre'])}, {item('REFERENCE_CATEGORY', slug(r['categoria']))}, "
             f"{punto(r['latitud'], r['longitud'])}, {q(r['nota'])})" for r in refs]
    padres = [f"UPDATE place_references SET parent_reference_id = "
              f"(SELECT id FROM place_references WHERE code = {q(r['codigo_padre'])}) "
              f"WHERE code = {q(r['codigo'])};" for r in refs if r["codigo_padre"]]
    alias = [f"((SELECT id FROM place_references WHERE code = {q(a['codigo_referencia'])}), {q(a['alias'])})"
             for a in _csv(DATOS / "referencias-alias.csv")]
    return "\n\n".join([
        categorias("REFERENCE_CATEGORY", nombres),
        valores("INSERT INTO place_references (code, name, category_item_id, location, notes)", filas),
        "\n".join(padres),
        valores("INSERT INTO place_reference_aliases (reference_id, alias)", alias),
    ])


def _vocabulario():
    voc = json.loads((FUENTES / "vocabulario-edificios.json").read_text(encoding="utf-8"))
    categoria_de = {termino: cat for cat, terminos in voc["categorias"].items() for termino in terminos}
    return voc, categoria_de


def _fila_edificio(f, voc, categoria_de):
    p = f["properties"]
    termino = voc["vocabulario"].get(p["id"])
    if isinstance(termino, dict):
        nombre, deducido = termino["t"], bool(termino.get("inf"))
    else:
        nombre, deducido = termino or p["n"] or None, False
    categoria = categoria_de.get(nombre) if termino else None
    cat_sql = item("BUILDING_CATEGORY", slug(categoria)) if categoria else "NULL"
    pisos = int(p["lv"]) if str(p.get("lv", "")).isdigit() else None
    return (f"('OSM', {q(p['id'])}, {q(nombre)}, {str(deducido).upper()}, {cat_sql}, "
            f"{str(bool(p['c'])).upper()}, {multipoligono(f['geometry'])}, "
            f"{p['h'] if p['h'] is not None else 'NULL'}, {pisos if pisos is not None else 'NULL'})")


def edificios():
    """Los 417 edificios de OpenStreetMap con el vocabulario del prototipo (SPEC-102 §4.1)."""
    voc, categoria_de = _vocabulario()
    filas = [_fila_edificio(f, voc, categoria_de) for f in leer_geojson("edificios-osm.geojson")]
    alias = [f"((SELECT id FROM campus_buildings WHERE source_ref = {q(ref)}), {q(a)})"
             for ref, termino in voc["vocabulario"].items()
             for a in voc["alias"].get(termino if isinstance(termino, str) else termino["t"], [])]
    return "\n\n".join([
        categorias("BUILDING_CATEGORY", list(voc["categorias"])),
        valores("INSERT INTO campus_buildings (source, source_ref, name, is_inferred_name, "
                "category_item_id, is_campus, footprint, height_m, levels)", filas),
        valores("INSERT INTO campus_building_aliases (building_id, alias)", alias),
    ])


def _fila_elemento(codigo, tipo, nombre, geom_sql, atributos=None):
    attrs = q(json.dumps(atributos, ensure_ascii=False)) + "::jsonb" if atributos else "NULL"
    return f"({q(codigo)}, {item('FEATURE_TYPE', tipo)}, {q(nombre)}, {geom_sql}, {attrs})"


def _tacho(r):
    try:
        geom = punto(numero(r["Latitude"]), numero(r["Longitude"]))
    except ValueError:
        fallar(f"tacho {r['ID']}: coordenadas inválidas")
    residuos = [t for t in RESIDUOS if (r.get(t) or "").strip()]
    atributos = {k: v for k, v in {"nota": r["Note"], "residuos": residuos, "foto": r["Foto"],
                                   "accion": r["Accion"], "recomendaciones": r["Recomendaciones"]}.items() if v}
    return _fila_elemento(r["ID"], "WASTE_BIN", r["Lugar"] or r["ID"], geom, atributos)


def elementos():
    """Mobiliario y elementos del campus (SPEC-102 §4.2). Sin bebederos por ahora."""
    # La última fila de la hoja es la de totales: sin ID ni coordenadas. Solo esa
    # se salta; un tacho con ID y coordenadas inválidas sigue deteniendo todo.
    filas = [_tacho(r) for r in _csv(FUENTES / "tachos.csv") if r["ID"].strip() or r["Latitude"].strip()]
    filas += [_fila_elemento(f"PU-{f['properties']['id']}", "GATE", "Puerta", geometria(f["geometry"]))
              for f in leer_geojson("puertas_entradas.geojson")]
    filas += [_fila_elemento(f"FA-{f['properties']['id']}", "FAUNA", f["properties"]["Animal"],
                             geometria(f["geometry"])) for f in leer_geojson("fauna.geojson")]
    filas += [_fila_elemento(f"EST-{f['properties']['id']}", "PARKING", "Estacionamiento",
                             multipoligono(f["geometry"])) for f in leer_geojson("playas_de_estacionamiento.geojson")]
    for f in leer_geojson("perimetro-y-veredas.geojson"):
        p = f["properties"]
        if p["layer"] == "limite_campus":
            filas.append(_fila_elemento("CAMPUS", "CAMPUS_BOUNDARY", "Campus PUCP", multipoligono(f["geometry"])))
        else:
            filas.append(_fila_elemento(p["feature_id"], "RISKY_SIDEWALK", p["nombre"],
                                        multipoligono(f["geometry"]), {"detalle": p["detalle"]}))
    return valores("INSERT INTO campus_features (code, feature_type_item_id, name, geom, attributes)", filas)
