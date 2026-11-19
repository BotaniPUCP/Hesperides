# SPEC-114 — Calendario del campus: eventos bloqueantes y feriados

| Campo | Valor |
|-------|-------|
| HU relacionada | REQ 1.12 Eventos del campus (su parte de bloqueantes; los préstamos son SPEC-107) · REQ 1.8 (la lista de feriados) · REQ 5.11 (la consume) · A-09 |
| Autor | Jean Piero David Morán |
| Plataforma | Web |
| Sprint | — |
| Dependencias | SPEC-107 (reservas: mismo patrón de aviso), SPEC-200 (registro de intervención), SPEC-113 (globos del mapa), SPEC-201 (días hábiles) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-107 §2.5 D-07 y §3 (avisos `check`/`nearby` que no bloquean) ·
> SPEC-113 §5.1 (globo «Evento bloqueante») · SPEC-201 (días hábiles por `INCIDENT_HOLIDAYS`).

> Mientras la feature no esté implementada, este spec es la fuente de verdad y el detalle se
> escribe literal. Al cerrarla, el detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Registrar en un solo calendario las fechas en que el campus condiciona el trabajo de campo —los
eventos bloqueantes (examen de admisión, fin de ciclo, jueves cultural) y los feriados— para que
quien programa trabajo o reserva un jardín reciba un **aviso que no bloquea**, y el mapa los muestre.

## 2. Contexto

*«Es una ciudad universitaria con actividades constantes»*: el corte de césped se hace en 4 días
seguidos buscando fines de semana sin eventos (`docs/dominio/negocio.md`). Hoy nadie en Hesperides
sabe cuándo hay un examen de admisión, y los feriados viven en una variable de entorno de incidencias.
**No hay archivo del cliente**: los eventos se registran a mano.

**Fuera, a propósito:** los préstamos de jardines (ya son reservas, SPEC-107); la recuperación del
jardín después de un préstamo (decisión del usuario, 9-11 nov 2026); la regla de maquinaria de
corte (5.11), que **consumirá** la lista de feriados y los eventos de este spec en su propio spec.

### 2.1 Vocabulario

| Término | Qué es |
|---|---|
| **Evento** | Un periodo con nombre que afecta al trabajo de campo. Tipo **Bloqueante** o **Feriado** (catálogo `CAMPUS_EVENT_TYPE`). |
| **Ámbito** | Dónde aplica: **todo el campus**, un **sector** o una **sección**. Un feriado es siempre de todo el campus. |
| **Fechas** | Un día de inicio y uno de fin, ambos incluidos. Con **horario opcional** (de 14:00 a 18:00), el mismo cada día; sin horario, el día entero. |
| **Repetición** | Opcional: los **días de la semana** en que ocurre dentro de las fechas («los jueves del 16 mar al 4 jul»). Sin repetición, ocurre todos los días de las fechas. |
| **Ocurrencia** | Un día concreto en que el evento ocurre. Se calcula, no se guarda. |
| **Toca** | Un evento toca un jardín si su ámbito es todo el campus, el sector del jardín o la sección del jardín (una subsección cuenta por su sección). |

### 2.2 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.campusevents`
- Entidad: `CampusEvent` (tabla `campus_events`), extiende `BaseEntity`.
- Engine puro `engine/campusevents/`: `EventOccurrences` (expande fechas, repetición y horario en
  ocurrencias de un rango) y `EventReach` (si un evento toca un jardín dado su sector).
- Servicio: `CampusEventsService` / `CampusEventsServiceImpl`.
- Controller: `CampusEventsController` → `/api/v1/campus-events`.
- Fuente de globos: `CampusEventBalloonSource` (SPEC-113 D-01), en `modules/campusevents/balloons/`.
- Feriados para otros módulos: `CampusHolidays` (interfaz en `campusevents`), que lee los feriados
  registrados. La consumen el calendario de días hábiles de incidencias y, después, la regla 5.11.

### 2.3 Frontend web

- Rutas: `/calendario` (agenda del mes, los cuatro roles), `/calendario/nuevo` y
  `/calendario/[id]` (registrar, editar, dar de baja: ADMIN y COORDINADOR).
- Menú: grupo «Reservas», ítem **«Calendario del campus»** (el comentario del grupo ya lo preveía).
- Componentes: `components/campusEvents/` — `CampusEventsAgenda`, `CampusEventForm`,
  `ScopePicker` (campus / sector / sección, reutiliza las secciones por sector de
  `GET /green-area-sets/section-options`), `CampusEventWarnings`.
- Avisos en: el registro de intervención (`InterventionForm`) y el registro de reserva, junto a
  los que ya muestran.
- Mapa: franja de avisos de todo el campus (§5.5) y globo morado (SPEC-113).

### 2.4 Móvil

Fuera de alcance: la agenda es de coordinación; el capataz la lee en la web.

### 2.5 Restricciones técnicas

- Catálogo nuevo `CAMPUS_EVENT_TYPE`: `BLOCKING` «Bloqueante», `HOLIDAY` «Feriado» (INV-2).
- El ámbito (`CAMPUS`, `SECTOR`, `SECTION`) es una columna con `CHECK`, no un catálogo: cada valor
  exige una regla distinta sobre `zone_id`, igual que `scope` en `maintenance_frequencies`.
- Sin servicios externos de calendario ni de feriados (REGLAS §0.1).
- La zona horaria es `hesperides.maintenance.time-zone`, la misma de planificación y globos.

### 2.6 Decisiones propias de este spec

| # | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-01 | Se guarda la **regla** (fechas, días de la semana, horario) y el motor la expande al consultar | Editar o dar de baja «todos los jueves del semestre» es un solo cambio | Una fila por ocurrencia: 16 filas por semestre que cambiar a la vez |
| D-02 | Los **feriados van en este calendario** como tipo `HOLIDAY`, siempre de todo el campus | Decisión del usuario (15 nov 2026): 5.11 e incidencias los leen de un solo lugar | Seguir con `INCIDENT_HOLIDAYS` |
| D-03 | **Días con horario opcional** | Decisión del usuario (15 nov 2026): el jueves cultural es por la tarde; el examen de admisión, todo el día | Solo días |
| D-04 | Solo **ADMIN y COORDINADOR** registran, editan y dan de baja; los cuatro roles leen | Decisión del usuario (15 nov 2026), igual que las reservas | Que el capataz registre |
| D-05 | Un evento **solo avisa, nunca impide** (ni al programar trabajo ni al reservar) | Decisión del usuario (7 nov 2026) y REQ 1.12 | Bloquear el registro |
| D-06 | En el mapa, un evento de **todo el campus** (incluido un feriado) es una **franja** arriba; uno de **sector o sección**, el globo morado | Decisión del usuario (15 nov 2026): un globo en el medio del campus no dice dónde | Un globo en el centro del campus |
| D-07 | `INCIDENT_HOLIDAYS` se conserva y se **une** a los feriados registrados | Las bases que ya la configuraron no pierden días al desplegar; la variable deja de documentarse para lo nuevo | Borrarla en esta entrega |
| D-08 | Dar de baja es baja lógica (INV-4) y no pide motivo | Un evento mal cargado se corrige o se borra; no hay un tercero a quien explicarle, a diferencia de una reserva | Anular con motivo |
| D-09 | Un evento dura como máximo `CAMPUS_EVENT_MAX_DAYS = 366` días | Una fecha de fin mal tecleada (2207) no debe avisar durante dos siglos | Sin tope |

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/campus-events?from=&to=&type=` | Cuatro roles | Las **ocurrencias** del rango (máx. 62 días), por día y hora |
| `GET /api/v1/campus-events/{id}` | Cuatro roles | El evento con su regla |
| `POST /api/v1/campus-events` | ADMIN, COORDINADOR | Registrar |
| `PUT /api/v1/campus-events/{id}` | ADMIN, COORDINADOR | Editar, con `version` |
| `DELETE /api/v1/campus-events/{id}` | ADMIN, COORDINADOR | Dar de baja |
| `GET /api/v1/campus-events/check?dates=&zoneIds=&placeIds=` | ADMIN, COORDINADOR | Avisos para un registro de intervención o de reserva |

Cuerpo de `POST` y `PUT`:

```json
{
  "name": "Jueves cultural",
  "description": "Actividades en los jardines de Letras",
  "typeCode": "BLOCKING",
  "scope": "SECTION",
  "zoneId": 151,
  "startDate": "2027-03-18",
  "endDate": "2027-07-01",
  "startTime": "14:00",
  "endTime": "18:00",
  "weekdays": [4],
  "version": 0
}
```

- `scope`: `CAMPUS` (sin `zoneId`), `SECTOR` (zona de tipo sector) o `SECTION` (sección o subsección).
- `weekdays`: ISO, 1 = lunes … 7 = domingo; vacío o ausente = todos los días.
- `startTime`/`endTime`: los dos o ninguno; `version` solo en `PUT`.

Ocurrencia (lista de `GET /campus-events`):

```json
{ "eventId": 12, "name": "Jueves cultural", "typeCode": "BLOCKING", "typeLabel": "Bloqueante",
  "scope": "SECTION", "zoneId": 151, "zoneName": "Jardín Letras", "date": "2027-03-18",
  "startTime": "14:00", "endTime": "18:00" }
```

Aviso (`check`), con la misma forma que los de SPEC-107 para que la pantalla los muestre juntos:

```json
{ "kind": "CAMPUS_EVENT", "severity": "WARNING",
  "text": "El 18 mar, de 14:00 a 18:00, hay Jueves cultural en Jardín Letras", "eventId": 12 }
```

Un feriado avisa con `"kind": "HOLIDAY"` y el texto «El 28 jul es feriado: Fiestas Patrias».

### 3.1 Decisiones que el código no explica

- **La lista devuelve ocurrencias, no eventos:** la agenda y el mapa piensan por día; el
  formulario pide el evento con `GET /{id}`.
- **Rango máximo de 62 días** en la lista: dos meses cubren la agenda mensual con sus bordes.
- **`check` sin fechas o sin lugares responde `[]`**, no 400: el formulario lo llama mientras se llena.
- **422** para reglas de negocio (fin antes de inicio, feriado con ámbito, repetición sin ninguna
  ocurrencia en las fechas, `zoneId` de otro tipo que el ámbito); **409** si `version` no coincide.

## 4. Migración de base de datos

Número: el siguiente libre al implementar (hoy **V064**; si `fix/spec-102-xerofiticas-duplicadas`
se integra antes, se renumera).

```sql
-- SPEC-114: calendario del campus (eventos bloqueantes y feriados).
INSERT INTO catalog_types (code, name, description, is_system)
VALUES ('CAMPUS_EVENT_TYPE', 'Tipos de evento del campus', 'Bloqueante o feriado (SPEC-114)', TRUE);
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT t.id, v.code, v.label, v.pos FROM catalog_types t,
  (VALUES ('BLOCKING', 'Bloqueante', 1), ('HOLIDAY', 'Feriado', 2)) AS v(code, label, pos)
 WHERE t.code = 'CAMPUS_EVENT_TYPE';

CREATE TABLE campus_events (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(150) NOT NULL CHECK (length(trim(name)) > 0),
    description        VARCHAR(500),
    type_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    scope              VARCHAR(10) NOT NULL CHECK (scope IN ('CAMPUS', 'SECTOR', 'SECTION')),
    zone_id            BIGINT REFERENCES zones(id),
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    start_time         TIME,
    end_time           TIME,
    -- Días ISO (1 = lunes); NULL = todos los días de las fechas.
    weekdays           SMALLINT[],
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP,
    CONSTRAINT chk_campus_event_dates CHECK (end_date >= start_date AND end_date <= start_date + 365),
    CONSTRAINT chk_campus_event_scope CHECK ((scope = 'CAMPUS') = (zone_id IS NULL)),
    CONSTRAINT chk_campus_event_hours CHECK ((start_time IS NULL) = (end_time IS NULL)
        AND (start_time IS NULL OR end_time > start_time)),
    CONSTRAINT chk_campus_event_weekdays CHECK (weekdays IS NULL
        OR (cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]))
);
CREATE INDEX idx_campus_events_dates ON campus_events (start_date, end_date) WHERE deleted_at IS NULL;
```

- Que un feriado sea de todo el campus lo valida el servicio: el `CHECK` no conoce el código del
  catálogo.
- Sin semilla de feriados: los registra coordinación. Sembrar los nacionales sería inventar datos
  que el cliente no entregó (y la lista peruana cambia de un año a otro).

## 5. Comportamiento

### 5.1 Registrar

1. Coordinación abre «Calendario del campus» → «Registrar evento».
2. Elige tipo; con **Feriado**, el ámbito queda fijo en «Todo el campus».
3. Elige ámbito: todo el campus, un sector o una sección (lista agrupada por sector).
4. Fechas de inicio y fin; marca «Con horario» para pedir hora de inicio y fin; marca días de la
   semana para repetir. Bajo el formulario se ve un resumen: «16 jueves, del 18 mar al 1 jul, de
   14:00 a 18:00».
5. Guarda → vuelve a la agenda en el mes del evento, con un aviso «Evento registrado».

### 5.2 Agenda

- Lista por día del mes elegido (flechas de mes y «Hoy»), con filtro por tipo. Cada ocurrencia
  muestra nombre, tipo (con su color), horario o «Todo el día» y ámbito.
- Los días sin eventos no se listan; un mes vacío dice «No hay eventos en noviembre».
- ADMIN y COORDINADOR ven «Editar» en cada fila; el resto, solo lectura.

### 5.3 Editar y dar de baja

- Editar cambia la regla entera (todas sus ocurrencias). Con `version` desactualizada → 409 y el
  aviso «Otra persona cambió este evento; recarga para ver su versión».
- «Dar de baja» pide confirmación y quita todas las ocurrencias.

### 5.4 Avisos al programar trabajo y al reservar

- En el registro de intervención, al tener fecha y al menos un lugar, se llama a `check` con esa
  fecha y las zonas y lugares elegidos. Cada ocurrencia que toca uno de ellos produce un aviso
  ámbar; se puede guardar igual (D-05).
- En el registro de reserva, igual con la fecha de la reserva y su jardín. Si el evento tiene
  horario y la reserva también, solo avisa si se cruzan.
- Un feriado avisa siempre que la fecha coincide (su ámbito es todo el campus).

### 5.5 En el mapa

- **Franja** (D-06): arriba del mapa, los eventos de todo el campus que ocurren hoy —«Hoy: Examen de
  admisión (todo el día)» o «Hoy es feriado: Fiestas Patrias»—. Se cierra con ✕ hasta mañana.
- **Globo «Evento bloqueante»** (SPEC-113): uno por evento bloqueante de sector o sección que ocurre
  hoy, clavado en el punto interior de su zona. Ficha: nombre, tipo, horario o «Todo el día», ámbito.
  Con horario, el globo está mientras dure; sin horario, todo el día.
- La franja llega en la misma respuesta de `GET /map/balloons`, en un campo nuevo
  `campusNotices: [{ "typeCode": "HOLIDAY", "text": "Hoy es feriado: Fiestas Patrias" }]`, para no
  sumar otra llamada. El texto ya viene armado: «Hoy: Examen de admisión (todo el día)» o con su horario.

### 5.6 Días hábiles de incidencias

> **Sin efecto desde el rediseño de incidencias (SPEC-201, integrado el 16 nov 2026):** los plazos de
> una incidencia corren en horas desde la recepción, sin días hábiles, y `IncidentBusinessCalendar`
> se retiró. D-07 y CA-08 quedan sin objeto; `CampusHolidays` sigue sirviendo a la regla 5.11 (SPEC-115).

`IncidentBusinessCalendar` deja de leer solo `INCIDENT_HOLIDAYS`: cuenta como no hábiles la unión de
esa variable y los feriados registrados (D-07).

### 5.7 Casos límite

- **Evento que empieza antes del rango pedido:** solo salen sus ocurrencias dentro del rango.
- **Repetición sin ninguna ocurrencia** (solo martes, del miércoles al lunes siguiente): 422
  «Con esos días de la semana, el evento no ocurre ningún día entre esas fechas».
- **Zona dada de baja o inactiva:** el evento sigue en la agenda con «(zona dada de baja)»; no
  produce avisos ni globo.
- **Feriado de varios días** (Semana Santa): un solo evento con fecha de inicio y fin.
- **Dos eventos el mismo día en el mismo jardín:** dos avisos.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Coordinación registra «Jueves cultural», jueves del 18 mar al 1 jul 2027, 14:00-18:00, en una sección, y la agenda de marzo muestra los jueves 18 y 25 con su horario | Navegador, rol COORDINADOR |
| CA-02 | Un capataz ve la agenda pero no «Registrar» ni «Editar»; el POST con su sesión da 403 | Navegador + API |
| CA-03 | Al registrar un feriado, el ámbito queda en «Todo el campus» y no se puede cambiar | Navegador |
| CA-04 | Programar una intervención en esa sección un jueves de marzo muestra el aviso ámbar y deja guardar | Registro de intervención |
| CA-05 | Reservar un jardín de esa sección un jueves de 10:00 a 12:00 no avisa; de 15:00 a 17:00, sí | Registro de reserva |
| CA-06 | Con un feriado registrado hoy, el mapa muestra «Hoy es feriado: …» en la franja | `/mapa` |
| CA-07 | Un evento bloqueante de un sector que ocurre hoy muestra el globo morado sobre el sector | `/mapa` |
| CA-08 | Un feriado registrado no cuenta como día hábil al cerrar una incidencia | Cerrar una incidencia que abarque ese día |
| CA-09 | Dar de baja el evento lo quita de la agenda, de los avisos y del mapa | Repetir CA-01, CA-04 y CA-07 |
| CA-10 | Una fecha de fin a más de 366 días del inicio se rechaza con un mensaje en español | Formulario |

## 7. Especificación visual

- **Agenda** (`PageFrame`, SPEC-C01): encabezado «Calendario del campus», selector de mes con «Hoy»,
  filtro «Todos · Bloqueantes · Feriados», botón «Registrar evento» (solo coordinación). Filas
  agrupadas bajo el día («jueves 18 mar»); a la izquierda el horario o «Todo el día», al centro el
  nombre y el ámbito, a la derecha la insignia del tipo: **Bloqueante** morado (el del globo),
  **Feriado** neutro.
- **Formulario**: tipo, nombre, descripción opcional, ámbito (tres botones y, debajo, el selector de
  sector o de sección), fechas, «Con horario», días de la semana como siete casillas «L M X J V S D»
  y el resumen en vivo. Errores de campo bajo cada campo (SPEC-C02).
- **Avisos**: la misma tarjeta ámbar que los avisos de reservas, en la misma lista.
- **Franja del mapa**: arriba, debajo del buscador, fondo morado claro, texto oscuro, ✕ para cerrar.
- Móvil (<640px): la agenda es una lista de una columna; el formulario, campos apilados.

## 8. Tests

```
Engine · ocurrencias
- sin repetición: del 1 al 3 → 1, 2 y 3
- jueves del 18 mar al 1 jul 2027 → 16 ocurrencias, la primera el 18 mar
- rango pedido a mitad del evento → solo las de dentro
- repetición sin ninguna ocurrencia → error de regla

Engine · alcance
- campus toca cualquier jardín; sector toca solo las secciones de ese sector
- sección toca esa sección y sus subsecciones; no toca a su vecina

Servicio
- feriado con ámbito de sector → 422
- fin a 367 días del inicio → 422
- horario solo de inicio → 422
- PUT con versión vieja → 409
- dado de baja → no sale en la lista ni en check

Check
- intervención en la sección el jueves → aviso; el miércoles → nada
- reserva con horario que no se cruza con el del evento → nada
- feriado hoy → aviso HOLIDAY sin importar el lugar
- sin fechas o sin lugares → []

Globos y franja
- bloqueante de sector hoy → globo BLOCKING_EVENT sobre el sector
- bloqueante de todo el campus hoy → franja, sin globo
- feriado hoy → franja «Hoy es feriado: …»
- evento con horario que ya terminó hoy → sin globo

Incidencias
- un feriado registrado no cuenta como día hábil; INCIDENT_HOLIDAYS sigue contando
```

## 9. Propio de este spec

- Acciones auditables (SPEC-004 §3.2): `CAMPUS_EVENT_CREATED`, `CAMPUS_EVENT_UPDATED`,
  `CAMPUS_EVENT_DELETED`, con el id del evento y quién.
- El catálogo `CAMPUS_EVENT_TYPE` es de sistema: sus dos ítems no se editan desde la pantalla de
  catálogos (cada uno tiene reglas en el código).
- Verificación en navegador real (INV-10) con COORDINADOR y SUPERVISOR.
