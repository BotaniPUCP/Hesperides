# SPEC-105 — Especies críticas, edición de especies y medidas por especie

| Campo | Valor |
|-------|-------|
| HU relacionada | `REQ 2.2` · `REQ 2.3` · `REQ 2.7` · C-08 · C-09 · E-03 |
| Autor | Equipo Hesperides |
| Plataforma | Web. El formulario móvil de C-01 reutilizará la API |
| Sprint | Por definir |
| Dependencias | SPEC-103 (§4.2, §6.2), SPEC-104, SPEC-200 (cierre por ubicación), SPEC-003, SPEC-004 §3.2 |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-103 §4.2 y la enmienda V027 (historial de mediciones) · SPEC-200
> §3.3 (ejemplares asociados a una ubicación) · SPEC-003 (catálogos).

> **La regla de este spec: contiene lo que el código NO dice.** Mientras la feature no esté
> implementada, este spec **sí** es la fuente de verdad y el detalle se escribe literal. Al cerrarla,
> ese detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Que cada especie indique si su altura decide cómo se atiende (crítica o no crítica) y que el sistema
muestre medidas reales, un promedio de la especie o nada, sin hacer pasar nunca un valor no medido por
una medida real.

## 2. Contexto

**El problema.** Tras un corte no siempre se registran medidas nuevas, y 878 de 965 ejemplares nunca se
midieron. Hasta ahora la solución era una reducción automática por porcentajes que guardaba el resultado
como `MEASURED`: una ceiba de 5.3 m (`EV-000954`) quedaba en 4.77 m «medidos» tras una poda de despeje,
lo que cambiaría quién la poda sin que nadie la haya medido.

**La decisión del equipo (6 nov 2026).** Dos ejes independientes y tres opciones explícitas al
cerrar una poda. Sin estimación automática.

| | Medido | No medido |
|---|---|---|
| **Crítica** | Medida real | «Sin medir», sin ningún valor |
| **No crítica** | Medida real | Promedio de la especie, indicado como no medido |

Distribución inicial, según `docs/dominio/datos/ejemplares.csv` (la base real puede variar):

| | Medido | No medido | Total |
|---|---|---|---|
| **Crítica** | 87 | 762 | 849 |
| **No crítica** | 0 | 116 | 116 |

### 2.1 Backend

- `modules.inventory`: `SpeciesRegistrationService` se amplía; nuevo `SpeciesEditService`.
- `modules.imports`: `SpecimenWriter` y `MeasurementRepository` conocen el origen y las medidas adicionales.
- `modules.interventions`: se **elimina** `SpecimenInterventionMeasurementService`; nuevo
  `PruningMeasurementOutcomeService`, llamado desde `InterventionsServiceImpl.complete`.
- Engine puro nuevo: `engine.pruning.PruningAssignment` (§5.5).

### 2.2 Frontend web

- Ruta nueva: `/inventario-verde/especies/[slug]/editar`.
- Componente nuevo y compartido `CamposMedidasEspecie.tsx`: lo usan `RegistroEspecieForm`,
  `RegistroEspecieModal` y la edición. Hoy los dos primeros duplican el formulario; este bloque no se
  copia una tercera vez.
- `SpecimenFiltersBar` e `InventarioEjemplaresScreen`: dos filtros nuevos, en la URL como los demás.
- `SpecimenMeasures` y `SpecimenInfo`: el estado sale de la API, no de buscar un texto en la nota.
- `InterventionDetail`: el diálogo de completar pregunta por las medidas cuando es una poda.

### 2.3 Móvil

Fuera de alcance: no hay pantalla móvil de catastro en esta versión.

### 2.4 Restricciones técnicas

- Catálogos: `EXTRA_MEASURE` y `REFERENCE_VALUE_SOURCE` (nuevos), `MEASUREMENT_UNIT` (existente).
- Sin dependencias nuevas.
- El mapa no cambia: sigue dibujando las plantas no medidas con la altura ilustrativa del visor
  (inventario verde D-14). Esa altura nunca se guarda ni la consume ninguna regla.
- El CSV de ejemplares conserva sus columnas: las medidas adicionales quedan fuera de esta versión.

### 2.5 Decisiones propias de este spec

**D-01 · Crítica significa «su altura decide cómo se atiende», no «requiere escalera».** Un árbol de más
de 5 m va con grúa, no con escalera, y una palmera enana no necesita ninguna de las dos. El formulario lo
explica con esas palabras. *Descartado:* el nombre «requiere escalera».

**D-02 · La criticidad vive en la especie y es independiente del tipo.** La buganvilla es trepadora y
crítica. Los árboles y palmeras se preseleccionan como críticos al registrar, el resto como no críticos,
pero quien registra puede cambiarlo. *Descartado:* deducirla del tipo, que no admite excepciones.

**D-03 · El promedio se guarda en la especie y se lee al consultar.** Nunca se copia al ejemplar. Así,
corregirlo no reescribe ejemplares ni mezcla valores sin fecha en el CSV, cuyo estándar rechaza una medida
sin fecha. *Descartado:* copiarlo a `green_elements`.

**D-04 · Se conserva el promedio de una especie crítica, pero no se muestra.** Si vuelve a ser no crítica
no hay que capturarlo otra vez. Solo se exige en las no críticas.

**D-05 · El origen se guarda; jamás se deduce comparando valores.** Una medida real igual al promedio
sigue siendo real, con fecha y responsable. Una medida igual a la anterior también: es una verificación y
actualiza la fecha.

**D-06 · «Medido» depende solo de `data_source = 'MEASURED'`.** El ejemplar no medido siempre es
`UNKNOWN`, y lo que se muestra se decide leyendo la criticidad de su especie. `GENERIC` deja de escribirse,
pero se mantiene en el `CHECK` para no tocar una columna ya publicada. Cambiar la criticidad se refleja de
inmediato en todos sus ejemplares.

**D-07 · La fuente del promedio se guarda por valor.** En una misma especie, la altura puede venir de una
ficha botánica y el radio de una estimación (*Jarava ichu*, *Piper aduncum*).

**D-08 · Las medidas adicionales son un catálogo global que cada especie elige.** Evita variantes como
«Tallos» y «N.º de tallos», y permite que varias especies compartan una medida. *Descartado:* texto libre
por especie, y el campo `species.attributes`, que no entra al historial ni se valida.

**D-09 · El valor de referencia de una medida adicional es texto orientativo.** Varios son rangos o
dependen del caso («3 tallos (rango 2–4; puede tener 1)»). Se muestra como ayuda en el campo y **nunca** se
atribuye a un ejemplar: un agave sin flor no tiene un quiote de 7 m.

**D-10 · Las tres opciones solo se piden en la clase `PODA`.** Es la única que cambia dimensiones. Por
defecto, «No cambiar», y nunca bloquea el cierre (C-09). *Descartado:* obligar a elegir, porque es justo el
registro que hoy no se hace.

**D-11 · Una edición simultánea gana por última escritura.** El catálogo de especies se edita poco y la
auditoría conserva cada cambio. *Descartado:* control de versión, que aquí agrega fricción sin necesidad.

**D-12 · El slug no cambia al corregir el nombre científico.** Las direcciones guardadas siguen funcionando.

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `POST /api/v1/green-inventory/species` | ADMIN, COORDINADOR, SUPERVISOR | Registra, con los campos nuevos |
| `PUT /api/v1/green-inventory/species/{slug}` | ADMIN, COORDINADOR, SUPERVISOR | **Nuevo.** Edita. Solo ADMIN y COORDINADOR cambian `critical` |
| `GET /api/v1/green-inventory/species/{slug}` | Como hoy | Agrega el perfil de medidas |
| `GET /api/v1/green-inventory/specimens` | Como hoy | Agrega `critical` y `measured` |
| `GET /api/v1/green-inventory/specimens/{code}` | Como hoy | Agrega el estado y la referencia |
| `POST /api/v1/green-inventory/extra-measures` | ADMIN, COORDINADOR | **Nuevo.** Crea una medida adicional |
| `GET /api/v1/green-inventory/extra-measures` | Autenticado | **Nuevo.** Las medidas activas, para elegir |
| Completar ubicación de intervención (SPEC-200) | Como hoy | Agrega `measurementOutcomes` |

**Formulario de especie** (registro y edición; `SpeciesForm` conserva sus campos actuales):

```json
{
  "critical": false,
  "referenceHeightM": 3.0,
  "referenceHeightSourceCode": "BOTANICAL_SHEET",
  "referenceCrownRadiusM": 1.0,
  "referenceCrownRadiusSourceCode": "TEAM_ESTIMATE",
  "usesTrunkHeight": false,
  "usesDbh": false,
  "extraMeasures": [
    { "code": "STEM_COUNT", "referenceNote": "3 tallos (rango 2–4; puede tener 1)" }
  ]
}
```

**Perfil en `SpeciesResponse`:** los mismos campos, y en `extraMeasures` además `label` y `unitCode`.

**Filtros del listado:** `critical=true|false` y `measured=true|false`. Ausentes, no filtran. `measured=true`
equivale a `data_source = 'MEASURED'`; `measured=false`, a cualquier otro valor.

**`SpecimenDetailResponse` agrega:**

```json
{
  "speciesCritical": false,
  "measurementStatus": "REFERENCE",
  "referenceHeightM": 3.0,
  "referenceCrownRadiusM": 1.0,
  "measuredBeforeLastPruning": false,
  "pruningAssignment": "STABLE_STAFF",
  "extraMeasures": [
    { "code": "STEM_COUNT", "label": "Número de tallos", "unitCode": "UNIT", "value": 3, "measuredAt": "2026-11-06" }
  ]
}
```

`measurementStatus` es `MEASURED`, `REFERENCE` o `NOT_MEASURED`. Las referencias solo llegan con
`REFERENCE`; en los otros dos casos son `null`, de modo que una pantalla no pueda mostrarlas por error.

**Cada fila del historial agrega** `origin` (`MEASURED` o `AVERAGE`) y `extraValues`.

**Medición de un ejemplar:** `SpecimenForm.measurement` agrega `extraValues`:
`[{ "code": "STEM_COUNT", "value": 3 }]`.

**Completar una ubicación agrega:**

```json
{
  "executedQuantity": null,
  "executionNotes": "…",
  "measurementOutcomes": [
    { "specimenCode": "EV-000049", "outcome": "MEASURED",
      "measurement": { "date": "2026-11-06", "heightM": 1.5, "trunkHeightM": null, "dbhCm": null,
                       "crownRadiusM": 0.5, "banded": null, "extraValues": [] } },
    { "specimenCode": "EV-000700", "outcome": "AVERAGE" }
  ]
}
```

Un ejemplar asociado que no aparece se trata como `UNCHANGED`.

### 3.1 Decisiones que el código no explica

- **`PUT` y no `PATCH`:** el formulario siempre envía la especie completa. La foto conserva su endpoint.
- **Un SUPERVISOR que envía `critical` distinto al vigente recibe 403**, aunque pueda editar el resto. Al
  registrar, si el valor difiere del preseleccionado por el tipo, también. Es una decisión de seguridad.
- **Medidas adicionales solo las crea ADMIN o COORDINADOR.** Asignar una existente a la especie sigue la
  misma autorización que editarla. Así el catálogo no se llena de duplicados.
- **`outcome` distinto de `UNCHANGED` en una intervención que no es `PODA`:** error de regla de negocio.
- **`AVERAGE` en una especie crítica:** error de regla de negocio. El formulario ni lo ofrece.

## 4. Migración de base de datos

Cada bloque es una migración propia, con el siguiente número libre **al implementarla** (REGLAS §0.2) y
SPEC-105 en su cabecera. V001–V029 no se tocan.

### 4.1 Retirar la estimación automática

Corrige en cualquier base lo ya escrito por el servicio retirado. Las filas se conservan con soft delete
(INV-4). Cada ejemplar vuelve a su última medida real, o a `UNKNOWN` si nunca tuvo una.

```sql
CREATE TEMP TABLE estimated_specimens ON COMMIT DROP AS
SELECT DISTINCT green_element_id AS id
  FROM green_element_measurements
 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NULL;

UPDATE green_element_measurements SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NULL;

UPDATE green_elements g
   SET height_m = m.height_m, trunk_height_m = m.trunk_height_m, dbh_cm = m.dbh_cm,
       crown_radius_m = m.crown_radius_m, is_banded = m.is_banded,
       measured_at = m.measured_at, measured_by_user_id = m.measured_by_user_id,
       data_source = CASE WHEN m.id IS NULL THEN 'UNKNOWN' ELSE 'MEASURED' END,
       updated_at = CURRENT_TIMESTAMP
  FROM estimated_specimens e
  LEFT JOIN LATERAL (
       SELECT * FROM green_element_measurements x
        WHERE x.green_element_id = e.id AND x.deleted_at IS NULL
        ORDER BY x.measured_at DESC, x.id DESC LIMIT 1) m ON TRUE
 WHERE g.id = e.id;
```

### 4.2 Criticidad, promedios y correcciones de tipo

`is_critical` nace en `TRUE`: una especie registrada en una base real después de la semilla queda en el
lado seguro y el `CHECK` no impide migrar. Solo las 12 de abajo pasan a no críticas.

```sql
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('REFERENCE_VALUE_SOURCE', 'Fuente de valores de referencia', 'De dónde sale el promedio de una especie', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'BOTANICAL_SHEET',  'Ficha botánica',        1),
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'TEAM_ESTIMATE',    'Estimación del equipo', 2),
    ((SELECT id FROM catalog_types WHERE code = 'REFERENCE_VALUE_SOURCE'), 'CAMPUS_SAMPLE',    'Muestra en el campus',  3);

ALTER TABLE species
    ADD COLUMN is_critical BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN reference_height_m NUMERIC(5, 2) CHECK (reference_height_m IS NULL OR reference_height_m > 0),
    ADD COLUMN reference_height_source_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN reference_crown_radius_m NUMERIC(5, 2) CHECK (reference_crown_radius_m IS NULL OR reference_crown_radius_m > 0),
    ADD COLUMN reference_crown_radius_source_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN uses_trunk_height BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN uses_dbh BOOLEAN NOT NULL DEFAULT TRUE;
```

Valores, tal como los entregó el equipo (6 nov 2026). `*` = `TEAM_ESTIMATE`; el resto, `BOTANICAL_SHEET`.
Se aplican por `slug`.

| Slug | `is_critical` | Altura (m) | Radio de copa (m) |
|---|---|---|---|
| `coffea-arabica` | no | 3.0 | 1.0 |
| `jarava-ichu` | no | 0.7 | 0.25* |
| `agave-americana` | no | 1.4 | 1.2 |
| `leea-guineensis` | no | 2.5 | 0.9 |
| `polyscias-guilfoylei` | no | 2.5 | 0.5 |
| `brunfelsia-australis` | no | 2.5 | 1.0 |
| `caesalpinia-gilliesii` | no | 2.7 | 1.2 |
| `hibiscus-rosa-sinensis` | no | 2.5 | 1.1 |
| `matthiola-incana` | no | 0.6 | 0.2 |
| `piper-aduncum` | no | 2.0 | 0.8* |
| `randia-aculeata` | no | 2.4 | 1.0 |
| `chlorophytum-comosum` | no | 0.3 | 0.2 |
| `bougainvillea-glabra` | **sí** | 3.5 | 1.1 |
| `nerium-oleander` | **sí** | 3.0 | 1.3 |
| `vachellia-farnesiana` | **sí** | 5.0 | 2.5 |
| `euphorbia-umbellata` | **sí** | 3.0 | 1.2 |
| `dracaena-fragrans` | **sí** | 2.5 | 0.4 |

- El promedio del agave es **por planta**, no por agrupación.
- **Correcciones de tipo:** `matthiola-incana` y `chlorophytum-comosum` pasan a `HERB`. El tipo `SUCCULENT`
  sigue en el catálogo. También se actualiza `docs/dominio/datos/especies.csv`.
- **`uses_trunk_height` y `uses_dbh`:** `FALSE` en las 12 no críticas y en la buganvilla. Las otras cuatro
  críticas de esta tabla los conservan porque pueden crecer como árboles pequeños. Son editables.

Al final, una vez cargados los valores:

```sql
ALTER TABLE species
    ADD CONSTRAINT chk_species_reference_required CHECK (
        is_critical OR (reference_height_m IS NOT NULL AND reference_crown_radius_m IS NOT NULL)),
    ADD CONSTRAINT chk_species_height_source CHECK (
        (reference_height_m IS NULL) = (reference_height_source_item_id IS NULL)),
    ADD CONSTRAINT chk_species_crown_source CHECK (
        (reference_crown_radius_m IS NULL) = (reference_crown_radius_source_item_id IS NULL));

CREATE INDEX idx_species_is_critical ON species(is_critical);
```

### 4.3 Origen en el historial

`AVERAGE` deja rastro de que se usó el promedio, con el valor vigente en ese momento: si el promedio cambia
después, el historial no se reescribe.

```sql
ALTER TABLE green_element_measurements
    ADD COLUMN origin VARCHAR(10) NOT NULL DEFAULT 'MEASURED' CHECK (origin IN ('MEASURED', 'AVERAGE')),
    ADD COLUMN intervention_id BIGINT REFERENCES interventions(id);

CREATE INDEX idx_green_elements_data_source ON green_elements(data_source);
```

### 4.4 Medidas adicionales

Cada medida es una fila de `catalog_items` (INV-2), con su unidad en `metadata`.

```sql
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('EXTRA_MEASURE', 'Medidas adicionales', 'Medidas propias de algunas especies', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'SUPPORT_HEIGHT',      'Altura del soporte', 1, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'COVERED_LENGTH',      'Largo cubierto',     2, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'FLOWER_STALK_HEIGHT', 'Altura del quiote',  3, '{"unitCode":"M"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'STEM_COUNT',          'Número de tallos',   4, '{"unitCode":"UNIT"}'),
    ((SELECT id FROM catalog_types WHERE code = 'EXTRA_MEASURE'), 'COVERAGE_AREA',       'Cobertura',          5, '{"unitCode":"M2"}');

CREATE TABLE species_extra_measures (
    id               BIGSERIAL PRIMARY KEY,
    species_id       BIGINT NOT NULL REFERENCES species(id),
    measure_item_id  BIGINT NOT NULL REFERENCES catalog_items(id),
    reference_note   VARCHAR(200),
    sort_order       INTEGER   NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE UNIQUE INDEX idx_species_extra_measures_active
    ON species_extra_measures(species_id, measure_item_id) WHERE deleted_at IS NULL;

CREATE TABLE green_element_measurement_values (
    id               BIGSERIAL PRIMARY KEY,
    measurement_id   BIGINT NOT NULL REFERENCES green_element_measurements(id),
    measure_item_id  BIGINT NOT NULL REFERENCES catalog_items(id),
    value            NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE UNIQUE INDEX idx_measurement_values_active
    ON green_element_measurement_values(measurement_id, measure_item_id) WHERE deleted_at IS NULL;
```

Asignaciones iniciales:

| Slug | Medida | `reference_note` |
|---|---|---|
| `bougainvillea-glabra` | `SUPPORT_HEIGHT` | ≈ 2.5 m (estimación del equipo) |
| `bougainvillea-glabra` | `COVERED_LENGTH` | ≈ 3 m, estimación del equipo (máx. 2.5–4 m) |
| `agave-americana` | `FLOWER_STALK_HEIGHT` | Solo si está en flor: ≈ 7 m (rango 5–10 m) |
| `dracaena-fragrans` | `STEM_COUNT` | 3 tallos (rango 2–4; puede tener 1) |
| `chlorophytum-comosum` | `COVERAGE_AREA` | Si crece como macizo. Planta sola ≈ 0.13 m²; macizo ≈ 0.5–2 m² (macizo: estimación del equipo) |

## 5. Comportamiento

### 5.1 Registrar o editar una especie

1. El tipo preselecciona la criticidad: `TREE` y `PALM`, crítica; el resto, no crítica. **Cambiar el tipo
   al registrar la vuelve a preseleccionar; al editar, no la toca** y avisa que quizá convenga revisarla.
2. Si es no crítica, altura y radio de copa promedio con su fuente son obligatorios, en frontend y backend.
3. Altura y radio de copa siempre se aplican. Fuste y DAP vienen marcados y se pueden desmarcar como «no
   aplica».
4. Se pueden añadir medidas adicionales del catálogo, o crear una nueva, con su unidad y su nota.
5. Al guardar, una especie existente muestra la confirmación del §5.2 si cambió su criticidad.

### 5.2 Cambiar la criticidad

- **De crítica a no crítica:** exige el promedio en la misma edición y confirma: «N ejemplares sin medir
  pasarán a mostrar el promedio y dejarán de pedir verificación en campo».
- **De no crítica a crítica:** confirma: «N ejemplares dejarán de mostrar el promedio y pasarán a Sin
  medir». El promedio se conserva (D-04).
- Ninguna opción toca una medida real, y el cambio se audita con el valor anterior y el nuevo.

### 5.3 Cerrar una poda

Por cada ejemplar asociado a la ubicación. Si no hay ninguno, o la clase no es `PODA`, no se pregunta nada.
Por defecto queda preseleccionada la opción que no escribe nada («No cambiar» o «Dejar en promedio»), y se
puede cambiar por ejemplar.

| Estado antes de cerrar | Opciones que se muestran | Efecto |
|---|---|---|
| No crítica, sin medir | Medidas reales · Dejar en promedio | «Dejar en promedio» no escribe nada: es el mismo resultado que no cambiar |
| No crítica, medida | Medidas reales · Usar promedio · No cambiar | «Usar promedio» pasa a No medido, con fila `AVERAGE` |
| Crítica, sin medir | Medidas reales · No cambiar | «No cambiar» sigue en Sin medir |
| Crítica, medida | Medidas reales · No cambiar | «No cambiar» conserva la medida anterior |

**Efecto de cada opción:**

- **Medidas reales:** como cualquier medición: fila `MEASURED` con `intervention_id`, y `green_elements` en
  `MEASURED` con quien registró y la fecha indicada, que por defecto es hoy y no admite futuro.
- **Usar promedio:** fila `AVERAGE` con la altura y el radio vigentes de la especie, sin fuste ni DAP, y una
  nota con el código de la intervención. En `green_elements`, las cuatro medidas, `measured_at` y
  `measured_by_user_id` quedan en `NULL`, y `data_source` en `UNKNOWN`. El historial conserva la medida real.
- **No cambiar:** no escribe nada en las medidas.

Todo ocurre en la transacción del cierre. **Un error propaga y revierte el cierre**: no se captura en
silencio como hacía el servicio retirado. El formulario valida antes de enviar para no perder lo escrito.

### 5.4 La ficha y el listado

| `data_source` | Especie | `measurementStatus` | Se muestra |
|---|---|---|---|
| `MEASURED` | Cualquiera | `MEASURED` | Las medidas, con badge «Medido en campo» |
| Otro | No crítica | `REFERENCE` | Altura y radio promedio, atenuados, con «Promedio de la especie · No medido» y su fuente |
| Otro | Crítica | `NOT_MEASURED` | «Medición pendiente», sin valores |

- **Medida anterior a la poda:** si `MEASURED` y la última ubicación `PODA` completada del ejemplar es
  posterior a `measured_at`, `measuredBeforeLastPruning` es verdadero y la ficha dice «Medido el 1 ene, antes
  de la poda del 3 mar». No es un estado nuevo: se calcula.
- **Fuste o DAP «no aplica»:** no se piden en los formularios. Si ya hay un valor guardado, se sigue mostrando.
- **Medidas adicionales:** por cada una, el último valor registrado con su fecha, aunque la medición más
  reciente no la traiga. Un quiote medido en marzo sigue apareciendo con su fecha.
- **Exportación CSV:** `origen_medidas` dice «Promedio de la especie» en `REFERENCE`, y las celdas de medidas
  quedan vacías. Volver a cargar ese archivo no crea medidas.

### 5.5 Quién poda (enmienda C-08, C-09 y E-03)

Función pura en `engine.pruning.PruningAssignment`, sin I/O. Devuelve códigos de texto (INV-2):

| Especie | Medición vigente | Resultado |
|---|---|---|
| No crítica | Cualquiera | `STABLE_STAFF` |
| Crítica | `MEASURED`, altura < 5 m | `STABLE_STAFF` |
| Crítica | `MEASURED`, altura ≥ 5 m | `THIRD_PARTY` |
| Crítica | Sin medir, o `MEASURED` sin altura | `FIELD_VERIFICATION` |

Nunca lee promedios. El umbral es una constante con nombre. La ficha la muestra a quienes hoy ven datos
internos, en el espacio de `showOperationalRegime`, que existe pero nadie usa. La propuesta no bloquea nada.

### 5.6 Casos límite

- **Medición con fecha anterior a la última fila del historial, de cualquier origen:** entra al historial y
  no reemplaza la vigente. `SpecimenWriter` deja de comparar solo con `measured_at`, que queda nulo tras
  «Usar promedio».
- **Medición que solo trae medidas adicionales:** añade la fila, conserva las básicas y no cambia
  `data_source`. Una especie no pasa a Medido por contar sus tallos.
- **Corregir el nombre científico al de otra especie activa:** 409, como al registrar.
- **Quitar una medida adicional a una especie:** soft delete de la asignación. Sus valores siguen en el
  historial, pero ya no se piden.
- **Desactivar una medida del catálogo con valores:** se permite y deja de ofrecerse. Su unidad no se puede
  cambiar si tiene valores, y el nombre normalizado es único entre las activas.
- **Valor de una medida en `UNIT`:** debe ser entero.
- **Medida adicional que no pertenece a la especie:** error de validación.
- **Devolución y nuevo cierre de la misma ubicación:** vuelve a preguntar. Las filas anteriores permanecen.
- **CSV de ejemplares con celdas de medidas vacías:** sigue sin borrar nada (SPEC-103 §6.2). No toca las
  medidas adicionales.
- **DAP 0:** el formulario de edición deja de rechazarlo. Es una medida real (V013), y hay dos *Washingtonia*
  con ese valor.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | No hay estimación automática | Completar una poda sin elegir nada: medidas, `data_source` e historial no cambian |
| CA-02 | Lo estimado se corrige al migrar | Con una fila «Estimación por labor técnica» previa, el ejemplar vuelve a su última medida real o a `UNKNOWN` |
| CA-03 | El registro exige promedio en no críticas | Registrar un arbusto sin altura: error en el campo y en la API |
| CA-04 | La buganvilla es crítica | `EV-` de buganvilla sin medir: «Medición pendiente», sin valores |
| CA-05 | Un cafeto muestra el promedio | Sin medir: 3 m y 1 m, con «Promedio de la especie · No medido» y su fuente |
| CA-06 | La edición existe | Corregir el nombre común en `/inventario-verde/especies/{slug}/editar`: persiste y el slug no cambia |
| CA-07 | El cambio de criticidad se protege | SUPERVISOR recibe 403 al cambiarla. COORDINADOR ve la confirmación con el número de ejemplares, y queda auditado |
| CA-08 | Los filtros son independientes | Crítica + No medido y No crítica + No medido dan listados correctos, y sobreviven a abrir una ficha y volver |
| CA-09 | Medida real igual al promedio sigue siendo real | Registrar 3 m en un cafeto: badge «Medido en campo» y aparece en el filtro Medido |
| CA-10 | «Usar promedio» conserva la historia | Cafeto medido → cerrar con promedio: pasa a No medido y el historial muestra ambas filas |
| CA-11 | El promedio no se ofrece en críticas | El cierre de una poda sobre una Tipa no muestra esa opción, y la API la rechaza |
| CA-12 | Quién poda sale del campo crítico | Una buganvilla sin medir da verificación en campo. Si pasa a no crítica, personal estable |
| CA-13 | Medidas adicionales | Registrar 3 tallos en una *Dracaena*: se ve en ficha e historial, y su estado sigue siendo Sin medir |
| CA-14 | La referencia no se atribuye | Un agave sin medición de quiote no muestra ningún valor de quiote en la ficha |
| CA-15 | El tipo quedó corregido | *Matthiola incana* y *Chlorophytum comosum* aparecen como herbáceas |

## 7. Especificación visual

- **Formulario de especie:** un bloque «Medidas» tras el tipo. En móvil una columna; desde 640 px, los
  promedios en dos.
- **Campo crítico:** interruptor con el texto de D-01. Al activarlo, los promedios se muestran como opcionales.
- **Filtros:** dos selectores más en `SpecimenFiltersBar`, con «Todos» por defecto. Respetan el reinicio de filtros.
- **Cierre de poda:** en el diálogo actual, una lista de ejemplares con «No cambiar» preseleccionado. Elegir
  «Medidas reales» despliega los campos que aplican. Con más de 8 ejemplares, la lista tiene scroll propio.
- **Promedio en la ficha:** usa los tokens neutros atenuados y el texto «No medido», para no depender solo del
  color. Claro y oscuro, según SPEC-C01.

## 8. Tests

```
Retiro de la estimación
- poda completada sin outcomes → ninguna fila nueva, medidas intactas
- migración: ejemplar con real + estimada → vuelve a la real; solo estimada → UNKNOWN; filas con soft delete

Criticidad y promedio
- no crítica sin altura o sin radio → error en servicio y CHECK en base
- valor sin fuente → error
- crítica sin promedio → válida; crítica con promedio → se conserva y no sale en la ficha
- SUPERVISOR cambia critical → 403, y edita otro campo → 200
- crítica → no crítica sin promedio → error, sin cambio parcial
- cambio de criticidad → evento auditado con antes y después

PruningAssignment (engine, sin base)
- no crítica medida de 10 m → STABLE_STAFF
- crítica 4.99 → STABLE_STAFF; 5.00 → THIRD_PARTY
- crítica sin medir, o MEASURED sin altura → FIELD_VERIFICATION
- no crítica con promedio de 5 m o más → STABLE_STAFF; nunca lee el promedio

Tres opciones de cierre
- MEASURED igual al promedio → origin MEASURED y data_source MEASURED
- AVERAGE en no crítica medida → UNKNOWN, cuatro medidas en NULL, fila AVERAGE con el valor vigente
- cambiar el promedio después → la fila AVERAGE no cambia y la ficha muestra el nuevo
- AVERAGE en crítica → rechazado y el cierre no se aplica
- outcome en clase distinta de PODA → rechazado
- ejemplar no asociado a la ubicación → rechazado
- fallo al escribir → el cierre se revierte

Vigencia
- medición con fecha anterior a una fila AVERAGE → entra al historial y no reemplaza
- medición solo con medidas adicionales → básicas y data_source intactos

Filtros
- critical y measured, solos y combinados, con búsqueda y paginación → totales correctos
- especie que cambia de criticidad → sus ejemplares cambian de grupo sin reescribirse

Medidas adicionales
- STEM_COUNT con decimales → rechazado; medida ajena a la especie → rechazado
- quitar una medida de la especie → los valores siguen en el historial
- ficha → último valor por medida, aunque la última medición no la traiga
- nombre duplicado sin tildes ni mayúsculas → rechazado

Exportación
- REFERENCE → origen «Promedio de la especie» y medidas vacías; recargar el archivo no crea medidas
```

## 9. Propio de este spec

- **Acciones auditables (enmienda SPEC-004 §3.2):** `SPECIES_UPDATED`, `SPECIES_CRITICALITY_CHANGED` y
  `SPECIES_REFERENCE_CHANGED`.
- **Enmiendas de documentación, en el mismo trabajo:**
  - **C-08:** `GENERIC` deja de escribirse; el origen depende de la criticidad, no del tipo.
  - **C-09:** la verificación solo aplica a especies críticas.
  - **E-03:** arbustos, herbáceas y trepadoras dejan de ser siempre personal estable por su tipo.
  - **Escenario de proyección post-poda de REQ 2.7:** se retira.
  - **`docs/estandares/ejemplares.md`:** nuevo valor de `origen_medidas`.
  - **`catalogo-requisitos.md`:** la nota de 2.2 y 2.11 («Nunca se asume la clase por la especie») sigue
    vigente para especies críticas.
- **Orden de entrega**, cada una con sus pruebas y verificada en navegador (INV-10):
  1. Retirar la estimación (§4.1).
  2. Criticidad, promedios, correcciones de tipo y edición (§4.2, §5.1, §5.2, §5.4, §5.5).
  3. Filtros.
  4. Tres opciones al cerrar (§4.3, §5.3).
  5. Medidas adicionales (§4.4).
- **Rama:** `feature/SPEC-105-medidas-por-especie`.

### 9.1 Decisiones pendientes con la ingeniera

Ninguna bloquea. **Duda sobre el DAP:** varios valores parecen perímetros, no diámetros (`EV-000039` tiene
1722 cm, y ya viene así en el Excel del cliente). Este spec no corrige ni reinterpreta esos datos.
