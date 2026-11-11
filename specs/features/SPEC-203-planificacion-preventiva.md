# SPEC-203 — Planificación preventiva por conjuntos de áreas verdes

| Campo | Valor |
|-------|-------|
| HU relacionada | Requisito 1.7 del Catálogo de Requisitos (frecuencias) · 6.10 (cumplimiento de frecuencias) |
| Autor | Jean Piero David Morán, con Claude |
| Plataforma | Web |
| Sprint | — |
| Dependencias | SPEC-101 (lo enmienda), SPEC-200 (intervenciones por ubicación), SPEC-202 (reporte mensual), SPEC-102 (mapa 3D), SPEC-001 Anexo A, SPEC-C01, SPEC-C03 |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-101 §2.5 (modelo multipatrón de reglas, estaciones D-07),
> SPEC-200 D-06 y §2.9 (ejecución y validación por ubicación), SPEC-202 D-05 (cumplimiento en
> el reporte mensual).

> **La regla de este spec: contiene lo que el código NO dice.** Mientras la feature no esté
> implementada, este spec es la fuente de verdad y el detalle se escribe literal. Al cerrarla,
> ese detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Que el coordinador sepa, al abrir el sistema, **qué mantenimiento preventivo le toca planificar
y dónde**. Hoy el módulo de frecuencias guarda reglas y juzga hacia atrás («¿cumpliste?»).
Este spec lo convierte en la herramienta con la que se planifica: para cada conjunto de áreas
verdes y cada actividad, dice cuándo fue la última vez, cada cuántos días toca, cuánto falta o
cuánto se atrasó, y desde ahí crea la intervención.

## 2. Contexto

### 2.0 Por qué este giro

El valor práctico del módulo actual es casi nulo, y no por falta de conexión: lee las
intervenciones reales y alimenta el reporte mensual. Falla en tres cosas:

1. **No responde la pregunta del usuario.** Para planificar, el coordinador junta a mano la fecha
   de la última vez, la estación, cuántas veces va en el año y el intervalo aproximado. El
   sistema tiene esos datos y no los junta.
2. **No empuja a nadie.** No avisa ni sugiere; hay que entrar a consultar un periodo.
3. **Mide sobre la unidad equivocada.** Evalúa por lugar o sección suelta, pero el coordinador
   **planifica por grupos grandes de jardines** que se atienden durante varios días, con avances
   diarios. El trabajo sobre un jardín suelto, un ejemplar o pocas áreas nace casi siempre de una
   incidencia o un pedido, y no sigue frecuencia.

### 2.1 Vocabulario

| Término | Qué es en el sistema |
|---|---|
| **Jardín** | Una zona de tipo `SECTION` (`zones`), de cualquier tipo de paisaje: área verde o **xerofítica** (`LANDSCAPE_TYPE = XEROPHYTIC`). Es sobre lo que recae una actividad preventiva. |
| **Lugar** | Una referencia para ubicarse (M9). **No se planifica sobre él.** Excepción: un lugar con `places.zone_id` es un jardín popular que la gente conoce por ese nombre; se usa su nombre para mostrar el jardín, y una ubicación de intervención registrada con ese lugar cuenta para su sección. |
| **Conjunto de áreas verdes** (conjunto) | Una lista guardada de jardines con nombre, armada desde el mapa. No coincide necesariamente con un sector ni con una zona de supervisión. Un jardín puede estar en varios conjuntos. |
| **Actividad** | Un ítem del catálogo `INTERVENTION_TYPE` (corte de césped, poda sanitaria, riego…). Es el `activity_type_item_id` de las reglas y el `intervention_type_item_id` de las intervenciones. |
| **Regla de frecuencia** | Una fila vigente de `maintenance_frequencies` (SPEC-101). Dice cada cuánto se hace una actividad. |
| **Última vez de un jardín** | La fecha más reciente en que el capataz marcó completado ese jardín para esa actividad (§5.4). |

En la interfaz **nunca** se usan las palabras «ronda», «ritmo», «alcance» ni «scope». Se dice
«conjunto», «cada 30–35 días» y «propio de este conjunto» solo en la pantalla de reglas.

### 2.2 Backend

- **Paquete nuevo:** `pe.edu.pucp.hesperides.modules.planning` con dos responsabilidades:
  conjuntos (`GreenAreaSet…`) y planificación (`Planning…`). El builder decide si van en dos
  subpaquetes o dos módulos; lo fijo es que el módulo de intervenciones no dependa de él.
- **Engine nuevo:** `engine/planning/`, puro (sin Spring, JPA ni I/O). Recibe una regla, las
  fechas por jardín y la fecha de hoy, y devuelve el estado de §5.5. Reutiliza
  `FrequencyRule.intervaloEn` y `SeasonalInterval` de `engine/frequency/`.
- **Lectura de ejecuciones:** se añade una consulta por jardín en el módulo de intervenciones,
  expuesta como un puerto que define `planning` (mismo patrón que `ExecutionHistoryProvider`):
  `planning` declara la interfaz y `interventions` la implementa.
- **Se modifica** `engine/frequency/IntervalEvaluator` (veredictos, §5.8) y el módulo
  `maintenance` (alcance por conjunto, §4).

### 2.3 Frontend web

- **Rutas nuevas** (dentro del grupo Intervenciones del menú):
  - `/intervenciones/planificacion` — Planificación preventiva.
  - `/intervenciones/conjuntos` — Conjuntos de áreas verdes (lista, crear, editar).
  - `/intervenciones/frecuencias` — las reglas de frecuencia, movidas desde `/admin/frecuencias`.
- **`/admin/frecuencias`** redirige a `/intervenciones/frecuencias` para no romper marcadores.
- **Inicio** (`app/(dashboard)/page.tsx`): bloque de avisos para ADMIN y COORDINADOR (§5.7).
- **Registro de intervención** (`/intervenciones/nueva`): acepta llegar prellenado desde la
  planificación y muestra el aviso de «atendido hace poco» (§5.6).
- **Selector de jardines sobre el mapa:** se generaliza `components/irrigation/IrrigationMapPicker.tsx`
  (selección por clic, por área arrastrando, búsqueda y lista sincronizada) a un componente
  compartido que usen Riego y Conjuntos. Riego no debe cambiar de comportamiento.
- **Mapa con jardines iluminados:** el visor (`components/map3d/viewer/highlight.ts`) hoy realza
  un solo objetivo. Necesita realzar un **grupo** de secciones a la vez.
- Reutilizados de SPEC-C01: `PageFrame`, `PageHeader`, `Card`, `Badge`, `Button`, `Select`,
  `Input`, `Modal`, `EmptyState`, `LoadingSkeleton`. No se redefinen sus props.

### 2.4 Móvil

Fuera de alcance. Planificar es trabajo de escritorio del coordinador. El capataz registra el
avance diario con el flujo de ejecución por ubicación que ya existe (SPEC-200).

### 2.5 Restricciones técnicas

- DEBE usar: el stack de SPEC-000; consultas parametrizadas; zona horaria
  `hesperides.maintenance.time-zone` (por defecto `America/Lima`) para convertir `completed_at`
  en fecha.
- NO debe usar: `enum` para catálogos de dominio (INV-2). El estado de planificación es el
  resultado de un cálculo, como `ComplianceStatus`, y **sí** puede ser un `enum` por la misma
  razón que documenta esa clase.
- Catálogos aplicables: `INTERVENTION_TYPE`, `INTERVENTION_CLASS`, `FREQUENCY_RULE_TYPE`,
  `ZONE_TYPE`, `LANDSCAPE_TYPE`, estado de ubicación de intervención (V025).

### 2.6 Decisiones propias de este spec

**D-01 · Se planifica por conjunto, no por jardín ni por sector.**
El coordinador piensa en grupos grandes que no coinciden con sectores ni zonas de supervisión, y
que suele repetir. Guardarlos con nombre evita reconstruirlos cada vez y da una unidad estable
para medir.
*Descartado:* planificar por sector (no coincide con la práctica) y por jardín suelto (531 filas
por actividad, inmanejable).

**D-02 · La fecha se guarda por jardín; el conjunto se muestra como un todo.**
El capataz marca cada jardín completado al terminar el día; esa fecha ya existe en
`intervention_locations.completed_at`. El conjunto deriva su estado de las fechas de sus
jardines. Así funciona con conjuntos que se cruzan, con avances incompletos y con jardines
atendidos fuera de una intervención planificada.
*Descartado:* guardar una fecha por conjunto, que se desincroniza en cuanto dos conjuntos
comparten un jardín.

**D-03 · Se mide de inicio a inicio: manda el jardín atendido hace más tiempo.**
La referencia de un conjunto es la **más antigua** de las últimas veces de sus jardines. Si una
vuelta tomó cinco días, el primer jardín atendido es el que primero vuelve a necesitar atención,
y medir desde el fin atrasaría el calendario lo que dura cada vuelta, ciclo tras ciclo.
*Descartado:* medir desde el fin de la vuelta.

**D-04 · Un jardín cuenta como atendido desde que el capataz lo marca completado.**
Decisión del usuario. La planificación es para trabajar y necesita el avance del día. El reporte
mensual (SPEC-202) sigue contando solo lo aprobado, porque es el registro oficial (SPEC-200
D-06 no cambia). Un jardín **observado** por el coordinador deja de contar hasta que se vuelva
a completar.

**D-05 · El rango de días se lee como lo normal.**
Por debajo del mínimo es «aún no toca» (y, si alguien lo atiende igual, «atendido hace poco»).
Entre el mínimo y el máximo es «toca». Por encima del máximo es «toca, atrasada». Esto corrige
el defecto del evaluador actual, que daba «en plazo» a un corte a los 10 días con un rango de
30–35, y «dentro de tolerancia» a uno a los 33 (§5.8).

**D-06 · El campo «Teórico» desaparece.**
Hoy el formulario lo pide por estación y el evaluador **nunca** lee el teórico de una estación;
el teórico general solo se usa en fechas que no caen en ninguna estación. Un dato que se pide y
casi no influye confunde al usuario, y con D-05 el objetivo es el rango, no un número. Se quitan
`target_days_interval` de la regla y de sus estaciones (§4). Esto cambia el veredicto de las
reglas sin estaciones o con meses sin estación: su objetivo pasa a ser el rango general.
*Descartado:* conservarlo como dato informativo; nadie lo lee.

**D-07 · Un conjunto puede tener su propio cada cuánto.**
Hay jardines que se atienden distinto que el resto; el usuario lo confirma para el riego del
campo deportivo. Una regla puede aplicar a **todo el campus** o a **un conjunto**. La del
conjunto reemplaza a la general solo para ese conjunto. Las reglas por sector (`BY_SECTOR`) y
por sección (`BY_ZONE`) de SPEC-101 D-02 se convierten en reglas por conjunto (§4) y dejan de
existir: un conjunto de un jardín cubre `BY_ZONE`, y uno con las secciones del sector cubre
`BY_SECTOR`, que además nunca llegó a evaluarse.

**D-08 · Si un jardín queda bajo dos reglas propias, manda la más frecuente.**
Cuando un jardín está en dos conjuntos con regla propia para la misma actividad, el aviso de
«atendido hace poco» usa la de menor mínimo. Es preferible atender de más que de menos. Al
guardar un conjunto o una regla que produce ese cruce, el sistema lo advierte (sin bloquear).

**D-09 · Cada conjunto declara qué actividades se planifican en él.**
Si toda regla general aplicara a todo conjunto, un conjunto de bermas aparecería también en
poda mayor. El coordinador marca, al guardar el conjunto, las actividades que se planifican
ahí. Una regla propia del conjunto implica su actividad.

**D-10 · La planificación solo considera reglas de personal propio (`IN_HOUSE`).**
Las intervenciones no registran régimen y no hay datos del trabajo tercerizado (Catálogo, D2).
Las reglas `OUTSOURCED` se siguen pudiendo configurar, pero no generan filas de planificación.

**D-11 · Avisa, nunca bloquea.**
«Atendido hace poco», «cruce de reglas» y «ya hay una intervención abierta» son avisos. El
coordinador decide. Mismo criterio que el catálogo para periodos bloqueantes: *«aviso, pero puede
seguir»*.

**D-12 · Solo ADMIN y COORDINADOR.**
Decisión del usuario para planificación y avisos del inicio. Se extiende a conjuntos y reglas de
frecuencia, que pasan a ser parte de la planificación. Enmienda SPEC-001 Anexo A: SUPERVISOR y
OPERARIO pierden la lectura del módulo 1.7.

**D-13 · Fuera de alcance, a propósito.**
Préstamos y periodos bloqueantes (REQ 1.12): todavía no existen; cuando existan, un préstamo
**adelanta** la urgencia del jardín al terminar, porque sale deteriorado. Este spec deja el
cálculo de §5.5 en el engine para que esa regla se añada ahí. También fuera: contratistas,
incidencias (un pedido sobre un jardín que ya está en un conjunto se resuelve con la
planificación de ese conjunto) y notificaciones por correo.

## 3. Contratos de API

Sobre `{ok, message, data}` (INV-1) y envolturas de error de SPEC-C02, no se repiten.

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/green-area-sets` | ADMIN, COORDINADOR | Lista de conjuntos activos |
| `GET /api/v1/green-area-sets/{id}` | ADMIN, COORDINADOR | Un conjunto con sus jardines |
| `POST /api/v1/green-area-sets` | ADMIN, COORDINADOR | Crea un conjunto |
| `PUT /api/v1/green-area-sets/{id}` | ADMIN, COORDINADOR | Edita nombre, jardines y actividades |
| `DELETE /api/v1/green-area-sets/{id}` | ADMIN, COORDINADOR | Baja lógica |
| `GET /api/v1/maintenance/planning` | ADMIN, COORDINADOR | Filas de planificación ordenadas por urgencia |
| `GET /api/v1/maintenance/planning/recent-attention` | ADMIN, COORDINADOR | Jardines atendidos antes del mínimo, para el registro de intervención |
| `/api/v1/maintenance/frequencies/**` | ADMIN, COORDINADOR (antes también SUPERVISOR y OPERARIO en lectura) | Reglas, con alcance por conjunto |

### 3.1 Conjuntos

`GET /api/v1/green-area-sets`

```json
[{"id":3,"name":"Ingreso Riva-Agüero","description":null,"zoneCount":18,
  "activities":[{"id":30,"label":"Corte de césped"}],"version":2}]
```

`GET /api/v1/green-area-sets/{id}`

```json
{"id":3,"name":"Ingreso Riva-Agüero","description":null,"version":2,
 "activities":[{"id":30,"label":"Corte de césped"}],
 "zones":[{"id":112,"code":"SE-0112","name":"Sección 112","displayName":"Jardín de la Entrada Principal",
           "landscapeCode":"GREEN_AREA","sectorName":"Sector 2"}]}
```

`displayName` es el nombre del lugar cuyo `zone_id` es esa sección, si existe; si no, el nombre
de la sección. Con varios lugares sobre la misma sección, el de menor `id` (decisión del
builder si hay un criterio mejor).

`POST /api/v1/green-area-sets` y `PUT /api/v1/green-area-sets/{id}`

```json
{"name":"Ingreso Riva-Agüero","description":null,"zoneIds":[112,113,118],
 "activityTypeItemIds":[30],"version":2}
```

`version` solo en `PUT` (control optimista, 409 si cambió). Respuesta: el detalle, más
`warnings` (lista de textos) cuando hay cruce de reglas propias (D-08).

### 3.2 Planificación

`GET /api/v1/maintenance/planning` — sin parámetros; «hoy» es la fecha del servidor en la zona
horaria configurada. Para pruebas el builder puede inyectar un `Clock`.

```json
[{"setId":3,"setName":"Ingreso Riva-Agüero","zoneCount":18,
  "activityTypeItemId":30,"activityLabel":"Corte de césped",
  "ruleKind":"INTERVAL_DAYS","ownRule":false,
  "rhythm":{"minDays":30,"maxDays":35,"seasonLabel":"Primavera","annualTarget":null,"windowStartMonth":null,"windowEndMonth":null},
  "state":"OVERDUE","days":4,
  "lastDate":"2026-09-30","daysSinceLast":39,
  "progress":null,"neverAttendedCount":0,
  "openIntervention":null,
  "estimatedDate":null,"yearCount":null,
  "suggestedDate":"2026-11-08"}]
```

- `state`: `NOT_DUE`, `DUE`, `OVERDUE`, `IN_PROGRESS`, `SCHEDULED`, `DONE_FOR_PERIOD` (§5.5).
- `days`: su significado depende de `state` (faltan, quedan, días tarde); el frontend lo
  traduce con el texto de §7.
- `progress`: `{"done":34,"total":50}` solo con `IN_PROGRESS`.
- `openIntervention`: `{"id":81,"code":"INT-000081","scheduledDate":"2026-11-05"}` con
  `IN_PROGRESS` o `SCHEDULED`.
- `suggestedDate`: la fecha que el registro de intervención propone (§5.6).

### 3.3 Atendido hace poco

`GET /api/v1/maintenance/planning/recent-attention?activityTypeItemId=30&date=2026-11-08&zoneIds=112,113`

```json
[{"zoneId":113,"displayName":"Sección 113","lastDate":"2026-11-05","daysSinceLast":3,"minDays":30}]
```

### 3.4 Decisiones que el código no explica

- La planificación se calcula al pedirla; no se guarda. Son a lo sumo unos cientos de filas
  (conjuntos × actividades) y el cálculo es aritmética sobre una consulta agregada.
- `DELETE` de un conjunto con una regla propia vigente responde 422: primero se quita la regla.
  Así nunca queda una regla apuntando a un conjunto dado de baja.
- `zoneIds` que no sean secciones activas → 422 con la lista de ids rechazados.

## 4. Migración de base de datos

Número: el siguiente libre al implementar (REGLAS §0.2). En `origin/develop` al 8 nov 2026 es
V030, pero ramas sin integrar ya ocupan V030–V037: comprobarlo al implementar. Propietaria:
SPEC-203.

```sql
-- Conjuntos de áreas verdes (SPEC-203 D-01)
CREATE TABLE green_area_sets (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(120) NOT NULL,
    description        TEXT,
    created_by_user_id BIGINT REFERENCES users(id),  -- nulo solo en los convertidos (paso 2)
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_sets_name_active
    ON green_area_sets (lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE green_area_set_zones (
    id         BIGSERIAL PRIMARY KEY,
    set_id     BIGINT NOT NULL REFERENCES green_area_sets(id),
    zone_id    BIGINT NOT NULL REFERENCES zones(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_set_zones_active
    ON green_area_set_zones (set_id, zone_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_green_area_set_zones_zone ON green_area_set_zones (zone_id);

-- Actividades que se planifican en cada conjunto (D-09)
CREATE TABLE green_area_set_activities (
    id                    BIGSERIAL PRIMARY KEY,
    set_id                BIGINT NOT NULL REFERENCES green_area_sets(id),
    activity_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    created_at            TIMESTAMP NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_set_activities_active
    ON green_area_set_activities (set_id, activity_type_item_id) WHERE deleted_at IS NULL;

-- Reglas: alcance por conjunto (D-07)
ALTER TABLE maintenance_frequencies ADD COLUMN green_area_set_id BIGINT REFERENCES green_area_sets(id);
```

Después, en la misma migración, y en este orden:

La conversión abarca **todas** las filas, vigentes, cerradas y dadas de baja, porque el
reporte enlaza las versiones de una regla por su alcance (`ComplianceReader`) y la cadena de
historial no debe romperse.

1. **`BY_ZONE`:** se crea **un conjunto por sección distinta** que aparezca en esas filas,
   llamado como la sección, con esa sección. Todas las filas de esa sección (cualquier
   actividad, régimen o versión) apuntan a ese mismo conjunto, y sus actividades se declaran
   en él. Así no hay dos conjuntos con el mismo nombre.
2. **`BY_SECTOR` con `zone_id`** (solo existe en el seed de desarrollo: la API nunca guardó el
   sector, `MaintenanceFrequenciesServiceImpl.validateScope`): igual, un conjunto por sector con
   sus secciones activas (`parent_zone_id`), llamado como el sector. Si ese nombre ya lo tomó un
   conjunto del paso 1, se le añade « (sector)».
   **`BY_SECTOR` sin `zone_id`** (las creadas desde la pantalla): no dicen a qué sector se
   refieren, así que pasan a `CAMPUS_WIDE`. Si la fila vigente choca con una regla general
   vigente de la misma actividad y régimen, se cierra (`valid_to` = día de la migración) y
   manda la general.
   `maintenance_frequencies` no guarda autor (V002), así que los conjuntos convertidos quedan
   con `created_by_user_id` nulo: por eso la columna admite nulos, y la aplicación siempre lo
   llena en los conjuntos que crea un usuario.
3. Cambiar `scope` a `BY_SET` en las filas de los pasos 1 y 2, quitar `zone_id`, reemplazar
   `chk_freq_scope` por `CHECK (scope IN ('CAMPUS_WIDE','BY_SET'))` y añadir
   `CHECK ((scope = 'BY_SET') = (green_area_set_id IS NOT NULL))`.
4. Reemplazar el índice único `idx_maint_freq_unique_current` por uno sobre
   `(activity_type_item_id, regime, scope, COALESCE(green_area_set_id, 0))` con el mismo filtro.
5. Quitar `target_days_interval` de `maintenance_frequencies` y de
   `maintenance_frequency_seasons` (D-06).

Producción no tiene reglas sembradas (solo `dev-migration/R__seed_demo_reports.sql`), pero un
usuario pudo crearlas desde la pantalla: por eso la conversión es obligatoria y no un borrado.
El seed de desarrollo se actualiza para no usar `target_days_interval` ni `zone_id`.

## 5. Comportamiento

### 5.1 Flujo principal: planificar la semana

1. El coordinador entra al sistema. El inicio muestra los conjuntos atrasados y los que tocan en
   los próximos 7 días (§5.7).
2. Pulsa «Ir a Planificación» → `/intervenciones/planificacion`: lista ordenada por urgencia a
   la izquierda, mapa a la derecha.
3. Selecciona una fila → el mapa ilumina los jardines del conjunto; al pasar el cursor sobre uno
   se ven su nombre y la fecha de su última vez para esa actividad.
4. Pulsa «Planificar intervención» → `/intervenciones/nueva?conjunto=3&actividad=30` con el
   formulario prellenado (§5.6).
5. Ajusta, guarda y asigna como hoy (SPEC-200). Desde ese momento la fila pasa a
   «Programada» y, cuando el capataz empieza, a «En curso» con su avance.

### 5.2 Flujo: crear un conjunto

1. `/intervenciones/conjuntos` → «Nuevo conjunto».
2. Abre el selector de jardines sobre el mapa: clic para agregar o quitar, arrastre para
   seleccionar por área, buscador por nombre. La lista de seleccionados y el mapa siempre
   coinciden.
3. Nombre (obligatorio, único sin distinguir mayúsculas), descripción opcional y las
   actividades que se planifican en él (al menos una). Las actividades se listan bajo el título
   de su grupo; el grupo no es una casilla. El formulario muestra los jardines elegidos primero,
   resumidos por sector.
4. Guardar → si algún jardín queda bajo dos reglas propias de la misma actividad, se muestra el
   aviso de D-08 junto con la confirmación.

### 5.3 Flujo: configurar cada cuánto

`/intervenciones/frecuencias` mantiene la pantalla de SPEC-101 con tres cambios:

- Nuevo campo «Se aplica a»: **Todo el campus** o **Un conjunto** (selector de conjuntos). Las
  filas con conjunto muestran la etiqueta «propio de este conjunto». Es el único lugar donde
  aparece esa etiqueta.
- Sin «Teórico» (D-06).
- Sin el panel «Cumplimiento por lugar atendido»: lo reemplaza la planificación.
- La actividad se elige en dos pasos, grupo y luego actividad, y la tabla usa `DataTable` con
  columnas «Actividad», «Quién la ejecuta», «Tipo de frecuencia», «Cada cuánto», «Duración
  estimada», «Se aplica a» y «Vigente desde» (10 nov 2026).

### 5.4 Última vez de un jardín

Para una actividad A y una sección S, la última vez es la fecha local (zona horaria
configurada) del mayor `completed_at` entre las ubicaciones de intervención que cumplen todo:

- la intervención es de tipo A, no está dada de baja ni cancelada;
- la ubicación no está dada de baja y su estado actual es `COMPLETED` o `VALIDATED`
  (`OBSERVED`, `IN_PROGRESS`, etc. no cuentan, D-04);
- la ubicación apunta a S por `zone_id`, **o** por `place_id` de un lugar cuyo `zone_id` es S.

Cuenta cualquier origen (mantenimiento o hallazgo): un corte es un corte. Una ubicación que
apunta a un **sector** completo no cuenta para sus secciones: no se infiere cobertura (SPEC-101,
enmienda T09).

### 5.5 Estado de una fila (conjunto × actividad)

**Qué filas existen.** Una por cada par (conjunto, actividad) donde la actividad está declarada
en el conjunto (D-09) y existe una regla vigente `IN_HOUSE` que no es `ON_DEMAND`: la propia del
conjunto si la hay; si no, la de todo el campus. Sin regla aplicable, la fila aparece con estado
`NOT_CONFIGURED` y el texto «Sin frecuencia configurada», al final de la lista.

**Primero, lo que está abierto.** Si existe una intervención de esa actividad, no cancelada,
con al menos una ubicación en un jardín del conjunto que todavía no está `COMPLETED` ni
`VALIDATED`:

- si alguna de esas ubicaciones ya empezó → `IN_PROGRESS`, con
  `progress.done` = jardines del conjunto completados desde el inicio de esa intervención
  (el `started_at` más temprano entre sus ubicaciones) y `progress.total` = jardines del conjunto;
- si ninguna empezó → `SCHEDULED`, con su fecha programada.

Con varias intervenciones abiertas, la de fecha programada más temprana.

**Si no hay nada abierto**, la referencia `ref` es la **más antigua** de las últimas veces de los
jardines del conjunto (D-03). Si algún jardín no tiene ninguna, `neverAttendedCount` lo cuenta y
la fila es `DUE` con `days = null` y el texto «Toca · N jardines sin registro previo».

Con `ref`, según el tipo de regla:

| Tipo | Cálculo | Estados |
|---|---|---|
| `INTERVAL_DAYS` | `[min, max]` = intervalo de la estación del mes de `ref` (`FrequencyRule.intervaloEn(ref)`); sin estación, el general | hoy < ref+min → `NOT_DUE` (`days` = faltan) · ref+min ≤ hoy ≤ ref+max → `DUE` (`days` = quedan; 0 = «vence hoy») · hoy > ref+max → `OVERDUE` (`days` = días tarde) |
| `COVERAGE_CYCLE` | igual con min = max = `coverage_target_days` | ídem |
| `SEASONAL_PERIOD` (cuota anual) | `yearCount` = mínimo, entre los jardines, de intervenciones distintas de A completadas en el año calendario. `pendientes = annual_target_count − yearCount`. `espacio = 365 / annual_target_count`. `estimatedDate = min(ref + espacio, 31 dic − (pendientes − 1) × espacio)` | pendientes ≤ 0 → `DONE_FOR_PERIOD` («Cumplido: N de N en el año») · hoy < estimatedDate − 7 → `NOT_DUE` · si no → `DUE` («próxima estimada: <fecha>»). Nunca `OVERDUE`: la fecha la decide el coordinador. |
| `ANNUAL_WINDOW` | ventana `season_start_month`–`season_end_month` (puede cruzar el año, como diciembre–enero) | hoy dentro de la ventana y algún jardín sin atender en ella → `DUE` (`days` = quedan hasta el cierre) · todos atendidos en la ventana → `DONE_FOR_PERIOD` · fuera de la ventana y la última se cerró sin completar → `OVERDUE` (`days` = desde el cierre) · fuera y completada → `NOT_DUE` (`days` = faltan para la apertura) |

**Orden de la lista:** `OVERDUE` (más días tarde primero) → `DUE` (menos días primero; sin
registro previo al principio) → `IN_PROGRESS` → `SCHEDULED` → `NOT_DUE` (menos días primero) →
`DONE_FOR_PERIOD` → `NOT_CONFIGURED`.

### 5.6 Registro de intervención prellenado

`/intervenciones/nueva?conjunto=<id>&actividad=<id>` llena el formulario de SPEC-200 con:

- clase (la madre del tipo) y tipo = la actividad;
- origen = mantenimiento;
- fecha programada = `suggestedDate`: hoy si la fila está `DUE` u `OVERDUE`; `ref + min`
  si está `NOT_DUE`; la apertura de la ventana en `ANNUAL_WINDOW`; `estimatedDate` en la cuota;
- una ubicación por jardín del conjunto (`zoneId`), sin cantidad;
- descripción «Planificada desde: <actividad> en <conjunto>».

**Aviso de atendido hace poco.** Cada vez que el formulario tiene tipo, fecha y ubicaciones con
sección, consulta `recent-attention` y muestra, por jardín, «<jardín> ya tuvo <actividad> hace
N días (el mínimo es M)», con «Quitar de esta intervención» y «Mantenerlo». Un jardín cuenta
como reciente si fecha programada < última vez + mínimo de su regla efectiva, con el mínimo de
la estación del mes de la **última vez** (igual que §5.5).

**Regla efectiva de un jardín** para una actividad: la propia de menor mínimo entre los
conjuntos que lo contienen (D-08); si ninguno tiene regla propia, la de todo el campus. Esto
vale para **cualquier** jardín, esté o no en un conjunto y declare o no el conjunto esa
actividad: D-09 solo decide qué filas aparecen en la planificación, no qué regla rige a un
jardín. La misma función se usa en el reporte mensual (§5.8).

Solo avisan las reglas `INTERVAL_DAYS` y `COVERAGE_CYCLE`. La cuota anual y la ventana anual no
tienen un mínimo de días y su momento lo decide el coordinador, así que no avisan.

El aviso funciona también en intervenciones creadas a mano: el coordinador es el mismo y el
riesgo es el mismo.

Si ya hay una intervención abierta para esa actividad en ese conjunto, el formulario lo dice
con un enlace a ella, sin bloquear (D-11).

### 5.7 Avisos en el inicio

Para ADMIN y COORDINADOR, encima de la bienvenida, dos bloques (se omite el que esté vacío):

- **«N conjuntos atrasados»**: filas `OVERDUE`, con el texto «<actividad> en <conjunto> — N días
  tarde».
- **«N conjuntos tocan en los próximos 7 días»**: filas `DUE`, y `NOT_DUE` con `days ≤ 7`; en la
  cuota anual, el texto «— próxima estimada: <fecha>».

Cuenta filas, no conjuntos únicos: si un conjunto tiene dos actividades atrasadas, son dos
avisos. Un botón «Ir a Planificación». Sin datos, ningún bloque. La ventana de 7 días es una
constante con nombre (`NEAR_DUE_DAYS`).

### 5.8 Cambio en el reporte mensual (SPEC-202)

El evaluador de intervalos se alinea con D-05:

| Días medidos | Antes | Ahora |
|---|---|---|
| < mínimo | `ON_TARGET` | `EARLY` («Antes del mínimo») |
| mínimo … máximo | `ON_TARGET` o `WITHIN_TOLERANCE` | `ON_TARGET` |
| > máximo | `OVERDUE` | `OVERDUE` |

`WITHIN_TOLERANCE` deja de producirse y se retira del enum, del tipo compartido y de las
etiquetas. `EARLY` usa el `Badge` neutral (enmienda SPEC-C01 §3.1 de SPEC-202). El reporte sigue
contando solo lo aprobado (D-04).

- **Gravedad** (`VerdictAggregator.SEVERITY`): `OVERDUE` > `EARLY` > `ON_TARGET`. Atender antes
  de tiempo es un desperdicio, no una falta de atención, por eso queda por debajo de vencido.
- **Contrato del reporte:** el conteo `withinTolerance` de `MonthlyReportResponse` y su columna
  en `ComplianceTable.tsx` se reemplazan por `early` («Antes del mínimo»).
- **Qué regla juzga a cada jardín:** la regla efectiva de §5.6, la misma de la planificación.
  Hoy `ComplianceReader` evalúa cada regla por separado, de modo que un jardín con regla propia
  también se juzga con la general. Con este spec, a cada jardín lo juzga **una sola** regla.

### 5.9 Casos límite

- **Conjunto sin jardines activos** (todas sus secciones se dieron de baja): la fila no aparece
  y la lista de conjuntos lo marca «sin jardines».
- **Jardín dado de baja después de entrar al conjunto:** se ignora en el cálculo y en el mapa.
- **Regla que cambia de versión** (SPEC-101 versionado): se usa la vigente hoy.
- **Estación que cambia entre la última vez y hoy:** manda la estación de `ref`, porque el
  jardín creció en esas condiciones. *(Pendiente de confirmar con el cliente.)*
- **Conjunto de un solo jardín:** funciona igual; es el caso que reemplaza a `BY_ZONE`.
- **Ubicación reabierta** tras observación: deja de contar hasta que vuelve a `COMPLETED`.
- **Hoy sin ejecuciones en todo el sistema:** todas las filas con regla salen `DUE` «sin
  registro previo». Es correcto: no hay evidencia de que se haya atendido.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Un coordinador crea un conjunto seleccionando jardines en el mapa y lo encuentra en la lista con su cantidad de jardines | Crear «Prueba» con 3 secciones; la lista dice «3 jardines» |
| CA-02 | Una fila con la última vez hace 39 días y regla 30–35 sale «Toca, atrasada (4 días tarde)» y encabeza la lista | Datos con `completed_at` controlado |
| CA-03 | En un conjunto de 50 jardines con una intervención en marcha y 34 completados, la fila dice «En curso (34 de 50 jardines)» | Completar 34 ubicaciones como capataz |
| CA-04 | Un jardín completado por el capataz cuenta para la planificación antes de que el coordinador lo valide, y deja de contar si lo observa | Completar, consultar, observar, consultar |
| CA-05 | Al planificar un conjunto con un jardín cortado hace 3 días desde otro conjunto, aparece el aviso y se puede quitar el jardín | Dos conjuntos que comparten un jardín |
| CA-06 | El inicio de un COORDINADOR muestra los conjuntos atrasados y los de los próximos 7 días; el de un SUPERVISOR no muestra nada de esto | Iniciar sesión con ambos roles |
| CA-07 | SUPERVISOR y OPERARIO reciben 403 en conjuntos, planificación y frecuencias, y no ven esas entradas en el menú | Llamar a la API y revisar el menú |
| CA-08 | Una regla propia de un conjunto reemplaza la general solo en ese conjunto | Regla general 30–35 y propia 20–25; comparar dos conjuntos |
| CA-09 | Una regla `BY_ZONE` previa queda convertida en regla por un conjunto de un jardín, con el mismo cada cuánto | Migrar una base con una regla `BY_ZONE` |
| CA-10 | En el reporte mensual, un intervalo de 10 días con regla 30–35 sale «Antes del mínimo» y uno de 33 sale «En plazo» | Reporte con datos controlados |
| CA-11 | `/admin/frecuencias` lleva a `/intervenciones/frecuencias`, y el formulario ya no pide «Teórico» | Abrir la ruta antigua |
| CA-12 | Riego sigue seleccionando secciones sobre el mapa igual que antes del cambio de componente | Repetir un turno de riego |

## 7. Especificación visual

Bocetos aprobados en la conversación de diseño (8 nov 2026); el texto manda sobre el boceto.

**Menú** — grupo Intervenciones: «Intervenciones», «Planificación preventiva», «Conjuntos de
áreas verdes», «Frecuencias». «Frecuencias de mantenimiento» sale de Administración.

**Fila de planificación** (tarjeta, tres líneas):

1. **«<Actividad> en <Conjunto>»** a la izquierda; el estado a la derecha.
2. «Última vez: 30 sep (hace 39 días) · 18 jardines». Con `IN_PROGRESS`: «Empezó: 5 nov (hace
   3 días) · 34 de 50 jardines». La cuenta «X de N» **solo** aparece en curso.
3. En pequeño, cada cuánto: «Cada 30–35 días en primavera», «Cada 15 días», «4 al año · van 3»,
   «1 al año, entre diciembre y enero». Sin la palabra «ritmo» y sin marcar si la regla es
   propia del conjunto.

Botón «Planificar intervención» en `DUE`, `OVERDUE` y `NOT_DUE`; «Ver intervención» en
`IN_PROGRESS` y `SCHEDULED`.

**Textos de estado** (color según SPEC-C01: rojo, ámbar, azul, verde, neutro):

| `state` | Texto | Paréntesis |
|---|---|---|
| `OVERDUE` | Toca, atrasada | (N días tarde) · ventana: (la ventana cerró hace N días) |
| `DUE` | Toca | (quedan N días de plazo) · (vence hoy) · (próxima estimada: 14 nov) · sin registro: «N jardines sin registro previo» |
| `IN_PROGRESS` | En curso | (faltan N jardines) |
| `SCHEDULED` | Programada | (para el 12 nov) |
| `NOT_DUE` | Aún no toca | (faltan N días) · ventana: (la ventana abre en N días) |
| `DONE_FOR_PERIOD` | Cumplido | (4 de 4 en el año) · ventana: (hecho en esta ventana) |
| `NOT_CONFIGURED` | Sin frecuencia configurada | — |

**Mapa:** a la derecha de la lista en escritorio; debajo en tablet y móvil. Jardines del conjunto
seleccionado en el color de acento; el resto atenuado. Sin selección, el mapa muestra el campus
sin realce.

**Datos de ejemplo:** ningún número de los bocetos es real. Los valores reales los carga el
coordinador; lo documentado del cliente es «césped 30–45 días según estación», «fitosanitario 4
al año como mínimo», «poda mayor 1 al año, diciembre–enero» y «riego en ciclo de 15–16 días por
3 sectores».

## 8. Tests

```
Engine · estado de una fila
- ref + min - 1 → NOT_DUE, faltan 1 · ref + min → DUE · ref + max → DUE, vence hoy · ref + max + 1 → OVERDUE, 1 día tarde
- la referencia es la última vez MÁS ANTIGUA de los jardines, no la más reciente
- un jardín sin registro → DUE con neverAttendedCount, sin días
- la estación se toma del mes de ref, no del mes de hoy
- cuota 4/año, van 3, ref 15 ago → estimada 14 nov; van 0 en noviembre → estimada se adelanta para caber antes del 31 dic
- cuota cumplida → DONE_FOR_PERIOD; la cuota nunca da OVERDUE
- ventana dic–ene cruza el año: el 15 ene está dentro; el 1 feb sin completar → OVERDUE
- COVERAGE_CYCLE usa coverage_target_days como mínimo y máximo

Última vez de un jardín
- cuenta COMPLETED sin validar; no cuenta OBSERVED ni IN_PROGRESS; deja de contar al reabrir
- cuenta por zone_id y por place_id de un lugar con zone_id; no cuenta una ubicación sobre el sector
- no cuenta intervenciones canceladas ni dadas de baja
- completed_at a las 23:30 de Lima cae en ese día, no en el siguiente UTC

Filas y abiertas
- intervención abierta sin empezar → SCHEDULED; con una ubicación empezada → IN_PROGRESS con avance
- regla propia del conjunto gana a la general; OUTSOURCED y ON_DEMAND no generan filas
- actividad no declarada en el conjunto → sin fila aunque haya regla general

Atendido hace poco
- jardín en dos conjuntos con reglas propias 20–25 y 30–35 → usa 20
- fecha programada = última vez + mínimo → ya no es reciente
- jardín en ningún conjunto → usa la regla general
- cuota anual y ventana anual → nunca avisan

Conjuntos
- nombre repetido sin distinguir mayúsculas → 422; tras la baja lógica, el nombre se libera
- zoneIds con un sector o una subsección → 422 con los ids rechazados
- borrar un conjunto con regla propia vigente → 422
- PUT con versión vieja → 409

Migración
- regla BY_ZONE → conjunto de un jardín + regla BY_SET con los mismos días
- regla BY_SECTOR con zone_id → conjunto con las secciones activas del sector
- regla BY_SECTOR sin zone_id → CAMPUS_WIDE; si choca con una general vigente, queda cerrada
- dos reglas BY_ZONE sobre la misma sección (dos actividades) → un solo conjunto con ambas actividades
- las versiones cerradas y dadas de baja apuntan al mismo conjunto que la vigente; el historial del reporte se conserva
- después no queda ninguna fila con scope BY_ZONE/BY_SECTOR ni columna target_days_interval

Reporte mensual
- 10 días con 30–35 → EARLY; 33 → ON_TARGET; 36 → OVERDUE; WITHIN_TOLERANCE ya no aparece
- lo mismo con una regla sin estaciones (rango general)
- al agregar, OVERDUE pesa más que EARLY y EARLY más que ON_TARGET
- un jardín con regla propia en su conjunto se juzga solo con ella, no también con la general

Permisos
- SUPERVISOR y OPERARIO: 403 en frequencies, green-area-sets y planning (enmienda Anexo A)
```

## 9. Propio de este spec

- **Acciones auditables (SPEC-004 §3.2):** `GREEN_AREA_SET_CREATED`, `GREEN_AREA_SET_UPDATED`,
  `GREEN_AREA_SET_DELETED`, con el id del conjunto y la cantidad de jardines (no la lista).
- **Enmiendas que este spec obliga a anotar en `REGISTRO.md`:** SPEC-101 (D-02 alcance, D-06/D-07
  formulario, panel de cumplimiento, ruta), SPEC-001 Anexo A (lectura de 1.7), SPEC-202 y
  SPEC-C01 §3.1 (`EARLY`, retiro de `WITHIN_TOLERANCE`), Catálogo de requisitos (nota de 1.7,
  avance de 6.10 y la frase sobre D2).
