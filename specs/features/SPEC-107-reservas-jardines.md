# SPEC-107 — Reservas de jardines

| Campo | Valor |
|-------|-------|
| HU relacionada | Requisito 1.12 del Catálogo de Requisitos (eventos del campus), solo su parte de préstamos |
| Autor | Jean Piero David Morán, con Claude |
| Plataforma | Web |
| Sprint | — |
| Dependencias | SPEC-102 (zonas, `is_reservable`, polígonos), M9 lugares (V035: los 19 jardines prestables), SPEC-106 (Directorio), SPEC-103 D-04 (ciclo común de cargas), SPEC-200 (intervenciones y su registro), SPEC-003 §5.6 (parámetros), SPEC-001 Anexo A, SPEC-C01 |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-106 §4.2 (cómo una carga entra al ciclo común), SPEC-203
> §5.6 (el patrón de aviso que no bloquea en el registro de intervención).

> **La regla de este spec: contiene lo que el código NO dice.** Mientras la feature no esté
> implementada, este spec es la fuente de verdad y el detalle se escribe literal.

---

## 1. Objetivo

Registrar qué organización usa qué jardín prestable, en qué horario, y que el equipo lo vea a
tiempo: un módulo propio con la agenda de reservas, y un aviso, al programar trabajo, cuando
puede haber una reserva en el jardín o a 10 m o menos de él.

## 2. Contexto

### 2.0 Por qué y hasta dónde

La OSG presta unos 12 jardines de forma recurrente. Hoy nadie en Hesperides sabe cuándo, y una
cuadrilla puede terminar cortando el césped al lado de una ceremonia. Este spec cubre **solo la
reserva**. Quedan **fuera**, a propósito (decisión del usuario, 9-11 nov 2026):

- los **eventos bloqueantes** (examen de admisión, fin de ciclo) del requisito 1.12;
- la **recuperación** del jardín después del préstamo: una reserva se cierra a su hora de fin y
  no deja nada pendiente;
- la carga desde el **calendario de la OSG** con su formato propio;
- las reservas **en el mapa** (mejora futura).

### 2.1 Vocabulario

| Término | Qué es |
|---|---|
| **Jardín prestable** | Un **lugar** (M9) cuya sección es prestable (`zones.is_reservable`), directamente (`places.zone_id`) o a través de sus lugares hijos, como «Jardín Palmeras (Gastronomía)», que abarca dos secciones (V035). Se reserva el lugar, no la sección: así lo trata el calendario de la OSG. |
| **Reserva** | Un uso único de un jardín prestable por una organización, entre una fecha y hora de inicio y otra de fin. No se repite. |
| **Contorno del jardín** | La unión de los polígonos de las secciones del lugar (las suyas o las de sus hijos). |
| **Cerca** | A **10 m o menos** del contorno del jardín reservado, medidos de borde a borde. «Contiguo» es el caso de 0 m. |
| **Estado** | Se calcula, no se guarda: **Próxima** (aún no empieza), **En curso**, **Terminada** (pasó su hora de fin) o **Anulada**. |

### 2.2 Backend

- Paquete nuevo `pe.edu.pucp.hesperides.modules.reservations`.
- Entidad `GardenReservation` (`garden_reservations`), repositorio JPA y consultas JDBC para
  cercanía (PostGIS).
- Engine puro `engine/reservations/`: estado de una reserva, cruce de horarios y si una fecha
  cae dentro de una reserva. Sin Spring ni base de datos.
- Carga masiva: un `ImportHandler` con `kind = reservations`, como `DirectoryImportHandler`.
- El aviso en el registro de intervención consulta este módulo; el módulo de intervenciones no
  depende de él (la página llama a los dos endpoints).

### 2.3 Frontend web

- `/reservas` — agenda (lista por día). `/reservas/nueva`, `/reservas/[codigo]` — formulario.
- `/reservas/importar` — registro masivo, con el mismo flujo de pantalla que
  `/directorio/importar`.
- La ficha del lugar **no** muestra reservas: viven solo en su módulo *(decisión del usuario, 11 nov
  2026)*.
- Registro de intervención (`components/interventions/InterventionForm.tsx`): aviso de reservas
  el mismo día en el jardín o cerca.
- Menú: grupo propio **Reservas** *(decisión del usuario, 11 nov 2026: es más fácil de encontrar y
  recibirá después los eventos bloqueantes de 1.12)*, con «Agenda de reservas» (cuatro roles) y
  «Registro masivo» (ADMIN, COORDINADOR). Reutiliza `OrganizationPicker` y `ContactPicker` del Directorio.

### 2.4 Restricciones técnicas

- Fechas y horas: se guardan como `TIMESTAMPTZ`; se muestran y se comparan por día en la zona
  `hesperides.maintenance.time-zone` (America/Lima).
- Distancias con `ST_DWithin(a::geography, b::geography, :metros)`: metros reales sobre el
  elipsoide, no grados.
- Todo mensaje que vea el usuario, en español, y registrado en `frontend/src/lib/api-errors.ts`
  (o en un archivo de mensajes del módulo, como `directoryErrorMessages.ts`).

### 2.5 Decisiones

**D-01 · Una reserva es única y de un solo jardín.** Decisión del usuario: no se repite. Si una
actividad usa dos jardines, son dos reservas. *Descartado:* recurrencia y reservas de varios
jardines.

**D-02 · Organización obligatoria, contacto opcional, ambos del Directorio.** Quién reserva es una
organización (SPEC-106); el contacto, si se indica, debe estar vinculado a esa organización. Así el
nombre y el teléfono no se copian: salen de la ficha del contacto. *Descartado:* texto libre, que
duplica el Directorio. *(Decisión de diseño.)*

**D-03 · Se reserva un lugar prestable.** La reserva guarda `place_id`. Un lugar sin sección
prestable propia ni en sus hijos se rechaza (422). Hacer prestable una sección no es parte de
este spec. *Descartado:* reservar la sección, que obligaría a dos reservas para Palmeras y
mostraría «Lado oeste» como nombre. *(Decisión de diseño, a partir de la revisión.)*

**D-03b · Qué cuenta como «trabajo cerca».** Solo el **trabajo por hacer**: cada jardín o punto
de una intervención tiene su propio estado, y cuenta solo si ahí todavía no se terminó (no
COMPLETED, VALIDATED ni CANCELLED). Un jardín donde la cuadrilla ya terminó no hace ruido. La
intervención, además, no está cancelada ni dada de baja. La geometría de una
ubicación es, en este orden: su sección (`zone_id`), el contorno de su lugar (`place_id`, con
cualquier origen de contorno de V034), sus coordenadas, o el punto de su primer ejemplar. Sin
ninguna, no participa. Toda sección tiene polígono (las 531 de la base, comprobado el 11 nov 2026),
así que el contorno de un jardín prestable siempre existe. *(Decisiones de diseño, a partir de la
revisión.)*

**D-04 · Los cruces avisan, nunca bloquean.** Decisión del usuario: un jardín puede recibir más de
una reserva a la vez, de la misma u otra organización. Dos reservas activas del mismo jardín con
horarios que se solapan producen un aviso al guardar.

**D-05 · Cercanía de 10 m desde el borde del jardín reservado.** Decisión del usuario. El valor
vive en el parámetro del sistema `RESERVATION_NEARBY_METERS` (entero de 0 a 100, editable por
ADMIN, 10 por defecto) para ajustarlo en campo sin tocar código *(decisión de diseño)*. El rango
se valida en `SystemParametersService`: un negativo apagaría los avisos sin que nadie lo note.

**D-06 · Una intervención coincide con una reserva si puede haber trabajo al lado mientras dura.**
Decisión del usuario (11 nov 2026). Una intervención dura varios días, y el capataz marca cada
jardín completado al cerrar su jornada; no se sabe qué día ni a qué hora se trabaja cada uno. Por
eso una intervención coincide con una reserva cuando:
1. su fecha programada es igual o anterior al **último día** (en Lima) de la reserva, y
2. alguna de sus ubicaciones en el jardín reservado o cerca de él (D-03b) **no estaba completada
   antes de que empiece la reserva** (`completed_at` nulo o posterior a `starts_at`).
Ejemplo: poda de lunes a viernes en A, B y C; reserva el miércoles junto a B. Si B se completó el
lunes, no avisa; si se completa el jueves o aún no se completa, avisa. El aviso dice «puede haber
trabajo», no «habrá»: no hay horas de trabajo que comparar.

En el otro sentido (registrar una intervención) no se sabe cuándo terminará, así que se miran las
reservas activas que tocan desde su fecha programada hasta **7 días** después *(decisión de
diseño)*, en el jardín o cerca de él.

**D-06b · Dos niveles de aviso.** Decisión del usuario: se puede reservar un jardín que se está
interviniendo, y se puede programar trabajo en un jardín reservado, pero con un **aviso crítico**
(rojo) que el usuario lee antes de decidir. Es crítico cuando la coincidencia es **en el mismo
jardín** (`WORK_HERE`, `RESERVED_HERE`). Cuando es en un jardín cercano, o es otra reserva que se
cruza, el aviso es normal (ámbar). Ninguno bloquea.

**D-07 · Avisos en los dos sentidos.** Decisión del usuario:
- al **guardar una reserva**: otras reservas que se cruzan en el mismo jardín, e intervenciones
  que coinciden (D-06), en el jardín mismo (crítico) o cerca;
- al **registrar o editar una intervención**: reservas activas que coinciden con su ventana de
  fechas (D-06) en sus ubicaciones (crítico) o cerca de ellas.
Ninguno impide guardar.

**D-08 · ADMIN y COORDINADOR registran; todos ven, el operario también el contacto.** Decisión
del usuario (11 nov 2026). SUPERVISOR y OPERARIO leen la agenda con la organización, el
contacto y su teléfono; no ven el registro masivo ni los botones de edición (y el backend responde
403). **Enmienda a SPEC-106:** el Directorio sigue cerrado al operario, pero lo que una reserva
muestra de su organización y su contacto sí lo ve. Por eso el filtro de la agenda no usa
`OrganizationPicker` (que llama al Directorio y daría 403): usa `GET /api/v1/reservations/organizations`,
las organizaciones que tienen alguna reserva.

**D-09 · Anular, no borrar.** Una reserva se **anula** con un motivo (obligatorio, hasta 500
caracteres) y queda en la agenda como «Anulada» cuando se piden las anuladas. Solo se anula o edita
mientras no está Terminada: una reserva pasada es historia.

**D-10 · Se puede registrar una reserva pasada.** Para cargar historia. Sale directamente como
Terminada. *(Decisión de diseño.)*

**D-11 · Una intervención abierta** es una intervención no cancelada ni dada de baja, con al menos
trabajo por hacer en alguna ubicación (D-03b), juzgada ubicación por ubicación como en SPEC-203 §5.5.

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/reservations?from=&to=&placeId=&organizationCode=&includeCancelled=&page=` | Cuatro roles | Agenda paginada, por inicio ascendente |
| `GET /api/v1/reservations/{code}` | Cuatro roles | Una reserva |
| `POST /api/v1/reservations` | ADMIN, COORDINADOR | Crea |
| `PUT /api/v1/reservations/{code}` | ADMIN, COORDINADOR | Edita (no Terminada ni Anulada) |
| `POST /api/v1/reservations/{code}/cancel` | ADMIN, COORDINADOR | Anula con motivo |
| `GET /api/v1/reservations/check?placeId=&startsAt=&endsAt=&excludeCode=` | ADMIN, COORDINADOR | Avisos antes de guardar (D-07, primer sentido) |
| `GET /api/v1/reservations/nearby?date=&zoneIds=&placeIds=&points=&elementIds=` | ADMIN, COORDINADOR | Avisos del registro de intervención (D-07, segundo sentido) |
| `GET /api/v1/reservations/gardens` | Cuatro roles | Jardines prestables para el selector y los filtros |
| `GET /api/v1/reservations/organizations` | Cuatro roles | Organizaciones con al menos una reserva, para el filtro (D-08) |
| `POST /api/v1/imports/reservations/preview`, `POST /api/v1/imports/{batchId}/confirm` | ADMIN, COORDINADOR | Registro masivo (ciclo común) |

### 3.1 Cuerpos

Reserva (respuesta):

```json
{"code":"RES-0042","place":{"id":4,"code":"LUG-0004","name":"Jardín Rosales"},
 "organization":{"code":"ORG-0031","name":"Facultad de Letras"},
 "contact":{"code":"CON-0007","fullName":"Juan Diego Villasante","mobile":"987654321","extension":null},
 "startsAt":"2026-11-13T10:00:00-05:00","endsAt":"2026-11-13T14:00:00-05:00",
 "purpose":"Feria de Letras","state":"UPCOMING","cancelReason":null,"version":0,
 "warnings":[]}
```

`state`: `UPCOMING`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`.
`warnings` solo viene lleno en la respuesta de crear y editar.

Crear y editar:

```json
{"placeId":4,"organizationCode":"ORG-0031","contactCode":"CON-0007",
 "startsAt":"2026-11-13T10:00:00-05:00","endsAt":"2026-11-13T14:00:00-05:00",
 "purpose":"Feria de Letras","version":0}
```

Avisos (`check` y `nearby`, y `warnings` al guardar):

```json
[{"kind":"WORK_HERE","severity":"CRITICAL","text":"Jardín Rosales tiene trabajo por hacer de INT-000079 (empezó el 11 nov): pueden estar trabajando durante la reserva","interventionId":79},
 {"kind":"OVERLAPPING_RESERVATION","severity":"WARNING","text":"Jardín Rosales ya tiene otra reserva de 11:00 a 13:00 (Facultad de Ciencias)","reservationCode":"RES-0040"},
 {"kind":"NEARBY_WORK","severity":"WARNING","text":"A 6 m, Jardín Frutas tiene trabajo por hacer de INT-000081 (programada el 12 nov)","interventionId":81},
 {"kind":"RESERVED_HERE","severity":"CRITICAL","text":"Jardín Rosales está reservado el 13 nov de 10:00 a 14:00 (Facultad de Letras)","reservationCode":"RES-0042"},
 {"kind":"RESERVED_NEARBY","severity":"WARNING","text":"A 6 m, Jardín Rosales está reservado el 13 nov de 10:00 a 14:00 (Facultad de Letras)","reservationCode":"RES-0042"}]
```

El texto lo arma el backend en español, porque lleva datos; el frontend lo muestra tal cual, en
rojo los `CRITICAL` y en ámbar los `WARNING`, los críticos primero. La distancia se redondea al
metro.

### 3.2 Reglas de validación (422 salvo indicación)

- `placeId` de un lugar vigente y prestable (D-03); si no, «Ese jardín no se puede reservar».
- `organizationCode` de una organización vigente; `contactCode`, si viene, vinculado a ella.
- `endsAt` posterior a `startsAt`; «La reserva debe terminar después de empezar».
- Duración máxima 7 días; «Una reserva no puede durar más de 7 días» *(decisión de diseño: evita
  reservas de meses por error de tipeo)*.
- `purpose` opcional, hasta 300 caracteres.
- Editar o anular una Terminada o Anulada: «Esta reserva ya terminó o fue anulada».
- `version` vieja: 409 «Otra persona cambió esta reserva. Recarga para ver su versión.»

## 4. Migración de base de datos

Siguiente número libre en la rama (hoy V039). Propietaria: SPEC-107.

```sql
CREATE SEQUENCE garden_reservation_code_seq;

CREATE TABLE garden_reservations (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(20) NOT NULL UNIQUE
                       DEFAULT 'RES-' || lpad(nextval('garden_reservation_code_seq')::text, 4, '0'),
    place_id           BIGINT NOT NULL REFERENCES places(id),
    organization_id    BIGINT NOT NULL REFERENCES organizations(id),
    contact_id         BIGINT REFERENCES contacts(id),
    starts_at          TIMESTAMPTZ NOT NULL,
    ends_at            TIMESTAMPTZ NOT NULL,
    purpose            VARCHAR(300),
    cancelled_at       TIMESTAMPTZ,
    cancel_reason      VARCHAR(500),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    import_batch_id    BIGINT REFERENCES import_batches(id),
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP,
    CONSTRAINT chk_reservation_period CHECK (ends_at > starts_at),
    CONSTRAINT chk_reservation_cancel CHECK ((cancelled_at IS NULL) = (cancel_reason IS NULL))
);
CREATE INDEX idx_garden_reservations_place_time ON garden_reservations (place_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_time ON garden_reservations (starts_at, ends_at) WHERE deleted_at IS NULL;

INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('RESERVATION_NEARBY_METERS', 'Distancia de aviso por reservas (m)', '10', 'INTEGER',
        'Metros desde el borde de un jardín reservado dentro de los cuales se avisa al programar trabajo', TRUE);
```

Y `import_batches` admite el tipo nuevo, igual que hizo V037 con el Directorio:

```sql
ALTER TABLE import_batches DROP CONSTRAINT import_batches_kind_check;
ALTER TABLE import_batches ADD CONSTRAINT import_batches_kind_check
    CHECK (kind IN ('specimens', 'waste-bins', 'drinking-fountains', 'species-photos',
                    'organizations', 'contacts', 'reservations'));
```

## 5. Comportamiento

### 5.1 Registrar una reserva

1. `/reservas/nueva`: jardín (selector de jardines prestables, por nombre o alias), organización,
   contacto opcional (solo los de esa organización), fecha y hora de inicio y de fin, motivo.
2. Al completar jardín y horario, el formulario pide `check` y muestra los avisos debajo del
   horario. Puede guardar igual.
3. Guardar → la respuesta trae `warnings`; si hay, se muestran una vez más junto a la
   confirmación y se vuelve a la agenda.

### 5.2 Agenda

- Por defecto: desde hoy, 30 días hacia adelante, sin anuladas. Filtros: rango de fechas, jardín,
  organización, «Incluir anuladas». Los filtros viven en la URL (como Frecuencias).
- Agrupada por día local («Hoy», «Mañana», «jue 13 nov»). Una reserva de varios días aparece en
  el día en que empieza, con su rango completo.
- Cada fila: horario, jardín, organización, contacto con su teléfono, estado y motivo.
- ADMIN y COORDINADOR ven «Nueva reserva», «Registro masivo» y, en cada fila no terminada,
  «Editar» y «Anular».

### 5.3 Registro de intervención

Cada vez que hay fecha y al menos una ubicación, el formulario pide `nearby` con:
- las secciones (`zoneIds`) y los lugares (`placeIds`) de las ubicaciones, y
- las coordenadas sueltas (`points=lat,lon;lat,lon`) y los ejemplares (`elementIds`).
Muestra los avisos `RESERVED_HERE` / `RESERVED_NEARBY` como el de «atendido hace poco», sin
botones: solo informan. Con más de 20 avisos se muestran 20 y «y N más».

### 5.4 Registro masivo

- Plantilla CSV (UTF-8, `;`):
  `jardin;organizacion;contacto;inicio;fin;motivo`.
  - `jardin`: nombre del lugar, uno de sus alias o el código de una de sus secciones.
  - `organizacion` y `contacto`: código, nombre o alias (como en contactos de SPEC-106).
  - `inicio` y `fin`: `dd/mm/aaaa hh:mm` en hora de Lima.
- Vista previa por fila: *Se crea*, *Se crea con avisos* (cruces o trabajo cercano, con el texto)
  o *Error* con su motivo. Las reglas de §3.2 son errores; los avisos de D-07 nunca lo son.
- Confirmación todo o nada, como el Directorio; cada reserva guarda su `import_batch_id`.
- Estándar del archivo en `docs/estandares/reservas.md`.

### 5.5 Casos límite

- Reserva que empieza a las 23:00 y termina a la 01:00: abarca dos días locales; ambos cuentan
  para D-06.
- Una reserva de «Jardín Palmeras (Gastronomía)» mide la cercanía desde las dos secciones; una
  intervención en «Lado oeste» es la misma ubicación, no una cercana (RESERVED_HERE).
- Un jardín que deja de ser prestable con reservas futuras: las reservas siguen y se muestran;
  no se pueden crear nuevas.
- Organización dada de baja en el Directorio: sus reservas siguen visibles con su nombre.
- Una ubicación de intervención sin sección, lugar, coordenadas ni ejemplares no participa del aviso.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Un coordinador registra una reserva de Jardín Rosales y aparece en la agenda en su día con estado Próxima | Crear para mañana 10-14 h |
| CA-02 | Dos reservas del mismo jardín que se solapan se guardan ambas, con aviso | Crear la segunda 11-13 h |
| CA-03 | Al registrar una intervención en un jardín a 6 m de uno reservado ese día, sale «A 6 m, … está reservado» | Fecha igual a la reserva |
| CA-04 | Al registrar una reserva, trabajo por hacer a 15 m no avisa y a 6 m sí | Dos intervenciones |
| CA-04b | Una poda que empezó dos días antes y aún no completa el jardín reservado da aviso crítico; si ese jardín se completó antes de la reserva, no avisa | Intervención de varios días |
| CA-04c | Reservar un jardín con trabajo en curso se permite, con el aviso crítico a la vista | Guardar igual |
| CA-05 | Cambiar el parámetro a 20 m hace que la de 15 m avise | Parámetros |
| CA-06 | Un supervisor ve la agenda pero recibe 403 al crear, editar o anular | Cuenta de capataz |
| CA-07 | Una reserva pasada sale Terminada y no se puede editar ni anular | Crear con fecha de ayer |
| CA-08 | Un CSV con una fila de jardín no prestable no guarda nada y señala esa fila | Registro masivo |
| CA-09 | La ficha de un lugar prestable no muestra reservas; la agenda filtrada por ese jardín, sí | Abrir el lugar y la agenda |

## 7. Especificación visual

- Agenda: encabezado de día en negrita; filas con el horario a la izquierda (`10:00–14:00`), el
  jardín y la organización en la línea principal, el contacto y el motivo debajo, el estado como
  `Badge` (Próxima info, En curso success, Terminada neutral, Anulada neutral tachado).
- Avisos: el bloque ámbar de SPEC-203 para `WARNING`; para `CRITICAL`, el mismo bloque en los
  colores de peligro (`alert-danger`), con «Atención» al inicio.
- Las pantallas usan `PageHeader` (SPEC-C01 §4.3).

## 8. Tests

```
Engine
- estado: antes de inicio UPCOMING, entre inicio y fin IN_PROGRESS, en el fin FINISHED, anulada CANCELLED
- cruce: [10,14) y [13,15) se cruzan; [10,14) y [14,16) no
- días locales de una reserva 23:00-01:00 son dos

Reglas
- sección no prestable → 422; contacto de otra organización → 422; fin <= inicio → 422; 8 días → 422
- editar o anular una Terminada → 422; versión vieja → 409

Cercanía (integración, PostGIS)
- jardín contiguo (0 m) y a 6 m avisan; a 15 m no; con el parámetro en 20, sí
- intervención programada el lunes con el jardín sin completar avisa a una reserva del miércoles; completado el lunes no; completado el jueves sí
- intervención programada después del último día de la reserva no avisa
- registrar una intervención el 10 avisa una reserva del 16 y no una del 18 (ventana de 7 días)
- mismo jardín → CRITICAL; cercano → WARNING
- una ubicación por lugar cuenta por la sección del lugar; una por coordenadas, por la distancia del punto
- intervención cancelada no avisa

Permisos
- SUPERVISOR/OPERARIO leen agenda, gardens y organizations; 403 en crear, editar, anular, check, nearby e importar

Registro masivo
- jardín por alias y organización por alias se resuelven; fecha ilegible → error de esa fila; todo o nada
```

## 9. Propio de este spec

- Acciones auditables (SPEC-004 §3.2): `GARDEN_RESERVATION_CREATED`, `GARDEN_RESERVATION_UPDATED`,
  `GARDEN_RESERVATION_CANCELLED`, con el código de la reserva y el del jardín; nunca el teléfono
  del contacto.
- Enmiendas a anotar en `REGISTRO.md`: SPEC-106 (el operario ve organización y contacto de una
  reserva, D-08), SPEC-102 §4 (la reserva sí guarda el contacto, ahora por el
  Directorio), Catálogo 1.12 (préstamos cubiertos; bloqueantes y recuperación siguen pendientes),
  SPEC-001 Anexo A (fila de reservas).
