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
la taxonomía de intervenciones, incorporando la zonificación real (**sector → sección →
subsección**), el registro de cantidades y el origen del trabajo, y sembrando los catálogos que
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
| **Zonificación** | 75 «lugares» planos con lat/long | **18 cuarteles forestales** (17 vigentes), que **engloban todo el campus** | **Decidido (29 sep 2026):** los cuarteles quedan fuera del modelo. La jerarquía es **sector → sección → subsección**, y los «lugares» son las secciones (§4.4) |
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
| `lugares` | Sí | 75 lugares del campus con lat/long | Las **secciones** de `zones` (§4.4) |
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

**D-05 · Las secciones son las áreas verdes del mapa del cliente, con su polígono.** *(Reescrita
el 29 sep 2026; antes eran los 74 «lugares» del Excel, con punto y sin polígono.)* El mapa v32
entrega 519 áreas verdes con geometría, superficie y capataz: cada una es una sección con
`boundary` real. **P-01 queda cerrado**: ya se pueden calcular superficies y pintar áreas en el
mapa. Los 74 lugares pasan a ser referencias (§4.4.4).

**D-07 · La jerarquía de zonas es sector → sección → subsección.** *(Reescrita el 29 sep 2026;
la versión original ponía los cuarteles forestales como nivel padre, §4.4.2.)*
Los **5 sectores** —3 verdes, de los capataces, más Polideportivo y Bosque húmedo— organizan al
personal y el riego; las **519 secciones** son las áreas verdes del mapa del cliente; las
**subsecciones**, opcionales, son divisiones internas de una sección. `parent_zone_id` —que SPEC-002 ya previó— pasa de hipótesis a uso concreto. Solo se
usan esas tres palabras: ni «cuartel», ni «lugar», ni «jardín» como nivel de la jerarquía.
*Alternativa descartada:* dejar las secciones planas, que impediría cualquier reporte agregado
por sector.

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

> **Renumerado (29 sep 2026).** Este spec reservaba `V013`–`V020`, pero la numeración es
> cronológica: §4.1 y §4.2 ya se implementaron como `V008`–`V011`, y el resto va después de las
> tablas de SPEC-002 (`V012`–`V019`) y de la bitácora de SPEC-004 (`V020`), porque altera tablas
> que esas migraciones crean. Fuente única: el **mapa de migraciones** de
> [`REGISTRO.md`](../REGISTRO.md#mapa-de-migraciones).

| Sección | Migración | Estado |
|---|---|---|
| §4.1 Jerarquía en catálogos | `V008` | ✅ Aplicada |
| §4.2 Taxonomía real | `V009`, `V010` (tipos provisionales, P-10), `V011` (descripciones de clase) | ✅ Aplicada |
| §4.3 Cantidades, origen e incidencia externa | `V021` | Pendiente |
| §4.4 Zonas reales del campus | `V022` | Pendiente |
| §4.4.6 Capa de zonas de supervisión | `V023` | Pendiente |
| §4.4.7 Referencias | `V024` | Pendiente |
| §4.5 Catálogos que la entrega permite cerrar | `V025` | Pendiente |
| §4.6 Evidencia sin momento declarado | `V026` | Pendiente |
| §4.7 Código heredado del arbolado | `V027` | Pendiente |
| §4.8 Subida diferida y publicación en el mapa | `V028` | Pendiente |

Reescribir una migración aplicada rompe Flyway por checksum: todo lo que este spec corrija de lo
ya aplicado se hace con `UPDATE`/`INSERT` en migraciones nuevas.

### 4.1 V008 — Jerarquía en catálogos (✅ aplicada)

```sql
-- V008__add_hierarchy_to_catalog_items.sql
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

### 4.2 V009–V011 — Taxonomía real de intervenciones (✅ aplicada)

> **Divergencia en la implementación.** El SQL de abajo asume que el `V010__seed_catalogs` de
> SPEC-002 ya había sembrado seis tipos inventados. Esa migración nunca se escribió, así que
> `V009` crea el `catalog_type` y no desactiva nada: `DECORACION` y `REMOCION_TERRENO`
> simplemente no se siembran. Ver el comentario de cabecera de `V009`.

Este es el cambio de mayor impacto del spec. El catálogo `INTERVENTION_TYPE` que diseñó SPEC-002
es **inventado**: SPEC-002 lo derivó sin material del cliente. De sus seis valores, solo dos
sobreviven al contraste con la taxonomía real, y `DECORACION` y `REMOCION_TERRENO` no existen en
la operación.

```sql
-- V009__seed_intervention_taxonomy.sql
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
responsable que el cliente le asigna, dato que conecta con las cuadrillas de `V005`:

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

### 4.3 V021 — Cantidades, origen e incidencia externa

La hoja `Podas arbpalm` revela tres conceptos que el modelo no tiene y que son los que el cliente
usa para medir cumplimiento.

```sql
-- V021__add_execution_tracking_to_interventions.sql

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

### 4.4 V022 — Zonas reales del campus

> **Reescrita el 29 sep 2026, dos veces.** La primera versión sembraba 17 cuarteles forestales como
> nivel padre de los lugares; el sistema ya no usa cuarteles. La segunda tomaba como secciones los
> 74 «lugares» del Excel; el equipo decidió que **las secciones son las áreas verdes del mapa del
> cliente**, porque son polígonos independientes. Los lugares pasan a ser **referencias**, con una
> tabla oficial de 411 (§4.4.4). La historia está en §4.4.2.

```sql
-- V022__seed_campus_zones.sql
-- Fuente: mapa interactivo del cliente (v32), capa de áreas verdes (§4.4.3).

-- Tipo de uso de cada sección (C-12, REQ 2.14). Los seis valores son los del
-- campo `uso` del mapa del cliente, sin reinterpretar.
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('USE_TYPE', 'Tipos de uso', 'Uso y demanda del área verde', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'ADMINISTRATIVE', 'Áreas de uso administrativo', 1),
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'SUSTAINABLE',    'Áreas de manejo sostenible y reducción de consumo de agua', 2),
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'RECREATIONAL',   'Áreas de uso recreativo/descanso', 3),
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'SPORTS',         'Áreas deportivas y recreación activa', 4),
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'INSTITUTIONAL',  'Uso institucional', 5),
    ((SELECT id FROM catalog_types WHERE code='USE_TYPE'), 'CONSERVATION',   'Áreas de conservación', 6);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='ZONE_TYPE'), 'SECTOR',     'Sector',     1),
    ((SELECT id FROM catalog_types WHERE code='ZONE_TYPE'), 'SECTION',    'Sección',    2),
    ((SELECT id FROM catalog_types WHERE code='ZONE_TYPE'), 'SUBSECTION', 'Subsección', 3);

ALTER TABLE zones
    ADD COLUMN map_code          VARCHAR(10),
    ADD COLUMN use_type_item_id  BIGINT REFERENCES catalog_items(id);

CREATE INDEX idx_zones_map_code ON zones(map_code);

-- Los 5 sectores. boundary = unión de sus secciones; area_m2 = suma del área
-- que declara el mapa para esas secciones. Quién los mantiene NO es un atributo
-- del sector: lo dice qué cuadrilla tiene asignada (teams.zone_id, §4.4.1).
INSERT INTO zones (code, name, zone_type_item_id, description, boundary, area_m2) VALUES
    ('SEC-VERDE-01',   'Sector verde 01',      <SECTOR>, NULL, <unión>, 45501.00),
    ('SEC-VERDE-02',   'Sector verde 02',      <SECTOR>, NULL, <unión>, 40603.00),
    ('SEC-VERDE-03',   'Sector verde 03',      <SECTOR>, NULL, <unión>, 32578.00),
    ('SEC-POLIDEPORT', 'Sector Polideportivo', <SECTOR>,
        'Mantenimiento contratado por tres años con un tercero', <unión>, 20767.00),
    ('SEC-BOSQUE-HUM', 'Sector Bosque húmedo', <SECTOR>,
        'Sin personal asignado; se atiende a demanda. Alberga fauna', <unión>, 11147.00);

-- Las 519 secciones: una por área verde con geometría (§4.4.3).
INSERT INTO zones (code, name, zone_type_item_id, parent_zone_id, boundary, area_m2,
                   map_code, use_type_item_id) VALUES
    ('AV-0001', 'Bosque Húmedo', <SECTION>, <SEC-BOSQUE-HUM>, <polígono>, 11147.35,
        'G 13', <USE_TYPE de «Uso Institucional»>),
    -- … 519 filas
    ;
```

Los `<…>` se resuelven con `SELECT id` como en el resto de migraciones; se abrevian aquí para que
se lea la estructura. Las 519 filas las genera un script a partir del JSON del mapa, que se
versiona junto a la migración.

**Los 5 sectores y de dónde sale cada uno:**

| Sector | Valor `jefe` en el mapa | Secciones | Superficie | Mantenimiento rutinario |
|---|---|---|---|---|
| **Sector verde 01** | `Alfonso` | 164 | 4.55 ha | Cuadrilla de un capataz |
| **Sector verde 02** | `Óscar` | 247 | 4.06 ha | Cuadrilla de un capataz |
| **Sector verde 03** | `Andrés` | 104 | 3.26 ha | Cuadrilla de un capataz |
| **Sector Polideportivo** | `campo depo` | 2 | 2.08 ha | Tercero por contrato |
| **Sector Bosque húmedo** | `Bosque húme` | 1 | 1.11 ha | Nadie de forma fija |
| *(sin sector)* | vacío | 1 | 0.50 ha | — |

La numeración de los sectores verdes sigue la superficie, de mayor a menor. El nombre del capataz
no aparece en ningún sector: **el sector es territorio, no persona**; quién lo dirige lo dice la
cuadrilla (`teams`), que puede cambiar sin tocar la zona.

**Por qué cinco sectores y no tres.** Los sectores verdes son los de los capataces. Los otros dos
cubren áreas que ellos no mantienen (3.ª entrevista):

- **Polideportivo.** Lo mantiene un servicio tercerizado por tres años, elegido en un proceso de
  selección, con un ingeniero agrónomo de campo y seis personas dedicadas al césped. Encaja con lo
  ya decidido: el riego de los campos deportivos no es de la sección.
- **Bosque húmedo.** No tiene personal asignado y **no** es un caso como el Polideportivo: se
  atiende a demanda, contratando el servicio cuando hace falta (por ejemplo, una poda
  excepcional). Su finalidad principal es albergar fauna: especies reconocidas por SERFOR
  (venados, tortugas terrestres, pavo real, alpaca) y fauna silvestre (aves, ardillas, loros,
  cernícalos, gavilanes). El zoocriadero sigue fuera de alcance (`fuera-de-alcance.md`).

**Quién mantiene un sector no es un atributo del sector.** Una primera versión de este spec
añadía una «modalidad de atención» exclusiva por sector (personal estable, tercerizado o a
demanda). Se descartó porque **no es exclusiva**: en un sector verde, los árboles de más de 5 m
los poda un tercero (E-03), y en el Bosque húmedo se contrata un servicio puntual cuando hace
falta. Una etiqueta por sector mentiría en cuanto un sector mezcla modalidades, que es lo normal.

La pregunta real se separa en dos, y cada una ya tiene dónde vivir:

| Pregunta | Dónde se responde | Por qué ahí |
|---|---|---|
| ¿Quién hace el **mantenimiento rutinario** del sector? | La cuadrilla asignada: `teams.zone_id` (V005, A-07). Un sector sin cuadrilla no lo mantiene el personal estable | Es un dato de organización, con vigencia (1.9), no del territorio |
| ¿Quién ejecutó **este trabajo**? | El propio trabajo: una intervención del personal estable, o una incidencia derivada a un tercero (E-02, E-03) | Varía trabajo a trabajo dentro del mismo sector |

Con eso se cubren los dos usos para los que se había propuesto la modalidad:

- **El alcance del `SUPERVISOR`** es el sector de su cuadrilla (A-07).
- **Los indicadores de cobertura** (D-02, F-02) miden a cada cuadrilla sobre su sector. El
  Polideportivo y el Bosque húmedo no tienen cuadrilla, así que no cuentan contra ningún capataz.
  Si entran en la meta de 15.6 ha lo decide el cliente: con ellos, la meta incluye 3.19 ha que la
  sección no mantiene de forma rutinaria.

La diferencia entre «contratado» y «a demanda» queda en `description`, como información. Cuando el
seguimiento de tercerizados entre al alcance, el contrato del Polideportivo se liga al sector por
`contract_zones` (SPEC-002 §4.7), que ya existe para eso.

**`AV-0011` «Jardín Rosales»** (`B 10`, 0.5 ha, exterior de Artes Escénicas) no tiene capataz en
el mapa. Se siembra como sección **sin sector** (`parent_zone_id` nulo) y queda fuera de los
indicadores por sector hasta que el cliente diga quién la atiende (P-15).

**Las secciones.** Cada área verde del mapa es un polígono independiente, y eso es una sección:

- `code` = `feature_id` del mapa (`AV-0001`…). Es único y estable.
- `name` = `nombre` si lo tiene (20 áreas, p. ej. «Jardín Tinkuy»); si no, `codigo`; si tampoco, el
  `feature_id`. El nombre reconocible vendrá del sistema de referencias (§4.4.4).
- `map_code` = `codigo` del mapa (`C 1`, `G 13`…), que tienen 187 áreas. **No es único**: 9
  códigos se repiten (§4.4.3), por eso va en columna propia sin índice único y no en `code`.
- `use_type_item_id` = el `uso` del mapa, que trae exactamente los **seis tipos de uso** del
  cliente. Cubre C-12 (`REQ 2.14`) y requiere el catálogo `USE_TYPE` de esa historia.
- `boundary` = el polígono del área verde; 27 áreas son multipolígonos. `area_m2` = el área que
  declara el mapa.

**Las subsecciones no se siembran.** Una subsección es una división interna de una sección, y solo
se crea si hace falta; la da de alta el `ADMIN`.

**Ya no hace falta `centroid`.** La versión anterior lo añadía porque las secciones eran puntos;
ahora tienen polígono y el punto se calcula (`ST_PointOnSurface`). Los puntos de los 74 lugares
pertenecen al sistema de referencias.

**La asignación sección → sector no guarda historia.** `parent_zone_id` dice el sector vigente,
pero el requisito 1.9 exige vigencia porque los sectores cambian con las obras. Esa historia la
modela el spec de A-07 / 1.9; esta semilla solo carga el estado actual.

#### 4.4.1 «Sector» significaba tres cosas distintas (P-13b, resuelto en la 2.ª entrevista)

«Sector» aparece 9 veces en el Excel y **no siempre quiere decir lo mismo**:

| Sentido en el Excel | Ejemplo literal | Qué es en el modelo |
|---|---|---|
| **Sinónimo de lugar** | «Deshierbo y canteo, **sector Tinkuy**» · «Canteo y barrido, **sector OCAI**» | Una **referencia** (§4.4.4). No es un nivel |
| **Uso informal** | «Canteo y deshierbo en el **cuartel 16, sector Arqueología**» | Una **referencia** (Arqueología). La mención al cuartel se ignora |
| **Sector de capataz** | Columna «**Sector de jefe de grupo**», con valores Andrés / Óscar / Alfonso | Un **sector verde** |

**La jerarquía queda así:**

```
Sector (5)                   ← 3 verdes (capataces) + Polideportivo + Bosque húmedo
   └── Sección (519)         ← cada área verde del mapa: un polígono independiente
        └── Subsección       ← opcional: división interna de una sección
```

La autorreferencia de `zones` la admite sin cambio de esquema. Solo exige que `boundary` sea
`MultiPolygon` (enmienda a SPEC-002 §4.3): un sector es la suma de sus secciones, y 27 secciones ya
son multipolígonos.

#### 4.4.2 Cómo se llegó aquí (corrige D-07)

1. **Primera versión:** cuartel forestal → lugar. Los cuarteles resultaron en desuso («se usa
   cada vez menos… no me da mucha información», 2.ª entrevista) y el 29 sep 2026 el equipo decidió
   **no usarlos**: no son tipo de `ZONE_TYPE`, no se siembran y no hay mapeo a cuarteles (P-13a
   descartada). El inventario de especies antiguo, que solo se ubica por cuartel, no se importa por
   cuartel; el que entra es el georreferenciado de `catastro campus.xlsx` (2.13).
2. **Segunda versión:** sector → lugar (74) → subsección. Los lugares son puntos, y un lugar
   abarca varias áreas verdes que pueden ser de capataces distintos. Asignarlos a un sector exigía
   una heurística espacial nuestra.
3. **Versión vigente:** sector → sección (área verde) → subsección. El sector de cada sección lo
   dice el propio mapa del cliente, sin heurística.

#### 4.4.3 Qué trae el mapa interactivo del cliente (v32, «jefes y supervisión»)

Revisado el 29 sep 2026. Es un HTML autocontenido con los datos embebidos en JSON: coordenadas
enteras en **decímetros** sobre un plano local cuyo origen es `(-77.080157, -12.069676)`. La
reproyección a WGS 84 es directa, y el área que calcula coincide en un 0.1 % con la que el propio
archivo declara.

| Capa | Elementos | Destino |
|---|---|---|
| `verdes` | 521 áreas verdes, 15.56 ha | **Secciones** (§4.4). `jefe` da el sector; `uso`, el tipo de uso |
| `supervision` | 4 polígonos, `Zona1`…`Zona4`, 40.3 ha | **Capa aparte** (§4.4.5) |
| `campus` | Perímetro del campus, 41.9 ha | Límite para validar coordenadas |

**Calidad del dato:**

| Hallazgo | Magnitud | Tratamiento |
|---|---|---|
| Valores de `jefe` truncados (`campo depo`, `Bosque húme`) | 3 áreas | Delata un *shapefile* de origen: el formato DBF corta el texto al ancho del campo. **No afecta la carga**: `jefe` se traduce a sector con una tabla fija y el nombre visible lo pone el sistema. Los demás campos llegan completos (`nombre` hasta 30 caracteres, `referencia` hasta 41, `uso` hasta 57) |
| Áreas verdes sin geometría | 2 (`AV-0173`, `AV-0411`), 0.9 m² | No se siembran: 521 − 2 = **519 secciones** |
| Área verde sin capataz | 1 (`AV-0011`, Jardín Rosales), 0.5 ha | Sección sin sector (P-15) |
| Códigos de mapa repetidos (`B 6`, `B 13`, `C 31`, `C 42`, `D 8`, `D 14`, `D 18`, `D 20`, `F 26`) | 9 códigos | Van a `map_code`, sin unicidad. El identificador es `feature_id` |

#### 4.4.4 Referencias: el vocabulario con el que el personal se orienta

El personal se orienta por **referentes** —edificios, pisos, oficinas, estacionamientos, puertas:
«Jardines de Ingeniería Civil»—, no por códigos de sección. Una **referencia** es un punto con nombre.
**No es un nivel de la jerarquía de zonas**: no contiene secciones ni pertenece a un sector.

**Para qué sirven** (decisión del 30 sep 2026):

| Uso | Cómo |
|---|---|
| **Buscar en el mapa** | Se busca por nombre o alias, sin tildes ni mayúsculas (`unaccent`, V007), y el mapa se centra en el punto |
| **Importar ubicaciones** | Una fila con nombre de lugar (el Excel histórico, una lista nueva) se traduce a un punto buscando la referencia por nombre o alias |

**Lo que no hacen:** describir dónde ocurrió una incidencia o una intervención. Eso se **calcula** a
partir de su ubicación con un algoritmo de cercanía que el equipo detallará; por eso
`interventions` e `incidents` **no** guardan una FK a referencias.

> ⚠️ **Pendiente del equipo:** el algoritmo de cercanía que describe la ubicación de una
> incidencia o intervención.

**Los nombres pueden repetirse, y está bien.** A un mismo edificio se le llama de varias formas
(«Dinthilac», «Edificio Dintilhac», «Complejo Dintilhac»), y un mismo nombre puede tener varios
puntos («Pabellón Z» marca 12 accesos). Por eso `name` no tiene índice único: el identificador es
`code`.

**Jerarquía entre referencias.** Un piso pertenece a un edificio y una oficina a un piso: una
referencia puede tener una **referencia padre** (`parent_reference_id`). La carga inicial la usa en
los 25 pisos que llegaron sin edificio («Cuarto piso»), asignándoles **el edificio más cercano**
entre las categorías Edificio, Pabellones y Unidades académicas y Facultades. 24 quedan sin
ambigüedad; uno («Tercer piso», a 21 m de Humanidades y a 24 m de Pabellón L) va al más cercano y
queda marcado para revisión en la nota del archivo.

**Alias.** Otra forma de llamar a una referencia que **no** es un punto propio: «hallazgos» lleva a
«Oficina de hallazgos», que es el nombre oficial. Un alias se encuentra al buscar e importar, pero
no se dibuja en el mapa. Se diferencia de un nombre repetido en que no tiene coordenadas: describe
un lugar, no lo ubica.

**Categorías.** Las 24 de la tabla del cliente son las oficiales (Facultades, Piso, Estacionamiento,
Entrada…) y van al catálogo configurable `REFERENCE_CATEGORY`: el `ADMIN` puede añadir o renombrar
sin despliegue.

**La carga oficial inicial.** Parte de la tabla de 499 lugares que entregó el equipo el 30 sep 2026,
con estas correcciones:

| Corrección | Filas | Detalle |
|---|---|---|
| Coordenadas normalizadas | 499 | Llegaron en cuatro formatos (`-120675311`, `-12066587`, `-1.206.852`, `-120.669`). Regla única: quitar separadores y poner el decimal tras los dos primeros dígitos. 29 filas solo traen 4-5 decimales (precisión de 1-10 m) |
| Fuera del campus, eliminadas | 11 | Open PUCP, Puerta Urubamba, IEEE UFFC, dos paradas de BUS PUCP, Centro de Arbitraje, PUCP NSE4, Instituto Confucio, Híkary, Palmetto Hotel y Cancha de frontón |
| Entrada principal corregida | 1 | La fila «PUCP» estaba a 1.8 km del campus. Pasa a llamarse **Entrada principal** y toma el punto de «Puerta principal» |
| Plantas, movidas al catastro | 77 | Los puntos en serie de «Mecánica» (34), «Biblioteca Central» (25) y «Arqueología» (18) no son lugares. **No siguen la forma de ningún polígono**: si fueran contornos, casi todos estarían a menos de 1 m del borde de un mismo polígono, y lo están 7 de 34, 7 de 25 y 0 de 18, repartidos entre varios polígonos. Son plantas individuales sin especie. **Por ahora no se cargan ni se muestran** (decisión del 30 sep 2026); se conservan en su archivo hasta decidir qué hacer con ellas |
| Pisos con edificio padre | 25 | Por cercanía, ver arriba |
| Alias | 1 | `hallazgos` → Oficina de hallazgos |

Resultado: **411 referencias** en 24 categorías y 270 nombres distintos. Los archivos versionados son
la fuente de la migración:

- [`docs/dominio/datos/referencias-oficiales.csv`](../../docs/dominio/datos/referencias-oficiales.csv)
- [`docs/dominio/datos/referencias-alias.csv`](../../docs/dominio/datos/referencias-alias.csv)
- [`docs/dominio/datos/plantas-sin-especie.csv`](../../docs/dominio/datos/plantas-sin-especie.csv) — **no se carga**: queda como registro hasta decidir su tratamiento

**El Excel histórico contra las referencias.** De sus 75 lugares distintos, 73 coinciden por nombre
exacto y `hallazgos` entra por alias. **`Universitaria` no está entre las referencias**: las filas
históricas que la usan **no se importan**.

#### 4.4.5 Zonas de supervisión: capa aparte

El mapa del cliente trae **4 zonas de supervisión** (`Zona1`…`Zona4`): multipolígonos que cubren
juntos 40.3 ha, casi todo el campus, edificios incluidos. **No son áreas verdes ni un nivel de la
jerarquía**: cortan a los sectores (el Sector verde 02 tiene secciones en las cuatro zonas), así
que no pueden ser padre ni hijo de un sector.

| Zona | Superficie |
|---|---|
| Zona 1 | 9.12 ha |
| Zona 2 | 8.09 ha |
| Zona 3 | 11.20 ha |
| Zona 4 | 11.87 ha |

Se cargan en una tabla propia (`V023`, §4.4.6). **La zona de cada sección no se guarda: se calcula
por posición** (la zona que contiene la mayor parte de su superficie). Guardarla duplicaría un dato
que la geometría ya responde y que se desincronizaría al redibujar una zona.

**Cada zona tiene un supervisor**, que es un usuario del sistema. El archivo del cliente no lo
dice, así que **por ahora el supervisor de las cuatro zonas es el coordinador** (decisión del 29 sep
2026). Quién será el supervisor real de cada una queda como pregunta al cliente (P-16).

- **Qué usuarios pueden supervisar una zona:** los de rol `COORDINADOR`, y por tanto también
  `ADMIN`, que incluye sus permisos (A-02). No los `SUPERVISOR`: ese rol es el del **capataz**, y
  supervisa una cuadrilla, no una zona. El nombre coincide y es fácil confundirlos.
- **Si se desactiva el usuario que supervisa una zona,** la zona vuelve al supervisor por defecto
  en la misma transacción. Una zona nunca queda sin supervisor.
- **Supervisar una zona no restringe lo que se ve.** Hoy el supervisor de zona es el coordinador,
  que ya ve todo el campus. Si mañana lo es otra persona con alcance limitado, ese alcance se
  especifica entonces; este spec no lo inventa.

#### 4.4.6 V023 — Capa de zonas de supervisión

```sql
-- V023__create_supervision_zones.sql
-- Capa territorial del cliente, independiente de la jerarquía de zonas (§4.4.5).

CREATE TABLE supervision_zones (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(30)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT NOT NULL REFERENCES users(id),
    boundary           GEOMETRY(MultiPolygon, 4326) NOT NULL,
    area_m2     NUMERIC(12, 2) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE UNIQUE INDEX idx_supervision_zones_code_active
    ON supervision_zones(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_supervision_zones_boundary ON supervision_zones USING GIST(boundary);
CREATE INDEX idx_supervision_zones_supervisor ON supervision_zones(supervisor_user_id);

-- Supervisor por defecto: el coordinador. Si la base aún no tiene ningún
-- COORDINADOR activo (una instalación nueva solo trae el admin de V004), cae en
-- el ADMIN, que incluye los permisos de COORDINADOR (A-02). Si no hay ninguno de
-- los dos, el NOT NULL detiene la migración: es preferible a una zona sin dueño.
WITH default_supervisor AS (
    SELECT u.id
      FROM users u
      JOIN catalog_items r ON r.id = u.role_item_id
     WHERE u.is_active AND u.deleted_at IS NULL
       AND r.code IN ('COORDINADOR', 'ADMIN')
     ORDER BY (r.code = 'COORDINADOR') DESC, u.id
     LIMIT 1
)
INSERT INTO supervision_zones (code, name, supervisor_user_id, boundary, area_m2)
SELECT v.code, v.name, ds.id, v.boundary, v.area_m2
  FROM default_supervisor ds, (VALUES
    ('ZS-1', 'Zona de supervisión 1', <multipolígono>,  91242.75),
    ('ZS-2', 'Zona de supervisión 2', <multipolígono>,  80863.43),
    ('ZS-3', 'Zona de supervisión 3', <multipolígono>, 112022.74),
    ('ZS-4', 'Zona de supervisión 4', <multipolígono>, 118736.06)
  ) AS v(code, name, boundary, area_m2);
```

**`supervisor_user_id` es `NOT NULL`:** el equipo decidió que toda zona tiene supervisor. Qué
usuario puede serlo (rol `COORDINADOR` o `ADMIN`, activo) lo valida el servicio: un `CHECK` no puede
consultar el rol, que vive en otra tabla.

**Por qué la semilla cae en el `ADMIN`:** en una instalación nueva solo existe la cuenta de `V004`.
Cuando el `ADMIN` cree la cuenta del coordinador, reasigna las zonas desde la pantalla de
administración. Si la reasignación no se hace, el supervisor sigue siendo el jefe de sección, que
es quien hoy tiene esa responsabilidad.

`boundary` también es `NOT NULL`, a diferencia de `zones`: una zona de supervisión **es** su
polígono; sin él no significa nada.

#### 4.4.7 V024 — Referencias

```sql
-- V024__create_place_references.sql
-- Puntos con nombre para buscar en el mapa e importar ubicaciones (§4.4.4).
-- No forman parte de la jerarquía de zonas.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('REFERENCE_CATEGORY', 'Categorías de referencia',
     'Tipo de lugar al que alude una referencia', FALSE);

-- Las 24 categorías de la tabla oficial, con su texto original como label.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code='REFERENCE_CATEGORY'), 'FACULTY', 'Facultades', 1),
    -- … 24 filas
    ;

CREATE TABLE place_references (
    id                   BIGSERIAL PRIMARY KEY,
    code                 VARCHAR(20)  NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    category_item_id     BIGINT NOT NULL REFERENCES catalog_items(id),
    parent_reference_id  BIGINT REFERENCES place_references(id),
    location             GEOMETRY(Point, 4326) NOT NULL,
    notes                TEXT,
    is_active            BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP,

    CONSTRAINT chk_place_references_not_self_parent
        CHECK (parent_reference_id IS NULL OR parent_reference_id <> id)
);

-- name NO es único: un lugar tiene varios nombres y un nombre, varios puntos.
CREATE UNIQUE INDEX idx_place_references_code_active
    ON place_references(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_place_references_parent   ON place_references(parent_reference_id);
CREATE INDEX idx_place_references_category ON place_references(category_item_id);
CREATE INDEX idx_place_references_location ON place_references USING GIST(location);

CREATE TABLE place_reference_aliases (
    id            BIGSERIAL PRIMARY KEY,
    reference_id  BIGINT NOT NULL REFERENCES place_references(id),
    alias         VARCHAR(200) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP
);

CREATE INDEX idx_place_reference_aliases_reference ON place_reference_aliases(reference_id);

-- Carga oficial inicial: 411 referencias y 1 alias, generados desde
-- docs/dominio/datos/referencias-*.csv.
```

**Lo que el DDL no dice:**

- **`location` es `NOT NULL`.** Una referencia sin punto no sirve para buscar en el mapa ni para
  importar una ubicación. Lo que no tiene punto es un alias.
- **Sin índice de texto sobre `name`.** Con ~400 filas, `unaccent(name) ILIKE unaccent(:q)` se
  resuelve sin índice. `unaccent` no es `IMMUTABLE` y no admite un índice de expresión directo; si el
  volumen crece, se añade una columna normalizada.
- **Ciclos en la jerarquía** (A padre de B, B padre de A): el `CHECK` solo impide el caso de una
  referencia que sea su propio padre. El resto lo valida el servicio, como en `zones`.

### 4.5 V025 — Catálogos que la entrega permite cerrar

```sql
-- V025__seed_confirmed_catalogs.sql

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

### 4.6 V026 — Evidencia sin momento declarado

```sql
-- V026__add_unspecified_evidence_moment.sql

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

### 4.7 V027 — Código heredado del arbolado

```sql
-- V027__add_legacy_code_to_green_elements.sql
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

### 4.8 V028 — Subida diferida de evidencia y publicación en el mapa

Dos capacidades que la 2.ª entrevista convirtió en requisito y que el esquema no contemplaba.

```sql
-- V028__add_deferred_upload_and_map_publication.sql

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
  coordenadas. Al importar, ambas resuelven a la misma referencia oficial (§4.4.4).
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
| CA-05 | Las zonas están cargadas en sectores y secciones | `zones` con tipo `SECTOR` devuelve **5**. Con tipo `SECTION` devuelve **519**, todas con `boundary` y `area_m2`, y solo `AV-0011` con `parent_zone_id` nulo. Con tipo `SUBSECTION` devuelve **0**. `place_references` devuelve **411** (25 con referencia padre) y `place_reference_aliases`, **1**. `supervision_zones` devuelve **4**, todas con `supervisor_user_id` de un usuario `COORDINADOR` o, si no existe ninguno, `ADMIN`. `ZONE_TYPE` no tiene ningún ítem de cuartel |
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
- DECORACION y REMOCION_TERRENO no se ofrecen (V009 no los siembra; ver la divergencia de §4.2)

Cantidades
- executed_quantity sin unit_item_id → rechazado por la base
- cantidad negativa → rechazada por el CHECK
- executed_quantity < requested_quantity → se guarda (es el caso de cumplimiento parcial, no un error)

Evidencia
- UNSPECIFIED aceptado en importación
- UNSPECIFIED rechazado por el servicio en captura nueva

Zonas
- 5 sectores, con boundary MultiPolygon igual a la unión de sus secciones
- 519 secciones; AV-0173 y AV-0411 (sin geometría) no se siembran
- AV-0011 sin sector; ninguna otra sección con parent_zone_id nulo
- valores truncados del mapa (`campo depo`, `Bosque húme`) se traducen al sector correcto
- secciones con map_code repetido (`B 6`, `C 31`…) se siembran sin error
- supervisor de zona con rol SUPERVISOR (capataz) → rechazado por el servicio
- desactivar al usuario que supervisa una zona → la zona vuelve al supervisor por defecto
- base sin COORDINADOR → las zonas quedan supervisadas por el ADMIN de V004
- la zona de supervisión de una sección se calcula por posición, no se guarda

Referencias
- buscar «hallazgos» devuelve Oficina de hallazgos (alias)
- buscar «dinthilac» sin tilde ni mayúscula devuelve las referencias con ese nombre
- dos referencias con el mismo nombre y distinto punto se guardan sin error
- referencia sin location → rechazada por la BD
- referencia padre de sí misma → rechazada por chk_place_references_not_self_parent
- ciclo A → B → A → rechazado por el servicio
- importar una fila histórica con «Universitaria» → se descarta y se informa, no falla la importación

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
| SPEC-002 §4.3 | `zones` gana `map_code` y `use_type_item_id`; se siembran **5 sectores + 519 secciones** del mapa del cliente. La jerarquía `parent_zone_id` pasa de hipótesis a uso real. **P-01 se cierra.** Entra la tabla `supervision_zones`, fuera de la jerarquía y con un supervisor por zona. |
| SPEC-002 §4.5 | `green_elements` gana `legacy_code` con índice **no único**, para las placas del inventario forestal antiguo (D-08). |
| SPEC-002 §4.6 | `interventions` gana cantidades, origen, código externo y ficha técnica. |
| SPEC-002 Anexo | P-01, P-02, P-04 y P-08 avanzan; entra **P-10** (tipos de `FITOSANITARIO` e `INSPECCION`). |
| SPEC-003 §3 | `catalog_items` gana `parent_item_id`: los catálogos pueden ser jerárquicos. |
| SPEC-003 §8 | Entran `INTERVENTION_CLASS`, `INTERVENTION_ORIGIN`, `INCIDENT_SOURCE`. Se actualizan los valores de `INTERVENTION_TYPE`, `SPECIES_TYPE`, `MEASUREMENT_UNIT`, `EVIDENCE_MOMENT`, `URGENCY_LEVEL`, `ZONE_TYPE`. |
| **SPEC-000 §1 · REGLAS §0.1** | «Sin dependencia de servicios externos» pasa de **una** excepción (SMTP) a **tres**: se añaden la **publicación en el mapa del cliente** y el **servicio de mapas**. Misma condición acotante para las tres: su caída nunca impide una operación de negocio. |
| **SPEC-002 §4.3** | La jerarquía de zonas deja de ser una incógnita: **sector → sección → subsección**. Los cuarteles forestales quedan fuera del modelo. `boundary` pasa a `MultiPolygon`. |
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

**P-11 y P-12 quedaron resueltas** y se documentan en §2.0.3 y §2.0.4. Estado de las demás y preguntas nuevas del mapa del cliente (29 sep 2026):

| # | La contradicción | Por qué no la decidimos nosotros |
|---|---|---|
| ~~**P-13a**~~ | **Descartada (29 sep 2026):** el sistema no usa cuarteles (§4.4.2). Se conserva el razonamiento original. | Faltaba el **mapeo lugar → cuartel** completo. Solo **2 de 283 filas** mencionan un cuartel, y con dos casos no hay patrón: ni numérico ni geográfico. Inventarlo produciría un reporte por cuartel de apariencia oficial y contenido falso — peor que no tenerlo, porque un campo vacío se ve vacío y uno mal llenado se ve correcto. |
| ~~**P-13b**~~ | **Resuelta en la 2.ª entrevista:** la palabra «sector» tenía tres sentidos en el Excel. | El sector es el nivel raíz de la jerarquía (§4.4.1). |
| **P-15** | `AV-0011` «Jardín Rosales» (`B 10`, 0.5 ha, exterior de Artes Escénicas) **no tiene capataz** en el mapa. | Qué sector lo atiende. Hasta entonces es una sección sin sector (§4.4). |
| **P-16** | El mapa trae **4 zonas de supervisión**, pero no dice quién supervisa cada una. | Quién será el supervisor real de cada zona y si los capataces le reportan. Mientras tanto, las cuatro las supervisa el coordinador (§4.4.5). |

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
| ~~P-01~~ | ~~Polígonos de las zonas~~ | ✅ **Cerrada (29 sep 2026)** con el mapa v32 (§4.4) |
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
