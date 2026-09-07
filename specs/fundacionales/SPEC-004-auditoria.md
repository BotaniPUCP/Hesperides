# SPEC-004 — Auditoría y trazabilidad

## Metadatos

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional, no deriva de una HU) |
| Autor del spec | Equipo Hesperides |
| Plataforma | Ambas (la auditoría se genera desde web y móvil por igual; la consulta es de escritorio) |
| Prioridad | Alta |
| Sprint | S0 (fundacional) — se activa junto con el resto de módulos de S1 en adelante |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-001 (autenticación — `users`, roles, sección 9.2 de logs), SPEC-002 (modelo de datos — columnas de autoría existentes), SPEC-003 (catálogos configurables — una de las acciones auditadas), SPEC-C02 (manejo de errores), SPEC-C03 (patrones de API) |
| Fecha límite | Fin de Semana 1 (mecanismo automático) / continuo (bitácora crece con cada sprint) |

---

## 1. Objetivo

Garantizar que Hesperides pueda responder, en cualquier momento y sin leer código ni logs de servidor, "quién hizo qué, dónde, cuándo y con qué recurso" para toda acción administrativa sensible y toda edición sobre el catastro, mediante columnas de autoría genéricas pobladas automáticamente y una bitácora inmutable de auditoría — completando, sin duplicar, la trazabilidad operativa que SPEC-002 ya cubre con sus columnas `*_by_user_id` específicas.

## 2. Contexto para la IA

> INSTRUCCIÓN: antes de generar código, la IA debe leer obligatoriamente:
> - Este spec completo
> - SPEC-000 (arquitectura y convenciones) — sección 5.4 (convención de soft delete que este spec excepciona deliberadamente en `audit_log`)
> - SPEC-001 (autenticación) — sección 9.2 (qué se registra hoy solo en logs SLF4J) y Anexo A (matriz de permisos, base para decidir quién consulta la auditoría)
> - SPEC-002 (modelo de datos) — las 15 columnas de autoría específicas ya existentes (`registered_by_user_id`, `assigned_by_user_id`, `assigned_to_user_id`, `validated_by_user_id`, `uploaded_by_user_id` ×3, `changed_by_user_id`, `verified_by_user_id`, `responsible_user_id`, `reported_by_user_id`) y `incident_status_history` como historial append-only ya resuelto
> - SPEC-003 (catálogos configurables) — la administración de `catalog_types`/`catalog_items` es una acción auditable de este spec
> - SPEC-C02 (manejo de errores) y SPEC-C03 (patrones de API) — sobre de respuesta, paginación y filtros

**Este spec NO redefine ninguna tabla de SPEC-002.** No agrega `created_by_user_id`/`updated_by_user_id` a una tabla que ya resuelve su autoría con una columna específica más precisa (p. ej. `green_elements.registered_by_user_id` ya dice quién dio de alta; no necesita un `created_by_user_id` redundante). Tampoco toca `incident_status_history`, que ya es un historial append-only con su propio `changed_by_user_id`. Este spec llena exactamente dos huecos: **(a)** quién editó por última vez una ficha que no tiene una columna de autoría propia para la edición, y **(b)** un registro persistente de acciones administrativas sensibles que hoy solo existen como líneas de log SLF4J.

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.shared.audit` (no vive bajo `modules/`: es infraestructura transversal consumida por todos los módulos, mismo criterio que `shared/catalog/` en SPEC-003).
- Entidades JPA involucradas: `AuditLog` (nueva, en `shared/audit/entity/`). `Auditable` (superclase `@MappedSuperclass`, nueva, en `shared/audit/entity/`), de la que heredan las entidades de dominio que ganan `created_by_user_id`/`updated_by_user_id` (sección 4.3).
- Repositorios necesarios: `AuditLogRepository` (en `shared/audit/repository/`).
- Servicio: `AuditService` / `AuditServiceImpl` (en `shared/audit/service/`) — expone `record(AuditActionCode action, String entityType, Long entityId, JsonNode changes)` para que cualquier servicio de dominio lo invoque sin conocer el detalle de persistencia.
- Componentes de infraestructura: `SpringSecurityAuditorAware` (implementa `AuditorAware<Long>`, en `shared/audit/config/`), `AuditingJpaConfig` (`@EnableJpaAuditing`, en `shared/audit/config/`).
- Controller: `AuditLogController`, ruta base `/api/v1/audit-log` (solo lectura — este módulo no expone escritura por API; se escribe desde el propio backend).

### 2.2 Módulo frontend (web)

- Ruta: `/admin/audit-log` (Next.js App Router, dentro del grupo `(dashboard)`), visible solo para el rol autorizado (sección 6).
- Componentes nuevos a crear: `AuditLogTable` (`app/(dashboard)/admin/audit-log/`), `AuditLogFilters` (`components/forms/`).
- Componentes existentes a reutilizar: `DataTable`, `Select`, `DateRangePicker` (SPEC-C01).
- Hook(s) necesario(s): `useAuditLog(filters, page)` — sin caché agresiva (SPEC-C01 §caché de listados administrativos): cada consulta de auditoría debe reflejar el estado real, no una copia de hace 5 minutos.

### 2.3 Módulo móvil

- No hay pantalla de consulta de auditoría en móvil (fase 2; es una herramienta de escritorio, igual que la administración de catálogos de SPEC-003 §2.3). El móvil sí **genera** filas de auditoría (p. ej. un operario no puede desactivar cuentas, pero cualquier acción móvil que caiga en la tabla de la sección 3 se audita igual, sin importar el cliente de origen).

### 2.4 Restricciones técnicas

**Librerías que DEBE usar:**

- `spring-boot-starter-data-jpa` con **Spring Data JPA Auditing** (`@EnableJpaAuditing`, `@CreatedBy`, `@LastModifiedBy`, `@CreatedDate`, `@LastModifiedDate`, `AuditingEntityListener`) — es el mecanismo estándar de Spring, no una solución custom.
- Jackson (`com.fasterxml.jackson.databind.JsonNode`) para el campo de detalle en `audit_log`, mapeado con `hibernate-types` o el soporte nativo de Hibernate 6+ para `JSONB` (`@JdbcTypeCode(SqlTypes.JSON)`), coherente con el uso ya existente de `JSONB` en `catalog_items.metadata` y `species.attributes` (SPEC-002/003).
- Flyway para la migración.

**Librerías que NO debe usar:**

- Ninguna librería externa de auditoría (Envers, Javers). El proyecto ya tiene AuditingEntityListener de Spring Data disponible sin dependencia nueva, y una tabla de auditoría de dominio propia es más simple de consultar por API que el modelo de revisiones de Envers.
- Ningún AOP custom (`@Aspect` manual) para interceptar todos los métodos de servicio genéricamente: se invoca `AuditService.record(...)` explícitamente en el punto exacto del código donde ocurre la acción sensible (sección 3). Interceptar todo genéricamente audita de más (ruido) o de menos (falsos negativos en acciones con múltiples pasos), y esconde en un aspecto lo que un desarrollador debe poder ver leyendo el `Service`.

**Patrón de catálogos aplicable:** la acción auditada (`action` en `audit_log`) **no** es un catálogo — se decide y justifica en la sección 3.1. El resto del spec no introduce catálogos nuevos.

---

## 3. Qué se audita

### 3.1 `action` es una constante de código, no un catálogo

Decisión explícita, porque el proyecto por defecto usa catálogos configurables para todo tipo/estado/categoría (SPEC-000 §1, SPEC-003):

Un `catalog_item` de `ACTION_TYPE` existiría para que un administrador **agregue** valores desde la UI de catálogos. Pero el conjunto de acciones auditables no es un dato de negocio configurable por el cliente: **cada acción auditable corresponde a una línea de código específica** que llama a `AuditService.record(...)` con un valor conocido en tiempo de compilación. Si un administrador agregara `"BULK_EXPORT"` como catálogo desde la UI, ningún código lo emitiría nunca — un catálogo con valores que la aplicación no puede producir es peor que ninguno, porque sugiere una capacidad de auditoría que no existe. Por eso `action` es un `enum` Java (`AuditActionCode`) mapeado a `VARCHAR` en BD (nunca `@Enumerated(EnumType.ORDINAL)`, siempre `STRING`, para que la columna sea legible en una consulta SQL directa sin traducir un número).

Esto no contradice SPEC-003: los catálogos configurables existen para datos de negocio que el cliente puede necesitar ampliar sin desplegar código (un nuevo tipo de incidencia, una nueva especie). `action` es metadato del propio sistema de auditoría, análogo a un nombre de evento de log — de la misma familia que `client_type IN ('web','mobile')` en `refresh_tokens` (SPEC-001), que tampoco es catálogo.

### 3.2 Tabla de acciones auditables

| Acción (`AuditActionCode`) | Quién puede ejecutarla | Qué se guarda en `audit_log.changes` | Va a BD o basta con SLF4J |
|---|---|---|---|
| `USER_DEACTIVATED` | ADMIN | `{ "isActive": { "before": true, "after": false } }` | **`audit_log`** |
| `USER_REACTIVATED` | ADMIN | `{ "isActive": { "before": false, "after": true } }` | **`audit_log`** |
| `USER_ROLE_CHANGED` | ADMIN | `{ "roleItemId": { "before": 3, "after": 2 }, "roleCode": { "before": "OPERARIO", "after": "COORDINADOR" } }` | **`audit_log`** |
| `USER_CREATED` | ADMIN | `{ "email": "...", "roleCode": "OPERARIO" }` (sin `password_hash`, ver §7) | **`audit_log`** |
| `CATALOG_ITEM_CREATED` | ADMIN | `{ "typeCode": "INCIDENT_TYPE", "code": "PLAGA", "label": "Plaga" }` | **`audit_log`** |
| `CATALOG_ITEM_UPDATED` | ADMIN | `{ "label": { "before": "Plaga", "after": "Plaga o vector" } }` | **`audit_log`** |
| `CATALOG_ITEM_DEACTIVATED` | ADMIN | `{ "typeCode": "...", "code": "...", "isActive": { "before": true, "after": false } }` | **`audit_log`** |
| `CATALOG_ITEM_ACTIVATED` | ADMIN | ídem, invertido | **`audit_log`** |
| `GREEN_ELEMENT_SOFT_DELETED` | ADMIN | `{ "code": "ARB-0123", "reason": "..." }` | **`audit_log`** |
| `GREEN_ELEMENT_EDITED` | ADMIN, COORDINADOR | Solo campos cambiados (ver §3.3): `{ "conditionItemId": { "before": 4, "after": 2 } }` | **`audit_log`** (además de `updated_by_user_id`, sección 4.3, que dice *quién* sin el detalle del cambio) |
| `ZONE_EDITED` | ADMIN, COORDINADOR | Campos cambiados | **`audit_log`** |
| `CONTRACT_CREATED` | ADMIN | `{ "contractNumber": "...", "providerId": ..., "amount": ... }` | **`audit_log`** |
| `CONTRACT_EDITED` | ADMIN | Campos cambiados (fechas, monto, alcance) | **`audit_log`** |
| `CONTRACT_TERMINATED` | ADMIN | `{ "statusItemId": { "before": ..., "after": ... }, "reason": "..." }` | **`audit_log`** |
| `SYSTEM_PARAMETER_CHANGED` | ADMIN | `{ "code": "...", "value": { "before": "...", "after": "..." } }` | **`audit_log`** |
| `LOGIN_FAILED_LOCKOUT` | (sistema, sobre cualquier email) | `{ "email": "...", "attempts": 5, "windowMinutes": 15 }` | **`audit_log`** (además de logs SLF4J, sección 3.4) |
| `REFRESH_TOKEN_REUSE_DETECTED` | (sistema, sobre cualquier usuario) | `{ "userId": ..., "tokenId": ..., "revokedChainCount": 3 }` | **`audit_log`** |
| Login exitoso individual | — | — | **Solo SLF4J** (sección 3.4) |
| Logout individual | — | — | **Solo SLF4J** |
| 403 por rol insuficiente | — | — | **Solo SLF4J** |
| `GET` de cualquier recurso | — | — | **Ninguno** (no es una acción sensible; ver sección 3.4) |

**Por qué esta selección y no otra:** el criterio es "¿esta acción cambia un estado que, si se hace mal o con mala intención, alguien necesitará reconstruir seis meses después sin depender de que los logs del servidor sigan existiendo?". Desactivar una cuenta, cambiar un rol, editar un catálogo que alimenta reportes a dirección, borrar lógicamente un elemento del catastro, o modificar un contrato con impacto económico califican. Un login individual exitoso, no: no cambia ningún estado de negocio, y acumular una fila de `audit_log` por cada login de cada operario todos los días durante años es exactamente el crecimiento sin control que la sección 5 advierte, sin que nadie vaya a auditar jamás "quién inició sesión el martes a las 9am" salvo como parte de investigar otra cosa (para lo cual sirve `users.last_login` y los logs).

### 3.3 Diff completo vs. solo campos cambiados: se guarda solo lo que cambió

**Decisión: `audit_log.changes` guarda únicamente los campos que cambiaron, en la forma `{ "campo": { "before": ..., "after": ... } }`, nunca el objeto completo antes y después.**

Justificación:

1. **Volumen.** `green_elements` tiene más de 15 columnas. Guardar el objeto completo en cada edición cuando típicamente cambia uno o dos campos (la condición fitosanitaria, una nota) multiplica el tamaño de cada fila por ~10 sin aportar información nueva — el resto de columnas no cambió y ya está en la tabla de dominio.
2. **Señal sobre ruido.** Un coordinador que audita "qué le cambiaron a este árbol" quiere ver el cambio, no reconstruirlo restando dos JSON completos a mano. El formato `before`/`after` por campo es la respuesta directa a la pregunta que motiva este spec.
3. **Riesgo de fuga (ver sección 7).** Un diff completo de `users` incluiría columnas que no deberían viajar a una bitácora consultable por API aunque no sean el `password_hash` (por ejemplo, si en el futuro se agrega un campo de datos personales sensibles). Guardar solo el campo que cambió reduce la superficie: si la acción es `USER_ROLE_CHANGED`, el detalle solo puede contener lo relativo al rol porque el código que llama a `AuditService.record(...)` en ese punto solo tiene ese diff a mano, no la entidad completa.

La contraparte de esta decisión: si algún día se necesita reconstruir el estado completo de una fila en un instante dado, hace falta reproducir secuencialmente todos los diffs desde la creación. Se acepta porque no es un caso de uso que el cliente haya pedido ("trazabilidad de quién hizo qué", no "máquina del tiempo de cada fila"); si apareciera, se resolvería con una tabla de snapshots versionados, que es un spec distinto y más caro de mantener.

### 3.4 Qué se queda en SLF4J y no sube a `audit_log`

Corresponde a la pregunta del cliente sobre trazabilidad, pero **no** justifica una fila en base de datos, porque son eventos de volumen alto y valor forense bajo por sí solos (solo importan agregados o correlacionados con otro evento, para lo cual el log estructurado JSON en producción ya sirve, según SPEC-001 §9.2):

- Login exitoso individual (`users.last_login` ya lo resume por usuario; el detalle histórico de cada login vive en logs).
- Logout individual.
- Emisión y rotación normal de refresh tokens (sin reuso detectado).
- Fallos de validación de JWT (firma inválida, expirado).
- 403 por rol insuficiente en un endpoint de negocio (señal de configuración de frontend o de intento de abuso puntual, útil en agregado vía observabilidad, no como fila individual).
- Cualquier `GET`/listado, exitoso o no.

La línea que separa ambos destinos: **`audit_log` es para reconstruir una decisión o un cambio de estado meses después ante una pregunta puntual ("¿quién desactivó esta cuenta en marzo?"); SLF4J es para depurar y vigilar el comportamiento del sistema en el corto plazo** (rotación de logs de semanas, no años). Login/logout individuales y 403 encajan en el segundo caso: si se necesitara reconstruir un patrón de accesos sospechosos de hace seis meses, ese es un caso no cubierto hoy ni por este spec ni por SPEC-001, y se resolvería agregando `LOGIN_SUCCESS`/`LOGIN_FAILED` a la tabla de acciones auditables en una revisión posterior si el cliente lo pidiera explícitamente — no se audita "por si acaso".

---

## 4. Migración de base de datos

### 4.0 Numeración

SPEC-002 documenta y reserva hasta **V010** (`V010__seed_catalogs.sql`), dejando **V011 en adelante libre para correcciones fundacionales** (SPEC-002 §4.0). Este spec es fundacional (trazabilidad transversal, no una HU de feature) y usa:

```
V011__create_audit_log.sql
```

Verificado contra el repo: `backend/src/main/resources/db/migration/` solo contiene físicamente `V001__create_catalog_tables.sql` hasta la fecha; V002–V010 están definidas en spec pero su aplicación real depende de que SPEC-001/SPEC-002 se implementen primero. **V011 no colisiona con ninguna migración existente ni reservada.**

### 4.1 V011 — Tabla `audit_log`

```sql
-- V011__create_audit_log.sql
-- Bitácora de acciones administrativas sensibles. Append-only por diseño
-- (ver sección 6): no lleva updated_at ni deleted_at, a diferencia de toda
-- otra tabla del proyecto (excepción deliberada a SPEC-000 §5.4).

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    action          VARCHAR(60)  NOT NULL,
    entity_type     VARCHAR(60)  NOT NULL,
    entity_id       BIGINT,
    user_id         BIGINT REFERENCES users(id),
    ip_address      VARCHAR(45),
    changes         JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Consulta más común: filtrar por usuario y ordenar por fecha.
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
-- Segunda consulta más común: "todo lo que le pasó a esta entidad".
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
-- Filtro por tipo de acción (ej. "todos los USER_DEACTIVATED").
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
-- Rango de fechas sin otro filtro (reporte de dirección "qué pasó este mes").
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `action` | VARCHAR(60) | No | Valor de `AuditActionCode` (sección 3.1), p. ej. `USER_DEACTIVATED`. No es FK a catálogo — es una constante de código. |
| `entity_type` | VARCHAR(60) | No | Nombre lógico de la entidad afectada: `User`, `CatalogItem`, `GreenElement`, `Contract`, `SystemParameter`. Se fija como el `simpleName()` de la entidad JPA, no el nombre de tabla, para que sea estable si la tabla física cambia de nombre. |
| `entity_id` | BIGINT | Sí | PK de la fila afectada en su tabla de dominio. Nulable porque `LOGIN_FAILED_LOCKOUT` no tiene una fila de dominio asociada (el sujeto es un email, no una entidad persistida con id propio en ese momento). |
| `user_id` | BIGINT | Sí | Quién ejecutó la acción. **Nulable deliberadamente**: `LOGIN_FAILED_LOCKOUT` ocurre antes de que exista una sesión autenticada — no hay un `user_id` que asignarle sin inventarlo. `ON DELETE` no se declara (RESTRICT implícito, igual que el resto del esquema): un usuario nunca se borra físicamente (soft delete en `users`), así que la FK nunca queda huérfana. |
| `ip_address` | VARCHAR(45) | Sí | Dirección IP de origen del request (IPv4 o IPv6; 45 caracteres cubre IPv6 completa). Nulable para acciones sin origen HTTP (si en el futuro un job programado ejecutara una acción auditable, sección 4.4). |
| `changes` | JSONB | Sí | Solo los campos que cambiaron, formato `{"campo": {"before": ..., "after": ...}}` (sección 3.3). Nulable para acciones sin diff de campos (p. ej. `USER_CREATED` guarda el objeto creado sin `before`/`after` porque no había estado previo; `LOGIN_FAILED_LOCKOUT` guarda `{"email": ..., "attempts": ...}`, que no es un diff sino contexto). |
| `created_at` | TIMESTAMP | No | Cuándo ocurrió. Es el único timestamp de la tabla (sección 6). |

**Por qué no hay `entity_id` tipado por tabla con FK real:** a diferencia de `green_element_attachments` o `intervention_evidences` (SPEC-002 §5.2.4), donde el dominio fuerza una FK real porque la integridad referencial es crítica para el reporte de cumplimiento, `audit_log` registra acciones sobre **más de diez tipos de entidad distintos** (`User`, `CatalogItem`, `GreenElement`, `Zone`, `Contract`, `SystemParameter`…). Una FK real exigiría una columna nulable por cada tipo de entidad posible (`user_id_ref`, `green_element_id_ref`, `contract_id_ref`, …) que crece con cada módulo nuevo, o una tabla de auditoría por módulo, que fragmenta la vista unificada que el cliente pidió explícitamente ("trazabilidad completa"). Se acepta la falta de integridad referencial declarativa en `entity_id` porque `audit_log` es un registro histórico de solo lectura, no una tabla operativa: una fila que sobrevive a la fila que describe (por ejemplo, si algún día se permitiera un borrado físico de emergencia en otra tabla) sigue siendo información válida — "esto pasó en tal fecha" no deja de ser cierto porque la entidad ya no exista. Es la misma familia de decisión que la tabla polimórfica que SPEC-002 §5.2.4 rechazó para evidencia fotográfica, pero aquí el cálculo es el opuesto: allí una foto huérfana es el error que el sistema existe para evitar; aquí una fila de auditoría que sobrevive a su entidad es exactamente el objetivo (el registro no debe depender de que el dato auditado siga vivo).

### 4.2 V011 (continuación) — columnas `created_by_user_id` / `updated_by_user_id`

**Criterio para decidir qué tabla las recibe:** se añaden solo donde **(a)** la tabla es editable después de su creación por más de un tipo de usuario a lo largo del tiempo, **y (b)** no tiene ya una columna de autoría específica que cubra la misma pregunta con más precisión. Se excluyen explícitamente las tablas append-only (nunca se "edita" una fila, solo se inserta la siguiente) y las que ya tienen su propia columna de autoría por acción de negocio.

| Tabla | ¿Recibe `created_by_user_id`/`updated_by_user_id`? | Criterio aplicado |
|---|---|---|
| `zones` | **Sí** | Se crea y se edita administrativamente (nombre, polígono, tipo) sin una columna de autoría propia en SPEC-002. Es exactamente el hueco que motiva este spec: "se sabe quién dio de alta un elemento del catastro, pero no quién editó su ficha tres meses después" — `zones` es catastro editable sin autor de edición. |
| `species` | **Sí** | Igual razón que `zones`: ficha editable (nombre científico, atributos JSONB) sin columna de autoría en SPEC-002. |
| `green_elements` | **Solo `updated_by_user_id`** (no `created_by_user_id`) | Ya tiene `registered_by_user_id`, que responde "quién dio de alta" con más precisión semántica que un genérico `created_by_user_id` (el nombre comunica la acción de negocio, no solo la mecánica). Duplicarlo sería la redundancia que el prompt de esta spec pide evitar. Pero SPEC-002 no cubre quién la edita después — ese es el hueco. |
| `supplies` | **Sí** | Alta y edición administrativa (código, nombre, tipo, unidad) sin columna de autoría en SPEC-002. |
| `providers` | **Sí** | Alta y edición de la ficha de un proveedor tercerizado, dato con impacto económico y contractual, sin columna de autoría en SPEC-002. |
| `contracts` | **Solo `updated_by_user_id`** | Ya tiene `responsible_user_id`, pero ese campo significa "quién es el responsable funcional del contrato" (un dato de negocio, reasignable), no "quién lo dio de alta". No hay redundancia: se añade `updated_by_user_id` porque nadie registra hoy quién modificó fechas, monto o alcance después de creado — dato con impacto económico, de los más sensibles a auditar. `created_by_user_id` no se añade porque un contrato se crea una sola vez con `POST` y el propio `CONTRACT_CREATED` de `audit_log` (sección 3.2) ya deja constancia completa de quién y con qué datos, sin necesitar una columna redundante en la fila viva. |
| `system_parameters` | **Solo `updated_by_user_id`** | Se edita, no se "da de alta" por un usuario en el sentido operativo (nace vacía y la llena el administrador según SPEC-002 §4.9); lo que importa auditar es la edición, ya cubierta además por `SYSTEM_PARAMETER_CHANGED` en `audit_log`. |
| `green_element_attachments`, `intervention_evidences`, `incident_evidences` | **No** | Ya tienen `uploaded_by_user_id`, más preciso que un genérico `created_by`. Son de facto append-only: una evidencia fotográfica no se "edita", se reemplaza subiendo una nueva. No tienen operación de `UPDATE` en su ciclo de vida real, así que `updated_by_user_id` no tendría qué reflejar. |
| `interventions` | **No** | Ya tiene `assigned_by_user_id`, `assigned_to_user_id`, `validated_by_user_id`, que cubren cada transición de su ciclo de vida con más granularidad que un genérico `updated_by`. Agregar `updated_by_user_id` encima sería ambiguo: ¿pisa el valor de `validated_by_user_id` en la misma fila? Distinto autor por transición es más informativo que un único "última persona que tocó la fila". |
| `incidents` | **No** | Igual razón: `reported_by_user_id`, `assigned_to_user_id` ya existen, y el cambio de estado granular vive en `incident_status_history.changed_by_user_id`, que es más preciso que un `updated_by_user_id` a nivel de `incidents` (que no distinguiría "quién la asignó" de "quién la resolvió"). |
| `contract_zones`, `contract_executions`, `intervention_elements`, `intervention_supplies` | **No** | Tablas puente o de registro de hechos (SPEC-002 §5.2.3: "una fila de `intervention_elements` es un hecho inmutable"). `contract_executions` ya tiene `verified_by_user_id` para su único evento de negocio relevante (la verificación); el resto no se edita, se inserta. |
| `incident_status_history` | **No** | Ya es append-only con `changed_by_user_id` (SPEC-002, dado por resuelto en el enunciado de este spec). |
| `catalog_types`, `catalog_items` | **No** | Su edición administrativa ya queda cubierta por `CATALOG_ITEM_CREATED`/`_UPDATED`/`_DEACTIVATED`/`_ACTIVATED` en `audit_log` (sección 3.2), que registra el diff con más detalle (campo por campo) del que daría un simple `updated_by_user_id` sin contexto de qué cambió. Añadir la columna sería redundante con una bitácora que ya es más rica para este caso específico. |
| `users`, `refresh_tokens` | **No** | `users` se audita por acción específica (`USER_CREATED`, `USER_DEACTIVATED`, `USER_ROLE_CHANGED`) en `audit_log`, más preciso que un `updated_by_user_id` genérico que no diría *qué* cambió. `refresh_tokens` es append-only por rotación (SPEC-001 §4.2). |

```sql
-- Continuación de V011__create_audit_log.sql

ALTER TABLE zones
    ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE species
    ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE green_elements
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE supplies
    ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE providers
    ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE contracts
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE system_parameters
    ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id);
```

Todas nulables: las filas ya existentes (creadas antes de esta migración, o creadas por una migración de datos sin usuario autenticado) quedan con `NULL` en vez de forzar un valor inventado — ver sección 4.4 sobre `AuditorAware` para el caso de escritura sin usuario en sesión, que es un caso distinto (una inserción nueva sin usuario resuelve a un valor de sistema, no a `NULL`; `NULL` aquí es solo para filas preexistentes a la migración, que Postgres rellena automáticamente al añadir una columna nueva).

No se declara `ON DELETE` explícito (RESTRICT implícito de PostgreSQL, consistente con el resto del esquema — SPEC-002 §4.1): coherente con que ningún usuario se borra físicamente.

---

## 5. El mecanismo automático (Spring Data JPA Auditing)

### 5.1 Piezas

**a) Superclase `Auditable`** (`shared/audit/entity/Auditable.java`, `@MappedSuperclass`):

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Auditable {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @CreatedBy
    @Column(name = "created_by_user_id", updatable = false)
    private Long createdByUserId;

    @LastModifiedBy
    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;

    // getters, sin setters públicos: los puebla el listener, no el desarrollador
}
```

Las entidades de la tabla de la sección 4.2 marcadas "Sí" o "Solo `updated_by_user_id`" extienden `Auditable` (o una variante `AuditableUpdateOnly` sin `@CreatedBy`/`createdByUserId` para las que solo llevan la columna de edición, evitando un campo Java que no tiene columna de respaldo). Las entidades que ya tienen su columna de autoría específica (`GreenElement`, `Intervention`, `Incident`, etc.) **no** extienden `Auditable`; siguen extendiendo la superclase de auditoría de fechas que ya define SPEC-002 (`created_at`/`updated_at`/`deleted_at`) sin los campos `*ByUserId` genéricos, para no crear dos mecanismos compitiendo por la misma columna.

**b) `AuditorAware<Long>`** (`shared/audit/config/SpringSecurityAuditorAware.java`):

```java
@Component
public class SpringSecurityAuditorAware implements AuditorAware<Long> {

    private static final long SYSTEM_AUDITOR_ID = 0L; // sección 5.2

    @Override
    public Optional<Long> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.of(SYSTEM_AUDITOR_ID);
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof HesperidesUserDetails userDetails) {
            return Optional.of(userDetails.getUserId());
        }

        return Optional.of(SYSTEM_AUDITOR_ID);
    }
}
```

**c) Activación** (`shared/audit/config/AuditingJpaConfig.java`):

```java
@Configuration
@EnableJpaAuditing(auditorAwareRef = "springSecurityAuditorAware")
public class AuditingJpaConfig {
}
```

### 5.2 Qué pasa sin usuario autenticado: el `AuditorAware` resuelve, nunca explota

El prompt del cliente exige trazabilidad, no una excepción a mitad de una migración de datos o de un job programado. `SpringSecurityAuditorAware.getCurrentAuditor()` **nunca lanza** ni devuelve `Optional.empty()` (que forzaría `created_by_user_id NULL` en una inserción nueva, perdiendo la distinción entre "sin usuario porque el sistema lo hizo" y "sin usuario porque la fila es anterior a esta migración"). En su lugar, resuelve a un **usuario de sistema reservado**:

- Se siembra en la misma migración `V011` una fila en `users` con `id` conocido (o, más robusto: un valor constante `0` que **no** es una fila real de `users`, ver alternativa abajo) representando "Sistema / proceso automático". Esta spec elige la segunda opción — **`SYSTEM_AUDITOR_ID = 0` sin fila real en `users`** — para no ensuciar la tabla de usuarios reales (que además tiene índice único de `email` y necesitaría un email de relleno) ni exponer una cuenta de sistema en el listado de usuarios de administración (Anexo A de SPEC-001, módulo 1.1).
- Esto exige que `created_by_user_id`/`updated_by_user_id`, y `audit_log.user_id`, **no** tengan la FK como `NOT NULL` combinada con una restricción que impida `0` — de hecho ya son nulables (sección 4.2), así que la implementación real preferida es: `AuditorAware` devuelve `Optional.empty()` cuando no hay usuario, y la columna queda `NULL`, **excepto** que el propio código de arranque (migraciones de datos, jobs) que sabe que corre sin contexto de seguridad puede, si necesita dejar constancia explícita de que "el sistema" hizo el cambio (no una ausencia de dato), envolver la operación en un `Authentication` de sistema sintético antes de guardar. Se documenta así porque un valor mágico `0` referenciando una fila inexistente rompería la FK `REFERENCES users(id)`; la alternativa más simple y consistente con el resto del esquema (columnas de autoría nulables en toda tabla de SPEC-002 cuando el actor puede no existir, ver `incident_status_history.from_status_item_id`) es:

**Regla final:** `AuditorAware<Long>.getCurrentAuditor()` devuelve `Optional.empty()` cuando no hay `Authentication` válida en el `SecurityContextHolder` (migración, job programado, arranque de la aplicación). Spring Data JPA Auditing, al recibir `Optional.empty()`, simplemente **no puebla** `@CreatedBy`/`@LastModifiedBy` — dejando la columna `NULL`, tal como ya está prevista (`created_by_user_id BIGINT` nulable, sin `NOT NULL`, sección 4.2). No hay excepción, no hay abort de la migración, no hay valor inventado: **`NULL` en `created_by_user_id` significa "el sistema, no una persona"**, exactamente el mismo lenguaje que ya usa el esquema para "sin autor humano" (p. ej. `zones.boundary NULL` = "aún no digitalizado", SPEC-002 §4.3). Un `audit_log.user_id NULL` se interpreta igual (sección 4.1, ya documentado ahí para `LOGIN_FAILED_LOCKOUT`).

Esto es deliberadamente más simple que sembrar un usuario de sistema: cero filas de relleno en `users`, cero riesgo de que ese usuario de relleno aparezca en un desplegable de asignación, y la semántica de `NULL` = "no humano" ya es coherente con el resto del modelo de datos.

### 5.3 Dónde se registra la escritura en `audit_log` (distinto del listener de columnas)

El `AuditingEntityListener` puebla columnas (`created_by_user_id`/`updated_by_user_id`) automáticamente en cualquier `INSERT`/`UPDATE` de una entidad `Auditable`, sin que el desarrollador escriba código para ello. **Pero no escribe filas en `audit_log`** — eso son dos mecanismos distintos a propósito:

- El listener de columnas es genérico y silencioso: cubre "quién tocó esto por última vez" para *cualquier* entidad `Auditable`, sin que el desarrollador se acuerde de invocarlo (resuelve el problema del prompt: "con 10 personas generando código con IA no va a ocurrir de forma consistente" si dependiera de hacerlo a mano).
- La fila de `audit_log` es una decisión de negocio explícita ("esta acción es sensible, merece bitácora") y se invoca a propósito, una vez por acción de la tabla de la sección 3.2, típicamente en el método de `Service` correspondiente: `AuditService.record(AuditActionCode.USER_ROLE_CHANGED, "User", user.getId(), diffNode)`. No se automatiza con AOP genérico por lo ya justificado en la sección 2.4 (auditaría de más o de menos).

`ip_address` en `audit_log` se obtiene en el propio punto de llamada leyendo `HttpServletRequest` (vía `RequestContextHolder.currentRequestAttributes()`), no del `AuditorAware` (que solo resuelve el `Long` de usuario para JPA Auditing, no tiene acceso natural al request en todo contexto de invocación).

---

## 6. Inmutabilidad de `audit_log`: excepción deliberada a SPEC-000 §5.4

SPEC-000 §5.4 fija como convención global: *"Soft delete: `deleted_at TIMESTAMP NULL` (nunca DELETE físico)"* y, junto con SPEC-002 §4.1, que toda tabla lleva `created_at`, `updated_at` y `deleted_at`. **`audit_log` no lleva `updated_at` ni `deleted_at`, y no tiene UPDATE ni DELETE en su ciclo de vida — ni lógico ni físico.**

**Por qué se excepciona, explícitamente:**

1. **Una bitácora editable no es una bitácora.** El valor entero de `audit_log` como evidencia es que una fila describe un hecho pasado que nadie —ni un administrador, ni un desarrollador con acceso a la base de datos por soporte— puede alterar después sin que quede rastro de la alteración misma. Si `audit_log` tuviera `deleted_at`, la propia acción de "ocultar una fila de auditoría" (p. ej. un administrador queriendo borrar el registro de su propia acción cuestionable) sería posible sin dejar huella, porque el soft delete la sacaría de las consultas normales exactamente como oculta cualquier otra fila del sistema (SPEC-002 INV-02: "Las filas con `deleted_at IS NOT NULL` nunca aparecen en listados"). Eso convertiría la auditoría en auditable-y-editable-por-quien-se-audita, contradicción directa con el objetivo del spec.
2. **No hay operación de negocio que "actualice" una fila de auditoría.** El patrón de `updated_at` presupone que una fila representa un estado vigente que puede cambiar (`green_elements.condition_item_id` cambia; el árbol sigue siendo el mismo árbol). Una fila de `audit_log` representa un evento puntual ya ocurrido ("el 3 de marzo, el usuario 12 desactivó al usuario 45"): no hay un "estado vigente" de ese evento que editar. Añadir `updated_at` sin que ningún código la use nunca sería una columna decorativa que sugiere una capacidad inexistente.
3. **Corrección de errores:** si una fila de `audit_log` se escribió con un dato incorrecto (un bug en el cálculo del diff, por ejemplo), la corrección correcta es **insertar una fila nueva que lo aclare** (análoga a un asiento de reversión en contabilidad), nunca editar la fila original — igual que `incident_status_history` nunca actualiza una fila, solo inserta la siguiente (SPEC-002 §4.8, ya dado por resuelto en el enunciado de este spec). Esto es coherente con append-only, no una excepción adicional.
4. **A nivel de base de datos**, esta garantía se refuerza (no solo se documenta) revocando el permiso de `UPDATE`/`DELETE` sobre `audit_log` al rol de aplicación en el entorno de producción:

```sql
-- A ejecutar como parte del runbook de despliegue a producción (fuera de Flyway,
-- porque depende del nombre del rol de conexión de cada entorno, no es portable
-- entre dev/CI/producción como el resto de este spec).
REVOKE UPDATE, DELETE ON audit_log FROM hesperides_app;
GRANT INSERT, SELECT ON audit_log TO hesperides_app;
```

Esto es una nota operativa, no parte de la migración Flyway versionada (que corre igual en CI, en local y en producción con el mismo usuario de conexión en esta fase del proyecto, según SPEC-000). Se documenta aquí para que el spec de infraestructura/despliegue la recoja explícitamente cuando exista separación de roles de base de datos por entorno.

**Consecuencia para el desarrollador:** `AuditLog` (entidad JPA) no extiende `Auditable` ni la superclase de auditoría de SPEC-002 — es la única entidad del proyecto sin `updated_at`/`deleted_at`. `AuditLogRepository` no expone ningún método `save()` para actualizar (solo inserciones nuevas vía el método que persiste una fila nueva) ni `delete()`. El `AuditLogController` (sección 7) es **estrictamente de solo lectura**: no existe ningún `PUT`, `PATCH` ni `DELETE` sobre `/api/v1/audit-log`.

---

## 7. Qué NO se audita

### 7.1 Datos que nunca entran a `changes`

- **`password_hash`** de `users`, bajo ninguna circunstancia, en ningún valor de `before`/`after`. El código que construye el diff para `USER_CREATED`/`USER_ROLE_CHANGED`/etc. arma el `JsonNode` **campo por campo desde una lista explícita de campos auditables por entidad**, nunca por reflexión ni serializando la entidad completa — el mismo principio que SPEC-001 §9.1 aplica a `UserResponse` ("ninguna clase DTO... tiene un campo para él... nunca por reflexión ni por un mapper genérico"). Este spec adopta literalmente esa regla para `audit_log`.
- **`token_hash`** de `refresh_tokens`, ni el JWT/refresh token en texto plano, por la misma razón que SPEC-001 §9.2 los excluye de los logs: un `audit_log` legible por un coordinador (sección 8) que expusiera un hash de token reutilizable sería una fuga peor que la que motivó hashear el token en primer lugar.
- **Cualquier contraseña en texto plano** (aunque no aplique hoy a ningún flujo del sistema, se deja explícito porque `USER_CREATED` guarda `email` y `roleCode`, nunca ningún campo relacionado a credenciales).

### 7.2 Por qué un diff completo puede filtrar más de lo que el propio usuario debería leer

La sección 3.3 ya justifica por volumen y señal por qué se guarda solo el campo cambiado; aquí se justifica por **seguridad**, que es una razón independiente y suficiente por sí sola:

Si `GREEN_ELEMENT_EDITED` guardara la entidad `GreenElement` completa antes y después (en vez de solo el campo que cambió), cualquier consulta a `GET /api/v1/audit-log?entityType=GreenElement&entityId=123` por un coordinador (sección 8) expondría, de rebote, columnas que ese coordinador quizás no debería poder leer del propio recurso original en otro contexto — por ejemplo, si en una iteración futura `green_elements` incorporara un campo restringido a ADMIN (un costo de reposición interno, digamos). Un endpoint de auditoría de solo lectura pensado para "qué cambió" se convertiría en una vía lateral para leer el estado completo de un recurso sorteando el control de acceso que ese recurso tiene en su propio endpoint. Guardar solo el campo modificado limita la exposición al campo que la acción realmente tocó — que es, además, precisamente la información que la pregunta de auditoría necesita.

Por la misma razón, la lista de campos auditables por entidad (qué campos SÍ pueden aparecer en `changes` para cada `entityType`) es una decisión explícita del `Service` que arma el diff, no un mecanismo genérico de "compara estas dos entidades y serializa las diferencias" — ese mecanismo genérico es exactamente el que arriesgaría capturar un campo sensible añadido después sin que nadie revisara si debía excluirse.

---

## 8. Contratos de API

### GET /api/v1/audit-log

**Descripción:** lista paginada de la bitácora de auditoría, con filtros. Solo lectura — no existe `POST`/`PUT`/`DELETE` sobre este recurso (sección 6).

**Quién puede consultarla:** **solo ADMIN.** Decisión explícita: un coordinador planifica y valida trabajo de campo (Anexo A de SPEC-001) pero no administra usuarios, catálogos, contratos ni parámetros del sistema — y la mayoría de las acciones de la tabla 3.2 son exactamente esas. Dar acceso de lectura de auditoría a COORDINADOR expondría, por ejemplo, quién desactivó la cuenta de otro coordinador o los cambios de monto en contratos, información que la propia matriz de permisos de SPEC-001 ya reserva a ADMIN en su tabla de origen (`1.1 Usuarios` CUD y `system_parameters` CU son exclusivos de ADMIN, y solo ADMIN puede desactivar contratos y proveedores, aunque el coordinador sí los cree y edite). Conceder por la puerta de la auditoría una visibilidad que la matriz de permisos niega por la puerta del recurso original rompería esa matriz de facto. Si en el futuro el cliente pide que un coordinador vea auditoría acotada a su propio módulo (p. ej. solo `GREEN_ELEMENT_EDITED`/`ZONE_EDITED`, que sí son acciones que un coordinador ejecuta), es una ampliación explícita a decidir con el cliente, no un valor por defecto de este spec.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query params (todos opcionales, combinables con AND implícito, según SPEC-C03 §6.1):**

| Parámetro | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `userId` | long | `?userId=12` | Quién ejecutó la acción. |
| `action` | string | `?action=USER_DEACTIVATED` | Debe ser un valor válido de `AuditActionCode`; un valor no reconocido responde 400 (sección "flujos alternativos"). |
| `entityType` | string | `?entityType=Contract` | Nombre lógico de entidad (sección 4.1). |
| `entityId` | long | `?entityId=45` | Requiere `entityType` presente en el mismo request (ver validación abajo); combinados dan "todo lo que le pasó a esta fila". |
| `dateFrom` | date | `?dateFrom=2026-03-01` | Inclusive, formato `YYYY-MM-DD` (SPEC-C03 §7.1). |
| `dateTo` | date | `?dateTo=2026-03-31` | Inclusive. |
| `page`, `size`, `sort` | — | `?page=0&size=20&sort=createdAt,desc` | Paginación estándar SPEC-C03 §5. Orden por defecto `createdAt,desc` (más reciente primero, como en cualquier listado del proyecto). |

**Validación:** `entityId` sin `entityType` responde `400` (el filtro es ambiguo: un mismo `id` numérico existe en decenas de tablas distintas). `dateFrom` posterior a `dateTo` responde `400`.

**Response 200:**
```json
{
  "ok": true,
  "message": "Audit log entries retrieved successfully",
  "data": {
    "content": [
      {
        "id": 5081,
        "action": "USER_ROLE_CHANGED",
        "entityType": "User",
        "entityId": 45,
        "user": { "id": 3, "fullName": "Ana Torres Quispe" },
        "ipAddress": "10.0.4.22",
        "changes": {
          "roleItemId": { "before": 3, "after": 2 },
          "roleCode": { "before": "OPERARIO", "after": "COORDINADOR" }
        },
        "createdAt": "2026-03-12T15:04:00Z"
      }
    ],
    "page": {
      "number": 0,
      "size": 20,
      "totalElements": 214,
      "totalPages": 11
    }
  }
}
```

Nótese `user` como objeto embebido `{ id, fullName }`, nunca el `id` pelado (mismo criterio que SPEC-002 INV-04 aplica a catálogos: aquí se extiende a la referencia de usuario, para que la UI no necesite una segunda llamada a `GET /users/{id}` solo para mostrar un nombre en la tabla de auditoría). `user` es `null` cuando `audit_log.user_id` es `NULL` (acción de sistema o pre-autenticación, secciones 4.1 y 5.2); el frontend lo muestra como "Sistema".

**Response 400 (validación):**
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "entityId", "message": "entityId requires entityType to be present" }
    ]
  }
}
```

**Response 401 (no autenticado):**
```json
{ "ok": false, "message": "Invalid or expired token", "data": null }
```

**Response 403 (sin permisos — cualquier rol distinto de ADMIN):**
```json
{ "ok": false, "message": "Insufficient permissions for this action", "data": null }
```

Autorización: `@PreAuthorize("hasAuthority('ADMIN')")`, mismo mecanismo que el resto del proyecto (SPEC-001 Anexo A/B).

### GET /api/v1/audit-log/{id}

**Descripción:** detalle de una fila puntual (útil cuando la UI navega desde una notificación o un enlace directo). Mismo control de acceso (`ADMIN`).

**Response 200:** mismo objeto que un elemento de `content` arriba, sin el sobre de paginación.

**Response 404:** si el `id` no existe — `audit_log` no tiene soft delete (sección 6), así que 404 significa exclusivamente "nunca existió", nunca "fue borrado", a diferencia de cualquier otro recurso del sistema (INV-02 de SPEC-002 no aplica aquí porque no hay `deleted_at`).

```json
{ "ok": false, "message": "Audit log entry not found", "data": null }
```

---

## 9. Retención y volumen

### 9.1 Orden de magnitud esperado

El dominio (SPEC-000/002): decenas de usuarios (equipo de ADMIN + COORDINADOR + un número de OPERARIO en el orden de decenas), un solo campus, operación diaria de lunes a sábado. Las acciones auditables (sección 3.2) son, por diseño, **acciones administrativas**, no cada interacción operativa (que sigue su propio historial vía las columnas específicas de SPEC-002, sin pasar por `audit_log`). Estimación conservadora, sobrestimando para no quedar corto:

- Ediciones de catastro (`GREEN_ELEMENT_EDITED`, `ZONE_EDITED`): un catastro de "miles de elementos" (SPEC-002 §5.4) con correcciones ocasionales — se estima **decenas por semana** en operación normal, con picos de cientos durante la carga inicial del catastro.
- Administración de usuarios y catálogos: acciones esporádicas — **unas pocas por semana**.
- Contratos y parámetros del sistema: acciones muy esporádicas — **unas pocas por mes**.
- Eventos de seguridad (`LOGIN_FAILED_LOCKOUT`, `REFRESH_TOKEN_REUSE_DETECTED`): con suerte, **cero en operación normal**; su volumen depende de intentos de abuso, no de uso legítimo.

**Estimación total: del orden de cientos de filas por mes en operación estable, con un pico de baja miles durante la carga inicial del catastro (Sprint 1-2).** A cinco años (horizonte razonable de un sistema institucional sin rotación de personal masiva), esto es del orden de **decenas de miles de filas**, muy lejos del volumen que forzaría particionado (SPEC-002 §5.4 fija ese umbral en "miles de elementos y decenas de miles de intervenciones" para tablas *operativas* de alta frecuencia — `audit_log`, por ser exclusivamente administrativa, crece uno o dos órdenes de magnitud más lento).

### 9.2 Riesgo de crecimiento sin control

El riesgo real no es el volumen agregado proyectado arriba, sino que la sección 3.1 (`action` como constante de código) se relaje con el tiempo: si un futuro desarrollador decide "auditemos también cada `GET`" o "auditemos cada `PUT` de cualquier entidad, por si acaso", `audit_log` deja de ser una bitácora administrativa selectiva y pasa a competir en volumen con las propias tablas operativas del catastro — con el agravante de que, al ser append-only sin purga automática (sección 9.3), ese crecimiento no se autocorrige. La defensa contra esto no es técnica sino de proceso: **toda adición a `AuditActionCode` pasa por actualizar la tabla de la sección 3.2 de este spec**, con la misma pregunta de la sección 3.2 ("¿alguien necesitará reconstruir esto meses después sin depender de logs?"), no una decisión de código suelta en un PR.

### 9.3 Retención y purga

- **Retención activa en la tabla operativa: 24 meses** desde `created_at`. Es más que suficiente para responder "¿quién hizo esto en marzo?" incluso preguntado a fin del año siguiente, y cubre el ciclo típico de una auditoría institucional o de un cambio de gestión anual.
- **Después de 24 meses:** archivado a almacenamiento frío, no purga destructiva inmediata. Un job programado (fuera de alcance de este spec — pertenece al spec de infraestructura/despliegue) exporta a un objeto JSON/CSV en el mismo bucket S3 que ya usa el proyecto para evidencia fotográfica (SPEC-002 §5.2.4), bajo un prefijo `audit-log-archive/{yyyy}/{mm}/`, y solo entonces borra físicamamente las filas archivadas de `audit_log` (el único `DELETE` físico permitido sobre esta tabla, y exclusivamente vía este job de archivado, nunca vía la API ni manualmente — sección 6). Se prefiere archivado sobre purga sin respaldo porque una acción administrativa de hace tres años sigue siendo, en principio, respondible ante una auditoría externa o legal, solo que no necesita estar en la tabla caliente para eso.
- **Por qué no se retiene indefinidamente en la tabla activa:** aunque el volumen proyectado (sección 9.1) no lo exige por tamaño, mantener índices sobre una tabla que crece sin fin sin ninguna razón operativa (nadie consulta con frecuencia auditoría de hace 4 años) es costo de mantenimiento sin beneficio; 24 meses es el punto donde se corta sin perder la ventana de consulta realista.
- **El archivado no es una migración de datos ni parte de este spec de esquema**: se anota aquí como requisito para el spec de infraestructura, igual que SPEC-002 §5.2.4 dejó anotado el ciclo de vida del bucket como pendiente de ese mismo spec.

---

## 10. Comportamiento esperado

### 10.1 Flujo principal (Happy Path)

1. Un administrador desactiva la cuenta de un operario desde `/admin/users`.
2. `UsersService.deactivate(userId)` cambia `is_active` a `false`, guarda, y llama `AuditService.record(AuditActionCode.USER_DEACTIVATED, "User", userId, diffNode)`.
3. `AuditService` arma la fila de `audit_log` con `user_id` = el ADMIN autenticado (resuelto igual que cualquier otro punto de la aplicación, vía `SecurityContextHolder`), `ip_address` del request actual, y guarda.
4. Meses después, otro administrador (o el mismo) entra a `/admin/audit-log`, filtra por `entityType=User&entityId=45`, y ve la fila con quién, cuándo y el cambio exacto.

### 10.2 Flujos alternativos

- **La acción de negocio falla después de auditar (o antes):** `AuditService.record(...)` se invoca **después** de que la transacción de negocio confirma el cambio (o dentro de la misma transacción `@Transactional`, para que un rollback del cambio de negocio también revierta la fila de auditoría — no debe quedar una fila de `audit_log` describiendo un cambio que nunca se aplicó). Se prioriza esta segunda opción (misma transacción) precisamente para evitar el escenario de una bitácora que miente por una falla parcial.
- **El request no trae IP identificable** (llamada desde un entorno donde el proxy no reenvía la IP real): `ip_address` queda `NULL`. No bloquea el registro del resto de la fila — la falta de un dato secundario no debe impedir la trazabilidad del dato principal (quién, qué, cuándo).
- **Se filtra por un `action` que no existe en `AuditActionCode`:** `400` con el detalle de campo, listando (en el mensaje o en `errors[].message`) que el valor no es reconocido — nunca un `500` por fallo de deserialización de enum.

### 10.3 Casos límite

- **Volumen de filtros vacíos** (`GET /api/v1/audit-log` sin ningún query param): responde la primera página ordenada por `createdAt,desc`, igual que cualquier listado sin filtro del proyecto — nunca un 400 por "faltan filtros".
- **Rango de fechas que no matchea ninguna fila:** `200` con `content: []`, no `404` (mismo criterio que cualquier listado paginado, SPEC-C03).
- **Dos acciones auditables ocurren en la misma transacción** (p. ej. un `POST` que crea un contrato y de paso actualiza `system_parameters`): se registran **dos filas independientes** en `audit_log`, una por acción, nunca una fila combinada — cada fila responde a una única pregunta de auditoría sin ambigüedad de a cuál de las dos acciones corresponde el `changes`.
- **Un usuario es borrado lógicamente después de aparecer como `user_id` en `audit_log`:** la fila conserva el `user_id`; el mapper de respuesta (`GET /api/v1/audit-log`) resuelve el nombre igual (`UsersRepository` no filtra por `deleted_at` para este propósito específico de lookup de nombre, a diferencia de un listado normal de usuarios) — la auditoría no debe perder legibilidad porque el actor ya no esté activo en el sistema.

---

## 11. Criterios de aceptación (verificables por cualquiera)

> Verificables desde `psql` (`docker exec -it hesperides-db psql -U hesperides -d hesperides`) o con `curl`/Postman contra la API, sin leer una línea de Java.

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | La migración V011 corre limpia y no colisiona con V001-V010 | `SELECT version, description, success FROM flyway_schema_history WHERE version = '011';` devuelve una fila con `success = t`. `SELECT count(*) FROM flyway_schema_history WHERE version = '011';` devuelve exactamente **1**. |
| CA-02 | `audit_log` existe y es append-only por esquema (sin `updated_at`/`deleted_at`) | `SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_log' ORDER BY column_name;` devuelve exactamente `action, changes, created_at, entity_id, entity_type, id, ip_address, user_id` — **sin** `updated_at` ni `deleted_at`. |
| CA-03 | Las columnas de autoría genérica existen solo donde corresponde | `SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('created_by_user_id','updated_by_user_id') ORDER BY 1,2;` devuelve exactamente: `contracts.updated_by_user_id`, `green_elements.updated_by_user_id`, `providers.created_by_user_id`, `providers.updated_by_user_id`, `species.created_by_user_id`, `species.updated_by_user_id`, `supplies.created_by_user_id`, `supplies.updated_by_user_id`, `system_parameters.updated_by_user_id`, `zones.created_by_user_id`, `zones.updated_by_user_id` — **11 filas**, ninguna en `interventions`, `incidents`, `users`, `catalog_items` ni en las tablas de evidencia/adjuntos. |
| CA-04 | Desactivar un usuario genera exactamente una fila en `audit_log` con el diff correcto | Ejecutar `PATCH /api/v1/users/{id}/deactivate` (o el endpoint equivalente de SPEC-1XX de usuarios) autenticado como ADMIN. Luego `SELECT action, entity_type, entity_id, changes FROM audit_log WHERE action = 'USER_DEACTIVATED' AND entity_id = {id} ORDER BY created_at DESC LIMIT 1;` devuelve una fila con `changes` conteniendo `{"isActive": {"before": true, "after": false}}`. |
| CA-05 | Editar la ficha de un elemento del catastro puebla `updated_by_user_id` sin tocar `registered_by_user_id` | Editar un `green_element` ya existente (creado por el usuario A) autenticado como el usuario B. `SELECT registered_by_user_id, updated_by_user_id FROM green_elements WHERE id = {id};` devuelve `registered_by_user_id = A` (sin cambiar) y `updated_by_user_id = B`. |
| CA-06 | `audit_log` no acepta `UPDATE` ni `DELETE` desde el rol de aplicación en producción | (Entorno con el `REVOKE` de la sección 6 aplicado) `UPDATE audit_log SET changes = '{}' WHERE id = 1;` ejecutado con el rol `hesperides_app` devuelve `ERROR: permission denied for table audit_log`. |
| CA-07 | El endpoint de consulta exige rol ADMIN | `GET /api/v1/audit-log` con un JWT válido de un usuario COORDINADOR devuelve `403` con `{ "ok": false, "message": "Insufficient permissions for this action", "data": null }`. El mismo request con un JWT de ADMIN devuelve `200`. |
| CA-08 | Los filtros combinados de auditoría funcionan | `GET /api/v1/audit-log?entityType=Contract&action=CONTRACT_EDITED&dateFrom=2026-01-01&dateTo=2026-12-31` (autenticado como ADMIN) devuelve `200` con `data.content` conteniendo únicamente filas donde `entityType = "Contract"`, `action = "CONTRACT_EDITED"` y `createdAt` dentro del rango — verificable comparando contra `SELECT count(*) FROM audit_log WHERE entity_type='Contract' AND action='CONTRACT_EDITED' AND created_at BETWEEN '2026-01-01' AND '2026-12-31T23:59:59Z';` que debe coincidir con `data.page.totalElements`. |
| CA-09 | `entityId` sin `entityType` es rechazado | `GET /api/v1/audit-log?entityId=45` (autenticado como ADMIN) devuelve `400` con un error de validación referenciando `entityId`. |
| CA-10 | Ningún dato sensible aparece en `audit_log.changes` | `SELECT count(*) FROM audit_log WHERE changes::text ILIKE '%password%' OR changes::text ILIKE '%token_hash%' OR changes::text ILIKE '%refresh_token%';` devuelve **0** tras ejercitar el flujo completo (crear usuario, cambiar rol, login fallido con bloqueo). |
| CA-11 | Un job/migración sin usuario autenticado no falla y dejar `NULL` en las columnas de autoría | Ejecutar una operación de datos fuera de un request HTTP autenticado (p. ej. un script de carga inicial de `zones` corrido directamente contra el `Service` en un test, sin `SecurityContext` poblado) inserta la fila con `created_by_user_id IS NULL`, sin lanzar excepción. `SELECT count(*) FROM zones WHERE created_by_user_id IS NULL;` es mayor a 0 tras ese escenario, y la aplicación sigue respondiendo con normalidad (no hay `500` ni caída del proceso). |

---

## 12. Especificación visual

### 12.1 Web (Next.js)

- Ruta `/admin/audit-log`, visible solo en el menú de administración para el rol ADMIN (el resto de roles ni ve el enlace ni puede navegar directamente a la URL — el 403 de la API es la defensa real, la UI oculta el enlace como defensa en profundidad, mismo patrón que SPEC-003 aplica a los botones de desactivar ítems protegidos).
- Layout: tabla (`DataTable` de SPEC-C01) con columnas Fecha, Usuario, Acción, Entidad, y un botón "Ver detalle" que expande el `changes` en formato legible (lista `campo: antes → después`, no JSON crudo).
- Filtros: barra superior con selector de usuario (autocompletar sobre `users` activos), selector de acción (lista fija de `AuditActionCode`, no un `useCatalog` — no es catálogo, sección 3.1), selector de tipo de entidad, y `DateRangePicker` para `dateFrom`/`dateTo`.
- Responsive breakpoints: móvil (<640px) no aplica (sección 2.3 — no hay pantalla de auditoría en móvil); en tablet/desktop la tabla es la vista principal, sin versión de tarjetas.
- Estados: `loading` (skeleton de filas), `error` (toast "No se pudo cargar la auditoría"), vacío ("No hay registros para estos filtros", no un error).

### 12.2 Móvil (React Native)

No aplica — sección 2.3.

### 12.3 Referencia visual

No hay mockup de Figma para este módulo aún; la referencia es `DataTable` + filtros ya usados en `/admin/catalogs` (SPEC-003 §11.1), reutilizando el mismo patrón visual para consistencia entre pantallas de administración.

---

## 13. Tests que la IA debe generar

### 13.1 Tests unitarios (backend — JUnit 5 + Mockito)

```
- AuditServiceImpl.record() con usuario autenticado en el SecurityContext → persiste audit_log con user_id correcto
- AuditServiceImpl.record() sin usuario autenticado (SecurityContext vacío) → persiste audit_log con user_id NULL, sin lanzar excepción
- AuditServiceImpl.record() con action inválido (fuera de AuditActionCode) → no compila / IllegalArgumentException en tiempo de construcción, no en runtime silencioso
- SpringSecurityAuditorAware.getCurrentAuditor() con Authentication autenticada → devuelve Optional con el userId del principal
- SpringSecurityAuditorAware.getCurrentAuditor() con SecurityContext vacío o AnonymousAuthenticationToken → devuelve Optional.empty(), nunca lanza
- UsersServiceImpl.deactivate() → invoca AuditService.record(USER_DEACTIVATED, "User", id, diff) exactamente una vez
- UsersServiceImpl.changeRole() → el diff registrado contiene roleItemId y roleCode antes/después, no el objeto User completo
- CatalogsServiceImpl.updateItem() → el diff registrado contiene solo los campos modificados, no todos los campos del ítem
```

### 13.2 Tests de integración (backend — `@SpringBootTest` con Testcontainers)

```
- La migración V011 aplica limpiamente sobre una base con V001-V010 ya aplicadas
- audit_log no tiene columnas updated_at ni deleted_at tras la migración
- INSERT en audit_log funciona; UPDATE y DELETE sobre audit_log fallan cuando se ejecutan con el rol de aplicación con los GRANT/REVOKE de producción aplicados
- PATCH /api/v1/users/{id}/deactivate autenticado como ADMIN → 200 y una fila nueva en audit_log con action=USER_DEACTIVATED
- GET /api/v1/audit-log autenticado como COORDINADOR → 403
- GET /api/v1/audit-log autenticado como ADMIN → 200 con Page<AuditLogEntryDto>
- GET /api/v1/audit-log?entityId=1 (sin entityType) → 400
- GET /api/v1/audit-log?action=NO_EXISTE → 400
- PUT sobre un green_element existente cambiando solo condition_item_id → green_elements.updated_by_user_id se actualiza y green_elements.registered_by_user_id no cambia
- Un contrato editado dos veces por usuarios distintos → contracts.updated_by_user_id refleja siempre al último editor, y existen dos filas independientes en audit_log con action=CONTRACT_EDITED
```

### 13.3 Tests frontend (Jest + React Testing Library)

```
- AuditLogTable renderiza correctamente con datos de ejemplo (Page<AuditLogEntry>)
- AuditLogTable muestra estado de carga mientras useAuditLog está pendiente
- AuditLogTable muestra "No hay registros para estos filtros" con content: []
- AuditLogFilters: seleccionar entityType sin entityId no dispara error; seleccionar entityId sin entityType deshabilita el submit o lo previene con validación inline
- El enlace a /admin/audit-log no se renderiza en el menú para un usuario con rol distinto de ADMIN
```

### 13.4 Tests E2E (si aplica)

```
- Un ADMIN desactiva una cuenta de usuario, navega a /admin/audit-log, filtra por esa entidad y ve la fila con el cambio correcto antes/después
```

---

## 14. Seguridad

- [x] **Validación en backend (Bean Validation), no solo en frontend:** el DTO de filtros de `GET /api/v1/audit-log` valida `action` contra el enum `AuditActionCode`, `entityId` requiere `entityType`, y `dateFrom <= dateTo`, todo en el backend antes de construir la `Specification`.
- [x] **Endpoint requiere autenticación JWT:** sí, ambos endpoints de este spec.
- [x] **Roles/permisos necesarios:** `ADMIN` exclusivamente (sección 8), justificado explícitamente contra la matriz de permisos de SPEC-001.
- [x] **Datos sensibles que NO deben exponerse en response:** `password_hash`, `token_hash`, cualquier token en texto plano — nunca entran a `changes` en primer lugar (sección 7), así que no hay riesgo de que el endpoint los sirva por accidente.
- [x] **Prevención de inyección SQL:** `Specification<AuditLog>` de Spring Data JPA componiendo predicados por filtro presente, igual que el resto del proyecto (SPEC-C03 §6.1); ninguna concatenación de strings, ni siquiera para el filtro de rango de fechas.
- [x] **XSS:** el `changes` (JSONB) puede contener texto libre proveniente de otros módulos (p. ej. una `label` de catálogo con caracteres especiales). Se sanea al renderizar en `AuditLogTable`, nunca al guardar — mismo criterio que SPEC-002 aplica a `notes`/`description` en toda tabla de dominio.
- [x] **Confidencialidad de `ip_address`:** es un dato de auditoría de seguridad (igual que `captured_location` en SPEC-002 §5.4), visible solo a ADMIN por la misma restricción de acceso del endpoint completo — no se expone un endpoint separado más permisivo que la muestre sin el resto del contexto.

---

## 15. Consideraciones de extensibilidad

- [x] **¿Usa catálogos configurables en vez de enums hardcodeados?** Deliberadamente **no** para `action` (sección 3.1, justificado explícitamente porque no es un dato de negocio configurable por el cliente). Sí seguiría usando catálogos para cualquier dato de negocio nuevo que este spec llegara a necesitar en el futuro (ninguno identificado hoy).
- [x] **¿La lógica de negocio está en el Service, no en el Controller?** Sí: `AuditLogController` solo parsea filtros y delega a `AuditServiceImpl`/`AuditLogRepository`; la decisión de qué campos entran al diff vive en cada `Service` de dominio que llama a `AuditService.record(...)`, nunca en el controller de auditoría.
- [x] **¿Los textos de UI son externalizables (i18n-ready)?** Los `message` de respuesta de este spec siguen el mismo criterio que SPEC-001/003: claves de mensaje en inglés técnico, traducibles por el frontend sin tocar el backend. Los `label` de `AuditActionCode` que la UI muestra al usuario (p. ej. "Usuario desactivado" para `USER_DEACTIVATED`) viven en un mapa de traducción del frontend, no hardcodeados en el backend.
- [x] **¿Las reglas de negocio específicas de PUCP están en configuración, no en código?** Sí: ninguna acción de `AuditActionCode` ni ninguna tabla de este spec menciona PUCP, una zona o un rol específico del campus — el mecanismo es genérico para cualquier institución que reutilice el proyecto, igual que el resto de specs fundacionales.
- [x] **Punto de extensión:** agregar una nueva acción auditable es agregar un valor a `AuditActionCode` y una llamada a `AuditService.record(...)` en el punto correspondiente del `Service` de dominio — no requiere nueva tabla ni migración de esquema, solo una fila de código nueva y la actualización de la tabla de la sección 3.2 de este documento (sección 9.2).

---

## 16. Checklist de verificación (para el desarrollador)

### Antes de pedir código a la IA

- [x] ¿El spec tiene objetivo claro y en una oración?
- [x] ¿Los contratos de API están definidos con tipos exactos?
- [x] ¿La migración SQL está definida? — V011, con `CREATE TABLE audit_log` y los `ALTER TABLE` de columnas de autoría.
- [x] ¿Hay al menos 5 criterios de aceptación verificables? — 11.
- [x] ¿Se contemplan flujos alternativos y edge cases? — sección 10.
- [x] ¿Se especifica comportamiento para web Y móvil? — sección 2.2/2.3 (móvil solo genera, no consulta).
- [ ] ¿Alguien más revisó y aprobó el spec? — pendiente de peer review.

### Después de recibir código de la IA

- [ ] `V011__create_audit_log.sql` está en `backend/src/main/resources/db/migration/` y no colisiona con V001–V010.
- [ ] `AuditLog` es la única entidad del proyecto sin `updated_at`/`deleted_at`; no extiende `Auditable` ni la superclase de auditoría de SPEC-002.
- [ ] `Auditable` (`@MappedSuperclass`) está en `shared/audit/entity/`, y solo las entidades de la tabla de la sección 4.2 la extienden.
- [ ] `SpringSecurityAuditorAware` nunca lanza excepción; con `SecurityContext` vacío devuelve `Optional.empty()`, no un valor inventado.
- [ ] `AuditActionCode` es un `enum` Java mapeado como `STRING` en BD, no `ORDINAL`, y no existe un `catalog_type` `ACTION_TYPE`.
- [ ] Ningún `Service` arma el diff de `changes` por reflexión o serialización genérica de la entidad completa — cada uno construye el `JsonNode` campo por campo desde una lista explícita.
- [ ] `AuditLogController` no expone `POST`/`PUT`/`PATCH`/`DELETE`.
- [ ] `GET /api/v1/audit-log` está protegido con `@PreAuthorize("hasAuthority('ADMIN')")`.
- [ ] No hay ningún `System.out.println`/`console.log` de depuración, y ningún log ni fila de `audit_log` contiene `password_hash`, `token_hash` o un token completo.
- [ ] `mvn test` pasa limpio, incluidos los tests de Testcontainers de la sección 13.2.
- [ ] El `REVOKE UPDATE, DELETE ON audit_log` de la sección 6 queda documentado en el runbook de despliegue (fuera de Flyway), no olvidado como "ya se hará".

---

## Anexo — Relación con las columnas de autoría ya existentes (no duplicadas)

Tabla de referencia rápida para que ningún desarrollador reintroduzca una columna que SPEC-002 ya resolvió:

| Columna existente (SPEC-002) | Tabla | Qué responde | Por qué este spec NO la toca ni la duplica |
|---|---|---|---|
| `registered_by_user_id` | `green_elements` | Quién dio de alta el elemento | Ya es más preciso que un `created_by_user_id` genérico; este spec solo añade `updated_by_user_id` para la edición posterior. |
| `assigned_by_user_id` / `assigned_to_user_id` | `interventions` | Quién asignó y a quién | Cubre dos roles distintos en una sola acción de negocio; un `updated_by` genérico perdería esa distinción. |
| `validated_by_user_id` | `interventions` | Quién validó el cierre | Acción de negocio específica (`V` en la matriz de permisos), no una edición genérica. |
| `uploaded_by_user_id` | `green_element_attachments`, `intervention_evidences`, `incident_evidences` | Quién subió el archivo | Las tres tablas son de facto append-only (sección 4.2); no hay "edición" que auditar más allá de la subida. |
| `changed_by_user_id` | `incident_status_history` | Quién cambió el estado, en cada transición | Ya es un historial append-only (dado por resuelto en el enunciado); es el modelo que este spec cita como ejemplo a seguir, no a repetir. |
| `verified_by_user_id` | `contract_executions` | Quién verificó una ejecución de contrato | Acción de negocio puntual, no una edición genérica de la fila. |
| `reported_by_user_id` | `incidents` | Quién reportó la incidencia | Autoría de creación con nombre de negocio propio. |
| `responsible_user_id` | `contracts` | Quién es el responsable funcional vigente (reasignable) | Dato de negocio, no un rastro de autoría de edición — por eso este spec sí añade `updated_by_user_id` a `contracts` sin conflicto: responden preguntas distintas. |
