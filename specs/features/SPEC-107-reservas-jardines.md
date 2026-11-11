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
| **Reserva** | Un uso único de un jardín prestable, pedido por una organización, entre una fecha y hora de inicio y otra de fin. No se repite. |
| **Pedido de** | La organización que pide el jardín. Obligatoria y fija. |
| **Solicitante** | El contacto de «Pedido de» que hizo el pedido. Obligatorio y fijo: la reserva siempre recuerda quién la pidió. |
| **Para** | La organización que usará el jardín, solo cuando no es la misma que lo pide (la OIE lo pide para el CF Psicología). Opcional. |
| **Responsable** | El contacto a cargo de la reserva: a quien se llama si hay un problema en el jardín. Cualquier contacto del Directorio; al registrar es el solicitante, y puede cambiar. |
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
  «Registro masivo» (ADMIN, COORDINADOR). Reutiliza `OrganizationPicker` y `ContactPicker` del
  Directorio, con su alta en el mismo formulario (SPEC-106 §5.2).

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

**D-02 · Pedido de, solicitante, para y responsable, todos del Directorio.** Decisión del usuario
(11 nov 2026), que concreta el «Pedido de» y «Para» de SPEC-106 §9.4:
- **Pedido de** y **solicitante** son obligatorios, y el solicitante debe estar vinculado a
  «Pedido de». Los dos son **fijos**: si se registró mal, la reserva se anula y se registra de
  nuevo. Así la reserva nunca pierde quién la pidió.
- **Para** es opcional; si es la misma organización que «Pedido de», se guarda vacío.
- **Responsable** es obligatorio y puede ser **cualquier** contacto vigente del Directorio, de la
  organización que sea. El formulario lo propone igual al solicitante. Si después el solicitante
  pide que el responsable sea alguien de la organización «Para», se cambia al editar; el
  solicitante no cambia.
- Una organización que pide por primera vez se registra **desde el mismo formulario**, con la
  ventana de alta de los selectores (SPEC-106 §5.2), y lo mismo el contacto, sea solicitante o
  responsable. Esa ventana crea en el Directorio: nada de la reserva es texto libre, y el nombre y
  el teléfono salen de la ficha del contacto.
*Descartado:* contacto opcional (versión anterior de este spec) y texto libre, que duplica el
Directorio.

**D-02b · Historial de responsables.** Decisión del usuario. Cada cambio de responsable guarda
quién lo cambió, cuándo, el anterior y el nuevo, sin motivo, en `garden_reservation_responsibles`,
y la ficha de la reserva muestra la lista. El responsable vigente es la última fila.

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

**D-08 · ADMIN y COORDINADOR registran; todos ven, el operario también los contactos.** Decisión
del usuario (11 nov 2026). SUPERVISOR y OPERARIO leen la agenda con las organizaciones, el
solicitante, el responsable y sus teléfonos; no ven el registro masivo ni los botones de edición
(y el backend responde 403). **Enmienda a SPEC-106:** el Directorio sigue cerrado al operario,
pero lo que una reserva muestra de sus organizaciones y contactos sí lo ve. Por eso el filtro de la
agenda no usa `OrganizationPicker` (que llama al Directorio y daría 403): usa
`GET /api/v1/reservations/organizations`, las organizaciones que aparecen como «Pedido de» o
«Para» en alguna reserva. Filtrar por una organización trae las reservas donde es cualquiera de
las dos.

**D-08b · El rol del contacto en su organización.** Decisión del usuario (11 nov 2026, enmienda a
SPEC-106): el vínculo contacto–organización gana un **rol** opcional en texto libre («Delegado»,
«Secretaria académica»). Hay un vínculo por par contacto–organización, con un solo rol; para
cambiarlo se edita. La reserva muestra el rol del solicitante en «Pedido de» y el del responsable
en «Para» si está vinculado a ella, si no en «Pedido de», si no ninguno. Ver SPEC-106, enmienda
del 11 nov 2026.

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
 "requestedBy":{"code":"ORG-0012","name":"OIE"},
 "requester":{"code":"CON-0007","fullName":"Juan Diego Villasante","role":"Delegado","mobile":"987654321","extension":null},
 "requestedFor":{"code":"ORG-0031","name":"CF Psicología"},
 "responsible":{"code":"CON-0019","fullName":"María Quispe","role":"Presidenta","mobile":"912345678","extension":null},
 "responsibleHistory":[
   {"contact":{"code":"CON-0007","fullName":"Juan Diego Villasante"},"assignedAt":"2026-11-10T09:12:00-05:00","assignedBy":"coordinacion@pucp.edu.pe"},
   {"contact":{"code":"CON-0019","fullName":"María Quispe"},"assignedAt":"2026-11-11T16:40:00-05:00","assignedBy":"coordinacion@pucp.edu.pe"}],
 "startsAt":"2026-11-13T10:00:00-05:00","endsAt":"2026-11-13T14:00:00-05:00",
 "purpose":"Feria de Psicología","state":"UPCOMING","cancelReason":null,"version":1,
 "warnings":[]}
```

`state`: `UPCOMING`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`.
`requestedFor` es `null` cuando la pide y la usa la misma organización. `role` es `null` sin rol
(D-08b). `responsibleHistory` va de la más antigua a la vigente y solo viene en la ficha
(`GET /{code}`), no en la agenda. `warnings` solo viene lleno en la respuesta de crear y editar.

Crear:

```json
{"placeId":4,"requestedByCode":"ORG-0012","requesterCode":"CON-0007",
 "requestedForCode":"ORG-0031","responsibleCode":"CON-0007",
 "startsAt":"2026-11-13T10:00:00-05:00","endsAt":"2026-11-13T14:00:00-05:00",
 "purpose":"Feria de Psicología"}
```

Editar: los mismos campos **sin** `requestedByCode` ni `requesterCode` (fijos, D-02), y con
`version`. Si `responsibleCode` cambia, se agrega una fila al historial (D-02b).

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
- `requestedByCode` de una organización vigente; si no, «Esa organización no está en el Directorio».
- `requesterCode` de un contacto vigente vinculado a `requestedByCode`; si no, «El solicitante debe
  pertenecer a la organización que pide».
- `requestedForCode` opcional, de una organización vigente; igual a `requestedByCode` se guarda vacío.
- `responsibleCode` de un contacto vigente, de cualquier organización; si falta, «Indica un responsable».
- Un `requestedByCode` o `requesterCode` en la edición: «Quién pidió la reserva no cambia: anúlala
  y regístrala de nuevo».
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
    requested_by_organization_id  BIGINT NOT NULL REFERENCES organizations(id),
    requester_contact_id          BIGINT NOT NULL REFERENCES contacts(id),
    requested_for_organization_id BIGINT REFERENCES organizations(id),
    responsible_contact_id        BIGINT NOT NULL REFERENCES contacts(id),
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
    CONSTRAINT chk_reservation_cancel CHECK ((cancelled_at IS NULL) = (cancel_reason IS NULL)),
    CONSTRAINT chk_reservation_for_other CHECK (requested_for_organization_id IS DISTINCT FROM requested_by_organization_id)
);
CREATE INDEX idx_garden_reservations_place_time ON garden_reservations (place_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_time ON garden_reservations (starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_requested_by ON garden_reservations (requested_by_organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_requested_for ON garden_reservations (requested_for_organization_id) WHERE deleted_at IS NULL;

-- D-02b: una fila por cada responsable que tuvo la reserva, incluido el primero.
-- responsible_contact_id de la reserva repite la última, para leer la agenda sin agrupar.
CREATE TABLE garden_reservation_responsibles (
    id                  BIGSERIAL PRIMARY KEY,
    reservation_id      BIGINT    NOT NULL REFERENCES garden_reservations(id),
    contact_id          BIGINT    NOT NULL REFERENCES contacts(id),
    assigned_by_user_id BIGINT    NOT NULL REFERENCES users(id),
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservation_responsibles ON garden_reservation_responsibles (reservation_id, assigned_at);

-- D-08b, enmienda a SPEC-106: el rol del contacto en cada organización.
ALTER TABLE contact_organizations ADD COLUMN role VARCHAR(100);

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

1. `/reservas/nueva`: jardín (selector de jardines prestables, por nombre o alias), fecha y hora
   de inicio y de fin, motivo, y en este orden (D-02):
   - **Pedido de** (`OrganizationPicker`) y **Solicitante** (`ContactPicker` filtrado por ella);
   - **Para** (`OrganizationPicker`, opcional, con la ayuda «Solo si la usará otra organización»);
   - **Responsable** (`ContactPicker` sin filtro de organización). Se llena con el solicitante al
     elegirlo y sigue al solicitante mientras el usuario no lo cambie a mano.
   Si la organización o el contacto no existen, la ventana de alta de cada selector los registra
   sin salir de la reserva, con el rol opcional del contacto en esa organización (SPEC-106 §5.2).
2. En `/reservas/[codigo]`, «Pedido de» y «Solicitante» se muestran como texto, no como campos.
   Debajo del responsable, «Responsables anteriores» lista el historial (D-02b) con fecha y quién
   hizo el cambio; no aparece si nunca cambió.
3. Al completar jardín y horario, el formulario pide `check` y muestra los avisos debajo del
   horario. Puede guardar igual.
4. Guardar → la respuesta trae `warnings`; si hay, se muestran una vez más junto a la
   confirmación y se vuelve a la agenda.

### 5.2 Agenda

- Por defecto: desde hoy, 30 días hacia adelante, sin anuladas. Filtros: rango de fechas, jardín,
  organización, «Incluir anuladas». Los filtros viven en la URL (como Frecuencias).
- Agrupada por día local («Hoy», «Mañana», «jue 13 nov»). Una reserva de varios días aparece en
  el día en que empieza, con su rango completo.
- Cada fila: horario, jardín, «Pedido de» (y «para <organización>» si la hay), el responsable con
  su rol y su teléfono, estado y motivo. El solicitante solo se muestra si no es el responsable.
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
  `jardin;pedido_de;solicitante;para;responsable;inicio;fin;motivo`.
  - `jardin`: nombre del lugar, uno de sus alias o el código de una de sus secciones.
  - `pedido_de` y `para`: código, nombre o alias de una organización; `para` puede ir vacío.
  - `solicitante` y `responsable`: código o nombre de un contacto (como en contactos de SPEC-106);
    el solicitante se busca entre los de `pedido_de`, el responsable en todo el Directorio.
    `responsable` vacío es el solicitante.
  - Una organización o un contacto que no está en el Directorio es **error de esa fila**: el
    registro masivo no crea nada en el Directorio *(decisión de diseño: el Directorio se carga
    con su propio registro masivo; la ventana de alta es solo del formulario)*. Un nombre de
    contacto que coincide con dos personas también es error: se usa su código.
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
- Organización o contacto dado de baja en el Directorio: sus reservas siguen visibles con su
  nombre. Al editar, un responsable dado de baja se puede conservar; uno nuevo debe estar vigente.
- El solicitante se desvincula después de «Pedido de»: la reserva lo conserva (D-02).
- Cambiar el responsable y volver al anterior deja dos filas nuevas en el historial.
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
| CA-10 | Pedido de OIE (Juan Diego) para CF Psicología: el responsable propuesto es Juan Diego; se cambia a María, de CF Psicología; la ficha muestra a María, a Juan Diego como solicitante y el historial con los dos | Editar la reserva |
| CA-11 | Una organización y un contacto nuevos se registran desde la reserva sin salir del formulario, y quedan en el Directorio con su rol | Ventana de alta |
| CA-12 | Editar no deja cambiar «Pedido de» ni el solicitante | Ficha de la reserva |
| CA-13 | Filtrar la agenda por CF Psicología trae la reserva pedida por la OIE para ella | Agenda |

## 7. Especificación visual

- Agenda: encabezado de día en negrita; filas con el horario a la izquierda (`10:00–14:00`), el
  jardín y «Pedido de … para …» en la línea principal, el responsable y el motivo debajo, el estado como
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
- sección no prestable → 422; solicitante de otra organización → 422; sin responsable → 422; fin <= inicio → 422; 8 días → 422
- responsable de una organización distinta a pedido de y para → se guarda
- requestedByCode o requesterCode al editar → 422; para igual a pedido de → se guarda vacío
- crear deja una fila en el historial; cambiar el responsable agrega otra; editar sin cambiarlo no
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
- responsable vacío → el solicitante; organización o contacto desconocido → error de esa fila; nombre de contacto ambiguo → error
```

## 9. Propio de este spec

- Acciones auditables (SPEC-004 §3.2): `GARDEN_RESERVATION_CREATED`, `GARDEN_RESERVATION_UPDATED`,
  `GARDEN_RESERVATION_CANCELLED`, `GARDEN_RESERVATION_RESPONSIBLE_CHANGED`, con el código de la reserva y el del jardín; nunca el teléfono
  del contacto.
- Enmiendas a anotar en `REGISTRO.md`: SPEC-106 (el operario ve organizaciones y contactos de una
  reserva, D-08; rol del contacto en cada organización y columna `roles` de `contactos.csv`, D-08b;
  «Pedido de» y «Para» de §9.4 resueltos para reservas, D-02), SPEC-102 §4 (la reserva guarda
  solicitante y responsable, ahora por el Directorio), Catálogo 1.12 (préstamos cubiertos; bloqueantes y recuperación siguen pendientes),
  SPEC-001 Anexo A (fila de reservas).
