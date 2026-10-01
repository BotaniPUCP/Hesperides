# Catálogo de requisitos

> **Actualizado tras la 3.ª entrevista (29 de septiembre de 2026)**, con las tres entrevistas al
> cliente como fuente. Lo que queda fuera de la primera versión, y por qué, está en
> [`fuera-de-alcance.md`](fuera-de-alcance.md).
>
> **Leyenda de cambios:** 🆕 nuevo · ⬆️ sube prioridad · ⬇️ baja prioridad.
>
> **Columna «¿Se puede?»** — si tenemos información suficiente para construirlo hoy:
> **✅ Sí** · **🔶 Parcial** (se puede empezar, falta un dato para terminarlo) ·
> **🔒 No** (bloqueado hasta que llegue algo del cliente) · **⏭️ Futuro** (fuera de la primera
> versión; se conserva para no perder su contexto).
>
> **Prioridad** es importancia para el cliente, **no** orden de construcción. Un requisito de
> prioridad Alta puede estar bloqueado y no poder empezarse. **Peso** es su traducción numérica
> (Alta 3 · Media 2 · Baja 1 · `HAB` 1). **Avance** es el porcentaje construido.

---

## Los dolores del cliente

Toda prioridad de este catálogo se justifica contra esta lista. Si un requisito no apunta a
ningún dolor, **no puede ser Alta** — a menos que sea un habilitador (ver abajo).

| ID | Dolor | De dónde sale |
|---|---|---|
| **D1** | **La información está dispersa y se alimenta a mano.** Excels en Drives sin conexión; Carolina actualiza el mapa interactivo **semanalmente a mano** | «Tener una información maestra» · «la actualización semanal que hace Carolina» |
| **D2** | **Del servicio tercerizado solo se ve el producto final**, no el proceso | «Lo que se controla es el producto final» · «transparentar algunas cosas con ellos» |
| **D3** | **No existe un catastro.** 30% del arbolado ubicado; el inventario botánico no tiene coordenadas; las placas viejas no son fiables | «No existe un catastro. Estamos justo en ese proceso» |
| **D4** | **El trabajo de campo se reporta de palabra** y lo teclea un intermediario. Sin estructura ni recursos consumidos | «Sería mucho más interesante ver que **ellos** lo reporten» |
| **D5** | **Cuesta demostrar la cobertura.** La meta es 100% de las 15.6 ha al mes, y verificarlo es manual | «Al mes tenemos que llegar al 100% de esa cobertura» |
| **D6** | **No se puede equilibrar el mantenimiento.** No hay forma rápida de ver qué zonas reciben muchas atenciones y cuáles pocas | «Mostrar qué lugares tienen mayor o menor número de intervenciones… para tener un equilibrio» |
| **D7** | **Los procesos no están formalizados.** Sección nueva (agosto 2024), sin trazabilidad de quién hizo qué ni cuándo | «Que esos procesos sean visibles, tengan un orden, un seguimiento» |

### Habilitadores

Requisitos que **el cliente nunca pidió** pero sin los cuales nada funciona: autenticación,
usuarios, roles, catálogos base. **No son dolores y no compiten con ellos.** Se marcan `HAB` para
que la etiqueta «Alta» quede reservada a lo que de verdad duele.

---

## Quién usa el sistema

La primera versión es **solo para la sección**, y dentro de ella solo para quienes reportan y
deciden:

| Rol (catálogo `ROLE`) | Quién es | Cuentas |
|---|---|---|
| `ADMIN` | El **jefe de sección**. **Incluye todos los permisos de `COORDINADOR`**: una sola cuenta, sin cambiar de rol | 1 |
| `COORDINADOR` | Jefatura de la sección. Planifica, consulta reportes, valida | Se conserva para una segunda persona de jefatura |
| `SUPERVISOR` | **Capataz** / jefe de grupo. Registra intervenciones, incidencias y riego de su sector | 3 |
| `OPERARIO` | Jardinero. **Se conserva por formalidad**, sin cuentas en esta versión | 0 |

> **Por qué `ADMIN` incluye a `COORDINADOR` en vez de admitir varios roles por usuario:** el modelo
> ya implementado guarda **un rol por usuario** (`users.role_item_id`, un solo `role` en el JWT).
> Hacer de `ADMIN` un superconjunto resuelve el caso real sin tocar SPEC-001 ni SPEC-100.

**No tienen cuenta:** los ~26 operarios, el ingeniero de campo, las asistentes, los practicantes,
los proveedores tercerizados y las unidades que piden atenciones. Ver
[`fuera-de-alcance.md`](fuera-de-alcance.md) §1.3 y §1.5.

---

## Resumen

| | Cantidad |
|---|---|
| Requisitos en la versión anterior | 72 |
| **Requisitos nuevos** | **5** (1.12 · 2.13 · 2.14 · 3.12 · 5.11) |
| **Total** | **77** |
| Pasan a **fase futura** (⏭️) | **13** |
| **En alcance de la primera versión** | **64** |

**Prioridades de los 64 en alcance:**

| Prioridad | Cantidad |
|---|---|
| **Alta** | **17** (27%) |
| Media | 30 |
| Baja | 8 |
| `HAB` habilitador | 9 |

**Distribución por módulo (en alcance / total):** M1 12/12 · M2 12/14 · M3 12/12 · M4 1/10 ·
M5 10/11 · M6 9/10 · M7 5/5 · M8 3/3

### Qué se puede construir hoy

| Estado | Cantidad (sobre 64) | |
|---|---|---|
| **✅ Se puede** | **56** (88%) | Información suficiente |
| **🔶 Parcial** | **7** (11%) | Se puede empezar; falta un dato para cerrarlo |
| **🔒 Bloqueado** | **1** (2%) | Necesita algo del cliente |

**De los 17 requisitos Alta, 14 están listos y 3 no:**

| | Requisito | Qué falta |
|---|---|---|
| 🔶 | **1.9** Cuadrillas y sectores | Qué sector atiende «Jardín Rosales», la única sección sin responsable (P-15) |
| 🔶 | **6.8** Cobertura mensual | Que el cliente valide nuestra regla de «lugar cubierto» |
| 🔶 | **7.2** Cobertura de riego | Que el cliente valide nuestra regla de «lugar regado» |

### Qué desbloquea más cosas

| Lo que falta | Desbloquea |
|---|---|
| **Detallar el algoritmo de cercanía** que describe dónde ocurrió una incidencia | 5.1 · 3.4 |
| **Validar las reglas de cobertura** — lugar cubierto y lugar regado | 6.8 · 7.2 |
| **Validar la propuesta de reportes** | 6.2 · 6.3 · 6.4 |
| **La lista de zonas con más de una pasada** | 7.3 |

> **El cliente ya casi no bloquea nada.** Lo que queda son definiciones que **proponemos
> nosotros** y el cliente valida, no archivos que haya que esperar.

### Cada dolor tiene requisitos Alta que lo atacan

| Dolor | Requisitos Alta |
|---|---|
| **D1** Información dispersa y manual | 3.4 · 3.7 · 6.1 |
| **D2** Tercerizado opaco | 6.10 |
| **D3** No hay catastro | 2.2 · 2.9 · 2.12 · 2.13 |
| **D4** Reporte verbal con intermediario | 3.1 · 3.3 · 3.5 |
| **D5** Cuesta demostrar cobertura | 1.9 · 6.1 · 6.8 · 6.10 · 7.1 · 7.2 |
| **D6** No se puede equilibrar el mantenimiento | 3.4 |
| **D7** Procesos sin formalizar | 1.9 · 3.1 · 3.7 · 5.1 · 5.3 |

> ⚠️ **D2 queda casi sin atender en esta versión, y es a propósito.** Al pasar el seguimiento de
> los servicios tercerizados a fase futura, solo 6.10 lo toca. No es un olvido: **no tenemos
> información del proceso tercerizado** (ni un contrato ni un informe de proveedor), y construir
> sobre suposiciones sería peor que esperar. D6 conserva además 6.9, de prioridad Media.
>
> ⚠️ **D1 pierde su requisito central.** Sin la integración con el mapa del cliente (2.8), Carolina
> seguirá alimentándolo a mano. D1 se ataca desde el registro en campo (3.4, 3.7) y el tablero
> (6.1): la información deja de estar dispersa, pero su mapa no se actualiza solo.

---

## Cambios de esta versión *(25 sep 2026)*

| Decisión | Efecto en el catálogo |
|---|---|
| **Usuarios: solo el jefe de sección y los 3 capataces** | 1.2 fija que `ADMIN` incluye a `COORDINADOR`; `OPERARIO` se conserva sin cuentas |
| **Servicios tercerizados: solo los datos básicos del proveedor** | **4.2 se queda.** 4.1 y 4.3-4.10 pasan a ⏭️, y con ellos **6.7** |
| **Sin integración con Centuria** | **5.8 se reformula:** una marca de origen, no el código externo. **5.10** pasa a ⏭️ |
| **Incidencias con modelo propio, al estilo TI** | **5.7 se desbloquea** (lista propia, sin la matriz del cliente). 5.1 y 5.3 incorporan urgencia y el estado «en proceso» |
| **Ficha técnica de poda** | 🆕 **3.12** |
| **Maquinaria de corte solo en domingos y feriados** | 🆕 **5.11** |
| **Mapa de calor en nuestro modelado** | **6.9** 🔶 → ✅. **2.1** 🔶 → ✅: el sistema tiene su propio mapa para las vistas internas |
| **Jardines a fase futura** (21 sep) | La jerarquía de 1.6 queda en **sector → lugar** |
| **Inventario forestal entregado** (21 sep) | **1.5** 🔒 → ✅ (91 especies) · 🆕 **2.13** importarlo · **2.3** 🔒 → 🔶 · **2.11** ⬆️ Alta |
| **QR: dentro, pero es lo último** | M8 conserva sus requisitos y se construye al final |

**Tras la 3.ª entrevista (29 sep):**

| Decisión | Efecto en el catálogo |
|---|---|
| **Tipo de uso por sección**, con los seis tipos del mapa del cliente | 🆕 **2.14** |
| **Eventos del campus:** periodos bloqueantes y de préstamo | 🆕 **1.12** |
| **La jerarquía es sector → sección → subsección** | 1.6 renombra «lugar» como **sección** y admite subsecciones |
| **Los sectores cambian poco, pero cambian** (obras) | 1.9: la asignación sección → sector tiene vigencia |
| **Incidencias: solo «En proceso» y «Cerrada»** | 5.3 sin estados intermedios |
| **Plazos por urgencia; con tercero, el pactado** | **5.6** 🔶 → ✅ |
| **La maquinaria también trabaja sábados** | 5.11 amplía los días válidos; los eventos bloqueantes solo avisan |

**Segunda revisión de pendientes (25 sep):**

| Decisión | Efecto en el catálogo |
|---|---|
| **Sin integración con el mapa del cliente.** Sería otro proyecto | **2.8** 🔒 → ⏭️ |
| **Basta saber si un árbol mide menos o más de 5 m** | **2.11** 🔒 → ⏭️: el inventario botánico ya no hace falta. La clase de altura se registra en campo (2.2) |
| **La ficha se infiere de `catastro campus.xlsx`** | **2.3** 🔶 → ✅ |
| **El equipo define el criterio del código** | **2.9** 🔶 → ✅ · **8.1** 🔶 → ✅ |
| **Valida el jefe de sección; el capataz no valida** | **3.6** 🔶 → ✅ |
| **Proveedores con datos de prueba** | **4.2** 🔶 → ✅ |
| **Reportes: propuesta propia** | **6.2 · 6.3 · 6.4** 🔒 → 🔶 |
| **El equipo diseña QR, ficha pública y etiqueta** | **8.2** 🔶 → ✅ · **8.3** 🔒 → ✅ |

---

## M1 · Administración y Configuración

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 1.1 | Gestión de usuarios (CRUD) | `HAB` | 1 | — | ✅ | 100% | Especificado en SPEC-100 |
| 1.2 | Gestión de roles y permisos | `HAB` | 1 | — | ✅ | 100% | **`ADMIN` incluye todos los permisos de `COORDINADOR`**. `OPERARIO` sin cuentas |
| 1.3 | Autenticación y login | `HAB` | 1 | — | ✅ | 100% | Implementado (SPEC-001) |
| 1.4 | Catálogo de tipos de intervención | `HAB` | 1 | — | ✅ | 100% | 9 clases → 45 tipos. Fitosanitario e Inspección con tipos provisionales (P-10) |
| 1.5 | Catálogo de especies | `HAB` | 1 | — | ✅ | 0% | 🔒 → ✅ **91 especies** del inventario forestal entregado (21 sep). Se siembra en 2.13 |
| 1.6 | Catálogo de zonas del campus | `HAB` | 1 | — | 🔶 | 0% | **Sector (5) → sección (519) → subsección.** Todo sale del mapa v32. Más **411 referencias** oficiales para buscar. Ver nota |
| 1.7 | Configuración de frecuencias de mantenimiento | Media | 2 | D2 | ✅ | 20% | Especificado en SPEC-006 |
| 1.8 | Parámetros generales del sistema | Baja | 1 | — | ✅ | 0% | Incluye la **lista de feriados** que usa 5.11 |
| 1.9 | Gestión de cuadrillas y asignación a sectores | **Alta** | 3 | D5 D7 | 🔶 | 0% | 3 sectores verdes (9+9+7 personas), un capataz cada uno; Polideportivo y Bosque húmedo sin cuadrilla propia. La asignación de secciones **tiene vigencia**. Falta P-15 |
| 1.10 | Catálogo de insumos y materiales | `HAB` | 1 | — | ✅ | 0% | Lista extraída del Excel |
| 1.11 | Catálogo de unidades de medida | `HAB` | 1 | — | ✅ | 0% | und · m · m² · m³ |
| **1.12** | **Eventos del campus** | Media | 2 | D5 D7 | ✅ | 0% | 🆕 Periodos bloqueantes y de préstamo, sobre el campus, un sector o una sección. Ver nota |

**Sobre 1.4 — la taxonomía es de dos niveles.** El Excel define **9 clases** (Habilitación,
Rehabilitación, Mantenimiento, Poda, Propagación, Riego, Manejo fitosanitario, Residuos,
Inspección) y **45 tipos** colgando de ellas. Manejo fitosanitario e Inspección y monitoreo
llegaron **sin tipos**; tienen tipos provisionales (V010) hasta que el cliente los confirme.

**Sobre 1.6 — sector, sección y subsección.** **Solo se usan esas tres palabras** (29 sep): los
cuarteles forestales no entran al modelo.

- Una **sección** es un **área verde** del mapa del cliente: un polígono independiente. Hay 519.
- Un **sector** es un conjunto de secciones. Hay 5: **Sector verde 01, 02 y 03** (los de los
  capataces, numerados por superficie), **Sector Polideportivo** (lo mantiene un tercero por
  contrato) y **Sector Bosque húmedo** (sin personal asignado, se atiende a demanda).
- Una **subsección** es una división interna de una sección, solo si hace falta.

Los «lugares» del Excel dejan de ser secciones y pasan a ser **referencias**: una tabla oficial de
411 puntos con nombre, que sirven para buscar en el mapa e importar ubicaciones (SPEC-005 §4.4.4).

**Sobre 1.9 — los sectores cambian poco, pero cambian.** *«Probablemente lo modifiquemos en algunos
meses por un tema de ejecuciones de obra… pequeñas modificaciones»* (3.ª entrevista). Cada sección
pertenece a un sector **desde una fecha**. Si una sección pasa a otro capataz, la cobertura de los
meses anteriores se sigue contando en el sector que la tenía entonces.

**Sobre 1.12 — los eventos del campus.** Un evento es un periodo que afecta al trabajo de campo:

| Campo | Qué guarda |
|---|---|
| Tipo | **Bloqueante** (examen de admisión, fin de ciclo, jueves cultural) o **préstamo** (una unidad usa el jardín para una actividad) |
| Nombre | «Examen de admisión 2027-1», «Préstamo para feria de Letras» |
| Fechas | Inicio y fin; con **recurrencia** opcional (cada jueves, cada semestre) |
| Ámbito | **Todo el campus**, un **sector** o una **sección** |

- **Un evento bloqueante solo avisa:** quien programa trabajo en ese ámbito y esas fechas ve el
  aviso, pero puede seguir.
- **Un préstamo marca la sección** mientras dura. Al terminar, la sección aparece como **«requiere
  recuperación»**: OSG presta unos 12 jardines de forma recurrente y *«esos espacios nos demandan
  mucho tiempo para recuperarlos»*.

**Sobre 1.7 — las frecuencias no son fijas.** Césped 30-45 días *según estación*; fitosanitario
4 al año *mínimo, más si el clima lo exige*; poda mayor 1 al año. En 2026, un «verano eterno»
obligó a cortar más seguido. **El sistema no puede asumir periodicidad constante.**

---

## M2 · Catastro Verde

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 2.1 | Mapa interactivo del campus | Media | 2 | D1 D6 | ✅ | 0% | 🔶 → ✅ **Mapa propio** para registro, filtros y mapa de calor |
| 2.2 | Registro de elementos verdes en mapa | **Alta** | 3 | D3 | ✅ | 0% | Incluye la **clase de altura**: < 5 m o ≥ 5 m. Ver nota |
| 2.3 | Ficha de cada elemento verde | Media | 2 | D3 | ✅ | 0% | 🔒 → ✅ Se infiere de `catastro campus.xlsx`. Ver nota |
| 2.4 | Filtros y búsqueda en mapa | Media | 2 | D6 | ✅ | 0% | Por sector y por sección, con nombres reconocibles |
| 2.5 | Carga de capas/sectores del campus | Media | 2 | D1 | ✅ | 0% | 🔒 → ✅ El mapa v32 trae las **521 áreas verdes** (secciones) con su responsable y las 4 zonas de supervisión |
| 2.6 | Registro de campos deportivos | Baja | 1 | D3 | ✅ | 0% | Solo como superficie; su riego no es de la sección |
| 2.7 | Historial por elemento | Media | 2 | D7 | ✅ | 0% | |
| 2.8 | Integración con el mapa interactivo existente | **Alta** | 3 | D1 | ⏭️ | 0% | 🔒 → ⏭️ **Fuera del proyecto:** sería un proyecto aparte |
| 2.9 | Código de identificación nuevo para arbolado | **Alta** | 3 | D3 | ✅ | 0% | 🔶 → ✅ **El criterio lo define el equipo** |
| 2.10 | Conservar el código heredado como referencia | Media | 2 | D3 | ✅ | 0% | Sin índice único: hay códigos duplicados y reasignados |
| 2.11 | Importar el inventario botánico sin coordenadas | **Alta** | 3 | D3 | ⏭️ | 0% | 🔒 → ⏭️ **Ya no hace falta:** para decidir quién poda basta la clase de altura (2.2) |
| 2.12 | Registro progresivo del catastro | **Alta** | 3 | D3 | ✅ | 0% | Debe funcionar con el catastro al 30% |
| **2.13** | **Importar el inventario forestal georreferenciado** | **Alta** | 3 | D3 | ✅ | 0% | 🆕 `catastro campus.xlsx`: **962 registros**, 91 especies, 6 formas biológicas |
| **2.14** | **Tipo de uso de cada sección** | Media | 2 | D6 | ✅ | 0% | 🆕 Los seis tipos del mapa del cliente. Ver nota |

### Sobre 2.1 y 2.8 — un mapa propio, sin integración

El cliente **ya tiene un mapa funcionando** (GitHub Pages + Google Maps, en el repositorio
personal de Carolina) que comparten las **tres secciones de OSG**. **Este proyecto no se integra
con él** (2.8 ⏭️): alimentarlo automáticamente sería un proyecto aparte. El análisis de lo que
haría falta queda en [`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md).

Hesperides tiene **su propio mapa** (2.1) para marcar la zona intervenida, filtrar y ver el mapa de
calor (2.4 · 3.4 · 6.9).

### Sobre 2.2 y 2.11 — la clase de altura en vez de la medida exacta

La altura importa por **una sola decisión**: quién poda. **< 5 m** lo hace el personal estable;
**≥ 5 m** va a un tercero. Para eso no hace falta la altura exacta ni el inventario botánico: basta
la **clase de altura**, que el capataz registra en campo al capturar o intervenir un ejemplar.

Mientras nadie la registre, el ejemplar queda **«sin clasificar»**, y el sistema pide verificarlo
antes de proponer quién lo atiende. Nunca se asume la clase por la especie.

> **Un atajo que conviene pedir:** el levantamiento actual incluye evaluación dasométrica
> (diámetro a la altura del pecho y **altura estimada**), pero lo que nos compartieron no la trae:
> la tiene la ingeniera a cargo (3.ª entrevista). Si la comparte, la clase se deriva de ese dato y
> no hay que clasificar en campo los 817 ejemplares.

### Sobre 2.3 — qué lleva la ficha

`catastro campus.xlsx` no es un formato de captura con estado de salud, pero sí fija la mayor parte
de la ficha. El resto lo proponemos nosotros:

| Campo | De dónde sale |
|---|---|
| Ubicación, referencia, latitud, longitud | `catastro campus.xlsx` |
| Nombre común, nombre científico, forma biológica | `catastro campus.xlsx` |
| Cantidad (matas agrupadas) y foto | `catastro campus.xlsx` |
| Código heredado | `catastro campus.xlsx` (columna `Código`, solo los 46 valores reales) |
| **Código nuevo** | Propuesta del equipo (2.9) |
| **Clase de altura** (< 5 m / ≥ 5 m / sin clasificar) | Propuesta del equipo (2.2) |
| **Estado sanitario** (bueno / regular / malo) | Propuesta del equipo. Robert lo nombró como criterio de valoración |
| **Historial de intervenciones** | Del sistema (2.7) |

### Sobre 2.5 — cómo se divide el campus

| División | Cuántas | ¿En alcance? | Para qué |
|---|---|---|---|
| **Sector** | 5 | ✅ Sí | 3 verdes organizan personal y **el ciclo de riego**; Polideportivo y Bosque húmedo no son de los capataces |
| **Sección** | 519 | ✅ Sí | Cada área verde del mapa del cliente |
| **Subsección** | Opcional | ✅ Sí | División interna de una sección |
| **Referencia** | 411 | ✅ Sí | Puntos con nombre (edificio, piso, oficina, puerta…) para buscar e importar ubicaciones. No es un nivel de la jerarquía |
| **Zona de supervisión** | 4 | ✅ Sí, como capa aparte | Divide el campus en 4 y corta a los sectores. Cada una tiene supervisor; por ahora, el coordinador (P-16) |

Robert se orienta por **referentes** — edificios, facultades, vías, jardines emblemáticos —, que
son las referencias. Los **cuarteles forestales no se usan** (29 sep): en la 3.ª entrevista los
llamó *«básicamente data histórica»*.

### Sobre 2.14 — el tipo de uso

Cada sección tiene un tipo de uso, tomado de la capa del mapa del cliente. Robert lo usa para
decidir cómo gestionar los recursos: *«cómo lo vas usando y a su vez cómo también vamos gestionando
los recursos para su recuperación»*.

| Tipo de uso | Qué lo caracteriza (3.ª entrevista) |
|---|---|
| **Uso administrativo** | — |
| **Manejo sostenible, ahorro de agua** | Especies de bajo consumo: xerofíticas, jardines mediterráneos |
| **Recreativo y descanso** | El que más mano de obra demanda; los jueves culturales lo degradan |
| **Deportivo** | Concesionado a un tercero por tres años |
| **Institucional** | Valor de paisaje, bajo impacto: fotos de graduación, momentos especiales |
| **Conservación** | — |

Es un catálogo configurable (`USE_TYPE`): otro cliente puede tener otros tipos. Permite ver la
cobertura y el mapa de calor **por tipo de uso**, y prepara la rehabilitación futura.

---

## M3 · Intervenciones — Personal Estable

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 3.1 | Registro de actividad diaria | **Alta** | 3 | D4 D7 | ✅ | 0% | **La registra el capataz.** 283 registros analizados |
| 3.2 | Asignación de tareas a personal | Media | 2 | D7 | ✅ | 0% | Hoy la orden es verbal y funciona |
| 3.3 | Registro de evidencia fotográfica | **Alta** | 3 | D4 | ✅ | 0% | 218 de 280 filas tienen foto |
| 3.4 | Marcado de zona intervenida en mapa | **Alta** | 3 | D1 D6 | ✅ | 0% | Automatiza el trabajo manual de Carolina |
| 3.5 | Registro de insumos y materiales | **Alta** | 3 | D4 | ✅ | 0% | Pedido textual de Robert. Ver nota |
| 3.6 | Cierre y validación de actividad | Media | 2 | D7 | ✅ | 0% | 🔶 → ✅ **Valida el jefe de sección (`COORDINADOR` o `ADMIN`). El capataz registra, no valida** |
| 3.7 | Vista de actividades del día/semana | **Alta** | 3 | D1 D7 | ✅ | 0% | |
| 3.8 | Registro de actividades diversas | Media | 2 | D7 | ✅ | 0% | Las 9 clases completas |
| 3.9 | Actividades de larga duración con avances parciales | Media | 2 | D7 | ✅ | 0% | Confirmado en la 2.ª entrevista (ejemplo de 2 meses) |
| 3.10 | Registro de una actividad sobre varias zonas | Media | 2 | D6 | ✅ | 0% | Hay casos reales en el Excel |
| 3.11 | Cantidad pedida vs. ejecutada | Media | 2 | D2 | ✅ | 0% | Solo poda a demanda |
| **3.12** | **Ficha técnica de poda** | Media | 2 | D7 | ✅ | 0% | 🆕 **Solo cuando se usa escalera.** Ver nota |

### Sobre 3.5 — es un pedido textual del cliente

> «Sería mucho más interesante ver que **ellos lo reporten**. O tener una herramienta en la cual
> ellos van reportando el consumo: *hoy consumí 5 sacos de arena, hoy consumí 20 sacos de
> confitillo*. Y de alguna forma un poquito **amable**, que ellos puedan interactuar y compartir
> esa data.»

Tres cosas de esa frase:

1. Es un **cambio de modelo**: hoy el capataz reporta verbalmente y otro registra. Robert quiere
   que **el capataz registre directamente**.
2. Hoy la oficina **no planifica** cuánto insumo se usa. Sería información nueva, no digitalizada.
3. **«Amable»** no es decorativo: son personas con 30-40 años de oficio, no usuarios de software.

### Sobre 3.9 — no todas las actividades duran un día

Robert dio un ejemplo real: una nueva área verde junto a las losas de Minas — 350 m² de césped,
10 cerezos japoneses, 45 matas de *Peniceti* reubicadas y 60 divididas. **Empezó a fines de junio
y terminó a principios de septiembre.**

Durante un trabajo así se cruzan varias actividades y los capataces **sí hacen reportes
intermedios**. Otras intervenciones empiezan y acaban el mismo día. El sistema debe soportar
ambas.

### Sobre 3.12 — la ficha técnica de poda

La poda tiene **tres regímenes**, y la ficha solo existe en uno:

| Régimen | Quién | ¿Ficha técnica? |
|---|---|---|
| **A ras de suelo**, con tijera telescópica (hasta ~4 m) | Personal estable | **No.** Es de menor riesgo y no se registra |
| **Con escalera** (8-10 pasos), árbol **< 5 m** | Personal estable | **Sí**, con prevencionista presente |
| **Árbol > 5 m** | Tercerizado | Otro régimen: grúa, motosierra y prevencionista del proveedor |

**Qué registra la ficha** (entrevista 2): herramientas utilizadas (de la lista de herramientas
que Robert compartirá tras la 3.ª entrevista), personal que ejecuta y
**prevencionista presente**, que puede ser de la PUCP o del servicio tercerizado EULEN. La
llenan los capataces con ayuda de las ingenieras de la sección o del propio prevencionista.

> **Por qué importa:** *«te caes de 2 metros y medio, 3 metros y medio, la posibilidad de que te
> fractures el cuello…»*. La ficha es la **trazabilidad de seguridad** del trabajo en altura del
> personal propio.

---

## M4 · Contratos y Servicios Tercerizados

> **En esta versión solo se registran los datos básicos del proveedor (4.2).** Todo el seguimiento
> de los servicios pasa a fase futura porque **no tenemos información de ello**: no hemos visto un
> contrato tipo, un informe de proveedor ni qué revisa la sección antes de dar conformidad. Ver
> [`fuera-de-alcance.md`](fuera-de-alcance.md) §1.2.

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 4.1 | Registro de contratos/servicios | Media | 2 | D2 | ⏭️ | 0% | No hemos visto un contrato tipo |
| 4.2 | Registro de proveedor | Media | 2 | D2 | ✅ | 0% | 🔶 → ✅ **Solo datos básicos**, sembrados con **datos de prueba** |
| 4.3 | Seguimiento de ejecución del servicio | **Alta** | 3 | D2 | ⏭️ | 0% | Falta un reporte de cierre del proveedor |
| 4.4 | Carga de informe final del proveedor | Media | 2 | D2 | ⏭️ | 0% | Robert los está compilando |
| 4.5 | Comparativo frecuencia pactada vs. real | **Alta** | 3 | D2 D5 | ⏭️ | 0% | Falta si las frecuencias están en el contrato |
| 4.6 | Checklist de cumplimiento por servicio | **Alta** | 3 | D2 | ⏭️ | 0% | Depende del inventario de ~100 jardines, también futuro |
| 4.7 | Calendario de servicios programados | Media | 2 | D2 | ⏭️ | 0% | Es seguimiento del servicio |
| 4.8 | Registro de la orden de compra | Baja | 1 | D2 | ⏭️ | 0% | La tramita Logística |
| 4.9 | Conformidad del servicio | Media | 2 | D2 | ⏭️ | 0% | Falta qué revisa antes de aprobar |
| 4.10 | Rendimiento del proveedor | Baja | 1 | D2 | ⏭️ | 0% | El proveedor no entrega ese dato hoy |

---

## M5 · Gestión de Incidencias

> **Modelo propio, al estilo de la gestión de incidencias de TI.** No replicamos la matriz del
> cliente (es confidencial y no la necesitamos): proponemos nuestro flujo de registro, urgencia,
> estados y cierre. **Las incidencias las registra el capataz.**

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 5.1 | Registro de incidencia | **Alta** | 3 | D7 | ✅ | 0% | La registra el capataz, con **urgencia** alta / media / baja. Ver nota |
| 5.2 | Asignación de incidencia | Media | 2 | D7 | ✅ | 0% | Regla: < 5 m personal estable, > 5 m tercero |
| 5.3 | Seguimiento de estado | **Alta** | 3 | D7 | ✅ | 0% | **Reportada → En proceso → Cerrada.** Ver nota |
| 5.4 | Vinculación con el catastro | Media | 2 | D3 D7 | ✅ | 0% | Opcional: una incidencia puede ir sobre una zona |
| 5.5 | Historial de incidencias | Media | 2 | D7 | ✅ | 0% | |
| 5.6 | Notificaciones de incidencias urgentes | Media | 2 | D7 | ✅ | 0% | 🔶 → ✅ **Plazo por urgencia**; con tercero, el pactado. Ver nota |
| 5.7 | Catálogo de tipos de incidencia | `HAB` | 1 | — | ✅ | 0% | 🔒 → ✅ **Lista propia**. El cliente compartirá los encabezados de su matriz para contrastarla |
| 5.8 | Marca de origen Centuria | Baja ⬇️ | 1 | D1 | ✅ | 0% | **Reformulado:** una marca de que la solicitud llegó por Centuria. Ver nota |
| 5.9 | Distinguir hallazgo de mantenimiento rutinario | Media | 2 | D7 | ✅ | 0% | El Excel ya lo distingue |
| 5.10 | Avisar a la unidad solicitante al cerrar | Media | 2 | D7 | ⏭️ | 0% | Las unidades no son usuarias y su canal es Centuria |
| **5.11** | **Maquinaria de corte solo en sábados, domingos y feriados** | Media | 2 | D7 | ✅ | 0% | 🆕 Ver nota |

### Sobre 5.1 — la urgencia depende de dónde está el problema

La urgencia **no** la decide el tamaño del árbol sino **el riesgo según la ubicación**
(entrevista 2):

- **Riesgo bajo:** la mayoría de las atenciones `OSG-####` — ramas sobrecrecidas, obstrucciones
  menores. También un árbol grande **en una jardinera retirada**, aunque entre a un tercer piso.
- **Riesgo alto:** el mismo árbol **sobre una vía de alto tránsito** (el Pontódromo, por ejemplo),
  donde una inflorescencia de 5-6 kg puede caer desde 8-10 m. *«Esto se tiene que atender en el
  menor tiempo posible»*.

### Sobre 5.3 — los estados

Por ahora una incidencia tiene **tres estados: Reportada, En proceso y Cerrada.** Las esperas de
una incidencia derivada a un tercero (validación de la dirección, orden de compra, subsanación) no
tienen estado propio: la incidencia sigue **en proceso** y el detalle va en comentarios.

### Sobre 5.3 — el estado «en proceso»

Cuando una incidencia **supera la capacidad del personal estable** (> 5 m, o necesita grúa), no
se cierra ni se abandona: queda **en proceso** mientras Logística tramita la orden de compra, el
proveedor cotiza y se programa el servicio. *«Se mantiene en proceso hasta que se cumpla la orden
de compra, se brinda la atención y ahí se cierra.»*

| Quién atiende | Tiempo de referencia |
|---|---|
| Personal estable | **3-5 días** |
| Tercero | **Más de una semana**; a veces un mes |

### Sobre 5.6 — los plazos

El plazo es el tiempo máximo entre que se registra una incidencia y que se atiende. Sirve para
**avisar antes de que venza** y para medir en el reporte mensual **cuántas se atendieron en plazo**.

| Quién atiende | Plazo |
|---|---|
| **Personal estable** | Según la **urgencia**, configurable. Referencia del cliente: *«por lo general un día, máximo 48 horas»* |
| **Tercero** | El **pactado previamente** con el proveedor, registrado al derivar la incidencia |

> Valores iniciales propuestos, a confirmar con el cliente: **alta 24 h · media 48 h · baja 72 h**.

### Sobre 5.8 — una marca, no una integración

**No hay integración con Centuria** (no tenemos acceso). Si a alguien le llega una solicitud por
Centuria, **puede** registrarla a mano como incidencia y **marcarla como originada en Centuria**.
Es opcional. El origen se registra con el catálogo `INCIDENT_SOURCE`.

> Así, cuando llegue la integración (fase futura), las incidencias históricas de Centuria ya
> estarán identificadas.

### Sobre 5.11 — la regla de la maquinaria de corte

La maquinaria de corte (motosierra, podadora de altura) **solo se programa en sábados, domingos y
feriados**: *«imagínate, estás haciendo tu clase… y suena una motosierra al costado»*. Aplica
cuando una incidencia se deriva a un tercero y se le asigna fecha de atención: el sistema **no
admite** un día de lunes a viernes que no sea feriado. Los feriados vienen de 1.8.

Además, si la fecha cae en un **evento bloqueante** (1.12) del mismo ámbito —un examen de admisión,
un fin de ciclo—, el sistema **avisa**, pero no impide.

---

## M6 · Reportes y Analítica

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 6.1 | Dashboard general | **Alta** | 3 | D1 D5 | ✅ | 0% | Con las métricas de 6.8 y 6.10 |
| 6.2 | Reporte básico (operativo) | Media | 2 | D1 | 🔶 | 0% | 🔒 → 🔶 **Propuesta propia**, pendiente de validar con el cliente |
| 6.3 | Reporte intermedio (coordinación) | Media | 2 | D1 | 🔶 | 0% | 🔒 → 🔶 Ídem |
| 6.4 | Reporte avanzado (dirección) | Media | 2 | D1 | 🔶 | 0% | 🔒 → 🔶 Ídem |
| 6.5 | Exportación de reportes (PDF/Excel) | Media | 2 | D1 | ✅ | 0% | |
| 6.6 | Filtros por zona, período, tipo | Media | 2 | D6 | ✅ | 0% | |
| 6.7 | Indicadores de rendimiento | Baja | 1 | D2 | ⏭️ | 0% | Depende de 4.10 |
| 6.8 | Cobertura mensual del 100% de las 15.6 ha | **Alta** | 3 | D5 | 🔶 | 0% | Falta qué cuenta como zona cubierta |
| 6.9 | Mapa de calor de intervenciones por zona | Media | 2 | D6 | ✅ | 0% | 🔶 → ✅ **Entra en nuestro modelado**, sobre el mapa propio (2.1) |
| 6.10 | Cumplimiento de frecuencias por servicio | **Alta** | 3 | D2 D5 | ✅ | 0% | Frecuencias de SPEC-006 |

### Sobre 6.8 y 6.9 — son las métricas que el cliente ya usa

Robert expresa sus metas como **cobertura**, no como promedios:

> «Nosotros al mes tenemos que llegar al 100% de esa cobertura, con su riego, su mantenimiento, su
> perfilado, su reemplazo de plantas si lo requieren.»

Y sobre el mapa de calor, describió exactamente para qué usa el mapa interactivo:

> «Se puede mostrar de forma rápida qué lugares del campus están con mayor número de intervenciones
> o menor número de intervenciones… y algunos donde se le puede programar mayores atenciones, para
> tener un equilibrio de mantenimiento regular.»

**6.9 no es un extra de analítica: es la función principal de la herramienta que ya usan.** Por
eso lo incluimos en nuestro modelado aunque su mapa ya lo tenga.

---

## M7 · Riego

> Es el proceso **mejor estructurado** del cliente: tiene turnos, solapamientos, ventana horaria y
> una métrica de cobertura. Robert lo llama **la métrica principal** de la sección.
>
> **Por qué módulo propio y no una actividad de M3:** el riego es la única clase de actividad que
> tiene **planificación previa** (un turno semanal por sector), **una meta de cobertura** (100% en
> 15 días) y **una ventana horaria**. Las demás actividades se registran cuando ocurren; el riego
> se **programa y se verifica contra un plan**.

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 7.1 | Registro del turno de riego por sector | **Alta** | 3 | D5 | ✅ | 0% | Ciclo bien explicado en la 2.ª entrevista |
| 7.2 | Cobertura del campus en la ventana de 15 días | **Alta** | 3 | D5 | 🔶 | 0% | Falta qué cuenta como «zona regada» |
| 7.3 | Zonas que requieren más de una pasada | Media | 2 | D5 | 🔒 | 0% | Falta la lista de esas zonas |
| 7.4 | Control de la ventana horaria | Baja | 1 | — | ✅ | 0% | 6:30-7:00 a 11:30 |
| 7.5 | Registro de horas de bomba | Baja | 1 | — | ✅ | 0% | 5.5 h verano · 3 h invierno |

### Cómo funciona el ciclo

```
Semana 1:  Sector A riega (9 personas, ~4.5 ha)
Semana 2:  Sector B riega (9 personas, ~4.5 ha)
           Sector C (~3 ha, 7 personas) se solapa con ambos
           los jueves, viernes y sábado
                              ↓
           Campus completo regado en 15-16 días
```

Robert usa una analogía que vale la pena recordar: **«cada capataz es una electroválvula»**. El
riego es manual pero funciona como un sistema automatizado por sectores.

**La ventana horaria tiene una razón que no es agronómica:** después de las 11:30 no se riega para
que al mediodía las áreas verdes estén **disponibles para los estudiantes**.

---

## M8 · Información Pública (QR)

> **Dentro del alcance, pero es la última prioridad:** se construye cuando todo lo demás esté
> terminado.

| ID | Requisito | Prioridad | Peso | Dolor | ¿Se puede? | Avance | Nota |
|---|---|---|---|---|---|---|---|
| 8.1 | Generación de código QR por elemento | Baja | 1 | D3 | ✅ | 0% | 🔶 → ✅ Lo diseña el equipo, sobre el código de 2.9 |
| 8.2 | Página pública de ficha de especie | Baja | 1 | — | ✅ | 0% | 🔒 → ✅ Con los datos de 2.3 |
| 8.3 | Diseño de etiqueta imprimible | Baja | 1 | D3 | ✅ | 0% | 🔒 → ✅ La diseña el equipo; imprimirla es decisión del cliente |

**Sobre 8.3 — hay un antecedente que conviene tener presente.** Las placas de aluminio del
inventario antiguo fracasaron: se perdieron, quedaron en ejemplares muertos y **se reasignaron a
otras plantas** («un código de un eucalipto se lo puso a una palmera»). Cualquier etiqueta física
nueva hereda ese riesgo.

---

## Fuera de alcance

Lo que existe en el dominio pero no se construye en esta versión está en
[`fuera-de-alcance.md`](fuera-de-alcance.md), separado en **fase futura** (jardines, seguimiento de
tercerizados, Centuria, operarios como usuarios, vivero, zoocriadero…) y **no se planea incluir**
(periféricos, áreas fuera de los muros, riego automatizado…).

---

## Lo que bloquea qué

**Ningún requisito Alta está bloqueado (🔒).** El único bloqueado es de prioridad Media
(2.5 pasó a ✅ el 29 sep, al llegar el mapa v32):

| Requisito | Qué falta |
|---|---|
| 7.3 Zonas con más de una pasada | La lista de esas zonas |

**No se compartirá, y no hace falta:** la matriz de control de incidentes. Es sensible y se maneja
con la jefatura. El módulo de incidencias usa un modelo propio (M5).

---

## Decisiones de alcance tomadas

| Decisión | Resultado |
|---|---|
| **¿Quién usa el sistema?** | **El jefe de sección (`ADMIN`, que incluye a `COORDINADOR`) y los 3 capataces.** Nadie más tiene cuenta |
| **¿Servicios tercerizados?** | **Solo los datos básicos del proveedor.** El seguimiento pasa a fase futura: no tenemos información de ello |
| **¿Integración con Centuria?** | **No en esta versión.** Se puede marcar a mano que una incidencia vino de Centuria |
| **¿Incidencias?** | **Sí, con modelo propio** al estilo de la gestión de incidencias de TI. Las registra el capataz |
| **¿Mapa de calor?** | **Sí, en nuestro modelado**, sobre el mapa propio |
| **¿El vivero entra?** | **No, pasa a fase futura.** La clase «Propagación y plantación» **sí permanece**: el personal estable propaga en campo |
| **¿El zoocriadero entra?** | **No, pasa a fase futura** |
| **¿Los periféricos entran?** | **No, y no se planea** |
| **¿Riego es módulo propio?** | **Sí, M7.** Es la única actividad que se **planifica y verifica contra un plan** |
| **¿Módulo de residuos vegetales?** | **No.** 10 registros de un solo tipo. Queda cubierto dentro de M3 |
| **¿App móvil?** | **Sí, como canal (no módulo)**, para 3.3, 3.5 y 2.2. **Android**, app instalada. La foto se guarda siempre en el teléfono con un flag `subida_a_la_nube`; al reconectar la app sube las pendientes. Nunca hay un «no se pudo guardar» |
| **¿Cómo se garantiza que las fotos suban?** | **Indicador de pendientes encendido por defecto**, verde solo cuando todas están en la nube. Nadie debe terminar el turno en rojo |
| **¿Gestión de almacenamiento?** | **No.** Si no hay espacio, un mensaje y nada más |
| **¿Mapa propio o integración?** | **Mapa propio (2.1).** La integración con el mapa del cliente (2.8) queda fuera: sería otro proyecto |
| **¿Hace falta la altura exacta de cada árbol?** | **No.** Basta la clase: < 5 m o ≥ 5 m |
| **¿Tipo de uso?** | **Sí (2.14)**, con los seis tipos del mapa del cliente |
| **¿Eventos del campus?** | **Sí (1.12):** bloqueantes y de préstamo, sobre el campus, un sector o una sección. Los bloqueantes **solo avisan** |
| **¿Estados de una incidencia?** | **Reportada, En proceso y Cerrada.** Sin estados intermedios por ahora |
| **¿Plazos de atención?** | **Por urgencia** para el personal estable; **el pactado** para el tercero |
| **¿Quién valida una intervención?** | **El jefe de sección** (`COORDINADOR`, y por tanto `ADMIN`). **El capataz no valida**: registra |

---

## Análisis · ¿Cuánto entran los residuos vegetales en los procesos?

**Respuesta corta: mucho menos de lo que parece.** El residuo aparece constantemente **como efecto
secundario** de otras actividades, pero **casi no se gestiona como proceso propio**.

### Lo que dicen los datos

La clase «Manejo de residuos vegetales» tiene 4 tipos definidos. En 171 registros con taxonomía
nueva:

| Tipo de actividad | Registros |
|---|---|
| Disposición o aprovechamiento de residuos | **10** |
| Recolección de hojarasca | **0** |
| Recolección de ramas | **0** |
| Triturado de residuos | **0** |

Y los 10 registros son **literalmente lo mismo**: «Traslado de maleza», «Traslado de Maleza», «Se
trasladó maleza»… **De cuatro tipos definidos, se usa uno, y para una sola cosa.**

### Pero el residuo sí está por todas partes

Rastreando palabras en los comentarios de los 283 registros:

| Palabra | Menciones |
|---|---|
| barrido | 19 |
| maleza | 15 |
| Punto de Acopio (como lugar) | 12 |
| hojarasca | 9 |
| ramas | 1 |
| mulch | 1 |
| **compost / triturado / desecho** | **0** |

El patrón es claro: **el residuo se genera y se traslada, pero no se pesa, no se tritura y no se
composta** — o al menos no se registra. «Barrido de hojas» se anota como *limpieza de hojarasca*
(mantenimiento), no como gestión de residuo.

### El único proceso real: reutilización de material

La hoja oculta `aprovechamiento de grass y conf` registra **5 traslados** de material recuperado:

```
Grass 43 m²   Arte Nuevo      →  Física, El puesto
confitillo     Arte Nuevo      →  MINAS
Grass          Pabellón V      →  Espalda de Mac Gregor, Diodo, Física
confitillo 10 m³  Pabellón V   →  Arquitectura
Grass          EEGG Ciencias   →  FARES, Pabellón Z
```

Esto **sí es un proceso con forma**: un material sale de un lugar y va a **uno o varios destinos**.
Pero son 5 registros en todo el periodo, en una hoja **oculta**, con fechas incompletas.

### Recomendación

**No crear módulo de residuos en la fase 1.** Razones:

1. **Volumen ínfimo**: 10 registros de un solo tipo, más 5 de reutilización.
2. **Ya está cubierto**: los 4 tipos existen dentro de M3 como cualquier actividad. Quien quiera
   registrar un triturado, puede.
3. **Falta el dato que lo haría útil**: no se registra **cuánto** residuo se genera ni **en qué
   termina**. Sin cantidad ni destino, un módulo de residuos sería una pantalla vacía.
4. **El cliente no lo pidió.** Mencionó el componente ambiental y que la poda mayor genera mucho
   residuo, pero **no pidió trazarlo**.

> **Lo que sí conviene hacer ahora**, sin módulo: que M3.5 (insumos) permita registrar **material
> recuperado**, no solo consumido. Así el traslado de grass y confitillo queda capturado con la
> estructura que ya existe.
>
> **Y una pregunta para la 3.ª entrevista:** ¿se pesa o mide el residuo de la poda mayor
> (~215-230 árboles)? Si hay un volumen que alguien reporta, cambia el análisis.

---

## Análisis · ¿Qué procesos de la fase 1 necesitan app móvil?

**Respuesta corta: tres requisitos la necesitan de verdad, y hay un dato que lo demuestra.**

### El dato que lo demuestra

De las 280 filas de 2026:

| | Cantidad |
|---|---|
| Con foto | 218 (77%) |
| Con coordenadas GPS | 102 (36%) |
| **Con foto Y coordenadas** | **101 (36%)** |

**De 102 filas con coordenadas, 101 también tienen foto.** Esa correlación casi perfecta no es
casualidad: **cuando alguien capturó la ubicación fue porque estaba en el sitio, con el teléfono
en la mano**. El 64% restante se registró después, de memoria, sin GPS.

Esa es exactamente la brecha que una app móvil cierra.

### Qué requisitos dependen del campo

| Requisito | ¿Móvil? | Por qué |
|---|---|---|
| **3.3** Evidencia fotográfica | 🔴 **Imprescindible** | La foto se toma en el sitio. Hoy pasa por WhatsApp/Drive y alguien la enlaza a mano |
| **3.5** Insumos y materiales | 🔴 **Imprescindible** | Robert lo pidió textual: que el capataz reporte *«hoy consumí 5 sacos de arena»*. Eso ocurre en campo, no en oficina |
| **2.2** Registro de elementos en mapa | 🔴 **Imprescindible** | Capturar un árbol **es ir hasta el árbol**. Es el trabajo que hace hoy el ingeniero del catastro |
| **3.1** Registro de actividad diaria | 🟡 Conveniente | Podría hacerse al final del día, pero pierde el GPS |
| **3.9** Avances parciales | 🟡 Conveniente | En trabajos de meses, reportar el avance donde ocurre |
| **5.1** Registro de incidencia | 🟡 Conveniente | Ver una rama caída y reportarla en el momento |
| **7.1** Turno de riego | 🟡 Conveniente | Marcar zona regada al terminar el turno |
| M1, M4, M6 (admin, contratos, reportes) | ⚪ No | Trabajo de escritorio |

### El problema de fondo que resuelve

Hoy hay **un intermediario** entre quien hace el trabajo y quien lo registra:

```
Capataz ejecuta  →  reporta VERBALMENTE  →  Robert/Carolina/Fabiola
                                             lo teclean en el Excel
```

Robert quiere eliminar ese paso. Su frase: *«sería mucho más interesante ver que **ellos lo
reporten**»*. **Sin móvil, ese cambio no ocurre** — un capataz no va a volver a la oficina a
teclear en un formulario web.

### Conectividad ✅

**Hay cobertura de datos en el campus.** No llega a todos los rincones, pero **no tenemos un mapa
de las zonas sin señal y por ahora no se considera**: el diseño no depende de saber dónde falla.

**Todos los teléfonos son Android.** Una sola plataforma.

### Cómo funciona el registro de una foto

**No existe un «no se pudo guardar».** La foto se toma desde la app y **siempre** se guarda en el
almacenamiento del teléfono, haya red o no. Subirla es un paso posterior e independiente.

```
1. El capataz toma la foto desde la app
        ↓
2. Se guarda en el almacenamiento del teléfono   ← SIEMPRE, con o sin red
   y se marca con un flag:  subida_a_la_nube = NO
        ↓
3. Cuando hay conexión, la app revisa los flags
        ↓
   ¿subida_a_la_nube = NO?
        └── Busca la foto en el dispositivo y la sube
            Al confirmarse:  subida_a_la_nube = SÍ
```

**Lo que hace que esto funcione es el flag.** No es una cola frágil en memoria ni un borrador que
alguien deba recuperar: es una marca persistente por foto. Si la app se cierra, si el teléfono se
apaga, si la subida falla a medias — **la foto sigue en el dispositivo con su flag en NO**, y el
siguiente intento la encuentra.

**Para el capataz no hay dos modos.** Toma la foto y sigue trabajando. Nunca ve un error de red,
nunca decide reintentar, nunca distingue entre estar conectado o no.

> **Por qué esto es de negocio y no un detalle técnico.** Si al capataz le apareciera un «no se
> pudo guardar», el registro se pierde — vuelve a la oficina, lo cuenta de palabra, y **regresa el
> intermediario verbal que el proyecto quiere eliminar**. Es lo contrario de la herramienta
> «amable» que pidió Robert.

### El indicador de subida — garantía de fin de jornada

**La regla de negocio: nadie debe terminar su turno con fotos sin subir.** El flag de MOV-3 es
invisible por dentro; el indicador es cómo se hace visible.

| Estado | Cuándo | Qué significa |
|---|---|---|
| **Pendiente** (por defecto) | Desde que se toma la primera foto | Hay imágenes en el teléfono que aún no están en la nube |
| **Verde** | Cuando todas se subieron | Se puede cerrar el día tranquilo |

**El estado por defecto es «pendiente», no «todo bien».** Apenas se toma una foto, el indicador se
enciende y **no se apaga hasta que la última llegó a la nube**. Eso invierte la carga: el capataz
no tiene que acordarse de comprobar nada — si el indicador no está verde, algo falta.

> **Por qué importa.** El sistema no puede obligar a nadie a tener señal, pero **sí puede hacer
> imposible irse sin saberlo**. Un indicador que solo avisa cuando hay un problema se ignora; uno
> que arranca en rojo y hay que «ganarse» el verde, se mira.

**Falta de espacio:** si el teléfono no tiene dónde guardar la foto, la app **muestra un mensaje**
y ya. No se gestiona el almacenamiento, no se borran fotos viejas, no se comprime nada.

### Tres cosas que condicionan el diseño

1. **«Un poquito amable».** Palabra textual de Robert. Son personas con **30-40 años de oficio**,
   no usuarios de software. Si la app tiene fricción, no la usan y volvemos al Excel.
2. **Solo 3 capataces la usarían.** No es una app para 25 jardineros: es para quienes reportan.
3. **Guardar y subir son pasos distintos**, y solo el primero es inmediato (arriba).

### Recomendación

**Móvil no es un módulo — es un canal.** Meterlo como «M9 App Móvil» rompería el catálogo, porque
no son requisitos nuevos: son **los mismos requisitos accedidos desde otro dispositivo**.

Se trata como **atributo de cada requisito** (la columna «¿Móvil?» de la tabla de arriba), con
estos requisitos propios del canal:

| ID | Requisito del canal móvil | Prioridad |
|---|---|---|
| **MOV-1** | **Captura de foto con GPS desde la app** | **Alta** |
| **MOV-2** | **La foto se guarda en el dispositivo con o sin red** | **Alta** |
| **MOV-3** | **Flag de «subida a la nube» por cada foto** | **Alta** |
| **MOV-4** | **Al reconectar, subir las que tengan el flag en NO** | **Alta** |
| **MOV-5** | **Indicador de pendientes: por defecto encendido, verde al subir todo** | **Alta** |
| **MOV-6** | **Mensaje cuando no hay espacio en el dispositivo** | Media |
| **MOV-7** | **Registro de la actividad (datos, no solo foto) sin conexión** | Media |

**MOV-5 subió a Alta.** No es información pasiva: es **la garantía de que nadie deja el trabajo con
fotos sin subir**. Por eso arranca encendido y hay que llegar al verde.

**MOV-6 es deliberadamente mínimo.** Un mensaje y nada más: **no se gestiona el almacenamiento**,
no se borran fotos subidas, no se comprime. Decisión explícita del equipo.

**MOV-7 queda en Media a propósito:** la foto es lo urgente porque es lo que se pierde si no se
captura en el momento. Los datos del formulario se pueden completar después.

**Plataforma: Android.** Se asume que **la app estará instalada**. Los datos móviles no se
consideran un problema.

**Alcance recomendado: móvil para 3.3, 3.5 y 2.2**, con MOV-1 a MOV-7 como base del canal.

---

## Pendientes con el cliente

> La 3.ª entrevista ya ocurrió. Lo que sigue abierto se lleva a la **reunión con los tres
> capataces** y a la **reunión presencial** con el jefe de sección.

**Preguntas:**

1. **¿Cómo quiere ver la distribución del personal por actividad?** En la 1.ª entrevista Robert
   dijo que le interesa *«cómo está dispuesto el personal y cuántas personas se usan para
   desarrollar cada actividad»*. Hay que precisar si basta con **cuántas personas** o quiere saber
   **quiénes**, si lo necesita **en el momento** o **después**, y cuánto esfuerzo extra acepta
   pedirle al capataz.
2. **¿Acepta nuestras reglas de sección cubierta y sección regada?** (6.8, 7.2)
3. **¿Le sirve la propuesta de reportes?** (6.2, 6.3, 6.4)
4. **¿Confirma los plazos por urgencia** (24, 48 y 72 horas)? (5.6)
5. **¿Se mide el residuo de la poda mayor?** Si alguien reporta un volumen, cambia la decisión de
   no tener un módulo de residuos.
6. **¿El traslado de material recuperado** (grass, confitillo) es algo que quiere controlar?

**Material comprometido en la 3.ª entrevista:**

| Qué | Para qué |
|---|---|
| Formato de reserva de jardines | 1.12 (préstamos) |
| Encabezados de la matriz de incidencias | 5.7 |
| Formato del informe del tercero | Fase futura (seguimiento de tercerizados) |
| Shape y lista de jardines, con los que se prestan | 1.12 y fase futura (jardines) |
| Lista de herramientas | 3.12 (ficha técnica de poda) |
| **Altura estimada** del levantamiento, si la ingeniera la comparte | 2.2 (clase de altura) |
