# SPEC-202 — Reportes: tres niveles

| Campo | Valor |
|-------|-------|
| HU relacionada | W-11 (REQ 6.2), W-12 (REQ 6.3), W-13 (REQ 6.4), F-01 (REQ 6.1), F-02 (REQ 6.8), F-03 (REQ 6.10), F-04 (REQ 6.6) |
| Autor | Propuesta elaborada con Claude para revisión del equipo |
| Plataforma | Web |
| Sprint | S4 |
| Dependencias | SPEC-001 Anexo A, SPEC-003, SPEC-101, SPEC-200 (D-06, §2.9), SPEC-201, SPEC-C01, SPEC-C02, SPEC-C03; módulo de riego M7 (V024) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:**
> - SPEC-001 Anexo A, filas «5. Incidencias» y «6. Reportes»: quién ve qué.
> - SPEC-200 D-06 y §2.9: qué trabajo cuenta y con qué fecha.
> - SPEC-101 e informe T09 (`docs/planes/SPEC-200-etapa-5-frecuencias-locales.md`):
>   cumplimiento por lugar.
> - SPEC-201: estados y alcance de las incidencias.
> - `docs/propuestas/reportes-hesperides.html`: contenido de referencia de los tres niveles.
>   Sus cifras son inventadas y su estilo no se usa.

> **La regla de este spec: contiene lo que el código NO dice.**
> Mientras la feature no esté implementada, este spec es la fuente de verdad y los contratos se
> escriben literales. Al cerrarla, ese detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Que el capataz, la jefatura y la dirección reciban, en una sola pantalla con tres pestañas,
el reporte semanal del sector, el mensual de la sección y el resumen de gestión, calculados
solo con lo que ya está registrado en el sistema.

| Pestaña | Nivel | Para | Periodo | Pregunta que responde |
|---|---|---|---|---|
| **Semanal del sector** | Operativo | Capataz y jefatura | Semana, de lunes a domingo | «¿Qué hizo la cuadrilla esta semana, cómo fue el riego y qué sigue abierto?» |
| **Mensual de la sección** | Coordinación | Jefatura | Periodo, por defecto el mes | «¿Se cumple la cobertura y las frecuencias, y dónde falta atención?» |
| **Resumen para OSG** | Dirección | Jefatura, para enviarlo a la Oficina de Servicios Generales | Mes | «¿Se cumplen las metas y se va mejor o peor que el mes pasado?» |

## 2. Contexto

### 2.1 Backend

- **Paquete:** `pe.edu.pucp.hesperides.modules.reports`.
- **Sin entidades propias:** es un módulo de solo lectura, como prevé el modelo de datos
  (`docs/arquitectura/base-de-datos` §3).
- **Capas**, respetando los límites de líneas de REGLAS y del estándar de CI/CD:

| Pieza | Responsabilidad |
|---|---|
| `controller/ReportsController` → `/api/v1/reports` | Cinco rutas (§3): parsea, valida la forma de los parámetros y delega |
| `service/ReportsService` / `ReportsServiceImpl` | Fachada: resuelve el alcance y llama al constructor de cada reporte |
| `service/ReportScopeResolver` | Rol, cuadrillas que dirige el SUPERVISOR y sus sectores (§2.5 D-08) |
| `service/WeeklyReportBuilder`, `MonthlyReportBuilder`, `DirectionReportBuilder` | Arman cada respuesta |
| `repository/CoverageQueries`, `InterventionReportQueries`, `IrrigationReportQueries`, `IncidentReportQueries`, `InventoryReportQueries` | SQL nativo **parametrizado** con `NamedParameterJdbcTemplate`, el mismo patrón que `InterventionQueriesRepository` |
| `engine/reporting/` (puro, sin Spring ni BD) | `CoverageCalculator` (porcentaje y redondeo), `TrendCalculator` (variación y sentido), `ReportPeriods` (límites de semana y mes en una zona horaria), `VerdictAggregator` (veredicto más grave, D-05) |

- **Se reutiliza, sin duplicar:**

| Pieza existente | Para qué |
|---|---|
| `ComplianceReader.evaluate(from, to, null)` (SPEC-101, T09) | Cumplimiento por lugar; ya aplica el alcance del lector y la aprobación final |
| Predicado de aprobación final de `InterventionExecutionHistoryProvider` | Qué trabajo cuenta (D-02). Se extrae a una constante compartida del módulo `interventions` para que exista **una sola definición** |
| `IrrigationZoneQueries.activeSectorsOfSupervisor` y `sectionsOf` | Reportes usa `activeSectorsOfSupervisor` para el alcance por cuadrilla del SUPERVISOR. `sectionsWithAreaOf` aplica el mismo filtro de secciones que `sectionsOf` e incluye `area_m2` |
| `irrigation_turns`, `irrigation_turn_sections` (V024) | Riego registrado |
| `incidents`, `incident_status_history` (V026) | Incidencias y su estado en una fecha (el alta ya escribe su estado inicial en el historial) |
| `zones` (`parent_zone_id`, `area_m2`, `boundary`, `ZONE_TYPE`) (V005), `places.zone_id` (V018) | Jerarquía, superficie y ubicación |
| `green_elements` (`GREEN_ELEMENT_TYPE = INDIVIDUAL`) y `species.species_type_item_id` (V012-V013) | Ejemplares del catastro |
| `SystemParameterReader` y `system_parameters` (V003) | `CAMPUS_TOTAL_HECTARES` y las metas nuevas (§4) |
| `hesperides.maintenance.time-zone` (`MAINTENANCE_TIME_ZONE`, `America/Lima` por defecto) | Fecha civil, semanas y meses |

### 2.2 Frontend web

- **Ruta:** `/reportes` → `frontend/src/app/(dashboard)/reportes/page.tsx`. La pestaña activa
  viaja en la URL (`?tab=semanal|mensual|direccion`), según §2.5 D-13.
- **Componentes de pantalla** en `frontend/src/components/reports/`:
  - `ReportsScreen.tsx`: lee `tab` y los parámetros, y decide qué pestañas ve el rol.
  - `ReportTabs.tsx`: lista de pestañas accesible (§7.2).
  - `WeeklyReport.tsx`, `MonthlyReport.tsx`, `DirectionReport.tsx`: un panel por pestaña; cada
    uno consulta solo cuando está activo.
  - `WeeklyFilters.tsx`, `MonthlyFilters.tsx`, `DirectionFilters.tsx`.
- **Gráficos** en `frontend/src/components/reports/charts/`, en SVG propio (D-17):

| Componente | Qué dibuja | Lo usa |
|---|---|---|
| `SectorBars` | Barras horizontales por sector: valor, total y porcentaje | Mensual (cobertura por sector) |
| `TrendLine` | Línea de tendencia con la meta marcada como línea discontinua; los meses sin registros quedan como hueco | Resumen para OSG (cobertura de los últimos 6 meses) |
| `ProgressMeter` | Barra de avance de un valor contra su meta o total | Semanal (secciones atendidas, riego) y Resumen para OSG (cada indicador con meta) |
| `ReportBadge` | Badge de estado sobre `Badge` de SPEC-C01: veredicto de cumplimiento, variación ▲▼=, «Sin datos», «Regla provisional» | Los tres. Las incidencias usan `StatusBadge` y `UrgencyBadge`, que ya existen |

- **Reutilizados de SPEC-C01**, sin redefinir sus props: `Card`, `Select`, `Button`, `Badge`,
  `StatusBadge`, `UrgencyBadge`, `DataTable`/`DataTableCards`, `EmptyState`,
  `LoadingSkeleton`, `Breadcrumb` y `DateRangePicker`.
- **Llamadas a la API:**
  - Cliente `frontend/src/lib/reports-api.ts`, a través de `apiClient`.
  - Hooks en `frontend/src/hooks/useReports.ts`, sobre `useRequest`, con una clave por
    pestaña y filtros.
  - Tipos en `shared/types/reports.ts`, exportados desde `shared/types/index.ts`.
- **Textos** en `frontend/src/components/reports/reportTexts.ts`: rótulos de indicadores,
  motivos de «Sin datos» y nombres de pestañas. El backend envía códigos, no textos
  (SPEC-C02 §11).
- **Navegación:** se añade el enlace directo «Reportes» en `DIRECT_LINKS` de
  `lib/navigation.ts`, para `ADMIN`, `COORDINADOR` y `SUPERVISOR` (D-09). Hasta este spec
  no existía.

### 2.3 Móvil

La app Android queda fuera de alcance: el catálogo de requisitos clasifica M6 como trabajo
de escritorio. La web sí debe usarse en el celular del capataz a 390 px (§7.3), porque la
pestaña Semanal es la suya.

### 2.4 Restricciones técnicas

- **DEBE usar:** las dependencias actuales; SVG y Tailwind sobre los tokens de SPEC-C01
  §3.1; `date-fns` para fechas.
- **NO debe usar:**
  - ninguna librería de gráficos (SPEC-C01 §2.4 pide decidirla aquí, y la decisión es no
    añadir ninguna);
  - ninguna librería de PDF ni de Excel, porque la exportación (F-05) queda fuera;
  - ningún hex suelto, ni dentro de un SVG.
- **Catálogos aplicables:** `INCIDENT_STATUS`, `URGENCY_LEVEL`, `INTERVENTION_STATUS`,
  `ZONE_TYPE`, `GREEN_ELEMENT_TYPE`, `SPECIES_TYPE` y la taxonomía `INTERVENTION_CLASS` →
  `INTERVENTION_TYPE`. Los filtros viajan como **id** (`classItemId`, `typeItemId`).

### 2.5 Decisiones propias de este spec

| ID | Decisión · por qué | Alternativa descartada |
|---|---|---|
| **D-01** | **Regla provisional de sección cubierta:** una sección está cubierta en un periodo si tiene ≥1 intervención con aprobación final cuya ejecución en esa sección cae en el periodo. Los porcentajes de cobertura se ponderan **por `area_m2`**, porque la meta del cliente está en superficie («100 % de las 15.6 ha»). La UI la rotula «Regla provisional». | Contar secciones sin ponderar |
| **D-02** | **Qué trabajo cuenta:** solo con aprobación final, es decir, planificación `ASSIGNED` y todas sus ubicaciones activas `VALIDATED` (SPEC-200 D-06). La fecha es la **ejecución física** (`completed_at`) en fecha civil de la zona configurada. Por trabajo y sección cuenta una vez, en la última ejecución de sus piezas allí (T09). Se consulta en forma retrospectiva: la aprobación debe existir al consultar. | Usar la fecha de aprobación: un trabajo del 30/10 aprobado el 3/11 caería en noviembre |
| **D-03** | **Sección del objetivo:** `intervention_locations.zone_id` o, si es nula, `places.zone_id`. Una subsección cuenta para su sección padre. Una ubicación sin sección no cubre nada. | Ubicar el trabajo por su punto GPS: SPEC-200 D-06 prohíbe inferir cobertura desde un punto |
| **D-04** | **Denominador de cobertura:** secciones activas y no borradas dentro del filtro. Las que no tienen `area_m2` se cuentan aparte (`sectionsWithoutArea`). Las que no tienen sector padre forman la fila «Sin sector». `CAMPUS_TOTAL_HECTARES` (41 ha) **no** sirve de denominador porque es el campus entero: solo se muestra en la cabecera del resumen. | Excluir los sectores sin cuadrilla propia: escondería que su trabajo aún no se registra |
| **D-05** | **Cumplimiento:** se agregan los resultados por lugar de `ComplianceReader`. El veredicto de un lugar es su tramo más grave (`OVERDUE` > `WITHIN_TOLERANCE` > `ON_TARGET` > `NOT_APPLICABLE`); `NOT_CONFIGURED` suma en `notApplicable`. `OUTSOURCED` y `BY_SECTOR` se muestran «No evaluable», con `notEvaluableReason` igual a `OUTSOURCED` o `BY_SECTOR`. Para distinguir `BY_SECTOR`, `ComplianceResponse` gana el campo `scope`. | Reimplementar la evaluación de frecuencias |
| **D-06** | **Incidencias:** «abiertas» = `OPEN` + `IN_PROGRESS`; `PENDING_APPROVAL` va aparte. El **estado en una fecha** se reconstruye con `incident_status_history`. Una incidencia pertenece a un sector en este orden: (1) sus coordenadas caen dentro de una sección del sector (`ST_Covers`); (2) si no tiene coordenadas, la cuadrilla asignada tiene ese sector (`teams.zone_id`). Si no cumple ninguna, es «sin sector identificable» y se cuenta aparte. **Días abierta** = fecha civil del corte − fecha civil del registro. | Mostrar «En plazo»: los plazos por urgencia no están confirmados (catálogo 5.6) |
| **D-07** | **Permisos por pestaña** (Anexo A, filas 5 y 6). Se declaran **explícitamente** en este controller y **no** se cambia el mapeo global de roles: ADMIN entra aunque su authority no incluya la de COORDINADOR. La tabla y su justificación están debajo de esta. | Implementar el superconjunto ADMIN ⊃ COORDINADOR en `CustomUserDetailsService`: cambio transversal que necesita su propio spec |
| **D-08** | **Alcance del SUPERVISOR en Reportes.** Sus cuadrillas son las que dirige (`teams.supervisor_user_id`, activas). Sus sectores son los `teams.zone_id` de esas cuadrillas (`activeSectorsOfSupervisor`). En Gestión de Riego, ADMIN, COORDINADOR y SUPERVISOR acceden a todos los sectores activos del catálogo, según la nota 5 del Anexo A de SPEC-001. Sin sectores asignados en Reportes, la Semanal muestra «Tu cuadrilla no tiene sector asignado» y la cobertura de la Mensual queda `available: false` con `unavailableReason: NO_SECTOR_ASSIGNED`. | Deducir su sector de los turnos de riego que registró: un dato de actividad no define una asignación |
| **D-09** | **Un solo enlace directo «Reportes»** en el sidebar, como Riego e Incidencias. Las tres pestañas viven dentro de la pantalla. | Tres ítems en un grupo M6: el usuario pidió una sola pantalla |
| **D-10** | **Sin caché ni vistas materializadas:** se calcula al consultar, así que el reporte cambia con cada aprobación (F-01). Es un sistema de bajo volumen (dominio §12). | Vista materializada: refrescos programados y migración sin necesidad medida |
| **D-11** | **Listas de tope fijo**, con `total`: secciones más atendidas, sin atención y sin regar (10); intervenciones de la semana (50); incidencias abiertas de la semana (50); lugares vencidos por actividad (5). No son listados navegables y no usan `Page<T>`. | Tres paginadores en un tablero |
| **D-12** | **Sector y superficie vigentes:** los meses pasados se recalculan con el `parent_zone_id` y el `area_m2` actuales. La vigencia histórica (A-07) no existe. | Una tabla de vigencias: pertenece al spec de A-07 |
| **D-13** | **Una pantalla, tres pestañas, pestaña en la URL:** `?tab=semanal|mensual|direccion`. Por defecto, `semanal` para SUPERVISOR y `mensual` para ADMIN y COORDINADOR. Una pestaña inválida o no permitida se reemplaza por la del rol (`router.replace`, sin error). Cada pestaña tiene sus propios parámetros (§3.6). Cambiar de pestaña hace `router.push` con los parámetros de la nueva, así «Atrás» vuelve a la anterior. | Tres rutas: el usuario pidió una sola pantalla |
| **D-14** | **Periodos:** semana de **lunes a domingo** en la zona configurada; por defecto, la semana en curso, rotulada «en curso». Mensual: por defecto, el mes en curso. Resumen: por defecto, el **último mes cerrado**, porque se entrega a fin de mes; el mes en curso se rotula «parcial». | Semana de domingo a sábado: el riego y la programación del cliente corren de lunes a sábado |
| **D-15** | **Regla provisional de sección regada:** una sección está regada en un periodo si figura en ≥1 turno de riego **de su sector** con `irrigation_date` dentro del periodo. Si el sector no tuvo ningún turno en la semana, se muestra «Sin turno de riego registrado esta semana» y no un 0 %: el sector puede no tener turno esa semana (ciclo de 15 días). | Medir el ciclo de 15 días: la definición está pendiente (catálogo 7.2) |
| **D-16** | **Indicadores del resumen:** una lista cerrada de **códigos calculados**, con la misma justificación que `ComplianceStatus`: cada código existe porque el backend sabe calcularlo, no es un dato administrable. Cada indicador trae valor, meta, valor del mes anterior y variación. Las metas salen de `system_parameters` (§4). Los indicadores sin fuente se envían con `available: false` y un código de motivo. | Escribir las metas en el código: viola INV-9 y el KPI 4 del proyecto |
| **D-17** | **Gráficos locales a la feature:** van en `components/reports/charts/` y no en `components/ui`. Por ahora solo los usa esta feature y cumplen uno solo de los criterios de SPEC-C01 §10.2. Pasan al catálogo, con su enmienda, cuando otra feature los necesite. Se pintan con clases de tokens (`fill-brand-600`, `stroke-neutral-500`), que cambian solas en modo oscuro. | Ponerlos ya en el catálogo compartido: §10.2 lo prohíbe con un solo uso |
| **D-18** | **Nombre del nivel de dirección:** el endpoint y el valor de la pestaña son `direction`/`direccion`. «Resumen para OSG» es un texto de la UI que se puede externalizar. Así el nombre de una oficina del cliente no queda en la API (INV-9 y KPI 4). | `/reports/osg` |

**Permisos por pestaña (D-07):**

| Pestaña | ADMIN | COORDINADOR | SUPERVISOR | OPERARIO | Justificación |
|---|:---:|:---:|:---:|:---:|---|
| Semanal del sector | ✅ cualquier sector | ✅ cualquier sector | ✅ solo los sectores de sus cuadrillas, con el trabajo de sus cuadrillas y las incidencias que SPEC-201 le deja ver | ❌ 403 | Es el reporte operativo del capataz, y el Anexo A le da «L, solo de su cuadrilla» |
| Mensual de la sección | ✅ campus | ✅ campus | ✅ solo sus cuadrillas (D-08) | ❌ 403 | Anexo A fila 6: L para los tres; el SUPERVISOR, acotado |
| Resumen para OSG | ✅ | ✅ | ❌ 403 y sin pestaña | ❌ 403 | Sus indicadores son del campus entero y no tienen sentido «solo de su cuadrilla». El Anexo A permite acotar al SUPERVISOR, no obliga a mostrarle este reporte |

En la Semanal, ADMIN ve la lista de incidencias por el Anexo A, fila 5, «Ver incidencias: L».
SPEC-201 dejó a ADMIN fuera de su prueba de concepto, así que el enlace al detalle
`/incidencias/{id}` solo se muestra a COORDINADOR y SUPERVISOR. Reconciliar ambos specs queda
en «Por validar».

**Enmienda a SPEC-C01 §3.1, aplicada el 4 nov 2026:** colores de los badges nuevos
sobre `Badge` existente, en el mismo orden neutro → ámbar → rojo:

| Badge | Color |
|---|---|
| `ON_TARGET` | `success` |
| `WITHIN_TOLERANCE` | `warning` |
| `OVERDUE` | `danger` |
| «No evaluable», `NOT_APPLICABLE` y «Sin datos» | `neutral` |
| «Regla provisional» | `info` |
| Variación favorable | `success` |
| Variación desfavorable | `danger` |
| Variación sin meta de sentido, o igual | `neutral` |

Se anota en `REGISTRO.md` al aplicarla.

### 2.6 Fuente de cada indicador

**Regla: todo dato sale de la BD.** Lo que no tiene fuente no se inventa: se omite o se
muestra «Sin datos», y se lista en §9 «Por validar».

| # | Indicador | Reporte | Fuente en la BD | Estado | Decisión |
|---|---|---|---|---|---|
| 1 | Intervenciones aprobadas de la semana, con tipo y lugar | Semanal | `interventions`, `intervention_locations`, `zones`/`places`, `INTERVENTION_TYPE` | Disponible | Mostrar (D-02, D-03) |
| 2 | Aprobadas frente a la semana anterior | Semanal | Ídem | Disponible | Mostrar |
| 3 | Ejecutadas pendientes de aprobación | Semanal · Mensual | `intervention_locations.status_item_id` | Disponible | Mostrar como informativo; no suma a cobertura |
| 4 | Fotos pendientes de subir | Semanal | `intervention_evidences.uploaded_at IS NULL` | Disponible | Mostrar |
| 5 | Secciones atendidas / secciones del sector | Semanal | Ídem 1 + `zones` | Disponible (provisional, D-01) | Mostrar |
| 6 | Secciones regadas / secciones del sector | Semanal | `irrigation_turns`, `irrigation_turn_sections`, `zones` | Disponible (provisional, D-15) | Mostrar |
| 7 | Secciones sin regar, con su último riego | Semanal | Ídem | Disponible | Mostrar (máx. 10 + total) |
| 8 | Incidencias abiertas del sector y sus días abiertas | Semanal | `incidents`, `incident_status_history`, coordenadas ∩ `zones.boundary`, `teams.zone_id` | Parcial: la incidencia no guarda su sección y las coordenadas son opcionales | Mostrar; las no ubicables se cuentan aparte (D-06) |
| 9 | Capataz y cuadrilla del sector | Semanal | `teams.zone_id`, `teams.supervisor_user_id`, `users` | Parcial: ninguna cuadrilla real tiene sector cargado | Mostrar si existe; si no, «Sin cuadrilla asignada» |
| 10 | Personas de la cuadrilla | Semanal | `team_members` solo tiene usuarios con cuenta, y los operarios no tienen cuenta | Falta | Omitir · Por validar |
| 11 | Insumos consumidos | Semanal | No existen tablas de insumos ni de consumos | Falta | Omitir · Por validar |
| 12 | Cobertura del periodo por superficie | Mensual · OSG | `zones.area_m2` + trabajo aprobado | Disponible (provisional, D-01) | Mostrar |
| 13 | Cobertura por sector | Mensual | Ídem + `zones.parent_zone_id` | Disponible (sector vigente, D-12) | Mostrar |
| 14 | Labores aprobadas | Mensual · OSG | `interventions` | Disponible | Mostrar; en OSG sin meta |
| 15 | Incidencias por estado; registradas y resueltas en el periodo | Mensual | `incidents` | Disponible | Mostrar |
| 16 | Cumplimiento de frecuencias por actividad | Mensual | `maintenance_frequencies` + `ComplianceReader` | Parcial: solo personal propio, frecuencia configurada y evaluación por lugar | Mostrar; el resto «No evaluable» |
| 17 | Secciones más atendidas y sin atención | Mensual | Ídem 12 | Disponible | Mostrar |
| 18 | Ciclos de riego completos | Mensual · OSG | Existen `irrigation_turns`, pero no la definición de «ciclo completo» | Falta definición | Mensual: omitir · OSG: «Sin datos» · Por validar |
| 19 | Incidencias atendidas en plazo; tiempo medio por urgencia | Mensual · OSG | Existen `created_at`/`resolved_at`, pero no los plazos por urgencia | Falta | Mensual: omitir · OSG: «Sin datos» · Por validar |
| 20 | Variación frente al mes anterior | OSG | Mismas fuentes, mes anterior | Disponible | Mostrar |
| 21 | Cobertura de los últimos 6 meses | OSG | Ídem 12 | Disponible (recalculada con sectores y superficies vigentes, D-12) | Mostrar |
| 22 | Cobertura de riego del mes | OSG | Ídem 6, sobre todo el campus | Disponible (provisional, D-15) | Mostrar |
| 23 | Incidencias resueltas en el mes | OSG | `incidents.resolved_at` | Disponible, sin meta | Mostrar sin meta |
| 24 | Controles fitosanitarios del año | OSG | Hay intervenciones de clase `FITOSANITARIO`, pero un «control» es una campaña de todo el campus que no está modelada, y sus tipos son provisionales (P-10) | Falta | «Sin datos» · Por validar |
| 25 | Poda mayor del año | OSG | La ejecutan terceros y su ejecución no se registra (W-05, fase futura) | Falta | «Sin datos» · Por validar |
| 26 | Ejemplares de arbolado en el catastro | OSG | `green_elements` `INDIVIDUAL` con `species_type` `TREE` o `PALM` | Parcial: hay conteo y fecha de alta; la meta (~3 500) no está en la BD | Mostrar conteo y variación; meta «Sin datos» · Por validar |
| 27 | Metas de cobertura y de riego | OSG | No existen hoy | Falta | Sembrarlas como parámetros editables (§4, Vnext) |
| 28 | Cabecera: áreas verdes, superficie del campus y cuadrillas activas | OSG | Suma de `area_m2` de las **secciones** activas (el sector ya guarda la suma de las suyas, así que sumar todas las zonas contaría doble), `CAMPUS_TOTAL_HECTARES`, `teams` | Disponible | Mostrar |
| 29 | Observaciones de la jefatura | OSG | No hay dónde guardarlas | Falta | Omitir · Por validar |

## 3. Contratos de API

> El sobre `{ok, message, data}` (INV-1) y las envolturas 400/401/403 de SPEC-C02 no se
> repiten. Las fechas van en `YYYY-MM-DD` y los instantes en ISO 8601 UTC (SPEC-C03 §7).

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/reports/options` | `ADMIN`, `COORDINADOR`, `SUPERVISOR` | Valores de filtros y periodos por defecto visibles para el usuario |
| `GET /api/v1/reports/options/sections?sectorId={id}` | Ídem | Secciones de un sector |
| `GET /api/v1/reports/weekly` | Ídem, con el alcance de D-08 | Reporte semanal del sector |
| `GET /api/v1/reports/monthly` | Ídem, con el alcance de D-08 | Reporte mensual de la sección |
| `GET /api/v1/reports/direction` | `ADMIN`, `COORDINADOR` | Resumen para OSG |

`OPERARIO` recibe 403 en todos. `SUPERVISOR` recibe 403 en `/direction`.

### 3.1 `GET /reports/options`

```json
{
  "timeZone": "America/Lima",
  "defaults": {
    "weekStart": "2026-11-02",
    "monthly": { "dateFrom": "2026-11-01", "dateTo": "2026-11-30" },
    "directionMonth": "2026-10"
  },
  "sectors": [ { "id": 1, "code": "SEC-VERDE-01", "name": "Sector verde 01" } ],
  "teams": [ { "id": 4, "code": "CUAD-01", "name": "Cuadrilla sector 01", "sectorId": 1 } ],
  "classes": [
    { "id": 12, "code": "PODA", "label": "Poda",
      "types": [ { "id": 30, "code": "PODA_MANTENIMIENTO", "label": "Poda de mantenimiento" } ] }
  ]
}
```

- **`sectors`:** para el SUPERVISOR, solo los de sus cuadrillas (D-08); puede venir vacío.
- **`teams`:** todas las activas, o solo las que dirige el SUPERVISOR.
- **`classes`:** solo clases y tipos activos (SPEC-200 §2.4).

### 3.2 `GET /reports/options/sections?sectorId={id}`

```json
[ { "id": 50, "code": "AV-0151", "name": "Jardín Frutas", "areaM2": 1250.40 } ]
```

Un `sectorId` inexistente o fuera del alcance responde **404**.

### 3.3 `GET /reports/weekly?weekStart={YYYY-MM-DD}&sectorId={id}`

| Parámetro | Regla |
|---|---|
| `weekStart` | Opcional. Por defecto, el lunes de la semana en curso. **400** si no es lunes o si es posterior a la semana en curso |
| `sectorId` | **Obligatorio** (400 si falta). **404** si no existe o está fuera del alcance. La UI lo preselecciona con el primer sector de `options` |

```json
{
  "week": { "weekStart": "2026-10-26", "weekEnd": "2026-11-01", "timeZone": "America/Lima",
            "inProgress": false, "cutoffDate": "2026-11-01" },
  "scope": "SECTOR",
  "sector": { "id": 2, "code": "SEC-VERDE-02", "name": "Sector verde 02",
              "totalSections": 118, "totalAreaM2": 40600.00 },
  "teams": [ { "id": 5, "name": "Cuadrilla sector 02", "supervisorName": "Nombre Apellido" } ],
  "interventions": {
    "approved": 14, "approvedPreviousWeek": 11, "pendingApproval": 3, "pendingPhotos": 0,
    "byType": [
      { "classLabel": "Mantenimiento de jardines", "typeItemId": 41, "typeLabel": "Deshierbo",
        "approved": 5, "places": ["Jardín Frutas", "AV-0302"] }
    ],
    "items": {
      "total": 14,
      "items": [
        { "id": 120, "code": "INT-000120", "classLabel": "Poda", "typeLabel": "Poda de mantenimiento",
          "lastExecutionDate": "2026-10-28", "approvedOn": "2026-10-29",
          "places": [ { "kind": "ZONE", "id": 50, "label": "Jardín Frutas" } ] }
      ]
    }
  },
  "attendedSections": {
    "rule": "PROVISIONAL_ONE_APPROVED_PER_SECTION",
    "covered": 9, "total": 118, "percent": 7.6
  },
  "irrigation": {
    "rule": "PROVISIONAL_ONE_TURN_PER_SECTION",
    "turns": 3, "irrigatedSections": 115, "totalSections": 118, "percent": 97.5,
    "notIrrigated": {
      "total": 3,
      "items": [ { "sectionId": 77, "code": "AV-0302", "name": "Jardín de Física", "lastIrrigatedOn": "2026-10-12" } ]
    }
  },
  "incidents": {
    "asOf": "2026-11-01", "open": 2, "pendingApproval": 1, "unlocatedInScope": 4,
    "items": {
      "total": 3,
      "items": [
        { "id": 12, "description": "Rama sobre la vía peatonal frente a…", "locationReference": "Pontódromo",
          "urgency": { "code": "HIGH", "label": "Alta" }, "status": { "code": "IN_PROGRESS", "label": "En atención" },
          "teamName": "Cuadrilla sector 02", "reportedOn": "2026-10-29", "daysOpen": 3,
          "locatedBy": "COORDINATES" }
      ]
    }
  },
  "generatedAt": "2026-11-04T15:00:00Z"
}
```

### 3.4 `GET /reports/monthly`

**Parámetros:** todos opcionales y combinables con AND (SPEC-C03 §6.1).

| Parámetro | Regla |
|---|---|
| `dateFrom`, `dateTo` | Inclusivos. Por defecto, el mes en curso. Se envían ambos o ninguno; `dateTo ≥ dateFrom`; rango ≤ 366 días (si no, **400**) |
| `sectorId`, `teamId` | **404** si no existen o están fuera del alcance |
| `sectionId` | **404** si no existe; **400** si no pertenece a `sectorId` |
| `classItemId` | **400** si no es de ese catálogo |
| `typeItemId` | **400** si no es de ese catálogo o no es hijo de `classItemId` |

**Respuesta:**

```json
{
  "period": { "dateFrom": "2026-10-01", "dateTo": "2026-10-31", "timeZone": "America/Lima" },
  "scope": "CAMPUS",
  "coverage": {
    "rule": "PROVISIONAL_ONE_APPROVED_PER_SECTION", "available": true, "unavailableReason": null,
    "coveredAreaM2": 98250.30, "totalAreaM2": 156120.00, "percent": 62.9,
    "coveredSections": 214, "totalSections": 531, "sectionsWithoutArea": 3
  },
  "interventions": { "approved": 45, "pendingApproval": 7 },
  "incidents": { "pendingApproval": 2, "open": 5, "inProgress": 3, "reportedInPeriod": 12, "resolvedInPeriod": 9 },
  "sectors": [
    { "sectorId": 1, "code": "SEC-VERDE-01", "name": "Sector verde 01",
      "coveredAreaM2": 30100.00, "totalAreaM2": 45500.00, "percent": 66.2,
      "coveredSections": 80, "totalSections": 121, "approvedInterventions": 20 },
    { "sectorId": null, "code": null, "name": "Sin sector",
      "coveredAreaM2": 0, "totalAreaM2": 3200.00, "percent": 0.0,
      "coveredSections": 0, "totalSections": 10, "approvedInterventions": 0 }
  ],
  "compliance": [
    { "activityTypeItemId": 30, "activityLabel": "Corte de césped", "regime": "IN_HOUSE",
      "evaluable": true, "notEvaluableReason": null,
      "onTarget": 10, "withinTolerance": 2, "overdue": 1, "notApplicable": 3,
      "overdueTargets": [ { "targetKind": "ZONE", "targetId": 50, "label": "Jardín Frutas", "lastExecutionDate": "2026-08-30" } ] }
  ],
  "mostAttended": { "total": 214, "items": [
    { "sectionId": 50, "code": "AV-0151", "name": "Jardín Frutas", "sectorName": "Sector verde 01",
      "areaM2": 1250.40, "approvedInterventions": 5, "lastAttendedOn": "2026-10-28" } ] },
  "unattended": { "total": 317, "items": [
    { "sectionId": 77, "code": "AV-0302", "name": "Jardín de Física", "sectorName": "Sector verde 02",
      "areaM2": 2100.00, "approvedInterventions": 0, "lastAttendedOn": null } ] },
  "generatedAt": "2026-11-04T15:00:00Z"
}
```

### 3.5 `GET /reports/direction?month={YYYY-MM}`

**`month`:** opcional. Por defecto, el último mes cerrado. Responde **400** si el formato no es
`YYYY-MM` o si el mes es posterior al mes en curso.

```json
{
  "month": "2026-10", "previousMonth": "2026-09", "timeZone": "America/Lima", "inProgress": false,
  "header": { "greenAreaM2": 156120.00, "campusHectares": 41.0, "sections": 531, "activeTeams": 3 },
  "indicators": [
    { "code": "COVERAGE", "unit": "PERCENT", "available": true, "unavailableReason": null,
      "value": 62.9, "previousValue": 58.1, "delta": 4.8, "trend": "UP", "higherIsBetter": true,
      "target": 100.0, "targetReason": null, "progress": 62.9, "provisional": true },
    { "code": "IRRIGATION_COVERAGE", "unit": "PERCENT", "available": true, "unavailableReason": null,
      "value": 71.4, "previousValue": 73.0, "delta": -1.6, "trend": "DOWN", "higherIsBetter": true,
      "target": 100.0, "targetReason": null, "progress": 71.4, "provisional": true },
    { "code": "APPROVED_INTERVENTIONS", "unit": "COUNT", "available": true, "unavailableReason": null,
      "value": 45, "previousValue": 38, "delta": 7, "trend": "UP", "higherIsBetter": null,
      "target": null, "targetReason": "NO_TARGET", "progress": null, "provisional": false },
    { "code": "RESOLVED_INCIDENTS", "unit": "COUNT", "available": true, "unavailableReason": null,
      "value": 9, "previousValue": 6, "delta": 3, "trend": "UP", "higherIsBetter": null,
      "target": null, "targetReason": "NO_TARGET", "progress": null, "provisional": false },
    { "code": "TREE_INVENTORY", "unit": "COUNT", "available": true, "unavailableReason": null,
      "value": 1012, "previousValue": 985, "delta": 27, "trend": "UP", "higherIsBetter": true,
      "target": null, "targetReason": "TARGET_NOT_STORED", "progress": null, "provisional": false },
    { "code": "IRRIGATION_CYCLES", "unit": "COUNT", "available": false, "unavailableReason": "RULE_NOT_DEFINED",
      "value": null, "previousValue": null, "delta": null, "trend": null, "higherIsBetter": true,
      "target": null, "targetReason": null, "progress": null, "provisional": false },
    { "code": "PHYTOSANITARY_CONTROLS", "unit": "COUNT", "available": false, "unavailableReason": "UNIT_NOT_MODELED",
      "value": null, "previousValue": null, "delta": null, "trend": null, "higherIsBetter": true,
      "target": null, "targetReason": null, "progress": null, "provisional": false },
    { "code": "MAJOR_PRUNING", "unit": "COUNT", "available": false, "unavailableReason": "NOT_RECORDED",
      "value": null, "previousValue": null, "delta": null, "trend": null, "higherIsBetter": true,
      "target": null, "targetReason": null, "progress": null, "provisional": false },
    { "code": "HIGH_URGENCY_ON_TIME", "unit": "PERCENT", "available": false, "unavailableReason": "NO_DEADLINES_CONFIGURED",
      "value": null, "previousValue": null, "delta": null, "trend": null, "higherIsBetter": true,
      "target": null, "targetReason": null, "progress": null, "provisional": false }
  ],
  "coverageSeries": {
    "target": 100.0,
    "points": [
      { "month": "2026-05", "percent": null, "recorded": false },
      { "month": "2026-06", "percent": null, "recorded": false },
      { "month": "2026-07", "percent": null, "recorded": false },
      { "month": "2026-08", "percent": 41.2, "recorded": true },
      { "month": "2026-09", "percent": 58.1, "recorded": true },
      { "month": "2026-10", "percent": 62.9, "recorded": true }
    ]
  },
  "generatedAt": "2026-11-04T15:00:00Z"
}
```

### 3.6 Decisiones que el código no explica

**Respuestas comunes**

- **`scope`** vale `CAMPUS` (ADMIN, COORDINADOR) o `TEAMS` (SUPERVISOR) en la Mensual, y
  `SECTOR` o `TEAMS` en la Semanal. Es metadato técnico de la respuesta, un `String` del DTO
  como `regime` en `ComplianceResponse`.
- **`percent`** lleva un decimal con redondeo *half-up*, y es `null` si el denominador es 0 o
  `available = false`. Las áreas son `number` con dos decimales.
- **Un periodo sin datos no es un error:** responde 200 con contadores en 0 y listas vacías.

**Semanal**

- **Qué intervenciones son «del sector»:** las que tienen ≥1 ubicación cuya sección (D-03)
  pertenece al sector. En `places` se listan solo las ubicaciones del sector.
- **Alcance del SUPERVISOR:** además, solo las de sus cuadrillas (D-08). Las incidencias
  deben cumplir lo que SPEC-201 le deja ver: enviadas por él o asignadas a sus cuadrillas.
- **Corte de las incidencias:** `cutoffDate` es `weekEnd`, salvo en la semana en curso, donde
  es hoy. El estado y los `daysOpen` se calculan **al corte**, con `incident_status_history`.
  Una incidencia registrada después del corte no aparece.
- **`unlocatedInScope`:** cuenta las incidencias abiertas del alcance que no se pueden ubicar
  en ningún sector. Para el SUPERVISOR es `null`, porque las de su cuadrilla se ubican por el
  sector de esta.
- **`description`:** se recorta en el backend a 140 caracteres, con «…». El detalle completo
  está en SPEC-201.
- **`pendingPhotos`:** cuenta las evidencias anunciadas y no subidas de las intervenciones del
  sector en el alcance, **de cualquier fecha**. Es una tarea pendiente, no un dato de la semana.
- **`irrigation.notIrrigated`:** ordena por `lastIrrigatedOn` ascendente, las nulas primero.
  `lastIrrigatedOn` es el último riego **hasta `weekEnd`**.

**Mensual**

- **`teamId` con ADMIN o COORDINADOR** restringe solo el numerador. Responde «¿qué parte del
  sector cubrió esta cuadrilla?».
- **A las incidencias solo les aplica `teamId`**, porque V026 no las liga a una sección.
- **Al cumplimiento** le aplican `classItemId` y `typeItemId` (filtran actividades) y
  `sectorId` y `sectionId` (filtran lugares por su sección). `teamId` no le aplica, porque la
  ejecución por lugar no guarda la cuadrilla, y la UI lo dice junto a la tabla.
- **`unattended`** ordena por `lastAttendedOn` ascendente, las nulas primero, y luego por
  `areaM2` descendente. **`mostAttended`** ordena por `approvedInterventions` descendente, luego
  por `areaM2` descendente y luego por `code`.
- **`overdueTargets`** trae como máximo 5. El detalle completo está en `/admin/frecuencias`.

**Resumen para OSG**

- **`delta`:** en puntos porcentuales para `PERCENT` y en unidades para `COUNT`.
- **`trend`:** `FLAT` si el `delta` redondeado es 0, y `null` si falta alguno de los dos
  valores.
- **`higherIsBetter`:** solo colorea la variación si no es `null`. Que un mes haya más o menos
  incidencias resueltas no es bueno ni malo por sí mismo.
- **`progress`:** `min(value / target × 100, 100)`. La cifra real se muestra aparte, aunque
  supere la meta.
- **`coverageSeries.points`:** son los 6 meses que terminan en `month`. Un mes sin ningún
  trabajo aprobado en todo el campus vale `recorded: false` y `percent: null`, y se dibuja como
  hueco. Así los meses previos al uso del sistema no aparecen como 0 %.
- **`TREE_INVENTORY`:** cuenta los ejemplares `INDIVIDUAL` activos de especies `TREE` o `PALM`
  registrados hasta el último día del mes. Los dados de baja después se excluyen de todos los
  meses: es un límite declarado.
- **Códigos de motivo:** `unavailableReason` vale `RULE_NOT_DEFINED`, `UNIT_NOT_MODELED`,
  `NOT_RECORDED` o `NO_DEADLINES_CONFIGURED`, y en la cobertura de la Mensual
  `NO_SECTOR_ASSIGNED` (D-08). `targetReason` vale `NO_TARGET` o `TARGET_NOT_STORED`.
  `notEvaluableReason` vale `OUTSOURCED` o `BY_SECTOR` (D-05). El frontend los traduce a
  texto en `reportTexts.ts`.

**Errores**

- **400 para filtros mal formados o incoherentes** (`weekStart` que no es lunes, rango
  invertido): es forma de la petición, como `bbox`+`near` en SPEC-C03 §6.2.
- **404 para ids fuera del alcance**, no 403, para no confirmar que existen (SPEC-201).

**Parámetros en la URL de la pantalla (D-13)**

| Pestaña | Parámetros |
|---|---|
| `semanal` | `weekStart`, `sectorId` |
| `mensual` | `dateFrom`, `dateTo`, `sectorId`, `sectionId`, `teamId`, `classItemId`, `typeItemId` |
| `direccion` | `month` |

Al cambiar de pestaña se descartan los parámetros de las otras.

## 4. Migración de base de datos

**No crea tablas.** Solo agrega dos filas de metas en `system_parameters` (V003), para que
el resumen las lea de la BD y el ADMIN pueda cambiarlas en `/admin/parametros` sin tocar
código (A-08, INV-9). `Vnext` es un marcador documental: al implementar se toma el siguiente
número libre (REGLAS §0.2) y se actualiza el mapa de `REGISTRO.md`.

```sql
-- Owner: SPEC-202. Metas del resumen de dirección; sin tablas nuevas.
-- Valor inicial: la meta que el cliente declaró (dominio §7, C16): 100 % al mes.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
SELECT s.code, s.label, s.value, s.value_type, s.description, TRUE
FROM (VALUES
    ('REPORT_COVERAGE_TARGET_PERCENT', 'Meta de cobertura mensual (%)', '100', 'DECIMAL',
     'Porcentaje de la superficie de áreas verdes que debe recibir mantenimiento aprobado cada mes'),
    ('REPORT_IRRIGATION_TARGET_PERCENT', 'Meta de riego mensual (%)', '100', 'DECIMAL',
     'Porcentaje de la superficie de áreas verdes que debe regarse al menos una vez al mes')
) AS s(code, label, value, value_type, description)
WHERE NOT EXISTS (
    SELECT 1 FROM system_parameters p WHERE p.code = s.code AND p.deleted_at IS NULL);
```

**Por qué no hay otras metas:** la de arbolado (~3 500) es una estimación de entrevista, no
una meta acordada. Las de fitosanitario y poda mayor no tienen indicador calculable (§2.6
filas 24 y 25). Sembrarlas daría a entender que el sistema las mide.

Al editar estas metas se valida un rango de 1 a 100 con un chequeo explícito para cada
código en `SystemParametersService`, igual que cada parámetro numérico tiene el suyo: no
existe un rango genérico. Las lecturas usan los índices existentes:
`idx_intervention_locations_zone`, `idx_intervention_locations_completed`,
`idx_interventions_team_plan`, `idx_zones_parent_zone_id`, `idx_zones_boundary` (GIST) e
`idx_irrigation_turns_date_sector`.

## 5. Comportamiento

### 5.1 Flujo principal

1. Un usuario abre **Reportes** desde el sidebar. Se cargan las opciones y se abre la
   pestaña por defecto de su rol (D-13), que pide solo su propio endpoint.
2. **Semanal:** elige la semana («Semana anterior», «Semana siguiente» o un selector de
   fecha que se ajusta al lunes) y el sector. Ve:
   - aprobadas frente a la semana anterior, pendientes de aprobación y fotos sin subir;
   - secciones atendidas y riego del sector con `ProgressMeter`;
   - la tabla de intervenciones con tipo y lugares;
   - las secciones sin regar;
   - las incidencias abiertas con urgencia, estado y días abiertas.
3. **Mensual:** ve:
   - cobertura (con la etiqueta de regla provisional), labores e incidencias;
   - `SectorBars` por sector;
   - el cumplimiento por actividad con `ReportBadge`;
   - las secciones más atendidas y sin atención.
4. **Resumen para OSG:** elige el mes. Ve la cabecera, cada indicador con su valor, meta,
   `ProgressMeter` y variación frente al mes anterior, y `TrendLine` de los últimos 6 meses.
   Los indicadores sin fuente aparecen como «Sin datos» con su motivo.
5. **Cambios:** cambiar un filtro actualiza la URL y vuelve a pedir **solo** esa pestaña, sin
   recargar la página, y conserva los datos previos atenuados mientras carga. Recargar o usar
   «Atrás» restaura la pestaña y sus filtros.

### 5.2 Flujos alternativos

- **SUPERVISOR:**
  - Solo ve las pestañas Semanal y Mensual, con el aviso «Datos de tus cuadrillas».
  - Si pide `?tab=direccion`, la URL se reemplaza por `?tab=semanal`.
  - Si no tiene sectores, la Semanal muestra el estado vacío «Tu cuadrilla no tiene sector
    asignado; pide a la jefatura que lo registre».
- **Sector sin turno de riego en la semana:** el bloque de riego dice «Sin turno de riego
  registrado esta semana» y no muestra un 0 % (D-15).
- **Sector sin cuadrilla propia** (Polideportivo, Bosque húmedo): la Semanal muestra «Sin
  cuadrilla asignada». La Mensual añade la nota «Mantenimiento tercerizado o a demanda: su
  trabajo aún no se registra en el sistema».
- **Falla `/reports/options`:** la pestaña activa se consulta **sin parámetros de periodo**,
  para que el backend aplique sus valores por defecto en la zona configurada; el cliente no
  conoce esa zona sin `options`. La Semanal, que exige `sectorId`, no puede consultarse sin
  un sector en la URL y muestra el error. Los filtros muestran el error y «Reintentar».
- **Falla el endpoint de una pestaña:** ese panel muestra el error y «Reintentar», y las otras
  pestañas siguen funcionando.
- **Parámetros inválidos en la URL:** el frontend no consulta, muestra el error junto al
  filtro y ofrece volver al periodo por defecto.
- **Mes en curso en el Resumen para OSG:** se rotula «Mes en curso: cifras parciales».

### 5.3 Casos límite

**Trabajo e intervenciones**

- **Trabajo con tres ubicaciones y dos validadas:** no cuenta en ninguna pestaña; suma en
  «pendientes de aprobación» si las tres están ejecutadas.
- **Dos trabajos en la misma sección:** la sección cuenta una vez en la cobertura y dos en
  `approvedInterventions`.
- **Ubicación en una subsección:** cubre su sección padre. **Ubicación solo con punto:** no
  cubre, pero el trabajo suma en aprobadas.
- **Trabajo con ubicaciones en dos sectores:** aparece en la Semanal de ambos, y en cada uno
  solo con sus lugares.

**Fechas y periodos**

- **Ejecución el 31/10 a las 21:00 en Lima (02:00 UTC del 1/11):** cuenta en octubre y en la
  semana del 26/10.
- **Semana partida entre dos meses** (lunes 26/10 a domingo 1/11): se toma completa en la
  Semanal; la Mensual corta por fecha.
- **Resumen de un mes previo al uso del sistema:** sus indicadores valen 0 y su punto de la
  serie es un hueco. `previousValue` es `null` cuando el mes anterior no tiene registros.

**Incidencias**

- **Incidencia resuelta el jueves de una semana pasada:** en la Semanal de esa semana ya no
  figura abierta, porque el estado se toma al corte.
- **Incidencia con coordenadas fuera de toda sección y sin cuadrilla:** no se lista en ningún
  sector y suma en `unlocatedInScope`.

**Catastro y parámetros**

- **Sección sin `area_m2`:** suma en `sectionsWithoutArea` y no entra en las áreas.
- **Meta editada a 80:** el resumen calcula `progress` contra 80 desde la siguiente consulta.

## 6. Criterios de aceptación

**Generales: pestañas, permisos y presentación**

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-G01 | Una sola pantalla con tres pestañas y la pestaña en la URL | Abrir `/reportes?tab=semanal`: está activa «Semanal del sector». Pasar a «Mensual»: la URL cambia a `?tab=mensual`. «Atrás» vuelve a la Semanal |
| CA-G02 | Las pestañas se manejan con teclado | Con Tab se llega a la pestaña activa; ←/→ mueven el foco, Inicio/Fin van a los extremos, Enter/Espacio activan, y Tab entra al panel. El foco siempre es visible |
| CA-G03 | Cada rol ve solo sus pestañas | ADMIN y COORDINADOR ven las tres. SUPERVISOR ve Semanal y Mensual, y `?tab=direccion` lo deja en Semanal. OPERARIO no tiene el enlace «Reportes» y recibe 403 en `/api/v1/reports/*` |
| CA-G04 | El enlace directo «Reportes» existe | El sidebar muestra «Reportes» como enlace directo (no grupo) para ADMIN, COORDINADOR y SUPERVISOR |
| CA-G05 | Los gráficos funcionan en claro, en oscuro y con lector de pantalla | En ambos temas, barras, línea y meta se distinguen del fondo y no hay colores fuera de los tokens. Un lector de pantalla anuncia cada gráfico con un texto que incluye sus valores |
| CA-G06 | Usable en celular y en navegador real | A 390 px: sin scroll horizontal, pestañas de ≥44 px de alto y tablas como tarjetas. Sin errores de CORS ni `OPTIONS` con 401 en consola (INV-10) |

**Semanal del sector**

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-S01 | Lista las intervenciones aprobadas de la semana con tipo y lugar | Aprobar una intervención ejecutada el miércoles en una sección del sector 2: aparece con su tipo, sus lugares y su fecha de ejecución. Una con una ubicación aún `COMPLETED` no aparece y suma en «pendientes de aprobación» |
| CA-S02 | Compara con la semana anterior | Con 11 aprobadas la semana pasada y 14 en esta, el KPI dice «14» y «3 más que la semana anterior» |
| CA-S03 | Muestra el riego del sector y lo que quedó sin regar | Registrar un turno del sector 2 con 115 de sus 118 secciones: el bloque dice «115 de 118 secciones regadas» y lista las 3 restantes con su último riego. En una semana sin turnos dice «Sin turno de riego registrado esta semana» |
| CA-S04 | Muestra las incidencias abiertas del sector con sus días abiertas | Una incidencia con coordenadas en una sección del sector 2, registrada hace 3 días y en atención, aparece con «3 días», su urgencia y su estado. Al resolverla y recargar, desaparece de la semana en curso |
| CA-S05 | Las semanas pasadas reflejan el estado de esa semana | Una incidencia abierta al cierre del domingo 25/10 y resuelta el martes 27/10 aparece en la semana del 19/10 y no en la del 26/10 |
| CA-S06 | El SUPERVISOR solo ve su sector y sus cuadrillas | Como SUPERVISOR, el selector de sector solo lista los de sus cuadrillas, y `GET /reports/weekly?sectorId=<otro>` responde 404 |
| CA-S07 | La semana empieza el lunes | `GET /reports/weekly?weekStart=2026-10-28&sectorId=…` (un miércoles) responde 400. En la UI, elegir cualquier día ajusta la semana al lunes correspondiente |

**Mensual de la sección**

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-M01 | Solo cuenta el trabajo con aprobación final | Ejecutar una intervención de dos ubicaciones y validar una: ni la cobertura ni «aprobadas» cambian. Validar la otra y recargar: la sección pasa a cubierta |
| CA-M02 | La cobertura se pondera por superficie y muestra la regla provisional | Con 1000 m² cubiertos de 4000 en un sector, su barra muestra «25,0 %» y «1000 de 4000 m²». Junto a la cifra se lee la regla provisional |
| CA-M03 | Los filtros responden sin recargar y quedan en la URL | Elegir sector y clase: solo se pide `GET /reports/monthly` (pestaña Network), y la URL los contiene. Al recargar siguen aplicados |
| CA-M04 | Lo no evaluable no se presenta como cumplido | Una frecuencia `OUTSOURCED` o `BY_SECTOR` aparece como «No evaluable» en gris |
| CA-M05 | Lo vencido se destaca en rojo | Un lugar fuera de tolerancia aparece con badge `danger` «Fuera de plazo» y su nombre |
| CA-M06 | La fecha civil usa la zona configurada | Una ejecución a las 02:00 UTC del 1/11 cuenta en octubre |

**Resumen para OSG**

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-D01 | Cada indicador disponible muestra valor, meta y variación | Para octubre, «Cobertura de las áreas verdes» muestra el porcentaje, «Meta: 100 %», su barra de avance y «▲ 4,8 pts frente a septiembre» |
| CA-D02 | La meta sale de los parámetros del sistema | Como ADMIN, cambiar «Meta de cobertura mensual» a 80 en `/admin/parametros`: el resumen muestra «Meta: 80 %» y recalcula la barra |
| CA-D03 | La serie de 6 meses se dibuja con la meta marcada | Se ve la línea de mayo a octubre y una línea discontinua en la meta. Los meses sin registros aparecen como hueco y no como 0 %, y su texto alternativo lo dice |
| CA-D04 | Lo que no tiene fuente se muestra «Sin datos» con su motivo | Ciclos de riego, controles fitosanitarios, poda mayor e incidencias de urgencia alta en plazo aparecen como «Sin datos», cada uno con su motivo y sin cifras inventadas |
| CA-D05 | El SUPERVISOR no accede | Como SUPERVISOR no hay pestaña «Resumen para OSG», y `GET /reports/direction` responde 403 |
| CA-D06 | El mes en curso se rotula como parcial | `?tab=direccion&month=<mes actual>` muestra «Mes en curso: cifras parciales». Un mes futuro responde 400 |
| CA-D07 | La variación respeta el sentido del indicador | Una baja de cobertura se muestra con badge `danger`. Una variación de «incidencias resueltas» se muestra en `neutral` |

## 7. Especificación visual

### 7.1 Estructura

- **Cabecera:** `Breadcrumb` «Inicio / Reportes», título «Reportes» y, debajo, las pestañas.
  Cada panel abre con su periodo en texto («Semana del 26 de octubre al 1 de noviembre de 2026»).
- **Semanal:**
  - fila de KPIs: aprobadas con su variación, pendientes de aprobación y fotos sin subir;
  - dos `ProgressMeter`: secciones atendidas y riego;
  - tabla de intervenciones;
  - lista «Sin regar esta semana»;
  - tabla de incidencias con `UrgencyBadge` y `StatusBadge`.
- **Mensual:**
  - KPIs;
  - `SectorBars`;
  - tabla de cumplimiento con `ReportBadge` y el enlace «Ver detalle por lugar»;
  - listas de secciones más atendidas y sin atención.
- **Resumen para OSG:**
  - cabecera con la superficie de áreas verdes, el campus y las cuadrillas;
  - una fila por indicador: nombre, descripción, valor, meta, `ProgressMeter` y `ReportBadge`
    de variación;
  - `TrendLine`.

  Sin bloque de observaciones (§2.6 fila 29).

### 7.2 Pestañas y teclado (patrón «tabs» de WAI-ARIA, activación manual)

**Estructura ARIA**

- `ReportTabs` usa `role="tablist"` con `aria-label="Reportes"`.
- Cada pestaña es un `button` con `role="tab"`, `aria-selected`, `aria-controls` y
  `tabIndex` móvil: 0 en la activa y -1 en las demás.
- El panel lleva `role="tabpanel"`, `aria-labelledby` y `tabIndex=0`.

**Teclado**

- ←/→ mueven el foco entre pestañas de forma cíclica, y Inicio/Fin van a los extremos.
- **Enter/Espacio activan.** La activación es manual porque cada pestaña dispara una consulta
  y no debe pedirse al solo pasar el foco.
- Tab sale de la lista al panel. El foco se ve con el anillo `brand-600` (SPEC-C01 §8.4).

**Al activar una pestaña**

- Se actualiza la URL y se enfoca el título del panel.
- Una región `aria-live="polite"` anuncia «Mostrando Mensual de la sección».

### 7.3 Móvil (<640 px) y tablet

**Móvil**

- **Pestañas:** tres botones del mismo ancho, de 44 px de alto como mínimo, con rótulos cortos
  («Semanal», «Mensual», «OSG»). El rótulo completo va en `aria-label`. Sin scroll horizontal.
- **Filtros:** se pliegan tras «Filtros (n)».
- **Columnas:** los KPIs en una columna en móvil y en dos en tablet; las tablas pasan a
  tarjetas (`DataTableCards`).
- **Gráficos:** ocupan el 100 % del ancho mediante `viewBox`. En `SectorBars`, la etiqueta pasa
  encima de la barra. `TrendLine` muestra solo el último valor rotulado; los demás quedan en
  su texto alternativo y en la tabla accesible.
- **Navegación de la Semanal:** «Semana anterior» y «Semana siguiente» van en el tercio
  inferior de la pantalla (SPEC-C01 §7.4), porque esa pestaña la usa el capataz en campo.

**Desktop**

- KPIs en 3 o 4 columnas, y bloques en dos columnas.

### 7.4 Estados por pestaña

Cada panel tiene los suyos y no afecta a los otros.

| Estado | Semanal | Mensual | Resumen para OSG |
|---|---|---|---|
| Carga inicial | `LoadingSkeleton` de KPIs, dos medidores y tablas | De KPIs, barras, tabla y listas | De la cabecera, 9 filas de indicadores y el gráfico |
| Recarga por filtro | Datos previos atenuados y `aria-busy` | Ídem | Ídem |
| Vacío | «No hay trabajo aprobado esta semana en este sector» (distinto de «Sin sector asignado») | «No hay trabajo aprobado en este periodo» / «Tu filtro no encontró secciones» | Indicadores en 0 y la serie con huecos; no es un error |
| Error | Bloque con el mensaje (SPEC-C02 §6) y «Reintentar» | Ídem | Ídem |
| Sin permiso (403) | — | — | No se muestra la pestaña |

### 7.5 Gráficos: color, temas y texto alternativo

**Color y temas**

- Solo clases de tokens dentro del SVG: `fill-brand-600` (valor), `fill-neutral-200` (pista),
  `stroke-brand-600` (línea), `stroke-neutral-500` con `stroke-dasharray` (meta) y
  `fill-neutral-700` (textos).
- Las variables cambian bajo `.dark`, así que el modo oscuro no requiere código propio. El
  ancho de una barra es el único estilo dinámico permitido (SPEC-C01 §10.1).

**Accesibilidad**

- Cada SVG lleva `role="img"`, `aria-labelledby` hacia `<title>` y `<desc>`, y un `<desc>`
  generado con los datos. Ejemplo: «Cobertura mensual: mayo sin registros, … octubre 62,9 %;
  meta 100 %».
- `TrendLine` y `SectorBars` llevan además una tabla `sr-only` con los mismos valores.
- Nunca se depende solo del color: cada barra muestra su cifra en texto, la variación lleva
  ▲/▼/= y una palabra, y la meta lleva rótulo.

**Textos**

- En español y externalizados en `reportTexts.ts`. Inter y los tokens del producto. No se usan
  IBM Plex ni la paleta del HTML de referencia.
- Las cifras de los reportes se formatean con la configuración regional `es`: coma decimal y
  sin separador de miles en cuatro cifras («25,0 %», «1000 de 4000 m²»), como piden los
  criterios. Otras pantallas usan `es-PE`, que da «25.0» y «1,000»; la diferencia es
  deliberada y se limita a este módulo.

## 8. Tests

Se escriben antes de la implementación. Agrupados por regla:

```
Qué cuenta y fechas (D-02, D-14)
- ubicación OBSERVED o COMPLETED → el trabajo no cubre ni suma en aprobadas
- trabajo cancelado o borrado → nunca cuenta
- la aprobación final usa la misma constante que InterventionExecutionHistoryProvider
- completed_at 2026-11-01T02:00Z en America/Lima → octubre y semana del 26/10
- piezas del mismo trabajo en dos semanas → cuenta en la de su última ejecución en esa sección
- ReportPeriods: weekStart que no es lunes → error; una semana va de lunes a domingo; el último mes cerrado se calcula bien en enero

Cobertura (D-01, D-03, D-04, D-12)
- dos trabajos en la misma sección → el área se cuenta una vez
- subsección → cubre la sección padre; place con zone_id → cubre esa sección; solo punto → no cubre
- sección sin area_m2 → sectionsWithoutArea; denominador vacío → percent null
- CoverageCalculator: half-up a un decimal

Semanal
- intervención con ubicaciones en dos sectores → aparece en ambos, cada uno con sus lugares
- aprobadas de la semana anterior se calculan con la misma regla
- riego: sección en un turno de otro sector → no cuenta para este; sin turnos → turns 0 y percent null
- incidencia con coordenadas dentro de una sección del sector → locatedBy COORDINATES
- incidencia sin coordenadas y con cuadrilla de ese sector → locatedBy TEAM
- incidencia no ubicable → solo suma en unlocatedInScope
- estado al corte con incident_status_history: resuelta antes del corte → no aparece; registrada después → no aparece
- daysOpen = fecha civil del corte − fecha civil del registro
- description se recorta a 140 caracteres con "…"
- 50 intervenciones como máximo en items, con total exacto

Mensual
- sectionId fuera de sectorId → 400; typeItemId no hijo de classItemId → 400; rango > 366 días → 400
- teamId de ADMIN restringe el numerador, no el denominador
- cumplimiento: tramos ON_TARGET y OVERDUE → OVERDUE; OUTSOURCED y BY_SECTOR → evaluable false
- overdueTargets limitado a 5

Resumen para OSG (D-16)
- meta leída de REPORT_COVERAGE_TARGET_PERCENT; si el parámetro falta → target null con TARGET_NOT_STORED
- progress se topa en 100; delta en puntos para PERCENT; FLAT si el delta redondeado es 0
- previousValue null → trend null
- serie: 6 puntos que terminan en month; un mes sin trabajo aprobado → recorded false, percent null
- TREE_INVENTORY solo cuenta INDIVIDUAL de TREE o PALM, activos y registrados hasta fin de mes
- los cuatro indicadores sin fuente → available false con su motivo y value null
- month futuro o mal formado → 400

Alcance (D-07, D-08)
- SUPERVISOR: sectores = los de activeSectorsOfSupervisor; otro sector o cuadrilla → 404
- SUPERVISOR → 403 en /direction; OPERARIO → 403 en los cinco endpoints
- SUPERVISOR sin sectores → weekly 404 en cualquier sectorId; monthly con coverage.available false
- ADMIN entra a las tres sin cambiar el mapeo global de roles
- incidencias del SUPERVISOR: solo enviadas por él o asignadas a sus cuadrillas

Migración Vnext
- MigrationNumberingTest y MigrationSmokeTest siguen en verde
- aplicar la migración dos veces no duplica los parámetros

Frontend
- ReportTabs: roles tablist/tab/tabpanel y aria-selected; ←/→ con ciclo; Inicio/Fin; Enter/Espacio activan; las flechas no disparan consultas
- tab inválido o no permitido → router.replace a la pestaña del rol
- cambiar de pestaña → router.push con solo los parámetros de la nueva; Atrás restaura
- cada panel consulta solo cuando está activo; el error de uno no afecta a otro
- SectorBars, TrendLine y ProgressMeter: <title> y <desc> con los valores; tabla sr-only; solo clases de tokens, sin hex
- TrendLine: un punto null deja un hueco y no una caída a 0
- ReportBadge: OVERDUE → danger; variación con higherIsBetter null → neutral
- a 390 px, pestañas de 44 px de alto y sin desbordamiento (prueba de clases del contenedor)
- el enlace Reportes solo aparece para ADMIN, COORDINADOR y SUPERVISOR
```

## 9. Propio de este spec

**Reglas**

- **Las reglas provisionales siempre se ven** junto a su cifra: sección cubierta (D-01) y
  sección regada (D-15). Cuando el cliente las valide o las cambie, se actualizan las
  decisiones y los textos, y se anota en `REGISTRO.md`.
- **Las incidencias se muestran con lo mínimo:** descripción recortada, referencia, urgencia,
  estado, cuadrilla y días. Sin fotos, coordenadas ni historial: el detalle sigue gobernado
  por SPEC-201.
- **El alcance se calcula en cada petición** contra `teams`, nunca desde el JWT (SPEC-001
  Anexo A).

**Fuera de esta entrega:** exportación PDF/Excel (F-05) y mapa de calor (F-06).

**Por validar con el cliente o el equipo:**

1. Las reglas de sección cubierta (D-01) y sección regada (D-15). También si los porcentajes
   del campus deben incluir los sectores sin cuadrilla propia: el riego del Polideportivo lo
   hace un tercero y no se registra, así que la cobertura de riego del campus nunca llegaría
   al 100 %.
2. **Sector de las cuadrillas (`teams.zone_id`):** hoy no está cargado para ninguna cuadrilla
   real. Sin él, la Semanal del SUPERVISOR y su cobertura no están disponibles. Es un dato que
   A-07 debe completar, no código. *El equipo aceptó esta dependencia el 4 nov 2026, con el
   aviso en pantalla; para probar ambos caminos hay una semilla solo de desarrollo
   (`db/dev-migration/R__seed_demo_reports.sql`).*
3. **Indicadores sin fuente:**
   - Ciclo de riego completo: falta su definición (catálogo 7.2).
   - Plazos de atención por urgencia: los 24/48/72 h no están confirmados (5.6).
   - Qué es un «control fitosanitario» y cómo se registra.
   - Poda mayor: es tercerizada.
   - Meta del catastro de arbolado.
   - Insumos consumidos: no hay módulo.
   - Personas por cuadrilla: los operarios no tienen cuenta.
   - Observaciones de la jefatura: requerirían una tabla.
4. **ADMIN e incidencias:** el Anexo A le da lectura de incidencias, pero SPEC-201 lo dejó
   fuera de su prueba de concepto. Este spec le muestra la lista resumida de la Semanal y le
   oculta el enlace al detalle. Hay que reconciliar ambos specs. *El equipo aprobó esta
   solución provisional el 4 nov 2026.*
5. Si se conserva el KPI informativo «pendientes de aprobación».

**Checklist propio** (el común está en `REGLAS.md` §6):

- [ ] Una sola definición de «aprobación final», compartida con `InterventionExecutionHistoryProvider`.
- [ ] El SUPERVISOR consulta en Reportes los sectores de las cuadrillas que dirige, según D-08.
- [ ] Enmienda de colores aplicada a SPEC-C01 §3.1 y anotada en `REGISTRO.md`.
- [ ] Sin dependencias nuevas en `package.json` ni en `pom.xml`.
- [ ] Mapa de migraciones de `REGISTRO.md` actualizado con el número real de `Vnext`.
- [ ] Verificado en navegador real como ADMIN, COORDINADOR, SUPERVISOR y OPERARIO, a 390 y
      1440 px, en tema claro y oscuro.
