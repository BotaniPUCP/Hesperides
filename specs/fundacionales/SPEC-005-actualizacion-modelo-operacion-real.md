# SPEC-005 — Actualización del modelo a la operación real del cliente

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional correctivo, no deriva de una HU) |
| Autor | — |
| Plataforma | Ambas (corrige el modelo que sirve a web y móvil) |
| Sprint | S0 (fundacional) — habilita el Sprint 1 |
| Dependencias | SPEC-002 (enmienda §4.3, §4.4, §4.6, §4.9), SPEC-003 (enmienda §3, §8), SPEC-004 (autoría) |

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** SPEC-002 §4.1 (convenciones de tabla), SPEC-003 §7.2 (`is_system`),
> SPEC-003 §8 (inventario de catálogos). **Este spec enmienda specs fundacionales en revisión:
> los cambios están anotados en `REGISTRO.md`.**

> **La regla de este spec: contiene lo que el código NO dice.**
> Aquí va por qué el modelo cambia, qué entregó el cliente y qué sigue sin entregar.

---

## 1. Objetivo

Alinear el modelo de datos con la operación real del cliente —contrastando el Excel
«Recuperación y mantenimiento de Áreas Verdes 2025-2026» del área **DAF-OSG** con la **primera
entrevista a Robert Sánchez**, jefe de la Sección de Áreas Verdes y Medio Ambiente— corrigiendo
la taxonomía de intervenciones, incorporando la zonificación oficial (los **cuarteles
forestales**), el registro de cantidades y el origen del trabajo, y sembrando los catálogos que
ambas fuentes permiten cerrar.

## 2. Contexto

### 2.0 Las dos fuentes del cliente y cómo se concilian

Este spec se apoya en dos insumos de naturaleza distinta, y confundirlos produce errores:

| Fuente | Qué es | Qué aporta |
|---|---|---|
| **Excel DAF-OSG 2025-2026** | La hoja de cálculo operativa viva, exportada de Google Sheets (`userProvider="google-sheets"`, autor `DAF-OSG SOPORTE AMBIENTAL`) | El **detalle concreto**: taxonomías, coordenadas, especies, unidades, cómo se registra hoy |
| **Entrevista a Robert Sánchez** | Primera reunión de levantamiento con el jefe de la Sección de Áreas Verdes | El **marco**: dominio, alcance, dimensiones, vocabulario oficial y qué duele |

**Las dos son fuente de verdad del cliente y ninguna manda sobre la otra por defecto.** Se
complementan: la entrevista da el marco y el Excel lo puebla. Donde una calla, la otra informa.

**Cuando se contradicen**, este spec hace una de dos cosas, nunca elige en silencio:

1. **Decide**, si la contradicción es aparente —las dos describen cosas distintas, o una es más
   reciente— y deja escrito el porqué.
2. **Lo eleva a pregunta pendiente** para la siguiente entrevista, si decidir exigiría inventar
   criterio del cliente. Estas van en §9.3 marcadas como **contradicción**, no como vacío.

#### 2.0.1 Dónde discrepan, y qué se hizo con cada caso

| Tema | Excel | Entrevista | Resolución |
|---|---|---|---|
| **Zonificación** | 75 «lugares» planos con lat/long | **18 cuarteles forestales** (17 vigentes; el 7 desapareció al poner en valor la Huaca), que **engloban todo el campus** | **Decidido:** no es contradicción real sino dos niveles. Cuartel = padre, lugar = hijo (§4.4). Lo confirma el propio Excel: «cuartel 16, **sector** Arqueología» |
| **Alcance** | Solo personal estable | **Dos mundos**: estable y tercerizado | **Decidido:** el Excel cubre media operación, no la contradice (§2.0.2) |
| **Estados** | `Abierto` / `Cerrado` | Quiere seguimiento y trazabilidad que hoy no tiene | **Decidido:** se conserva el ciclo completo (D-03) |
| **Taxonomía de actividades** | 9 clases / 45 tipos, granularidad fina | «cuatro actividades»: poda, control fitosanitario, corte de césped, mantenimiento de jardines | **Decidido** (confirmado por el cliente): las cuatro son las **prioritarias**, no un catálogo rival. Se marcan como tales; las demás se construyen después (§2.0.3) |
| **Qué hace el personal estable** | Registra riego, propagación, residuos… | «ya no hacen control fitosanitario ni corte de césped» | **Decidido:** no hay contradicción. El catálogo del Excel ya es solo lo del estable, y los datos lo confirman (§2.0.4) |

#### 2.0.2 El Excel cubre solo la mitad del dominio

Una búsqueda sobre las nueve hojas no encuentra **ninguna** mención a tercerizados, proveedores,
contratos ni órdenes de compra. Esto no es un vacío del Excel: es que **la operación tiene dos
mitades con dinámicas distintas**, y el Excel solo documenta una.

| | Personal estable PUCP | Servicios tercerizados |
|---|---|---|
| **Actividades** | Mantenimiento de jardines · **poda menor** (árboles < 5 m) · riego | **Poda de altura** (> 5 m) · **control fitosanitario** · **corte de césped** |
| **Cómo se ordena** | Orden directa verbal al jefe de grupo. **No media documentación** | Requerimiento → orden de compra (la tramita Logística) → reporte → conformidad |
| **Quién aprueba** | La sección | **Logística del campus**, no la sección |
| **Evidencia** | Foto en Drive | Informe final del proveedor + fichas diarias + charlas de seguridad |
| **Frecuencia** | Diaria | Fitosanitario: estacional (cada 3 meses) · Poda mayor: anual (dic-ene, ~200-250 árboles) · Poda a demanda: ~3/año · Césped: cada 30-45 días |
| **Fuente** | El Excel | **Solo la entrevista** |

**Consecuencia para este spec:** las tablas `providers`, `contracts` y `contract_executions` que
SPEC-002 define en §4.7 **no son especulativas** — responden a una mitad real y documentada de la
operación. Este spec no las toca, pero deja constancia de que su justificación ya no es un
supuesto. El dolor explícito de Robert es que del tercerizado «lo que se controla es el producto
final» y quiere «transparentar algunas cosas con ellos».

**Esto es lo que más cambia el encuadre del proyecto.** Antes de la entrevista, el Excel sugería
un sistema de registro de actividades de jardinería. Con la entrevista, el problema real es
**gestionar dos regímenes operativos distintos bajo una sola trazabilidad**: uno sin
documentación alguna (estable) y otro donde la documentación existe pero es opaca y llega tarde
(tercerizado).

### 2.0.3 Las cuatro actividades prioritarias (P-11, resuelto)

**Confirmado por el cliente:** las cuatro que Robert nombra no son una clasificación rival de las
9 clases del Excel. Son las **prioritarias**: lo que el sistema debe cubrir primero.

| Actividad prioritaria | A qué corresponde en la taxonomía | Régimen |
|---|---|---|
| **Poda** | Clase `PODA` completa (4 tipos) | Poda menor: estable · Poda de altura: tercerizado |
| **Control fitosanitario** | Clase `FITOSANITARIO` — declarada **sin tipos** (P-10) | Tercerizado |
| **Corte de césped** | **No existe** como tipo en el catálogo del Excel (§2.0.4) | Tercerizado |
| **Mantenimiento de jardines** | Clase `MANTENIMIENTO` completa (10 tipos) | Estable |

Dos de las cuatro **no están cubiertas por el catálogo del Excel**, y no por descuido: son las que
ejecuta un tercero, y el Excel solo documenta al personal estable (§2.0.2). Esto explica P-10 —
`FITOSANITARIO` está declarada sin tipos porque su detalle vive en el contrato del proveedor, no
en la hoja de los jardineros.

**Cómo se marca la prioridad:** con un flag en `metadata` del ítem de clase
(`{"priority": true}`), no con una tabla ni un catálogo aparte. Es un atributo de planificación
del proyecto, no del dominio: cuando las cuatro estén construidas, el flag pierde sentido y se
retira sin migración. Un `catalog_type` nuevo obligaría a mantener para siempre una distinción
temporal.

> **Consecuencia para el orden de trabajo:** el cliente autoriza dejar las demás clases para
> después de las cuatro, y aprovechar los cruces. El cruce es real y favorable: `MANTENIMIENTO` y
> `PODA` cubren **81 de los 171 registros** con taxonomía nueva, y ambas son de personal estable,
> que es el régimen del que ya tenemos datos. Construir esas dos primero entrega valor sobre la
> mitad del volumen sin depender de ninguna entrega pendiente del cliente.

### 2.0.4 Qué ejecuta el personal estable (P-12, resuelto)

La aparente contradicción se cierra con los datos, sin necesidad de preguntar. De los 171
registros con taxonomía nueva:

| Clase | Registros |
|---|---|
| Mantenimiento de jardines | 59 |
| Propagación y plantación | 36 |
| Poda | 22 |
| Habilitación de jardines | 18 |
| Rehabilitación y rediseño | 15 |
| Riego | 11 |
| Manejo de residuos vegetales | 10 |

**Cero registros de corte de césped y cero de control fitosanitario** — exactamente lo que Robert
describe. Las dos fuentes coinciden: **el catálogo del Excel ya es la lista de lo que el personal
estable ejecuta**, y por eso no contiene esos dos tipos.

El falso positivo que hay que no confundir: «Instalación de césped» aparece 10 veces bajo
`HABILITACION` («se colocó champa de grass»). **Colocar césped nuevo no es cortarlo**: son
actividades distintas que comparten la palabra, una del estable y otra del tercero.

**Consecuencia:** el catálogo se siembra tal cual, sin filtrar. El formulario del operario ofrece
lo que hay, que ya es su ámbito real. Cuando entre el registro de trabajo tercerizado, sus tipos
llegarán por el contrato, no por esta taxonomía.

### 2.0.5 Las nueve hojas del Excel

| Hoja | Visible | Qué es | Qué aporta |
|---|---|---|---|
| `tipo de actividades` | Sí | **Catálogo maestro** de clases y tipos de actividad | La taxonomía real de intervenciones (§4.2) |
| `lugares` | Sí | 75 lugares del campus con lat/long | El nivel hijo de `zones` (§4.4) |
| `tipologia de flora` | Sí | 9 tipos de vegetación | Los ítems de `SPECIES_TYPE` (§4.5) |
| `2026` | Sí | 283 registros de intervención del año en curso | El formato real del registro diario (§3.1) |
| `Podas arbpalm` | Sí | 25 podas con código OSG, cantidades y ficha técnica | Cantidades, origen e incidencia externa (§4.3) |
| `Periféricos` | Sí | 4 trabajos en locales fuera del campus | El alcance extra-campus (§9.2) |
| `PUCP` | Oculta | Histórico 2025, formato antiguo | Solo referencia; no se migra |
| `Podas arbustossetos` | Oculta | Borrador superado por `Podas arbpalm` | Nada; se ignora |
| `aprovechamiento de grass y conf` | Oculta | Traslado de material reutilizado | Un concepto no modelado (§9.2) |

### 2.0.6 Dimensiones del dominio (de la entrevista)

Cifras que Robert dio y que ningún documento del proyecto recogía. Acotan el tamaño real del
catastro y de los reportes:

- **41 hectáreas** de campus, de las cuales **15.6 ha son áreas verdes**.
- **~100 jardines** en la ruta de corte de césped.
- **17 cuarteles forestales** vigentes de 18 históricos.
- **30% del catastro de arbolado digitalizado** — el catastro está en construcción, no existe
  completo. Es exactamente lo que el Sprint 1 viene a resolver.
- **3 sectores de riego**; el campus completo debe regarse en **15 días**.
- **~200-250 árboles** en la poda mayor anual; **10-15 árboles/día** de rendimiento del tercero.
- Césped mayoritariamente **grass americano**; también bermuda y paspalum.
- La sección existe desde **agosto de 2024**: es nueva, y por eso sus procesos aún no están
  formalizados.

### 2.1 Backend

- Paquetes afectados: `modules.catalogs` (entidad `CatalogItem`), `modules.admin` (`Zone`,
  `Species`), `modules.interventions` (`Intervention`), `modules.incidents` (`Incident`).
- Entidades **nuevas**: ninguna. Este spec modifica entidades que SPEC-002 ya posee.
- Entidad modificada con código ya escrito: **`CatalogItem`** es la única que existe hoy en el
  repositorio (`modules/catalogs/entity/CatalogItem.java`). El resto son entidades que SPEC-002
  define pero que nadie ha implementado todavía, así que para ellas este spec es una corrección
  sobre papel, no un refactor.

### 2.2 Frontend web

Sin rutas ni componentes nuevos. El único impacto es que el selector de tipo de intervención
pasa de ser **un** desplegable plano a **dos** dependientes (clase → tipo), lo que afecta al
formulario de intervenciones cuando se escriba su SPEC-2XX. Se anota aquí para que quien lo
escriba no diseñe un selector simple.

### 2.3 Móvil

Fuera de alcance: la app móvil es fase 2 y no existe todavía. La misma nota del §2.2 le aplica
cuando llegue.

### 2.4 Restricciones técnicas

- DEBE usar: Flyway para todo cambio de esquema; los `code` de catálogo en mayúsculas sin
  tildes, como el resto del proyecto.
- NO debe usar: `enum` de Java para la nueva jerarquía (INV-2); tampoco una tabla
  `intervention_classes` propia — la jerarquía va en `catalog_items` (§2.5).
- Catálogos aplicables: `INTERVENTION_CLASS` (nuevo), `INTERVENTION_TYPE` (resembrado),
  `SPECIES_TYPE`, `MEASUREMENT_UNIT`, `INCIDENT_SOURCE` (nuevo), `INTERVENTION_ORIGIN` (nuevo),
  `URGENCY_LEVEL` (corregido), `ZONE_TYPE`.

### 2.5 Decisiones propias de este spec

**D-01 · La jerarquía se modela con `parent_item_id` en `catalog_items`, no con una tabla propia.**
El cliente clasifica en dos niveles (clase → tipo de actividad). Añadir una autorreferencia a
`catalog_items` sirve a cualquier catálogo jerárquico futuro; crear `intervention_classes`
resolvería solo este caso y rompería INV-2, que exige que todo tipo sea fila de catálogo.
*Alternativa descartada:* dos FK sueltas en `interventions` sin relación entre sí — permitiría
guardar la combinación imposible «clase Riego + tipo Canteo».

**D-02 · `interventions` guarda las dos FK (clase y tipo), aunque la clase sea derivable.**
Es desnormalización deliberada. El cliente reporta por clase (§3.1 muestra que agrupa así), y un
tipo podría reasignarse de clase en el futuro sin que eso deba reescribir el histórico: lo que se
ejecutó bajo la clase «Poda» se reportó bajo «Poda» para siempre.
*Alternativa descartada:* derivar la clase por `JOIN` en cada consulta de reporte.

**D-03 · Se conserva el ciclo de estados de seis valores pese a que el cliente solo usa dos.**
El Excel registra `Abierto`/`Cerrado` porque una hoja de cálculo no puede hacer cumplir un flujo.
El sistema sí, y el flujo asignación → ejecución → validación es el que justifica el proyecto.
Los dos estados del cliente se mapean al importar (§5.3).
*Alternativa descartada:* reducir el catálogo a dos estados, que haría el sistema un Excel con
login.

**D-04 · `URGENCY_LEVEL` pierde `CRITICAL`.** El cliente usa tres niveles y solo tres. El cuarto
fue inventado por SPEC-002. Se desactiva (`is_active = FALSE`) en lugar de borrarse, conforme a
SPEC-003 §7.1.

**D-05 · Los 75 lugares entran como `zones` con punto, no con polígono.** El cliente entregó
coordenadas puntuales. `boundary` sigue nulo y P-01 **no queda cerrado**, solo desbloqueado: se
puede asignar un elemento a una zona real, pero no calcular superficies ni pintar áreas en mapa.
Decir que P-01 está resuelto sería falso.

**D-07 · La jerarquía de zonas es cuartel forestal → lugar, con dos niveles.**
Robert nombra los **cuarteles forestales** como la zonificación histórica que «engloba todo el
campus»: 18 denominados, 17 vigentes. El Excel lo confirma sin saberlo, en comentarios de texto
libre («Canteo y deshierbo en el **cuartel 16, sector Arqueología**», «Canteo jardines de
tesorería **(Cuartel 1)**»). Ese comentario es la prueba de que lugar y cuartel no compiten: son
padre e hijo. `parent_zone_id` —que SPEC-002 ya previó— pasa de hipótesis a uso concreto.
*Alternativa descartada:* dejar los 75 lugares planos, que impediría cualquier reporte agregado
por sector y desperdiciaría el vocabulario oficial del cliente.

**D-08 · El código de árbol se modela como campo propio, no se reutiliza el `code` del elemento.**
Robert describe placas de aluminio con códigos de un inventario antiguo que ya no es fiable: hay
árboles sin placa, placas de ejemplares muertos y placas recicladas en otra planta («un código
que le corresponde a un eucalipto… se lo puso a una palmera»). Pide explícitamente «un código
nuevo y una actualización de inventario». Por eso el código heredado va en un campo aparte
(`legacy_code`), **nunca** en `green_elements.code`, que es el identificador nuevo y único que
irá en el QR.
*Alternativa descartada:* migrar los códigos antiguos como código principal, que arrastraría al
sistema nuevo un identificador que el propio cliente considera no fiable.

**D-06 · La evidencia histórica no se migra en este spec.** Son ~250 fotos alojadas en Google
Drive. Moverlas es un trabajo de datos con su propio riesgo (enlaces caducos, permisos, sin
distinción antes/después) y merece su propio spec. Aquí solo se deja el esquema preparado (§4.6).

---

## 3. Invariantes de contrato

Este spec no expone endpoints. Los invariantes que impone a toda API que lea estas tablas:

- **Un tipo de actividad nunca viaja sin su clase.** Toda response que incluya el tipo de
  intervención incluye también la clase, porque el tipo por sí solo (`Canteo`, `Trasplante`) no
  es interpretable en un reporte.
- **`requested_quantity` y `executed_quantity` viajan siempre con `unit`.** Un número sin unidad
  («2») no significa nada cuando la unidad puede ser unidades, metros o metros cuadrados.
- **El código externo (`OSG-####`) nunca se genera.** Es propiedad del sistema de la universidad;
  Hesperides lo almacena y lo muestra, jamás lo inventa ni lo autocompleta.

### 3.1 El formato real del registro (lo que el Excel demuestra)

Las columnas con las que el cliente registra hoy una intervención, y su destino en el modelo:

| Columna del Excel | Destino | Nota |
|---|---|---|
| `Clase` | `interventions.intervention_class_item_id` | Nuevo (§4.2) |
| `Actividad` | `interventions.intervention_type_item_id` | Resembrado (§4.2) |
| `Estado` | `interventions.status_item_id` | Solo usa `Abierto`/`Cerrado` (D-03) |
| `Fecha de solicitud` | `interventions.requested_at` | **Vacía en las 283 filas** de 2026 |
| `Fecha de atención` | `interventions.completed_at` | Siempre presente |
| `Lugar` | `interventions.zone_id` | 25 valores no están en el catálogo (§5.4) |
| `Comentario` | `interventions.execution_notes` | Texto libre; confirma que P-04 basta por ahora |
| `Foto` | `intervention_evidences` | 1:N confirmado: hasta 10 fotos por actividad |
| `Responsable` | `interventions.assigned_to_user_id` | Solo 3 personas: Alfonso (69), Oscar (56), Andrés (48) |

**`Fecha de solicitud` vacía en el 100% de las filas de 2026** no es un descuido: en el flujo
diario del campus el trabajo se ejecuta sin solicitud previa formal. Solo `Podas arbpalm` —donde
el trabajo nace de una incidencia OSG— llena fecha de reporte y de ejecución. Por eso
`requested_at` es **nulable** y por eso existe `INTERVENTION_ORIGIN` (§4.3): distingue el trabajo
rutinario del que responde a un hallazgo.

---

## 4. Migración de base de datos

Rango `V013`–`V018`. Las migraciones `V001`–`V012` ya están escritas o definidas por SPEC-002 y
**no se tocan**: reescribir una migración aplicada rompe Flyway por checksum. Todo lo que este
spec corrige de `V010` se hace con `UPDATE`/`INSERT` en migraciones nuevas.

### 4.1 V013 — Jerarquía en catálogos

```sql
-- V013__add_hierarchy_to_catalog_items.sql
-- Habilita catálogos de dos niveles (SPEC-005 D-01). Enmienda SPEC-003 §3.

ALTER TABLE catalog_items
    ADD COLUMN parent_item_id BIGINT REFERENCES catalog_items(id);

CREATE INDEX idx_catalog_items_parent ON catalog_items(parent_item_id);

-- Un ítem no puede ser su propio padre. La profundidad máxima real (dos niveles)
-- la hace cumplir el servicio, no la base: PostgreSQL no expresa esa regla en un CHECK.
ALTER TABLE catalog_items
    ADD CONSTRAINT chk_catalog_items_not_self_parent
        CHECK (parent_item_id IS NULL OR parent_item_id <> id);
```

`parent_item_id` es nulable porque **la inmensa mayoría de catálogos son planos** y deben seguir
funcionando sin tocarlos: un `ROLE` o un `URGENCY_LEVEL` no tiene padre. La jerarquía es opcional
y solo la usa quien la necesita.

**Regla que la base no hace cumplir y el servicio sí:** padre e hijo deben pertenecer a
`catalog_type` distintos y relacionados (`INTERVENTION_CLASS` → `INTERVENTION_TYPE`). Un CHECK no
puede consultar otra fila de la misma tabla. Va como validación de servicio y como test (§8).

### 4.2 V014 — Taxonomía real de intervenciones

Este es el cambio de mayor impacto del spec. El catálogo `INTERVENTION_TYPE` sembrado en `V010`
es **inventado**: SPEC-002 lo derivó sin material del cliente. De sus seis valores, solo dos
sobreviven al contraste con la taxonomía real, y `DECORACION` y `REMOCION_TERRENO` no existen en
la operación.

```sql
-- V014__seed_intervention_taxonomy.sql
-- Fuente: hoja `tipo de actividades` del Excel DAF-OSG 2025-2026.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('INTERVENTION_CLASS', 'Clases de intervención',
     'Agrupación de primer nivel de los trabajos sobre áreas verdes', FALSE);

-- Los seis tipos inventados por V010 se desactivan, no se borran (SPEC-003 §7.1):
-- si alguna fila de prueba ya los referencia, un DELETE rompería la FK.
UPDATE catalog_items SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
 WHERE catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE');
```

**Las nueve clases** (hoja `tipo de actividades`, columna maestra). Cada una trae el grupo
responsable que el cliente le asigna, dato que conecta con las cuadrillas de `V012`:

| # | `code` | Label | Grupo responsable según el cliente |
|---|---|---|---|
| 1 | `HABILITACION` | Habilitación de jardines | jardineros |
| 2 | `REHABILITACION` | Rehabilitación de jardines | jardineros |
| 3 | `MANTENIMIENTO` | Mantenimiento de jardines | jardineros |
| 4 | `PODA` | Poda | jardineros |
| 5 | `PROPAGACION` | Propagación y plantación | jardineros |
| 6 | `RIEGO` | Riego | jardineros |
| 7 | `FITOSANITARIO` | Manejo fitosanitario | herts |
| 8 | `RESIDUOS` | Manejo de residuos vegetales | jardineros / herts |
| 9 | `INSPECCION` | Inspección y monitoreo | Roobert |

**Los 45 tipos de actividad**, agrupados por su clase:

| Clase | Tipos |
|---|---|
| `HABILITACION` (6) | Preparación del terreno · Incorporación de sustrato · Instalación de plantas · Instalación de césped · Colocación de cobertura ornamental · Instalación de tutores |
| `REHABILITACION` (7) | Reposición de plantas · Recuperación de áreas verdes · Renovación de jardineras · Mejoramiento del suelo · Renovación de cobertura ornamental · Resiembra · Reubicación de macetas |
| `MANTENIMIENTO` (10) | Canteo · Deshierbo · Escarda · Limpieza de hojarasca · Limpieza de plantas · Aireación del suelo · Limpieza integral de jardineras · Fertilización · Aplicación de enmiendas · Traslado de macetas |
| `PODA` (4) | Poda de mantenimiento · Poda de formación · Poda sanitaria · Poda de despeje/reducción |
| `PROPAGACION` (10) | Propagación por división de matas · Propagación por esquejes · Trasplante · Siembra de plantas · Plantación de árboles · Plantación de arbustos · Plantación de cubresuelos · Plantación en macetas · Trasplante a macetas · Cambio de maceta |
| `RIEGO` (4) | Riego manual · Riego nocturno · Riego de establecimiento · Verificación del sistema de riego |
| `RESIDUOS` (4) | Recolección de hojarasca · Recolección de ramas · Triturado de residuos · Disposición o aprovechamiento de residuos |

**Las clases prioritarias se marcan en `metadata`** (§2.0.3). El flag no cambia el dominio: es
orden de construcción, y se retira sin migración cuando las cuatro estén cubiertas.

```sql
-- Poda y Mantenimiento son dos de las cuatro prioritarias y tienen tipos desglosados.
-- Fitosanitario es la tercera, pero sin tipos (P-10). Corte de césped, la cuarta,
-- no existe en esta taxonomía porque es tercerizada (§2.0.3).
UPDATE catalog_items
   SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"priority": true}'::jsonb,
       updated_at = CURRENT_TIMESTAMP
 WHERE code IN ('PODA', 'MANTENIMIENTO', 'FITOSANITARIO')
   AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS');
```

> ⚠️ **Pendiente del cliente (P-10) — ahora bloqueante:** las clases **`FITOSANITARIO`** e
> **`INSPECCION`** están declaradas en la tabla maestra del Excel **pero no tienen ningún tipo de
> actividad desglosado**. Se siembran como clase para que la taxonomía esté completa y el grupo
> responsable quede registrado, pero quedan **sin hijos**. Son precisamente las dos asignadas a
> grupos distintos de «jardineros» (`herts` y `Roobert`), lo que encaja con que su detalle viva
> fuera de la hoja de los jardineros.
>
> **Sube de prioridad:** `FITOSANITARIO` es una de las **cuatro actividades prioritarias**
> (§2.0.3). No es ya un hueco cosmético de la taxonomía — sin sus tipos, una de las cuatro que el
> cliente quiere primero no se puede registrar con detalle.

El Excel incluye una **descripción por cada tipo** («Canteo: delimitar y perfilar los bordes de
jardineras o macizos»). Se cargan en `catalog_items.metadata` como `{"description": "..."}`: son
texto de ayuda para el operario en el formulario, no un campo consultable, y `metadata` (JSONB)
ya existe en la tabla desde `V001` para exactamente esto.

### 4.3 V015 — Cantidades, origen e incidencia externa

La hoja `Podas arbpalm` revela tres conceptos que el modelo no tiene y que son los que el cliente
usa para medir cumplimiento.

```sql
-- V015__add_execution_tracking_to_interventions.sql

ALTER TABLE interventions
    ADD COLUMN intervention_class_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN origin_item_id             BIGINT REFERENCES catalog_items(id),
    ADD COLUMN reported_by_item_id        BIGINT REFERENCES catalog_items(id),
    ADD COLUMN external_code              VARCHAR(40),
    ADD COLUMN unit_item_id               BIGINT REFERENCES catalog_items(id),
    ADD COLUMN requested_quantity         NUMERIC(12, 3)
        CHECK (requested_quantity IS NULL OR requested_quantity >= 0),
    ADD COLUMN executed_quantity          NUMERIC(12, 3)
        CHECK (executed_quantity  IS NULL OR executed_quantity  >= 0),
    ADD COLUMN requested_at               DATE,
    ADD COLUMN technical_sheet_key        VARCHAR(500);

CREATE INDEX idx_interventions_class    ON interventions(intervention_class_item_id);
CREATE INDEX idx_interventions_origin   ON interventions(origin_item_id);
CREATE INDEX idx_interventions_external ON interventions(external_code)
    WHERE external_code IS NOT NULL;

-- Si hay cantidad, hay unidad. Un número sin unidad no es interpretable.
ALTER TABLE interventions
    ADD CONSTRAINT chk_interventions_quantity_unit
        CHECK ((requested_quantity IS NULL AND executed_quantity IS NULL)
               OR unit_item_id IS NOT NULL);
```

| Campo | Por qué | Evidencia en el Excel |
|---|---|---|
| `requested_quantity` / `executed_quantity` | Es **el indicador de cumplimiento del cliente**. Hay filas donde se pidió 2 y se ejecutó 1 (PO-9). Sin estos campos no hay forma de reportar cumplimiento | Columnas «Cantidad pedida» / «Cantidad ejecutada» |
| `unit_item_id` | Las cantidades no son homogéneas: `und` (árboles), `m` (setos), `m2` (cubresuelos) | Columna «Unidad de medida» |
| `external_code` | Correlativo del sistema de la universidad. Es la llave con la que el cliente rastrea el trabajo fuera de Hesperides | `OSG-0478`, `OSG-0489`… También aparece `aun no tiene codigo` y `NO APLICA`, de ahí que sea nulable |
| `origin_item_id` | Distingue trabajo rutinario de trabajo que responde a un hallazgo. Es lo que permite separar mantenimiento planificado de reactivo | Columna «Tipo 1»: `Hallazgo/incidencia` vs `Mantenimiento` |
| `reported_by_item_id` | Quién originó el reporte, como catálogo y no como texto | Columna «reportado por»: `Supervisión`, `Unidad`, `Ningun reporte` |
| `technical_sheet_key` | Cada poda genera un `.docx` formal. Es un entregable, no una foto | `Ficha_Tecnica_Poda_PO00001.docx` |
| `requested_at` | Nulable: vacío en el 100% de las filas de 2026 (§3.1) | Columna «Fecha de solicitud» |

**Los tres campos nuevos son nulables sin excepción**, incluido `intervention_class_item_id`. La
razón no es laxitud: la columna se añade sobre una tabla que en producción podría tener filas, y
`NOT NULL` sin default fallaría. El servicio **sí** exige clase y tipo al crear una intervención
nueva; la nulabilidad es una concesión a la migración, no al contrato.

```sql
-- Catálogos que soportan los campos anteriores.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('INTERVENTION_ORIGIN', 'Origen de la intervención',
     'Si el trabajo nace de un hallazgo o es mantenimiento rutinario', TRUE),
    ('INCIDENT_SOURCE', 'Origen del reporte',
     'Quién reporta el hallazgo que origina el trabajo', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='INTERVENTION_ORIGIN'), 'FINDING',     'Hallazgo / incidencia', 1),
    ((SELECT id FROM catalog_types WHERE code='INTERVENTION_ORIGIN'), 'MAINTENANCE', 'Mantenimiento',         2),
    ((SELECT id FROM catalog_types WHERE code='INCIDENT_SOURCE'),     'SUPERVISION', 'Supervisión',           1),
    ((SELECT id FROM catalog_types WHERE code='INCIDENT_SOURCE'),     'UNIT',        'Unidad',                2),
    ((SELECT id FROM catalog_types WHERE code='INCIDENT_SOURCE'),     'NONE',        'Sin reporte previo',    3);

-- `incidents` recibe el mismo par de campos externos, por el mismo motivo.
ALTER TABLE incidents
    ADD COLUMN external_code       VARCHAR(40),
    ADD COLUMN reported_by_item_id BIGINT REFERENCES catalog_items(id);

CREATE INDEX idx_incidents_external ON incidents(external_code)
    WHERE external_code IS NOT NULL;
```

`INTERVENTION_ORIGIN` es `is_system = TRUE` porque el reporte de mantenimiento reactivo vs.
planificado dependerá de esos dos `code`. `INCIDENT_SOURCE` no lo es: el cliente puede añadir
«Comunidad universitaria» mañana sin que nada en el backend dependa de ello.

### 4.4 V016 — Zonas reales del campus

```sql
-- V016__seed_campus_zones.sql
-- Fuentes: entrevista (cuarteles forestales) + hoja `lugares` (75 filas → 74 lugares, §5.4).

ALTER TABLE zones
    ADD COLUMN centroid GEOMETRY(Point, 4326);

CREATE INDEX idx_zones_centroid ON zones USING GIST(centroid);

-- Dos niveles reales, no inventados: el vocabulario es del cliente (D-07).
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='ZONE_TYPE'), 'FOREST_QUARTER',  'Cuartel forestal', 1),
    ((SELECT id FROM catalog_types WHERE code='ZONE_TYPE'), 'CAMPUS_LOCATION', 'Lugar del campus', 2);

-- Los 17 cuarteles vigentes. Sin punto ni polígono: el cliente solo dio la numeración.
-- El 7 existió y desapareció al poner en valor la Huaca; no se siembra.
INSERT INTO zones (code, name, zone_type_item_id) VALUES
    ('CF-01', 'Cuartel forestal 1',  (SELECT id FROM catalog_items WHERE code='FOREST_QUARTER')),
    -- … CF-02 … CF-06, CF-08 … CF-18 (17 filas; el 7 se omite deliberadamente)
    ('CF-18', 'Cuartel forestal 18', (SELECT id FROM catalog_items WHERE code='FOREST_QUARTER'));
```

`centroid` es **nueva** y no sustituye a `boundary`. Son datos distintos: el punto es lo que el
cliente entregó y sirve para ubicar en mapa; el polígono sigue pendiente y es lo que permitirá
calcular superficies. Guardar el punto en `boundary` obligaría a inventar un polígono falso.

**El cuartel 7 no se siembra.** Desapareció cuando se puso en valor la Huaca: era el área verde
que bordeaba el camino Inca entre Electrónica y Minas. Sembrarlo desactivado sugeriría que puede
reactivarse; omitirlo y documentarlo aquí es más honesto. Por eso hay **17 zonas de cuartel con
numeración hasta 18** — una discontinuidad deliberada que alguien encontrará raro dentro de un
año, y esta es la nota que se lo explica.

Las 74 zonas, con el punto que trae el Excel (muestra; la lista completa va en el `INSERT` de la
migración): Apoyo Rural, Área Deportes, Arqueología, Arquitectura, Arte Antiguo, Arte Nuevo, Arte
y Diseño, Azotea EEGGLL, Cactario, CCSS, Centenario, CEPREPUC, CETAM, Ciencias Contables, Comedor
Central, Comedor de Letras, Derecho, Dinthilac, DIODO, Educación, EEGGLL, Estacionamiento,
Estudios Generales Ciencias, Fares,
Física, Gelarti, Huaca, Industrial, Ingeniería, Ing. Civil, INRAS, Jardín Central, Jardín Entrada
Principal, Jardín Lateral McGregor, Letras y Ciencias Humanas, Mac Gregor, Matemáticas, Minas,
OCAI, Pabellón Z, Playa Estacionamiento Studio TV, Polideportivo, Psicología, Puerta Principal,
Puerta Riva-Agüero, Química, Riva-Agüero, Sala Cuna, Servicio Médico, Tinkuy, Cedares, Biblioteca
Central, CIA, Biblioteca de Teología, Juan Valdez, Hallazgos, Estudio TV2, Mecánica, DAF, Bosque
Seco, Punto de Acopio, Gastronomía, Pista de Salud, Humanidades, Huaca 64, Bosque Húmedo, CAPU,
Vivero, Edificio Administrativo, Laboratorios, DAES, Aulario, Becas, El Puesto.

Todas traen coordenadas; ninguna fila queda sin ubicar. Se siembran con
`zone_type_item_id = CAMPUS_LOCATION` y **`parent_zone_id` nulo**.

**Por qué el padre queda nulo pese a existir los cuarteles:** el cliente dio la *numeración* de
los cuarteles, no el *mapeo* de qué lugar cae en cuál. Solo dos filas del Excel lo insinúan
(Arqueología → cuartel 16; Tesorería → cuartel 1), y con dos casos no se deduce el resto.
Asignar los 74 lugares a ojo produciría un dato falso en un reporte por sector. La estructura
queda lista; el mapeo lo llena el cliente o se deriva espacialmente cuando haya polígonos.

> ⚠️ **Pendiente del cliente (P-01, sigue abierto pero ya no bloquea):** los **polígonos** de cada
> zona y, sobre todo, **qué lugar pertenece a qué cuartel**. Con los puntos ya se puede asignar un
> elemento a una zona real y arrancar el catastro del Sprint 1; sin el mapeo no hay reportes
> agregados por cuartel, que es la unidad con la que el cliente razona históricamente.

#### 4.4.1 «Sector» significa tres cosas distintas (P-13b, resuelto en la 2.ª entrevista)

«Sector» aparece 9 veces en el Excel y **no siempre quiere decir lo mismo**:

| Sentido | Ejemplo literal | Qué resultó ser |
|---|---|---|
| **Sinónimo de lugar** | «Deshierbo y canteo, **sector Tinkuy**» · «Canteo y barrido, **sector OCAI**» | No es un nivel nuevo. Es la misma zona que ya tenemos como `CAMPUS_LOCATION` |
| **Subdivisión de un cuartel** | «Canteo y deshierbo en el **cuartel 16, sector Arqueología**» | Uso informal. No es un nivel jerárquico |
| **Sector de riego / de capataz** | Columna «**Sector de jefe de grupo**», con valores Andrés / Óscar / Alfonso | **Es un nivel real, pero de operación, no de geografía botánica** (ver abajo) |

**Lo que la segunda entrevista corrigió.** Yo había supuesto que el tercer sentido era «solo»
organización de personal y que importarlo como zona crearía zonas fantasma con nombre de persona.
**Era una lectura incompleta.** Robert explicó que los tres sectores son una **división
geográfica real y estable del campus**:

- Son **3 sectores fijos**, uno por capataz, y **«sus zonas no varían»**.
- Están **dibujados en el mapa interactivo**: «el mapa interactivo define sectores».
- Tienen superficie asignada: **~4.5 ha** los dos grandes, **~3 ha** el tercero.
- Son la unidad con la que se organiza **el ciclo de riego** (§5.6).

O sea: el nombre del capataz **etiqueta** el sector, pero el sector es territorio, no persona. La
advertencia original sigue siendo válida en su conclusión práctica —no se debe crear una zona
llamada «Alfonso»— pero por una razón distinta de la que escribí: **el sector existe como zona;
lo que no debe usarse es el nombre de la persona como su identidad**, porque el capataz puede
cambiar y el sector permanece.

**Consecuencia: la jerarquía real tiene tres niveles operativos y uno histórico en desuso.**

```
Sector de mantenimiento (3)   ← división operativa viva, del mapa interactivo
   └── Lugar / referente (74)  ← lo que el Excel registra a diario
        └── Jardín (~100)      ← con código numérico y shape propio (pendiente)

Cuartel forestal (17)          ← división histórica, EN DESUSO (§4.4.2)
```

**Qué se hizo:** se mantiene la siembra de dos niveles de este spec, y se añade el sector como
tercer nivel cuando el cliente entregue los límites (los tiene en el mapa interactivo). La
autorreferencia de `zones` lo admite sin cambio de esquema.

#### 4.4.2 Los cuarteles forestales están en desuso (corrige D-07)

**Este spec sobrevaloró los cuarteles.** D-07 los definió como «la zonificación oficial» y el nivel
padre de la jerarquía. La segunda entrevista lo desmiente en boca del propio cliente:

> «Personalmente yo no lo uso siempre… se usa cada vez menos. Es más fácil referenciar Jardines de
> Ingeniería Civil que referenciarte cuartel 11. No me da mucha información.»

Lo que Robert usa a diario son **referentes reconocibles**: edificios, facultades, vías («el
Tontódromo, que atraviesa un montón de facultades») y jardines emblemáticos (Comedor Central, Arte
Antiguo, Patio Central). Dijo explícitamente que **le gustaría usar términos más reconocibles**.

Eso explica por fin por qué solo 2 de 283 filas mencionan un cuartel: **no es un dato que falte,
es un vocabulario que se está abandonando.**

**Dónde los cuarteles sí siguen vivos:** en el **inventario de especies**, donde cada planta está
referenciada como «cuartel 1… cuartel 18» y **no tiene coordenadas**. Ahí el cuartel es la única
ubicación disponible, y por eso hay que conservarlo.

**Corrección a D-07:** los cuarteles **se siguen sembrando**, pero como **vocabulario heredado
para poder interpretar el inventario antiguo**, no como el eje de la zonificación. El eje
operativo son los sectores y los referentes. El mapeo lugar → cuartel (P-13a) **baja de
prioridad**: ya no bloquea los reportes operativos, solo la lectura del inventario histórico.

### 4.5 V017 — Catálogos que la entrega permite cerrar

```sql
-- V017__seed_confirmed_catalogs.sql

-- SPECIES_TYPE — hoja `tipologia de flora`, los 9 valores del cliente.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'TREE',        'Árbol',                   1),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'SHRUB',       'Arbusto',                 2),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'GROUNDCOVER', 'Cubresuelo',              3),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'POTTED_HERB', 'Macetones (herbáceas)',   4),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'PALM',        'Palmera',                 5),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'HERB',        'Planta herbácea',         6),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'SUCCULENT',   'Planta suculenta',        7),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'HEDGE',       'Seto (cerco vivo)',       8),
    ((SELECT id FROM catalog_types WHERE code='SPECIES_TYPE'), 'CLIMBER',     'Trepadora',               9);

-- MEASUREMENT_UNIT — las unidades que el registro real usa.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='MEASUREMENT_UNIT'), 'UNIT', 'Unidad',        1),
    ((SELECT id FROM catalog_types WHERE code='MEASUREMENT_UNIT'), 'M',    'Metro',         2),
    ((SELECT id FROM catalog_types WHERE code='MEASUREMENT_UNIT'), 'M2',   'Metro cuadrado',3),
    ((SELECT id FROM catalog_types WHERE code='MEASUREMENT_UNIT'), 'M3',   'Metro cúbico',  4);

-- URGENCY_LEVEL — el cliente usa tres niveles (D-04).
UPDATE catalog_items SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'CRITICAL'
   AND catalog_type_id = (SELECT id FROM catalog_types WHERE code='URGENCY_LEVEL');
```

`m3` aparece solo en la hoja de aprovechamiento de material (10 m³ de confitillo), no en el
registro de podas, pero se siembra porque es la unidad natural de los áridos y el cliente ya la
usa en su operación.

**`SPECIES_ORIGIN` sigue vacío.** El Excel no dice si una especie es nativa o introducida, y
deducirlo del nombre científico sería inventar un dato botánico que terminaría en un reporte.

### 4.6 V018 — Evidencia sin momento declarado

```sql
-- V018__add_unspecified_evidence_moment.sql

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='EVIDENCE_MOMENT'), 'UNSPECIFIED', 'Sin especificar', 3);
```

El registro actual del cliente **no distingue antes de después**: las ~250 fotos son una columna
`Foto` sin más. `moment_item_id` es `NOT NULL` en `intervention_evidences`, así que cualquier
importación del histórico necesita un valor válido que no mienta. `UNSPECIFIED` es ese valor.

Es deliberadamente incómodo de leer en un reporte, y debe serlo: marca la evidencia que no sirve
para comparar estado previo y posterior. **Las intervenciones nuevas capturadas desde el sistema
no pueden usarlo** — esa restricción la impone el servicio (§5.3), no la base, porque la misma
tabla acepta ambos orígenes.

### 4.7 V019 — Código heredado del arbolado

```sql
-- V019__add_legacy_code_to_green_elements.sql
-- Fuente: entrevista. Las placas de aluminio de un inventario forestal antiguo (D-08).

ALTER TABLE green_elements
    ADD COLUMN legacy_code VARCHAR(40);

-- Índice NO único: el cliente advierte que hay códigos repetidos y reasignados.
CREATE INDEX idx_green_elements_legacy_code ON green_elements(legacy_code)
    WHERE legacy_code IS NOT NULL;
```

**Que este índice no sea único es el punto entero del campo.** Robert describe placas recicladas
de un ejemplar a otro: el mismo código puede aparecer dos veces y ninguna ser correcta. Un índice
único rechazaría el dato real al capturarlo en campo. `legacy_code` es una **pista para el
operario** que busca constatar un ejemplar contra el inventario viejo, no un identificador.

Nulable, y lo será en la mayoría de filas: hay árboles sin placa, plantados después del inventario
antiguo o con la placa perdida.

---

### 4.8 V020 — Subida diferida de evidencia y publicación en el mapa

Dos capacidades que la 2.ª entrevista convirtió en requisito y que el esquema no contemplaba.

```sql
-- V020__add_deferred_upload_and_map_publication.sql

-- 1. Evidencia anunciada por el dispositivo pero aún no recibida (enmienda a SPEC-002 §4.6).
ALTER TABLE intervention_evidences
    ADD COLUMN uploaded_at      TIMESTAMP,
    ADD COLUMN client_reference VARCHAR(100);

CREATE INDEX idx_intervention_evidences_pending
    ON intervention_evidences(intervention_id) WHERE uploaded_at IS NULL;

CREATE UNIQUE INDEX idx_intervention_evidences_client_ref
    ON intervention_evidences(client_reference)
    WHERE client_reference IS NOT NULL AND deleted_at IS NULL;

-- 2. Estado de publicación en el mapa interactivo del cliente.
ALTER TABLE interventions
    ADD COLUMN published_at        TIMESTAMP,
    ADD COLUMN publication_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN publication_error    TEXT;

CREATE INDEX idx_interventions_unpublished
    ON interventions(completed_at) WHERE published_at IS NULL AND deleted_at IS NULL;
```

#### Por qué la publicación necesita estado propio

El cliente **ya tiene un mapa** —`clluncor-lang.github.io/mapa-web-6`, GitHub Pages sobre Google
Maps API— que **Carolina alimenta a mano cada semana** desde el Excel. Ese trabajo manual es el
dolor principal, y el cliente pidió *«una aplicación que pueda enlazarse a este insumo»*.

**La publicación es asíncrona y falible por definición.** Depende de un servicio externo que no
controlamos, sobre una cuenta que no es nuestra. Por eso:

| Columna | Para qué |
|---|---|
| `published_at` | `NULL` = pendiente de publicar. Es la cola de trabajo |
| `publication_attempts` | Distingue «aún no se intentó» de «falla repetidamente» |
| `publication_error` | Para diagnosticar sin revisar logs |

**La regla que impone `REGLAS.md` §0.1:** registrar una intervención **se completa siempre**,
aunque la publicación falle. Publicar ocurre **fuera de la transacción** que persiste la
intervención. Si GitHub no responde, el operario no se entera y el dato no se pierde: queda con
`published_at IS NULL` y se reintenta.

> ⚠️ **Pendiente (P-14, nuevo):** **de dónde lee los datos ese mapa**. Al ser un sitio estático,
> o los lee de un archivo del repositorio o de una fuente externa publicada. Ambas rutas son
> viables y de bajo riesgo, pero **son trabajos distintos** y no se puede elegir sin verlo.
> Las columnas de arriba sirven igual en los dos casos — el estado de publicación es independiente
> del destino. Preguntas concretas en
> [`docs/dominio/integracion-mapa-interactivo.md`](../../docs/dominio/integracion-mapa-interactivo.md).

#### La regla de aislamiento

**Ningún servicio de dominio conoce GitHub.** La publicación vive detrás de una abstracción propia
(un «publicador de mapa»), y el destino concreto es una implementación sustituible.

No es purismo: **el mapa del cliente vive hoy en el repositorio personal de una locadora de
servicios**. Esa dependencia puede desaparecer sin avisarnos, y el día que pase queremos cambiar
una implementación, no rehacer el módulo de intervenciones.

---

## 5. Comportamiento

### 5.1 Flujo principal — registrar una intervención con la taxonomía nueva

1. El operario abre el formulario → el sistema carga las **9 clases** activas de
   `INTERVENTION_CLASS`.
2. Elige una clase (p. ej. `PODA`) → el selector de tipo se puebla **solo** con los ítems cuyo
   `parent_item_id` es esa clase (4 tipos de poda).
3. Elige el tipo, la zona, la unidad y la cantidad pedida.
4. Al ejecutar, registra `executed_quantity` y la evidencia con momento `BEFORE`/`AFTER`.
5. El sistema persiste ambas FK (clase y tipo), conforme a D-02.

### 5.2 Flujos alternativos

- **Clase sin tipos desglosados** (`FITOSANITARIO`, `INSPECCION`): el selector de tipo queda
  vacío. El sistema **permite guardar solo con la clase** — es la única forma de no bloquear dos
  clases reales del cliente mientras P-10 no llegue. El tipo se completa después.
- **Trabajo que nace de una incidencia OSG**: `origin_item_id = FINDING`, se llena
  `external_code` y `requested_at`. El resto del flujo es idéntico.
- **Trabajo rutinario**: `origin_item_id = MAINTENANCE`, `reported_by_item_id = NONE`,
  `external_code` y `requested_at` nulos. Es el caso del 100% de las filas de 2026.

### 5.3 Reglas que hace cumplir el servicio, no la base

| Regla | Por qué no es un CHECK |
|---|---|
| El tipo debe ser hijo de la clase enviada | Requiere consultar otra fila de `catalog_items` |
| Padre e hijo son de `catalog_type` distintos y relacionados | Mismo motivo |
| `UNSPECIFIED` solo es válido en evidencia importada, nunca en captura nueva | La tabla no sabe el origen de la fila |
| `executed_quantity` solo se llena en estado `COMPLETED` o posterior | Depende del `code` del estado, no de su `id` |
| Al importar el histórico, `Cerrado` → `VALIDATED` y `Abierto` → `ASSIGNED` (D-03) | Es lógica de importación |

### 5.4 Casos límite — la calidad de los datos del cliente

El Excel es un sistema vivo, no un dataset limpio. Lo que hay que resolver antes de importar:

- **Un duplicado exacto en `lugares`:** `Servicio médico` y `Servicio Médico`, idénticas
  coordenadas. Se funden en una: 75 filas → **74 zonas**.
- **25 lugares usados en los registros que no están en el catálogo.** Son de tres clases, y cada
  una se trata distinto:
  - *Alias y erratas* (`civil` → Ing. Civil, `Z` → Pabellón Z, `entrada prinsipal` → Puerta
    Principal, `ceprepucp` → CEPREPUC, `letras` → Letras y Ciencias Humanas, `BCIA` → CIA,
    `Estudio TV` → Estudio TV2): se mapean a la zona existente.
  - *Zonas reales que faltan en el catálogo* (`frutas`, `Pabellón V`, `pabellón G`, `baobas`,
    `Sociales`, `Gestión`, `Teología`, `playas O, D Y C`, `centro de acopio`, `servicios
    generales`): hay que confirmarlas con el cliente y añadirlas.
  - *Celdas con varios lugares a la vez* (`Comedor Central, Gastronomía y Matemática`,
    `Teología , Derecho`, `dintilhac y servicio médico`, `química y ingenieria`): **una
    intervención afectó varias zonas**. El modelo actual tiene `zone_id` único en `interventions`.
    Se resuelven creando una intervención por zona al importar. Si el cliente confirma que esto es
    frecuente, hará falta una tabla puente `intervention_zones`, y eso sería un spec propio.
- **Especies con datos sucios:** `(Polyscias guilfoylei` con paréntesis sin cerrar, `Laurus
  nobilis.` y `Jacaranda mimosifolia.` con punto final, `Chamaecyparissus` incompleto (el correcto
  es *Santolina chamaecyparissus*). Se limpian al sembrar, no se cargan tal cual.
- **Fechas como serial de Excel** (`46111.0` = 2026-03-09). Requieren conversión al importar.
- **Un `#N/A` de fórmula** en la hoja oculta de podas: es basura de cálculo, no un valor.

### 5.5 Las 18 especies confirmadas

De `Podas arbpalm`, con el par nombre común / científico que pide la tabla `species`:

| Nombre común | Nombre científico | Tipo |
|---|---|---|
| Buganvilla | *Bougainvillea glabra* | Trepadora |
| Duranta | *Duranta erecta* | Arbusto |
| Escobillón rojo | *Callistemon viminalis* | Árbol |
| Eucalipto plateado | *Eucalyptus cinerea* | Árbol |
| Ficus benjamina | *Ficus benjamina* L. | Árbol |
| Geranio aralia | *Polyscias guilfoylei* | Árbol |
| Guayacán amarillo | *Handroanthus chrysanthus* | Árbol |
| Jacarandá | *Jacaranda mimosifolia* | Árbol |
| Laurel | *Laurus nobilis* | Árbol |
| Malvavisco | *Malvaviscus arboreus* | Arbusto |
| Molle serrano | *Schinus molle* | Árbol |
| Pacae | *Inga feuilleei* | Árbol |
| Palma de coco | *Cocos nucifera* | Palmera |
| Palmera canaria | *Phoenix canariensis* | Palmera |
| Palmera de abanico china | *Livistona chinensis* | Palmera |
| Palmera de abanico mexicana | *Washingtonia robusta* | Palmera |
| Ponciana | *Delonix regia* | Árbol |
| Santolina | *Santolina chamaecyparissus* | Cubresuelo |

> ⚠️ **Pendiente del cliente (P-02, sigue abierto):** estas 18 son solo las especies que
> aparecieron en podas del periodo. El Excel **referencia una hoja «lista de especies» que no vino
> en el archivo** (citada en la fila 1 de `Podas arbpalm`). Esa hoja es la que cierra P-02.

---

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | `catalog_items` admite jerarquía de dos niveles | Insertar un ítem con `parent_item_id`; comprobar que un ítem que se apunta a sí mismo es rechazado por el CHECK |
| CA-02 | La taxonomía real está sembrada completa | `SELECT count(*)` sobre `INTERVENTION_CLASS` devuelve **9**; sobre los `INTERVENTION_TYPE` activos devuelve **45** |
| CA-03 | Los tipos inventados ya no se ofrecen | Consultar `INTERVENTION_TYPE` activos: `DECORACION` y `REMOCION_TERRENO` no aparecen, pero **siguen existiendo** con `is_active = FALSE` |
| CA-04 | Cada tipo cuelga de su clase | `Canteo` tiene como padre `MANTENIMIENTO`; ningún tipo activo tiene `parent_item_id` nulo |
| CA-05 | Las zonas están cargadas en dos niveles | `zones` con tipo `CAMPUS_LOCATION` devuelve **74**, ninguna con `centroid` nulo y `Servicio Médico` una sola vez; con tipo `FOREST_QUARTER` devuelve **17**, y no existe ningún `CF-07` |
| CA-12 | El código heredado admite duplicados | Insertar dos `green_elements` con el mismo `legacy_code` → ambos se guardan (es el caso real de las placas recicladas) |
| CA-13 | Las clases prioritarias están marcadas | `SELECT code FROM catalog_items WHERE metadata->>'priority' = 'true'` devuelve exactamente `PODA`, `MANTENIMIENTO` y `FITOSANITARIO` |
| CA-14 | El flag de prioridad no altera el comportamiento | Una clase sin el flag se puede seleccionar y registrar igual que una marcada: la prioridad ordena el trabajo del equipo, no restringe al usuario |
| CA-06 | Una cantidad no puede guardarse sin unidad | Intentar `INSERT` con `executed_quantity` y `unit_item_id` nulo → la base lo rechaza |
| CA-07 | El formulario encadena clase y tipo | En navegador real (INV-10): elegir `PODA` deja el selector de tipo con exactamente 4 opciones; cambiar de clase lo repuebla |
| CA-08 | Una clase sin tipos no bloquea el registro | Elegir `FITOSANITARIO` permite guardar con el tipo vacío |
| CA-09 | `CRITICAL` ya no se ofrece como urgencia | El selector de urgencia muestra 3 opciones |
| CA-10 | Los catálogos confirmados están completos | `SPECIES_TYPE` devuelve 9 ítems; `MEASUREMENT_UNIT`, 4 |
| CA-11 | El código externo nunca se autogenera | Crear una intervención sin `external_code` la deja nula; el sistema no inventa un `OSG-` |

## 7. Especificación visual

No aplica como pantalla nueva. La única exigencia visual es la del **selector encadenado**
(clase → tipo) descrito en CA-07, que el SPEC-2XX de intervenciones debe implementar con los
estados habituales (default, loading mientras carga la clase, disabled hasta que haya clase
elegida, vacío cuando la clase no tiene tipos).

## 8. Tests

```
Jerarquía de catálogos
- ítem con parent_item_id de otro catalog_type relacionado → se guarda
- ítem que se apunta a sí mismo como padre → rechazado
- ítem con padre del mismo catalog_type → rechazado por el servicio
- catálogo plano (ROLE) sin parent_item_id → sigue funcionando igual que antes

Taxonomía de intervenciones
- 9 clases activas, 45 tipos activos
- tipo cuya clase no coincide con la enviada → rechazado
- clase FITOSANITARIO sin tipo → intervención se guarda
- tipos desactivados por V014 no aparecen en el listado activo pero siguen consultables por id

Cantidades
- executed_quantity sin unit_item_id → rechazado por la base
- cantidad negativa → rechazada por el CHECK
- executed_quantity < requested_quantity → se guarda (es el caso de cumplimiento parcial, no un error)

Evidencia
- UNSPECIFIED aceptado en importación
- UNSPECIFIED rechazado por el servicio en captura nueva

Zonas
- 74 lugares, todos con centroid
- 17 cuarteles forestales; CF-07 no existe
- boundary sigue nulo en todas (no se inventó polígono)
- parent_zone_id nulo en los 74 lugares (no se inventó el mapeo a cuartel)

Código heredado del arbolado
- dos elementos con el mismo legacy_code → ambos se guardan
- elemento sin legacy_code → se guarda (es el caso mayoritario)
- legacy_code nunca se usa como identificador en una búsqueda que espere un único resultado
```

## 9. Propio de este spec

### 9.1 Enmiendas que este spec introduce

Se anotan en `REGISTRO.md` conforme a la sección «Enmiendas a specs cerrados»:

| Spec enmendado | Qué cambia |
|---|---|
| SPEC-002 §4.9 | `INTERVENTION_TYPE` deja de ser una lista plana inventada de 6 valores. `URGENCY_LEVEL` pierde `CRITICAL`. |
| SPEC-002 §4.3 | `zones` gana `centroid`; se siembran **17 cuarteles forestales + 74 lugares**. La jerarquía `parent_zone_id` pasa de hipótesis a uso real. P-01 de *bloqueante* a *parcial*. |
| SPEC-002 §4.5 | `green_elements` gana `legacy_code` con índice **no único**, para las placas del inventario forestal antiguo (D-08). |
| SPEC-002 §4.6 | `interventions` gana cantidades, origen, código externo y ficha técnica. |
| SPEC-002 Anexo | P-01, P-02, P-04 y P-08 avanzan; entra **P-10** (tipos de `FITOSANITARIO` e `INSPECCION`). |
| SPEC-003 §3 | `catalog_items` gana `parent_item_id`: los catálogos pueden ser jerárquicos. |
| SPEC-003 §8 | Entran `INTERVENTION_CLASS`, `INTERVENTION_ORIGIN`, `INCIDENT_SOURCE`. Se actualizan los valores de `INTERVENTION_TYPE`, `SPECIES_TYPE`, `MEASUREMENT_UNIT`, `EVIDENCE_MOMENT`, `URGENCY_LEVEL`, `ZONE_TYPE`. |
| **SPEC-000 §1 · REGLAS §0.1** | «Sin dependencia de servicios externos» pasa de **una** excepción (SMTP) a **tres**: se añaden la **publicación en el mapa del cliente** y el **servicio de mapas**. Misma condición acotante para las tres: su caída nunca impide una operación de negocio. |
| **SPEC-002 §4.3** | La jerarquía de zonas deja de ser una incógnita: **sector → lugar → jardín**, con los cuarteles como vocabulario heredado en desuso. |
| **SPEC-002 §4.6** | `intervention_evidences` gana `uploaded_at` y `client_reference` para el ciclo de subida diferida del móvil. |

### 9.2 Fuera de alcance, con su motivo

- **Migración de las ~250 fotos de Google Drive** (D-06). Necesita su propio spec: enlaces que
  pueden caducar, permisos de una cuenta que no controlamos, y ninguna distinción antes/después.
- **Locales periféricos** (San Miguel, Chorrillos, Codesido, Mausoleo). El SPEC-000 acota el
  alcance al **campus**. Si entran, la jerarquía de zonas necesita un nivel superior de sede y
  aparecen responsables de otras áreas (`Martin Itume (Seguridad)`). **Es una decisión de alcance
  del cliente, no técnica**, y debe preguntarse antes de tocar `zones`.
- **Trazabilidad de material reutilizado** (hoja oculta: traslado de grass y confitillo entre
  lugares, con origen y varios destinos). Es un concepto de inventario que el modelo no tiene y
  que el cliente registra de forma incipiente. No se modela a ciegas.
- **Tabla puente `intervention_zones`** para intervenciones multi-zona (§5.4). Se decide cuando
  el cliente confirme si el caso es frecuente o anecdótico.
- **Zoocriadero** (venados, tortugas motelo, pavos reales, una alpaca). La sección lo tiene a
  cargo y reporta **inventario anual al Ente Técnico Forestal**, pero es un dominio distinto
  —fauna, no flora— con su propia normativa. No se modela sin decisión de alcance explícita.
- **Inventario de plagas y productos agronómicos.** Existe una lista de plagas, una de productos
  y ~6 especies que requieren una o dos aplicaciones adicionales sobre el ciclo estacional. Es un
  módulo propio ligado al control fitosanitario, que hoy es tercerizado.
- **Riego como proceso con métrica propia.** Robert lo nombra como **la métrica principal** de la
  sección: 15.6 ha en 3 sectores, cobertura completa en 15 días, 5.5 h diarias de bomba en verano
  y 3 h en invierno. El Excel lo registra como una clase de actividad más (`RIEGO`, 4 tipos), lo
  cual basta para el registro pero **no** para el indicador de cobertura que él reporta. Modelar
  ese indicador requiere saber qué cuenta como «regado» y contra qué superficie se mide.
- **Rendimiento del servicio tercerizado** (árboles/día, metrado/día). Es lo que Robert quiere
  «transparentar», pero hoy el proveedor no lo entrega. Modelarlo antes de que exista el acuerdo
  de entregarlo sería construir una tabla que nadie puede llenar.

### 9.3 Agenda para la segunda entrevista

> **El cuestionario completo está en
> [`docs/entrevistas/02-cuestionario-segunda-reunion.md`](../../docs/entrevistas/02-cuestionario-segunda-reunion.md)**
> — 49 preguntas con el contexto de lo que ya sabemos en cada una. Esta sección resume solo lo que
> afecta al modelo de datos.

Dos clases de pregunta, y la distinción importa: una **contradicción** entre las dos fuentes del
cliente no se resuelve pidiendo un archivo, sino haciendo que el cliente elija. Van primero.

#### A. Contradicciones entre las dos fuentes

**P-11 y P-12 quedaron resueltas** y se documentan en §2.0.3 y §2.0.4. Queda una abierta:

| # | La contradicción | Por qué no la decidimos nosotros |
|---|---|---|
| **P-13a** | El Excel numera cuarteles en comentarios sueltos («cuartel 16, sector Arqueología»); Robert dice que los cuarteles **engloban todo el campus**. | Falta el **mapeo lugar → cuartel** completo. Solo **2 de 283 filas** mencionan un cuartel, y con dos casos no hay patrón: ni numérico ni geográfico. Inventarlo produciría un reporte por cuartel de apariencia oficial y contenido falso — peor que no tenerlo, porque un campo vacío se ve vacío y uno mal llenado se ve correcto. |
| **P-13b** | La palabra **«sector»** se usa en el Excel con **tres sentidos distintos**. | Si «sector» es un nivel real entre cuartel y lugar, la jerarquía **no es de dos niveles sino de tres**, y `parent_zone_id` necesita otro escalón. No se puede decidir sin desambiguar (§4.4.1). |

**Resueltas, para dejar constancia:**

| # | Qué era | Cómo se cerró |
|---|---|---|
| ~~P-11~~ | «Cuatro actividades» vs. 9 clases / 45 tipos | **El cliente confirmó**: las cuatro son las **prioritarias**, no un catálogo rival. Se marcan con un flag en `metadata` y las demás se construyen después (§2.0.3) |
| ~~P-12~~ | ¿La taxonomía es lo ejecutable o lo que ejecuta el estable? | **Los datos lo zanjaron**: cero registros de corte de césped y de fitosanitario en 171 filas. Las dos fuentes coinciden — el catálogo del Excel ya es el ámbito del estable (§2.0.4) |

#### B. Entregables que faltan — el cliente los envía

| # | Qué falta | Qué desbloquea |
|---|---|---|
| **P-10** | Tipos de actividad de **`Manejo fitosanitario`** e **`Inspección y monitoreo`** | **Lo más urgente de este bloque:** `FITOSANITARIO` es una de las **cuatro prioritarias** y no se puede detallar sin esto (§2.0.3) |
| P-02 | La hoja **«lista de especies»**, referenciada en el Excel pero ausente | Cierra `SPECIES_TYPE` y puebla `species` |
| P-08 | La **«matriz de incidencia»**, también referenciada y ausente | Cierra `INCIDENT_TYPE` |
| P-01 | **Polígonos** de zonas y el mapeo a cuarteles | Superficies y reportes por sector |
| — | Los **10 lugares no catalogados** de §5.4 | Si son zonas reales o alias |
| — | El **inventario de ~100 jardines** de la ruta de corte de césped | Es la lista con la que se controla el servicio tercerizado |
| — | El **formato de catastro forestal** («Excel forestal» que ya diseñaron) | Define los atributos de `green_elements`; hoy es una conjetura |
| — | Un **contrato tipo** y un **reporte de proveedor** (P-05) | El módulo de contratos, ahora que sabemos que es media operación |

#### C. Decisiones de alcance — pendientes de confirmar

1. Si los **locales periféricos** entran (§9.2).
2. Si el **zoocriadero** entra (§9.2) — venados, tortugas, pavos reales, una alpaca, con reporte
   anual al Ente Técnico Forestal. Robert lo menciona como responsabilidad de la sección.
3. Si el **inventario de plagas** y el control fitosanitario entran como módulo propio: hay una
   lista de plagas, productos agronómicos y ~6 especies que requieren atención adicional.

### 9.4 Nota sobre el volumen real

283 intervenciones al año registradas por personal estable, 3 responsables operativos, ~100
jardines, ~200-250 árboles en la poda anual y 15.6 ha a cubrir. Es un sistema de **bajo volumen y
alta trazabilidad**: el valor está en el historial por elemento y en el reporte de cumplimiento,
no en el rendimiento. Ninguna decisión de este spec debe justificarse por escala.

### 9.5 Lo que la entrevista dice del encuadre del proyecto

Tres frases de Robert que conviene no perder, porque justifican decisiones que de otro modo
parecen arbitrarias:

- **«No existe un catastro. Estamos justo en ese proceso de actualizar el catastro»**, con un
  **30% de arbolado digitalizado**. El Sprint 1 no informatiza un catastro existente: **lo
  construye**. Por eso `green_elements` admite alta progresiva y por eso `species` es nulable.
- **«Es flexible»**, sobre los procesos de mantenimiento, porque el campus tiene 109 años y es
  heterogéneo en suelos, plantas y arborización. Un modelo que exija un flujo rígido por tipo de
  actividad chocaría con la operación real.
- **«La mayoría de la documentación que se genera está en Excel»**, en **Drives distintos y sin
  conexión entre sí**, y la aspiración declarada es «tener una información maestra». Eso —no el
  registro de actividades— es el problema que el proyecto resuelve.
