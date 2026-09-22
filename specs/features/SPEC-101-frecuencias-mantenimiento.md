# SPEC-101 — Configuración de Frecuencias de Mantenimiento

| Campo | Valor |
|-------|-------|
| HU relacionada | Requisito 1.7 del Catálogo de Requisitos — configurar frecuencias de mantenimiento preventivo |
| Plataforma | Web (gestión y consulta) / Backend API |
| Sprint | S1 |
| Dependencias | SPEC-002 (§4.6 P-03, §4.7), SPEC-003 (§8), SPEC-005 (§2.0.2, §2.0.6, §4.2), SPEC-C01, SPEC-C02, SPEC-C03 |

---

## 1. Objetivo

Permitir que un administrador o coordinador parametrice las reglas de periodicidad teórica,
rangos operativos de días, cuotas estacionales y ciclos de cobertura para cada actividad de
mantenimiento del campus, distinguiendo el régimen operativo (personal propio PUCP vs.
contratistas tercerizados), para que el sistema tenga una base de comparación contra las
ejecuciones reales y pueda advertir oportunamente sobre atenciones desfasadas.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** SPEC-002 §4.6 (cierra el pendiente **P-03** de frecuencias),
> SPEC-003 (catálogos de tipos de regla), SPEC-005 (taxonomía de intervenciones jerárquica y
> dimensiones del campus).
>
> **La regla de este spec: contiene lo que el código NO dice.** Formas de request y response,
> props, DDL y listas de tests viven en el repositorio, que es donde se compilan y ejecutan. Aquí
> van las decisiones, las reglas de negocio y los porqués: lo que nadie puede deducir leyendo la
> implementación.

### 2.1 Dónde vive el código

- **Backend:** `modules/maintenance/` (controller, dto, entity, repository, service). La tabla
  `maintenance_frequencies` es propiedad de este spec; `CatalogItem` es de SPEC-003.
- **Frontend:** `frontend/src/app/admin/frecuencias/` (ruta Next.js App Router) y
  `frontend/src/components/maintenance/` (pantalla, modal, badge).
- **Tipos compartidos:** [`shared/types/maintenance.ts`](../../shared/types/maintenance.ts),
  espejo de los DTO del backend para web (y eventualmente móvil).
- **API Client:** `frontend/src/lib/maintenance-api.ts`.

Los nombres de clase y de archivo se leen del repo, no de este documento: una lista aquí queda
desfasada en cuanto alguien refactoriza. Lo que sí se fija es la **estructura por capas** de
`REGLAS.md` §5.2 y que la UI reutiliza los componentes de SPEC-C01 sin redefinir sus props.

### 2.2 Componentes reutilizados de SPEC-C01

`Button`, `Input`, `Modal`, `Card`, `Badge`, `EmptyState`, `LoadingSkeleton`. **Ningún
componente de UI se redefine ni se extiende.** La columna «Modelo» de la tabla usa `Badge` con
sus props `label` y `color` (no `variant` ni `children`: eso es lo que el componente **no**
acepta, y confundirlos produce un badge visualmente vacío — §2.7 D-08).

### 2.3 Módulo móvil

**Fuera de alcance, deliberadamente.** La matriz del Anexo A de SPEC-001 otorga al OPERARIO
lectura del módulo 1.7 pero no escritura. La configuración de frecuencias es una labor
administrativa que se hace desde un escritorio, no desde el campo. Un operario consulta los
ritmos de trabajo asignados, pero la parametrización la hacen ADMIN y COORDINADOR.

Cuando se escriba el spec de la app móvil, la consulta de frecuencias consumirá los mismos
endpoints `GET` definidos aquí sin cambios.

### 2.4 Restricciones técnicas

- DEBE usar: Spring Boot 4.1.1, Flyway cronológico (`V010`), Hibernate 7 / JPA con Bean
  Validation en DTOs, Jackson 3 (`tools.jackson`), Next.js 16 (App Router) con TypeScript.
- NO debe usar: `enum` para tipos de regla de frecuencia (INV-2); se utiliza el catálogo
  configurable `FREQUENCY_RULE_TYPE`.
- Catálogos aplicables:
  - `FREQUENCY_RULE_TYPE`: `INTERVAL_DAYS`, `SEASONAL_PERIOD`, `ANNUAL_WINDOW`, `COVERAGE_CYCLE`, `ON_DEMAND`.
  - `INTERVENTION_CLASS` e `INTERVENTION_TYPE`: taxonomía sembrada en `V009`.
- Patrón de catálogos aplicable: `FREQUENCY_RULE_TYPE` (`is_system = TRUE`, ítems protegidos).

### 2.5 Decisiones propias de este spec

Cada decisión se numera con `D-XX` para poder referenciarla desde el código o desde otros specs.

**D-01 · Modelo Multi-Patrón en lugar de un entero `days_interval`.**
La investigación en campo (SPEC-005 §2.0.2, §2.0.6) demostró que el césped opera en un rango
(30-45 días según estación, con teórico de 21 días), el fitosanitario por cuota estacional
(mínimo 4 al año), la poda mayor en ventana anual acotada (diciembre-enero), y el riego por
ciclo de rotación espacial (15-16 días en 3 sectores). Forzar un entero plano falsearía la
realidad operativa.
*Alternativa descartada:* una columna fija `interval_days INT` obligatoria.

**D-02 · Alcance (`scope`) desacoplado de la migración física de `zones`.**
La tabla `zones` pertenece al módulo de Catastro Verde (M2) y aún no ha sido migrada a la base
de datos (V001 a V009 no la incluyen). `maintenance_frequencies` incorpora la columna `scope`
con tres valores posibles y una columna nullable `zone_id BIGINT` para permitir vinculación
futura:

| Valor de `scope` | Qué significa | Cuándo se usará |
|---|---|---|
| `CAMPUS_WIDE` (por defecto) | La regla aplica a todo el campus por igual | Ahora: frecuencias generales del campus |
| `BY_SECTOR` | Diferenciada por sector operativo (ej. los 3 sectores de riego confirmados en SPEC-005) | Cuando los datos de sectores se pueblen en la tabla `zones` |
| `BY_ZONE` | Específica para una zona o jardín particular del campus (vinculada por `zone_id`) | Cuando `zone_id` tenga clave foránea real a `zones(id)` |

**Esta columna NO existe en ninguna otra tabla del proyecto.** Es propia de `maintenance_frequencies`
y se añade anticipadamente para que la estructura de datos no necesite un `ALTER TABLE` disruptivo
cuando el módulo M2 esté listo. La tabla `teams` (V005) tiene un `zone_id` nullable con el mismo
principio, pero sin la columna `scope`.

*Alternativa descartada:* migrar `zones` anticipadamente sin las definiciones completas de
polígonos pendientes de M2 (P-01 de SPEC-002).

**D-03 · Soft-delete con unicidad lógica por actividad, régimen y ámbito.**
No puede existir más de una frecuencia activa simultáneamente para la misma combinación de tipo
de actividad, régimen operativo y ámbito geográfico. Se aplica un índice único parcial
`WHERE deleted_at IS NULL`.
*Alternativa descartada:* permitir duplicados y resolver en memoria la frecuencia vigente.

**D-04 · `season_modifier` es texto generado, no texto libre.**
SPEC-002 §4.6 P-03 dejó pendiente si la frecuencia se define por zona, por tipo de elemento,
por especie, o por combinación. La investigación de campo reveló que la variación más
significativa es **por estación climática** (verano, otoño, invierno, primavera): el césped
crece mucho más rápido en verano y el fitosanitario tiene distinta presión por plagas según
la época.

La columna `season_modifier VARCHAR(255)` almacena un resumen textual generado automáticamente
por el frontend a partir de los campos numéricos que el usuario configuró por estación. Ejemplos:

- `"Verano: 30-35d (teór. 21d) · Invierno: 40-45d (teór. 21d)"`
- `"Uniforme todo el año"`
- `"1 por estación (Verano, Otoño, Invierno, Primavera) (+ Refuerzos según plagas)"`

**El usuario nunca escribe este texto a mano.** El formulario le presenta campos numéricos por
estación y el frontend compone el resumen. Esto resuelve el problema de usabilidad detectado
durante la implementación: un campo de texto libre etiquetado «modificador climático estacional»
era incomprensible para alguien que no conoce el sistema (§2.7 D-06).

*Alternativa descartada:* un campo de texto libre donde el usuario escriba la descripción.

**D-05 · El formulario varía dinámicamente según el tipo de regla.**
Cada `FREQUENCY_RULE_TYPE` habilita campos distintos en el modal: `INTERVAL_DAYS` muestra
intervalos por estación, `SEASONAL_PERIOD` muestra cuota anual, `ANNUAL_WINDOW` muestra ventana
temporal, `COVERAGE_CYCLE` muestra días de ciclo, y `ON_DEMAND` no muestra campos adicionales.
Un formulario fijo con todos los campos sería confuso y produciría datos inconsistentes.

### 2.6 Relación con P-03 de SPEC-002

SPEC-002 §4.6 declara:

> «No se modela aún una tabla `maintenance_frequencies` porque no se sabe si la frecuencia se
> define por zona, por tipo de elemento, por especie, o por combinación.»

Este spec **resuelve** esa incertidumbre con base en la investigación de campo documentada en
SPEC-005. La frecuencia se define **por tipo de actividad (labor)** y **régimen operativo**,
con variación estacional codificada en `season_modifier`. Las dimensiones restantes (zona,
especie) se resuelven por la columna `scope` y `zone_id` cuando el módulo M2 las migre.

Nada en SPEC-002 se modifica: este spec agrega lo que P-03 dejó pendiente sin alterar tablas
ni migraciones previas.

### 2.7 Correcciones y ajustes detectados durante la implementación

Estos ajustes se hicieron sobre el código de **esta propia funcionalidad** durante su desarrollo.
**Ningún spec previo fue modificado** ni sus specs fundacionales alterados. Se documentan aquí
para dejar constancia de los porqués.

**D-06 · El campo `season_modifier` pasó de texto libre a formulario guiado por estaciones.**
El diseño inicial presentaba un campo de texto libre con placeholder
`"Ej. Verano: ~30 días, Invierno: ~45 días"`. En las pruebas de usabilidad, un usuario sin
conocimiento del sistema no sabía qué escribir ahí. Se reemplazó por un formulario multi-estación
con filas dinámicas donde el usuario selecciona la estación (`VERANO`, `OTOÑO`, `INVIERNO`,
`PRIMAVERA`) e ingresa valores numéricos (`Mín. días`, `Máx. días`, `Teórico`). El frontend
genera el texto de `season_modifier` automáticamente.

Impacto: **solo frontend** (componente `FrequencyFormModal.tsx`). El backend, la migración y la
API no cambiaron: `season_modifier` sigue siendo `VARCHAR(255)`, solo cambia quién escribe ese
texto.

**D-07 · Se añadieron 4 estaciones en vez de solo 2 (verano/invierno).**
El formulario inicial solo ofrecía verano e invierno. Sin embargo, la agronomía en Lima
distingue cuatro periodos relevantes:
- **Verano** (Ene-Mar): mayor radiación, crecimiento acelerado.
- **Otoño** (Abr-Jun): transición, crecimiento moderado.
- **Invierno** (Jul-Set): menor radiación, crecimiento lento.
- **Primavera** (Oct-Dic): rebrote y floración activa.

El usuario puede agregar solo las estaciones que necesite (por ejemplo, solo verano e invierno
si la labor no varía significativamente en las transiciones) o las cuatro si quiere mayor
granularidad. Es una decisión por frecuencia, no global.

Impacto: **solo frontend**. El backend no tiene conocimiento de cuántas estaciones hay;
`season_modifier` es un resumen textual.

**D-08 · El componente `Badge` de SPEC-C01 usa `label` y `color`, no `variant` ni `children`.**
El componente `FrequencyRuleBadge` originalmente pasaba el texto como `children` y el estilo
como `variant`. `Badge` de SPEC-C01 acepta `label: string` y `color?: BadgeColor`. Al no
recibir `label`, el badge se renderizaba vacío (la columna «Modelo» aparecía en blanco). Se
corrigió para usar las props correctas.

Impacto: **solo frontend** (`FrequencyRuleBadge.tsx`). No se modificó `Badge.tsx` ni ningún
componente de SPEC-C01.

**D-09 · `apiClient` usa `del` para peticiones DELETE (conforme a SPEC-C02).**
El cliente HTTP base (`lib/api.ts`, propiedad de SPEC-C02) expone los métodos como `get`, `post`,
`put` y `del` (evitando la palabra reservada de JavaScript). Se aseguró que `maintenance-api.ts`
invoque estrictamente `apiClient.del<null>(...)`, respetando la firma original de SPEC-C02 sin
alterar la interfaz compartida.

**D-10 · Navegación: enlace en la página de inicio y botón «Volver al inicio».**
La funcionalidad estaba accesible únicamente escribiendo la URL `/admin/frecuencias` en la barra
de navegación. Se añadió:
1. En `page.tsx` (Home): un enlace «Frecuencias de mantenimiento» visible según el rol del
   usuario (todos los roles con lectura: ADMIN, COORDINADOR, SUPERVISOR, OPERARIO).
2. En `MaintenanceFrequenciesScreen.tsx`: un botón «Volver al inicio» en la cabecera.

Esto sigue el mismo patrón que `/admin/usuarios` en SPEC-100: la Home lista los módulos
disponibles según el rol, y cada pantalla de administración tiene un enlace de regreso.

**D-11 · Eliminación de la opción «Ambos» (`BOTH`) en la modalidad de ejecución.**
La opción `BOTH` introducía un solapamiento semántico con `IN_HOUSE` y `OUTSOURCED` que hacía
ambigua la restricción de unicidad y las consultas de búsqueda. En la operativa agronómica real del
campus, una labor tercerizada responde a un contrato de servicios con periodicidades fijadas
contractualmente, mientras que el personal propio opera bajo dinámicas internas. Si una labor se
ejecuta bajo ambas modalidades con idénticos parámetros, el usuario registra dos reglas
explícitas (una para `IN_HOUSE` y otra para `OUTSOURCED`). A nivel de UI, el selector se rotula
como «Modalidad de ejecución» para mayor claridad del usuario.

**D-12 · Numeración cronológica de migración `V010`.**
Siguiendo `REGLAS.md` §0.2 (*«la numeración es cronológica y sin huecos. Una migración nueva toma
el siguiente número libre»*), se asignó `V010__create_maintenance_frequencies.sql` por ser el
siguiente número disponible tras `V009`. La mención en SPEC-002 de un `V010__seed_catalogs.sql`
quedó superada dado que la taxonomía y catálogos fundacionales fueron sembrados en `V009`. Flyway
con `out-of-order = false` impide renumerar hacia atrás sin alterar entornos ya desplegados.

---

## 3. Contratos de API

**La forma exacta de cada request y response está en el código, que es donde se verifica:**
`modules/maintenance/dto/` (backend) y [`shared/types/maintenance.ts`](../../shared/types/maintenance.ts)
(espejo tipado para web). El envoltorio `{ok, message, data}` es INV-1. Nada de eso se reproduce
aquí: una copia que nadie compila es la única que puede mentir.

Esta sección fija lo que el código **no** puede decir: quién puede llamar a cada endpoint y qué
decisión hay detrás.

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/maintenance/frequencies` | `ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO` | Lista frecuencias configuradas. Filtros opcionales: `regime`, `activityTypeItemId`, `active` |
| `GET /api/v1/maintenance/frequencies/{id}` | Mismos cuatro roles | Detalle de una regla de frecuencia |
| `POST /api/v1/maintenance/frequencies` | `ADMIN`, `COORDINADOR` | Registra una nueva regla de periodicidad |
| `PUT /api/v1/maintenance/frequencies/{id}` | `ADMIN`, `COORDINADOR` | Actualiza parámetros de una regla existente |
| `DELETE /api/v1/maintenance/frequencies/{id}` | `ADMIN`, `COORDINADOR` | Desactiva (soft delete) una regla de frecuencia. Retorna `204 No Content` sin cuerpo (SPEC-C03 §8) |
| `GET /api/v1/maintenance/frequencies/activity-types` | Mismos cuatro roles | Lista los tipos de actividad/intervención del catálogo |
| `GET /api/v1/maintenance/frequencies/rule-types` | Mismos cuatro roles | Lista los tipos de regla de frecuencia del catálogo |

### 3.1 Decisiones que el código no explica

**`DELETE` es soft delete y retorna `204 No Content`.** Coincide con INV-4 y con el patrón transversal
obligatorio de SPEC-C03 §8 (*«DELETE (soft delete) → 204 No Content. Sin cuerpo (ni siquiera el
sobre estándar)»*). Al ejecutar `DELETE /frequencies/{id}`, el backend asigna `deleted_at = NOW()` y
`is_active = FALSE`. La fila permanece para trazabilidad y para que las intervenciones históricas
que referencien esta frecuencia no queden huérfanas.

**No existe «Eliminar permanentemente».** El botón de la UI dice «Desactivar» y la confirmación
explica que es borrado lógico. Esto es deliberado: si una frecuencia se usó como base para
planificar intervenciones pasadas, destruir la fila rompería esa referencia. La desactivación
retira la regla de la lista activa sin perder el historial.

**El campo `active` en la respuesta JSON se llama `active`, no `isActive`.** En Java, un campo
`boolean active` con Lombok `@Getter` genera `isActive()`, que Jackson serializa como `active`.
El tipo TypeScript en `maintenance.ts` lo refleja como `active: boolean`.

**El orden por defecto del listado es `activityType.label ASC`.** Esta pantalla se usa para
buscar la periodicidad de una labor concreta; el orden alfabético por nombre de actividad es el
que permite recorrerla con la vista.

**Los endpoints de catálogo (`/activity-types`, `/rule-types`) no son operaciones de negocio**
sino lookups de catálogo para poblar los selectores del formulario. Su autorización es amplia
(los cuatro roles) porque son de lectura y contienen datos no sensibles.

---

## 4. Migración de base de datos

**El DDL está en `backend/src/main/resources/db/migration/V010__create_maintenance_frequencies.sql`.**

Esta migración:
1. Inserta el catálogo `FREQUENCY_RULE_TYPE` con 5 ítems en `catalog_types` y `catalog_items`.
2. Crea la tabla `maintenance_frequencies` con todos sus campos, restricciones CHECK y un índice
   único parcial para la regla de unicidad de D-03.

### 4.1 Decisiones que el DDL no explica

**`scope` es un `CHECK` de tres valores, no un catálogo** (excepción consciente a INV-2, igual
que `refresh_tokens.client_type` en SPEC-001 y `credential_status` en SPEC-100). Es metadato
estructural de la frecuencia, no un dato de negocio que un administrador amplíe desde la UI.
Los tres valores (`CAMPUS_WIDE`, `BY_SECTOR`, `BY_ZONE`) son niveles de granularidad geográfica
derivados de la jerarquía del campus definida en SPEC-005, y añadir uno exigiría lógica nueva
en backend, no solo una fila de catálogo.

**`zone_id` no tiene FK a `zones(id)`** porque esa tabla no existe aún. Es el mismo patrón que
`teams.zone_id` en V005 (SPEC-002): nullable, sin FK, con un comentario que justifica la
omisión. Cuando M2 migre `zones`, se agregará la FK con un `ALTER TABLE` en una migración nueva.

**`is_active` y `deleted_at` coexisten.** Son dos hechos distintos:
- `is_active = FALSE`: la regla está desactivada operativamente pero la fila sigue visible para
  consultas históricas si se filtra con `active=false`.
- `deleted_at IS NOT NULL`: la regla fue retirada lógicamente y no aparece en ninguna consulta
  estándar (Hibernate `@SQLRestriction`).
El `DELETE` de la API asigna ambos. La separación permite, en el futuro, desactivar
temporalmente una regla (ej. pausa invernal) sin borrarla lógicamente.

**El `COALESCE(zone_id, 0)` en el índice único** resuelve el hecho de que en PostgreSQL dos
`NULL` no se consideran iguales para un índice único. Sin el `COALESCE`, se podrían crear
múltiples frecuencias campus-wide para la misma actividad y régimen porque `zone_id IS NULL`
no violaría la unicidad.

---

## 5. Comportamiento esperado

### 5.1 Flujo principal (Happy Path) — crear una frecuencia

1. El ADMIN o COORDINADOR entra a la página de inicio y hace clic en **Frecuencias de
   mantenimiento**.
2. El sistema carga `GET /api/v1/maintenance/frequencies`, `/activity-types` y `/rule-types`
   en paralelo y muestra la tabla con los filtros superiores.
3. El usuario presiona **+ Nueva frecuencia**.
4. Selecciona la actividad del catálogo de intervenciones (ej. «Corte de césped»).
5. Selecciona la modalidad de ejecución (Personal propio o Servicio tercerizado).
6. Selecciona el tipo de regla (ej. «Intervalo por días»).
7. El formulario adapta dinámicamente sus campos de entrada según el tipo de regla (D-05):
   - **Intervalo por días:** ofrece dos modos: «Por estaciones» (con filas dinámicas para
     Verano, Otoño, Invierno, Primavera) o «Todo el año uniforme» (tres campos numéricos).
   - **Periodicidad estacional:** selector de distribución temporal («1 por estación» fija automáticamente cuota mínima de 4 al año; «Semestral» fija 2 al año; «Cuota personalizada» habilita el campo numérico libre para la cantidad mínima anual). Permite indicar refuerzos adicionales por plagas.
   - **Ventana anual:** selección de periodo (ej. Diciembre-Enero).
   - **Ciclo de cobertura:** días para completar el 100% y turno horario.
   - **A demanda:** sin campos adicionales.
8. El usuario llena los valores numéricos, opcionalmente agrega notas, y guarda.
9. El frontend compone `seasonModifier` a partir de los campos numéricos (D-04) y envía
   `POST /api/v1/maintenance/frequencies`.
10. El backend valida coherencia (D-01), verifica unicidad activa (D-03), persiste y retorna
    `201 Created`.
11. Un feedback de éxito confirma la creación y la tabla se refresca.

### 5.2 Flujos alternativos

- **Edición:** El usuario modifica rangos o notas. `PUT` actualiza y registra `updated_at`.
  El tipo de actividad no es editable (es la identidad de la regla); para cambiar la actividad
  se desactiva la regla y se crea una nueva.
- **Desactivación:** El usuario presiona «Desactivar» en una fila. Aparece un `confirm` que
  explica que es borrado lógico: *«Se aplicará borrado lógico: la frecuencia dejará de estar
  activa para planificar intervenciones, pero se conservará en la base de datos para no perder
  el historial ni la trazabilidad.»* Si acepta, `DELETE` aplica soft-delete.

### 5.3 Casos límite

- **Incoherencia de rango:** Si `minDaysInterval > maxDaysInterval`, el servicio lanza
  `BusinessRuleException` que el manejador global traduce a `422 Unprocessable Entity` (SPEC-C02 §5.3)
  con mensaje descriptivo: *«El intervalo mínimo no puede superar al intervalo máximo»*. El código
  HTTP `400 Bad Request` se reserva exclusivamente para fallos sintácticos de Bean Validation (ej.
  campos base faltantes o enteros negativos).
- **Duplicidad:** Intentar registrar dos reglas activas para la misma actividad, régimen y
  ámbito retorna `409 Conflict`. El índice único parcial de D-03 lo garantiza a nivel de base
  de datos, y el servicio lo traduce a una excepción de negocio descriptiva.
- **Campos nulos según tipo de regla:** Si `frequencyRuleTypeCode == 'INTERVAL_DAYS'` pero
  falta `minDaysInterval` o `maxDaysInterval`, el servicio lanza `BusinessRuleException`
  (`422 Unprocessable Entity`). Análogamente para `SEASONAL_PERIOD` sin `annualTargetCount` y
  `COVERAGE_CYCLE` sin `coverageTargetDays`.
- **Desactivar una frecuencia ya desactivada:** La fila no aparecerá en la lista (el filtro por
  defecto es `deleted_at IS NULL`), así que el caso es prácticamente inalcanzable desde la UI.
  Si se fuerza por API, `findById` con `@SQLRestriction` lanza `404`.

---

## 6. Criterios de aceptación

Verificables sin leer el código. Los marcados **[manual]** exigen un navegador real (INV-10).

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Permite configurar una frecuencia con rango de días y variación estacional. | `POST` con `INTERVAL_DAYS`, `minDaysInterval=30`, `maxDaysInterval=45` retorna 201. La fila aparece en el listado. |
| CA-02 | Permite configurar una frecuencia estacional por cuota anual. | `POST` con `SEASONAL_PERIOD` y `annualTargetCount=4` persiste correctamente. |
| CA-03 | Validación de coherencia en intervalos numéricos. | Enviar `minDaysInterval=45` y `maxDaysInterval=30` retorna `422 Unprocessable Entity`. |
| CA-04 | Restricción de unicidad activa por actividad, régimen y ámbito. | Crear dos frecuencias idénticas activas para la misma actividad y régimen retorna `409 Conflict`. |
| CA-05 | Autorización estricta por rol (INV-5). | OPERARIO que intente `POST` recibe `403 Forbidden`. SUPERVISOR que intente `DELETE` recibe `403 Forbidden`. |
| CA-06 | Soft delete no destruye el registro histórico. | `DELETE` asigna `deleted_at`; la fila desaparece de la lista activa; una query directa confirma que la fila física permanece. |
| CA-07 | **[manual]** La columna «Modelo» muestra badges coloreados con el nombre del tipo de regla (no aparece vacía). | Entrar a `/admin/frecuencias` y verificar visualmente. |
| CA-08 | **[manual]** El formulario multi-estación permite agregar/quitar estaciones dinámicamente. | Crear una frecuencia con Verano, agregar Invierno y Primavera, quitar Primavera, guardar. |
| CA-09 | **[manual]** El enlace desde la página de inicio funciona y el botón «Volver al inicio» regresa. | Navegar ida y vuelta entre Home y Frecuencias. |
| CA-10 | La desactivación (botón «Desactivar») funciona sin error silencioso. | Crear una frecuencia, desactivarla, verificar que desaparece del listado. |

---

## 7. Especificación visual

### 7.1 Web (Next.js)

El maquetado está implementado y usa exclusivamente componentes y tokens de SPEC-C01: no hay
ningún patrón visual nuevo que describir. Lo que no se deduce mirando la pantalla:

- **Ocultar controles según el rol es usabilidad, no seguridad.** Un SUPERVISOR no ve «+ Nueva
  frecuencia» ni «Editar» ni «Desactivar» porque mostrarle algo que siempre daría 403 sería
  confuso. Quien lo impide es `@PreAuthorize` en el controller. **Nunca se implementa un
  permiso escondiendo un botón.**

- **La tabla de frecuencias tiene 7 columnas:**

  | Columna | Qué muestra | Por qué está |
  |---|---|---|
  | Actividad / Labor | Nombre de la actividad y, si hay, la nota resumida | Identificador principal para el usuario |
  | Modalidad | Badge: Tercerizado / Personal propio | Distingue la modalidad de ejecución (D-11) |
  | Modelo | Badge coloreado con el tipo de regla de frecuencia | Indica la **lógica operativa** bajo la cual se programa la labor (D-01) |
  | Parámetros | Rango de días, cuota anual, ciclo, etc. según el modelo | Los valores numéricos concretos de la regla |
  | Duración | Días estimados de ejecución | Dato operativo para planificación |
  | Ámbito | «Todo el campus» / «Por sector» / «Por zona» (D-02) | Granularidad geográfica de la regla |
  | Acciones | Botones Editar y Desactivar (solo ADMIN/COORDINADOR) | Gestión de la regla |

- **El modal del formulario ocupa una sección coloreada** (`bg-emerald-50`) para los campos de
  intervalo por estación, separando visualmente la configuración estacional de los campos
  generales.

- **El formulario de multi-estación presenta radio buttons** entre «Por estaciones» y «Todo el
  año uniforme» al inicio. Esto evita que un usuario que quiere un intervalo fijo tenga que
  entender el concepto de estaciones.

- **`LoadingSkeleton` con la forma de la tabla**, no un spinner centrado.

- **La confirmación de desactivación nombra la acción y explica la consecuencia** (§5.2).

### 7.2 Móvil (React Native)

No aplica (§2.3).

---

## 8. Tests

**La suite vive en el repo** (`modules/maintenance/**Test.java`) y es ejecutable: `mvn test`.
Los casos mecánicos —sin token -> 401, campo vacío -> 400, rol insuficiente -> 403— son
invariantes de `REGLAS.md` y no se enumeran por endpoint.

Lo que sí debe quedar fijado aquí, porque es **regla de negocio y no se deduce leyendo un
método**:

```
Validación de reglas por tipo
- INTERVAL_DAYS sin min o max -> 422 Unprocessable Entity
- INTERVAL_DAYS con min > max -> 422 Unprocessable Entity (tanto backend como frontend)
- SEASONAL_PERIOD sin annualTargetCount -> 422 Unprocessable Entity
- COVERAGE_CYCLE sin coverageTargetDays -> 422 Unprocessable Entity

Unicidad
- Crear dos reglas activas idénticas (misma actividad, régimen y ámbito) -> 409 Conflict
- Desactivar una y volver a crear -> éxito (índice parcial WHERE deleted_at IS NULL)

Soft delete
- DELETE -> deleted_at asignado, is_active = FALSE
- La fila no aparece en GET (listado por defecto)
- La fila física permanece en la tabla

Seguridad y autorización
- GET sin token -> 401 Unauthorized
- POST con rol OPERARIO -> 403 Forbidden
- POST con rol SUPERVISOR -> 403 Forbidden
- POST con rol COORDINADOR -> 201 Created
- DELETE con rol COORDINADOR -> 204 No Content
```

---

## 9. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio de la configuración de frecuencias:

- **Autorización:** CUD solo `ADMIN` y `COORDINADOR`; lectura los cuatro roles.
  Coincide con el Anexo A de SPEC-001, sin reinterpretarlo.
- **`season_modifier` no es un campo de seguridad** pero sí un campo generado. Nunca contiene
  datos sensibles y no requiere escapado especial más allá del que Jackson aplica por defecto.
- **Las frecuencias no crean intervenciones automáticamente.** Son reglas teóricas de referencia.
  Las intervenciones se crean en otro módulo (Módulo 4 — Calendario/Agenda) que consultará estas
  frecuencias para sugerir fechas y detectar atrasos. Este spec no implementa esa conexión.

---

## 10. Extensibilidad y evolución prevista

- **Más tipos de regla** se crean desde `/admin/catalogs` agregando ítems a `FREQUENCY_RULE_TYPE`
  sin recompilar. Lo que no se resuelve solo es la UI del formulario: cada tipo nuevo necesita su
  sección de campos en `FrequencyFormModal`.
- **Vinculación con zonas:** cuando M2 migre `zones`, una nueva migración agrega la FK
  `ALTER TABLE maintenance_frequencies ADD CONSTRAINT fk_freq_zone FOREIGN KEY (zone_id) REFERENCES zones(id)`.
  La columna `scope` cobra sentido completo: `BY_ZONE` pasa de ser una etiqueta a ser
  filtrable por zona real.
- **Alertas de mantenimiento vencido** (mencionadas en P-03 de SPEC-002): un servicio futuro
  compara `maxDaysInterval` contra la fecha de la última intervención registrada para esa
  actividad y genera alertas. Las frecuencias parametrizadas aquí son la base de datos de
  referencia para ese cálculo.
- **Frecuencias por especie o tipo de elemento:** si el cliente lo requiere, se amplía la clave
  de unicidad con una columna `species_id` o similar. El diseño actual no lo estorba.

---

## 11. Checklist propio

El común está en [`REGLAS.md` §6](../REGLAS.md). Propio de este spec:

- [ ] La migración es `V010__create_maintenance_frequencies.sql` y usa `CREATE TABLE`, no
  `ALTER TABLE` (la tabla es nueva, no extiende una existente).
- [ ] Sin dependencias nuevas más allá del stack base.
- [ ] El componente `Badge` se invoca con `label` y `color`, no con `children` ni `variant` (D-08).
- [ ] `apiClient.del` es el método correcto para `DELETE` HTTP (D-09, conforme a SPEC-C02).
- [ ] Los cuatro roles pueden leer; solo ADMIN y COORDINADOR pueden escribir/desactivar.
- [ ] `season_modifier` es generado por el frontend, nunca escrito a mano por el usuario (D-04, D-06).
- [ ] `scope` tiene default `CAMPUS_WIDE` y `zone_id` es nullable sin FK (D-02).
- [ ] Los tests cubren los diez criterios de aceptación.
