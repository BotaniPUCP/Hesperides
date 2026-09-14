# Catálogo de requisitos

> **Actualizado tras la 2.ª entrevista.** Esta versión revisa la lista preparada después de esa
> reunión, contrastándola con lo que el cliente dijo y con el Excel operativo.
>
> **Leyenda de cambios:** 🆕 nuevo · ⬆️ sube prioridad · ⬇️ baja prioridad.
>
> **Columna «¿Se puede?»** — si tenemos información suficiente para construirlo hoy:
> **✅ Sí** · **🔶 Parcial** (se puede empezar, falta un dato para terminarlo) ·
> **🔒 No** (bloqueado hasta que llegue algo del cliente).
>
> **Prioridad** es importancia para el cliente, **no** orden de construcción. Un requisito de
> prioridad Alta puede estar bloqueado y no poder empezarse.

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

> **Por qué separarlos.** Antes de esta revisión, el 44% de los requisitos era Alta —login y
> gestión de usuarios incluidos—. Cuando casi la mitad es prioritaria, la etiqueta deja de
> informar y, al recortar alcance, no hay criterio para decidir qué cae.

---

## Resumen de los cambios

| | Cantidad |
|---|---|
| Requisitos en la lista original | 45 |
| **Requisitos nuevos** | **20** |
| **Total** | **72** |

**Prioridades tras la recalibración contra los dolores:**

| Prioridad | Cantidad | |
|---|---|---|
| **Alta** | **22** (30%) | Antes eran 32 (44%) |
| Media | 31 | |
| Baja | 10 | |
| `HAB` habilitador | 9 | No compiten con los dolores |

**Distribución por módulo:** M1 11 · M2 12 · M3 11 · M4 10 · M5 10 · M6 10 · M7 5 · M8 3

El **vivero queda fuera de la fase 1** (decisión del equipo). Por eso M8 conserva su número
original de QR y no hizo falta renumerar nada.

### Qué se puede construir hoy

| Estado | Cantidad | |
|---|---|---|
| **✅ Se puede** | **39** (54%) | Información suficiente |
| **🔶 Parcial** | **16** (22%) | Se puede empezar; falta un dato para cerrarlo |
| **🔒 Bloqueado** | **17** (24%) | Necesita algo del cliente |

**De los 20 requisitos Alta, 12 están listos y 8 no.** Esos 8 son los que conviene desatascar:

| | Requisito | Qué falta |
|---|---|---|
| 🔒 | **2.8** Integración con el mapa | Acceso al repositorio y saber de dónde lee |
| 🔒 | **4.3** Seguimiento del servicio tercerizado | Un reporte de cierre del proveedor |
| 🔒 | **4.6** Checklist de cumplimiento | El inventario de ~100 jardines (prometido) |
| 🔶 | **1.9** Cuadrillas y sectores | Los límites de los 3 sectores |
| 🔶 | **2.9** Código nuevo de arbolado | El criterio del código |
| 🔶 | **4.5** Frecuencia pactada vs. real | Si las frecuencias están en el contrato |
| 🔶 | **6.8** Cobertura mensual | Qué cuenta como «zona cubierta» |
| 🔶 | **7.2** Cobertura de riego | Qué cuenta como «zona regada» |

> **Un patrón:** los tres bloqueos duros son de **M4 (tercerizados)** y del **mapa**. El trabajo
> del personal estable —M3, M7— está casi todo en verde, porque de eso sí tenemos datos.

### Qué desbloquea más cosas

| Lo que falta | Desbloquea |
|---|---|
| **Acceso al repositorio del mapa** | 2.8 — y decide 2.1 y 6.9 |
| **Inventario de especies** | 1.5 · 2.11 · 8.2 |
| **Los shapes** (sectores, jardines, cuarteles) | 1.6 · 1.9 · 2.5 · 4.6 · 7.3 |
| **Un contrato + un reporte de proveedor** | 4.1 · 4.3 · 4.5 · 4.9 |
| **Los formatos de reporte** | 6.2 · 6.3 · 6.4 |
| **El «Excel forestal»** | 2.3 |
| **La matriz de incidencia** | 5.7 |

**Los shapes son el mayor multiplicador**: desbloquean cinco requisitos, dos de ellos Alta.

### Cada dolor tiene requisitos Alta que lo atacan

| Dolor | Requisitos Alta |
|---|---|
| **D1** Información dispersa y manual | 2.1 · 2.8 · 3.4 · 3.7 · 6.1 |
| **D2** Tercerizado opaco | 4.3 · 4.5 · 4.6 · 6.10 |
| **D3** No hay catastro | 2.2 · 2.9 · 2.12 |
| **D4** Reporte verbal con intermediario | 3.1 · 3.3 · 3.5 |
| **D5** Cuesta demostrar cobertura | 1.9 · 4.5 · 6.1 · 6.8 · 6.10 · 7.1 · 7.2 |
| **D6** No se puede equilibrar el mantenimiento | 2.1 · 3.4 · 6.9 |
| **D7** Procesos sin formalizar | 1.9 · 3.1 · 3.7 · 5.1 · 5.3 |

**Ningún dolor quedó sin cobertura.** El más atendido es D5 (cobertura), que es coherente: es la
métrica con la que Robert rinde cuentas a OSG.

### Qué cambió en la recalibración

**Subieron a Alta** — atacaban un dolor central y estaban infravalorados:

| Requisito | Por qué |
|---|---|
| **3.4** Marcado de zona en mapa | Es lo que **automatiza el trabajo manual de Carolina** (D1) |
| **4.5** Frecuencia pactada vs. real | La forma concreta de controlar al tercero (D2) |
| **6.10** Cumplimiento de frecuencias | Métrica que Robert ya reporta (D2, D5) |

**Bajaron de Alta** — no respondían a un dolor, o el proceso actual ya funciona:

| Requisito | Por qué |
|---|---|
| **4.1** Registro de contratos | Los gestiona **Logística**, no la sección |
| **4.4** Informe final del proveedor | Es lo que **ya reciben**; digitalizarlo no cambia el proceso |
| **6.2** Reporte operativo | **No hemos visto el formato**. Vuelve a Alta cuando llegue |
| **2.3** Ficha de elemento verde | Igual: falta el «Excel forestal» que define los campos |
| **3.2** Asignación de tareas | La orden verbal **funciona**; formalizarla no es el dolor |
| **3.6** Cierre y validación | El Excel tiene el **81% sin estado**: hoy no se usa |
| **3.9** Actividades largas | Real, pero no es un dolor declarado |
| **5.2** Asignación de incidencia | Regla simple por tamaño del árbol; ya funciona |
| **5.8** Códigos externos | Almacenar un código no resuelve un dolor por sí solo |
| **4.8** Orden de compra | Dato externo de referencia |

**Pasaron a `HAB`** — el cliente nunca los pidió, pero sin ellos nada funciona: 1.1 usuarios ·
1.2 roles · 1.3 login · 1.4, 1.5, 1.6, 1.10, 1.11 catálogos base · 5.7 tipos de incidencia.

**Los tres cambios de fondo respecto a la lista original:**

1. **Falta la gestión de cuadrillas.** Los 3 sectores fijos con sus capataces son la base del
   trabajo diario y del ciclo de riego, y no había ningún requisito que los cubriera (M1.9).
2. **Falta el ciclo de riego.** Robert lo llama **la métrica principal** de la sección. Entra
   como **M7**.
3. **Falta la integración con el mapa interactivo existente.** No parten de cero: Robert pidió
   *«una aplicación que pueda enlazarse a este insumo»* (2.8).

---

## M1 · Administración y Configuración

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 1.1 | Gestión de usuarios (CRUD) | `HAB` | — | ✅ | Ya especificado en SPEC-100 |
| 1.2 | Gestión de roles y permisos | `HAB` | — | ✅ | |
| 1.3 | Autenticación y login | `HAB` | — | ✅ | Ya implementado (SPEC-001) |
| 1.4 | Catálogo de tipos de intervención | `HAB` | — | ✅ | 9 clases → 45 tipos, del Excel. 2 clases sin tipos (P-10) |
| 1.5 | Catálogo de especies | `HAB` | — | 🔒 | Falta el **inventario de especies**. Prometido, no entregado |
| 1.6 | Catálogo de zonas del campus | `HAB` | — | 🔶 | Tenemos 74 lugares. Faltan los **3 sectores** y los ~100 jardines |
| 1.7 | Configuración de frecuencias de mantenimiento | Media | D2 | ✅ | Robert dio todas las frecuencias en la 2.ª entrevista |
| 1.8 | Parámetros generales del sistema | Baja | — | ✅ | |
| **1.9** | **Gestión de cuadrillas y asignación a sectores** | **Alta** | **D5 D7** | 🔶 | 🆕 Sabemos que son 3 sectores (9+9+7 personas). **Faltan los límites** |
| **1.10** | **Catálogo de insumos y materiales** | `HAB` | — | ✅ | 🆕 Lista extraída del Excel |
| **1.11** | **Catálogo de unidades de medida** | `HAB` | — | ✅ | 🆕 und · m · m² · m³ |

**Sobre 1.4 — la taxonomía es de dos niveles.** El Excel define **9 clases** (Habilitación,
Rehabilitación, Mantenimiento, Poda, Propagación, Riego, Manejo fitosanitario, Residuos,
Inspección) y **45 tipos** colgando de ellas. Dos clases están declaradas **sin tipos**:
Manejo fitosanitario e Inspección y monitoreo.

**Sobre 1.6 — «zonas/sectores» son cosas distintas.** Ver la nota de M2.5.

**Sobre 1.7 — las frecuencias no son fijas.** Césped 30-45 días *según estación*; fitosanitario
4 al año *mínimo, más si el clima lo exige*; poda mayor 1 al año. En 2026, un «verano eterno»
obligó a cortar más seguido. **El sistema no puede asumir periodicidad constante.**

---

## M2 · Catastro Verde

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 2.1 | Mapa interactivo del campus | Media ⬇️ | D1 D6 | 🔶 | ⬇️ **Ya existe el suyo.** Depende de C4: ¿mapa propio o solo alimentamos el suyo? |
| 2.2 | Registro de elementos verdes en mapa | **Alta** | D3 | ✅ | |
| 2.3 | Ficha de cada elemento verde | Media | D3 | 🔒 | Falta el **«Excel forestal»** que define los campos |
| 2.4 | Filtros y búsqueda en mapa | Media | D6 | ✅ | |
| 2.5 | Carga de capas/sectores del campus | Media | D1 | 🔒 | Faltan los **shapes**: sectores, jardines, cuarteles |
| 2.6 | Registro de campos deportivos | Baja | D3 | ✅ | |
| 2.7 | Historial por elemento | Media | D7 | ✅ | |
| **2.8** | **Integración con el mapa interactivo existente** | **Alta** | **D1** | 🔒 | 🆕 **El requisito clave.** Falta acceso al repositorio y saber de dónde lee |
| **2.9** | **Código de identificación nuevo para arbolado** | **Alta** | D3 | 🔶 | 🆕 Sabemos que hay que recodificar. **Falta el criterio** del código |
| **2.10** | **Conservar el código heredado como referencia** | **Media** | D3 | ✅ | 🆕 Sin índice único: hay códigos duplicados y reasignados |
| **2.11** | **Importar el inventario de especies sin coordenadas** | **Media** | D3 | 🔒 | 🆕 Falta el archivo |
| **2.12** | **Registro progresivo del catastro** | **Alta** | D3 | ✅ | 🆕 Debe funcionar con el catastro al 30% |

### Sobre 2.8 — la integración con el mapa que ya existe

El cliente **ya tiene un mapa funcionando**: `clluncor-lang.github.io/mapa-web-6`. Es **GitHub
Pages + Google Maps API**, en el repositorio personal de Carolina, y lo comparten las **tres
secciones de OSG**.

**Su interfaz ya tiene lo que nosotros habíamos planeado construir:**

| Lo que ya tiene | Requisito nuestro |
|---|---|
| Checkbox «Ver Mapa de Calor» | **6.9** — ya construido |
| Filtros de Mes, Clase, Tipo, Responsable | Parte de **2.4** y **6.6** |
| Buscador de facultad/lugar | Parte de **2.4** |
| Capas: Gestión, Zonas, Plan, Vivero | Parte de **2.5** |

> **El dolor no es la falta de mapa — es que Carolina lo alimenta a mano cada semana.**
> Robert pidió *«una aplicación que pueda enlazarse a este insumo»*, no uno nuevo.

**Por eso 2.1 y 6.9 bajaron de Alta a Media:** duplicar lo que ya funciona no resuelve ningún
dolor. Si el cliente decide seguir con su mapa, nuestro trabajo es **alimentarlo**; si decide
migrar al nuestro, vuelven a subir.

**Está bloqueado (🔒)** hasta tener acceso al repositorio y saber de dónde lee los datos. Las
preguntas concretas están en
[`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md).

### Sobre 2.5 — el campus tiene cuatro divisiones, no una

| División | Cuántas | ¿Viva? | Para qué |
|---|---|---|---|
| **Sector de mantenimiento** | 3 | ✅ Sí | Organiza personal y **el ciclo de riego** |
| **Lugar / referente** | 74 | ✅ Sí | Lo que se anota al registrar una actividad |
| **Jardín** | ~100 | ✅ Sí | Unidad del corte de césped. Tiene código y shape |
| **Cuartel forestal** | 17 | ⚠️ En desuso | Solo para leer el inventario de especies antiguo |

Robert casi no usa los cuarteles: *«es más fácil referenciar Jardines de Ingeniería Civil que
cuartel 11»*. Usa **referentes** — edificios, facultades, vías, jardines emblemáticos.

---

## M3 · Intervenciones — Personal Estable

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 3.1 | Registro de actividad diaria | **Alta** | D4 D7 | ✅ | Conocemos el formato: 283 registros analizados |
| 3.2 | Asignación de tareas a personal | Media | D7 | ✅ | Hoy la orden es verbal y funciona |
| 3.3 | Registro de evidencia fotográfica | **Alta** | D4 | ✅ | 218 de 280 filas tienen foto |
| 3.4 | Marcado de zona intervenida en mapa | **Alta** | **D1 D6** | ✅ | Automatiza el trabajo manual de Carolina |
| 3.5 | Registro de insumos y materiales | **Alta** | **D4** | ✅ | Pedido textual de Robert. Ver nota |
| 3.6 | Cierre y validación de actividad | Media | D7 | 🔶 | Sabemos que hoy no se usa (81% sin estado). **Falta quién valida** |
| 3.7 | Vista de actividades del día/semana | **Alta** | D1 D7 | ✅ | |
| 3.8 | Registro de actividades diversas | Media | D7 | ✅ | Las 9 clases completas |
| **3.9** | **Actividades de larga duración con avances parciales** | **Media** | D7 | ✅ | 🆕 Confirmado en la 2.ª entrevista (ejemplo de 2 meses) |
| **3.10** | **Registro de una actividad sobre varias zonas** | **Media** | D6 | ✅ | 🆕 Hay casos reales en el Excel |
| **3.11** | **Cantidad pedida vs. ejecutada** | **Media** | D2 | ✅ | 🆕 Robert explicó cuándo aplica: solo poda a demanda |

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

---

## M4 · Contratos y Servicios Tercerizados

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 4.1 | Registro de contratos/servicios | Media | D2 | 🔒 | **No hemos visto un contrato tipo** |
| 4.2 | Registro de proveedor | Media | D2 | 🔶 | Sabemos que son 2 empresas relacionadas. Faltan datos |
| 4.3 | Seguimiento de ejecución del servicio | **Alta** | **D2** | 🔒 | Falta ver un **reporte de cierre** del proveedor |
| 4.4 | Carga de informe final del proveedor | Media | D2 | 🔶 | Robert los está compilando |
| 4.5 | Comparativo frecuencia pactada vs. real | **Alta** | **D2 D5** | 🔶 | Tenemos las frecuencias reales. **Falta si están en contrato** |
| 4.6 | Checklist de cumplimiento por servicio | **Alta** | **D2** | 🔒 | Falta el **inventario de ~100 jardines**. Prometido |
| 4.7 | Calendario de servicios programados | Media | D2 | ✅ | Frecuencias conocidas |
| **4.8** | **Registro de la orden de compra** | **Baja** | D2 | 🔶 | 🆕 Sabemos el flujo; falta el formato del documento |
| **4.9** | **Conformidad del servicio** | **Media** | D2 | 🔶 | 🆕 Falta saber qué revisa antes de aprobar |
| **4.10** | **Rendimiento del proveedor** | **Baja** | D2 | 🔒 | 🆕 **El proveedor no entrega ese dato hoy** |

**Sobre 4.6 — el checklist ya existe en papel.** Es el **inventario de ~100 jardines** que se
marcan durante el corte de césped. Robert prometió compartir los shapes. Sin esa lista, este
requisito no se puede construir.

**Sobre 4.10 — es el dolor declarado, pero no hay dato.** Robert quiere «transparentar» el
rendimiento del tercero (le llama la atención que poden 10-15 árboles/día cuando una cuadrilla
meticulosa hace 1-2). **Pero el proveedor hoy no entrega ese dato.** Construir la pantalla antes
de que exista el acuerdo sería hacer una tabla que nadie puede llenar — de ahí la prioridad Baja
pese a ser un dolor real.

---

## M5 · Gestión de Incidencias

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 5.1 | Registro de incidencia | **Alta** | D7 | ✅ | |
| 5.2 | Asignación de incidencia | Media | D7 | ✅ | Regla clara: <5 m estable, >5 m tercero |
| 5.3 | Seguimiento de estado | **Alta** | D7 | ✅ | Tiempos conocidos: 3-5 días vs. +1 semana |
| 5.4 | Vinculación con el catastro | Media | D3 D7 | ✅ | |
| 5.5 | Historial de incidencias | Media | D7 | ✅ | |
| 5.6 | Notificaciones de incidencias urgentes | Media | D7 | 🔶 | **Falta si hay tiempos de respuesta comprometidos** |
| 5.7 | Catálogo de tipos de incidencia | `HAB` | — | 🔒 | Falta la **«matriz de incidencia»** |
| **5.8** | **Códigos de sistemas externos (OSG y Centuria)** | **Media** | D1 | ✅ | 🆕 Solo se almacenan y muestran, nunca se generan |
| **5.9** | **Distinguir hallazgo de mantenimiento rutinario** | **Media** | D7 | ✅ | 🆕 El Excel ya lo distingue |
| **5.10** | **Avisar a la unidad solicitante al cerrar** | **Media** | D7 | 🔶 | 🆕 Falta saber **por qué canal** avisan hoy |

### Sobre 5.8 — hay dos sistemas de códigos, no uno

| Código | Origen | Qué tipo de atención |
|---|---|---|
| **`OSG-####`** | Matriz de incidentes de la **Sección de Supervisión de Campus** | Atenciones menores, casi siempre de **transitabilidad**. Se resuelven en minutos u horas |
| **Centuria** | **Plataforma de la universidad** — cualquier unidad puede pedir | Pedidos a demanda, sobre todo **arbolado interior** de edificios |

El sistema **almacena y muestra** estos códigos; **nunca los genera**. Son propiedad de otros
sistemas.

---

## M6 · Reportes y Analítica

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 6.1 | Dashboard general | **Alta** | D1 D5 | ✅ | Con las métricas de 6.8 y 6.10 |
| 6.2 | Reporte básico (operativo) | Media | D1 | 🔒 | **No hemos visto el formato** |
| 6.3 | Reporte intermedio (coordinación) | Media | D1 | 🔒 | Ídem |
| 6.4 | Reporte avanzado (dirección) | Media | D1 | 🔒 | Falta el **documento de gestión** que entrega a OSG |
| 6.5 | Exportación de reportes (PDF/Excel) | Media | D1 | ✅ | |
| 6.6 | Filtros por zona, período, tipo | Media | D6 | ✅ | |
| 6.7 | Indicadores de rendimiento | Baja | D2 | 🔒 | Depende de 4.10 |
| **6.8** | **Cobertura mensual del 100% de las 15.6 ha** | **Alta** | **D5** | 🔶 | 🆕 Meta clara. **Falta qué cuenta como zona cubierta** |
| **6.9** | **Mapa de calor de intervenciones por zona** | Media ⬇️ | **D6** | 🔶 | 🆕 ⬇️ **Ya existe en su mapa.** Depende de C4 |
| **6.10** | **Cumplimiento de frecuencias por servicio** | **Alta** | **D2 D5** | ✅ | 🆕 Frecuencias conocidas |

### Sobre 6.8 y 6.9 — son las métricas que el cliente ya usa

Robert expresa sus metas como **cobertura**, no como promedios:

> «Nosotros al mes tenemos que llegar al 100% de esa cobertura, con su riego, su mantenimiento, su
> perfilado, su reemplazo de plantas si lo requieren.»

Y sobre el mapa de calor, describió exactamente para qué usa el mapa interactivo:

> «Se puede mostrar de forma rápida qué lugares del campus están con mayor número de intervenciones
> o menor número de intervenciones… y algunos donde se le puede programar mayores atenciones, para
> tener un equilibrio de mantenimiento regular.»

**6.9 no es un extra de analítica: es la función principal de la herramienta que ya usan.**

---

## M7 · Riego 🆕

> **Módulo confirmado por el equipo.** Es el proceso **mejor estructurado** del cliente: tiene
> turnos, solapamientos, ventana horaria y una métrica de cobertura. Robert lo llama **la métrica
> principal** de la sección.
>
> **Por qué módulo propio y no una actividad de M3:** el riego es la única clase de actividad que
> tiene **planificación previa** (un turno semanal por sector), **una meta de cobertura** (100% en
> 15 días) y **una ventana horaria**. Las demás actividades se registran cuando ocurren; el riego
> se **programa y se verifica contra un plan**. Esa diferencia justifica el módulo.

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| **7.1** | **Registro del turno de riego por sector** | **Alta** | **D5** | ✅ | Ciclo bien explicado en la 2.ª entrevista |
| **7.2** | **Cobertura del campus en la ventana de 15 días** | **Alta** | **D5** | 🔶 | **Falta qué cuenta como «zona regada»** |
| **7.3** | **Zonas que requieren más de una pasada** | **Media** | D5 | 🔒 | **Falta la lista** de esas zonas |
| **7.4** | **Control de la ventana horaria** | **Baja** | — | ✅ | 6:30-7:00 a 11:30 |
| **7.5** | **Registro de horas de bomba** | **Baja** | — | ✅ | 5.5 h verano · 3 h invierno |

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

> **Nota de alcance:** hay proyectos de Infraestructura para pasar a **riego automatizado**
> (electroválvulas, pop-up) en 1-3 años. Eso está **fuera de nuestro alcance**, pero conviene no
> diseñar nada que lo impida.

---

## M8 · Información Pública (QR)

> Conserva su número original: al quedar el vivero fuera de la fase 1, no hizo falta renumerar.

| ID | Requisito | Prioridad | Dolor | ¿Se puede? | Nota |
|---|---|---|---|---|---|
| 8.1 | Generación de código QR por elemento | Baja | D3 | 🔶 | Depende de 2.9 (el código nuevo) |
| 8.2 | Página pública de ficha de especie | Baja | — | 🔒 | Falta el inventario de especies |
| 8.3 | Diseño de etiqueta imprimible | Baja | D3 | 🔒 | **Falta si hay presupuesto** para etiquetas físicas |

**Sobre 8.3 — hay un antecedente que conviene tener presente.** Las placas de aluminio del
inventario antiguo fracasaron: se perdieron, quedaron en ejemplares muertos y **se reasignaron a
otras plantas** («un código de un eucalipto se lo puso a una palmera»). Cualquier etiqueta física
nueva hereda ese riesgo.

---

## Fuera de la fase 1

Lo que **existe en el dominio pero no se construye ahora**. Se documenta para que nadie lo
reintroduzca por descuido ni lo dé por olvidado.

### Vivero — decisión del equipo

**No entra en la fase 1.** Robert lo mencionó ligado al mantenimiento —para rehabilitar un jardín
se saca stock de plantas del vivero— pero queda fuera del alcance.

Lo que quedaría para una fase posterior: stock de plantas disponibles, registro de propagación
(por división de matas y esquejes) y salida de plantas hacia una intervención.

> **Lo que sí hay que respetar ahora:** la clase de actividad **«Propagación y plantación»
> permanece** en la taxonomía de M1.4, con sus 10 tipos. El personal estable registra propagación
> **en campo**, no solo en vivero — de hecho es la segunda clase más usada del Excel, con 36 de
> los 171 registros. Dejar el vivero fuera **no** significa quitar esos tipos de actividad.
>
> Si una intervención consume plantas, se registra como insumo (M3.5), sin rastrear de dónde
> salieron.

### Zoocriadero

Fuera. Es **fauna**, no flora: venados, tortugas motelo, pavos reales y una alpaca, con reporte
anual al Ente Técnico Forestal. Dominio y normativa distintos.

### Riego automatizado

Fuera, pero por otra razón: **no depende de nosotros**. Infraestructura tiene proyectos para pasar
a electroválvulas y pop-up en 1-3 años. Conviene no diseñar nada que lo impida, pero el sistema
modela el riego manual actual (M7).

### Locales periféricos

Fuera del mínimo. Son solo dos —Codesido (Pueblo Libre) y Chorrillos— con atención **trimestral**,
4 veces al año. Robert fue claro: *«la mayor dinámica de atención y recursos es el campus»*.

### Rendimiento del proveedor

En el catálogo como 4.10 con prioridad Baja, no fuera del todo — pero conviene recordar por qué no
es Alta pese a ser un dolor real: **el proveedor hoy no entrega ese dato**.

---

## Lo que bloquea qué

Requisitos de prioridad Alta que **no se pueden empezar** hasta que llegue información:

| Requisito | Qué falta | Estado |
|---|---|---|
| 2.3 Ficha de elemento verde | El «Excel forestal» con los campos | ❓ Sin confirmar |
| 2.8 Integración con el mapa | Verlo funcionando | 🔄 No cargó en la reunión |
| 4.6 Checklist de servicio | El inventario de ~100 jardines | ✅ Prometido |
| 6.2 Reporte operativo | El formato real que entrega a OSG | ❓ Sin confirmar |
| 1.4 (parcial) Tipos de fitosanitario | Los tipos de esa clase | ❓ Sin confirmar |

**Prometidos en la 2.ª entrevista:** inventario de especies · shapes de los ~100 jardines · capas
de cuarteles · reportes de tercerizados (los está compilando).

**No se compartirá:** la matriz de control de incidentes — es sensible y se maneja con la
jefatura. Robert puede comentarla, no entregarla.

---

## Decisiones de alcance tomadas

| Decisión | Resultado |
|---|---|
| **¿El vivero entra en la fase 1?** | **No.** Decisión del equipo. La clase de actividad «Propagación y plantación» **sí permanece** — el personal estable propaga en campo, no solo en vivero |
| **¿Renumerar el módulo de QR?** | **No hizo falta.** Al salir el vivero, QR conserva su M8 original |
| **¿Riego es módulo propio?** | **Sí, M7.** Es la única actividad que se **planifica y verifica contra un plan**, no solo se registra |
| **¿Módulo de residuos vegetales?** | **No.** 10 registros de un solo tipo; los otros 3 tipos nunca se usaron. Queda cubierto dentro de M3 |
| **¿App móvil?** | **Sí, como canal (no módulo)**, para 3.3, 3.5 y 2.2. **Android**, app instalada, datos no son problema. La foto se guarda siempre en el teléfono con un flag `subida_a_la_nube`; al reconectar la app sube las pendientes. Nunca hay un «no se pudo guardar» |
| **¿Cómo se garantiza que las fotos suban?** | **Indicador de pendientes encendido por defecto**, verde solo cuando todas están en la nube. Nadie debe terminar el turno en rojo |
| **¿Gestión de almacenamiento?** | **No.** Si no hay espacio, un mensaje y nada más |
| **¿Mapa propio o integración?** | **Integración** con el mapa que ya usan (2.8). Lo que falta saber está en [`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md) |

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

## Para la 3.ª entrevista

Preguntas que salieron de este análisis:

1. **¿Se mide el residuo de la poda mayor?** Son 215-230 árboles al año. Si alguien reporta un
   volumen, la conclusión sobre el módulo de residuos cambia.
2. **¿El traslado de material recuperado** (grass, confitillo entre zonas) **es algo que quiere
   controlar**, o es una anotación informal?
3. **¿Quién valida que el trabajo del día quedó registrado?** Hoy Robert, Carolina y Fabiola
   vuelcan al Excel. Con la app registrando en campo, ese control cambia de manos.
