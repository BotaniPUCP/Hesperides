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
| **Reserva** | Un uso único de un jardín prestable, pedido por una organización, **un solo día, de una hora a otra** (de 10:00 a 14:00). No se repite. |
| **Pedido de** | La organización que pide el jardín. Obligatoria y fija. |
| **Solicitante** | El contacto de «Pedido de» que hizo el pedido. Obligatorio y fijo: la reserva siempre recuerda quién la pidió. |
| **Para** | La organización que usará el jardín, solo cuando no es la misma que lo pide (la OIE lo pide para el CF Psicología). Opcional. |
| **Responsable** | El contacto a cargo de la reserva: a quien se llama si hay un problema en el jardín. Cualquier contacto del Directorio; al registrar es el solicitante, y puede cambiar. |
| **Contorno del jardín** | La unión de los polígonos de las secciones del lugar (las suyas o las de sus hijos). |
| **Cerca** | A **10 m o menos** del contorno del jardín reservado, medidos de borde a borde. «Contiguo» es el caso de 0 m. |
| **Estado** | Se calcula, no se guarda: **Próxima** (aún no empieza), **En curso**, **Terminada** (pasó su hora de fin) o **Anulada**. |
| **Confirmación de uso** | El solicitante avisó que usará el jardín. Lo anota coordinación por él (no tiene cuenta) y solo se acepta hasta el corte: el parámetro `RESERVATION_CONFIRMATION_MINUTES` (20 min) antes del fin. La anota quien quiera, se puede retirar dentro del plazo. |
| **Uso del espacio** | El encargado marca que el espacio **está siendo usado**, desde el inicio y hasta el mismo corte de la confirmación: dentro de los últimos minutos ya no se puede marcar ni desmarcar (D-12). La falta no se marca: una reserva terminada sin marca se lee «No usada». |
| **Uso derivado** | Lo que se muestra, calculado con el reloj y las dos marcas: Próxima → «Sin uso registrado» (o «Confirmada»); En curso → «En uso» o «No se está usando»; Terminada → «Usada» o «No usada»; Anulada → no muestra. |

### 2.2 Backend

- Paquete nuevo `pe.edu.pucp.hesperides.modules.reservations`.
- Entidad `GardenReservation` (`garden_reservations`), repositorio JPA y consultas JDBC para
  cercanía (PostGIS).
- Engine puro `engine/reservations/`: estado de una reserva, cruce de horarios, si una fecha
  cae dentro de una reserva y las reglas del seguimiento de uso (corte de confirmación y
  ventana de la marca). Sin Spring ni base de datos; el reloj se recibe.
- Carga masiva: un `ImportHandler` con `kind = reservations`, como `DirectoryImportHandler`.
- El aviso en el registro de intervención consulta este módulo; el módulo de intervenciones no
  depende de él (la página llama a los dos endpoints).

### 2.3 Frontend web

- `/reservas` — agenda (lista por día). `/reservas/nueva` — formulario. `/reservas/[codigo]` — ficha
  con mapa; `?editar=1` abre el cambio de responsable.
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

**D-01b · Una reserva es de un solo día, de una hora a otra.** Decisión del usuario (11 nov 2026):
se registra una fecha, una hora de inicio y una de fin posterior, y no cruza la medianoche. Una
actividad de dos días son dos reservas. Reemplaza el tope de 7 días de la primera
iteración. *Descartado:* reservas de varios días.

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

**D-02c · Editar es cambiar el responsable.** Decisión del usuario (12 nov 2026). Jardín, fecha,
horario, «Pedido de», solicitante, «Para» y motivo quedan fijos al registrar: otro jardín u otra
hora es otra reserva, que se registra después de anular esta. El backend rechaza la edición que
trae cualquiera de esos campos (422). *Descartado:* editar todos los datos (primera iteración).

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
1. su fecha programada es igual o anterior al **día** (en Lima) de la reserva, y
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
responsable y su teléfono (el solicitante y el motivo solo se ven en la ficha); no ven el registro
masivo ni los botones de edición
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

**D-12 · Seguimiento del uso: tres variables, dos guardadas y una calculada.** Decisión del
usuario (11 nov 2026). El estado temporal (Próxima/En curso/Terminada/Anulada) sigue calculándose
y no se guarda; junto a él, dos marcas con su propia ventana:
- **Confirmación de uso** (`use_confirmed`): el solicitante avisa que usará el jardín y
  coordinación lo anota por él (no tiene cuenta). Solo se acepta hasta el corte: el parámetro
  `RESERVATION_CONFIRMATION_MINUTES` (20 min) antes del fin. Se puede retirar dentro del plazo.
  Es informativa: la reserva no exige estar confirmada.
- **Uso del espacio** (`space_used`): el encargado marca que el espacio **está siendo usado**
  («casi el único caso»), desde el inicio y **hasta el mismo corte de la confirmación** — el
  usuario lo corrigió el 11 nov 2026: dentro de los últimos minutos ya no se puede comprobar un
  uso que se dice en curso, así que el botón desaparece y el backend responde 422. La falta no
  se marca: una reserva terminada sin marca se lee «No usada» — la falta queda registrada sola,
  y el «No se está usando» del horario es automático. La marca es del capataz (SUPERVISOR)
  además de coordinación; el operario solo lee, y los chips se ven en la agenda para los cuatro
  roles en todo momento.
Ambas se pueden deshacer dentro de su ventana y quedan congeladas al terminar o anular la
reserva. Cada cambio deja fila en su historial y en la auditoría. *Descartada:* la asistencia
única NOT_RECORDED/USED/NO_SHOW de la primera iteración (V042, aplicada y retirada).

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/reservations?from=&to=&placeId=&organizationCode=&includeCancelled=&page=` | Cuatro roles | Agenda paginada, por inicio ascendente |
| `GET /api/v1/reservations/{code}` | Cuatro roles | Una reserva |
| `POST /api/v1/reservations` | ADMIN, COORDINADOR | Crea |
| `PUT /api/v1/reservations/{code}` | ADMIN, COORDINADOR | Edita (no Terminada ni Anulada) |
| `POST /api/v1/reservations/{code}/cancel` | ADMIN, COORDINADOR | Anula con motivo |
| `PUT /api/v1/reservations/{code}/confirmation` | ADMIN, COORDINADOR | Confirma o retira la confirmación de uso (enmienda del 11 nov 2026; fuera del corte responde 422) |
| `PUT /api/v1/reservations/{code}/usage` | ADMIN, COORDINADOR, SUPERVISOR | Marca o retira «el espacio está en uso» (solo dentro del horario; si no, 422) |
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
 "purpose":"Feria de Psicología","state":"UPCOMING","cancelReason":null,
 "useConfirmed":false,"spaceUsed":false,"usageState":"NOT_RECORDED","canConfirm":true,"canRecordUsage":false,
 "version":1,
 "warnings":[]}
```

`state`: `UPCOMING`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`.
`requestedFor` es `null` cuando la pide y la usa la misma organización. `role` es `null` sin rol
(D-08b). `responsibleHistory` va de la más antigua a la vigente y solo viene en la ficha
(`GET /{code}`), no en la agenda. `warnings` solo viene lleno en la respuesta de crear y editar.
`usageState`: `NOT_RECORDED`, `IN_USE`, `NOT_IN_USE`, `USED`, `NOT_USED` — lo derivado, con el
reloj. `canConfirm` y `canRecordUsage` dicen si la ventana de cada marca está abierta ahora;
el frontend solo muestra el botón cuando corresponden. Los historiales
`confirmationHistory` y `usageHistory` (`{value, at, by}`) solo vienen en la ficha.

Confirmar y marcar uso (enmienda del 11 nov 2026):

```json
PUT /reservations/RES-0042/confirmation  {"confirmed":true,"version":1}
PUT /reservations/RES-0042/usage         {"used":true,"version":1}
```

Ambos devuelven la reserva completa; ignorar una marca que ya está puesta no versiona ni agrega
filas. Cada cambio deja fila en su historial y en la auditoría.

Crear:

```json
{"placeId":4,"requestedByCode":"ORG-0012","requesterCode":"CON-0007",
 "requestedForCode":"ORG-0031","responsibleCode":"CON-0007",
 "startsAt":"2026-11-13T10:00:00-05:00","endsAt":"2026-11-13T14:00:00-05:00",
 "purpose":"Feria de Psicología"}
```

Editar (D-02c): solo `{"responsibleCode":"CON-0019","version":1}`. Cualquier otro campo responde
422 «Only the responsible can change: cancel the reservation and register a new one». Si el
responsable cambia, se agrega una fila al historial (D-02b); si es el mismo, nada cambia.

La ficha (`GET /{code}`) trae además `place.sectionCodes`: las secciones del jardín, para que el
mapa lo enfoque. En la agenda y en las respuestas de escritura van vacías.

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
- Inicio y fin el mismo día en Lima (D-01b); si no, «Una reserva va de una hora a otra del mismo
  día».
- `purpose` opcional, hasta 300 caracteres.
- Editar o anular una Terminada o Anulada: «Esta reserva ya terminó o fue anulada».
- Confirmar una Terminada o Anulada: el mismo mensaje. Confirmar dentro de los últimos
  `RESERVATION_CONFIRMATION_MINUTES` (20 por defecto) antes del fin, o después: «El plazo de
  confirmación ya cerró: solo se confirma hasta 20 minutos antes del fin de la reserva».
- Marcar el uso de una Próxima o Terminada: «El espacio se marca en uso a partir de la hora de
  inicio» — el uso solo se registra dentro del horario (enmienda del 11 nov 2026).
- Marcar o desmarcar el uso dentro de los últimos `RESERVATION_CONFIRMATION_MINUTES` (20 por
  defecto) antes del fin, o después: «Ya no se puede marcar el uso: el corte es 20 minutos
  antes del fin de la reserva» — la misma tolerancia que la confirmación (D-12).
- `version` vieja: 409 «Otra persona cambió esta reserva. Recarga para ver su versión.»

## 4. Migración de base de datos

> **Enmienda del 11 nov 2026:** la primera iteración (commit `803c623`) ya creó
> **`V039__create_garden_reservations.sql`** con el modelo anterior (`organization_id`,
> `contact_id` opcional), el parámetro `RESERVATION_NEARBY_METERS`, el tope de 7 días como
> `CHECK` y el tipo de lote `reservations`. Una migración aplicada no se edita (checksum de
> Flyway): el modelo de D-02, D-02b y D-08b llegó en **V040** (rol del vínculo) y
> **V041** (solicitante, responsable e historial), implementados el 11 nov 2026.
> **Enmienda del seguimiento de uso (11 nov 2026):** una primera iteración de asistencia
> (**V042**, columna `attendance` NOT_RECORDED/USED/NO_SHOW) se aplicó y se retiró del repo
> cuando el diseño cambió a las dos marcas finas de abajo; su columna entra **V043**.
> Propietaria: SPEC-107, con la enmienda a SPEC-106.

```sql
-- D-02: quien pide y quien es responsable.
ALTER TABLE garden_reservations RENAME COLUMN organization_id TO requested_by_organization_id;
ALTER TABLE garden_reservations RENAME COLUMN contact_id TO requester_contact_id;
ALTER TABLE garden_reservations
    ADD COLUMN requested_for_organization_id BIGINT REFERENCES organizations(id),
    ADD COLUMN responsible_contact_id        BIGINT REFERENCES contacts(id);

-- Una reserva de la primera iteración sin contacto no tiene solicitante: solo pudo crearse
-- en bases de prueba. Se da de baja en vez de inventarle uno.
UPDATE garden_reservations SET deleted_at = CURRENT_TIMESTAMP
 WHERE requester_contact_id IS NULL AND deleted_at IS NULL;
UPDATE garden_reservations SET responsible_contact_id = requester_contact_id;

ALTER TABLE garden_reservations
    ADD CONSTRAINT chk_reservation_requester
        CHECK (deleted_at IS NOT NULL OR (requester_contact_id IS NOT NULL AND responsible_contact_id IS NOT NULL)),
    ADD CONSTRAINT chk_reservation_for_other
        CHECK (requested_for_organization_id IS DISTINCT FROM requested_by_organization_id);
CREATE INDEX idx_garden_reservations_requested_by ON garden_reservations (requested_by_organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_requested_for ON garden_reservations (requested_for_organization_id) WHERE deleted_at IS NULL;

-- D-02b: una fila por cada responsable que tuvo la reserva, incluido el primero.
-- responsible_contact_id de la reserva repite la última, para leer la agenda sin agrupar.
CREATE TABLE garden_reservation_responsibles (
    id                  BIGSERIAL   PRIMARY KEY,
    reservation_id      BIGINT      NOT NULL REFERENCES garden_reservations(id),
    contact_id          BIGINT      NOT NULL REFERENCES contacts(id),
    assigned_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservation_responsibles ON garden_reservation_responsibles (reservation_id, assigned_at);
INSERT INTO garden_reservation_responsibles (reservation_id, contact_id, assigned_by_user_id, assigned_at)
SELECT id, responsible_contact_id, created_by_user_id, created_at
  FROM garden_reservations WHERE responsible_contact_id IS NOT NULL;

-- D-08b ya entró: el rol del vínculo lo agrega V040 (SPEC-106 §4.3).
```

Seguimiento del uso, **V042** (aplicada y retirada) y **V043**:

```sql
-- V042 (aplicada el 11 nov 2026, retirada del repo al cambiar el diseño):
-- una sola asistencia NOT_RECORDED/USED/NO_SHOW, reemplazada por dos marcas.
ALTER TABLE garden_reservations
    ADD COLUMN attendance VARCHAR(20) NOT NULL DEFAULT 'NOT_RECORDED',
    ADD CONSTRAINT chk_reservation_attendance
        CHECK (attendance IN ('NOT_RECORDED', 'USED', 'NO_SHOW'));

-- V043: la retirada de la V042 y las dos marcas del seguimiento de uso.
ALTER TABLE garden_reservations DROP CONSTRAINT IF EXISTS chk_reservation_attendance;
ALTER TABLE garden_reservations DROP COLUMN IF EXISTS attendance;
ALTER TABLE garden_reservations
    ADD COLUMN use_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN space_used    BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE garden_reservation_confirmations (
    id                 BIGSERIAL   PRIMARY KEY,
    reservation_id     BIGINT      NOT NULL REFERENCES garden_reservations(id),
    confirmed          BOOLEAN     NOT NULL,
    changed_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE garden_reservation_usages (
    id                 BIGSERIAL   PRIMARY KEY,
    reservation_id     BIGINT      NOT NULL REFERENCES garden_reservations(id),
    used               BOOLEAN     NOT NULL,
    changed_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- El corte de confirmación es configurable, como las demás reglas en minutos.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('RESERVATION_CONFIRMATION_MINUTES', 'Corte de confirmación de uso (min)', '20', 'INTEGER',
        'Minutos antes del fin de una reserva en los que ya no se acepta la confirmación de uso', TRUE);
```

**V044** — el usuario corrigió el corte (11 nov 2026): la tolerancia aplica a las dos marcas,
no solo a la confirmación, así que la etiqueta del parámetro se generaliza:

```sql
UPDATE system_parameters
   SET label = 'Corte de confirmación y de marca de uso (min)',
       description = 'Minutos antes del fin de una reserva en los que ya no se acepta '
                     || 'confirmar el uso ni marcar que el espacio está en uso',
       updated_at = CURRENT_TIMESTAMP
 WHERE code = 'RESERVATION_CONFIRMATION_MINUTES' AND deleted_at IS NULL;
```

El `CHECK` en vez de `NOT NULL` deja vivas las filas dadas de baja sin contacto; para toda
reserva vigente el efecto es el mismo. Al escribir V041 (11 nov 2026) la base de desarrollo
tenía 0 reservas, así que las dos correcciones de datos no encontraron filas.

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
2. En `/reservas/[codigo]` (la ficha) los datos van a la izquierda y el **mapa 3D** a la derecha,
   encuadrando el jardín con sus secciones iluminadas; en pantallas angostas, el mapa va debajo.
   «Editar» abre un formulario donde todo se lee como texto y solo el **responsable** es un campo
   (D-02c); al guardar o cancelar se vuelve a la ficha.
   Debajo del responsable, «Responsables anteriores» lista el historial (D-02b) con fecha y quién
   hizo el cambio; no aparece si nunca cambió.
   Debajo del motivo, dos bloques de seguimiento (enmienda del 11 nov 2026):
   - **Confirmación del solicitante**: badge «El solicitante confirmó el uso» o «Sin
     confirmación del solicitante», con el botón para registrarla o retirarla — solo ADMIN y
     COORDINADOR, y solo antes del corte; pasado el corte se muestra deshabilitado con «El plazo
     de confirmación ya cerró: solo se confirma antes del corte.» Debajo, las veces que cambió
     con fecha y quién (solo vienen en la ficha).
   - **Uso del espacio**: badge con el uso derivado («En uso», «No se está usando», «Usada»,
     «No usada», «Sin uso registrado»), con el botón «Marcar en uso» / «Quitar marca de uso» —
     ADMIN, COORDINADOR y SUPERVISOR, y solo durante el horario; fuera de él se muestra
     deshabilitado con «El espacio solo se marca en uso durante el horario de la reserva.»
     También lista sus cambios con fecha y quién.
3. Al completar jardín y horario, el formulario pide `check` y muestra los avisos debajo del
   horario. Puede guardar igual.
4. Guardar → la confirmación es **la ficha misma**: se abre `/reservas/[codigo]?creada=1`, con el
   banner «Reserva RES-#### registrada para …», el botón «Nueva reserva» y los avisos del horario
   (enmienda del 11 nov 2026, decisión del usuario: la ficha los consulta con `check` sobre sus
   propios datos, que salen iguales a los `warnings` de la respuesta).

### 5.2 Agenda

- Por defecto: desde hoy, 30 días hacia adelante, sin anuladas. Filtros: rango de fechas, jardín,
  organización, «Incluir anuladas». Los filtros viven en la URL (como Frecuencias).
- Agrupada por día local («Hoy», «Mañana», «jue 13 nov»).
- **Toda la tarjeta lleva a la ficha** (decisión del usuario, 12 nov 2026); «Editar», «Anular» y
  «Marcar en uso» siguen siendo botones propios.
- Cada fila: horario, jardín, «Pedido de» (y «para <organización>» si la hay), «Responsable:» con
  su nombre, su rol y su teléfono, estado y, solo si está anulada, el motivo de anulación. La agenda **no**
  muestra al solicitante ni el motivo del pedido: eso queda en la ficha (decisión del usuario,
  11 nov 2026).
- En cada fila no anulada, los chips del seguimiento (enmienda del 11 nov 2026), visibles para
  los cuatro roles: «Confirmada» cuando el solicitante confirmó, y el uso derivado («En uso»,
  «No se está usando», «Usada», «No usada», «Sin uso registrado»). ADMIN, COORDINADOR y
  SUPERVISOR ven además el botón rápido «Marcar en uso» / «Quitar marca de uso» en filas
  dentro de su ventana (desde el inicio y hasta el corte, D-12), que avisa en un banner cuando
  la marca cambia.
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
  `jardin;pedido_de;solicitante;para;responsable;fecha;inicio;fin;motivo`.
  - `jardin`: nombre del lugar, uno de sus alias o el código de una de sus secciones.
  - `pedido_de` y `para`: código, nombre o alias de una organización; `para` puede ir vacío.
  - `solicitante` y `responsable`: código o nombre de un contacto (como en contactos de SPEC-106);
    el solicitante se busca entre los de `pedido_de`, el responsable en todo el Directorio.
    `responsable` vacío es el solicitante.
  - Una organización o un contacto que no está en el Directorio es **error de esa fila**: el
    registro masivo no crea nada en el Directorio *(decisión de diseño: el Directorio se carga
    con su propio registro masivo; la ventana de alta es solo del formulario)*. Un nombre de
    contacto que coincide con dos personas también es error: se usa su código.
  - `fecha`: `dd/mm/aaaa`; `inicio` y `fin`: `hh:mm` en hora de Lima, el fin posterior al inicio
    (una sola fecha por fila: no puede cruzar la medianoche, D-01b).
- Vista previa por fila: *Se crea*, *Se crea con avisos* (cruces o trabajo cercano, con el texto)
  o *Error* con su motivo. Las reglas de §3.2 son errores; los avisos de D-07 nunca lo son.
- Confirmación todo o nada, como el Directorio; cada reserva guarda su `import_batch_id`.
- Estándar del archivo en `docs/estandares/reservas.md`.

### 5.5 Casos límite

- Reserva de 23:00 a 01:00: se rechaza (D-01b); se registran dos, de 23:00 a 23:59 y de 00:00 a
  01:00.
- Una reserva de «Jardín Palmeras (Gastronomía)» mide la cercanía desde las dos secciones; una
  intervención en «Lado oeste» es la misma ubicación, no una cercana (RESERVED_HERE).
- Un jardín que deja de ser prestable con reservas futuras: las reservas siguen y se muestran;
  no se pueden crear nuevas.
- Organización o contacto dado de baja en el Directorio: sus reservas siguen visibles con su
  nombre. Al editar, un responsable dado de baja se puede conservar; uno nuevo debe estar vigente.
- El solicitante se desvincula después de «Pedido de»: la reserva lo conserva (D-02).
- Cambiar el responsable y volver al anterior deja dos filas nuevas en el historial.
- Una ubicación de intervención sin sección, lugar, coordenadas ni ejemplares no participa del aviso.
- Confirmar cuando ya está confirmada (o marcar el uso ya marcado): responde 200 sin versionar
  ni agregar fila (enmienda del 11 nov 2026).
- Desmarcar el uso tras el corte: rechazado con el mismo 422 que marcar — la ventana de la
  marca cierra en el corte, no en el fin (D-12).
- Una reserva más corta que la tolerancia (corte antes del inicio): no se puede marcar el uso,
  igual que no se puede confirmar.
- El parámetro de corte mal escrito o borrado cae al 20 por defecto; en pantalla el rango es
  0–1440 minutos.

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
| CA-12 | Editar solo deja cambiar el responsable; jardín, horario, «Pedido de», «Para» y motivo se leen como texto, y la API los rechaza | Ficha de la reserva |
| CA-14 | Desde la agenda, un clic en la tarjeta abre la ficha, con el mapa 3D encuadrando el jardín | Agenda → ficha |
| CA-13 | Filtrar la agenda por CF Psicología trae la reserva pedida por la OIE para ella | Agenda |
| CA-14 | Un coordinador confirma el uso de una reserva Próxima: ficha y agenda muestran «Confirmada» y queda en el historial con fecha y quién | `PUT /{code}/confirmation` |
| CA-15 | Dentro del horario, el capataz marca «en uso» desde la agenda y la fila pasa a «En uso»; si no marca, la fila muestra «No se está usando» y al terminar queda «No usada» | Agenda de hoy |
| CA-16 | Confirmar dentro de los últimos 20 minutos (o después) responde 422 con «El plazo de confirmación ya cerró…»; el corte lo fija el parámetro | Parámetros + ficha |
| CA-17 | El operario ve los chips de confirmación y de uso en la agenda, pero el botón «Marcar en uso» le responde 403 | Cuenta de operario |
| CA-18 | A menos de 20 minutos del fin el botón «Marcar en uso» desaparece de la fila y de la ficha, y el endpoint responde 422 con «Ya no se puede marcar el uso…»; la fila sigue mostrando «No se está usando» | Agenda de hoy, reserva que termina en 10 min |

## 7. Especificación visual

- Agenda: encabezado de día en negrita; filas con el horario a la izquierda (`10:00–14:00`), el
  jardín y «Pedido de … para …» en la línea principal, «Responsable: <nombre> · <teléfono>» debajo
  (sin solicitante ni motivo), el estado como
  `Badge` (Próxima info, En curso success, Terminada neutral, Anulada neutral tachado), y los
  chips del seguimiento: «Confirmada» info y el uso derivado (En uso success, No se está usando
  warning, Usada success, No usada y Sin uso registrado neutral). En la ficha, los bloques de
  confirmación y de uso van debajo del motivo, con su botón y el historial en gris.
- Avisos: el bloque ámbar de SPEC-203 para `WARNING`; para `CRITICAL`, el mismo bloque en los
  colores de peligro (`alert-danger`), con «Atención» al inicio.
- Las pantallas usan `PageHeader` (SPEC-C01 §4.3).

## 8. Tests

```
Engine
- estado: antes de inicio UPCOMING, entre inicio y fin IN_PROGRESS, en el fin FINISHED, anulada CANCELLED
- cruce: [10,14) y [13,15) se cruzan; [10,14) y [14,16) no
- 10:00-14:00 es un día; 23:00-01:00 no; 18:00-00:00 sí, y su día es el de inicio
- seguimiento de uso: el corte es fin − 20 min y cierra en el corte mismo; anular o terminar
  cierra la confirmación; la marca de uso comparte el corte (D-12): vale desde el inicio y hasta
  el corte; una reserva más corta que la tolerancia no tiene ventana;
  el uso derivado: Próxima → sin registrar, En curso → en uso o no se está usando,
  Terminada → usada o no usada, Anulada → sin registrar

Reglas
- sección no prestable → 422; solicitante de otra organización → 422; sin responsable → 422; fin <= inicio → 422; de un día al siguiente → 422
- responsable de una organización distinta a pedido de y para → se guarda
- requestedByCode o requesterCode al editar → 422; para igual a pedido de → se guarda vacío
- crear deja una fila en el historial; cambiar el responsable agrega otra; editar sin cambiarlo no
- editar o anular una Terminada → 422; versión vieja → 409
- confirmar deja una fila en su historial; desconfirmar agrega otra; confirmar con la misma marca no versiona; versión vieja → 409
- confirmar dentro de los últimos 20 minutos → 422 con el corte en el mensaje; terminada o anulada → 422
- capataz marca el uso en curso → 200 con usageState IN_USE; próximo o terminado → 422; desmarcar agrega fila
- marcar el uso tras el corte (fin − 20 min) → 422 con los minutos en el mensaje; antes del corte → 200
- SUPERVISOR no confirma (403); OPERARIO no marca uso (403); el parámetro nuevo sale en la lista de parámetros y su rango 0–1440 se valida

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
  `GARDEN_RESERVATION_CANCELLED`, y de la enmienda del seguimiento de uso
  `GARDEN_RESERVATION_CONFIRMATION_CHANGED` y `GARDEN_RESERVATION_USAGE_CHANGED`.
  `GARDEN_RESERVATION_CANCELLED`, `GARDEN_RESERVATION_RESPONSIBLE_CHANGED`, con el código de la reserva y el del jardín; nunca el teléfono
  del contacto.
- Enmiendas a anotar en `REGISTRO.md`: SPEC-106 (el operario ve organizaciones y contactos de una
  reserva, D-08; rol del contacto en cada organización y columna `roles` de `contactos.csv`, D-08b;
  «Pedido de» y «Para» de §9.4 resueltos para reservas, D-02), SPEC-102 §4 (la reserva guarda
  solicitante y responsable, ahora por el Directorio), Catálogo 1.12 (préstamos cubiertos; bloqueantes y recuperación siguen pendientes),
  SPEC-001 Anexo A (fila de reservas).
