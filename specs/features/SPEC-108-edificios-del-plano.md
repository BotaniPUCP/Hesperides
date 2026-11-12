# SPEC-108 — Edificios del plano oficial en el mapa

| Campo | Valor |
|-------|-------|
| HU relacionada | SPEC-102 P-02 (planos de edificios de la PUCP) |
| Autor | Luis (`luisenriowo`), con Claude |
| Plataforma | Ambas: el visor es el mismo en web y en el `WebView` de Android (SPEC-102) |
| Sprint | — |
| Dependencias | SPEC-102 (lo enmienda), relaciones del SKP (rama `3d-test/relaciones-edificios-skp-completo`), catálogo de lugares (V018, V034) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-102 D-02 (la base es la fuente de verdad), D-03 (atribución), D-04
> (cercanía), D-05 (descripción congelada), §3 (ETag y formato de `/layers`), §4.1 (`campus_buildings`) y
> §7.1 (módulos de `components/map3d/`); `scripts/mapa/plano_pucp/README.md` (cómo se ubicó el plano).

> **La regla de este spec: contiene lo que el código NO dice.**
> Mientras la feature no esté implementada, este spec es la fuente de verdad.

---

## 1. Objetivo

Que el mapa 3D dibuje los edificios con los modelos del plano oficial de la PUCP (el SKP). Los
edificios se agrupan según las relaciones que Nicolás hizo a mano y llevan los nombres que resuelve
Jean Piero. El resto del mapa se ve como hoy, y nada de lo que ya apunta a un edificio se rompe.

## 2. Contexto

### 2.0 De dónde sale cada cosa

| Pieza | Fuente | Dónde está |
|---|---|---|
| Modelo del plano | `PUCP_BASE_FINAL.dwg`, entregado como `Campus SKP.skp` | Fuera del repositorio (unos 400 MB, material del cliente) |
| Piezas del SKP | 755 piezas extraídas con el SDK de SketchUp por Jean Piero | `frontend/public/models/equivalence/campus.glb` y `manifest.json` |
| Relaciones | 133 relaciones hechas a mano por Nicolás: edificios del mapa ↔ piezas del SKP ↔ códigos oficiales | `frontend/src/components/map3d/equivalence/final-relations.json` |
| Códigos oficiales | 128 códigos de la leyenda del plano, con su etiqueta | `…/equivalence/codes.json` |
| Nombres, alias y excepciones | Regla de la vista unificada de Jean Piero | `…/equivalence/unification.ts`, `building-references.json` |
| Ubicación del plano | Giro −0,41° y desplazamiento; error mediano 0,89 m contra OSM | `scripts/mapa/plano_pucp/` (`transformacion.npz`) |
| Suelo del plano y huaca | Capas L1 (pavimento), L2 (jardinería) y L6 (huacas) del modelo | Export del SKP, fuera del repositorio |

**Referencia visual aprobada.** La página de comparación «Edificios del plano en el mapa» (12 nov 2026)
muestra la app de hoy y esta propuesta con la misma cámara. Todo lo que sigue reproduce lo que el
usuario aprobó en ella.

### 2.1 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.map`.
- `MapLayerQueries.BUILDINGS`: cada edificio agrega `parentId`, `planKey`, `baseM` y `codes`.
- `MapController.LAYERS_FORMAT`: pasa de 2 a 3.
- Endpoints nuevos para el modelo (§3).
- `ProximityDataRepository`: solo lee los edificios principales, los que tienen `parent_building_id` nulo.
- No hay entidad JPA de edificios: se leen con consultas nativas y ninguna pantalla los escribe.

### 2.2 Frontend web

Todo vive en `frontend/src/components/map3d/`:

- **`viewer/sceneLayers.ts`.** Un edificio con nodo en el modelo se dibuja con sus mallas. Un edificio
  sin nodo, como la Sub-estación N-7 o los que solo están en el mapa, sigue con su prisma de hoy. Los
  edificios agrupados no se dibujan por separado: los dibuja su edificio principal.
- **`viewer/stage.ts` y `sceneLayers.ts`.** El zócalo y las capas del suelo se abren en los desniveles
  al dibujar (D-09).
- **`viewer/textures.ts`.** Texturas nuevas para la huaca: tapial y tierra.
- **`viewer/labels.ts`.** Recorte de nombres (D-12).
- **`infoCard.ts`.** La ficha muestra los códigos oficiales y cuántos edificios del mapa agrupa.
- **`searchIndex.ts`.** La búsqueda encuentra también por código y por etiqueta oficial.
- **`app/(dashboard)/mapa/page.tsx`.** Salen los botones «Relacionar mapa y SKP» y «Piloto G, Z y N». Sus
  páginas siguen existiendo en su ruta.

### 2.3 Móvil

No hay trabajo propio: Android abre el mismo visor en un `WebView`.

### 2.4 Restricciones técnicas

- **DEBE usar:**
  - `scripts/mapa/sql_util.py` para escribir el SQL.
  - El entorno de `scripts/mapa/plano_pucp/` (numpy, scipy, shapely) para generar el modelo y la migración.
- **NO debe:**
  - **Ejecutar `generar_semilla_mapa.py`:** reescribiría `V011`.
  - **Editar migraciones publicadas.**
  - **Servir el modelo desde `public/`:** quedaría descargable sin sesión (D-06).
- **Catálogos aplicables:** `BUILDING_CATEGORY`, sin cambios. Los códigos oficiales son datos del plano y
  no un catálogo editable (D-02).

### 2.5 Decisiones propias de este spec

**D-01 · Mandan las relaciones de Nicolás.** El archivo `final-relations.json` define qué piezas del SKP
y qué edificios del mapa forman cada edificio.
- *Por qué:* son el trabajo manual final del equipo; las revisó una persona que conoce el campus.
- *Origen:* decisión del usuario del 11 nov 2026.
- *Alternativa descartada:* el emparejamiento automático de `scripts/mapa/plano_pucp/emparejar.py`. Queda
  solo como control.

**D-02 · Un edificio principal por relación, y los del mapa se agrupan bajo él, sin borrarse.** Quedan 133
edificios principales: 132 relaciones (sin el Pabellón C) más el «Lugar prestado» (D-04).
- **91 relaciones con un solo edificio del mapa:** ese mismo registro pasa a ser el principal.
- **22 relaciones con varios (71 edificios):** se crea un principal. Los 71 conservan su `id`, alias y
  lugares, y apuntan a él con `parent_building_id`.
- **20 sin edificio en el mapa:** se crea su registro.

Los códigos oficiales (127) quedan en `campus_building_codes`, colgados del principal.
- *Por qué:*
  - Hay claves foráneas a `campus_buildings.id` desde los alias (V008), `places.building_id` (V018),
    `place_buildings` (V034) e `incidents.described_building_id`.
  - Una relación puede tener varios códigos oficiales: la de Maestranza tiene 9.
  - El usuario pidió «aglomerar varios edificios bajo una denominación», no borrar.
- *Alternativa descartada:* fusionar los edificios en uno y dar de baja los demás.

**D-03 · Los nombres son los de Jean Piero.** Se aplica su regla en este orden y se guarda en `name` del
edificio principal:
1. La corrección de `building-references.json`.
2. El nombre fijado en `unification.ts`.
3. El nombre escrito en la relación.
4. Los nombres del mapa actual unidos con « / ».
5. La etiqueta oficial del código.

Los edificios agrupados conservan su nombre y la etiqueta oficial queda en `campus_building_codes`.
- *Origen:* decisión del usuario del 12 nov 2026.
- *Consecuencia:* se heredan los nombres que hoy chocan, como CIGA ×2 o Desconocido_13 ×2. Quedan listados
  en §9 y no se corrigen por cuenta propia.

**D-04 · Se respetan las excepciones de Jean Piero:**
- **Sub-estación N-7:** usa la geometría del mapa, aunque el SKP tiene la pieza.
- **Caseta del edificio 95:** toma la forma de la caseta C-3446, ajustada a las medidas del edificio del
  mapa y con 8 m de alto.
- **«Lugar prestado»:** las piezas C-161 y C-1970 se separan de la relación de Maestranza, con el alias
  «Caseta junto a Maestranza».

Se escriben como datos del generador, no en el código del visor (INV-9).
- *Origen:* decisión del usuario del 11 nov 2026.

**D-05 · El Pabellón C (código 2) no entra.** No se dibuja, no se inserta y no queda como pendiente.
- *Origen:* decisión del usuario del 12 nov 2026.

**D-06 · El modelo es un archivo generado y lo sirve el backend con sesión.**
- **Qué se genera:** un script arma un GLB con un nodo por edificio principal (con nombre `plan_key`) y
  los nodos de suelo, desniveles, huaca y decoración. Arma también un manifiesto con los polígonos de los
  desniveles y el anclaje del modelo.
- **Dónde va:** los dos se versionan en `backend/src/main/resources/mapa/`.
- **Qué guarda la base:** huella, altura y base de cada edificio, para la cercanía y la ficha. La malla
  no se guarda en la base.
- *Por qué:*
  - La malla no cabe razonablemente en PostGIS, y la cercanía necesita la huella en la base.
  - Desde `public/`, el modelo del cliente se descargaría sin iniciar sesión.
- *Alternativa descartada:* que el visor lea `final-relations.json` en el navegador, como la vista
  unificada. La cercanía, la búsqueda y Android no sabrían de los grupos.

**D-07 · Los patios del SKP se vacían.** El SKP modela las losas de cada piso enteras, cruzando los
patios.
- **Dónde:** en los 9 edificios con patio en el mapa actual. El contorno del patio sale de los muros del
  propio SKP, con el patio de OSM como guía (hasta 1,5 m alrededor).
- **Qué se quita:** las losas a cualquier altura, y sus cantos y contrahuellas (piezas de menos de 0,6 m
  de alto).
- *Por qué:* sin esto, los patios se ven rellenos de losa rosada.
- *Límite:* un patio que OSM no dibujó sigue relleno.

**D-08 · Lo bajo del SKP se dibuja como suelo.** Pasan a un nodo de suelo, con el material del zócalo y
la textura proyectada según la orientación de cada cara:
- todo lo que está entero al ras (|z| ≤ 0,6 m);
- dentro de un desnivel o un patio, y hasta 2 m de su borde, todo lo que no supera 2 m de alto: pisos,
  gradas, rampas, muros de contención, barandas y taludes.

Se descarta lo que coincide con el zócalo fuera de un desnivel, porque titila contra él, y lo que ya
cubre el fondo del plano.
- *Por qué:* borrarlo dejaba cantos rosados sueltos, y dejarlo como edificio pintaba de rosado los
  pisos, las gradas y las rampas.

**D-09 · Los desniveles se ven.** Son 27 zonas y 4411 m² donde el suelo del plano baja de −0,3 m, como
el jardín hundido del CIA (−7,8 m) o el patio de Estudios Generales Letras (−2,1 m).
- **El zócalo y las capas del suelo** se abren solo donde hay piso debajo: 4351 m².
- **Cada abertura es una caja cerrada,** con muros hasta un fondo a −10,5 m. Así una rendija entre dos
  niveles muestra suelo y no cielo.
- **Los árboles dentro de un desnivel** se apoyan en su fondo.
- **La abertura se hace al dibujar** (máscara o recorte en el visor). Las geometrías de secciones y capas
  del cliente no cambian en la base.

**D-10 · La huaca se dibuja con textura de tapial.** La capa L6 del plano es el Camino Prehispánico: 461
× 17 m, con muros de hasta 4,9 m.
- **Las texturas** son procedurales y están calibradas con fotos del lugar. Los colores se midieron en la
  foto «Camino Inca» de Google Maps (julio 2026):

  | Zona | Sombra | Tono medio | Con sol |
  |---|---|---|---|
  | Muro | `#4A2011` | `#7F5337` | `#A47959` |
  | Piso | `#815633` | `#966B4C` | `#AC825F` |

- **Su aspecto:**
  - superficie grumosa, picada y con huecos de erosión;
  - estratos de apisonado ondulados;
  - juntas casi borradas;
  - tierra mate en todos los acabados.
- **No se copia la foto:** tiene derechos de autor. Solo se miden sus colores.
- Lleva la etiqueta «Camino Prehispánico».

**D-11 · El acabado se conserva.** Barniz, reflejos y sombras duras del visor de hoy, por decisión del
usuario del 12 nov 2026. Los modelos del SKP necesitan dos correcciones que no cambian el estilo:
- **Normales por cara:** malla sin índice. Con vértices compartidos, la luz se suaviza en las esquinas
  de 90°.
- **Sombra por las caras traseras:** se dibujan por las dos caras, porque el SKP trae caras invertidas,
  pero la sombra la proyectan las caras traseras. Si no, cada techo se sombrea a sí mismo y salen rayas.

**D-12 · Los nombres de las etiquetas se recortan por ancho medido.** Se mide con la fuente de la
etiqueta (600 12px Inter) y se aplica en este orden:
1. Abreviaturas de uso en la PUCP: «EE.GG.», «Dpto.», «Lab.», «Inst.», «Ing.», «Inv.», «Asoc.», «Serv.»,
   «Univ.». En un nombre en mayúsculas se escriben en mayúsculas.
2. Hasta 160 px queda tal cual. Si apenas se pasa, hasta 190 px, queda entero.
3. Si no, la primera parte antes de « / », «, », «: », « - », « + » o « (», si dice algo.
4. Si no, palabras enteras con «…», sin dejar un conector colgando.

Se aplica a todo el mapa: edificios y jardines, en la app y en la propuesta. El nombre completo sigue en
el tooltip y en la ficha.
- *Medido el 12 nov 2026:* de 148 nombres, 36 se acortan y 16 llevan «…»; la etiqueta más ancha mide 179 px.

**D-13 · La alineación del modelo es la del plano.** Giro −0,41°, error mediano 0,89 m. Difiere menos de
0,52 m de la alineación que calcula la vista unificada.

**D-14 · La atribución a OpenStreetMap se queda.** Siguen en OSM los 255 edificios del entorno y los
edificios principales que no tienen pieza del SKP. Esto enmienda SPEC-102:
- D-03 decía que la atribución desaparece al llegar los planos.
- P-02 hacía depender de ellos retirarla.

**D-15 · El desfase de las capas del cliente no se corrige aquí.** Las áreas verdes, veredas,
estacionamientos, puertas y el límite están corridos 2,5 m al oeste y 2,5 m al sur respecto de los
edificios. Corregidas, las áreas verdes calzarían con la jardinería del plano en un 76 % y no en un 57 %.
Corregirlo mueve secciones, sectores y zonas de supervisión, así que va en un cambio aparte.
- *Origen:* decisión del usuario del 12 nov 2026.

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/map/layers` | `ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO` | Las capas. Cada edificio trae `parentId`, `planKey`, `baseM` y `codes` |
| `GET /api/v1/map/models/buildings` | Igual | El GLB del plano (`model/gltf-binary`), con `ETag` |
| `GET /api/v1/map/models/buildings/manifest` | Igual | Anclaje del modelo, nodos y polígonos de los desniveles |

Propiedades de un edificio principal en `/layers`:

```json
{
  "id": 40, "name": "Artes Escénicas / Facultad de Artes Escénicas (FARES)", "inferredName": false,
  "category": null, "campus": true, "heightM": 14.2, "levels": null, "baseM": -0.4, "source": "PUCP",
  "parentId": null, "planKey": "6f1c…", "aliases": ["…"],
  "codes": [{ "code": "C51", "label": "PABELLÓN X: FACULTAD DE ARTES ESCÉNICAS, …" }]
}
```

Un edificio agrupado trae `"parentId": 40`, y su `planKey` y `codes` vienen nulos.

Manifiesto (dentro del sobre `{ok, message, data}`):

```json
{
  "version": "sha256 del GLB",
  "anchor": { "lat": -12.06959406, "lon": -77.08018610 },
  "nodes": { "6f1c…": "edificio", "suelo": "suelo", "jardin-hundido": "suelo", "muros-desnivel": "suelo",
             "fondo-desnivel": "suelo", "huaca-muro": "huaca", "huaca-tope": "huaca", "decoracion": "decoracion" },
  "sunken": [{ "type": "Polygon", "coordinates": [[[-77.0812, -12.0731], "…"]] }]
}
```

### 3.1 Decisiones que el código no explica

- **El GLB va sin el sobre `{ok, message, data}`** porque es un binario. Los errores sí lo usan (INV-1).
- **El modelo tiene su propio `ETag`** (hash del archivo), aparte de la versión de datos. El modelo
  cambia solo con un despliegue; las capas, con cada edición.
- **`LAYERS_FORMAT` pasa a 3:** una copia guardada antes, sin `parentId`, no debe recibir 304.
- **El modelo está en metros locales** (x este, z = −norte) alrededor de `anchor`. El visor lo ubica con
  `projection.ts`, igual que las capas.

## 4. Migración de base de datos

**`Vnext__group_buildings_by_plan.sql`**: toma el siguiente número libre al implementar. En las ramas
remotas ya están usados V039, V040 (dos veces) y V041. El archivo es **generado** por
`scripts/mapa/plano_pucp/generar_migracion.py` y no se edita a mano ni se regenera una vez publicado.

```sql
-- Propiedad de SPEC-108. ARCHIVO GENERADO: no se edita a mano ni se regenera.

ALTER TABLE campus_buildings
    ADD COLUMN parent_building_id BIGINT REFERENCES campus_buildings(id),
    ADD COLUMN plan_key           VARCHAR(64),
    ADD COLUMN base_m             NUMERIC(6, 2);
CREATE UNIQUE INDEX uq_campus_buildings_plan_key ON campus_buildings(plan_key) WHERE plan_key IS NOT NULL;
CREATE INDEX idx_campus_buildings_parent ON campus_buildings(parent_building_id);

CREATE TABLE campus_building_codes (
    id             BIGSERIAL PRIMARY KEY,
    building_id    BIGINT       NOT NULL REFERENCES campus_buildings(id),
    code           VARCHAR(10)  NOT NULL,
    official_label VARCHAR(300) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP
);
CREATE UNIQUE INDEX uq_campus_building_codes_code ON campus_building_codes(code) WHERE deleted_at IS NULL;

-- 91 edificios del mapa pasan a ser el principal de su relación: plan_key, nombre (D-03), huella,
--    altura y base del SKP; source = 'PUCP' si la geometría es del SKP.
-- 42 edificios principales nuevos: 22 grupos y 20 que solo están en el SKP.
-- 71 edificios del mapa apuntan a su principal con parent_building_id.
-- 127 códigos oficiales, y los alias de building-references.json en campus_building_aliases.
-- Al final, un DO comprueba 133 principales, 71 agrupados y 127 códigos; si no cuadra, aborta.
```

Lo que el DDL no dice:

- **`source_ref` no cambia.** Conserva la referencia de OSM con la que nació la fila, porque es la clave
  con la que otras migraciones encuentran un edificio. `plan_key` es el identificador de la relación.
- **La huella de un principal** es la unión de las piezas del SKP, sin lo que pasó a ser suelo (D-08).
  Su altura es la cota más alta y su base, la más baja. Un grupo sin piezas del SKP toma la unión de sus
  edificios del mapa.
- **La categoría de un principal nuevo** es la de sus edificios, si todos coinciden; si no, queda nula.
- **`campus_building_codes` no es un catálogo** (INV-2): es el registro de un documento externo, la
  leyenda del plano, y nadie lo edita.

## 5. Comportamiento

### 5.1 Flujo principal: del plano al mapa

1. **Generar el modelo y el manifiesto.** `generar_modelo.py` parte de `campus.glb`, las relaciones, la
   transformación del plano y las capas L1, L2 y L6. Aplica D-03 a D-05 y D-07 a D-10 y escribe los dos
   archivos en `backend/src/main/resources/mapa/`.
2. **Generar la migración.** `generar_migracion.py` escribe la migración con los mismos datos.
3. **Aplicar.** Flyway aplica la migración al arrancar. Los triggers de `V010` suben la versión del mapa.
4. **Dibujar.** El visor descarga las capas (formato 3), el manifiesto y el GLB, y dibuja:
   - los edificios principales con su malla o, si no la tienen, con su prisma;
   - el suelo, los desniveles y la huaca.

Los edificios agrupados no se dibujan por separado.

### 5.2 Flujos alternativos

- **El modelo no descarga:** el visor dibuja todos los edificios como prismas, con la huella de la base, y
  muestra un aviso discreto. El mapa sigue siendo usable.
- **La base no cuadra con lo esperado:** el `DO` aborta y no se aplica nada.
- **Nicolás o Jean Piero corrigen una relación:** se regeneran el modelo y el manifiesto, y se escribe
  una migración nueva solo con el cambio.

### 5.3 Casos límite

- **Cercanía:** describe con el edificio principal y su huella del SKP. Un punto dentro de un patio
  vaciado cae fuera del edificio. Las descripciones ya guardadas no cambian (SPEC-102 D-05).
- **Lugares:** un lugar ligado a un edificio agrupado sigue funcionando. En el mapa se resalta el
  principal que lo contiene.
- **Búsqueda:** por nombre, alias, código («C51») o etiqueta oficial, lleva al principal.
- **Piezas del SKP sin relación** (22, de 0,4 m² o menos): se dibujan como decoración, sin ficha.
- **Desnivel en el borde del campus:** si un desnivel cruza el límite, la abertura se recorta al zócalo.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Cifras | La base migrada tiene 133 principales, 71 agrupados, 127 códigos y 255 edificios del entorno sin cambios |
| CA-02 | Identidad | Biblioteca Central conserva su `id`, sus alias y sus lugares, y se dibuja con su modelo del SKP |
| CA-03 | Grupo | Al hacer clic en Artes Escénicas se ve un solo edificio, con el código C51 y «Agrupa 13 edificios del mapa» |
| CA-04 | Excepciones | La Sub-estación N-7 es un prisma, la caseta del edificio 95 tiene la forma de C-3446 y existe «Lugar prestado» |
| CA-05 | Sin Pabellón C | No hay modelo, fila ni código 2 |
| CA-06 | Patios | Los patios de Ciencias Humanas, Pabellón Z y Arquitectura se ven abiertos hasta el suelo |
| CA-07 | Suelo | No hay cantos rosados sueltos ni rayas que titilen bajo el pórtico del Polideportivo |
| CA-08 | Desniveles | Junto al CIA se ve el desnivel con su fondo, rampas y muros del color del suelo; por ninguna rendija se ve el cielo |
| CA-09 | Huaca | El Camino Prehispánico se ve con muros de tapial ocre y la etiqueta «Camino Prehispánico» |
| CA-10 | Acabado | Barniz y luces iguales a los de hoy, sin manchas ni rayas en los techos de los modelos |
| CA-11 | Etiquetas | Ninguna etiqueta pasa de 190 px; «Estudios Generales Ciencias» se lee «EE.GG. Ciencias» |
| CA-12 | Seguridad | Sin sesión, `/api/v1/map/models/buildings` responde 401 |
| CA-13 | Sin modelo | Con el endpoint del modelo caído, el mapa abre con prismas |
| CA-14 | Navegador (INV-10) | `/mapa` en web y en Android, claro y oscuro: se ve como la página de comparación aprobada |

## 7. Especificación visual

- La referencia es la página de comparación aprobada, del lado «Propuesta» con acabado «Brillante»
  (D-11).
- Colores, luces, cielo, texturas del zócalo y del césped, árboles y etiquetas: los del visor de hoy.
  Novedades: la huaca (D-10), el suelo de los modelos (D-08) y los desniveles (D-09).
- Ficha del edificio: agrega «Códigos oficiales» (código y etiqueta). En un grupo, agrega «Agrupa N
  edificios del mapa», con sus nombres.
- Móvil: la misma vista dentro del `WebView`.

## 8. Tests

```
Migración (Testcontainers: base en la versión anterior → la nueva)
- 133 principales (parent_building_id nulo, plan_key único) y 71 agrupados con un principal existente
- los ids de los 162 edificios del campus se conservan; alias, places y place_buildings intactos
- los 255 del entorno quedan idénticos
- 127 códigos, sin el 2; cada uno en un principal
- source_ref de los edificios reutilizados no cambia
- si falta un edificio del mapa esperado, la migración falla y la tabla queda como estaba

Generador (scripts, se ejecutan a mano)
- el GLB tiene un nodo por principal con pieza del SKP, más suelo, desniveles, huaca y decoración
- en los patios vaciados no queda ninguna cara horizontal por encima de 0,6 m
- en los desniveles abiertos no queda ninguna zona sin piso debajo
- ninguna cara de los edificios queda al ras del zócalo fuera de un desnivel

API
- /layers: un principal trae planKey y codes; un agrupado, parentId; el ETag termina en -f3
- /models/buildings: 401 sin sesión, 200 con sesión y ETag; 304 con If-None-Match vigente

Cercanía
- solo compite el principal: un punto dentro de un grupo se describe con el nombre del grupo

Visor
- recortar(): «Estudios Generales Ciencias» → «EE.GG. Ciencias»; «AULAS MOVILES PSICOLOGÍA» queda entero;
  «PABELLÓN I: FACULTAD …» → «PABELLÓN I»; nunca termina en «de …»
- un edificio agrupado no se dibuja; uno principal sin nodo se dibuja como prisma
```

## 9. Propio de este spec

### 9.1 Pendientes para Nicolás o Jean Piero

| # | Qué revisar |
|---|---|
| P-01 | **CIGA ×2:** el edificio 13 se llama «CIGA» en el mapa, pero es C47 (Pulso PUCP); el CIGA oficial es C48 (edificio 61) |
| P-02 | **«Desconocido_13» ×2,** a 725 m uno del otro, y otras 13 relaciones sin nombre (Desconocido_01 a _14) |
| P-03 | **Relación C06-C07:** su pieza y el edificio 109 no se superponen (IoU 0) |
| P-04 | **Códigos C05, C08 y C33,** descartados de la leyenda sin explicación |
| P-05 | **Nombres repetidos:** Facultad de Ciencias Sociales ×2, Facultad de Educación ×2, Facultad de Letras y Ciencias Humanas ×2, Arte Antiguo ×3 |
| P-06 | **Edificio 95:** el mapa lo llama «Comedor de Arte Antiguo», pero está a 7 m de Estudios Generales Ciencias |
| P-07 | **Huacas 20 y 64:** no están en la capa L6 del plano y no se dibujan |
| P-08 | **Los archivos de la vista unificada en `public/`** (`campus.glb`, `portable.js`, pilotos) se pueden descargar sin sesión |

### 9.2 Para el equipo

- **V040** quedó usada dos veces en ramas distintas (rol de contacto y elementos de conjuntos).
- **El desfase de 3,5 m de las capas del cliente** espera su propio cambio (D-15).

### 9.3 Lo que no se versiona

El `.skp`, su exportación y `plano-pucp-datos/trabajo/` quedan fuera del repositorio. Se versionan el
GLB y el manifiesto generados, en `backend/src/main/resources/mapa/`, y la migración.
