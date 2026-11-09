# Planificación preventiva por conjuntos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el coordinador vea qué mantenimiento preventivo toca planificar, en qué conjunto de jardines y con qué urgencia, y cree la intervención desde ahí.

**Architecture:** Conjuntos guardados de secciones (tablas nuevas) + un engine puro `engine/planning` que calcula el estado de cada par conjunto × actividad a partir de las fechas de completado por jardín. El módulo `planning` orquesta; `interventions` le entrega las fechas por un puerto. Las frecuencias cambian de alcance (`BY_SET`), pierden «Teórico» y el reporte mensual pasa a `EARLY/ON_TARGET/OVERDUE` con una sola regla efectiva por jardín.

**Tech Stack:** Spring Boot 4.1.1, Java 26, PostgreSQL/PostGIS + Flyway, JUnit 5 + AssertJ + Testcontainers; Next.js 16 + TypeScript, Jest + Testing Library, three.js.

**Spec:** [`specs/features/SPEC-203-planificacion-preventiva.md`](../../specs/features/SPEC-203-planificacion-preventiva.md)

## Global Constraints

- Ningún archivo de código supera 200 líneas; controllers ≤ 100, services ≤ 150, engine ≤ 150 (CLAUDE.md del usuario; memoria: hasta 200 vale en cualquier capa, solo >200 se parte).
- Sobre `{ok, message, data}` (INV-1); toda tabla con `created_at`, `updated_at`, `deleted_at` y entidad que extiende `BaseEntity` (INV-3, INV-4); sin `enum` de dominio (INV-2). `PlanningState` y `ComplianceStatus` son resultados de cálculo y sí son `enum`.
- Todo texto visible al usuario y todo mensaje de error, en español.
- En la interfaz nunca aparecen «ronda», «ritmo», «alcance» ni «scope». «propio de este conjunto» solo en la pantalla de frecuencias.
- Fechas: `completed_at` → fecha local con `hesperides.maintenance.time-zone` (por defecto `America/Lima`). «Hoy» sale de un `java.time.Clock` inyectable.
- Constante `NEAR_DUE_DAYS = 7`.
- Roles: ADMIN y COORDINADOR para conjuntos, planificación y frecuencias (incluida la lectura). SUPERVISOR y OPERARIO → 403.
- Migración: siguiente número libre al implementar (en `origin/develop` es `V030`; comprobar `ls backend/src/main/resources/db/migration` y el mapa de `specs/REGISTRO.md` justo antes). Cabecera SQL: `-- Propietaria: SPEC-203`.
- Comandos: backend `cd backend && ./mvnw -B test` (JDK 26, Docker activo para Testcontainers); frontend `cd frontend && npm.cmd test -- --runInBand`, `npm.cmd run lint`, `npm.cmd run build`.
- Conventional Commits en español, cada uno con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Rama `docs/spec-203-planificacion-preventiva` (renombrar a `feature/spec-203-planificacion-preventiva` antes de la primera tarea de código).

## Review Focus

1. **Conjunto «Todo el campus» con ~530 jardines** que se prellena en el registro de intervención: el formulario debe cargar y guardar sin bloquearse. → test en Task 14.
2. **Cambio de año** (31 dic → 1 ene) y años bisiestos en la cuota anual: el conteo es por año calendario y la estimada no queda en el pasado lejano. → tests en Task 5.
3. **Intervención abierta que mezcla jardines de dentro y de fuera del conjunto**: el avance «X de N» cuenta solo jardines del conjunto. → test en Task 5.
4. **Request de conjunto con `zoneIds` duplicados o nombre con espacios**: se deduplica y se recorta; un nombre vacío tras recortar da 422. → tests en Task 3.
5. **Sección dada de baja que sigue en un conjunto**: no cuenta en el cálculo, en `zoneCount` ni en el mapa. → test en Task 6.

---

### Task 1: Veredictos `EARLY` / `ON_TARGET` / `OVERDUE` y fuera «Teórico» del engine

**Files:**
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/engine/frequency/{ComplianceStatus,IntervalEvaluator,FrequencyRule,SeasonalInterval}.java`
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/engine/reporting/VerdictAggregator.java`
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/maintenance/entity/{MaintenanceFrequency,MaintenanceFrequencySeason}.java` (solo `toRule()`: dejar de pasar el teórico; las columnas se quitan en Task 2)
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/reports/{service/ComplianceSummary.java,dto/MonthlyReportResponse.java}`
- Modify: `shared/types/maintenance.ts`, `shared/types/` del reporte mensual, `frontend/src/components/reports/monthly/ComplianceTable.tsx`, `frontend/src/components/reports/reportTexts.ts`, `ReportBadge.tsx`, `frontend/src/components/maintenance/LocationCompliancePanel.tsx` (etiquetas)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/engine/frequency/FrequencyEvaluatorTest.java`, el test de `VerdictAggregator`, `ComplianceSummary` y `frontend/src/components/reports/__tests__/MonthlyReport.test.tsx`

**Interfaces:**
- Produces: `ComplianceStatus { ON_TARGET, EARLY, OVERDUE, NOT_APPLICABLE, NOT_CONFIGURED }` (sin `WITHIN_TOLERANCE`). `FrequencyRule(Long configId, String ruleTypeCode, Integer minDaysInterval, Integer maxDaysInterval, Integer annualTargetCount, Integer coverageTargetDays, Integer seasonStartMonth, Integer seasonEndMonth, List<SeasonalInterval> seasons, LocalDate validFrom, LocalDate validTo)`. `SeasonalInterval(String season, int startMonth, int endMonth, Integer minDaysInterval, Integer maxDaysInterval)`. `MonthlyReportResponse.ActivityCompliance` con `early` en lugar de `withinTolerance`.

- [ ] **Step 1: Tests que fallan** en `FrequencyEvaluatorTest` (nuevo `@Nested class RangoNormal`), con regla 30–35 sin estaciones y otra con estación de primavera (oct–dic) 30–35:

```java
@Test void diezDiasEsAntesDelMinimo()   { assertThat(evaluar(30, 35, cortesSeparados(10)).status()).isEqualTo(ComplianceStatus.EARLY); }
@Test void treintaYTresEsEnPlazo()      { assertThat(evaluar(30, 35, cortesSeparados(33)).status()).isEqualTo(ComplianceStatus.ON_TARGET); }
@Test void treintaYSeisEsVencido()      { assertThat(evaluar(30, 35, cortesSeparados(36)).status()).isEqualTo(ComplianceStatus.OVERDUE); }
// Los mismos tres con la regla estacional y fechas en noviembre.
```
`VerdictAggregator`: `mostSevere(List.of(ON_TARGET, EARLY)) == EARLY`, `mostSevere(List.of(EARLY, OVERDUE)) == OVERDUE`. `ComplianceSummary.row`: una ubicación `EARLY` suma en `early()`. Frontend: `ComplianceTable` muestra la columna «Antes del mínimo» y no «Dentro de tolerancia».

- [ ] **Step 2:** `./mvnw -B test -Dtest='FrequencyEvaluatorTest,VerdictAggregator*,ComplianceSummary*'` → FAIL (no existe `EARLY`).
- [ ] **Step 3: Implementar.** En `IntervalEvaluator`: medido < min → `EARLY`; min ≤ medido ≤ max → `ON_TARGET`; > max → `OVERDUE` (`esperado` = min, `limite` = max; con `COVERAGE_CYCLE` min = max = coverage). El caso de una sola ejecución no cambia. Quitar `targetDaysInterval` de los records y de `esperadoDe`. Gravedad: `OVERDUE > EARLY > ON_TARGET > NOT_APPLICABLE > NOT_CONFIGURED` (conservar la posición actual de las dos últimas). `EARLY` = `Badge` neutral, etiqueta «Antes del mínimo». Ajustar las pruebas existentes que esperaban `WITHIN_TOLERANCE` o el teórico.
- [ ] **Step 4:** backend completo y `npm.cmd test -- --runInBand` → PASS.
- [ ] **Step 5: Commit** `fix(frecuencias): el rango de dias se lee como lo normal y atender antes del minimo se ve`

### Task 2: Migración de conjuntos y alcance `BY_SET` de las frecuencias

**Files:**
- Create: `backend/src/main/resources/db/migration/V030__create_green_area_sets.sql` (número según Global Constraints)
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/maintenance/entity/{MaintenanceFrequency,MaintenanceFrequencySeason}.java` (fuera `zoneId` y `targetDaysInterval`, entra `greenAreaSetId`)
- Modify: `modules/maintenance/dto/{Create,Update}MaintenanceFrequencyRequest.java`, `MaintenanceFrequencyResponse.java`, `SeasonalIntervalPayload.java`, `service/{FrequencyRuleValidator,FrequencyFieldMapper,FrequencyVersioning,MaintenanceFrequenciesServiceImpl}.java`, `repository/MaintenanceFrequenciesRepository.java`
- Modify: `backend/src/main/resources/db/dev-migration/R__seed_demo_reports.sql`
- Modify: `shared/types/maintenance.ts` (fuera `zoneId`, `targetDaysInterval`; entra `greenAreaSetId: number | null`, `scope: 'CAMPUS_WIDE' | 'BY_SET'`)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/migration/GreenAreaSetsMigrationTest.java`, `MaintenanceFrequenciesServiceImplTest.java`

**Interfaces:**
- Produces: tablas `green_area_sets`, `green_area_set_zones`, `green_area_set_activities` y la columna `maintenance_frequencies.green_area_set_id`, con el DDL literal de SPEC-203 §4. `MaintenanceFrequency.getGreenAreaSetId(): Long`. `MaintenanceFrequenciesRepository.findCurrentInHouse(): List<MaintenanceFrequency>` (vigentes, `IN_HOUSE`, no `ON_DEMAND`, con estaciones).

- [ ] **Step 1: Test de migración que falla** con el patrón de `InterventionsMigrationTest`: migra hasta la versión anterior, siembra datos y migra al final. Siembra: dos reglas `BY_ZONE` sobre la sección S (actividades A y B, una con versión cerrada y otra dada de baja), una `BY_SECTOR` con `zone_id` = sector X, una `BY_SECTOR` sin `zone_id` de la actividad C sin regla general, y una de la actividad A sin `zone_id` que choca con una `CAMPUS_WIDE` vigente de A. Aserciones:
  - un solo conjunto llamado como S, con S y las actividades A y B; todas las filas `BY_ZONE`, incluidas la cerrada y la dada de baja, quedan `BY_SET` apuntando a él;
  - conjunto «<nombre de X>» con las secciones activas de X; si el nombre ya estaba tomado, «<nombre> (sector)»;
  - la `BY_SECTOR` de C queda `CAMPUS_WIDE` y vigente; la de A queda `CAMPUS_WIDE` con `valid_to` = fecha de la migración;
  - no queda ninguna fila `BY_ZONE`/`BY_SECTOR`; no existen las columnas `zone_id` ni `target_days_interval` (`information_schema.columns`);
  - insertar `BY_SET` sin conjunto viola el CHECK; dos conjuntos activos «Prueba»/«prueba» violan el índice único.
- [ ] **Step 2:** `./mvnw -B test -Dtest=GreenAreaSetsMigrationTest` → FAIL.
- [ ] **Step 3: Escribir la migración** (DDL de §4 y conversión en el orden de §4; el `UPDATE ... valid_to` del choque, antes de cambiar el índice único). Adaptar la entidad, los DTO y el validador: `scope ∈ {CAMPUS_WIDE, BY_SET}`, `BY_SET` exige `greenAreaSetId` de un conjunto activo (422 «El conjunto no existe o fue dado de baja»), `CAMPUS_WIDE` lo prohíbe. `FrequencyVersioning` copia `greenAreaSetId`. `ComplianceReader` filtra por `greenAreaSetId` en lugar de `zoneId` (la regla efectiva llega en Task 7) y deja de tener ramas `BY_SECTOR`. `ComplianceSummary` pierde la razón `BY_SECTOR`. El seed de desarrollo deja de usar las columnas quitadas.
- [ ] **Step 4:** `./mvnw -B test` → PASS (`MigrationNumberingTest` y `MigrationSmokeTest` incluidos).
- [ ] **Step 5: Commit** `feat(db): conjuntos de areas verdes y alcance por conjunto en las frecuencias`

### Task 3: API de conjuntos de áreas verdes

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/planning/sets/{entity/GreenAreaSet,entity/GreenAreaSetZone,entity/GreenAreaSetActivity,repository/GreenAreaSetsRepository,repository/GreenAreaSetZoneQueries,service/GreenAreaSetsService,service/GreenAreaSetsServiceImpl,service/GreenAreaSetRules,controller/GreenAreaSetsController,dto/GreenAreaSetRequest,dto/GreenAreaSetSummary,dto/GreenAreaSetDetail}.java`
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/shared/audit/AuditActionCode.java` (`GREEN_AREA_SET_CREATED`, `GREEN_AREA_SET_UPDATED`, `GREEN_AREA_SET_DELETED`), `specs/fundacionales/SPEC-004-auditoria.md` §3.2
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/planning/sets/{GreenAreaSetsServiceImplTest,GreenAreaSetsControllerTest}.java`

**Interfaces:**
- Consumes: tablas de Task 2.
- Produces:
  - `GreenAreaSetsService`: `List<GreenAreaSetSummary> list()`, `GreenAreaSetDetail get(long id)`, `GreenAreaSetDetail create(GreenAreaSetRequest r)`, `GreenAreaSetDetail update(long id, GreenAreaSetRequest r)`, `void delete(long id)`.
  - `GreenAreaSetsRepository.activeSetsWithZonesAndActivities(): List<SetSnapshot>` con `record SetSnapshot(long id, String name, Set<Long> zoneIds, Set<Long> activityTypeItemIds)`. Solo cuenta secciones activas (no dadas de baja); Task 6 lo consume.
  - JSON exacto de SPEC-203 §3.1. `GreenAreaSetDetail` incluye `List<String> warnings`.
  - Ruta base `/api/v1/green-area-sets`, `@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")`.

- [ ] **Step 1: Tests que fallan** (servicio con mocks):
  - nombre recortado: «  Pabellones » se guarda «Pabellones»; «pabellones» con un activo «Pabellones» → 422 «Ya existe un conjunto con ese nombre» (SPEC-203 §8); con el anterior dado de baja → se acepta;
  - nombre vacío tras recortar → 422; `zoneIds` vacío → 422; `activityTypeItemIds` vacío → 422;
  - `zoneIds` `[112,112,113]` → guarda dos;
  - un id de sector o subsección → 422 con «Solo se pueden agregar secciones: 7, 9»;
  - `update` con `version` vieja → `ConflictException`;
  - `delete` con una regla `BY_SET` vigente sobre el conjunto → 422 «Quita primero la frecuencia propia de este conjunto»;
  - `warnings` cuando una sección queda en dos conjuntos con regla propia para la misma actividad: «La sección 113 ya sigue otra frecuencia propia de Corte de césped en «Pabellones»; se usará la más frecuente»;
  - se emite la acción auditable con el id y la cantidad de jardines.
  Controller: SUPERVISOR y OPERARIO → 403 en los cinco endpoints; COORDINADOR → 200/201.
- [ ] **Step 2:** `./mvnw -B test -Dtest='GreenAreaSets*'` → FAIL.
- [ ] **Step 3: Implementar.** `displayName` = nombre del lugar activo de menor `id` con `places.zone_id` = la sección; si no hay, el nombre de la sección. `GreenAreaSetRules` (puro, sin Spring) concentra la normalización y los mensajes.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(planificacion): conjuntos de areas verdes guardados`

### Task 4: Puerto de fechas por jardín

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/planning/attendance/{GardenAttendanceProvider,GardenCompletion,OpenWork}.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/interventions/repository/GardenAttendanceSql.java`, `.../interventions/service/InterventionGardenAttendance.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/interventions/GardenAttendanceIntegrationTest.java` (Testcontainers, patrón de `InterventionsIntegrationTest`)

**Interfaces:**
- Produces:
  - `record GardenCompletion(long zoneId, long interventionId, LocalDate date)`
  - `record OpenWork(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate, Set<Long> zoneIds)`: `firstStartedDate` es nulo si ninguna ubicación empezó; `zoneIds` son solo las secciones pedidas.
  - `interface GardenAttendanceProvider { List<GardenCompletion> completions(long activityTypeItemId, Collection<Long> zoneIds); List<OpenWork> openWorks(long activityTypeItemId, Collection<Long> zoneIds); }`. Se declara en `planning`; `interventions` lo implementa (`@Component`). `planning` no importa nada de `interventions`.

- [ ] **Step 1: Test de integración que falla.** Siembra intervenciones del tipo A sobre las secciones S1 y S2:
  - ubicación `COMPLETED` sin validar en S1 → aparece;
  - `VALIDATED` → aparece; `OBSERVED` → no; `IN_PROGRESS` → no;
  - intervención cancelada o dada de baja → no aparece;
  - ubicación con `place_id` de un lugar cuyo `zone_id` = S2 → aparece como S2;
  - ubicación sobre el sector padre → no aparece para S1;
  - `completed_at = 2026-11-08T04:30:00Z` (23:30 en Lima del 7 nov) → fecha `2026-11-07`;
  - otro tipo de actividad → no aparece.
  `openWorks`: una intervención de A no cancelada con S1 `IN_PROGRESS` y S2 `ASSIGNED` → `firstStartedDate` = día de inicio de S1 y `zoneIds = {S1, S2}`; una sin ubicaciones empezadas → `firstStartedDate == null`; con todas las ubicaciones completadas → no aparece.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar** con `NamedParameterJdbcTemplate` y SQL parametrizado. «Cancelada» se lee igual que en `InterventionExecutionHistoryProvider`/`FinalApprovalSql`; la zona horaria viene de la misma propiedad.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(intervenciones): fechas de completado por jardin para la planificacion`

### Task 5: Engine de planificación

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/engine/planning/{PlanningState,PlanningVerdict,GardenHistory,OpenRound,Rhythm,PlanningEvaluator,IntervalPlanning,QuotaPlanning,WindowPlanning,EffectiveRule,PlanningOrder}.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/engine/planning/{PlanningEvaluatorTest,EffectiveRuleTest,PlanningOrderTest}.java`

**Interfaces:**
- Consumes: `FrequencyRule` y `FrequencyRule.intervaloEn(LocalDate)` (Task 1).
- Produces:
  - `enum PlanningState { OVERDUE, DUE, IN_PROGRESS, SCHEDULED, NOT_DUE, DONE_FOR_PERIOD, NOT_CONFIGURED }`
  - `record GardenHistory(long zoneId, List<GardenDate> dates)` con `record GardenDate(long interventionId, LocalDate date)` anidado
  - `record OpenRound(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate, Set<Long> zoneIds)`
  - `record Rhythm(Integer minDays, Integer maxDays, String seasonLabel, Integer annualTarget, Integer windowStartMonth, Integer windowEndMonth)`
  - `record Progress(int done, int total)`
  - `record PlanningVerdict(PlanningState state, Integer days, LocalDate lastDate, Integer daysSinceLast, Progress progress, int neverAttendedCount, OpenRound openRound, LocalDate estimatedDate, Integer yearCount, LocalDate suggestedDate, Rhythm rhythm)`
  - `PlanningEvaluator.evaluate(FrequencyRule rule, List<GardenHistory> gardens, List<OpenRound> open, LocalDate today): PlanningVerdict`; con `rule == null` → `NOT_CONFIGURED`
  - `EffectiveRule.forGarden(List<FrequencyRule> ownRules, FrequencyRule campusWide, LocalDate at): FrequencyRule`: la propia de menor `intervaloEn(at).min()`; si no hay propias, `campusWide`; puede devolver null
  - `EffectiveRule.recentMinDays(FrequencyRule rule, LocalDate last, LocalDate scheduled): OptionalInt`: el mínimo si `scheduled < last + min` y la regla es `INTERVAL_DAYS` o `COVERAGE_CYCLE`; vacío en otro caso
  - `PlanningOrder.COMPARATOR: Comparator<PlanningVerdict>`

- [ ] **Step 1: Tests que fallan**, uno por fila de la tabla de SPEC-203 §5.5 y §8 «Engine». Hoy = 2026-11-08 y la regla tiene primavera (oct–dic) 30–35:
  - ref + 29 → `NOT_DUE`, `days=1`; ref + 30 → `DUE`, `days=5`; ref + 35 → `DUE`, `days=0`; ref + 36 → `OVERDUE`, `days=1`;
  - jardines con últimas veces 30 sep y 20 oct → `lastDate=2026-09-30` (manda la más antigua), `daysSinceLast=39`, `OVERDUE days=4`;
  - un jardín sin fechas → `DUE`, `days=null`, `neverAttendedCount=1`;
  - ref en marzo con verano 20–25 y hoy en abril → usa 20–25 (estación de ref);
  - cuota 4, van 3, ref 15 ago → `estimatedDate=2026-11-14`, `DUE` (hoy ≥ 14 nov − 7); van 0 al 1 nov con ref null → `estimatedDate` ≤ 31 dic y ≥ hoy; van 4 → `DONE_FOR_PERIOD`; la cuota nunca da `OVERDUE`;
  - **(Review Focus 2)** cuota con ref 20 dic 2026 y hoy 2 ene 2027 → `yearCount` cuenta solo 2027 (0); 2028 bisiesto no rompe la estimada;
  - ventana dic–ene: hoy 15 ene sin completar → `DUE`, `days` = hasta el 31 ene; hoy 1 feb sin completar → `OVERDUE days=1`; todos completados en la ventana → `DONE_FOR_PERIOD`; hoy 8 nov con la ventana anterior completa → `NOT_DUE days=23`;
  - `COVERAGE_CYCLE` 15 → min = max = 15;
  - `OpenRound` sin inicio → `SCHEDULED`; con inicio → `IN_PROGRESS`, `progress.done` = jardines del conjunto con fecha ≥ `firstStartedDate`; **(Review Focus 3)** `OpenRound.zoneIds` con un jardín ajeno al conjunto no suma al total ni al avance; con dos abiertas, manda la de `scheduledDate` más temprana;
  - `suggestedDate`: hoy en `DUE`/`OVERDUE`, `ref + min` en `NOT_DUE`, apertura de la ventana, `estimatedDate` en la cuota;
  - `EffectiveRule`: propias 20–25 y 30–35 → 20–25; sin propias → la general; `recentMinDays` con `scheduled = last + min` → vacío; con cuota → vacío;
  - `PlanningOrder`: el orden de §5.5 con desempates por `days`, y `DUE` sin registro primero.
- [ ] **Step 2:** `./mvnw -B test -Dtest='Planning*,EffectiveRule*'` → FAIL.
- [ ] **Step 3: Implementar.** `PlanningEvaluator` resuelve primero lo abierto y luego delega por `ruleTypeCode` en `IntervalPlanning` (`INTERVAL_DAYS`, `COVERAGE_CYCLE`), `QuotaPlanning` (`SEASONAL_PERIOD`) y `WindowPlanning` (`ANNUAL_WINDOW`). Fórmula de la cuota, tal cual en §5.5: `espacio = 365.0 / target`, `estimada = min(ref + round(espacio), 31 dic − (pendientes − 1) × round(espacio))`. `seasonLabel` = nombre visible de la estación (Verano/Otoño/Invierno/Primavera) o null.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(engine): estado de planificacion de un conjunto por actividad`

### Task 6: API de planificación

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/planning/{service/PlanningService,service/PlanningServiceImpl,service/PlanningRowsAssembler,service/RecentAttentionReader,controller/PlanningController,dto/PlanningRowResponse,dto/RecentAttentionResponse,config/PlanningClockConfig}.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/planning/{PlanningServiceImplTest,PlanningControllerTest}.java`

**Interfaces:**
- Consumes: `GreenAreaSetsRepository.activeSetsWithZonesAndActivities()` (Task 3), `GardenAttendanceProvider` (Task 4), `MaintenanceFrequenciesRepository.findCurrentInHouse()` (Task 2), engine (Task 5).
- Produces: `GET /api/v1/maintenance/planning` → `List<PlanningRowResponse>`, con el JSON de §3.2 y ordenado por `PlanningOrder`. `GET /api/v1/maintenance/planning/recent-attention?activityTypeItemId&date&zoneIds` → `List<RecentAttentionResponse>` (§3.3). Un bean `Clock` (`@ConditionalOnMissingBean`) con la zona horaria configurada.

- [ ] **Step 1: Tests que fallan** (mocks):
  - una fila por (conjunto, actividad declarada) con regla aplicable; la regla propia gana a la general; actividad no declarada → sin fila; `OUTSOURCED` y `ON_DEMAND` → sin fila; actividad declarada sin regla → `NOT_CONFIGURED`;
  - **(Review Focus 5)** una sección dada de baja dentro del conjunto no cuenta en `zoneCount`, ni en el cálculo ni en `neverAttendedCount`;
  - conjunto sin secciones activas → sin fila;
  - `recent-attention`: sección en dos conjuntos con propias 20 y 30 → `minDays=20`; sección en ningún conjunto → usa la general; cuota → lista vacía; `zoneIds` ausente → 400;
  - controller: SUPERVISOR/OPERARIO → 403; COORDINADOR → 200 con `state` y `days` serializados.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** Una consulta de completados y de abiertas por actividad para la unión de jardines (no una por conjunto). El servicio solo orquesta; las decisiones están en el engine.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(planificacion): API de planificacion preventiva y atendido hace poco`

### Task 7: El reporte mensual juzga cada jardín con una sola regla

**Files:**
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/maintenance/service/ComplianceReader.java` (si pasa de 200 líneas, extraer `LocationComplianceGrouper`)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/maintenance/service/LocationComplianceReaderTest.java`

**Interfaces:**
- Consumes: `EffectiveRule.forGarden` (Task 5), `GreenAreaSetsRepository.activeSetsWithZonesAndActivities()` (Task 3).
- Produces: `ComplianceResponse` sin cambios de forma; cada `LocationCompliance` de sección se evalúa con su regla efectiva y aparece una sola vez por actividad.

- [ ] **Step 1: Tests que fallan:** con regla general 30–35 y propia 20–25 en el conjunto que contiene S1, un intervalo de 22 días en S1 → `ON_TARGET` (antes salía `EARLY` con la general) y S1 aparece una sola vez; S2, fuera del conjunto → juzgado con la general. Las ubicaciones con `targetKind` `LOCATION` siguen como `NOT_APPLICABLE`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar:** agrupar las ejecuciones por actividad (no por regla), resolver la regla efectiva por sección con las versiones de esa regla y evaluar con `FrequencyEvaluator.evaluateAcrossVersions`.
- [ ] **Step 4:** backend completo → PASS.
- [ ] **Step 5: Commit** `fix(reportes): cada jardin se juzga con su frecuencia efectiva`

### Task 8: Clientes y tipos del frontend

**Files:**
- Create: `shared/types/planning.ts` (exportado desde `shared/types/index.ts`), `frontend/src/lib/green-area-sets-api.ts`, `frontend/src/lib/planning-api.ts`
- Test: `frontend/src/lib/__tests__/planning-api.test.ts`

**Interfaces:**
- Produces: tipos TS espejo de §3.1–3.3 (`GreenAreaSetSummary`, `GreenAreaSetDetail`, `GreenAreaSetRequest`, `PlanningRow`, `PlanningState`, `RecentAttention`). `greenAreaSetsApi.{list,get,create,update,remove}` y `planningApi.{rows, recentAttention(activityTypeItemId, date, zoneIds)}`, con el patrón de `maintenance-api.ts`.

- [ ] **Step 1:** test con `apiClient` simulado: `recentAttention(30,'2026-11-08',[112,113])` llama a `/maintenance/planning/recent-attention?activityTypeItemId=30&date=2026-11-08&zoneIds=112,113`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(frontend): clientes de conjuntos y planificacion`

### Task 9: Selector múltiple de jardines y realce de grupo en el mapa

**Files:**
- Create: `frontend/src/components/map3d/ZoneMultiPicker.tsx` (extraído de `IrrigationMapPicker.tsx`; partir en hooks si pasa de 200 líneas)
- Modify: `frontend/src/components/irrigation/IrrigationMapPicker.tsx` (pasa a envolver `ZoneMultiPicker`), `frontend/src/components/map3d/viewer/highlight.ts` y `createViewer` (nuevo `setGroup(targets: Target[])`)
- Test: los tests existentes de Riego sin cambios + `frontend/src/components/map3d/__tests__/ZoneMultiPicker.test.tsx`, `highlight` test

**Interfaces:**
- Produces: `ZoneMultiPicker({ zones, selectedIds, onCancel, onConfirm, filters? }: { zones: PickerZone[]; selectedIds: number[]; onCancel(): void; onConfirm(ids: number[]): void; filters?: ReactNode })` con `PickerZone = { id: number; code: string; name: string; sectorName?: string }`. `Viewer.setGroup(targets: Target[]): void`: tiñe todos con acento y atenúa el resto; con `[]` vuelve a lo normal.

- [ ] **Step 1:** test: seleccionar por clic dos secciones y confirmar → `onConfirm([a,b])`; buscar por nombre filtra la lista; los tests de Riego (`IrrigationTurnsScreen`) siguen pasando **sin editarlos** (CA-12).
- [ ] **Step 2:** FAIL → **Step 3:** extraer sin cambiar el comportamiento de Riego → **Step 4:** PASS.
- [ ] **Step 5: Commit** `refactor(mapa): selector multiple de jardines compartido y realce de grupo`

### Task 10: Pantalla de conjuntos

**Files:**
- Create: `frontend/src/app/(dashboard)/intervenciones/conjuntos/page.tsx`, `.../conjuntos/nuevo/page.tsx`, `.../conjuntos/[id]/page.tsx`, `frontend/src/components/planning/{GreenAreaSetsScreen,GreenAreaSetForm}.tsx`
- Test: `frontend/src/components/planning/__tests__/{GreenAreaSetsScreen,GreenAreaSetForm}.test.tsx`

**Interfaces:**
- Consumes: `greenAreaSetsApi` (Task 8), `ZoneMultiPicker` (Task 9). Las secciones vienen del mismo endpoint que usa Riego (`irrigation-api.ts`, sectores y secciones).

- [ ] **Step 1:** tests: la lista muestra «Ingreso Riva-Agüero · 18 jardines» y «sin jardines» cuando `zoneCount` es 0; el formulario exige nombre, al menos un jardín y una actividad; guardar muestra los `warnings` del servidor; el 409 muestra «Otra persona cambió este conjunto. Recarga para ver su versión.»; dar de baja pide confirmación y muestra el 422 en español.
- [ ] **Step 2:** FAIL → **Step 3:** implementar con `PageFrame`/`PageHeader` y componentes de SPEC-C01 → **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(planificacion): pantalla de conjuntos de areas verdes`

### Task 11: Frecuencias dentro de Intervenciones y solo para coordinación

**Files:**
- Create: `frontend/src/app/(dashboard)/intervenciones/frecuencias/page.tsx`
- Modify: `frontend/src/app/(dashboard)/admin/frecuencias/page.tsx` (`redirect('/intervenciones/frecuencias')`), `frontend/src/lib/navigation.ts`, `frontend/src/components/maintenance/{MaintenanceFrequenciesScreen,FrequencyFormModal,FrequencyParameters,buildFrequencyPayload,frequencyListState}.ts(x)`
- Delete: `frontend/src/components/maintenance/LocationCompliancePanel.tsx` y su test; en backend, `modules/maintenance/dto/ZoneOptionResponse.java`, `repository/MaintenanceZoneQueries.java` y el endpoint `GET /maintenance/frequencies/zones` (lo reemplaza `greenAreaSetsApi.list`)
- Modify: `backend/.../maintenance/controller/MaintenanceFrequencyController.java` (`READERS` = ADMIN, COORDINADOR), `MaintenanceFrequencyResponse.java` y el servicio (nuevo `List<String> warnings` con el cruce de reglas propias de D-08, calculado con `GreenAreaSetRules` de Task 3), `specs/fundacionales/SPEC-001-*.md` Anexo A (1.7, cita de procedencia SPEC-203)
- Test: `navigation.test.ts`, `Sidebar.test.tsx`, `buildFrequencyPayload.test.ts`, `MaintenanceFrequenciesScreen.test.tsx`, `MaintenanceFrequencyControllerTest.java`

**Interfaces:**
- Produces: grupo de menú `intervenciones` con los ítems, en este orden: «Intervenciones» (`/intervenciones`, cuatro roles), «Planificación preventiva» (`/intervenciones/planificacion`), «Conjuntos de áreas verdes» (`/intervenciones/conjuntos`) y «Frecuencias» (`/intervenciones/frecuencias`); los tres últimos solo ADMIN y COORDINADOR. Administración ya no tiene «Frecuencias de mantenimiento».

- [ ] **Step 1:** tests: un SUPERVISOR no ve los tres ítems nuevos; `GET /maintenance/frequencies` como SUPERVISOR → 403; el formulario no tiene «Teórico»; «Se aplica a: Un conjunto» exige elegir conjunto y el payload lleva `scope:'BY_SET', greenAreaSetId`; la fila con conjunto muestra «propio de este conjunto»; la pantalla ya no muestra «Cumplimiento por lugar atendido»; guardar una regla propia que cruza con otra muestra el `warnings` del servidor sin impedir el guardado.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS (backend y frontend).
- [ ] **Step 5: Commit** `feat(frecuencias): se configuran desde Intervenciones y por conjunto`

### Task 12: Pantalla de planificación

**Files:**
- Create: `frontend/src/app/(dashboard)/intervenciones/planificacion/page.tsx`, `frontend/src/components/planning/{PlanningScreen,PlanningCard,PlanningMap,planningTexts}.ts(x)`
- Test: `frontend/src/components/planning/__tests__/{planningTexts,PlanningScreen}.test.tsx`

**Interfaces:**
- Consumes: `planningApi.rows` (Task 8), `Map3DView` + `Viewer.setGroup` (Task 9).
- Produces: `planningTexts.ts`: `stateLabel(row: PlanningRow): string`, `stateDetail(row): string`, `rhythmText(row): string`, `lastLine(row): string`. Los textos exactos de §7 se usan también en Task 13.

- [ ] **Step 1: Tests que fallan** de `planningTexts`, con los textos de §7:
  - `OVERDUE days 4` → «Toca, atrasada» / «(4 días tarde)»; `DUE days 0` → «Toca» / «(vence hoy)»; `DUE days 4` → «(quedan 4 días de plazo)»; `DUE` sin registro con 3 → «3 jardines sin registro previo»; `NOT_DUE` → «Aún no toca» / «(faltan 19 días)»; ventana → «(la ventana abre en 23 días)»; `IN_PROGRESS` → «En curso» / «(faltan 16 jardines)»; `SCHEDULED` → «Programada» / «(para el 12 nov)»; `DONE_FOR_PERIOD` cuota → «Cumplido» / «(4 de 4 en el año)»;
  - `rhythmText`: «Cada 30–35 días en primavera», «Cada 15 días», «4 al año · van 3», «1 al año, entre diciembre y enero»;
  - `lastLine`: «Última vez: 30 sep (hace 39 días) · 18 jardines»; con `IN_PROGRESS`, «Empezó: 5 nov (hace 3 días) · 34 de 50 jardines».
  `PlanningScreen`: el título es «Corte de césped en Ingreso Riva-Agüero»; ningún texto contiene «ronda», «ritmo» ni «propio de este conjunto»; seleccionar una tarjeta llama a `setGroup` con sus secciones; «Planificar intervención» enlaza a `/intervenciones/nueva?conjunto=3&actividad=30`; en `IN_PROGRESS` el botón es «Ver intervención» y va a `/intervenciones/81`; sin filas → `EmptyState` «Todavía no hay conjuntos para planificar» con enlace a Conjuntos.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (mapa a la derecha en escritorio, debajo en <1024px) → **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(planificacion): pantalla de planificacion preventiva con mapa`

### Task 13: Avisos en el inicio

**Files:**
- Create: `frontend/src/components/planning/PlanningAlerts.tsx`
- Modify: `frontend/src/app/(dashboard)/page.tsx`
- Test: `frontend/src/components/planning/__tests__/PlanningAlerts.test.tsx`, `frontend/src/app/(dashboard)/__tests__/` (inicio)

**Interfaces:**
- Consumes: `planningApi.rows`, `planningTexts` (Task 12), `NEAR_DUE_DAYS = 7` (exportado desde `planningTexts.ts`).

- [ ] **Step 1:** tests: COORDINADOR con 2 `OVERDUE` y un `DUE` → «2 conjuntos atrasados» con «Corte de césped en Pabellones — 2 días tarde» y «1 conjunto toca en los próximos 7 días» (singular y plural); un `NOT_DUE` con `days 7` entra, con `days 8` no; una cuota `DUE` dice «— próxima estimada: 14 nov»; sin filas → no se muestra nada; SUPERVISOR → el componente no pide datos (no hay llamada a la API).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(inicio): avisos de mantenimiento preventivo atrasado y proximo`

### Task 14: Registro de intervención prellenado y aviso de atendido hace poco

**Files:**
- Modify: `frontend/src/app/(dashboard)/intervenciones/nueva/page.tsx` (lee `conjunto` y `actividad`), `frontend/src/components/interventions/InterventionForm.tsx` (si pasa de 200 líneas, extraer `usePlanPrefill.ts` y `RecentAttentionNotice.tsx`)
- Create: `frontend/src/components/interventions/{usePlanPrefill.ts,RecentAttentionNotice.tsx}`
- Test: `frontend/src/components/interventions/__tests__/{InterventionFormPlanPrefill,RecentAttentionNotice}.test.tsx`

**Interfaces:**
- Consumes: `greenAreaSetsApi.get`, `planningApi.rows` (`suggestedDate`, `openIntervention`), `planningApi.recentAttention` (Task 8).
- Produces: `usePlanPrefill(setId: number | null, activityId: number | null): { ready: boolean; initial: Partial<InterventionDraft> | null; openIntervention: {id:number;code:string} | null }`.

- [ ] **Step 1: Tests que fallan:**
  - con `?conjunto=3&actividad=30` → clase = padre del tipo 30, tipo 30, origen mantenimiento, fecha = `suggestedDate`, una ubicación por jardín con su `zoneId` y la descripción «Planificada desde: Corte de césped en Ingreso Riva-Agüero»;
  - `recentAttention` devuelve la sección 113 → «Sección 113 ya tuvo Corte de césped hace 3 días (el mínimo es 30)»; «Quitar de esta intervención» retira esa ubicación; «Mantenerlo» oculta el aviso de ese jardín;
  - el aviso también aparece en una intervención creada a mano con tipo, fecha y secciones;
  - con `openIntervention` → «Ya hay una intervención abierta para esto: INT-000081» con enlace, sin bloquear guardar;
  - **(Review Focus 1)** un conjunto de 530 jardines se prellena, se muestra y llega completo al payload de `create` (530 ubicaciones);
  - parámetros inválidos (`conjunto=abc`) → formulario vacío normal, sin error.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(intervenciones): registro prellenado desde la planificacion y aviso de atendido hace poco`

### Task 15: Documentación y verificación final

**Files:**
- Modify: `docs/dominio/catalogo-requisitos.md` (nota de 1.7; avance de 1.7 y de 6.10 según lo entregado; la frase de D2: «hoy ataca D5 y apenas toca D2»), `specs/REGISTRO.md` (estado de SPEC-203 y mapa de migraciones con el número real), `specs/features/SPEC-202-reportes.md` (`EARLY` y retiro de `WITHIN_TOLERANCE`, con cita de procedencia), `specs/features/SPEC-203-planificacion-preventiva.md` (sustituir el detalle literal por punteros al código donde ya exista)

- [ ] **Step 1:** `cd backend && ./mvnw -B clean test` → BUILD SUCCESS. Anotar el total de pruebas.
- [ ] **Step 2:** `cd frontend && npm.cmd test -- --runInBand && npm.cmd run lint && npm.cmd run build` → todo en verde.
- [ ] **Step 3:** levantar la app (skill `run`) y comprobar en un navegador real, como COORDINADOR: crear un conjunto desde el mapa, ver su fila en Planificación, ver el aviso en el inicio, planificar la intervención prellenada y ver «Programada». Como SUPERVISOR: no aparece nada de esto.
- [ ] **Step 4: Commit** `docs(spec-203): catalogo, registro y specs enmendados al cerrar la planificacion`
