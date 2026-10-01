# SPEC-102 — Mapa 3D del campus

| Campo | Valor |
|-------|-------|
| HU relacionada | `REQ 2.1` Mapa interactivo · `REQ 2.4` Búsqueda en mapa · `REQ 2.5` Capas · `REQ 3.4` Marcado de zona · `REQ 6.9` Mapa de calor |
| Autor | Equipo Hesperides |
| Plataforma | Ambas (web y Android, el mismo visor) |
| Sprint | S2 |
| Dependencias | SPEC-002 (§4.3, §4.5, §4.8), SPEC-003, SPEC-005 (§4.4), SPEC-C01 (§6), SPEC-C03 |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-005 §4.4 (zonas, referencias y zonas de supervisión), que este
> spec amplía · SPEC-C01 §6, que este spec **sustituye**.

> **Enmiendas que introduce** (anotadas en [`REGISTRO.md`](../REGISTRO.md)): SPEC-C01 §6 (Leaflet
> sale; entra el visor 3D) · SPEC-005 §4.4 (xerofíticas, reserva, subsecciones) · SPEC-002 §4.8
> (la incidencia guarda la descripción de su ubicación).

---

## 1. Objetivo

Incorporar al sistema el visor 3D del campus que el equipo construyó como prototipo
(`Campus_PUCP_3D_v39_edificio_contiguo.html`) como **el único mapa de Hesperides**, en web y en
la app Android, alimentado desde la base de datos y no desde datos incrustados.

## 2. Contexto

### 2.0 Qué es el prototipo v39 y qué se conserva

Es un HTML de 1.4 MB: Three.js r147 embebido, ~1300 líneas de código propio y 14 capas de datos
incrustadas como JSON. Sin servicios externos (salvo Google Fonts). Requiere WebGL.

| Se conserva | Se descarta |
|---|---|
| El aspecto: modelado 3D de edificios y vegetación, día/noche por hora solar, modos de color, leyenda, capas | Los datos incrustados: pasan a la base de datos |
| El buscador de edificios, jardines y lugares | El código en un solo archivo: se parte en módulos (REGLAS, 200 líneas) |
| El algoritmo de cercanía (§2.5, D-04) | La conversión a coordenadas del prototipo, que tiene un defecto (D-06) |
| Las capas y su contenido, que son los datos validados | `jefe_de_grupo.json`: **no se aceptan redibujos** de las áreas verdes |

**Las versiones siguientes del mapa evolucionan dentro del proyecto.** El HTML queda como
referencia visual; no se vuelve a regenerar fuera.

### 2.1 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.map`
- Entidades nuevas: `CampusBuilding`, `CampusBuildingAlias`, `CampusFeature`
- Servicio: `MapLayersService` (capas y versión de datos), `LocationDescriptionService` (cercanía)
- Engine: `pe.edu.pucp.hesperides.engine.proximity` — el algoritmo de cercanía, **puro y sin I/O**
- Controller: `MapController` → `/api/v1/map`

### 2.2 Frontend web

- Rutas: `/mapa`, dentro de `app/(dashboard)/`, con un enlace directo «Mapa» en el sidebar, bajo Inicio, y
  `/embed/mapa`, solo el mapa y sin sidebar, para el `WebView` de Android (§2.3).
- Componentes: `components/map3d/` (§7.1). Three.js como dependencia npm (`three@0.147.0`, la r147
  del prototipo: la iluminación y el espacio de color cambian en versiones posteriores). El visor
  se importa dentro de un efecto, así que three solo se descarga en el cliente y en esta pantalla.
- Caché de capas en IndexedDB, con la etiqueta (ETag) de la versión de datos (§5.1).

### 2.3 Móvil

**La app Android muestra el mismo visor**, dentro de un `WebView` que abre `/embed/mapa` (sin
sidebar). Un solo visor para web y móvil: las versiones del mapa evolucionan en un solo lugar.
El `WebView` de Android soporta WebGL.

> ⚠️ **Pendiente:** modelo, RAM y versión de Android de los 5 equipos de la sección. El visor
> dibuja 1081 plantas y 417 edificios; el rendimiento se valida en el equipo real antes de cerrar
> CA-09. También está pendiente si el mapa debe abrir **sin señal** con la última copia.

*Alternativa descartada:* reescribir el visor nativo (`expo-gl` + Three.js). Rinde algo mejor,
pero son dos visores que mantener.

### 2.4 Restricciones técnicas

- **DEBE usar:** Three.js (MIT); PostGIS en WGS 84 (SRID 4326) para toda geometría guardada.
- **NO debe usar:** coordenadas proyectadas guardadas en la base (el plano local es solo del visor),
  `mapbox-gl`, `@react-google-maps/api` ni ninguna API key de mapas.
- Catálogos: `BUILDING_CATEGORY` (nuevo, 12), `FEATURE_TYPE` (nuevo), `RESERVATION_OWNER` (nuevo),
  `LANDSCAPE_TYPE` (nuevo: área verde o xerofítica), `IRRIGATION_CURRENT` e `IRRIGATION_PROJECT`
  (nuevos: riego actual y proyecto de riego de cada sección, los modos «Riego» y «Proyecto» del
  visor), `ZONE_TYPE`, `USE_TYPE`, `REFERENCE_CATEGORY`.

### 2.5 Decisiones propias de este spec

**D-01 · El visor 3D sustituye a Leaflet** (enmienda a SPEC-C01 §6). Leaflet se había elegido por
no depender de proveedores; el visor 3D cumple lo mismo —no usa teselas ni servicios externos— y es
el mapa que el equipo ya validó. Toda necesidad de mapa pasa por `components/map3d/`.

**D-02 · Una sola fuente de verdad: la base de datos.** El visor descarga todas las capas al
arrancar y trabaja con su copia local. La API entrega una **versión de datos**: si no cambió, el
visor no vuelve a descargar (§5.2). Nunca se editan datos dentro del visor sin pasar por la API.

**D-03 · Los edificios salen de OpenStreetMap, con atribución, hasta que lleguen los planos.**
Los contornos, alturas y pisos de los 417 edificios vienen de OpenStreetMap (ODbL). **Una copia
local no evita la licencia**: va con los datos, no con el lugar donde se guardan. Mientras se
usen, el mapa muestra «© colaboradores de OpenStreetMap». Los planos de la PUCP llegan en una
semana; al cargarlos, `source` pasa a `PUCP` y la atribución desaparece para esos edificios.

**D-04 · El algoritmo de cercanía vive en el Engine del backend.** Así web y Android describen una
ubicación exactamente igual, y la descripción que se guarda en una incidencia es reproducible. Es
el del prototipo, sin cambios de criterio:

1. **Edificio que contiene el punto** (a menos de 0.5 m).
2. **Edificio contiguo a la sección** que contiene el punto (bordes a ≤ 3 m); si hay varios, el más
   cercano al punto.
3. **Edificio más cercano.**

Nombre del edificio: su término del vocabulario → su nombre en OpenStreetMap → la referencia a
≤ 10 m (excluye las categorías Área verde, Camino, Entrada, Estacionamiento y Externo) → «Edificio
sin nombre, junto a {edificio con nombre más cercano}».

**Los tres umbrales son fijos**: son constantes del Engine (`ProximityThresholds`:
`PROXIMITY_INSIDE_M = 0.5`, `PROXIMITY_ADJACENT_M = 3`, `PROXIMITY_NAME_M = 10`), visibles en la
pantalla de parámetros como **parámetros restringidos**, el mecanismo ya existente para valores que
se muestran pero no se editan. No se guardan en la base: un valor en una tabla invitaría a
cambiarlo, y cambiarlo haría irreproducibles las descripciones ya congeladas (D-05).

**D-05 · La descripción se congela en la incidencia.** Al registrarla, el servidor calcula la
descripción y guarda el texto, la sección y el edificio. Si mañana se renombra un edificio, la
incidencia histórica no cambia. Sin señal, el móvil envía el punto y el servidor describe al
sincronizar.

**D-06 · Las geometrías se cargan desde los archivos originales, no desde el HTML.** El prototipo
tiene un defecto de proyección: proyectó los **polígonos** con 110 574 m/grado de latitud, pero
convierte las **referencias** y las coordenadas que muestra al hacer clic con 111 320. Dentro del
HTML, los lugares quedan desplazados hasta ~4 m al norte o al sur respecto de los polígonos. Los
GeoJSON de origen tienen coordenadas reales; cargarlos en PostGIS y proyectar en el visor con
**una sola función** (`projection.ts`, plano tangente local con los radios de WGS 84 en el origen)
elimina el problema.

**D-07 · El catastro se arma desde sus tres archivos, no desde la capa del HTML.**
*(Diferido: la vegetación entra con el catastro, C-10. Esta primera entrega no dibuja plantas.)* La capa de
vegetación del HTML (1081 plantas) mezcla fuentes y solo 941 plantas coinciden con el catastro por
coordenada exacta. La carga une, por coordenada exacta (< 0.2 m):

| Fuente | Registros | Aporta |
|---|---|---|
| `catastro campus.xlsx` | 962 | Especie, forma biológica, cantidad, foto, código heredado |
| `mediciones forestales - palmeras.csv` | 76 | **Altura, fuste, DAP y radio de copa exactos** → `data_source = MEASURED` |
| `mediciones forestales - Cafetos.csv` | 55 | Cafetos de Biblioteca Central y Arqueología |

Las ~125 plantas del HTML que no aparecen en ninguno de los tres archivos **no se cargan**: se
listan para revisión. Las 77 «plantas sin especie» que habían llegado con la tabla de referencias
**son estas mismas**: 75 tienen coordenada idéntica a una planta de estas fuentes. Se descartan como
duplicados.

**Altura en el visor:** una planta medida se dibuja con su altura real. Una no medida se dibuja con
la altura típica de su especie y la ficha lo dice («altura ilustrativa según la especie»). **Esa
altura ilustrativa nunca se guarda ni la consume ninguna regla** (C-09: la altura decide quién poda).

---

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/map/version` | Cualquier rol con sesión | La versión actual de los datos del mapa |
| `GET /api/v1/map/layers` | Cualquier rol con sesión | Todas las capas, con su versión. `If-None-Match` → `304` si no cambió |
| `POST /api/v1/map/describe` | Cualquier rol con sesión | Describe un punto `{lat, lon}`: sección, edificio y texto (D-04) |

`GET /layers` responde, dentro del sobre estándar, un objeto con `version`, `origin` (el origen
del plano local), `attributionRequired` (verdadero mientras haya edificios de OpenStreetMap) y
`layers`, con una `FeatureCollection` GeoJSON (WGS 84) por capa: `sectors`, `sections`,
`subsections`, `supervisionZones`, `references`, `buildings` y `features`. El límite del campus es
un `feature` de tipo `CAMPUS_BOUNDARY`. La capa de vegetación llegará con el catastro (D-07).

La etiqueta va en la cabecera `ETag` (`"<versión>"`). Como el frontend vive en otro origen, CORS
admite `If-None-Match` en el preflight y **expone** `ETag`: sin lo segundo el navegador devuelve
`null` al leerla y cada apertura lo descargaría todo.

### 3.1 Decisiones que el código no explica

- **Una sola llamada con todas las capas**, no una por capa. El visor necesita todas para dibujar
  la primera imagen; varias llamadas multiplicarían las latencias en el celular. El volumen
  (≈ 2 MB en GeoJSON sin comprimir) lo permite.
- **La versión de datos es un contador**, no una marca de tiempo: cualquier escritura en una tabla
  del mapa lo incrementa en la misma transacción. Una marca de tiempo fallaría con dos escrituras
  en el mismo milisegundo.
- **`/describe` existe aunque el visor tenga los datos.** El visor podría calcular la cercanía por
  su cuenta, pero entonces habría dos implementaciones del algoritmo que divergirían. El texto
  oficial siempre lo calcula el servidor.

---

## 4. Migración de base de datos

Las zonas, referencias y zonas de supervisión estaban diseñadas en SPEC-002 y SPEC-005 pero no
creadas; el mapa fue lo primero que las necesitó, así que se crean aquí, con la numeración
cronológica del [mapa de migraciones](../REGISTRO.md#mapa-de-migraciones):

| Versión | Qué hace |
|---|---|
| V004 | Extensión PostGIS |
| V005 | Sectores, secciones y subsecciones con su contorno; reserva, tipo de paisaje y riego |
| V006 | Zonas de supervisión, cada una con su supervisor |
| V007 | Referencias, alias y `REFERENCE_CATEGORY` |
| V008 | Edificios (contorno, altura, pisos, fuente, categoría) y sus alias |
| V009 | Mobiliario y elementos puntuales |
| V010 | La versión de datos y los triggers que la incrementan |
| V011 | La semilla, generada por `scripts/mapa/generar_semilla_mapa.py` desde `docs/dominio/datos/fuentes-mapa/` |

La descripción congelada en la incidencia (§4.4) queda reservada como `V024`, después de la
migración que crea `incidents`.

### 4.1 Edificios

```sql
CREATE TABLE campus_buildings (
    id                BIGSERIAL PRIMARY KEY,
    source            VARCHAR(10)  NOT NULL CHECK (source IN ('OSM', 'PUCP')),
    source_ref        VARCHAR(40),            -- p. ej. 'relation/5760591' de OpenStreetMap
    name              VARCHAR(200),           -- término del vocabulario o nombre de origen
    is_inferred_name  BOOLEAN NOT NULL DEFAULT FALSE,
    category_item_id  BIGINT REFERENCES catalog_items(id),   -- BUILDING_CATEGORY
    is_campus         BOOLEAN NOT NULL,       -- 162 del campus, 255 del entorno
    footprint         GEOMETRY(MultiPolygon, 4326) NOT NULL,
    height_m          NUMERIC(6, 2),
    levels            SMALLINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE campus_building_aliases (
    id          BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES campus_buildings(id),
    alias       VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

Semilla: los 417 edificios de OpenStreetMap; el vocabulario del prototipo (74 edificios con
término, 12 deducidos) como `name` e `is_inferred_name`; sus 12 categorías como `BUILDING_CATEGORY`;
sus 178 alias como `campus_building_aliases`.

### 4.2 Mobiliario

```sql
CREATE TABLE campus_features (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(30),
    feature_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),   -- FEATURE_TYPE
    name             VARCHAR(200),
    geom             GEOMETRY(Geometry, 4326) NOT NULL,   -- punto o polígono según el tipo
    attributes       JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

Tipos sembrados y su fuente: tachos (184, CSV de baterías, con tipos de residuo y foto en
`attributes`), puertas (7), fauna (19), estacionamientos (15, polígonos) y veredas en riesgo (1,
polígono). **Bebederos: fuera por ahora**, hasta tener su fuente.

**Por qué una tabla y no una por tipo:** ninguno de estos elementos tiene reglas propias hoy; son
capas que se ven y se buscan. Cuando uno gane comportamiento (p. ej. incidencias sobre un tacho),
se promueve a su propia tabla.

### 4.3 Zonas (amplía SPEC-005 §4.4)

- **Áreas xerofíticas:** las 10 entran como **secciones sin sector** (`parent_zone_id` nulo),
  con su clase («Ornato») en `description`. No pertenecen a ninguno de los 5 sectores.
- **Reserva:** `zones` gana `is_reservable` y `reservation_owner_item_id` (`RESERVATION_OWNER`:
  `DAF`, `UNIDADES`). Los 20 jardines de reserva con geometría caen al 100 % dentro de una sección:
  se marcan esas secciones, no se crean zonas. `JR-0021` se descarta: repite a `JR-0010` y no tiene
  geometría.
- **Subsecciones:** «Jardín Frutas» y «Jardín Frutas-Lado FCCSS» son dos subsecciones de
  `AV-0151`, con la geometría de sus jardines de reserva.
- **Geometría:** de `areas_verdes.geojson` (WGS 84), que coincide con el HTML en sus 521 áreas
  (7 cm de diferencia máxima, el redondeo esperable). El capataz de cada sección sale del HTML.

### 4.4 Incidencias (enmienda a SPEC-002 §4.8)

`incidents` gana `location_description TEXT`, `described_section_id` y `described_building_id`,
calculados por el servidor al registrar (D-05).

---

## 5. Comportamiento

### 5.1 Flujo principal — abrir el mapa

1. El usuario entra a `/mapa` (o abre el mapa en la app).
2. El visor lee la versión guardada en su caché y pide `GET /map/layers` con `If-None-Match`.
3. `304` → dibuja con la caché. `200` → guarda la respuesta nueva y dibuja.
4. Al hacer clic en un punto: marcador, ficha del elemento y descripción vía `POST /describe`.

### 5.2 Flujos alternativos

- **Sin WebGL:** la pantalla muestra las áreas verdes agrupadas por sector y el mismo buscador;
  elegir una abre su ficha. Ninguna operación de negocio depende de que el 3D cargue (REGLAS §0.1).
- **Sin red y con caché:** dibuja con la caché y avisa que puede estar desactualizada.
- **Sin red y sin caché:** mensaje claro; sin mapa.

### 5.3 Casos límite

- **Punto fuera del campus:** `/describe` responde la sección `null` y el edificio más cercano con
  su distancia; no falla.
- **Edificio sin nombre** y sin referencia cercana: «Edificio sin nombre, junto a {X}».
- **Dos edificios a igual distancia:** gana el de menor `id`, para que el resultado sea estable.

---

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | El mapa se dibuja solo con datos de la API | Vaciar la caché, abrir `/mapa`: una sola petición a `/map/layers` y ninguna lectura de datos incrustados |
| CA-02 | La caché evita descargas repetidas | Recargar sin cambios: `/map/layers` responde `304` |
| CA-03 | Un cambio en una zona invalida la caché | Editar una sección; recargar: `200` con la versión incrementada |
| CA-04 | El algoritmo reproduce al prototipo | Para 30 puntos de control del prototipo, `/describe` devuelve el mismo edificio |
| CA-05 | La descripción queda congelada | Registrar una incidencia, renombrar el edificio: la incidencia conserva el texto original |
| CA-06 | Polígonos y referencias alineados | Ninguna referencia queda desplazada respecto de su edificio por la proyección (D-06) |
| CA-07 | Atribución visible | Mientras haya edificios de `source = 'OSM'`, el mapa muestra «© colaboradores de OpenStreetMap» |
| CA-08 | Sin WebGL hay listas | Con WebGL desactivado, `/mapa` muestra el buscador y las listas |
| CA-09 | Corre en Android | El visor abre en el `WebView` de los equipos de la sección con fluidez aceptable *(pendiente de los modelos)* |
| CA-10 | Verificado en navegador real (INV-10) | Abrir `/mapa` en Chrome, buscar un edificio y hacer clic en un punto |

**Verificación (1 oct 2026).** CA-01, CA-02, CA-07 y CA-10 en Chrome contra los contenedores; CA-03
en `MapIntegrationTest`; CA-08 en Chrome con WebGL desactivado. **CA-04:** 30 puntos (10 en
jardines, 10 junto a bordes de edificios, 10 al azar) calculados con el propio código del v39 y
convertidos con `projection.ts` (calibración: ≤ 0.2 m en 40 edificios). **29 coinciden.** El otro
es el mismo edificio, nombrado distinto por D-06: una referencia «Pabellón V» queda a 9.5 m con las
coordenadas reales y fuera de los 10 m con las desplazadas del prototipo. La comparación detectó
una divergencia de criterio, ya corregida: el vecino de «Edificio sin nombre, junto a X» se mide
desde el punto del edificio más cercano al clic, y cuenta el vecino nombrado por una referencia.
CA-05 espera a `incidents`; CA-06 queda cubierto por la proyección única; CA-09 espera a P-01.

---

## 7. Especificación visual

La del prototipo v39: misma escena, colores, día/noche, leyenda y buscador. Cambios:

- Ocupa el área de contenido del `AppShell`; en `/embed/mapa` ocupa toda la pantalla.
- El buscador agrupa los puntos de un mismo lugar (la lista oficial marca Tinkuy con once) y
  distingue los homónimos por su lugar padre («Cuarto piso · Pabellón Z»).
- No se dibuja la línea discontinua al edificio más cercano del prototipo: la ficha del punto ya da
  el texto oficial de `/describe`.
- La atribución de OpenStreetMap va en la esquina inferior, siempre visible.

### 7.1 Módulos de `components/map3d/`

| Módulo | Responsabilidad |
|---|---|
| `projection.ts` | WGS 84 ↔ plano local. **Única** conversión del sistema |
| `sceneData.ts` | Reparte la respuesta de la API en las capas del visor, ya proyectadas |
| `modes.ts`, `infoCard.ts`, `searchIndex.ts` | Colores por modo, contenido de la ficha, índice del buscador. Puros |
| `viewer/` | three.js: escenario, luces, capas, mobiliario, cámara, selección, etiquetas. `createViewer` las compone |
| `layerCache.ts` | Copia local en IndexedDB |
| `hooks/useMapLayers.ts` | Descarga condicional y copia local |
| `MapScreen.tsx` y sus paneles | La pantalla: buscador, barra, leyenda, capas, ficha, atribución, listas sin WebGL |

---

## 8. Tests

```
Engine (Java, sin BD)
- punto dentro de un edificio → ese edificio, d = 0
- punto en una sección contigua a dos edificios → el contiguo más cercano al punto
- punto en una sección sin edificio contiguo → el edificio más cercano
- nombre: vocabulario > OSM > referencia a ≤ 10 m > «sin nombre, junto a X»
- las categorías excluidas nunca dan nombre a un edificio
- empate de distancias → menor id

Proyección (TS)
- ida y vuelta WGS 84 → plano → WGS 84 con error < 1 cm en todo el campus

Carga de datos
- 5 sectores; 521 secciones + 10 xerofíticas; 18 secciones reservables y 2 subsecciones (AV-0151)
- 4 zonas de supervisión; 411 referencias; 417 edificios (162 del campus); 227 elementos
- catastro (diferido, D-07): unión por coordenada; palmeras medidas con data_source MEASURED

API
- 304 con la versión vigente; 200 tras una escritura
- CORS: el preflight admite If-None-Match y la respuesta expone ETag

Frontend (Jest, visor simulado)
- copia local: 304 usa la copia; 200 la reemplaza; sin red usa la copia y avisa
- buscar, clic en la maqueta, clic en el suelo, modos, capas, sin WebGL, atribución
```

---

## 9. Propio de este spec

**Pendientes:**

| # | Qué falta | Bloquea |
|---|---|---|
| P-01 | Modelos de los 5 equipos Android y si el mapa debe abrir sin señal | CA-09 |
| P-02 | Planos de edificios de la PUCP (≈ 1 semana) | Retirar la atribución de OpenStreetMap |
| P-03 | Fuente de los 67 bebederos | Su capa |
| P-04 | Revisión de las ~125 plantas del HTML sin fuente | Su carga |

**Origen de los datos de carga:** `Documentos_Port/internos` (GeoJSON de áreas verdes, reserva,
xerofíticas, zonas de supervisión, fauna, puertas y estacionamientos; CSV de tachos y mediciones),
`Documentos_Port/compartidos/catastro campus.xlsx`, y el prototipo v39 para el vocabulario de
edificios y el capataz de cada sección. **No se usa `jefe_de_grupo.json`**: es un redibujo de las
áreas verdes y no se acepta.

**Calendario de reservas** (para A-09): se importa jardín, fecha, horario, unidad y estado; **sin**
nombres ni teléfonos de contacto.
