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
| SPEC-C01 | Componentes UI            | 👀 En revisión  | —          | S0     |              |
| SPEC-C02 | Manejo de errores         | 👀 En revisión  | —          | S0     |              |
| SPEC-C03 | Patrones de API           | 👀 En revisión  | —          | S0     |              |
| SPEC-100 | Gestión de usuarios       | 👀 En revisión  | —          | S1     |              |

**Leyenda:** ⏳ Pendiente · 📝 En spec · 👀 En revisión · 🔄 En progreso · ✅ Completado

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
| SPEC-002 §4.3 (DDL) | SPEC-005 | `zones` gana `centroid GEOMETRY(Point)` y se siembran los 74 lugares y los 17 cuarteles. `parent_zone_id` pasa de hipótesis a uso real. P-01 de bloqueante a **parcial**: faltan los polígonos. **El papel de cada nivel lo corrige la fila de abajo tras la 2.ª entrevista.** |
| SPEC-002 §4.5 | SPEC-005 | `green_elements` gana `legacy_code` con índice **no único**: las placas de aluminio del inventario forestal antiguo están repetidas y reasignadas, y el cliente pide codificación nueva. |
| SPEC-002 §4.6 | SPEC-005 | `interventions` gana `requested_quantity`/`executed_quantity` + `unit_item_id` (el indicador de cumplimiento del cliente), `origin_item_id`, `reported_by_item_id`, `external_code` (correlativo `OSG-####` de la universidad), `requested_at` y `technical_sheet_key`. |
| SPEC-002 Anexo | SPEC-005 | P-01, P-02, P-04 y P-08 avanzan con la entrega DAF-OSG. Entra **P-10**: las clases `FITOSANITARIO` e `INSPECCION` están declaradas sin ningún tipo desglosado. |
| SPEC-003 §3 | SPEC-005 | `catalog_items` gana `parent_item_id`: los catálogos pueden ser **jerárquicos**. Nulable, así que los catálogos planos no cambian. |
| SPEC-003 §8 | SPEC-005 | Entran `INTERVENTION_CLASS`, `INTERVENTION_ORIGIN` e `INCIDENT_SOURCE`. Se actualizan los valores de `INTERVENTION_TYPE`, `SPECIES_TYPE` (9, confirmados), `MEASUREMENT_UNIT` (4), `EVIDENCE_MOMENT` (+`UNSPECIFIED`) y `URGENCY_LEVEL` (−`CRITICAL`). |
| **SPEC-000 §1 · REGLAS §0.1** | SPEC-005 | «Sin dependencia de servicios externos» pasa de **una** excepción a **tres**: además del SMTP se admiten la **publicación en el mapa interactivo del cliente** (hoy GitHub) y el **servicio de mapas** que lo renderiza (hoy Google Maps). El cliente **ya tiene** ese mapa y pidió que el sistema lo alimente: no es una dependencia que elijamos. **La condición que las acota es la misma que la del SMTP** — su caída nunca impide una operación de negocio: registrar una intervención se completa aunque la publicación falle, y si el mapa no carga las pantallas se degradan a listas. Se añade una **regla de aislamiento**: ningún servicio de dominio conoce al proveedor concreto, porque el mapa del cliente vive en el repositorio personal de una locadora de servicios y esa dependencia puede desaparecer. |
| **SPEC-002 §4.3** | SPEC-005 | La jerarquía de zonas deja de ser la incógnita «¿sector/subsector/jardín?»: es **sector de mantenimiento (3) → lugar (74) → jardín (~100)**, y los **cuarteles forestales quedan como vocabulario heredado en desuso**, conservados solo para leer el inventario de especies antiguo. |
| **SPEC-002 §4.6** | SPEC-005 | `intervention_evidences` gana `uploaded_at` (NULL = el dispositivo la tiene, la nube aún no) y `client_reference` (idempotencia en reintentos). Es el reflejo en servidor del flag de subida del móvil: hay cobertura en el campus pero no en todos los rincones, y para el operario **nunca existe un «no se pudo guardar»**. |
| **SPEC-002 §4.6 (2)** | SPEC-005 | `interventions` gana `published_at`, `publication_attempts` y `publication_error`: la publicación en el mapa del cliente es asíncrona, falible y **fuera de la transacción** que guarda la intervención. |
| Todos los specs | Refactor a formato atómico | Las invariantes comunes salen a **`REGLAS.md`** (lectura obligatoria antes de generar código): las diez invariantes, las convenciones de SPEC-000 §5 —con §5.2.1 de Spring Boot 4 y §5.2.2 de CORS íntegras— y el checklist común. SPEC-000 pierde la copia de `_plantilla.md` y los resúmenes de los otros specs, que ya contradecían a SPEC-001. En cada spec, las secciones genéricas de Seguridad, Extensibilidad y Checklist se funden en una sola "Propio de este spec". **La numeración se conserva**: toda referencia `SPEC-XXX §N` sigue siendo válida, y `SPEC-000 §5.x` pasa a `REGLAS.md §5.x` con el mismo número. Ninguna decisión técnica, contrato ni criterio de aceptación cambió. |

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
| **Mapeo lugar → cuartel forestal** | Cliente (3.ª entrevista) | **Baja de prioridad.** La 2.ª entrevista reveló que los cuarteles están **en desuso** («se usa cada vez menos… no me da mucha información»); la división viva son los sectores y los referentes (edificios, vías, jardines emblemáticos). El mapeo ya no bloquea reportes operativos: solo hace falta para leer el **inventario de especies antiguo**, que se ubica por cuartel y no tiene coordenadas (SPEC-005 §4.4.2, P-13a). |
| **Límites de los 3 sectores de mantenimiento** | Cliente (3.ª entrevista) | Existen dibujados en el mapa interactivo. Son el tercer nivel de la jerarquía de zonas y la unidad del ciclo de riego. Hay que pedirlos. |
| ~~¿El vivero entra en la fase 1?~~ | Equipo | **✅ Cerrada: NO entra.** La clase de actividad «Propagación y plantación» (10 tipos) **sí permanece** en la taxonomía: el personal estable propaga en campo, no solo en vivero — es la 2.ª clase más usada del Excel (36 de 171 registros). Las plantas que consume una intervención se registran como insumo, sin rastrear su origen. |
| **Cómo integrarse con el mapa interactivo del cliente** | Cliente (3.ª entrevista) | **Decidido: nos integramos, no construimos uno nuevo.** El cliente ya tiene un mapa de varias capas que comparten las 3 secciones de OSG y que **Carolina alimenta a mano cada semana** desde el Excel — ese trabajo manual es el dolor D1. Robert pidió «una aplicación que pueda enlazarse a este insumo». **Falta saber de qué fuente lee cada capa y si podemos escribir en ella**: si lee de una hoja de Google el riesgo es bajo y Carolina deja de copiar; si es cerrado, la integración automática no es posible. Preguntas en `docs/dominio/integracion-mapa-interactivo.md`. |
| ¿Los locales periféricos entran al alcance? | Cliente, antes del SPEC-2XX de intervenciones | El SPEC-000 acota el alcance al **campus**, pero el cliente registra trabajo en San Miguel, Chorrillos, Codesido y Mausoleo (hoja `Periféricos`). Si entran, `zones` necesita un nivel superior de sede y aparecen responsables de otras áreas. Es decisión de alcance, no técnica (SPEC-005 §9.2). |
| Intervenciones que afectan varias zonas | SPEC-2XX de intervenciones | `interventions.zone_id` es único, pero el registro del cliente tiene celdas como «Comedor Central, Gastronomía y Matemática». Al importar se crea una intervención por zona; si el caso resulta frecuente hará falta una tabla puente `intervention_zones` (SPEC-005 §5.4). |
| Composición de las cuadrillas | SPEC-1XX de equipos | Las tablas `teams`/`team_members` existen (SPEC-002 V012), pero el cliente aún no ha dicho cuántas cuadrillas hay, cómo se llaman ni qué zonas cubre cada una. |
