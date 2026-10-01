# Registro de specs

> **Antes de generar código, leer [`REGLAS.md`](REGLAS.md):** contiene las
> invariantes que aplican a todos los specs. Cada spec contiene solo lo propio suyo.

| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|--------------|
| SPEC-000 | Arquitectura general      | ✅ Completado  | —          | S0     | 2026-09-06   |
| SPEC-001 | Autenticación             | ✅ Completado  | —          | S0     | 2026-09-07   |
| SPEC-002 | Modelo de datos           | 👀 En revisión  | —          | S0     |              |
| SPEC-003 | Catálogos configurables   | 👀 En revisión  | —          | S0     |              |
| SPEC-004 | Auditoría y trazabilidad  | 👀 En revisión  | —          | S0     |              |
| SPEC-005 | Actualización del modelo a la operación real | 📝 En spec | —    | S0     |              |
| SPEC-006 | Frecuencias de mantenimiento | ⛔ Superado por SPEC-101 | —    | S3     |              |
| SPEC-C01 | Componentes UI            | 👀 En revisión  | —          | S0     |              |
| SPEC-C02 | Manejo de errores         | 👀 En revisión  | —          | S0     |              |
| SPEC-C03 | Patrones de API           | 👀 En revisión  | —          | S0     |              |
| SPEC-100 | Gestión de usuarios       | 👀 En revisión  | —          | S1     |              |
| SPEC-101 | Frecuencias de mantenimiento | 🔄 En progreso  | —          | S1     |              |
| SPEC-102 | Mapa 3D del campus | 📝 En spec | —    | S2     |              |

**Leyenda:** ⏳ Pendiente · 📝 En spec · 👀 En revisión · 🔄 En progreso · ✅ Completado · ⛔ Superado

---

## Enmiendas a specs cerrados

Cuando un spec de feature obliga a corregir uno fundacional ya cerrado, la enmienda se aplica al
archivo original (marcada como cita con su procedencia) y se anota aquí. Nadie debe descubrir por
sorpresa que un principio fundacional cambió.

| Spec enmendado | Enmendado por | Qué cambió |
|---|---|---|
| SPEC-000 §1 | SPEC-100 | "Sin dependencia de servicios externos" pasa a admitir **SMTP como única excepción**, con la condición de que su caída nunca impida una operación de negocio. |
| SPEC-001 §2.5 | SPEC-100 | Se corrige la justificación del "no autorregistro": el argumento de que no había correo en el alcance ya no aplica. **La decisión de no permitir autorregistro no cambia.** |
| SPEC-004 §3.2 | SPEC-100 | Se añade la acción auditable `USER_CREDENTIALS_DELIVERY_FAILED`. |
| SPEC-000 (stack y §5.2.1 nueva) | Implementación de SPEC-001 | Se fijan las versiones exactas verificadas (Spring Boot 4.1.1, Security 7.1.1, JJWT 0.12.6, Testcontainers 2.x, JaCoCo 0.8.15) y se documenta **qué cambió Spring Boot 4 respecto a 3.x**: Jackson 3 en `tools.jackson`, `@MockBean` eliminado, `@WebMvcTest` de paquete, Flyway y Jackson con starter propio, Lombok declarado a mano. Cada fila costó un fallo real de compilación o un test en rojo. |
| SPEC-000 §5.2.2 (nueva) | Corrección de CORS | La sección 4 reservaba `shared/security/` para CORS pero ningún spec lo detalló, y su ausencia hacía que el login mostrara "Sin conexión" con el backend sano. Se documentan las reglas obligatorias: lista cerrada de orígenes, `allowCredentials` activo, preflight `OPTIONS` público. |
| SPEC-001 Anexo B, §6 (CA-11 y CA-12), §8.2 | Corrección de CORS | CORS pasa a ser parte explícita de la cadena de seguridad, con dos criterios de aceptación verificables y cuatro tests de integración. CA-11 exige **comprobar el login en un navegador real**: `curl` y MockMvc no hacen preflight, así que no detectan este fallo. |
| SPEC-C02 §6.0 (nueva) | Corrección de CORS | Se advierte que `ApiError.status === 0` no significa necesariamente "sin red": CORS mal configurado produce el mismo mensaje y es la causa más frecuente en desarrollo. Tabla para distinguir las cuatro causas. |
| `_plantilla.md` §2.4 y checklist | Ambas | Todo spec de backend debe leer §5.2.1 antes de generar código, y el checklist exige verificación **en navegador real**, no solo `curl`. |
| SPEC-002 §4.9 | SPEC-005 | `INTERVENTION_TYPE` deja de ser una lista plana de 6 valores **inventados** y pasa a la taxonomía real del cliente: **9 clases y 45 tipos** en dos niveles. `DECORACION` y `REMOCION_TERRENO` no existen en la operación y se desactivan. `URGENCY_LEVEL` pierde `CRITICAL`: el cliente usa tres niveles. |
| SPEC-002 §4.3 (DDL) | SPEC-005 | Se siembran los 5 sectores y las 519 secciones del mapa del cliente. `parent_zone_id` pasa de hipótesis a uso real. **P-01 se cierra.** *(Texto corregido el 29 sep 2026: la versión original sembraba 17 cuarteles y 74 lugares con punto.)* |
| SPEC-002 §4.5 | SPEC-005 | `green_elements` gana `legacy_code` con índice **no único**: las placas de aluminio del inventario forestal antiguo están repetidas y reasignadas, y el cliente pide codificación nueva. |
| SPEC-002 §4.6 | SPEC-005 | `interventions` gana `requested_quantity`/`executed_quantity` + `unit_item_id` (el indicador de cumplimiento del cliente), `origin_item_id`, `reported_by_item_id`, `external_code` (correlativo `OSG-####` de la universidad), `requested_at` y `technical_sheet_key`. |
| SPEC-002 Anexo | SPEC-005 | P-01, P-02, P-04 y P-08 avanzan con la entrega DAF-OSG. Entra **P-10**: las clases `FITOSANITARIO` e `INSPECCION` están declaradas sin ningún tipo desglosado. |
| SPEC-003 §3 | SPEC-005 | `catalog_items` gana `parent_item_id`: los catálogos pueden ser **jerárquicos**. Nulable, así que los catálogos planos no cambian. |
| SPEC-003 §8 | SPEC-005 | Entran `INTERVENTION_CLASS`, `INTERVENTION_ORIGIN` e `INCIDENT_SOURCE`. Se actualizan los valores de `INTERVENTION_TYPE`, `SPECIES_TYPE` (9, confirmados), `MEASUREMENT_UNIT` (4), `EVIDENCE_MOMENT` (+`UNSPECIFIED`) y `URGENCY_LEVEL` (−`CRITICAL`). |
| **SPEC-000 §1 · REGLAS §0.1** | SPEC-005 | «Sin dependencia de servicios externos» pasa de **una** excepción a **tres**: además del SMTP se admiten la **publicación en el mapa interactivo del cliente** (hoy GitHub) y el **servicio de mapas** que lo renderiza (hoy Google Maps). El cliente **ya tiene** ese mapa y pidió que el sistema lo alimente: no es una dependencia que elijamos. **La condición que las acota es la misma que la del SMTP** — su caída nunca impide una operación de negocio: registrar una intervención se completa aunque la publicación falle, y si el mapa no carga las pantallas se degradan a listas. Se añade una **regla de aislamiento**: ningún servicio de dominio conoce al proveedor concreto, porque el mapa del cliente vive en el repositorio personal de una locadora de servicios y esa dependencia puede desaparecer. |
| **SPEC-002 §4.3** | SPEC-005 | La jerarquía de zonas deja de ser la incógnita «¿sector/subsector/jardín?»: es **sector (5) → sección (519) → subsección (opcional)**. Una sección es un área verde del mapa del cliente; los 74 «lugares» del Excel pasan a ser **referencias**. *(Corregido el 29 sep 2026: sin cuarteles forestales, y solo esas tres palabras.)* |
| **SPEC-002 §4.6** | SPEC-005 | `intervention_evidences` gana `uploaded_at` (NULL = el dispositivo la tiene, la nube aún no) y `client_reference` (idempotencia en reintentos). Es el reflejo en servidor del flag de subida del móvil: hay cobertura en el campus pero no en todos los rincones, y para el operario **nunca existe un «no se pudo guardar»**. |
| **SPEC-002 §4.6 (2)** | SPEC-005 | `interventions` gana `published_at`, `publication_attempts` y `publication_error`: la publicación en el mapa del cliente es asíncrona, falible y **fuera de la transacción** que guarda la intervención. |
| **SPEC-002 §4.6 (P-03)** | SPEC-006 | **P-03 se cierra.** La incógnita que lo mantenía abierto era si la frecuencia se define por zona, tipo de elemento, especie o combinación. La 2.ª entrevista la resolvió: **se define por tipo de intervención**, y ninguna frecuencia declarada por el cliente varía por zona ni por especie («campus completo cada 15 días», «cada 30-45 días» en todo el campus). Entra la tabla `maintenance_frequencies`. *(SPEC-006 quedó superado por SPEC-101, que la implementó como **V002**; esta fila y las tres siguientes de SPEC-006 se conservan como registro.)* |
| **SPEC-002 §4.7** | SPEC-006 | `contracts.agreed_frequency_item_id` **no se sustituye**: conviven. Esa columna es la frecuencia **pactada en contrato** (una etiqueta de documento); `maintenance_frequencies` es la **operativa**, con la que se evalúa el cumplimiento. Mientras no veamos un contrato, el comparativo **no puede llamarse «pactado vs. real»**: compara contra lo que el cliente declaró en entrevista. |
| **SPEC-003 §8** | SPEC-006 | Entra `FREQUENCY_CRITERION` con tres ítems `is_system` (`DAYS_BETWEEN`, `MIN_PER_YEAR`, `NONE`). Es de sistema porque **cada `code` tiene un evaluador implementado en el Engine**: un criterio sembrado desde la pantalla de catálogos sería una opción que no calcula nada. `FREQUENCY` sigue pendiente del cliente y solo sirve a la frecuencia contractual. |
| **SPEC-004 §3.2** | SPEC-006 | Se añaden `MAINTENANCE_FREQUENCY_CREATED`, `MAINTENANCE_FREQUENCY_VERSIONED` (registra ambos valores de tolerancia) y `MAINTENANCE_FREQUENCY_DELETED`. Relajar una tolerancia cambia qué cuenta como incumplimiento: debe ser rastreable hasta la persona y la fecha. |
| **SPEC-002 §4.3 (DDL)** | Decisión del equipo (29 sep 2026) | `zones.boundary` pasa de `Polygon` a **`MultiPolygon`**: un sector es la suma de las áreas verdes de un capataz, repartidas por el campus, no un área continua. La tabla no existe todavía, así que es un cambio de diseño, no una migración. `ZONE_TYPE` queda definido: `SECTOR`, `SECTION`, `SUBSECTION`. **Los cuarteles forestales salen del modelo.** `zones` gana `map_code` y `use_type_item_id`, y entra la tabla `supervision_zones` (V015), fuera de la jerarquía, con un supervisor por zona. **Quién mantiene un sector no es atributo del sector** (no es exclusivo: los árboles de más de 5 m de un sector verde los poda un tercero): lo dice la cuadrilla asignada y, trabajo a trabajo, quién lo ejecutó. |
| **SPEC-003 §8** | SPEC-005 (29-30 sep 2026) | Entran `USE_TYPE` (los seis tipos de uso del mapa del cliente) y `REFERENCE_CATEGORY` (las 24 categorías de la tabla oficial de referencias). |
| **SPEC-002 §4.0 · SPEC-004 §4.0 · SPEC-005 §4 · SPEC-006 §4 · REGLAS §5.4** | Renumeración de migraciones (29 sep 2026) | Los números reservados por cada spec (`V003`–`V010`, `V011`, `V013`–`V020`, `V012`) chocaban con las migraciones que sí se aplicaron. Se adopta la **numeración cronológica** y el mapa de migraciones de abajo pasa a ser la fuente única. REGLAS §5.4 deja los rangos por spec. |
| **Mapa de migraciones · SPEC-001 · SPEC-002 §4.0 · SPEC-003 · SPEC-004 §4.0 · SPEC-005 §4 · SPEC-100 · SPEC-101** | Realineamiento al baseline (1 oct 2026) | El commit `638aca0` consolidó V001–V011 en `V001__baseline_schema.sql`, y quedaron aplicadas `V002` (frecuencias, SPEC-101) y `V003` (parámetros del sistema). Las reservas pendientes se corren de `V012`–`V028` a **`V004`–`V020`**; las citas a archivos que ya no existen (`V003__seed_role_catalog`, `V009__seed_intervention_taxonomy`…) apuntan al baseline. **SPEC-006 queda superado por SPEC-101**, que ya implementó la misma tabla. |
| **SPEC-C01 §6** | SPEC-102 (1 oct 2026) | **Leaflet sale: el mapa del sistema es el visor 3D** (Three.js), en web y en la app Android dentro de un `WebView`. Sigue sin servicios externos ni API keys. Los edificios vienen de OpenStreetMap con atribución visible hasta que lleguen los planos de la PUCP. |
| **SPEC-005 §4.4** | SPEC-102 | Las 10 áreas xerofíticas entran como secciones sin sector; 20 secciones se marcan reservables (dueño `DAF` o `UNIDADES`); «Jardín Frutas» y «Jardín Frutas-Lado FCCSS» son subsecciones de `AV-0151`. Las 77 «plantas sin especie» se descartan: son duplicados de plantas del catastro y de las mediciones. |
| **SPEC-002 §4.8** | SPEC-102 | `incidents` gana `location_description`, `described_section_id` y `described_building_id`: la descripción de la ubicación se calcula en el servidor al registrar y queda congelada. |
| **SPEC-C01 §4.2 (nueva) y §9** | Sidebar de navegación (1 oct 2026) | La navegación pasa de una lista de enlaces en el inicio a un **sidebar** con módulos desplegables, **un grupo por módulo del dominio** (hoy solo «Administración»). La estructura vive en `lib/navigation.ts` con los roles por ítem; las pantallas con sesión se mueven al grupo `app/(dashboard)/`, que aplica guard y sidebar una sola vez. Se retiran los «Volver al inicio». Catálogos, que no tenía enlace, queda accesible desde el sidebar para `ADMIN`. |
| Todos los specs | Refactor a formato atómico | Las invariantes comunes salen a **`REGLAS.md`** (lectura obligatoria antes de generar código): las diez invariantes, las convenciones de SPEC-000 §5 —con §5.2.1 de Spring Boot 4 y §5.2.2 de CORS íntegras— y el checklist común. SPEC-000 pierde la copia de `_plantilla.md` y los resúmenes de los otros specs, que ya contradecían a SPEC-001. En cada spec, las secciones genéricas de Seguridad, Extensibilidad y Checklist se funden en una sola "Propio de este spec". **La numeración se conserva**: toda referencia `SPEC-XXX §N` sigue siendo válida, y `SPEC-000 §5.x` pasa a `REGLAS.md §5.x` con el mismo número. Ninguna decisión técnica, contrato ni criterio de aceptación cambió. |
| SPEC-002 §4.9 | SPEC-101 | La migración `V010` queda asignada a `V010__create_maintenance_frequencies.sql` siguiendo `REGLAS.md` §0.2 (numeración cronológica sin huecos). El sembrado de catálogos que SPEC-002 proyectaba para V010 ya fue absorbido íntegramente por `V009__seed_intervention_taxonomy.sql`. |

---

## Decisiones abiertas que hereda cada spec

El proyecto base dejó estos puntos sin resolver a propósito: pertenecen a un spec
que todavía no se ha escrito. La pareja que tome ese spec debe cerrarlos.

| Decisión | La cierra | Estado actual en el código |
|----------|-----------|----------------------------|
| Versionado de rutas en servicios internos | SPEC-C03 | El backend expone `/api/v1/health`; el data service expone `/health`, sin prefijo. El sobre de respuesta sí es idéntico en ambos. Definir si los servicios internos llevan `/api/v1` y alinear `services/app/routes/health.py`. |
| ~~Almacenamiento del token en web vs. móvil~~ | SPEC-001 | **✅ Cerrada** al implementar SPEC-001. Web recibe el refresh token en una cookie `httpOnly`, `Secure` y `SameSite=Strict` con `Path=/api/v1/auth`, y nunca en el cuerpo. Móvil lo recibe en el body (header `X-Client-Type: mobile`) y lo guarda en SecureStore. Lo decide `AuthController.respondWithSession`, con web como valor por defecto si falta el header. CSRF: se apoya en `SameSite=Strict`, no en tokens sincronizadores, porque la API es stateless y el resto de la autenticación viaja en el header `Authorization`. El refresh encolado del Anexo C está en `frontend/src/lib/api.ts`. |
| Entidades de dominio | SPEC-002 | `shared/types/models.ts` solo define `AuditFields`. No hay ninguna `@Entity` en el backend. |
| Estructura de la app móvil | Spec de móvil | `mobile/` solo tiene README. **Requisitos de negocio confirmados:** plataforma **Android**; se asume la app instalada y los datos móviles no se consideran un problema; las zonas sin señal no se modelan (no hay mapa de ellas). **La foto se toma desde la app y SIEMPRE se guarda en el almacenamiento del teléfono, con o sin red**, marcada con un flag `subida_a_la_nube`. Al haber conexión, la app busca las que tengan el flag en NO, las sube y lo cambia a SÍ: **nunca existe un «no se pudo guardar»**, porque guardar y subir son pasos distintos y solo el primero es inmediato. **Un indicador de pendientes arranca encendido en cuanto se toma la primera foto y solo pasa a verde cuando todas llegaron a la nube** — es la garantía de que nadie termina su turno con fotos sin subir; un indicador que solo avisa de problemas se ignora, uno que hay que llevar al verde se mira. Sin espacio en el dispositivo: **solo un mensaje**, no se gestiona almacenamiento ni se borran fotos subidas. Alcance del canal móvil: evidencia fotográfica (3.3), insumos (3.5) y captura de elementos del catastro (2.2). |
| ~~¿«cuatro actividades» o 9 clases / 45 tipos?~~ | SPEC-005 | **✅ Cerrada.** El cliente confirmó que las cuatro (poda, control fitosanitario, corte de césped, mantenimiento de jardines) son las **prioritarias**, no un catálogo rival: se marcan con `metadata->priority` y las demás clases se construyen después, aprovechando cruces. `FITOSANITARIO` sube a bloqueante porque es prioritaria y no tiene tipos (SPEC-005 §2.0.3). |
| ~~¿La taxonomía es lo ejecutable o lo que ejecuta el estable?~~ | SPEC-005 | **✅ Cerrada por los datos.** Cero registros de corte de césped y de control fitosanitario en 171 filas con taxonomía nueva: el catálogo del Excel **ya es** el ámbito del personal estable, y coincide con la entrevista. «Instalación de césped» (10 registros) es actividad distinta de «corte de césped» (SPEC-005 §2.0.4). |
| ~~¿Qué significa «sector»?~~ | 2.ª entrevista | **✅ Cerrada.** Son **3 sectores de mantenimiento** reales y fijos («sus zonas no varían»), dibujados en el mapa interactivo, de ~4.5 + ~4.5 + ~3 ha, uno por capataz. Organizan el personal y **el ciclo de riego**. El nombre del capataz los etiqueta, pero el sector es territorio, no persona (SPEC-005 §4.4.1). |
| ~~Mapeo lugar → cuartel forestal~~ | Equipo | **✅ Descartada (29 sep 2026).** El sistema no usa cuarteles forestales; la jerarquía es sector → sección → subsección (SPEC-005 §4.4.2). |
| ~~Límites de los sectores~~ | Cliente + equipo | **✅ Cerrada (29 sep 2026).** El mapa del cliente (v32) asigna cada área verde a un responsable. Hay **5 sectores**: Sector verde 01, 02 y 03 (Alfonso, Óscar y Andrés, por superficie), **Sector Polideportivo** (tercerizado por contrato) y **Sector Bosque húmedo** (a demanda). Queda **P-15**: `AV-0011` «Jardín Rosales» no tiene responsable (SPEC-005 §4.4). |
| ~~Asignación sección → sector~~ | Mapa del cliente | **✅ Cerrada.** Las secciones son las áreas verdes del mapa, y el mapa dice el sector de cada una. Falta modelar la **vigencia** (1.9) en el spec de A-07. |
| ~~Sistema de referencias~~ | Equipo | **✅ Cerrada (30 sep 2026).** Tabla `place_references` (V016) con la carga oficial inicial de **411 referencias** en 24 categorías, jerarquía padre-hijo (piso → edificio) y alias. Sirven para **buscar en el mapa e importar ubicaciones**; no son nivel de la jerarquía de zonas ni se guardan en intervenciones o incidencias (SPEC-005 §4.4.4). |
| **Algoritmo de cercanía** | Equipo | Describe dónde ocurrió una incidencia o intervención a partir de su ubicación. El equipo lo detallará (SPEC-005 §4.4.4). |
| **Quién supervisa cada zona de supervisión** | Cliente | Toda zona tiene supervisor (`NOT NULL`). **Por ahora es el coordinador** (o el `ADMIN` si aún no hay cuenta de coordinador). Falta saber quién será el supervisor real de cada zona (SPEC-005 §4.4.5, P-16). |
| ~~¿El vivero entra en la fase 1?~~ | Equipo | **✅ Cerrada: NO entra; pasa a fase futura** (25 sep). La clase de actividad «Propagación y plantación» (10 tipos) **sí permanece** en la taxonomía: el personal estable propaga en campo, no solo en vivero — es la 2.ª clase más usada del Excel (36 de 171 registros). Las plantas que consume una intervención se registran como insumo, sin rastrear su origen. |
| **Cómo integrarse con el mapa interactivo del cliente** | Cliente (3.ª entrevista) | **Decidido: nos integramos, no construimos uno nuevo.** El cliente ya tiene un mapa de varias capas que comparten las 3 secciones de OSG y que **Carolina alimenta a mano cada semana** desde el Excel — ese trabajo manual es el dolor D1. Robert pidió «una aplicación que pueda enlazarse a este insumo». **Falta saber de qué fuente lee cada capa y si podemos escribir en ella**: si lee de una hoja de Google el riesgo es bajo y Carolina deja de copiar; si es cerrado, la integración automática no es posible. Preguntas en `docs/dominio/integracion-mapa-interactivo.md`. |
| ~~¿Los locales periféricos entran al alcance?~~ | Equipo | **✅ Cerrada (25 sep): NO entran, ni se planea incluirlos.** El cliente no los necesita («la mayor dinámica de atención y recursos es el campus»). `zones` no necesita un nivel de sede. Ver `docs/dominio/fuera-de-alcance.md` §2. |
| Intervenciones que afectan varias zonas | SPEC-2XX de intervenciones | `interventions.zone_id` es único, pero el registro del cliente tiene celdas como «Comedor Central, Gastronomía y Matemática». Al importar se crea una intervención por zona; si el caso resulta frecuente hará falta una tabla puente `intervention_zones` (SPEC-005 §5.4). |
| Composición de las cuadrillas | SPEC-1XX de equipos | Las tablas `teams`/`team_members` existen (**V001**, baseline), pero el cliente aún no ha dicho cuántas cuadrillas hay, cómo se llaman ni qué zonas cubre cada una. |
| ~~Frecuencias de mantenimiento (P-03 de SPEC-002)~~ | SPEC-006 | **✅ Cerrada.** La frecuencia se define **por tipo de intervención** — ninguna de las que el cliente declaró varía por zona, especie ni tipo de elemento. Se modela con **criterio configurable** (`FREQUENCY_CRITERION`) más `target_value` y `tolerance_percent` **por actividad**, y con **vigencia temporal** para que relajar una tolerancia no reescriba los periodos ya evaluados. La poda a demanda se configura con criterio `NONE` explícito, no dejándola sin fila: «no tiene frecuencia» y «nadie la configuró» son estados distintos. |

---

## Mapa de migraciones

**Fuente única de la numeración Flyway** (REGLAS §5.4). La numeración es cronológica: cada
migración nueva toma el siguiente número libre. Las pendientes tienen un número **reservado**
en el orden previsto de implementación; si una se implementa antes que otra, se renumera aquí y en
su spec, en el mismo commit. Una migración aplicada nunca cambia de número ni de contenido.

### Aplicadas

> **Baseline (commit `638aca0`).** Las once migraciones V001–V011 que existieron hasta la
> integración de frecuencias se consolidaron en un solo `V001__baseline_schema.sql`: dos ramas
> habían tomado el número V010 a la vez y ninguna base desplegada conservaba datos. El esquema
> resultante es el mismo; cada sección del baseline conserva los porqués de la migración que
> reemplaza. Una base migrada con el historial anterior falla la validación de Flyway por
> checksum y hay que recrearla (`docker compose down -v`).

| Versión | Archivo | Propietaria | Qué contiene |
|---|---|---|---|
| V001 | `V001__baseline_schema.sql` | SPEC-001, SPEC-002 §4.10, SPEC-003, SPEC-005 §4.1-4.2, SPEC-100 | `unaccent`, catálogos con jerarquía, roles, usuarios y sesiones con entrega de credenciales, admin inicial, cuadrillas, taxonomía de intervenciones (9 clases, 45 tipos, tipos provisionales de P-10) |
| V002 | `V002__create_maintenance_frequencies.sql` | SPEC-101 | Frecuencias de mantenimiento y sus estaciones |
| V003 | `V003__create_system_parameters.sql` | SPEC-002 §4.9 | La tabla `system_parameters` y sus parámetros |

### Pendientes (número reservado)

| Versión | Archivo | Propietaria | Depende de |
|---|---|---|---|
| V004 | `V004__enable_postgis.sql` | SPEC-002 §4.2 | Imagen `postgis/postgis` en el servicio `db` |
| V005 | `V005__create_zones.sql` | SPEC-002 §4.3 | V004 |
| V006 | `V006__create_species.sql` | SPEC-002 §4.4 | — |
| V007 | `V007__create_green_elements.sql` | SPEC-002 §4.5 | V004, V005, V006 |
| V008 | `V008__create_interventions.sql` | SPEC-002 §4.6 | V007 |
| V009 | `V009__create_contracts.sql` | SPEC-002 §4.7 | V008 |
| V010 | `V010__create_incidents.sql` | SPEC-002 §4.8 | V007, V008 |
| V011 | `V011__seed_catalogs.sql` | SPEC-002 §4.9 | Sin `ROLE`, `INTERVENTION_TYPE` ni `system_parameters`: ya están en V001 y V003 |
| V012 | `V012__create_audit_log.sql` | SPEC-004 §4 | V005–V011 (añade columnas de autoría a sus tablas) |
| V013 | `V013__add_execution_tracking_to_interventions.sql` | SPEC-005 §4.3 | V008 |
| V014 | `V014__seed_campus_zones.sql` | SPEC-005 §4.4 | V005, V011 (`ZONE_TYPE`) |
| V015 | `V015__create_supervision_zones.sql` | SPEC-005 §4.4.6 | V004, V001 (necesita un usuario `COORDINADOR` o `ADMIN` activo) |
| V016 | `V016__create_place_references.sql` | SPEC-005 §4.4.7 | V004 |
| V017 | `V017__seed_confirmed_catalogs.sql` | SPEC-005 §4.5 | V011 |
| V018 | `V018__add_unspecified_evidence_moment.sql` | SPEC-005 §4.6 | V008, V011 |
| V019 | `V019__add_legacy_code_to_green_elements.sql` | SPEC-005 §4.7 | V007 |
| V020 | `V020__add_deferred_upload_and_map_publication.sql` | SPEC-005 §4.8 | V008 |
| V021 | `V021__create_campus_buildings.sql` | SPEC-102 §4.1 | V004 |
| V022 | `V022__create_campus_features.sql` | SPEC-102 §4.2 | V004 |
| V023 | `V023__extend_zones_for_map.sql` | SPEC-102 §4.3 | V014 |
| V024 | `V024__add_location_description_to_incidents.sql` | SPEC-102 §4.4 | V010, V021 |
| V025 | `V025__seed_map_parameters.sql` | SPEC-102 D-04 | V003 |

`maintenance_frequencies` no figura entre las pendientes: ya existe como **V002** (SPEC-101).
SPEC-006, que la diseñaba aparte, quedó superado.

Los planes de `docs/superpowers/plans/` citan los números antiguos: son registro histórico de
cómo se ejecutó cada plan y no se corrigen.
