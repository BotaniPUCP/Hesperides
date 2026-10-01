# SPEC-006 — Frecuencias de mantenimiento

> ⛔ **Superado por [SPEC-101](../features/SPEC-101-frecuencias-mantenimiento.md)** (decisión del
> 1 oct 2026). SPEC-101 implementó `maintenance_frequencies` como `V002`, con un diseño que fusiona
> el modelo multipatrón con la vigencia temporal de este spec. Este documento se conserva como
> registro de las decisiones que lo motivaron; **no debe implementarse**.

| Campo | Valor |
|-------|-------|
| HU relacionada | A-06 (`docs/PRODUCT-BACKLOG.md`) |
| Autor | Equipo Hesperides |
| Plataforma | Web |
| Sprint | S3 |
| Dependencias | SPEC-002 (modelo de datos), SPEC-003 (catálogos), SPEC-005 (taxonomía real) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-002 §4.6 (pendiente P-03, que este spec cierra) · SPEC-002 §4.7
> (`contracts.agreed_frequency_item_id`) · SPEC-003 §3 (`parent_item_id`, jerarquía de catálogos) ·
> SPEC-005 §4.2 (las 9 clases y 45 tipos sobre los que se define una frecuencia).

> **Este spec cierra el pendiente P-03 de SPEC-002 y enmienda SPEC-002 §4.6 y SPEC-003 §8.**
> Anotado en [`REGISTRO.md`](../REGISTRO.md).

---

## 1. Objetivo

Definir, por tipo de intervención, cada cuánto debe repetirse el trabajo y con qué holgura, de modo
que el sistema pueda señalar un mantenimiento vencido y medir cumplimiento **sin que una desviación
justificada por el clima se reporte como incumplimiento**.

---

## 2. Contexto

### 2.0 Por qué P-03 estaba abierto y por qué ya se puede cerrar

SPEC-002 §4.6 dejó este pendiente con una razón explícita:

> «No se modela aún una tabla `maintenance_frequencies` porque **no se sabe si la frecuencia se
> define por zona, por tipo de elemento, por especie, o por combinación**. Modelarla a ciegas
> obligaría a rehacerla.»

**La 2.ª entrevista resolvió esa incógnita, y la respuesta es la más simple de las cuatro: la
frecuencia se define por tipo de actividad.** Ninguna frecuencia que el cliente declaró varía por
zona, por especie ni por tipo de elemento:

- El riego es «campus completo cada 15 días» — no «cada 15 días en el sector 1 y cada 20 en el 2».
- El corte de césped es «cada 30-45 días» para todo el campus.
- El control fitosanitario es «aplicación a todo el campus», estacional.

Lo que **sí** apareció, y es el hallazgo que determina el modelo, es que **la periodicidad se expresa
de formas distintas según la actividad**.

### 2.1 El dato del cliente

| Actividad | Frecuencia declarada | Forma de la regla |
|---|---|---|
| **Riego** | Campus completo cada **15 días** | Intervalo entre ejecuciones |
| **Corte de césped** | Cada **30-45 días** (teoría: 21) | Intervalo **con rango** |
| **Control fitosanitario** | Estacional, mínimo **4 al año** | **Conteo anual**, no intervalo |
| **Poda mayor** | **1 al año**, diciembre-enero | Conteo anual **con ventana estacional** |
| **Poda a demanda** | ~3 veces al año, «sin frecuencia fija» | **No hay regla** — es reactiva |
| **Mantenimiento de jardines** | Diario | Intervalo |

**Son tres criterios de evaluación distintos, no uno.** Un intervalo y un conteo anual no se calculan
igual: el primero mira la distancia entre dos ejecuciones consecutivas, el segundo cuenta ejecuciones
dentro de un año. Y la poda a demanda no tiene regla en absoluto.

### 2.2 La restricción que manda: el clima

El cliente fue explícito sobre por qué las frecuencias no son fijas:

> **2026 fue un año atípico:** «casi como si tuviéramos un verano eterno». Sin invierno frío, las
> plagas no se redujeron y hubo que cortar más seguido (cada 30-35 días). Van por el **tercer control
> fitosanitario** y podría hacer falta uno más.

**Un modelo de valor fijo reportaría incumplimiento donde hubo buena gestión.** Cortar cada 35 días en
un año sin invierno no es incumplir: es adaptarse. El sistema tiene que poder distinguir una
desviación tolerable de un mantenimiento realmente vencido, y **quién define esa tolerancia es el
coordinador, no el código**.

### 2.3 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.frequencies`
- Entidades: `MaintenanceFrequency` (propia de este spec)
- Repositorios: `MaintenanceFrequenciesRepository`
- Servicio: `MaintenanceFrequenciesService` / `MaintenanceFrequenciesServiceImpl`
- Engine: `pe.edu.pucp.hesperides.engine.frequency` — los evaluadores, **puros y sin I/O**
- Controller: `MaintenanceFrequenciesController` → `/api/v1/maintenance-frequencies`

### 2.4 Frontend web

- Ruta: `/admin/frecuencias` (App Router)
- Reutilizados de SPEC-C01: tabla, modal de formulario, selector de catálogo, badge de estado
- Hooks: `useCatalog('FREQUENCY_CRITERION')`, `useMaintenanceFrequencies()`

### 2.5 Móvil

**Fuera de alcance.** Configurar frecuencias es trabajo de gabinete del `COORDINADOR`; el canal móvil
sirve a la captura en campo (evidencia, insumos, catastro). El operario nunca edita una frecuencia.

### 2.6 Restricciones técnicas

- **DEBE usar:** el catálogo `FREQUENCY_CRITERION` para el criterio (INV-2: prohibido un `enum` de
  dominio en Java).
- **NO debe usar:** un `@Enumerated` ni un `CHECK` con la lista de criterios — añadir un criterio
  sería entonces una migración, y el proyecto exige extensibilidad sin recompilar.
- **NO debe usar** la tabla para frecuencias contractuales: eso es `contracts.agreed_frequency_item_id`
  (ver §2.7.3).
- Catálogos aplicables: `FREQUENCY_CRITERION` (nuevo), `INTERVENTION_TYPE` (SPEC-005).

### 2.7 Decisiones propias de este spec

#### 2.7.1 El criterio de evaluación es un catálogo, no un `enum`

**Decisión.** Qué se mide (`DAYS_BETWEEN`, `MIN_PER_YEAR`, `NONE`) es un ítem de
`FREQUENCY_CRITERION`, no un valor de código.

**Por qué.** Un `enum` obliga a desplegar para añadir una forma de frecuencia, y el cliente ya
demostró que su operación no cabe en una lista cerrada: en un solo año pasó de «4 controles
fitosanitarios» a «un cuarto podría hacer falta». Además INV-2 lo prohíbe expresamente.

**Alternativa descartada:** una columna `mode VARCHAR(20)` con un `CHECK`. Más simple de leer, pero
convierte cada criterio nuevo en una migración correctiva y contradice INV-2.

#### 2.7.2 Target + tolerancia en vez de mínimo y máximo

**Decisión.** El rango «30-45 días» se modela como `target_value = 30` y `tolerance_percent = 50`, no
como `min_days = 30` / `max_days = 45`.

**Por qué.** Dice lo que el cliente realmente quiere: **30 es la meta, 45 el límite aceptable**. Con
dos columnas de rango, los 45 días parecen igual de deseables que los 30, y el sistema no podría
distinguir «cumplió en el objetivo» de «cumplió por los pelos». Además, absorber un año atípico es
ajustar **un** parámetro, no redefinir un rango.

**Alternativa descartada:** `min_days`/`max_days`. Es la forma obvia y por eso se consideró primero;
se descartó porque pierde la noción de objetivo y porque duplica la información cuando la tolerancia
es 0.

#### 2.7.3 Esta tabla no reemplaza a `contracts.agreed_frequency_item_id`

**Decisión.** Conviven. `maintenance_frequencies` es la frecuencia **operativa** (la que el cliente
practica y con la que se evalúa el mantenimiento); `contracts.agreed_frequency_item_id` es la
frecuencia **pactada en un contrato**, que es una etiqueta de documento.

**Por qué.** Son datos de distinta naturaleza y distinta fuente. La operativa la conocemos por
entrevista; la contractual **no la hemos visto** — W-07 del backlog sigue bloqueada porque no sabemos
si las frecuencias están escritas en los contratos.

> ⚠️ **Consecuencia que hay que respetar en los reportes:** mientras no veamos un contrato, el
> comparativo de F-03 **no puede llamarse «pactado vs. real»**. Compara contra lo que el cliente
> declaró en entrevista, que es una referencia operativa, no una obligación contractual. Llamarlo
> «pactado» afirmaría algo que no hemos verificado.

#### 2.7.4 La tolerancia se define por actividad, no global ni por criterio

**Decisión.** Cada fila de `maintenance_frequencies` lleva su propia `tolerance_percent`.

**Por qué.** El cliente no es igual de flexible con todo: el césped admite estirarse de 30 a 45 días
(50%), pero el control fitosanitario tiene un mínimo de 4 al año que no se negocia. Una tolerancia
global los metería en el mismo saco.

**Alternativa descartada:** tolerancia en el ítem del catálogo. Todo lo que usara `DAYS_BETWEEN`
compartiría holgura — riego y césped tienen el mismo criterio y holguras muy distintas.

#### 2.7.5 La configuración tiene vigencia temporal

**Decisión.** Cada frecuencia lleva `valid_from` / `valid_to`. Cambiar una tolerancia **cierra** la
fila vigente y crea una nueva; nunca actualiza en sitio.

**Por qué.** Es la decisión más importante de este spec. Sin vigencia, relajar la tolerancia del
césped en noviembre convertiría retroactivamente en cumplidos los meses que se habían evaluado como
incumplidos. **Eso destruye la trazabilidad, que es el valor central del sistema** — el cliente no
pidió Hesperides para ahorrar dinero, sino para poder demostrar qué se hizo y cuándo.

Con vigencia, cada periodo se evalúa con la configuración que regía en su fecha, y siempre se puede
responder *por qué* un mes se juzgó así.

**Alternativa descartada:** persistir el veredicto de cada evaluación con sus parámetros. Funciona y
es más rápido de consultar, pero exige un proceso que cierre cada periodo, y un periodo sin cerrar
queda sin veredicto. La vigencia no necesita proceso alguno: se calcula al vuelo y el resultado es
siempre reproducible.

#### 2.7.6 `NONE` es un criterio explícito, no un nulo

**Decisión.** La poda a demanda se configura con criterio `NONE`, no dejándola sin fila.

**Por qué.** «No tiene frecuencia» y «nadie la ha configurado todavía» son estados distintos y se
tratan distinto: el primero es una decisión tomada, el segundo un pendiente. Un nulo los vuelve
indistinguibles, y el sistema empezaría a reportar como «sin configurar» una actividad que por
naturaleza es reactiva.

Es Fail Fast aplicado a la configuración: el dato dice la verdad en vez de callar.

---

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/maintenance-frequencies` | `ADMIN`, `COORDINADOR` | Lista las frecuencias **vigentes hoy**, con su tipo de intervención y criterio |
| `GET /api/v1/maintenance-frequencies/{interventionTypeId}/history` | `ADMIN`, `COORDINADOR` | Historial de configuraciones de un tipo, con sus vigencias |
| `POST /api/v1/maintenance-frequencies` | `COORDINADOR` | Configura la frecuencia de un tipo que no la tenía |
| `PUT /api/v1/maintenance-frequencies/{id}` | `COORDINADOR` | **Cierra la vigente y crea una nueva** (§5.1). No actualiza en sitio |
| `DELETE /api/v1/maintenance-frequencies/{id}` | `COORDINADOR` | Soft delete. Deja el tipo sin frecuencia configurada |
| `GET /api/v1/maintenance-frequencies/compliance` | `ADMIN`, `COORDINADOR` | Evaluación de cumplimiento por tipo en un periodo (`from`, `to`) |

**Cuerpos (este spec es la fuente de verdad hasta que exista el código):**

`POST` / `PUT` request:

```json
{
  "interventionTypeItemId": 42,
  "criterionItemId": 7,
  "targetValue": 30,
  "tolerancePercent": 50,
  "seasonStartMonth": null,
  "seasonEndMonth": null,
  "notes": "Teoría 21 días; el clima de Lima lo estira a 30-45"
}
```

`GET /compliance` response `data`:

```json
[
  {
    "interventionTypeItemId": 42,
    "interventionTypeLabel": "Corte de césped",
    "criterionCode": "DAYS_BETWEEN",
    "targetValue": 30,
    "toleranceLimit": 45,
    "observedValue": 35,
    "status": "WITHIN_TOLERANCE",
    "lastExecutionDate": "2026-09-02",
    "evaluatedWithConfigId": 12
  }
]
```

### 3.1 Decisiones que el código no explica

- **`PUT` no actualiza: versiona.** Un `PUT` que cambia `tolerancePercent` cierra la fila vigente
  (`valid_to = ayer`) e inserta una nueva. Se eligió `PUT` y no `POST /versions` porque desde la UI el
  coordinador está editando una frecuencia, no creando un objeto nuevo; el versionado es un detalle de
  implementación que no debe filtrarse al verbo.

- **`status` es un valor calculado, no un catálogo.** `ON_TARGET`, `WITHIN_TOLERANCE`, `OVERDUE`,
  `NOT_APPLICABLE` y `NOT_CONFIGURED` los deriva el Engine de la comparación; no son estados que
  alguien edite. No van a `catalog_items` porque INV-2 habla de tipos y estados **de dominio que el
  usuario administra**, y esto es el resultado de un cálculo.

- **`evaluatedWithConfigId` viaja en la response a propósito.** Es lo que permite responder «¿por qué
  este mes salió cumplido?» — apunta a la configuración vigente en esa fecha. Sin él, la vigencia
  temporal existiría en la base pero sería inauditable desde la API.

- **Configurar la frecuencia es `COORDINADOR`, no `ADMIN`.** Es una decisión de negocio (cada cuánto
  se riega), no de administración del sistema. El `ADMIN` puede leerla porque administra los
  catálogos de los que depende.

---

## 4. Migración de base de datos

Archivo: no aplica. La tabla existe como `V002__create_maintenance_frequencies.sql` (SPEC-101).

```sql
-- Propiedad de SPEC-006. Cierra el pendiente P-03 de SPEC-002 §4.6.
--
-- La frecuencia se define por TIPO DE INTERVENCIÓN, no por zona, especie ni
-- tipo de elemento: ninguna frecuencia declarada por el cliente varía por zona
-- ("campus completo cada 15 días", "cada 30-45 días" en todo el campus). Esa
-- era la incógnita que mantenía P-03 abierto.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('FREQUENCY_CRITERION', 'Criterios de frecuencia',
     'Cómo se evalúa si un mantenimiento se está cumpliendo', TRUE);

-- is_system = TRUE: cada code tiene un evaluador implementado en el Engine.
-- Sembrar un criterio nuevo desde la UI crearía una opción que no calcula nada,
-- así que el catálogo es extensible por migración + evaluador, no por pantalla.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, is_system, metadata)
SELECT ct.id, v.code, v.label, v.sort_order, TRUE, v.metadata::jsonb
FROM catalog_types ct, (VALUES
    ('DAYS_BETWEEN',  'Días entre ejecuciones', 1,
     '{"unit":"días","evaluates":"intervalo entre dos ejecuciones consecutivas"}'),
    ('MIN_PER_YEAR',  'Mínimo al año',          2,
     '{"unit":"ejecuciones","evaluates":"conteo dentro del año"}'),
    ('NONE',          'Sin frecuencia fija',    3,
     '{"unit":null,"evaluates":"nada: la actividad es reactiva"}')
) AS v(code, label, sort_order, metadata)
WHERE ct.code = 'FREQUENCY_CRITERION';

CREATE TABLE maintenance_frequencies (
    id                        BIGSERIAL PRIMARY KEY,
    intervention_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    criterion_item_id         BIGINT NOT NULL REFERENCES catalog_items(id),

    target_value              NUMERIC(8,2),
    tolerance_percent         NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- Ventana estacional. La poda mayor es "1 al año, diciembre-enero": el
    -- conteo anual no basta, la ejecución tiene que caer en su ventana.
    -- Cruza fin de año, así que start > end es válido (12 → 1).
    season_start_month        SMALLINT,
    season_end_month          SMALLINT,

    -- Vigencia. Un cambio de tolerancia NUNCA actualiza en sitio: cierra esta
    -- fila y crea otra. Sin esto, relajar la tolerancia en noviembre volvería
    -- cumplidos los meses ya evaluados como incumplidos, y el histórico de
    -- cumplimiento dejaría de ser defendible ante la jefatura.
    valid_from                DATE NOT NULL,
    valid_to                  DATE,

    notes                     TEXT,

    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                TIMESTAMP,

    CONSTRAINT chk_mf_tolerance
        CHECK (tolerance_percent >= 0 AND tolerance_percent <= 500),
    CONSTRAINT chk_mf_target_positive
        CHECK (target_value IS NULL OR target_value > 0),
    CONSTRAINT chk_mf_validity
        CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CONSTRAINT chk_mf_season_months
        CHECK ((season_start_month IS NULL AND season_end_month IS NULL)
            OR (season_start_month BETWEEN 1 AND 12
                AND season_end_month BETWEEN 1 AND 12))
);

-- Un tipo de intervención no puede tener dos configuraciones vigentes a la vez.
-- Parcial por deleted_at (INV-4) y por valid_to: las cerradas sí conviven.
CREATE UNIQUE INDEX idx_mf_one_current_per_type
    ON maintenance_frequencies (intervention_type_item_id)
    WHERE deleted_at IS NULL AND valid_to IS NULL;

CREATE INDEX idx_mf_type_validity
    ON maintenance_frequencies (intervention_type_item_id, valid_from, valid_to)
    WHERE deleted_at IS NULL;
```

**Lo que el DDL no dice:**

- **`target_value` es nulable** porque el criterio `NONE` no tiene valor objetivo. Que sea coherente
  con el criterio (`NULL` si y solo si `NONE`) lo valida el servicio: un `CHECK` no puede consultar el
  `code` del ítem referenciado, que vive en otra tabla.

- **`tolerance_percent` admite hasta 500%** y no 100. El césped ya necesita 50%, y una actividad anual
  con holgura de un trimestre son ~25%; el techo alto es deliberado para no bloquear un caso real, y
  el límite razonable lo pone quien configura. Cero es el default porque la mayoría de frecuencias no
  admiten holgura.

- **`season_start_month > season_end_month` es válido.** La poda mayor va de diciembre a enero. El
  `CHECK` solo verifica el rango 1-12; que la ventana cruce el año es normal y lo interpreta el
  evaluador.

- **Las frecuencias no se siembran en esta migración.** Los valores del cliente entran por la pantalla
  de administración o por una migración de datos aparte, y CA-10 de SPEC-002 exige que ninguna
  migración siembre datos pendientes del cliente. El catálogo `FREQUENCY_CRITERION` **sí** se siembra
  porque sus tres valores son estructura del sistema, no dato del cliente.

---

## 5. Comportamiento

### 5.1 Flujo principal — configurar una frecuencia

1. El `COORDINADOR` entra a `/admin/frecuencias` → ve los tipos de intervención con su frecuencia
   vigente, y los que no tienen ninguna marcados como **sin configurar**.
2. Elige un tipo y pulsa **Configurar** → formulario con criterio, valor objetivo, tolerancia y
   ventana estacional opcional.
3. Al elegir criterio `NONE`, el formulario **oculta** valor y tolerancia: no aplican.
4. Guarda → el servicio valida la coherencia criterio/valor y crea la fila con
   `valid_from = hoy`, `valid_to = NULL`.
5. La lista muestra la frecuencia vigente y el límite de tolerancia calculado («30 días, hasta 45»).

### 5.2 Flujos alternativos

- **Editar una frecuencia que ya existe:** el servicio cierra la vigente con `valid_to = ayer` e
  inserta la nueva con `valid_from = hoy`, **en una sola transacción**. Nunca hay dos vigentes ni un
  día sin ninguna.

- **Editar una frecuencia creada hoy:** `valid_to = ayer` dejaría `valid_to < valid_from` y violaría
  `chk_mf_validity`. En ese caso se **actualiza en sitio**, porque no ha existido ningún periodo
  evaluado bajo esa configuración: no hay histórico que proteger.

- **Criterio `NONE` con valor objetivo:** `BusinessRuleException` → 422. No se ignora el valor en
  silencio; un dato contradictorio se rechaza (Fail Fast).

- **Tipo de intervención sin frecuencia configurada:** los reportes lo muestran como
  `NOT_CONFIGURED`, **nunca como incumplido**. Es un pendiente de configuración, no una falta
  operativa.

- **Desactivar el tipo de intervención referenciado:** la frecuencia sobrevive y queda oculta de los
  reportes operativos. No se borra: el histórico de cumplimiento de los meses en que el tipo estuvo
  activo sigue siendo legítimo.

### 5.3 Casos límite

- **Una sola ejecución registrada, criterio `DAYS_BETWEEN`:** no hay intervalo que medir. Devuelve
  `NOT_APPLICABLE` con la fecha de esa ejecución, no `OVERDUE`. Un intervalo necesita dos puntos.

- **Cero ejecuciones en el periodo consultado:** `OVERDUE` si la última ejecución conocida (aunque sea
  anterior al periodo) excede el límite de tolerancia; `NOT_APPLICABLE` si nunca se registró ninguna.
  Distinguirlos importa: «se dejó de hacer» y «nunca se hizo» son problemas distintos.

- **El periodo consultado abarca dos configuraciones:** se evalúa cada tramo con la suya y la response
  devuelve un resultado por tramo, cada uno con su `evaluatedWithConfigId`. **No se promedian**: un
  promedio entre dos tolerancias distintas no significa nada.

- **`MIN_PER_YEAR` sobre un periodo menor a un año:** se prorratea el objetivo (4 al año → 1 en un
  trimestre) y se declara el prorrateo en la response. Sin prorrateo, todo trimestre saldría
  incumplido.

- **Ventana estacional y ejecución fuera de ella:** cuenta para el conteo anual pero se marca
  `outOfSeason: true`. La poda mayor hecha en julio se hizo, pero no en el cierre del campus, y el
  coordinador debe poder verlo.

- **`tolerance_percent = 0` y desviación de un día:** `OVERDUE`. Tolerancia cero significa cero; si el
  cliente quiere margen, lo configura.

---

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Las tres formas de frecuencia del cliente se pueden configurar sin tocar código | En `/admin/frecuencias`, configurar riego (`DAYS_BETWEEN` 15, tol. 10%), fitosanitario (`MIN_PER_YEAR` 4, tol. 0%) y poda a demanda (`NONE`). Las tres se guardan y se listan |
| CA-02 | El rango 30-45 días del césped se representa y el límite se muestra calculado | Configurar `DAYS_BETWEEN` 30 con tolerancia 50%. La lista muestra «30 días, hasta 45». Un intervalo de 44 días da `WITHIN_TOLERANCE`; uno de 46, `OVERDUE` |
| CA-03 | **Cambiar la tolerancia no altera un periodo ya evaluado** | Evaluar un mes con tolerancia 0% y anotar el resultado. Subir la tolerancia a 50%. Re-consultar el **mismo** mes: el resultado no cambió, y `evaluatedWithConfigId` apunta a la configuración antigua |
| CA-04 | Un tipo sin frecuencia no se reporta como incumplido | Consultar `/compliance` con un tipo sin configurar: devuelve `NOT_CONFIGURED`, nunca `OVERDUE` |
| CA-05 | Un criterio incoherente se rechaza en vez de ignorarse | `POST` con `criterionItemId` = `NONE` y `targetValue` = 30 → 422 con mensaje explícito. Verificar que no se creó ninguna fila |
| CA-06 | No pueden existir dos configuraciones vigentes del mismo tipo | Intentar `POST` de una segunda frecuencia para un tipo que ya la tiene vigente → error. Comprobar en BD: `SELECT count(*) FROM maintenance_frequencies WHERE intervention_type_item_id = X AND valid_to IS NULL AND deleted_at IS NULL` devuelve 1 |
| CA-07 | Editar versiona en vez de sobrescribir | `PUT` cambiando la tolerancia de una frecuencia creada **ayer o antes**. El historial (`/history`) muestra dos filas: la anterior con `valid_to` y la nueva vigente |
| CA-08 | Un solo registro de ejecución no produce un falso incumplimiento | Con una única intervención registrada de un tipo `DAYS_BETWEEN`, `/compliance` devuelve `NOT_APPLICABLE`, no `OVERDUE` |
| CA-09 | La ventana estacional se evalúa aparte del conteo | Registrar la poda mayor en julio con ventana dic-ene configurada: cuenta para el `MIN_PER_YEAR` y llega con `outOfSeason: true` |
| CA-10 | La migración no siembra frecuencias del cliente | En base recién migrada: `SELECT count(*) FROM maintenance_frequencies` devuelve **0**, y `FREQUENCY_CRITERION` tiene exactamente **3** ítems |
| CA-11 | Verificado en navegador real (INV-10) | Abrir `/admin/frecuencias` en Chrome o Firefox, configurar una frecuencia y recargar. El dato persiste y no hay error de CORS en consola |

---

## 7. Especificación visual

**Pantalla:** `/admin/frecuencias` — una tabla, un modal. Sin gráficos: es configuración, no analítica.

- **Tabla:** tipo de intervención · clase (agrupador) · criterio · objetivo · límite de tolerancia
  calculado · ventana estacional · acciones.
- Los tipos **sin configurar** aparecen con badge neutro y acción **Configurar**. No se ocultan: hay
  que poder ver qué falta.
- **Modal:** selector de criterio primero; valor objetivo y tolerancia **se ocultan** si el criterio
  es `NONE`. La ventana estacional es un par de selectores de mes, opcional y colapsado por defecto.
- **El límite de tolerancia se muestra calculado en vivo** mientras se escribe («30 días + 50% = hasta
  45 días»). Es lo que evita que alguien configure 500% sin darse cuenta.
- **Al editar**, un aviso visible: *«Los periodos ya evaluados conservan la configuración anterior»*.
  La versión silenciosa haría dudar al coordinador de si rompió el histórico.
- Breakpoints: en móvil (<640px) la tabla colapsa a tarjetas. Es pantalla de gabinete, pero no debe
  romperse.
- Estados: default, loading (skeleton de tabla), error (banner de SPEC-C02), vacío («ningún tipo de
  intervención configurado todavía»).

---

## 8. Tests

```
Evaluadores del Engine (puros, sin BD)
- DAYS_BETWEEN, target 30, tol 0, intervalo 30 → ON_TARGET
- DAYS_BETWEEN, target 30, tol 50, intervalo 44 → WITHIN_TOLERANCE
- DAYS_BETWEEN, target 30, tol 50, intervalo 46 → OVERDUE
- DAYS_BETWEEN con una sola ejecución → NOT_APPLICABLE (no OVERDUE)
- DAYS_BETWEEN sin ninguna ejecución → NOT_APPLICABLE
- MIN_PER_YEAR, target 4, año con 4 ejecuciones → ON_TARGET
- MIN_PER_YEAR, target 4, año con 3 → OVERDUE
- MIN_PER_YEAR, target 4, trimestre con 1 → ON_TARGET (prorrateo declarado)
- MIN_PER_YEAR, target 4, trimestre con 0 → OVERDUE
- NONE, cualquier historial → NOT_APPLICABLE, siempre
- Ventana dic-ene, ejecución en enero → in season
- Ventana dic-ene, ejecución en julio → cuenta, outOfSeason = true
- Ventana dic-ene: verifica que el cruce de año no se evalúa como rango vacío

Vigencia temporal
- Evaluar un periodo con config A, cambiar a config B, re-evaluar el mismo periodo → resultado idéntico
- Periodo que abarca A y B → un resultado por tramo, cada uno con su configId, sin promediar
- Editar una frecuencia creada hoy → actualiza en sitio, no crea versión (evita valid_to < valid_from)
- Editar una frecuencia creada ayer → cierra la anterior y crea nueva, en una transacción
- Fallo al insertar la nueva versión → la anterior sigue vigente (no queda ningún tipo sin frecuencia)

Coherencia criterio / valor
- NONE con targetValue → 422, no se persiste nada
- DAYS_BETWEEN sin targetValue → 422
- criterionItemId de un catálogo distinto (p. ej. un ROLE) → BusinessRuleException (SPEC-003 §5.2)
- interventionTypeItemId que no pertenece a INTERVENTION_TYPE → BusinessRuleException

Unicidad e integridad
- Segunda frecuencia vigente para el mismo tipo → violación del índice parcial
- Soft delete de una frecuencia → deja de listarse, sobrevive en el historial
- Tipo de intervención desactivado → su frecuencia no aparece en reportes operativos pero no se borra
- tolerance_percent negativo → rechazado por chk_mf_tolerance
- target_value = 0 → rechazado por chk_mf_target_positive
```

---

## 9. Propio de este spec

**Acciones auditables** (SPEC-004 §3.2) — se añaden tres:

| Acción | Cuándo |
|---|---|
| `MAINTENANCE_FREQUENCY_CREATED` | Se configura la frecuencia de un tipo |
| `MAINTENANCE_FREQUENCY_VERSIONED` | Se cierra una configuración y se abre otra. **Registra ambos valores de tolerancia** |
| `MAINTENANCE_FREQUENCY_DELETED` | Soft delete de una configuración |

`MAINTENANCE_FREQUENCY_VERSIONED` es la más importante de las tres: relajar una tolerancia cambia qué
cuenta como incumplimiento, y eso debe ser rastreable hasta la persona y la fecha. Sin auditoría, la
vigencia temporal protege el histórico pero no explica **quién** decidió el cambio.

**Extensibilidad — cómo se añade un criterio nuevo.** Dos pasos, en este orden:

1. Implementar el evaluador en `engine/frequency` con sus tests.
2. Sembrar el ítem en `FREQUENCY_CRITERION` por migración.

**Nunca al revés.** Un criterio sembrado sin evaluador es una opción visible en la UI que no calcula
nada. Por eso los ítems son `is_system = TRUE`: la pantalla de catálogos no debe poder crear uno.

**Checklist propio:**

- [ ] `SELECT count(*) FROM maintenance_frequencies` = 0 en base recién migrada (CA-10)
- [ ] Los tres evaluadores viven en el Engine y **no** importan nada de Spring, JPA ni I/O
- [ ] Ningún `enum` de Java representa el criterio (INV-2)
- [ ] El aviso de «los periodos ya evaluados conservan la configuración anterior» aparece al editar
- [ ] Verificado en navegador real (CA-11, INV-10)
