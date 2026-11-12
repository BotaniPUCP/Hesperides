# Plano PUCP → mapa de Hesperides

Herramientas para la muda de edificios: llevar el plano oficial de la PUCP
(`PUCP_BASE_FINAL.dwg`, recibido como modelo de SketchUp) al mapa del sistema, que
hoy dibuja los edificios de OpenStreetMap.

Nada de esto modifica la base de datos ni las migraciones: lee el plano, lo ubica,
lo separa en edificios y lo compara con lo que el sistema ya tiene.

## Datos

El plano no se versiona (pesa ~400 MB y es material del cliente). Vive fuera del
repositorio, en la carpeta hermana `plano-pucp-datos/` o donde indique la variable
de entorno `PLANO_PUCP_DATOS`:

```
plano-pucp-datos/
  export/    campus_pucp.glb, campus_pucp_lineas.dxf, resumen.json   (export del .skp)
  trabajo/   todo lo que producen estos scripts
```

Del export solo sirven el **GLB** (modelo 3D, completo) y el **DXF** (líneas con sus
capas). El **OBJ** del mismo export está 1000 veces más chico que el campus real: no se
usa. El DXF de líneas vino incompleto en altura; las alturas salen del GLB.

## Preparación

```bash
python -m venv ../plano-pucp-datos/.venv
../plano-pucp-datos/.venv/Scripts/python -m pip install -r scripts/mapa/plano_pucp/requirements.txt
```

## Orden de ejecución

Desde la raíz del repositorio, con el Python de ese entorno:

| Script | Hace | Escribe en `trabajo/` |
|---|---|---|
| `leer_dxf.py` | Caché de las capas útiles del DXF | `lineas.npz` |
| `alinear.py` | Primera ubicación: muro del plano contra el límite del campus | `transformacion.npz` |
| `alinear_edificios.py` | Ubicación final: huellas del plano contra los edificios de OSM (ICP rígido) | `transformacion.npz`, `alineacion.json` |
| `separar_edificios.py` | Un polígono por edificio (L3) y caseta (L4), con altura y base | `edificios_plano.geojson` (WGS84), `edificios_plano_local.npy` |
| `emparejar.py` | Empareja plano y OSM, y clasifica cada caso (coincide, desplazado, forma distinta, agrupados, mixto, solo en uno) | `emparejamiento.json`, `casos.md` |
| `preparar_datos.py` | Datos de la página: casos, edificios de ambas fuentes y capas de contexto | `datos.json` |
| `preparar_3d.py` | Mallas del plano ubicadas y comprimidas (Int16 a 2 cm + gzip) para la maqueta | `datos_3d.json` |
| `construir_pagina.py` | Páginas interactivas: comparación en planta y maqueta 3D (Three.js) | `plano-vs-mapa.html`, `plano-3d.html` |

`dibujar.py salida.png [px_por_m] [xmin ymin xmax ymax]` dibuja en PNG el plano ya
ubicado sobre OSM, para revisar a ojo sin otras herramientas.

## Lo que hay que saber del plano

- **Escala:** el plano está en metros reales (una semejanza libre da 1,00044).
- **Ubicación:** no viene georreferenciado (SketchUp lo dejó en Boulder, Colorado). Se
  ubica con giro −0,41° y un desplazamiento, con error mediano de 0,89 m contra OSM.
- **Suelo:** el suelo del modelo está en z = 91,44 m. Alturas y bases se miden desde ahí;
  una base negativa es un sótano o una plaza hundida.
- **Límite:** el muro del plano (L5) tiene cortes de más de 10 m y no cierra. El interior
  del campus se toma del contorno del suelo (L1 + L2): 41,7 ha.
- **Edificios:** 84 edificios y 90 casetas. Un complejo del plano puede corresponder a
  varios edificios de OSM.

Las coordenadas internas son metros de un plano local (x este, y norte) centrado en
lat −12,069594 / lon −77,080186; `alinear.PlanoLocal` convierte a WGS84.
