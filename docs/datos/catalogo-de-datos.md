# Catálogo de datos

Qué archivos de datos tiene el proyecto, de dónde salen y qué los usa. Los datos que el sistema
usa **al funcionar o en sus pruebas** no están aquí: viven junto a su código (las plantillas que
descarga el backend en `backend/src/main/resources/imports/templates/`, las imágenes de
`frontend/public/` y del correo, y los `__fixtures__` de las pruebas).

| Carpeta | Qué guarda | ¿En Git? |
|---|---|---|
| [`originales/`](originales/) | Lo que entregó el cliente, tal cual, sin datos de personas | Sí |
| `privados/` | Lo que entregó el cliente con datos de personas | **No** (`.gitignore`) |
| [`procesados/`](procesados/) | Lo que el equipo depuró a partir de los originales; de aquí leen los scripts | Sí |

## Por qué hay una carpeta privada

El repositorio `BotaniPUCP/Hesperides` es **público**. Lo que se sube queda visible y en el
historial aunque luego se borre. Los archivos con contactos, teléfonos o nombres de trabajadores
viven solo en la máquina de cada integrante, en `docs/datos/privados/`. Quien los necesite los
pide al equipo y los copia ahí con el nombre de la tabla de abajo.

## Originales del cliente

Copiados el 11 nov 2026 desde la carpeta de trabajo del equipo (`Documentos_Port`): `compartidos`
es lo que envió la Sección de Áreas Verdes u OSG; `internos`, exportaciones que hizo el equipo de
esos mismos documentos. Solo se cambió el nombre del archivo.

### `originales/` (versionados)

| Archivo | Nombre original | Qué es |
|---|---|---|
| `compartidos/catastro-campus.xlsx` | `catastro campus.xlsx` | Catastro de ejemplares del campus |
| `internos/areas-verdes.geojson` | `areas_verdes.geojson` | Polígonos de las áreas verdes del mapa del cliente |
| `internos/xerofitica.geojson` | `xerofitica.geojson` | Áreas xerofíticas |
| `internos/jardines-reserva.geojson` | `jardines_reserva.geojson` | Jardines que se prestan |
| `internos/supervisores.geojson` | `supervisoress.geojson` | Zonas de supervisión |
| `internos/fauna.geojson` | `fauna.geojson` | Puntos de fauna |
| `internos/playas-de-estacionamiento.geojson` | `playas_de_estacionamiento.geojson` | Estacionamientos |
| `internos/puertas-entradas.geojson` | `puertas_entradas.geojson` | Puertas de ingreso |
| `internos/jefe-de-grupo.json` | `jefe_de_grupo.json` | Capataz por sección (nombres de pila, ya publicados en `procesados/mapa/capataz-por-seccion.csv`) |
| `internos/bateria-de-tachos.csv` | `bateria de tachos.xlsx - total de baterias actual (roobert).csv` | Baterías de tachos |
| `internos/dispensadores-de-agua-helada.csv` | `Dispensadores de agua helada - Hoja 1.csv` | Bebederos y dispensadores |
| `internos/crawler-google-places-2026-07-14.csv` | `dataset_crawler-google-places_2026-07-14_16-49-07-156.xlsx - Data.csv` | Lugares del campus en Google Maps |
| `internos/mediciones-forestales-cafetos.csv` | `mediciones forestales  - Cafetos.csv` | Mediciones de cafetos |
| `internos/mediciones-forestales-palmeras.csv` | `mediciones forestales  - palmeras.csv` | Mediciones de palmeras |
| `internos/recuperacion-mantenimiento-lugares.csv` | `Recuperación y mantenimiento  de Áreas Verdes 2025-2026 - lugares.csv` | Lugares con coordenadas de la hoja de mantenimiento |
| `internos/recuperacion-mantenimiento-tipos-de-actividad.csv` | `… - tipo de actividades.csv` | Clases y tipos de actividad (origen de la taxonomía de intervenciones) |

Los `.geojson` originales **no son iguales** a los de `procesados/mapa/`: allí están ya depurados.

### `privados/` (solo local)

| Archivo | Nombre original | Por qué es privado |
|---|---|---|
| `compartidos/calendario-reservas-jardines-2026.xlsx` | `Calendario_reservas_jardines 2026 (1).xlsx` | Contacto, teléfono y correo de quien reserva |
| `compartidos/matriz-incidencias-y-reclamos-osg.xlsx` | `Matriz Unificada de Incidencias y Reclamos – OSG.xlsx` | Quién reportó, responsable y correo |
| `internos/calendario-reservas-jardines-2026-eventos.csv` | `Calendario_reservas_jardines 2026 - Eventos.csv` (había dos copias idénticas) | 54 teléfonos o correos de contacto |
| `internos/recuperacion-mantenimiento-2026.csv` | `Recuperación y mantenimiento  de Áreas Verdes 2025-2026 - 2026.csv` | Nombre del responsable de cada atención |
| `internos/recuperacion-mantenimiento-podas-arboles-palmeras.csv` | `… - Podas arb_palm.csv` | Personal a cargo y quién reportó |

## Procesados

Los nombres de estos archivos no cambian: los leen los scripts y los mencionan specs y
migraciones.

| Archivo | Lo usa |
|---|---|
| `especies.csv`, `nombres-catastro.csv` | `scripts/catastro/fuentes.py` |
| `catastro/catastro.csv`, `catastro/mediciones-palmeras.csv` | `scripts/catastro/fuentes.py` |
| `catastro/mediciones-bosque-humedo.csv` | `generar_actualizacion_2026.py`, `tabla_ejemplares.py` |
| `catastro/mediciones-cafetos.csv` | Referencia; ningún script lo lee |
| `ejemplares.csv` | Lo **escribe** `tabla_ejemplares.py`; lo lee `generar_semilla_catastro.py` |
| `fotos-especies-creditos.csv` | `scripts/catastro/descargar_fotos_especies.py` (las fotos no se versionan) |
| `plantas-sin-especie.csv`, `plantas-sin-fuente.csv` | Pendientes de depuración del catastro; ningún script los lee |
| `referencias-oficiales.csv`, `referencias-alias.csv` | `scripts/mapa/capas.py` |
| `mapa/areas_verdes.geojson`, `xerofitica.geojson`, `jardines_reserva.geojson`, `supervisoress.geojson`, `capataz-por-seccion.csv` | `scripts/mapa/zonas.py` |
| `mapa/edificios-osm.geojson`, `fauna.geojson`, `perimetro-y-veredas.geojson`, `playas_de_estacionamiento.geojson`, `puertas_entradas.geojson`, `tachos.csv`, `vocabulario-edificios.json` | `scripts/mapa/capas.py` |
| `mapa/bebederos/*.geojson` | `generar_actualizacion_2026.py` |
| `mapa/equivalencias-jardines-reserva.csv` | Equivalencia de nombres del calendario de la OSG con las secciones; base de V035 |

## Migraciones que mencionan la ruta antigua

Estos datos estuvieron en `docs/dominio/datos/` (y sus subcarpetas `fuentes-mapa/` y
`fuentes-catastro/`). Las migraciones ya aplicadas (`V011`, `V014`, la actualización de 2026)
conservan esa ruta en sus comentarios, y los generadores la siguen escribiendo: cambiar una sola
letra de una migración aplicada hace que Flyway rechace toda base donde ya corrió.

Al regenerar `V014` el 11 nov 2026 salió distinta: `especies.csv` se corrigió después de aplicarla
(*Chlorophytum comosum* y *Matthiola incana* pasaron a `HERB`). Esa corrección ya vive en la base
por otra migración; `V014` no se toca.
