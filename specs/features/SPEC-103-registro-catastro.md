# SPEC-103 — Registro del catastro y estándares de carga

| Campo | Valor |
|-------|-------|
| HU relacionada | `REQ 2.2` Registro de elementos verdes · `REQ 2.12` Registro progresivo del catastro · `REQ 2.3` Procedencia del dato dendrométrico · C-01 · C-08 · C-10 |
| Autor | Equipo Hesperides |
| Plataforma | Web (el formulario móvil de C-01 reutilizará la API) |
| Sprint | S2 |
| Dependencias | SPEC-002 (§4.5, §5.4), SPEC-003, SPEC-102, inventario verde (`docs/inventario-verde/README.md`) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-002 §5.4 (los archivos nunca entran a PostgreSQL), que este spec
> implementa por primera vez · `docs/inventario-verde/README.md` (decisiones del catastro ya cargado).

> **La regla de este spec: contiene lo que el código NO dice.** Mientras la feature no esté
> implementada, este spec **sí** es la fuente de verdad y el detalle se escribe literal.

---

## 1. Objetivo

Que **Hesperides sea la fuente oficial del catastro**. Hoy el catastro vive en una hoja de Google que
el mapa Leaflet del cliente edita en vivo. Para dejar esa hoja, el sistema debe permitir registrar lo
que falta, de dos formas: **un formulario** para una planta, una evaluación o un componente, y **una
carga por CSV** para muchas filas a la vez. Las dos usan el mismo estándar de datos, documentado y
descargable. El estándar cubre tres componentes: **árboles y plantas (ejemplares), tachos y
bebederos**.

Este spec también incorpora los datos que llegaron con `TODA DOCUMENTACION`: las medidas y
evaluaciones del Bosque Húmedo, la fecha de las mediciones y los 67 bebederos.

## 2. Contexto

### 2.0 Lo que llegó en `TODA DOCUMENTACION` (2 oct 2026)

| Fuente | Qué aporta | Cómo entra |
|---|---|---|
| `mediciones forestales.xlsx`, hoja «Bosque Húmedo» | 15 *Ceiba speciosa* (BH1–BH15 = `EV-000951`–`EV-000965`). 11 con altura, DAP y radio de copa. Las 15 con estado fitosanitario y estado actual | Migración de datos (§4.5) |
| Hoja «Formato de Registro Forestal» | La plantilla del cliente: qué registra de un árbol | Define el estándar de ejemplares (§6.2) y la evaluación (§4.2) |
| 5 GeoJSON `bebedero *.geojson` | Los 67 bebederos (P-03 de SPEC-102) | Migración de datos (§4.5) |
| `scripts/script.js` | El mapa Leaflet del cliente: lee el catastro de una hoja de Google publicada y **escribe** coordenadas con un Apps Script | Motiva este spec: dos fuentes que se separan |

La fecha de las mediciones no está en las fuentes; el cliente confirma que fueron en 2026. Se registra
**2026-01-01**, con la nota «fecha no registrada en la fuente».

### 2.1 Backend

- Paquetes: `modules.inventory` (ya existe), `modules.imports` (nuevo), `shared.storage` (nuevo).
- Servicios nuevos: `SpecimenRegistrationService`, `AssessmentService`, `CampusFeatureRegistrationService`,
  `ImportService` (vista previa y confirmación), `FileStorage` (interfaz) con `LocalFileStorage` y
  `S3FileStorage`, `PhotoProcessor` (redimensiona y genera miniatura).
- Engine: `engine.duplicates` — detección de duplicados por cercanía, pura y sin I/O.

### 2.2 Frontend web

- Grupo nuevo del sidebar, **«Catastro»** (módulo M2 del dominio), solo para quien puede registrar:
  - `/catastro/registrar` — formulario de ejemplar, con el punto elegido en el mapa 3D.
  - `/catastro/importar` — carga por CSV con vista previa.
  - `/catastro/estandares` — los estándares y sus plantillas descargables.
- La ficha del ejemplar (inventario verde) muestra la **foto real** desde nuestro almacenamiento y el
  **historial de evaluaciones**. La especie muestra su **foto genérica**.

### 2.3 Móvil

Fuera de este spec. La captura en campo de C-01 (sin conexión, con GPS) usará la misma API de
registro.

### 2.4 Restricciones técnicas

- **Los archivos no entran a PostgreSQL** (SPEC-002 §5.4). La base guarda la clave del objeto.
- **DEBE usar:** `FileStorage` para todo archivo; AWS SDK v2 solo dentro de `S3FileStorage`.
- **NO debe usar:** `BYTEA`, enlaces de Drive como foto definitiva, cliente de S3 en entidades o
  servicios de dominio.
- Catálogos: `SPECIES_ORIGIN` (primer valor: Introducida), `FEATURE_TYPE` gana `DRINKING_FOUNTAIN`,
  `FOUNTAIN_KIND` y `FOUNTAIN_STATUS` (nuevos), `WASTE_STREAM` (nuevo, los tipos de residuo de los
  tachos).

### 2.5 Decisiones propias de este spec

**D-01 · Hesperides es la fuente oficial del catastro.** Se hace una última importación de la hoja
actual del cliente con la carga por CSV; desde ahí se registra solo en Hesperides. El mapa Leaflet del
cliente deja de ser una herramienta de edición.

**D-02 · Quién registra.**

| Rol | Formulario | Carga por CSV |
|---|---|---|
| `ADMIN` | Sí | Sí |
| `COORDINADOR` | Sí | Sí |
| `SUPERVISOR` | Sí | No |
| `OPERARIO` | No | No |

**D-03 · Una fila sin código crea; una fila con código actualiza.** El sistema asigna el código
(`EV-000966`…, `TA-…`, `BB-…`). El mismo CSV sirve para altas y para correcciones: se exporta, se
corrige y se vuelve a cargar.

**D-04 · Toda carga pasa por una vista previa.** Se sube el archivo, el sistema muestra qué creará,
qué actualizará y qué problemas encontró, y solo al confirmar escribe. Qué pasa con cada problema:

| Problema | Efecto |
|---|---|
| **Error de formato:** columna obligatoria vacía, número mal escrito, punto fuera del campus, código inexistente, valor fuera de su lista | **No se carga nada** hasta corregir el archivo. Son errores del archivo |
| **Especie desconocida** | La fila **se omite**; el resto se carga. El resultado lista las especies no ingresadas con su cantidad («*Ficus elastica*: 4 filas») |
| **Posible duplicado** (D-05) | La vista previa lo marca y se decide **fila por fila**: ingresar de todas formas u omitir |
| **Foto que no se pudo descargar** | La fila entra sin foto y la vista previa lo avisa |

**D-05 · Duplicado por cercanía, con umbral según el tipo de planta.** Una fila nueva es posible
duplicado si hay otra planta **de la misma especie** a menos de:

| Tipo de vegetación | Umbral |
|---|---|
| Árbol | 1.5 m |
| Palmera | 1 m |
| Arbusto, seto, trepadora | 0.5 m |
| Planta herbácea, suculenta, cubresuelo, macetones | 0.3 m |

Los umbrales son fijos y se muestran como **parámetros restringidos** (visibles, no editables), igual
que los de cercanía del mapa. Para tachos y bebederos el umbral es 1 m, sin distinguir especie.

**D-06 · La evaluación es un historial con fecha.** El estado de un árbol cambia: las ramas secas de
hoy no son las de dentro de seis meses. Cada evaluación queda registrada con su fecha y quién la hizo;
la ficha muestra la más reciente y el historial. Los campos son los del formato del cliente (§4.2).

**D-07 · Las fotos son nuestras.** Toda foto se guarda en nuestro almacenamiento (directorio en
desarrollo y on-premise, S3 privado en AWS), en dos tamaños: **reducida** (lado mayor 1600 px) y
**miniatura** (400 px), JPEG. Una foto de celular de 4 MB queda en unos 300 KB.
- Formulario: se sube el archivo.
- CSV: la columna `foto` admite un enlace; el sistema **descarga** la imagen y la guarda. También se
  puede subir un **ZIP** junto al CSV, y la columna `foto` nombra el archivo dentro del ZIP.
- Las 965 fotos del catastro actual se descargan una vez (§5.4). Las que no sean públicas quedan en
  una lista para que el cliente las comparta.

**D-08 · Foto genérica para la especie, foto real para el ejemplar.** La especie muestra la foto
genérica que entregue el cliente; mientras no la haya, la de uno de sus ejemplares, como hoy.

**D-09 · Descargar un enlace es un riesgo controlado.** El backend solo descarga de dominios de
Google Drive (`drive.google.com`, `docs.google.com`, `lh3.googleusercontent.com`), solo imágenes,
de hasta 15 MB y con tiempo límite. Cualquier otro enlace es un error de formato. Evita que la carga
por CSV sirva para hacer que el servidor pida direcciones internas.

## 3. Contratos de API

| Endpoint | Autorización | Qué hace |
|---|---|---|
| `POST /api/v1/green-inventory/specimens` | ADMIN, COORDINADOR, SUPERVISOR | Registra un ejemplar (multipart: datos + foto opcional) |
| `PUT /api/v1/green-inventory/specimens/{code}` | ADMIN, COORDINADOR, SUPERVISOR | Corrige un ejemplar |
| `POST /api/v1/green-inventory/specimens/{code}/assessments` | ADMIN, COORDINADOR, SUPERVISOR | Registra una evaluación (con medidas, si se tomaron) |
| `GET /api/v1/green-inventory/specimens/{code}/assessments` | Público (como el inventario) | Historial de evaluaciones |
| `POST /api/v1/green-inventory/species/{slug}/photo` | ADMIN, COORDINADOR | Foto genérica de la especie |
| `POST /api/v1/campus-features` | ADMIN, COORDINADOR, SUPERVISOR | Registra un tacho o un bebedero |
| `POST /api/v1/imports/{kind}/preview` | ADMIN, COORDINADOR | Sube CSV (y ZIP opcional) y devuelve la vista previa. `kind`: `specimens`, `waste-bins`, `drinking-fountains`, `species-photos` |
| `POST /api/v1/imports/{previewId}/confirm` | Quien creó la vista previa | Confirma, con las decisiones sobre duplicados |
| `GET /api/v1/imports/templates/{kind}` | Con sesión | La plantilla CSV vacía, con fila de ejemplo |
| `GET /api/v1/green-inventory/export.csv` | ADMIN, COORDINADOR | Los ejemplares en el estándar, listos para corregir y volver a cargar |
| `GET /api/v1/files/{id}?size=thumb\|full` | Según la entidad dueña | La foto. En AWS redirige a una URL prefirmada de vida corta |

### 3.1 Decisiones que el código no explica

- **La vista previa se guarda en el servidor** (`import_batches`, estado `PREVIEWED`) y caduca a la
  hora. La confirmación no vuelve a subir el archivo: así lo que se confirma es exactamente lo que se
  vio.
- **La confirmación es una transacción.** Si algo falla al escribir, no queda una carga a medias. Las
  fotos se descargan y procesan **al confirmar, antes de abrir la transacción**, para que no espere a
  la red. *(Enmienda del 2 oct 2026: el borrador decía «durante la vista previa». Descargar al revisar
  bajaría cientos de fotos por cada archivo que se corrige y se vuelve a subir. La vista previa solo
  valida los enlaces y que los archivos nombrados estén en el ZIP; el ZIP espera en el almacenamiento
  hasta confirmar.)* Una foto que no se pudo descargar no detiene la carga: su fila entra sin foto y el
  resultado lo informa.
- **Exportar y volver a cargar no duplica fotos.** Una fila con código cuyo enlace de Drive ya es la
  foto del ejemplar no la descarga otra vez.
- **El límite del campus admite 15 m de margen.** El polígono viene de OpenStreetMap y deja fuera
  cuatro palmeras reales de la Pista de Salud (de 2 a 10 m). El chequeo busca coordenadas erradas,
  que caen mucho más lejos.
- **En el formulario, un posible duplicado responde `409`** con el código y la distancia
  (`{duplicateOf, distanceM}`); quien registra confirma reenviando con `confirmDuplicate=true`.
- **Las fotos de los ejemplares son públicas, como el inventario** (README del inventario, aviso de
  seguridad). Si el inventario se cierra, `GET /files/{id}` hereda el cambio: decide la entidad dueña.

## 4. Migración de base de datos

Los números los asigna el **mapa de migraciones** de `REGISTRO.md` al implementar; las reservas
pendientes se corren como en las entregas anteriores.

### 4.1 Archivos (SPEC-002 §5.4)

`green_element_attachments` (definida en SPEC-002 §4.5) se crea con dos columnas más:
`thumbnail_storage_key` y `source_url` (el enlace de origen, si vino de un CSV). Se añaden
`species_photos` (foto genérica, una vigente por especie) y `campus_feature_attachments`, con la misma
forma. `green_elements.photo_url` y el enlace de Drive quedan como **dato de origen**; la ficha muestra
la foto guardada.

### 4.2 Evaluaciones

`green_element_assessments`:

| Campo | Tipo | Notas |
|---|---|---|
| `green_element_id` | FK | |
| `assessed_on` | DATE | 2026-01-01 para las del Bosque Húmedo (§2.0) |
| `assessed_by_user_id` | FK, nulo | Nulo en las que vienen de una fuente; `notes` dice cuál |
| `has_disease`, `has_pests`, `has_mechanical_damage` | BOOLEAN nulo | Estado fitosanitario |
| `is_leaning`, `has_dead_branches`, `has_cavities_or_rot`, `has_exposed_roots`, `interferes_with_infrastructure` | BOOLEAN nulo | Estado actual |
| `recommended_management` | VARCHAR(200) | Texto libre hasta que el cliente fije la lista (P-01). Hoy: «Sin intervención» |
| `observation` | TEXT | |

Nulo significa «no se evaluó», distinto de «no». Las **medidas** siguen en `green_elements` (la
última medición) con `measured_at` y `measured_by_user_id`; una evaluación con medidas las actualiza
en la misma transacción.

### 4.3 Bebederos y tachos

`FEATURE_TYPE` gana `DRINKING_FOUNTAIN`. Los atributos de cada tipo viven en `campus_features.attributes`
con claves fijas, validadas por el servicio contra sus catálogos:

| Tipo | Atributos |
|---|---|
| Tacho (`WASTE_BIN`) | `residuos` (lista de `WASTE_STREAM`), `accion`, `recomendaciones`, `nota`, `foto` |
| Bebedero (`DRINKING_FOUNTAIN`) | `tipo` (`FOUNTAIN_KIND`: fuente, llenador de botella, sin dato), `estado` (`FOUNTAIN_STATUS`: operativo, nuevo, en remodelación, en deterioro, de baja), `sector`, `nota` |

*(Enmienda del 2 oct 2026: el borrador proponía claves en inglés. Se conservan las claves en español
que ya usan los 184 tachos de V011 y los 67 bebederos de V016: renombrarlas obligaría a migrar datos
cargados sin ganar nada, y el mapa ya las lee así.)*

### 4.4 Cargas

`import_batches`: quién, cuándo, tipo, nombre del archivo, estado (`PREVIEWED`, `CONFIRMED`,
`EXPIRED`), resumen (creados, actualizados, omitidos por especie, duplicados ingresados u omitidos) y
el informe de la vista previa. Cada ejemplar o componente creado guarda el lote que lo creó: se puede
saber de qué carga vino cada dato.

### 4.5 Datos

- **Medidas:** las 11 ceibas BH1–BH11 pasan a `MEASURED` con altura, DAP y radio de copa;
  `measured_at = 2026-01-01` en ellas y en las 76 palmeras ya medidas.
- **Evaluaciones:** una por cada ceiba BH1–BH15, fechada 2026-01-01, con lo que trae la hoja.
- **Procedencia:** *Ceiba speciosa* → Introducida (`SPECIES_ORIGIN`).
- **Bebederos:** los 67 de los cinco GeoJSON, con tipo y estado separados (el archivo mezclaba ambos).
- **Palmera 56:** Excel convirtió su fuste «3,3» en la fecha 3 de marzo; se usa el CSV, que tiene el
  valor correcto.

Todo se genera con los scripts de `scripts/`, desde fuentes copiadas a `docs/dominio/datos/`.

## 5. Comportamiento

### 5.1 Flujo principal — registrar por formulario

1. El usuario abre `/catastro/registrar`, elige la especie (buscador por nombre científico, común o
   alternativo) y marca el punto en el mapa 3D, o escribe latitud y longitud.
2. Opcional: medidas, evaluación y foto.
3. Al guardar, el sistema valida, revisa duplicados (D-05) y, si hay uno, pide confirmar.
4. Responde con el código asignado y enlaza a la ficha.

### 5.2 Flujo principal — cargar por CSV

1. El usuario elige el tipo, descarga la plantilla si la necesita y sube el CSV (y el ZIP de fotos).
2. Ve la vista previa: cuántas filas crea, cuántas actualiza, especies no ingresadas con su cantidad,
   posibles duplicados para decidir uno por uno, fotos no descargadas y errores con su fila y columna.
3. Si hay errores de formato, corrige y vuelve a subir. Si no, confirma.
4. Recibe el resumen del lote.

### 5.3 Casos límite

- **Archivo con coma decimal** («-12,067»): se acepta y se convierte; la vista previa lo avisa.
- **Archivo exportado de Excel con BOM**: se acepta.
- **Fila con medidas sin fecha de medición**: error de formato. La fecha decide qué medida es la
  vigente.
- **Medida de árbol o palmera sin fecha y sin quién midió**: se rechaza; `GENERIC` sigue reservado a
  arbustos y herbáceas (C-08).
- **Columna desconocida**: error de formato, para que un error de tipeo en la cabecera no haga perder
  datos en silencio.
- **Columnas informativas** (`nombre_comun`, `familia`…): se aceptan y se ignoran. Permiten volver a
  cargar un archivo exportado.

### 5.4 Descarga de las fotos actuales

Acción de `ADMIN`, una sola vez: descarga las fotos de Drive de los 965 ejemplares (y de los tachos),
las guarda en dos tamaños y deja la lista de las que no se pudieron descargar. Se puede repetir:
solo intenta las que faltan.

## 6. Estándares de CSV

### 6.1 Reglas comunes

- **UTF-8**, con o sin BOM. **Separador punto y coma**. **Decimal con punto** (se tolera la coma).
- Primera fila: cabecera con los nombres de columna exactos, en minúsculas y sin tildes.
- Fechas `AAAA-MM-DD`. Sí/no: `si` / `no` / vacío (= no evaluado).
- Coordenadas WGS 84 en grados decimales; deben caer dentro del campus.
- Cada estándar tiene un documento en `docs/estandares/` y una plantilla en
  `docs/estandares/plantillas/`, también descargable desde el sistema.

### 6.2 Ejemplares (`ejemplares.csv`)

El mismo formato que exporta el sistema, para poder exportar, corregir y volver a cargar.

| Columna | Obligatoria | Notas |
|---|---|---|
| `codigo` | No | Vacía = ejemplar nuevo. Con valor = corrige ese ejemplar |
| `nombre_cientifico` | Sí | Debe existir en el catálogo (o como nombre alternativo) |
| `latitud`, `longitud` | Sí | |
| `cantidad` | No (1) | Mayor que 1 = agrupación |
| `referencia_catastro`, `placa_antigua`, `ubicacion_catastro` | No | Dato de origen |
| `fecha_medicion`, `altura_m`, `altura_fuste_m`, `dap_cm`, `radio_copa_m`, `zunchado` | No | Si hay alguna medida, `fecha_medicion` es obligatoria |
| `fecha_evaluacion`, `enfermedades`, `plagas`, `danos_mecanicos`, `inclinacion`, `ramas_secas`, `cavidades`, `raices_expuestas`, `interferencia`, `manejo_recomendado`, `observacion_evaluacion` | No | Si hay alguna, `fecha_evaluacion` es obligatoria. Crea una evaluación |
| `foto` | No | Enlace de Drive o nombre de archivo en el ZIP |
| `observaciones` | No | |
| `nombre_comun`, `nombres_alternativos`, `familia`, `tipo_vegetacion`, `tipo_elemento`, `origen_medidas` | — | Informativas: se exportan y se ignoran al cargar |

### 6.3 Tachos (`tachos.csv`)

`codigo`, `latitud`, `longitud`, `residuos` (lista separada por `|`: no aprovechables, papel y cartón,
plástico, vidrio, pilas, peligrosos, RAEE, metales, Aniquem, intermedios plástico, intermedios metal),
`colores`, `lugar`, `accion`, `tacho_actual`, `tacho_nuevo`, `recomendacion`, `foto`.

### 6.4 Bebederos (`bebederos.csv`)

`codigo`, `latitud`, `longitud`, `tipo` (fuente / llenador de botella / sin dato), `estado`
(operativo / nuevo / en remodelación / en deterioro / de baja), `lugar`, `foto`.

### 6.5 Fotos genéricas de especies (`fotos-especies.csv`)

`nombre_cientifico`, `foto`. Con ZIP o enlaces.

## 7. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Un supervisor registra una planta por formulario | Con su sesión, marca el punto en el mapa y guarda: recibe `EV-000966` y la planta aparece en el mapa |
| CA-02 | El supervisor no puede cargar CSV | `POST /imports/specimens/preview` con su sesión → 403; el sidebar no muestra «Importar» |
| CA-03 | Exportar, corregir y volver a cargar | Exportar, cambiar la altura de un ejemplar, cargar: la vista previa muestra 1 actualización y 0 altas |
| CA-04 | Un error de formato bloquea la carga | Un CSV con una latitud vacía no permite confirmar y señala fila y columna |
| CA-05 | Especie desconocida se omite y se informa | Un CSV con 4 filas de una especie inexistente y 6 válidas carga 6 y lista «especie: 4» |
| CA-06 | Duplicado según el tipo | Una palmera a 0.8 m de otra de su especie se marca; un arbusto a 0.8 m de otro, no |
| CA-07 | La foto no entra a la base | Tras cargar una foto, `green_element_attachments` tiene la clave y el archivo está en el almacenamiento, no en una columna |
| CA-08 | Historial de evaluaciones | Registrar dos evaluaciones: la ficha muestra la más reciente y el historial con ambas |
| CA-09 | Bosque Húmedo cargado | `EV-000951` aparece medido (altura 10.5 m) con una evaluación del 2026-01-01 |
| CA-10 | 67 bebederos | La capa de bebederos del mapa muestra 67, con tipo y estado |
| CA-11 | Descarga controlada | Un CSV con `foto` apuntando a `http://localhost:8080/...` da error de formato |

## 8. Tests

```
Engine (sin BD)
- duplicado: palmera a 0.9 m → duplicado; a 1.1 m → no; arbusto a 0.4 m → duplicado
- duplicado solo con la misma especie

Lectura de CSV
- separador ; y decimal . ; coma decimal tolerada y avisada; BOM
- cabecera con columna desconocida → error
- medida sin fecha → error; columnas informativas ignoradas

Importación (BD real)
- vista previa no escribe; confirmar escribe todo o nada
- especie desconocida omitida con su conteo; código inexistente → error
- vista previa caducada → no se puede confirmar

Almacenamiento
- local: guarda, lee y genera miniatura; S3 con LocalStack o un doble
- descarga: dominio no permitido, archivo no imagen, más de 15 MB → rechazo

Autorización
- matriz de D-02 en cada endpoint
```

## 9. Propio de este spec

**Pendientes:**

| # | Qué falta | Bloquea |
|---|---|---|
| P-01 | Lista oficial de «manejo recomendado» | Volverlo catálogo |
| P-02 | Fotos genéricas de las especies (las entrega el cliente) | D-08 |
| P-03 | Que el cliente comparta las fotos de Drive que no son públicas | Su descarga (§5.4) |
| P-04 | Última exportación de la hoja de catastro del cliente | D-01 |

**Fuera de alcance:** la captura móvil sin conexión (C-01), la fusión de duplicados ya existentes, y
los estándares de otros componentes: puertas, fauna, estacionamientos y veredas en riesgo siguen por
migración.
