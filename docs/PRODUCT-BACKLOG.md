# Product Backlog — Hesperides (Versión 7 Consolidada BDD)

> **Estado del Documento:** Consolidado y Auditado al **22 de octubre de 2026**.
> **Estándar de Redacción:** Formato formal **BDD / Gherkin** según directiva del Jefe de Práctica (JP).
> **Sincronización:** 100% alineado con la rama `feat/inventario-verde`, el Catálogo de Requisitos del 21-oct-2026 y el libro de cálculo [`HESPERIDES_Product_Backlog_v7_Consolidado_BDD.xlsx`](HESPERIDES_Product_Backlog_v7_Consolidado_BDD.xlsx).
> **Fuente de Verdad del Dominio:** [`catalogo-requisitos.md`](dominio/catalogo-requisitos.md) (82 requisitos trazables).
> **Horizonte del MVP:** Primera versión operativa integral el **26 de noviembre de 2026**.

---

## 1. Dashboard Ejecutivo y Métricas del Backlog

### Métricas Clave
- **Total Historias Activas:** 61 historias de usuario priorizadas en el MVP (todas bajo sintaxis `COMO... QUIERO... PARA...`).
- **Puntos de Historia Activos:** 267 Story Points (estimación Fibonacci).
- **Criterios de Aceptación BDD:** Estructurados en escenarios con cláusulas `DADO QUE`, `CUANDO`, `ENTONCES`, `Y`, `PERO`, `SOLO SI`, etc.
- **Historias en Espera:** 3 historias (15 pts: `W-11`, `W-12`, `W-13`) con propuesta técnica lista pendiente de confirmación formal.
- **Historias en Fase Futura:** 8 historias movidas fuera del MVP de forma justificada.
- **Módulos Cubiertos:** 9 módulos funcionales (M1 a M8, incorporando formalmente el nuevo **M9: Lugares y Perspectivas del Campus**).
- **Requisitos Trazados:** 82 requisitos del catálogo oficial mapeados con cobertura del 100%.

### Planificación y Capacidad por Sprint
| Sprint | Fechas Operativas | Foco Estratégico | Historias | Story Points |
|:---:|:---:|---|:---:|:---:|
| **S0** | Hasta 18 sep | Arquitectura, auth, catálogos base, modelo de datos PostGIS *(Cerrado)* | — | — |
| **S1** | 19 sep — 6 oct | Habilitadores, gestión de usuarios, registro base de labores | 6 | 32 pts |
| **S2** | 7 oct — 24 oct | Catastro v32, inventario verde, lugares y perspectivas (M9), insumos | 17 | 80 pts |
| **S3** | 25 oct — 11 nov | Riego, incidencias, historial de intervenciones de la ficha, eventos | 19 | 86 pts |
| **S4** | 12 nov — 26 nov | Reportes ejecutivos, tablero analítico, QR público, QA y despliegue | 19 | 69 pts |
| **Total Activo** | **19 sep — 26 nov** | **Ciclo completo de construcción y entrega del MVP** | **61** | **267 pts** |

---

## 2. Marco Metodológico, Roles y Glosario BDD del JP

### Glosario Oficial de Términos BDD / Gherkin (Directiva del JP)

| Término BDD / Clave | ¿Cuándo utilizarlo— (Directiva Oficial del JP) | Ejemplo de Sintaxis en Hesperides |
|:---:|---|---|
| **`COMO`** | Para identificar el rol o tipo de usuario que necesita una funcionalidad. | `COMO [ADMIN | COORDINADOR | SUPERVISOR]` |
| **`QUIERO`** | Para describir la funcionalidad o acción que necesita el usuario. | `QUIERO registrar la evaluación fitosanitaria VTA...` |
| **`PARA`** | Para explicar el propósito o beneficio de la funcionalidad. | `PARA diagnosticar y prevenir riesgos de caída de ramas...` |
| **`DADO QUE`** | Para establecer el contexto o las condiciones iniciales de un escenario. | `DADO QUE el especialista evalúa un ejemplar en campo` |
| **`CUANDO`** | Para indicar la acción o el evento que desencadena el comportamiento del sistema. | `CUANDO ingresa observaciones de daño en raíz, fuste y copa` |
| **`ENTONCES`** | Para especificar el resultado esperado después de una acción. | `ENTONCES el sistema calcula el nivel de riesgo y sugiere acción` |
| **`Y`** | Para añadir otra condición, acción o resultado relacionado. | `Y asocia la evaluación al historial del ejemplar` |
| **`PERO`** | Para introducir una condición o resultado que contrasta con lo anterior. | `PERO conserva el estado previo si la operación se cancela` |
| **`SI`** | Para expresar una condición que determina un comportamiento. | `SI la altura medida supera los 5 metros` |
| **`MIENTRAS`** | Para describir una condición que se mantiene durante un periodo o proceso. | `MIENTRAS el dispositivo permanezca fuera de línea en campo` |
| **`EN CASO DE QUE`** | Para describir una situación específica que puede producirse durante el uso. | `EN CASO DE QUE falle el envío SMTP de credenciales` |
| **`DE LO CONTRARIO`** | Para indicar qué sucede cuando no se cumple una condición. | `DE LO CONTRARIO bloquea el guardado e indica el error` |
| **`SOLO SI`** | Para establecer una condición necesaria para permitir una acción. | `SOLO SI las coordenadas caen dentro del Campus Pando` |
| **`EXCEPTO CUANDO`** | Para indicar una excepción a una regla general. | `EXCEPTO CUANDO un SUPERVISOR certifique la excepción en campo` |
| **`HASTA QUE`** | Para establecer el límite o la condición para finalizar un proceso. | `HASTA QUE todos los registros locales se repliquen en el servidor` |
| **`CUANDO NO`** | Para describir el comportamiento cuando una acción o evento no se produce. | `CUANDO NO cuenta con los permisos requeridos` |
| **`ANTECEDENTES (Background)`** | Para definir condiciones comunes que se aplican a varios escenarios. | `ANTECEDENTES: DADO QUE el usuario tiene sesión activa en el sistema...` |
| **`ESCENARIO (Scenario)`** | Para describir un caso concreto de comportamiento que se quiere verificar. | `ESCENARIO: Registro exitoso de ejemplar con coordenadas GPS` |
| **`ESQUEMA DEL ESCENARIO (Scenario Outline)`** | Para ejecutar un mismo escenario con diferentes combinaciones de datos. | `ESQUEMA DEL ESCENARIO: Clasificación de altura según rango medido` |
| **`EJEMPLOS (Examples)`** | Para proporcionar los datos de prueba que utilizará un esquema de escenario. | `EJEMPLOS: | altura | rango | ...` |
| **`CARACTERÍSTICA (Feature)`** | Para agrupar escenarios relacionados con una funcionalidad del sistema. | `CARACTERÍSTICA: Catastro e Inventario Verde` |
| **`REGLA (Rule)`** | Para agrupar escenarios que verifican una regla de negocio específica. | `REGLA: La altura estimada nunca reemplaza la medición real en podas` |

### Roles RBAC (Catálogo ROLE — SPEC-100)
| Rol | Usuario Destino en el Campus | Cuentas MVP | Alcance Operativo |
|:---:|---|:---:|---|
| `ADMIN` | Jefe de Sección de Áreas Verdes | 1 cuenta | Control total: configuración, catálogos, personal, auditoría y reportes. Superconjunto de permisos de Coordinador. |
| `COORDINADOR` | Jefatura operativa de sección | Heredado | Consulta consolidada de catastro, programación, reportes e indicadores ejecutivos. |
| `SUPERVISOR` | Capataces / Jefes de Grupo (3 sectores) | 3 cuentas | Registro móvil offline-first de intervenciones, consulta de catastro y atención de incidencias en campo. |
| `OPERARIO` | Jardineros y personal de cuadrilla | 0 cuentas | Conservado por formalidad y trazabilidad de asignación; no opera el sistema informático en esta fase. |

### Escala de Estimación Fibonacci
| Puntos | Complejidad Técnica | Criterio de Aplicación |
|:---:|---|---|
| **1** | Trivial | Ajuste menor de campo, constante, etiqueta o catálogo semilla estático. |
| **2** | Baja | CRUD simple sobre tabla existente sin lógica de negocio ni validaciones complejas. |
| **3** | Media | Pantalla con estado, validaciones de negocio o consultas relacionales estándar. |
| **4 / 5** | Media-Alta | Entidad completa con reglas propias, componentes interactivos o integración frontend-backend. |
| **8** | Alta | Algoritmos espaciales, mapas 3D/MapLibre, sincronización offline-first o migraciones masivas. |
| **13** | Muy Alta | Vertical con alta incertidumbre técnica (debe refinarse o subdividirse antes del sprint). |

---

## 3. Tabla Resumen del Backlog Activo (61 Historias)

| ID | Req. | Épica / Módulo | Actor | Historia de Usuario (COMO... QUIERO... PARA...) | Prioridad | Preparación | Avance (%) | Sprint | Pts |
|:---:|:---:|---|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **A-01** | REQ 1.1 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | dar de alta, editar, desactivar y reactivar cuentas del personal | HAB | Listo ✅ | **100%** | S1 | 5 |
| **A-02** | REQ 1.2 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | que cada rol tenga un alcance definido sobre cada operación | HAB | Listo ✅ | **100%** | S1 | 3 |
| **A-03** | REQ 1.4 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | administrar la taxonomía de actividades en dos niveles | HAB | Parcial 🔶 | **80%** | S1 | 5 |
| **A-04** | REQ 1.6 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | administrar la jerarquía territorial del campus | HAB | Parcial 🔶 | **60%** | S1 | 8 |
| **A-05** | REQ 1.10 / REQ 1.11 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | administrar la lista de insumos y sus unidades de medida | HAB | Listo ✅ | **70%** | S1 | 3 |
| **A-06** | REQ 1.7 | Épica A · Habilitadores y configuración (M1) | `COORDINADOR` | configurar cada cuánto debe repetirse cada actividad y con qué... | Media | Listo ✅ | **60%** | S3 | 8 |
| **A-07** | REQ 1.9 | Épica A · Habilitadores y configuración (M1) | `COORDINADOR` | definir las cuadrillas y asignar cada una a su sector | Alta | Parcial 🔶 | **30%** | S2 | 5 |
| **A-08** | REQ 1.8 | Épica A · Habilitadores y configuración (M1) | `ADMIN` | configurar los parámetros del sistema sin tocar código | Baja | Listo ✅ | **60%** | S3 | 2 |
| **A-09** | REQ 1.12 | Épica A · Habilitadores y configuración (M1) | `COORDINADOR` | registrar los periodos que afectan al trabajo de campo | Media | Listo ✅ | **40%** | S3 | 5 |
| **B-01** | REQ 3.1 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | registrar la actividad ejecutada por mi cuadrilla | Alta | Listo ✅ | **70%** | S1 | 8 |
| **B-02** | REQ 3.3 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | tomar fotos del trabajo de mi cuadrilla desde el móvil, con o ... | Alta | Listo ✅ | **20%** | S2 | 8 |
| **B-03** | REQ 3.4 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | marcar en el mapa la zona donde intervine | Alta | Listo ✅ | **20%** | S2 | 8 |
| **B-04** | REQ 3.5 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | registrar lo que mi cuadrilla consumió en una intervención | Alta | Listo ✅ | **25%** | S2 | 5 |
| **B-05** | REQ 3.7 | Épica B · Intervenciones del personal estable (M3) | `COORDINADOR` | ver qué se hizo hoy y esta semana, por sector y por cuadrilla | Alta | Listo ✅ | **10%** | S2 | 5 |
| **B-06** | REQ 3.10 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | registrar una actividad que cubrió varios lugares a la vez | Media | Listo ✅ | **0%** | S3 | 5 |
| **B-07** | REQ 3.9 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | registrar avances parciales de una intervención que toma vario... | Media | Listo ✅ | **0%** | S3 | 5 |
| **B-08** | REQ 3.11 | Épica B · Intervenciones del personal estable (M3) | `COORDINADOR` | comparar lo que se pidió contra lo que realmente se usó en una... | Media | Listo ✅ | **0%** | S3 | 3 |
| **B-09** | REQ 3.2 | Épica B · Intervenciones del personal estable (M3) | `COORDINADOR` | asignar una tarea a una cuadrilla con fecha y prioridad | Media | Listo ✅ | **10%** | S4 | 3 |
| **B-10** | REQ 3.6 | Épica B · Intervenciones del personal estable (M3) | `COORDINADOR` | validar una actividad registrada por el capataz antes de que e... | Media | Listo ✅ | **0%** | S4 | 3 |
| **B-11** | REQ 3.12 | Épica B · Intervenciones del personal estable (M3) | `SUPERVISOR` | registrar la ficha técnica cuando la labor fue poda mayor o tala | Media | Listo ✅ | **10%** | S3 | 3 |
| **C-01** | REQ 2.2 | Épica C · Catastro verde (M2) | `SUPERVISOR` | capturar un árbol o elemento verde en campo con foto, especie ... | Alta | Listo ✅ | **60%** | S2 | 8 |
| **C-02** | REQ 2.12 | Épica C · Catastro verde (M2) | `COORDINADOR` | que el sistema funcione con el mapa base actual aunque el cens... | Alta | Listo ✅ | **80%** | S2 | 5 |
| **C-03** | REQ 2.9 | Épica C · Catastro verde (M2) | `COORDINADOR` | que cada ejemplar reciba un código único del sistema cuando se... | Alta | Listo ✅ | **100%** | S3 | 5 |
| **C-04** | REQ 2.10 | Épica C · Catastro verde (M2) | `COORDINADOR` | guardar el código antiguo junto al nuevo cuando exista | Media | Listo ✅ | **100%** | S3 | 2 |
| **C-05** | REQ 2.7 | Épica C · Catastro verde (M2) | `COORDINADOR` | ver todas las intervenciones que recibió un ejemplar desde que... | Media | Parcial 🔶 | **30%** | S3 | 3 |
| **C-06** | REQ 2.4 | Épica C · Catastro verde (M2) | `COORDINADOR` | filtrar el mapa por periodo, clase de actividad y tipo | Media | Listo ✅ | **70%** | S3 | 5 |
| **C-07** | REQ 2.6 | Épica C · Catastro verde (M2) | `COORDINADOR` | registrar las superficies deportivas y jardines botánicos como... | Baja | Listo ✅ | **80%** | S4 | 3 |
| **C-08** | REQ 2.3 | Épica C · Catastro verde (M2) | `COORDINADOR` | saber si la altura de un ejemplar viene de una medición real o... | Alta | Listo ✅ | **100%** | S2 | 5 |
| **C-09** | REQ 2.3 | Épica C · Catastro verde (M2) | `COORDINADOR` | que el sistema me pida verificar la altura en campo antes de p... | Alta | Listo ✅ | **100%** | S3 | 3 |
| **C-10** | REQ 2.13 | Épica C · Catastro verde (M2) | `COORDINADOR` | cargar el levantamiento de campo con datos reales de los árbol... | Alta | Listo ✅ | **100%** | S2 | 8 |
| **C-11** | REQ 2.3 | Épica C · Catastro verde (M2) | `COORDINADOR` | consultar la ficha de cada ejemplar con su información botánic... | Media | Parcial 🔶 | **60%** | S2 | 5 |
| **C-12** | REQ 2.14 | Épica C · Catastro verde (M2) | `COORDINADOR` | clasificar cada sección por su tipo de uso (jardín, cerco, xer... | Media | Listo ✅ | **90%** | S2 | 3 |
| **C-13** | REQ 1.5 / REQ 2.13 | Épica C · Catastro verde (M2) | `COORDINADOR` | registrar evaluaciones fitosanitarias basadas en el método Vis... | Media | Listo ✅ | **100%** | S2 | 3 |
| **C-14** | REQ 2.3 | Épica C · Catastro verde (M2) | `COORDINADOR` | visualizar un visor fotográfico multiejemplar con visor tipo l... | Alta | Listo ✅ | **100%** | S2 | 3 |
| **C-15** | REQ 2.15 | Épica C · Catastro verde (M2) | `COORDINADOR` | registrar y visualizar en el mapa la ubicación y estado de tac... | Baja | Listo ✅ | **80%** | S2 | 2 |
| **D-01** | REQ 7.1 | Épica D · Riego (M7) | `SUPERVISOR` | registrar el turno de riego de mi cuadrilla (horario, sector y... | Alta | Listo ✅ | **40%** | S3 | 8 |
| **D-02** | REQ 7.2 | Épica D · Riego (M7) | `COORDINADOR` | ver qué porcentaje del campus se regó en el mes y qué zonas ll... | Alta | Parcial 🔶 | **20%** | S3 | 8 |
| **D-03** | REQ 7.4 | Épica D · Riego (M7) | `COORDINADOR` | que el sistema conozca la ventana horaria de riego permitida | Baja | Listo ✅ | **10%** | S4 | 2 |
| **D-04** | REQ 7.5 | Épica D · Riego (M7) | `SUPERVISOR` | registrar las horas de bomba del pozo y el nivel del reservorio | Baja | Listo ✅ | **0%** | S4 | 2 |
| **E-01** | REQ 5.1 | Épica E · Incidencias (M5) | `SUPERVISOR` | registrar un problema detectado en campo con foto, tipo y urge... | Alta | Listo ✅ | **0%** | S3 | 5 |
| **E-02** | REQ 5.3 | Épica E · Incidencias (M5) | `COORDINADOR` | seguir una incidencia desde que se reporta hasta que se resuelve | Alta | Listo ✅ | **0%** | S3 | 5 |
| **E-03** | REQ 5.2 | Épica E · Incidencias (M5) | `COORDINADOR` | que el sistema proponga quién debe atender una incidencia segú... | Media | Listo ✅ | **0%** | S4 | 3 |
| **E-04** | REQ 5.8 | Épica E · Incidencias (M5) | `SUPERVISOR` | marcar que una incidencia llegó por Centuria u otro canal externo | Baja | Listo ✅ | **0%** | S4 | 1 |
| **E-05** | REQ 5.9 | Épica E · Incidencias (M5) | `COORDINADOR` | distinguir un hallazgo de una asignación cuando reviso el trabajo | Media | Listo ✅ | **0%** | S4 | 2 |
| **E-06** | REQ 5.4 | Épica E · Incidencias (M5) | `COORDINADOR` | ligar una incidencia al ejemplar o sección correspondiente | Media | Listo ✅ | **0%** | S4 | 3 |
| **E-07** | REQ 5.5 | Épica E · Incidencias (M5) | `COORDINADOR` | consultar las incidencias pasadas con filtros por zona, tipo y... | Media | Listo ✅ | **0%** | S4 | 2 |
| **E-08** | REQ 5.7 | Épica E · Incidencias (M5) | `ADMIN` | administrar los tipos de incidencia del catálogo | HAB | Listo ✅ | **0%** | S3 | 3 |
| **E-09** | REQ 5.11 | Épica E · Incidencias (M5) | `COORDINADOR` | que el sistema solo admita sábados para la programación de maq... | Media | Listo ✅ | **0%** | S3 | 3 |
| **E-10** | REQ 5.6 | Épica E · Incidencias (M5) | `COORDINADOR` | que el sistema me avise cuando una incidencia supera el plazo ... | Media | Listo ✅ | **0%** | S4 | 5 |
| **F-01** | REQ 6.1 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | un tablero con el estado del mes (cobertura, labores realizada... | Alta | Listo ✅ | **0%** | S4 | 8 |
| **F-02** | REQ 6.8 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | ver qué porcentaje del área verde total del campus recibió man... | Alta | Parcial 🔶 | **0%** | S4 | 8 |
| **F-03** | REQ 6.10 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | comparar la frecuencia pactada contra la real de cada labor | Alta | Listo ✅ | **0%** | S4 | 5 |
| **F-04** | REQ 6.6 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | filtrar cualquier reporte por zona, cuadrilla, tipo de labor y... | Media | Listo ✅ | **0%** | S4 | 3 |
| **F-05** | REQ 6.5 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | exportar un reporte a PDF y Excel con los filtros aplicados | Media | Listo ✅ | **0%** | S4 | 5 |
| **F-06** | REQ 6.9 | Épica F · Reportes y analítica (M6) | `COORDINADOR` | ver en el mapa qué zonas concentran más incidencias y cuáles m... | Media | Listo ✅ | **0%** | S4 | 5 |
| **G-02** | REQ 4.2 | Épica G · Servicios tercerizados (M4) | `ADMIN` | registrar las empresas contratadas para servicios de áreas verdes | Media | Listo ✅ | **50%** | S4 | 3 |
| **H-01** | REQ 8.1 / REQ 8.2 / REQ 8.3 | Épica H · Información pública (QR) (M8) | `COORDINADOR` | generar un código QR por ejemplar | Baja | Listo ✅ | **20%** | S4 | 3 |
| **L-01** | REQ 9.1 | Épica I · Lugares y perspectivas (M9) | `COORDINADOR` | disponer de un catálogo de lugares representativos del campus ... | Media | Listo ✅ | **90%** | S2 | 3 |
| **L-02** | REQ 9.2 | Épica I · Lugares y perspectivas (M9) | `COORDINADOR` | registrar y gestionar perspectivas visuales y puntos de vista ... | Media | Listo ✅ | **90%** | S2 | 3 |
| **L-03** | REQ 9.3 | Épica I · Lugares y perspectivas (M9) | `COORDINADOR` | filtrar y centrar automáticamente el visor de mapa 3D según el... | Media | Listo ✅ | **90%** | S2 | 3 |
| **L-04** | REQ 9.4 | Épica I · Lugares y perspectivas (M9) | `ADMIN` | mapear y migrar intervenciones y registros históricos previame... | Media | Parcial 🔶 | **60%** | S2 | 3 |

---

## 4. Detalle Completo de Historias de Usuario por Épica (Sintaxis BDD)

### Épica A · Habilitadores y configuración

#### `A-01` — REQ 1.1

> **COMO ADMIN QUIERO dar de alta, editar, desactivar y reactivar cuentas del personal PARA que el acceso al sistema refleje en todo momento quién trabaja hoy en el campus y con qué rol.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Listo ✅` | **Sprint:** `S1` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 1.1; SPEC-100; Curso: autenticación/autorización
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** Ya especificado en SPEC-100. Esta historia es su implementación.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Alta de cuenta de usuario y despacho de credenciales**
- **DADO QUE** el ADMIN se encuentra en el módulo de gestión de usuarios,
- **CUANDO** crea una cuenta ingresando nombre, apellido, correo institucional y rol asignado,
- **ENTONCES** el sistema genera la cuenta y envía las credenciales de acceso por correo
- **PERO** un ADMIN nunca puede escribir directamente la contraseña de una cuenta existente: solo regenerar y reenviar

**ESCENARIO: Desactivación y reactivación de sesiones de usuario**
- **DADO QUE** un usuario cuenta con una cuenta activa en el sistema,
- **CUANDO** el ADMIN desactiva la cuenta del usuario,
- **ENTONCES** el sistema revoca inmediatamente todas sus sesiones activas
- **Y** al reactivarla no restaura las sesiones previas ni regenera automáticamente la clave

**ESCENARIO: Visibilidad por cuadrilla y contingencia de entrega SMTP**
- **DADO QUE** un SUPERVISOR consulta la lista de cuentas del personal,
- **CUANDO** intenta consultar una ficha que no pertenece a su cuadrilla,
- **ENTONCES** el sistema devuelve un código 404 y no un código 403
- **Y** EN CASO DE QUE el envío SMTP falle, la cuenta queda en estado PENDING_DELIVERY y el ADMIN puede marcar la entrega manual

---

#### `A-02` — REQ 1.2

> **COMO ADMIN QUIERO que cada rol tenga un alcance definido sobre cada operación PARA que nadie vea ni modifique lo que no le corresponde.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Listo ✅` | **Sprint:** `S1` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 1.2; SPEC-100; Curso 3.6
- **Dependencia / Bloqueante:** A-01
- **Notas de Alcance y Realidad Técnica:** **Por qué superconjunto y no varios roles por usuario:** el modelo implementado guarda **un rol  por usuario** (`users.role_item_id`, un solo `role` en el JWT). El superconjunto resuelve el caso  real sin tocar SPEC-001 ni SPEC-100.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Roles de sistema inmutables**
- **DADO QUE** el sistema inicializa los perfiles de acceso en el catálogo ROLE,
- **CUANDO** se verifican los roles del sistema,
- **ENTONCES** los cuatro roles (ADMIN, COORDINADOR, SUPERVISOR, OPERARIO) existen como ítems del catálogo ROLE con is_system = TRUE
- **Y** ningún rol de sistema puede borrarse ni renombrarse desde la pantalla de catálogos

**ESCENARIO: Herencia de permisos y control de acceso en endpoints**
- **DADO QUE** el jefe de sección ingresa a la plataforma con rol ADMIN,
- **CUANDO** ejecuta cualquier función operativa de la jefatura,
- **ENTONCES** el rol ADMIN incluye todos los permisos de COORDINADOR para operar con una sola cuenta sin cambiar de rol
- **Y** cada endpoint declara formalmente su autorización requerida
- **PERO** un acceso sin los permisos correspondientes devuelve 403 con el sobre de error estándar

---

#### `A-03` — REQ 1.4

> **COMO ADMIN QUIERO administrar la taxonomía de actividades en dos niveles PARA que el sistema hable el vocabulario real del cliente sin recompilar.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Parcial 🔶` | **Sprint:** `S1` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`80%`**
- **Fuente / Evidencia:** Catálogo REQ 1.4; REQ 3.8; Entrevista 2
- **Dependencia / Bloqueante:** P-10
- **Notas de Alcance y Realidad Técnica:** 🔶 **Falta:** las clases `FITOSANITARIO` e `INSPECCION` están declaradas **sin ningún tipo**. El  catálogo funciona; esas dos clases quedan vacías hasta que el cliente las desglose (P-10).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Estructura jerárquica de clases y tipos sembrados**
- **DADO QUE** el sistema carga el catálogo oficial de actividades de mantenimiento,
- **CUANDO** el usuario consulta la taxonomía operativa,
- **ENTONCES** el sistema muestra las 9 clases y los 45 tipos del cliente sembrados, con el tipo colgando de su clase (parent_item_id)
- **Y** las cuatro clases prioritarias se encuentran identificadas mediante metadata->priority

**ESCENARIO: Gestión de tipos y preservación del historial**
- **DADO QUE** el ADMIN requiere actualizar el catálogo de tipos de labor,
- **CUANDO** crea, edita o desactiva tipos en el catálogo,
- **ENTONCES** el sistema aplica los cambios sin recompilar código
- **PERO** desactivar un tipo no altera ni corrompe las intervenciones históricas que lo referencian

**ESCENARIO: Depuración de términos inventados**
- **DADO QUE** en versiones preliminares se incluyeron valores no validados,
- **CUANDO** se inicializa la taxonomía definitiva,
- **ENTONCES** el sistema garantiza que DECORACION y REMOCION_TERRENO no existan en la taxonomía por ser valores inventados que se desactivan

---

#### `A-04` — REQ 1.6

> **COMO ADMIN QUIERO administrar la jerarquía territorial del campus PARA que cada intervención se registre contra una sección que el personal reconozca.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Parcial 🔶` | **Sprint:** `S1` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 1.6; REQ 2.5; Entrevista 2; Mapa v32 (29 sep)
- **Dependencia / Bloqueante:** P-15 (sector Jardín Rosales)
- **Notas de Alcance y Realidad Técnica:** 🔶 **Falta:** el **sistema de referencias** para los 74 lugares del Excel (lo diseña el equipo) y  el sector de «Jardín Rosales», la única sección sin responsable (P-15). Detalle en SPEC-005 §4.4.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Jerarquía territorial estricta y sectores sembrados**
- **DADO QUE** se configura la estructura geográfica del campus,
- **CUANDO** se consulta la nomenclatura territorial,
- **ENTONCES** la jerarquía es estrictamente sector -> sección -> subsección (opcional) con parent_zone_id, usando solo esas tres palabras sin cuarteles forestales
- **Y** los 5 sectores están sembrados: Sector verde 01, 02 y 03, Sector Polideportivo y Sector Bosque húmedo

**ESCENARIO: Carga de 519 secciones y capas de supervisión**
- **DADO QUE** se importan las áreas verdes del mapa v32 del cliente,
- **CUANDO** el sistema procesa las capas geográficas,
- **ENTONCES** las 519 secciones se cargan con su polígono, superficie, tipo de uso y sector asignado
- **Y** una subsección es una división interna de una sección que el ADMIN crea si hace falta
- **Y** las 4 zonas de supervisión están cargadas en una capa aparte, cada una con su supervisor (por defecto el coordinador)
- **PERO** una zona nunca se borra físicamente: se desactiva

---

#### `A-05` — REQ 1.10 / REQ 1.11

> **COMO ADMIN QUIERO administrar la lista de insumos y sus unidades de medida PARA que el personal de campo registre consumos desde una lista cerrada y comparable.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Listo ✅` | **Sprint:** `S1` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`70%`**
- **Fuente / Evidencia:** Catálogo REQ 1.10, REQ 1.11; Entrevista 2
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** Apoya el pedido textual de registrar consumos de materiales de forma sencilla.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Insumos extraídos del Excel sembrados en el catálogo**
- **DADO QUE** el ADMIN accede al catálogo de insumos y materiales,
- **CUANDO** solicita la lista de productos disponibles,
- **ENTONCES** el sistema muestra los insumos sembrados extraídos del Excel (arena, confitillo, abono, plantas, champa, mulch, entre otros)

**ESCENARIO: Unidades de medida válidas y unidad por defecto**
- **DADO QUE** se gestiona un insumo en el catálogo,
- **CUANDO** se especifican sus unidades de medida,
- **ENTONCES** las unidades permitidas son estrictamente und, m, m² y m³
- **Y** cada insumo declara su unidad por defecto, que el capataz puede cambiar al registrar en campo

---

#### `A-06` — REQ 1.7

> **COMO COORDINADOR QUIERO configurar cada cuánto debe repetirse cada actividad y con qué holgura PARA que el sistema señale un mantenimiento vencido sin reportar como incumplimiento una desviación justificada por el clima.**

- **Módulo:** `M1` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 1.7; REQ 1.8; SPEC-006; SPEC-101; Entrevista 1
- **Dependencia / Bloqueante:** SPEC-006
- **Notas de Alcance y Realidad Técnica:** 📄 **Especificado en [SPEC-006](../specs/fundacionales/SPEC-006-frecuencias-mantenimiento.md).**  Cierra el pendiente P-03 de SPEC-002.   ⬆️ **Sube de 3 a 8 pts.** El análisis reveló que no es un CRUD: son tres criterios de evaluación  distintos (intervalo, conteo anual, ninguno), vigencia temporal, evaluadores puros en el Engine y  pantalla de administración. La estimación de 3 pts asumía una tabla de valores fijos.   ⚠️ **No llamarlo «pactado vs. real» todavía.** Conocemos las frecuencias **operativas** por  entrevista, pero no si están escritas en los contratos (W-07 pasó a fase futura). Compara contra una  referencia operativa, no contra una obligación contractual.   La razón de la tolerancia está documentada: en 2026 un «verano eterno» obligó a cortar césped cada  30-35 días y a sumar un tercer control fitosanitario. **El clima manda.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Criterios configurables y tolerancias por actividad**
- **DADO QUE** el COORDINADOR configura la periodicidad de mantenimiento,
- **CUANDO** establece las reglas de frecuencia,
- **ENTONCES** el criterio de evaluación es configurable (DAYS_BETWEEN, MIN_PER_YEAR, NONE) y no un enum rígido en código
- **Y** cada frecuencia lleva valor objetivo + tolerancia por actividad (césped 30 días con 50%, riego 15 con 10%, fitosanitario mínimo 4 al año con 0%)

**ESCENARIO: Vigencia temporal y manejo de poda a demanda**
- **DADO QUE** se actualiza una tolerancia o intervalo de una frecuencia,
- **CUANDO** se guarda la nueva configuración,
- **ENTONCES** cambiar una tolerancia cierra la configuración vigente y crea otra, conservando su veredicto los periodos ya evaluados
- **Y** la poda a demanda se configura con criterio NONE explícito, no dejándola sin configurar
- **Y** CUANDO NO existe frecuencia configurada para un tipo de labor, se reporta NOT_CONFIGURED y nunca como incumplido

---

#### `A-07` — REQ 1.9

> **COMO COORDINADOR QUIERO definir las cuadrillas y asignar cada una a su sector PARA que el trabajo y el ciclo de riego tengan un responsable identificable.**

- **Módulo:** `M1` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Parcial 🔶` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`30%`**
- **Fuente / Evidencia:** Catálogo REQ 1.9; D5, D7; Entrevista 1; 3.ª entrevista
- **Dependencia / Bloqueante:** A-04, P-15
- **Notas de Alcance y Realidad Técnica:** 🔶 **Falta:** el sector de «Jardín Rosales» (P-15). Los límites ya no faltan: salen del mapa v32.   **Por qué la vigencia:** *«probablemente lo modifiquemos en algunos meses por un tema de  ejecuciones de obra… pequeñas modificaciones»* (3.ª entrevista).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Asignación de cuadrillas a sectores y distinción territorial**
- **DADO QUE** el COORDINADOR administra los equipos de trabajo,
- **CUANDO** asigna personal a los sectores del campus,
- **ENTONCES** los 3 sectores verdes tienen su cuadrilla (9 + 9 + 7 personas) y su SUPERVISOR, mientras que Polideportivo y Bosque húmedo no tienen cuadrilla propia por ser atendidos por terceros
- **Y** el sector es territorio y no persona: el capataz lo etiqueta pero puede cambiar sin que el sector se mueva
- **PERO** un SUPERVISOR solo ve y registra sobre el sector que tiene asignado

**ESCENARIO: Vigencia temporal en la asignación de secciones**
- **DADO QUE** una sección poligonal pertenece a un sector determinado,
- **CUANDO** se reasigna la sección a otro sector por obras o cambios de gestión,
- **ENTONCES** mover una sección a otro sector cierra la asignación vigente y abre otra
- **Y** la cobertura de los meses anteriores se sigue contando en el sector que la tenía históricamente

---

#### `A-08` — REQ 1.8

> **COMO ADMIN QUIERO configurar los parámetros del sistema sin tocar código PARA que adaptar la instalación a otro cliente no exija un despliegue.**

- **Módulo:** `M1` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 1.8; Curso 3.2
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** **Pasa de S4 a S3** porque E-09 (S3) necesita la lista de feriados.
- **Ninguna referencia a «PUCP» queda escrita en la lógica de negocio.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Configuración de parámetros institucionales y lista de feriados**
- **DADO QUE** el ADMIN ingresa a la configuración global del sistema,
- **CUANDO** modifica los parámetros maestros,
- **ENTONCES** nombre de la institución, logo, zona horaria y ventana horaria operativa son configurables
- **Y** la lista de feriados es configurable para que la consuma la regla de maquinaria de corte
- **Y** ninguna referencia textual a 'PUCP' queda escrita de forma rígida en la lógica de negocio

---

#### `A-09` — REQ 1.12

> **COMO COORDINADOR QUIERO registrar los periodos que afectan al trabajo de campo PARA que nadie programe trabajo sin saber que ese día hay un examen o que ese jardín está prestado.**

- **Módulo:** `M1` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`40%`**
- **Fuente / Evidencia:** Catálogo REQ 1.12; D5, D7; 3.ª entrevista (29 sep)
- **Dependencia / Bloqueante:** A-04
- **Notas de Alcance y Realidad Técnica:** OSG presta unos 12 jardines de forma recurrente: *«esos espacios nos demandan mucho tiempo para  recuperarlos»*. Y la sección no programa trabajo ruidoso *«en exámenes de admisión… y menos en  exámenes de fin de ciclo»* (3.ª entrevista).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro de eventos bloqueantes y préstamos con recurrencia**
- **DADO QUE** el COORDINADOR programa eventos institucionales del campus,
- **CUANDO** registra un evento con tipo bloqueante o préstamo, fechas y recurrencia opcional,
- **ENTONCES** el ámbito del evento se aplica a todo el campus, a un sector o a una sección específica

**ESCENARIO: Alertas operativas y marcado de recuperación de jardines**
- **DADO QUE** existe un evento activo en una fecha y zona programada,
- **CUANDO** un usuario intenta programar trabajo de campo en dicho ámbito,
- **ENTONCES** un evento bloqueante solo avisa advirtiendo la restricción pero permitiendo continuar al programador
- **Y** un préstamo marca la sección mientras dura el evento
- **Y** al terminar el préstamo la sección aparece automáticamente con el estado 'requiere recuperación'

---

### Épica B · Intervenciones del personal estable

#### `B-01` — REQ 3.1

> **COMO SUPERVISOR QUIERO registrar la actividad ejecutada por mi cuadrilla PARA que el trabajo diario quede documentado sin depender de una libreta de papel.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S1` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`70%`**
- **Fuente / Evidencia:** Catálogo REQ 3.1; D4, D7; Entrevista 2
- **Dependencia / Bloqueante:** A-03, A-04, A-07
- **Notas de Alcance y Realidad Técnica:** **La restricción de diseño más importante de esta historia:** el Excel actual tiene el 81% de  registros sin estado porque el registro era opcional y pesado. Si exigimos demasiados campos, la  gente deja de registrar. **Completitud por diseño, no por obligación.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Captura de datos operativos de la intervención**
- **DADO QUE** el SUPERVISOR finaliza una labor con su cuadrilla,
- **CUANDO** completa el registro de la intervención en la aplicación,
- **ENTONCES** el registro captura obligatoriamente clase, tipo de labor, fecha, sector, sección poligonal, cuadrilla y supervisor responsable
- **Y** almacena el registro con estado preliminar en el sistema

---

#### `B-02` — REQ 3.3

> **COMO SUPERVISOR QUIERO tomar fotos del trabajo de mi cuadrilla desde el móvil, con o sin internet PARA respaldar la calidad de la labor ante la jefatura.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`20%`**
- **Fuente / Evidencia:** Catálogo REQ 3.3; D4; Entrevista 2
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** **Por qué el indicador arranca en rojo:** un indicador que solo avisa de problemas se ignora; uno  que hay que llevar al verde se mira. Es la garantía de que nadie termina su turno con fotos sin subir.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Captura y persistencia local de fotografías**
- **DADO QUE** el capataz documenta la labor realizada en campo,
- **CUANDO** toma fotografías desde la aplicación móvil,
- **ENTONCES** la foto se guarda siempre en el almacenamiento local del teléfono antes de intentar subirla al servidor
- **Y** el sistema admite hasta 3 fotos por intervención
- **Y** registra automáticamente la fecha y hora del dispositivo móvil en los metadatos de la imagen

---

#### `B-03` — REQ 3.4

> **COMO SUPERVISOR QUIERO marcar en el mapa la zona donde intervine PARA que el registro tenga ubicación precisa y no dependa de descripciones verbales ambiguas.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`20%`**
- **Fuente / Evidencia:** Catálogo REQ 3.4; D1, D6; Entrevista 2
- **Dependencia / Bloqueante:** A-04, B-01
- **Notas de Alcance y Realidad Técnica:** **Esta historia es la que automatiza el trabajo manual semanal de la asistencia de sección** (D1).  Es la de mayor retorno de todo el backlog.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Georreferenciación de la intervención por GPS o polígono**
- **DADO QUE** el capataz geolocaliza el área atendida,
- **CUANDO** captura la ubicación en campo,
- **ENTONCES** la intervención admite coordenadas GPS directas o la selección manual de la sección en el mapa
- **Y** CUANDO NO hay señal de GPS disponible, el capataz elige la sección poligonal correspondiente desde el visor táctil

---

#### `B-04` — REQ 3.5

> **COMO SUPERVISOR QUIERO registrar lo que mi cuadrilla consumió en una intervención PARA que la oficina sepa cuánto insumo se usa realmente.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`25%`**
- **Fuente / Evidencia:** Catálogo REQ 3.5; D4; Entrevista 2
- **Dependencia / Bloqueante:** A-05, B-01
- **Notas de Alcance y Realidad Técnica:** **Es un pedido textual del cliente:** *«hoy consumí 5 sacos de arena, hoy consumí 20 sacos de  confitillo… de alguna forma un poquito amable»*. La palabra «amable» no es decorativa: son  personas con 30-40 años de oficio, no usuarios de software. **Si les resulta incómoda, no la usarán.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro ágil y amable de insumos consumidos**
- **DADO QUE** la labor requirió aplicación de materiales de campo,
- **CUANDO** el SUPERVISOR ingresa el consumo de su cuadrilla,
- **ENTONCES** el registro se realiza mediante la combinación insumo + cantidad + unidad, seleccionados desde la lista del catálogo A-05
- **Y** admite registrar varios insumos dentro de una misma intervención
- **Y** la interfaz móvil está optimizada para ser ágil, amable y utilizable por personal con décadas de oficio de campo

---

#### `B-05` — REQ 3.7

> **COMO COORDINADOR QUIERO ver qué se hizo hoy y esta semana, por sector y por cuadrilla PARA tener visibilidad operativa sin esperar reportes verbales de fin de mes.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`10%`**
- **Fuente / Evidencia:** Catálogo REQ 3.7; D1, D7; Entrevista 1
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** Elimina la dependencia de WhatsApp y llamadas para consolidar el estado de labores.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Visualización consolidada de intervenciones y semáforos**
- **DADO QUE** el COORDINADOR monitorea el avance de la semana,
- **CUANDO** ingresa al tablero de control de intervenciones,
- **ENTONCES** el sistema presenta una vista filtrable por día y por semana, desglosada por sector y por cuadrilla
- **Y** muestra un semáforo visual de estado indicando labores completadas, en curso y pendientes

---

#### `B-06` — REQ 3.10

> **COMO SUPERVISOR QUIERO registrar una actividad que cubrió varios lugares a la vez PARA no duplicar el trabajo cuando la cuadrilla atiende una zona continua.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 3.10; D6; Excel operativo
- **Dependencia / Bloqueante:** A-04, B-01
- **Notas de Alcance y Realidad Técnica:** Candidata a adelantarse a S1-S2 por falta de dependencias externas.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Intervenciones multizona en una misma jornada**
- **DADO QUE** una cuadrilla atiende un área continua que abarca múltiples secciones,
- **CUANDO** el SUPERVISOR registra la faena del turno,
- **ENTONCES** una intervención admite varias zonas si fue ejecutada por la misma cuadrilla y labor en la misma jornada
- **Y** la superficie total atendida se reparte o suma automáticamente según el tipo de labor especificado

---

#### `B-07` — REQ 3.9

> **COMO SUPERVISOR QUIERO registrar avances parciales de una intervención que toma varios días PARA reflejar que el trabajo está en curso y no empezar de cero cada jornada.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 3.9; D7; Entrevista 2
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** Caso real del cliente: una nueva área verde junto a las losas de Minas —350 m² de césped, 10  cerezos japoneses, 105 matas de *Peniceti* reubicadas o divididas— **empezó a fines de junio y  terminó a principios de septiembre.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Seguimiento de intervenciones multijornada**
- **DADO QUE** una labor de gran envergadura requiere varios días de trabajo,
- **CUANDO** el capataz actualiza el parte diario,
- **ENTONCES** una intervención puede tener fechas de inicio y fin distintas si duró varios días
- **Y** cada día de trabajo registra su avance parcial en porcentaje hasta alcanzar el 100%

---

#### `B-08` — REQ 3.11

> **COMO COORDINADOR QUIERO comparar lo que se pidió contra lo que realmente se usó en una intervención PARA detectar desviaciones de insumos y ajustar las compras futuras.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 3.11; D2; Entrevista 2
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** Evita falsos incumplimientos en actividades rutinarias donde manda lo observado en campo.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Comparación de insumos programados vs reales**
- **DADO QUE** se planificó una cantidad determinada de materiales para una labor,
- **CUANDO** se cierra la intervención con los consumos reales registrados,
- **ENTONCES** el sistema contrasta los campos requested_quantity y actual_quantity por cada insumo
- **Y** SI la desviación entre lo pedido y lo usado supera el 20%, el sistema solicita una justificación breve

---

#### `B-09` — REQ 3.2

> **COMO COORDINADOR QUIERO asignar una tarea a una cuadrilla con fecha y prioridad PARA que el capataz sepa qué debe hacer cada día al abrir su teléfono.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`10%`**
- **Fuente / Evidencia:** Catálogo REQ 3.2; D7; Entrevista 2
- **Dependencia / Bloqueante:** B-01, B-05
- **Notas de Alcance y Realidad Técnica:** Prioridad Media a propósito: hoy la orden verbal **funciona**. Formalizarla no es el dolor.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Despacho de tareas programadas al móvil del capataz**
- **DADO QUE** el COORDINADOR programa las órdenes de trabajo semanales,
- **CUANDO** asigna una tarea especificando cuadrilla, labor y plazo,
- **ENTONCES** la tarea asignada genera una intervención en estado PENDING con su cuadrilla y fecha límite
- **Y** el capataz responsable la visualiza de inmediato en su bandeja de entrada móvil

---

#### `B-10` — REQ 3.6

> **COMO COORDINADOR QUIERO validar una actividad registrada por el capataz antes de que entre al historial definitivo PARA asegurar que la información sea verídica y consistente.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 3.6; D7; Decisión 25 sep
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** 🔶 → ✅ **Decisión del 25 sep:** valida el jefe de sección. El capataz registra; no valida.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Flujo de aprobación y validación de intervenciones**
- **DADO QUE** el capataz envía un registro de intervención terminado,
- **CUANDO** la jefatura revisa el parte de trabajo,
- **ENTONCES** la intervención transita ordenadamente entre estados: DRAFT -> SUBMITTED -> VALIDATED (o REJECTED con motivo documentado)
- **Y** SOLO SI el usuario cuenta con rol COORDINADOR o ADMIN, el sistema permite ejecutar la validación

---

#### `B-11` — REQ 3.12

> **COMO SUPERVISOR QUIERO registrar la ficha técnica cuando la labor fue poda mayor o tala PARA documentar el trabajo de alto riesgo y alimentar el historial del árbol.**

- **Módulo:** `M3` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`10%`**
- **Fuente / Evidencia:** Catálogo REQ 3.12; D7; Entrevista 2
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** *«Te caes de 2 metros y medio, 3 metros y medio, la posibilidad de que te fractures el cuello…»*  (entrevista 2). La ficha es la trazabilidad de seguridad del trabajo en altura.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Ficha especializada de poda de altura o tala**
- **DADO QUE** la labor ejecutada sobre un ejemplar fue poda con grúa o tala,
- **CUANDO** el SUPERVISOR completa el informe técnico de la intervención,
- **ENTONCES** el sistema habilita la ficha técnica que solo aplica a poda con grúa o tala
- **Y** captura obligatoriamente la altura del ejemplar, DAP, método de corte y disposición de restos vegetales

---

### Épica C · Catastro verde

#### `C-01` — REQ 2.2

> **COMO SUPERVISOR QUIERO capturar un árbol o elemento verde en campo con foto, especie y posición PARA registrar ejemplares que no están en el plano.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 2.2; D3; Entrevista 2; SPEC-103
- **Dependencia / Bloqueante:** A-04, B-02, C-08
- **Notas de Alcance y Realidad Técnica:** Formulario web listo en /catastro/registrar (60%); API lista para consumo del canal móvil.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Captura individual de elemento verde con GPS**
- **DADO QUE** el capataz ubica un árbol o arbusto no registrado en el plano,
- **CUANDO** inicia la captura desde la aplicación móvil,
- **ENTONCES** el formulario realiza la captura de especie, ubicación GPS del teléfono, tipo de elemento verde y foto opcional
- **Y** el registro queda en estado PENDING_VALIDATION hasta que el coordinador lo revise
- **PERO** si el GPS no tiene precisión menor a 10 metros, la app avisa y pide confirmación visual en el mapa

---

#### `C-02` — REQ 2.12

> **COMO COORDINADOR QUIERO que el sistema funcione con el mapa base actual aunque el censo esté incompleto PARA poder operar desde el día uno sin esperar meses de levantamiento.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`80%`**
- **Fuente / Evidencia:** Catálogo REQ 2.12; D3; Entrevista 2; SPEC-103
- **Dependencia / Bloqueante:** A-04
- **Notas de Alcance y Realidad Técnica:** **Es la historia que hace viable todo el módulo.** Sin ella, el sistema sería inútil hasta que  alguien termine un levantamiento que hoy va al 30%.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro operativo sobre mapa base sin censo exhaustivo**
- **DADO QUE** se despliega la plataforma en su fase inicial,
- **CUANDO** las cuadrillas ejecutan labores en el campus,
- **ENTONCES** una intervención se registra contra una sección del mapa base v32 aunque no haya ningún ejemplar censado dentro
- **Y** el catastro de árboles crece de forma progresiva sin bloquear las operaciones diarias
- **Y** el sistema no asume que la suma de ejemplares es el total del campus mientras el inventario esté en proceso

---

#### `C-03` — REQ 2.9

> **COMO COORDINADOR QUIERO que cada ejemplar reciba un código único del sistema cuando se crea PARA tener un identificador permanente y sin duplicados.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.9; D3; Decisión 25 sep; SPEC-103
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** 🔶 → ✅ **El criterio de codificación lo define el equipo** (decisión del 25 sep).   **Por qué hace falta:** las placas de aluminio actuales están rotas como sistema — hay árboles sin  placa, placas en ejemplares que ya no existen, y placas reasignadas: *«un código de un eucalipto  se lo puso a una palmera»*.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Generación de código único inmutable**
- **DADO QUE** se da de alta un nuevo activo en el catastro verde,
- **CUANDO** se confirma la creación del registro,
- **ENTONCES** cada elemento verde recibe un código único inmutable generado por el sistema (ej. ARB-2026-0001)
- **Y** el código nunca se reasigna si el ejemplar es talado o dado de baja
- **Y** el código del sistema es independiente de cualquier código antiguo o etiqueta física que lleve el ejemplar

---

#### `C-04` — REQ 2.10

> **COMO COORDINADOR QUIERO guardar el código antiguo junto al nuevo cuando exista PARA buscar un ejemplar usando la numeración con la que el personal ya está familiarizado.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.10; D3; Decisión 25 sep; SPEC-103
- **Dependencia / Bloqueante:** C-03
- **Notas de Alcance y Realidad Técnica:** 100% implementado en V013/V014. 46 placas reales importadas desde catastro campus.xlsx.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Compatibilidad con código antiguo no único**
- **DADO QUE** existen códigos históricos asignados por censos anteriores,
- **CUANDO** se registra o migra la información del árbol,
- **ENTONCES** el sistema almacena legacy_code con índice no único permitiendo que varios ejemplares compartan código si el historial físico así lo tenía
- **Y** la búsqueda por código encuentra tanto por código del sistema como por legacy_code
- **Y** la ficha muestra ambos códigos claramente diferenciados: 'Código del sistema' y 'Código anterior'

---

#### `C-05` — REQ 2.7

> **COMO COORDINADOR QUIERO ver todas las intervenciones que recibió un ejemplar desde que fue registrado PARA conocer su historial fitosanitario y de podas.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Parcial 🔶` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`30%`**
- **Fuente / Evidencia:** Catálogo REQ 2.7; D7; Entrevista 2; SPEC-103
- **Dependencia / Bloqueante:** B-01, C-11
- **Notas de Alcance y Realidad Técnica:** AVANCE DE INTERFAZ: Componente SpecimenInterventions.tsx implementado por contrato en frontend (S2). Pendiente de integración con la API de actividades diarias (Épica B) en S3.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Hoja de vida histórica del ejemplar**
- **DADO QUE** el usuario consulta el detalle de un árbol específico,
- **CUANDO** accede a la pestaña de historial,
- **ENTONCES** la ficha del elemento lista sus intervenciones ordenadas por fecha descendente, con tipo, fecha, cuadrilla y fotos
- **Y** admite registrar una intervención directamente contra el ejemplar o contra su sección
- **PERO** si el módulo de intervenciones aún no cuenta con registros vinculados, presenta un estado informativo visual de contrato

---

#### `C-06` — REQ 2.4

> **COMO COORDINADOR QUIERO filtrar el mapa por periodo, clase de actividad y tipo PARA visualizar qué zonas recibieron atención y cuáles están pendientes.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`70%`**
- **Fuente / Evidencia:** Catálogo REQ 2.4; D6; Entrevista 2; SPEC-102
- **Dependencia / Bloqueante:** A-04, B-01, SPEC-102
- **Notas de Alcance y Realidad Técnica:** El cliente busca por «Jardines de Ingeniería Civil»: se orienta por referentes, que son las secciones.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Filtros espaciales y visualización de atención en mapa**
- **DADO QUE** el usuario examina la cobertura en el mapa del campus,
- **CUANDO** aplica filtros de búsqueda,
- **ENTONCES** el sistema permite filtrar por mes, clase, tipo de labor y responsable de supervisión
- **Y** las zonas con intervenciones en el periodo seleccionado cambian de color o muestran un tramado visual distintivo
- **Y** al hacer clic en una sección se despliega el resumen de lo ejecutado en el periodo filtrado

---

#### `C-07` — REQ 2.6

> **COMO COORDINADOR QUIERO registrar las superficies deportivas y jardines botánicos como secciones con atributos propios PARA darles un seguimiento diferenciado del resto de áreas verdes.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`80%`**
- **Fuente / Evidencia:** Catálogo REQ 2.6; D3; Entrevista 1
- **Dependencia / Bloqueante:** A-04
- **Notas de Alcance y Realidad Técnica:** Candidata a backlog post-lanzamiento si se requiere holgura en S4.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Secciones con tipología y atributos deportivos especializados**
- **DADO QUE** se configuran áreas verdes con requerimientos técnicos especiales,
- **CUANDO** se define una cancha o jardín botánico,
- **ENTONCES** un campo deportivo es un tipo de sección con atributos específicos (tipo de césped, uso semanal en horas, fecha de última aireación)
- **Y** los reportes permiten aislar superficies deportivas del resto de áreas verdes

---

#### `C-08` — REQ 2.3

> **COMO COORDINADOR QUIERO saber si la altura de un ejemplar viene de una medición real o de una estimación PARA no planificar podas mayores sobre datos aproximados.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.3; D3; Decisión 21 sep; SPEC-103
- **Dependencia / Bloqueante:** C-10
- **Notas de Alcance y Realidad Técnica:** **Ajuste del 25 sep:** para decidir quién poda basta la **clase de altura** (< 5 m / ≥ 5 m), no la  medida exacta. `MEASURED` significa que **alguien registró la clase en campo**, no que midió  con cinta. El inventario botánico (W-04) pasa a fase futura.

**Criterios de aceptación**
- Cada ejemplar lleva `data_source` con tres valores: `MEASURED`, `GENERIC`, `UNKNOWN`.
- **Todo árbol y palmera importado o capturado sin medición nace `UNKNOWN`**, nunca `GENERIC`.
- `GENERIC` solo se admite en arbustos, herbáceas, trepadoras y suculentas, donde el dato no alimenta ninguna regla.
- Registrar una medición real cambia el ejemplar a `MEASURED` y deja rastro de quién midió y cuándo.
- La ficha muestra el origen del dato de forma visible: un valor `GENERIC` aparece atenuado y etiquetado «estimado por especie»; un `UNKNOWN` aparece como «sin medir».
- **Ninguna regla de negocio consume una altura que no sea `MEASURED`** (ver C-09).

**Por qué los árboles nacen `UNKNOWN` y no `GENERIC`**

La altura no es un dato descriptivo en este dominio: **es el criterio que decide quién ejecuta el trabajo**.

| Altura | Quién ejecuta | Qué implica |
|---|---|---|
| **< 5 m** | Personal estable | Orden verbal, se cierra en 3-5 días |
| **> 5 m** | Tercerizado | Grúa, motosierra y **prevencionista**. Más de una semana |

Un genérico de especie no distingue un *Delonix regia* recién plantado de 3 m de uno maduro de 12 m.
El dato equivocado no produce un reporte feo: manda **una cuadrilla sin equipamiento frente a un
árbol que necesitaba grúa**. `UNKNOWN` dice la verdad —no lo sabemos— y obliga a verificar.

**Alcance real, medido sobre el inventario forestal entregado (962 registros):**

| Forma biológica | Ejemplares | `data_source` inicial |
|---|---|---|
| Árbol | 570 (59 especies) | **`UNKNOWN`** |
| Palmera | 247 (15 especies) | **`UNKNOWN`** |
| Arbusto | 83 (14 especies) | `GENERIC` admitido |
| Planta herbácea | 39 (*Jarava ichu*) | `GENERIC` admitido |
| Trepadora | 22 (*Bougainvillea glabra*) | `GENERIC` admitido |
| Planta suculenta | 1 | `GENERIC` admitido |

**817 de 962 (85%) nacen `UNKNOWN`.** Los otros 145 nunca requerirán grúa ni prevencionista: su
mantenimiento lo hace el personal estable sin importar su tamaño.
  **Un matiz:** dentro del arbolado, el campo crítico es **solo la altura**. El diámetro de copa y el  fuste no deciden régimen por sí solos, así que admiten `GENERIC` sin bloquear nada.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Trazabilidad del origen del dato de altura**
- **DADO QUE** se evalúan las dimensiones de un ejemplar,
- **CUANDO** se consulta su registro dendrométrico,
- **ENTONCES** cada ejemplar lleva data_source en su altura (MEASURED con telemetro/cinta, o ESTIMATED si fue aproximada)
- **Y** los 817 registros del levantamiento sin altura real entran como ESTIMATED
- **Y** la ficha muestra claramente si el dato fue medido o estimado, con la fecha de la última medición

---

#### `C-09` — REQ 2.3

> **COMO COORDINADOR QUIERO que el sistema me pida verificar la altura en campo antes de programar poda con grúa sobre un ejemplar con altura estimada PARA no enviar cuadrillas con equipo pesado a árboles que no lo necesitan.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.3; D3; Decisión 25 sep
- **Dependencia / Bloqueante:** C-08
- **Notas de Alcance y Realidad Técnica:** **Esta historia es la que convierte `data_source` en una salvaguarda y no en un adorno.** Sin ella,  el campo existe pero nada impide que una regla lea una altura inventada.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Salvaguarda de verificación presencial previa a poda con grúa**
- **DADO QUE** se planifica una orden de trabajo de poda en altura,
- **CUANDO** el ejemplar tiene altura clasificada como ESTIMATED,
- **ENTONCES** la clasificación '< 5 m' o '> 5 m' decide si la poda es con cuadrilla interna o con grúa/tercero
- **Y** si la altura es ESTIMATED y la labor exige grúa, el sistema muestra una advertencia bloqueante: 'Requiere verificación de altura en campo'
- **PERO** la advertencia solo se levanta cuando un supervisor registra la medición real en campo

---

#### `C-10` — REQ 2.13

> **COMO COORDINADOR QUIERO cargar el levantamiento de campo con datos reales de los árboles del campus PARA que el mapa muestre ejemplares verdaderos y no datos ficticios.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.13; D3; catastro campus.xlsx; V012–V014
- **Dependencia / Bloqueante:** A-04
- **Notas de Alcance y Realidad Técnica:** **Lo que este archivo NO trae:** familia botánica, altura, diámetro de copa ni fuste. No sustituye  al inventario botánico (W-04), que sigue pendiente. Ver la nota de W-04.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Carga y normalización de los 962 registros reales**
- **DADO QUE** se cuenta con el archivo consolidado del levantamiento de campo,
- **CUANDO** el administrador ejecuta la importación oficial,
- **ENTONCES** el sistema importa los 962 registros del levantamiento de campo con su código, especie y ubicación
- **Y** las coordenadas se validan contra el límite del campus, descartando o marcando las que caigan fuera
- **Y** las migraciones V012 a V014 se ejecutan sin errores incorporando fotos y estado fitosanitario

---

#### `C-11` — REQ 2.3

> **COMO COORDINADOR QUIERO consultar la ficha de cada ejemplar con su información botánica, ubicación y estado PARA tomar decisiones de manejo sin ir físicamente al árbol.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Parcial 🔶` | **Sprint:** `S2` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 2.3; D3; SPEC-103; SPEC-104
- **Dependencia / Bloqueante:** C-08, C-10
- **Notas de Alcance y Realidad Técnica:** 🆕 **Sale de la espera (antes W-10).** Ya no esperamos el «Excel forestal»: los campos se infieren  del inventario entregado y el equipo propone el resto.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Ficha completa del ejemplar con datos botánicos y VTA**
- **DADO QUE** el usuario accede al perfil de un ejemplar censado,
- **CUANDO** abre el detalle del espécimen,
- **ENTONCES** la ficha muestra ubicación, referencia, código, especie (nombre común y científico), altura y DAP
- **Y** presenta la galería fotográfica y la evaluación fitosanitaria VTA con su puntaje de riesgo
- **PERO** las intervenciones e incidencias se muestran en estado preliminar hasta completar la integración del backend en Sprint 3

---

#### `C-12` — REQ 2.14

> **COMO COORDINADOR QUIERO clasificar cada sección por su tipo de uso (jardín, cerco, xerofítica, superficie deportiva) PARA aplicar reglas de mantenimiento diferenciadas.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`90%`**
- **Fuente / Evidencia:** Catálogo REQ 2.14; D6; 3.ª entrevista (29 sep)
- **Dependencia / Bloqueante:** A-04
- **Notas de Alcance y Realidad Técnica:** *«El tipo de uso es una clasificación un poco más práctica… en función al uso y demanda del área  verde»* (3.ª entrevista).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Tipología de uso por sección poligonal**
- **DADO QUE** se configuran las características territoriales de las secciones,
- **CUANDO** se asigna la tipología funcional,
- **ENTONCES** el sistema utiliza el catálogo configurable USE_TYPE con valores semilla del cliente (jardín, cerco vivo, xerofítica, etc.)
- **Y** cada sección lleva exactamente un tipo de uso principal
- **Y** el tipo de uso condiciona las labores recomendadas y la frecuencia estándar del área

---

#### `C-13` — REQ 1.5 / REQ 2.13

> **COMO ADMIN QUIERO registrar evaluaciones fitosanitarias basadas en el método Visual Tree Assessment (VTA) en tres zonas (raíz, tronco y copa) PARA diagnosticar y prevenir riesgos de caída de ramas o árboles.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 1.5, REQ 2.13; SPEC-104; inventario verde
- **Dependencia / Bloqueante:** C-10, SPEC-104
- **Notas de Alcance y Realidad Técnica:** NUEVA HU (SPEC-104): Galería botánica multiejemplar construida en frontend y backend en S2.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Evaluación VTA en 3 zonas con cálculo de riesgo estructural**
- **DADO QUE** el especialista o supervisor inspecciona la sanidad de un árbol,
- **CUANDO** ingresa la severidad y daños detectados en raíz, tronco y copa en el componente SpecimenAssessments,
- **ENTONCES** el sistema calcula automáticamente el nivel de riesgo fitosanitario (BAJO, MEDIO, ALTO o CRÍTICO)
- **Y** recomienda la labor prioritaria correspondiente según la matriz de decisión VTA
- **SOLO SI** las tres zonas estructurales obligatorias cuentan con estado evaluado

---

#### `C-14` — REQ 2.3

> **COMO SUPERVISOR QUIERO visualizar un visor fotográfico multiejemplar con visor tipo lightbox y comparación temporal PARA examinar el desarrollo foliar y sanitario de los árboles en el tiempo.**

- **Módulo:** `M2` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`100%`**
- **Fuente / Evidencia:** Catálogo REQ 2.3; SPEC-103 D-07, D-08
- **Dependencia / Bloqueante:** C-08, C-11
- **Notas de Alcance y Realidad Técnica:** NUEVA HU (SPEC-103): Modal de actualización dendrométrica y fotos implementado en S2.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Galería fotográfica con visor interactivo y zoom**
- **DADO QUE** se consultan las capturas visuales de un ejemplar o especie,
- **CUANDO** el usuario selecciona una imagen de la galería,
- **ENTONCES** el visor abre la fotografía en modo lightbox con zoom y fecha exacta de captura
- **Y** permite alternar imágenes secuenciales para comparar la evolución fenológica y sanitaria en el tiempo

---

#### `C-15` — REQ 2.15

> **COMO ADMIN QUIERO registrar y visualizar en el mapa la ubicación y estado de tachos ecológicos y bebederos PARA gestionar el mantenimiento del mobiliario de soporte de áreas verdes.**

- **Módulo:** `M2` | **Tipo:** `Enabler` | **Actor:** `COORDINADOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`80%`**
- **Fuente / Evidencia:** Catálogo REQ 2.15; SPEC-103
- **Dependencia / Bloqueante:** A-04, SPEC-103
- **Notas de Alcance y Realidad Técnica:** NUEVA HU: Ya construido en backend y frontend (SPEC-103). Incluido formalmente desde catálogo 21 oct.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Inventario cartográfico de mobiliario verde**
- **DADO QUE** se administran los elementos de soporte del campus,
- **CUANDO** se registran tachos de reciclaje o bebederos con coordenadas GPS,
- **ENTONCES** el sistema renderiza los elementos en la capa de mobiliario del visor 3D con su icono distintivo
- **Y** permite consultar y actualizar su estado operativo (operativo, requiere mantenimiento o cambio)

---

### Épica D · Riego

#### `D-01` — REQ 7.1

> **COMO SUPERVISOR QUIERO registrar el turno de riego de mi cuadrilla (horario, sector y fuente de agua) PARA que la jefatura sepa qué zonas se regaron y con qué método.**

- **Módulo:** `M7` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`40%`**
- **Fuente / Evidencia:** Catálogo REQ 7.1; D5; Entrevista 2
- **Dependencia / Bloqueante:** A-04, A-07
- **Notas de Alcance y Realidad Técnica:** El cliente lo explica así: **«cada capataz es una electroválvula»**. El riego es manual pero  funciona como un sistema automatizado por sectores.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro de turno de riego semanal por sector**
- **DADO QUE** la cuadrilla ejecuta el riego en su sector asignado,
- **CUANDO** el SUPERVISOR registra la labor de riego,
- **ENTONCES** el turno se registra de forma semanal por sector, declarando fecha, horario de inicio y fin, y cuadrilla
- **Y** el registro captura la fuente de agua (red, cisterna, pozo) y el método (aspersión, manguera, goteo)
- **Y** si fue con cisterna, se registra el número de viajes o metros cúbicos aproximados

---

#### `D-02` — REQ 7.2

> **COMO COORDINADOR QUIERO ver qué porcentaje del campus se regó en el mes y qué zonas llevan más días sin agua PARA asegurar una cobertura hídrica regular.**

- **Módulo:** `M7` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Parcial 🔶` | **Sprint:** `S3` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`20%`**
- **Fuente / Evidencia:** Catálogo REQ 7.2; D5; Entrevista 2
- **Dependencia / Bloqueante:** D-01
- **Notas de Alcance y Realidad Técnica:** 🔶 **Falta, y es una definición de negocio, no técnica:** qué cuenta como «zona regada». Sin ese  criterio el indicador se puede construir pero no se puede calibrar.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Indicador de cobertura hídrica mensual y alerta de días sin riego**
- **DADO QUE** se monitorea el estado del riego en el campus,
- **CUANDO** el COORDINADOR consulta el reporte mensual,
- **ENTONCES** el indicador muestra el porcentaje de área verde regada al menos una vez en el mes en curso
- **Y** el mapa resalta en semáforo ámbar o rojo las secciones que superan el intervalo máximo sin riego configurado
- **Y** el cálculo se actualiza automáticamente con cada turno de riego validado

---

#### `D-03` — REQ 7.4

> **COMO COORDINADOR QUIERO que el sistema conozca la ventana horaria de riego permitida PARA no programar riego diurno que interfiera con los peatones o desperdicie agua por evaporación.**

- **Módulo:** `M7` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`10%`**
- **Fuente / Evidencia:** Catálogo REQ 7.4; Entrevista 2
- **Dependencia / Bloqueante:** D-01
- **Notas de Alcance y Realidad Técnica:** **La razón de la ventana no es agronómica:** después de las 11:30 no se riega para que al mediodía  las áreas verdes estén disponibles para los estudiantes.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Control de ventana horaria de riego permitida**
- **DADO QUE** la institución establece políticas de uso racional del agua,
- **CUANDO** se programa un turno de riego en el sistema,
- **ENTONCES** la ventana horaria es configurable, con horario por defecto de 22:00 a 06:00 (o turno tarde autorizado)
- **Y** si se intenta registrar un turno fuera de la ventana, el sistema muestra una advertencia informativa
- **PERO** permite continuar al usuario solicitando indicar si fue una emergencia o autorización especial

---

#### `D-04` — REQ 7.5

> **COMO SUPERVISOR QUIERO registrar las horas de bomba del pozo y el nivel del reservorio PARA monitorear el recurso hídrico propio del campus.**

- **Módulo:** `M7` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 7.5; Entrevistas
- **Dependencia / Bloqueante:** D-01
- **Notas de Alcance y Realidad Técnica:** Ataca D7. **Modelo propio, al estilo de la gestión de incidencias de TI:** no replicamos la  matriz del cliente, proponemos nuestro flujo de registro, urgencia, estados y cierre. **Las  incidencias las registra el capataz.**

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro de horómetro de pozo y nivel de reservorio**
- **DADO QUE** el encargado opera el sistema de bombeo del campus,
- **CUANDO** ingresa la lectura del horómetro de la bomba y el nivel del reservorio,
- **ENTONCES** el sistema almacena las horas diarias de operación (referencia: 5.5 h/día en verano, 2.5 h/día en invierno)
- **Y** calcula el volumen estimado extraído en metros cúbicos según el caudal de la bomba
- **Y** alerta automáticamente si las horas de bombeo superan el límite diario de seguridad

---

### Épica E · Incidencias

#### `E-01` — REQ 5.1

> **COMO SUPERVISOR QUIERO registrar un problema detectado en campo con foto, tipo y urgencia PARA que la oficina lo priorice y programe su atención.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.1; D7; Entrevista 2
- **Dependencia / Bloqueante:** A-04, E-08
- **Notas de Alcance y Realidad Técnica:** Modelo propio estilo gestión TI: las incidencias las reporta el capataz.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Registro de problema en campo con severidad y foto**
- **DADO QUE** el SUPERVISOR detecta una anomalía en su ronda,
- **CUANDO** completa el reporte de incidencia,
- **ENTONCES** el formulario captura tipo de incidencia, zona o sección, urgencia (alta, media, baja) y foto obligatoria
- **Y** genera un ticket con código único y fecha de reporte
- **Y** si la urgencia es alta, el ticket aparece destacado en el tablero de control del coordinador

---

#### `E-02` — REQ 5.3

> **COMO COORDINADOR QUIERO seguir una incidencia desde que se reporta hasta que se resuelve PARA que ningún problema quede sin atender.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.3; D7; 3.ª entrevista (29 sep)
- **Dependencia / Bloqueante:** E-01
- **Notas de Alcance y Realidad Técnica:** Tiempos reales de referencia: casos simples **1 día, máximo 48 horas**; tercerizado **2-3 semanas  en el mejor caso, hasta mes y medio** (3.ª entrevista).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Ciclo de vida y transición de estados del ticket**
- **DADO QUE** se hace seguimiento a una incidencia registrada,
- **CUANDO** se actualiza la atención del problema,
- **ENTONCES** el ticket transita por los estados oficiales: REPORTADA -> EN_ATENCION -> RESUELTA -> CERRADA
- **Y** cada cambio de estado registra fecha, hora y usuario que lo ejecutó
- **Y** el estado RESUELTA exige registrar la intervención que lo solucionó o una nota de cierre justificada

---

#### `E-03` — REQ 5.2

> **COMO COORDINADOR QUIERO que el sistema proponga quién debe atender una incidencia según el tipo de problema PARA derivar rápido al personal correcto.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.2; D7; Decisión 25 sep
- **Dependencia / Bloqueante:** C-08, C-09, E-01
- **Notas de Alcance y Realidad Técnica:** **Es el consumidor principal de `data_source`.** Sobre los 817 árboles y palmeras del inventario  —hoy todos `UNKNOWN`— esta regla no propondrá régimen hasta que alguien mida.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Derivación asistida por estrato de altura**
- **DADO QUE** se atiende una incidencia de poda o riesgo arbóreo,
- **CUANDO** el sistema evalúa el árbol involucrado,
- **ENTONCES** si el ejemplar tiene altura < 5 m el sistema propone atención por personal estable, y si tiene > 5 m propone empresa tercera con grúa
- **Y** para problemas de riego propone a la cuadrilla del sector correspondiente
- **PERO** el coordinador puede cambiar la asignación sugerida antes de despacharla

---

#### `E-04` — REQ 5.8

> **COMO SUPERVISOR QUIERO marcar que una incidencia llegó por Centuria u otro canal externo PARA saber qué problemas fueron detectados por la comunidad y cuáles por el equipo.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `SUPERVISOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `1 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.8; D1; Decisión 25 sep
- **Dependencia / Bloqueante:** E-01
- **Notas de Alcance y Realidad Técnica:** ⬇️ **Reformulada (25 sep):** antes guardaba el código externo. Sin acceso a Centuria, basta la  marca; cuando llegue la integración (fase futura) las incidencias históricas ya estarán  identificadas.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Trazabilidad del canal de origen de la incidencia**
- **DADO QUE** se ingresa una solicitud al sistema,
- **CUANDO** el usuario especifica cómo llegó el reporte,
- **ENTONCES** el origen se registra seleccionando del catálogo: CENTURIA, INSPECCION_PROPIA, REPORTE_VERBAL, CORREO
- **Y** si el canal es CENTURIA, permite ingresar el código de ticket externo para cruce de información
- **Y** los reportes distinguen qué porcentaje de incidencias se originan por quejas de la comunidad

---

#### `E-05` — REQ 5.9

> **COMO COORDINADOR QUIERO distinguir un hallazgo de una asignación cuando reviso el trabajo PARA saber qué problemas encontró la cuadrilla por su cuenta y cuáles le encargó la jefatura.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.9; D7; Excel operativo
- **Dependencia / Bloqueante:** B-01
- **Notas de Alcance y Realidad Técnica:** Permite aislar esfuerzo correctivo frente al mantenimiento preventivo.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Diferenciación entre trabajo programado y hallazgo**
- **DADO QUE** se analiza la labor registrada por el personal,
- **CUANDO** se consulta la orden de trabajo,
- **ENTONCES** cada intervención declara su origen: PROGRAMADA (asignada por la jefatura) o HALLAZGO (detectada y resuelta en campo por la cuadrilla)
- **Y** los indicadores diferencian el porcentaje de trabajo planificado frente al correctivo reactivo

---

#### `E-06` — REQ 5.4

> **COMO COORDINADOR QUIERO ligar una incidencia al ejemplar o sección correspondiente PARA que el problema quede registrado en el historial del activo.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.4; D3, D7; Entrevista 2
- **Dependencia / Bloqueante:** C-01, E-01
- **Notas de Alcance y Realidad Técnica:** Conecta el módulo de incidencias con la ficha del ejemplar.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Asociación opcional a ejemplar o sección**
- **DADO QUE** se documenta un ticket de incidencia,
- **CUANDO** se vincula el problema a la infraestructura verde,
- **ENTONCES** la vinculación es opcional: una incidencia puede ligarse a un ejemplar específico, a una sección poligonal o solo a un sector general
- **Y** si se liga a un ejemplar, la incidencia aparece en la pestaña de antecedentes de su ficha técnica
- **Y** al resolver la incidencia, el historial del árbol muestra la labor que la subsanó

---

#### `E-07` — REQ 5.5

> **COMO COORDINADOR QUIERO consultar las incidencias pasadas con filtros por zona, tipo y estado PARA identificar problemas recurrentes en ciertas áreas del campus.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `2 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.5; D7; Entrevistas
- **Dependencia / Bloqueante:** E-01, E-02
- **Notas de Alcance y Realidad Técnica:** Alimenta la toma de decisiones para prevención fitosanitaria o poda.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Búsqueda y reporte histórico de anomalías**
- **DADO QUE** el usuario investiga problemas fitosanitarios o roturas reiteradas,
- **CUANDO** ingresa al módulo de incidencias históricas,
- **ENTONCES** el sistema lista los tickets con filtros combinados por sector, tipo, estado y rango de fechas
- **Y** permite exportar la bitácora filtrada en Excel para análisis de mantenimiento mayor

---

#### `E-08` — REQ 5.7

> **COMO ADMIN QUIERO administrar los tipos de incidencia del catálogo PARA que el personal clasifique los problemas con un vocabulario uniforme.**

- **Módulo:** `M5` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `HAB` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.7; Decisión 21 sep
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** El cliente ya dijo que **puede comentar la matriz, no entregarla**. La vía 1 es exactamente lo que  él mismo ofreció.

**Borrador para llevar a la sesión**, derivado del material que ya tenemos:

| Tipo propuesto | De dónde sale |
|---|---|
| Rama caída o en riesgo de caer | Criterio de poda por **seguridad** |
| Obstrucción de vía peatonal | Criterio de **transitabilidad** — el más frecuente en los `OSG-####` |
| Rama que obstaculiza ventana o acceso | Criterio de **seguridad** |
| Planta o ejemplar muerto | Reposición de plantas (meta de cobertura) |
| Presencia de plaga o enfermedad | **Estado sanitario** |
| Árbol con espinas en zona transitada | Mencionado entre las atenciones `OSG-####` |
| Piso resbaladizo por riego | **El riesgo declarado por la jefatura** (§7.2 del dominio) |
| Daño por evento o tercero | Campus con actividad constante |
  ⚠️ **Ninguna de estas entradas proviene de la matriz confidencial.** Todas se derivan de los  criterios de trabajo que el cliente explicó en entrevista y que ya están documentados en  [`docs/dominio/README.md`](dominio/README.md).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Catálogo tipificado de incidencias del campus**
- **DADO QUE** el ADMIN configura los catálogos del sistema,
- **CUANDO** gestiona el catálogo INCIDENT_TYPE,
- **ENTONCES** el catálogo se siembra con valores estándar (rama caída, fuga de agua, plaga, basura, daño en césped, etc.)
- **Y** el ADMIN puede agregar, editar y desactivar tipos
- **PERO** desactivar un tipo no afecta los tickets históricos ya registrados

---

#### `E-09` — REQ 5.11

> **COMO COORDINADOR QUIERO que el sistema solo admita sábados para la programación de maquinaria de corte en zonas académicas PARA cumplir con las normas de ruido del campus.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S3` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.11; D7; Entrevista 2; 3.ª entrevista
- **Dependencia / Bloqueante:** A-08, A-09
- **Notas de Alcance y Realidad Técnica:** *«Imagínate, estás haciendo tu clase, tu profesor está que habla y suena una motosierra al  costado»* (entrevista 2).

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Restricción de maquinaria ruidosa a sábados en zonas académicas**
- **DADO QUE** se programa una labor que emplea maquinaria ruidosa (motoguadaña, cortadora),
- **CUANDO** el usuario asigna la fecha en una sección clasificada como zona académica,
- **ENTONCES** el sistema valida que el día seleccionado sea estrictamente sábado
- **Y** si se intenta programar de lunes a viernes, el sistema bloquea con advertencia de restricción de ruido académico
- **EXCEPTO CUANDO** la fecha corresponda a periodo de vacaciones verificado en el calendario

---

#### `E-10` — REQ 5.6

> **COMO COORDINADOR QUIERO que el sistema me avise cuando una incidencia supera el plazo máximo de atención PARA intervenir antes de que se convierta en un reclamo formal.**

- **Módulo:** `M5` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 5.6; D7; 3.ª entrevista (absorbe W-15)
- **Dependencia / Bloqueante:** E-01, E-02
- **Notas de Alcance y Realidad Técnica:** 🆕 **Sale de la espera (antes W-15).** Referencia del cliente: *«por lo general un día, máximo 48  horas»* (3.ª entrevista). Los valores iniciales se confirman con él.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Alertas de vencimiento de acuerdos de nivel de servicio (SLA)**
- **DADO QUE** un ticket de incidencia se encuentra abierto,
- **CUANDO** se evalúa el tiempo de respuesta,
- **ENTONCES** el plazo estándar es de 48 horas para personal estable y 5 días hábiles para contratista externo
- **Y** si el ticket no se resuelve en ese plazo, cambia a estado VENCIDO y emite una alerta en el panel de control
- **Y** el coordinador recibe un resumen diario de tickets que están por vencer en las próximas 24 horas

---

### Épica F · Reportes y analítica

#### `F-01` — REQ 6.1

> **COMO COORDINADOR QUIERO un tablero con el estado del mes (cobertura, labores realizadas, incidencias abiertas) PARA tener un resumen ejecutivo en un solo vistazo.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.1; D1, D5; Entrevistas
- **Dependencia / Bloqueante:** B-05, D-02, E-02, F-02, F-03
- **Notas de Alcance y Realidad Técnica:** Visión integral de gestión para jefatura.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Tablero ejecutivo consolidado mensual**
- **DADO QUE** el usuario ingresa a la vista de analítica,
- **CUANDO** selecciona el mes en consulta,
- **ENTONCES** el tablero muestra porcentaje de cobertura mensual, cantidad de labores realizadas e incidencias abiertas
- **Y** los indicadores se desglosan comparativamente por sector
- **Y** los datos se actualizan automáticamente con cada orden validada

---

#### `F-02` — REQ 6.8

> **COMO COORDINADOR QUIERO ver qué porcentaje del área verde total del campus recibió mantenimiento en el periodo PARA evaluar el avance real contra la meta mensual.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Parcial 🔶` | **Sprint:** `S4` | **Story Points:** `8 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.8; D5; Entrevistas
- **Dependencia / Bloqueante:** A-04, B-01, D-01
- **Notas de Alcance y Realidad Técnica:** 🔶 **Falta:** qué cuenta como «zona cubierta». Es la misma definición pendiente de D-02.   Meta textual del cliente: *«al mes tenemos que llegar al 100% de esa cobertura, con su riego, su  mantenimiento, su perfilado, su reemplazo de plantas si lo requieren»*.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Cálculo de superficie verde intervenida**
- **DADO QUE** se evalúa la productividad mensual,
- **CUANDO** se solicita el porcentaje de cobertura,
- **ENTONCES** el indicador contrasta los metros cuadrados de secciones intervenidas frente a los 156,000 m² de áreas verdes totales del campus
- **Y** distingue las secciones atendidas al 100% de las que tuvieron intervenciones parciales
- **Y** permite filtrar el cálculo por sector y por tipo de labor (corte, poda, riego)

---

#### `F-03` — REQ 6.10

> **COMO COORDINADOR QUIERO comparar la frecuencia pactada contra la real de cada labor PARA detectar qué actividades están por debajo del estándar acordado.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Alta` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.10; D2, D5; SPEC-006; SPEC-101
- **Dependencia / Bloqueante:** A-06, B-01
- **Notas de Alcance y Realidad Técnica:** Evalúa cumplimiento de césped, podas y controles fitosanitarios.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Comparación de frecuencia teórica vs ejecutada**
- **DADO QUE** se han configurado las reglas de periodicidad en A-06,
- **CUANDO** el usuario genera el reporte de cumplimiento de frecuencias,
- **ENTONCES** el reporte compara el intervalo real transcurrido contra el rango configurado con su porcentaje de tolerancia
- **Y** resalta en rojo las actividades que superaron la tolerancia permitida
- **Y** permite agrupar los resultados por especie botánica o por sección poligonal

---

#### `F-04` — REQ 6.6

> **COMO COORDINADOR QUIERO filtrar cualquier reporte por zona, cuadrilla, tipo de labor y rango de fechas PARA responder consultas específicas de la jefatura.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.6; D6; Entrevistas
- **Dependencia / Bloqueante:** F-01
- **Notas de Alcance y Realidad Técnica:** Facilita responder requerimientos directos de OSG.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Consistencia de filtros en todos los reportes**
- **DADO QUE** el usuario requiere análisis segmentados de datos,
- **CUANDO** utiliza los filtros del módulo de reportes,
- **ENTONCES** los filtros son consistentes y transversales en todos los reportes: sector, sección, cuadrilla, labor y fechas
- **Y** los gráficos y tablas responden de forma reactiva actualizando sus métricas sin recargar la página

---

#### `F-05` — REQ 6.5

> **COMO COORDINADOR QUIERO exportar un reporte a PDF y Excel con los filtros aplicados PARA adjuntarlo al informe mensual que se entrega a la dirección.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.5; D1; Entrevistas
- **Dependencia / Bloqueante:** F-01
- **Notas de Alcance y Realidad Técnica:** Automatiza la generación de entregables para la dirección.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Exportación fiel a PDF y Excel con membrete**
- **DADO QUE** se ha configurado una vista o reporte tabular,
- **CUANDO** el usuario hace clic en exportar a PDF o Excel,
- **ENTONCES** la exportación respeta estrictamente los filtros activos en pantalla al momento de la descarga
- **Y** el PDF incluye cabecera institucional, fecha de generación y resumen gráfico
- **Y** el Excel incluye las columnas completas con datos numéricos limpios para procesamiento externo

---

#### `F-06` — REQ 6.9

> **COMO COORDINADOR QUIERO ver en el mapa qué zonas concentran más incidencias y cuáles más intervenciones PARA tomar decisiones visuales de asignación de recursos.**

- **Módulo:** `M6` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `5 pts`
- **Avance Real Implementado:** **`0%`**
- **Fuente / Evidencia:** Catálogo REQ 6.9; D6; 3.ª entrevista (absorbe W-09)
- **Dependencia / Bloqueante:** A-04, B-01, SPEC-102
- **Notas de Alcance y Realidad Técnica:** 🆕 **Sale de la espera (antes W-09).** El cliente ya tiene un mapa de calor en su mapa, pero  decidimos incluirlo en nuestro modelado: es *«la función principal de la herramienta que ya  usan»*.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Mapa de calor de incidencias y trabajos de campo**
- **DADO QUE** se dispone de datos georreferenciados acumulados,
- **CUANDO** el usuario activa la capa de mapa de calor en el visor 3D,
- **ENTONCES** el mapa proyecta la densidad de intervenciones o incidencias sobre el mapa propio del campus
- **Y** permite alternar entre mapa de calor de incidencias y mapa de calor de horas de labor ejecutadas
- **Y** ajusta los gradientes de color según la escala temporal seleccionada

---

### Épica G · Servicios tercerizados

#### `G-02` — REQ 4.2

> **COMO ADMIN QUIERO registrar las empresas contratadas para servicios de áreas verdes PARA saber quién es responsable de cada trabajo tercerizado.**

- **Módulo:** `M4` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`50%`**
- **Fuente / Evidencia:** Catálogo REQ 4.2; D2; Decisión 25 sep
- **Dependencia / Bloqueante:** —
- **Notas de Alcance y Realidad Técnica:** **Dentro del alcance, pero es la última prioridad:** se construye al final de S4, si hay capacidad.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Catálogo de contratistas y datos de contacto**
- **DADO QUE** el ADMIN gestiona los servicios externos de mantenimiento,
- **CUANDO** registra un contratista en el sistema,
- **ENTONCES** el sistema almacena los datos básicos de la empresa (RUC, razón social, contacto, teléfono y servicio que presta)
- **Y** permite asociar a la empresa en órdenes de trabajo que requieran grúa telescópica o servicios especializados
- **Y** mantiene el catálogo disponible para asignaciones de incidencias mayores (> 5 m)

---

### Épica H · Información pública (QR)

#### `H-01` — REQ 8.1 / REQ 8.2 / REQ 8.3

> **COMO COORDINADOR QUIERO generar un código QR por ejemplar PARA que la comunidad del campus acceda a información botánica y aprecie el arbolado.**

- **Módulo:** `M8` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Baja` | **Preparación:** `Listo ✅` | **Sprint:** `S4` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`20%`**
- **Fuente / Evidencia:** Catálogo REQ 8.1, 8.2, 8.3; D3; Entrevistas
- **Dependencia / Bloqueante:** C-03, C-11
- **Notas de Alcance y Realidad Técnica:** Depende de C-03, cuyo criterio define el equipo.   **Un antecedente que conviene recordar:** las placas de aluminio fracasaron —se perdieron, quedaron  en ejemplares muertos y se reasignaron. Cualquier etiqueta física hereda ese riesgo.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Generación de QR y acceso a ficha pedagógica pública**
- **DADO QUE** se selecciona un árbol singular en el catastro,
- **CUANDO** el coordinador solicita la emisión del código QR,
- **ENTONCES** el sistema genera un código QR que apunta a la URL pública de la ficha pedagógica del ejemplar
- **Y** la página pública muestra especie, familia, origen, descripción botánica y foto sin requerir login
- **Y** no muestra datos internos de gestión (costos, cuadrillas o incidencias) para resguardar la privacidad operativa

---

### Épica I · Lugares y perspectivas

#### `L-01` — REQ 9.1

> **COMO COORDINADOR QUIERO disponer de un catálogo de lugares representativos del campus (edificios, plazas y monumentos) PARA geolocalizar intervenciones y áreas verdes mediante referencias reconocibles por el personal.**

- **Módulo:** `M9` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`90%`**
- **Fuente / Evidencia:** Catálogo REQ 9.1; Entrevistas 2 y 3 (referentes vs cuarteles); Módulo places backend y frontend
- **Dependencia / Bloqueante:** A-04, SPEC-102
- **Notas de Alcance y Realidad Técnica:** CONSTRUIDA EN S2 (90%): Pantallas /lugares y /lugares/[code] operativas con repositorio y controladores en modules.places.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Catálogo de lugares representativos del campus**
- **DADO QUE** el usuario accede al módulo /lugares,
- **CUANDO** consulta o registra lugares del campus,
- **ENTONCES** el sistema gestiona los hitos de referencia del campus con código, nombre común, sector y coordenadas geográficas
- **Y** reemplaza formalmente el concepto obsoleto de cuarteles forestales por lugares reconocidos del campus

---

#### `L-02` — REQ 9.2

> **COMO SUPERVISOR QUIERO registrar y gestionar perspectivas visuales y puntos de vista asociados a cada lugar PARA orientar con exactitud la ubicación de labores y cuadrillas en el campus.**

- **Módulo:** `M9` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`90%`**
- **Fuente / Evidencia:** Catálogo REQ 9.2; D4 (evitar traslados in situ); modules.places (PerspectiveNaming)
- **Dependencia / Bloqueante:** L-01
- **Notas de Alcance y Realidad Técnica:** CONSTRUIDA EN S2 (90%): Algoritmo de nomenclatura por coordenadas y componentes UI SortablePerspective y PerspectiveCarousel terminados.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Asociación de perspectivas visuales operativas**
- **DADO QUE** un lugar posee diferentes frentes de acceso o visualización,
- **CUANDO** se configuran las perspectivas del lugar (ej. Frontis, Jardín Posterior),
- **ENTONCES** el sistema vincula cada perspectiva a su lugar correspondiente
- **Y** permite georreferenciar árboles y labores orientados según dicha perspectiva visual

---

#### `L-03` — REQ 9.3

> **COMO COORDINADOR QUIERO filtrar y centrar automáticamente el visor de mapa 3D según el lugar o perspectiva seleccionada PARA inspeccionar el entorno vegetal circundante sin navegación manual.**

- **Módulo:** `M9` | **Tipo:** `User Story` | **Actor:** `COORDINADOR`
- **Prioridad:** `Media` | **Preparación:** `Listo ✅` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`90%`**
- **Fuente / Evidencia:** Catálogo REQ 9.3; D1; SPEC-102; frontend PlaceMapPanel y mapView.ts
- **Dependencia / Bloqueante:** L-01, SPEC-102
- **Notas de Alcance y Realidad Técnica:** CONSTRUIDA EN S2 (90%): Integración de cámara 3D y polígonos Mapbox/Deck.gl operativa en PlaceMapPanel.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Centrado automático del mapa por lugar seleccionado**
- **DADO QUE** el usuario se encuentra en el visor 3D del campus,
- **CUANDO** selecciona un lugar representativo desde el menú desplegable,
- **ENTONCES** el mapa centra su encuadre automáticamente sobre las coordenadas del lugar
- **Y** destaca los ejemplares y áreas verdes ubicados dentro de su entorno

---

#### `L-04` — REQ 9.4

> **COMO ADMIN QUIERO mapear y migrar intervenciones y registros históricos previamente asociados a cuarteles hacia el nuevo modelo de lugares PARA preservar la continuidad histórica de la información.**

- **Módulo:** `M9` | **Tipo:** `Enabler` | **Actor:** `ADMIN`
- **Prioridad:** `Media` | **Preparación:** `Parcial 🔶` | **Sprint:** `S2` | **Story Points:** `3 pts`
- **Avance Real Implementado:** **`60%`**
- **Fuente / Evidencia:** Catálogo REQ 9.4; D1; 411 referencias del catastro; ReferenceMigrationScreen
- **Dependencia / Bloqueante:** L-01, A-04
- **Notas de Alcance y Realidad Técnica:** HERRAMIENTA LISTA EN S2 (60%): Pantalla /lugares/migracion y servicio ReferenceMigrationService implementados; la ejecución manual de migración de las 411 filas continúa en progreso.

**Criterios de Aceptación (Escenarios BDD / Gherkin):**

**ESCENARIO: Migración asistida de cuarteles hacia lugares**
- **DADO QUE** existen registros históricos asociados a la antigua división por cuarteles,
- **CUANDO** el administrador ejecuta la herramienta /lugares/migrar,
- **ENTONCES** el sistema sugiere la equivalencia territorial entre el cuartel antiguo y el nuevo lugar del campus
- **Y** reasigna los registros preservando la trazabilidad de auditoría histórica

---

## 5. Historias en Espera (Bloqueadas / Pendientes de Confirmación — 15 pts)

| ID | Nombre | Req. | Épica | Actor | Prioridad | Preparación | Pts | Condición de Desbloqueo |
|:---:|---|:---:|---|:---:|:---:|:---:|:---:|---|
| **W-11** | Reporte operativo | REQ 6.2 | Épica F · Reportes y analítica | `COORDINADOR` | Media | Parcial 🔶 | 5 | Propuesta propia de reportes elaborada por el equipo, pendiente de ser validada formalmente con el cliente. |
| **W-12** | Reporte de coordinación | REQ 6.3 | Épica F · Reportes y analítica | `COORDINADOR` | Media | Parcial 🔶 | 5 | Propuesta propia de reportes elaborada por el equipo, pendiente de ser validada formalmente con el cliente. |
| **W-13** | Reporte de dirección | REQ 6.4 | Épica F · Reportes y analítica | `COORDINADOR` | Media | Parcial 🔶 | 5 | Propuesta propia de reportes elaborada por el equipo; contrastar con documento de gestión que la sección entrega a OSG si lo comparte. |

### Análisis de Desbloqueos del Backlog
| Factor Externo / Pendiente | Historias que Desbloquea | Estado Actual de Resolución | Veredicto |
|---|:---:|---|:---:|
| Los shapes de los sectores | `A-04 · A-07 · W-03 · D-02` | Resuelto (29 sep): Llegó el mapa v32 del cliente con 5 sectores y 519 secciones georreferenciadas. Solo falta Jardín Rosales (P-15). | **Listo ✅** |
| Un contrato + un reporte de proveedor | `W-05 · W-07 · W-08` | Fase futura — seguimiento de tercerizados fuera de alcance del MVP (decisión del 25 sep). | **Fase Futura ⏭️** |
| Validar la propuesta de reportes | `W-11 · W-12 · W-13` | En proceso — propuesta propia elaborada por el equipo, pendiente de visto bueno en sesión con cliente. | **Monitoreo 🔶** |
| Inventario de ~100 jardines | `W-06` | Fase posterior — ya no es prioridad; corte de césped se mide por frecuencia (F-03), no por cobertura de jardines. | **Fase Futura ⏭️** |
| La matriz de incidencias confidencial | `W-14` | Ya no bloquea — el documento es confidencial y no se requiere; se implementó catálogo abierto E-08. | **Listo ✅** |

---

## 6. Historias Movidas a Fase Futura (Exclusiones Justificadas)

| ID | Nombre de la Historia | Req. | Épica | Prioridad Original | Motivo Técnico / Negocio de Exclusión | Horizonte |
|:---:|---|:---:|---|:---:|---|---|
| **G-01** | Calendario de servicios programados | REQ 4.7 | Épica G · Servicios tercerizados | Media | Es seguimiento de los servicios tercerizados. En esta versión solo se registran datos básicos del proveedor (G-02). | Fase futura cuando se disponga de contratos y reportes periódicos de contratistas. |
| **W-01** | Integración con el mapa interactivo existente | REQ 2.8 | Épica C · Catastro verde | Media | La integración técnica con el mapa del cliente constituiría un proyecto completo independiente. Análisis en integracion-mapa-interactivo.md. | Fase futura post-lanzamiento como integración en API/GIS. |
| **W-04** | Importar el inventario botánico sin coordenadas | REQ 2.11 | Épica C · Catastro verde | Alta | Para decidir quién poda basta la clase de altura (< 5 m / ≥ 5 m), registrada en campo (C-08, C-09). La altura exacta, copa y fuste quedan para enriquecimiento. | Fase futura cuando se realice levantamiento dendrométrico detallado. |
| **W-05** | Seguimiento de ejecución del servicio tercerizado | REQ 4.3 | Épica G · Servicios tercerizados | Media | Seguimiento de contratistas fuera de alcance; no se dispone de reportes de avance ni interfaces con terceros. | Fase futura con módulo específico de contratistas. |
| **W-06** | Checklist de cumplimiento por servicio | REQ 4.6 | Épica G · Servicios tercerizados | Media | El inventario de ~100 jardines deja de ser prioridad. El checklist en papel se conserva; corte de césped se mide por frecuencia (F-03). | Fase posterior tras consolidación del inventario botánico fino. |
| **W-07** | Frecuencia pactada vs. real del tercero | REQ 4.5 | Épica G · Servicios tercerizados | Media | Seguimiento de servicios tercerizados fuera de alcance del MVP. | Fase futura cuando se digitalicen los contratos formales. |
| **W-08** | Registro de contratos de terceros | REQ 4.1 | Épica G · Servicios tercerizados | Media | Seguimiento contractual fuera de alcance; gestión contractual corresponde a Logística/DAF. | Fase futura como referencia documental. |
| **W-16** | Aviso a la unidad solicitante al cerrar incidencia | REQ 5.10 | Épica E · Incidencias | Baja | Las unidades solicitantes no son usuarias directas de Hesperides; su canal formal es Centuria (fuera de alcance). | Fase futura supeditada a integración con sistema Centuria. |

---

## 7. Matriz Resumen de Riesgos Críticos

| ID | Riesgo Identificado | Severidad | Estrategia de Mitigación / Respuesta | Estado |
|:---:|---|:---:|---|:---:|
| **R-01** | Shapes de sectores y secciones no llegan | Crítica | Resuelto el 29 sep: llegó mapa v32 del cliente con 5 sectores y 519 secciones georreferenciadas. | Listo ✅ |
| **R-02** | B-04 no es adoptado por los capataces en campo | Alta | Rediseñar con un capataz delante. El criterio es 'amable', con botones grandes y sin teclado. | Monitoreo 🔶 |
| **R-03** | Sobrecarga de trabajo en Sprint 4 (69 pts) | Alta | Mover H-01 (QR) y las historias de prioridad Baja a backlog post-lanzamiento si no cierran. | Mitigación lista 🔶 |
| **R-04** | Sobrecarga de trabajo en Sprint 3 (86 pts) | Alta | Adelantar B-06, B-07 y B-08 a S1-S2, los cuales cuentan con holgura y no tienen dependencias externas. | Mitigación lista 🔶 |
| **R-05** | Los 817 ejemplares UNKNOWN nunca se miden | Media | Priorizar clasificación de altura de ejemplares que reciben labor (C-09). Registrar clase es 1 toque en móvil. | Monitoreo 🔶 |
| **R-06** | Presión por relajar salvaguarda de C-09 | Alta | Criterio no negociable: evita enviar cuadrilla sin grúa a árbol >5m. Genérico solo se muestra en ficha. | Política estricta ⚠️ |
| **R-07** | Sesión de validación de tipos de incidencia no ocurre | Media | Arrancar con borrador de 8 tipos propuesto más opción 'Otro' con texto libre; promover frecuentes a 2 meses. | Plan B listo 🔶 |
| **R-08** | Alguien insiste en solicitar la matriz confidencial | Baja | No es pendiente del cliente. Resuelto por diseño: pedirla añade riesgo de custodia sin aporte funcional. | Listo ✅ |
| **R-09** | El Product Backlog y el Catálogo de Requisitos divergen | Alta | Principio rector: manda el catálogo de requisitos como fuente de verdad del dominio. Backlog se corrige. | Gobernanza ⚠️ |

---

## 8. Definición de Hecho (Definition of Done — DoD)

| Dimensión de Calidad | Criterio Obligatorio de Aceptación Técnica |
|---|---|
| **Funcionalidad** | Cumple el 100% de los criterios de aceptación especificados, cubriendo tanto el flujo principal como los casos de excepción y errores esperados. |
| **Seguridad** | Autenticación JWT aplicada; autorización RBAC estricta por endpoint y por rol; secretos y credenciales fuera del código fuente. |
| **Datos y consistencia** | Validaciones robustas en backend; no duplicidad innecesaria; trazabilidad de auditoría en cambios y operaciones críticas. |
| **Experiencia de usuario (UX)** | Diseño responsive/PWA optimizado para Android en campo y escritorio en oficina; flujos con el mínimo de pasos; mensajes comprensibles. |
| **Pruebas y calidad** | Casos funcionales principales ejecutados y documentados; defectos resueltos; pruebas unitarias y de integración incorporadas. |
| **Integración** | Manejo de errores resiliente, timeouts configurados, idempotencia de sincronización y trazabilidad ante servicios externos. |
| **Despliegue** | Procedimiento de despliegue reproducible en nube; configuración por ambiente aislada del repositorio; versión demostrable en línea. |
| **Documentación** | Documentación técnica y funcional actualizada con la versión entregada (catálogo, arquitectura, manuales operativos). |
| **Inteligencia Artificial** | Solo se considera Done si el caso de uso aporta valor medible probado, define datos/salida/validación y mantiene supervisión humana estricta. |

---

## 9. Acuerdos y Decisiones Confirmadas del Cliente (C01 a C23)

| ID | Tema | Confirmación Oficial de Negocio | Impacto en Backlog |
|:---:|---|---|---|
| **C01** | Alcance geográfico mínimo | Campus Pando es suficiente para el sistema mínimo; los locales periféricos quedan fuera. | Entrevista 2 L223–L231 |
| **C02** | Usuarios de campo iniciales | Trabajar primero con los 3 capataces/jefes de grupo y el jefe de sección; luego podría extenderse al resto. | Entrevista 1 L389–L405 |
| **C03** | Dispositivos móviles de campo | Los capataces cuentan con celulares institucionales Android. | Entrevista 1 L437–L453; Entrevista 2 |
| **C04** | Estructura de campo y sectores | Existen 3 sectores verdes fijos con cuadrillas asignadas (9, 9 y 7 personas), cada uno bajo un capataz responsable. | Entrevista 2 L235–L247; 3.ª entrevista |
| **C05** | Registro actual de información | La información operativa hoy se consolida en Excel/Drive y se actualiza diaria o semanalmente según la actividad. | Entrevista 1 L93–L109; Entrevista 2 |
| **C06** | Mapa existente institucional | Existe un mapa institucional con varias capas; su integración técnica directa queda como proyecto futuro independiente. | Entrevista 2 L15–L35; Decisión 25 sep |
| **C07** | Evidencia fotográfica en campo | Las intervenciones admiten evidencia fotográfica desde el inicio hasta el cierre; trabajos largos admiten avances. | Entrevista 2 L57–L69 |
| **C08** | Consumo de insumos y materiales | El cliente requiere que el capataz registre consumos de forma ágil y 'amable', minimizando la digitación en teclado. | Entrevista 2 L87; Entrevista 1 |
| **C09** | Taxonomía de actividades | Las actividades se agrupan en 9 clases y 45 tipos del cliente, estructurados en dos niveles configurables. | Entrevista 2 L207–L215 |
| **C10** | Catastro progresivo | El catastro forestal está al 30-35%; el sistema debe ser plenamente operativo sin exigir catastro completo para funcionar. | Entrevista 2 L41–L51 |
| **C11** | Servicios tercerizados en MVP | Solo se gestionan datos básicos de proveedores en MVP; el seguimiento detallado de contratos pasa a fase futura. | Entrevista 1 L71–L89; Decisión 25 sep |
| **C12** | Proveedores en plataforma | El acceso web de contratistas es prescindible para la versión mínima; los proveedores no son usuarios iniciales. | Entrevista 2 L343–L349; Decisión 25 sep |
| **C13** | Dinámica del ciclo de riego | La gestión del riego se organiza por sectores y completa el ciclo en 15-16 días, admitiendo solapamiento jue-vie-sáb. | Entrevista 1 L337–L347; Entrevista 2 |
| **C14** | Métrica de personal destinado | La jefatura requiere conocer cuántas personas se destinan a cada actividad sin obligar a identificar individualmente a cada operario. | Entrevista 1 L411–L421 |
| **C15** | Objetivo estratégico de sección | Optimizar recursos, mantener el campus en óptimo estado agronómico y maximizar la eficiencia del uso del agua. | Entrevista 1 L455–L465 |
| **C16** | Meta de gestión de cobertura | Lograr mensualmente el 100% de cobertura en las 15.6 ha del campus (riego, mantenimiento, perfilado y reposición). | Entrevista 1 L15–L23; Entrevista 2 |
| **C17** | Jerarquía territorial unificada | Estructura formal única: sector → sección → subsección (opcional). No se emplean cuarteles forestales. | 3.ª entrevista (29 sep); SPEC-005 |
| **C18** | Siembra territorial del mapa v32 | Se cargan 5 sectores (3 verdes con cuadrilla, Polideportivo y Bosque húmedo) y 519 secciones del mapa v32 del cliente. | 3.ª entrevista (29 sep); catastro campus.xlsx |
| **C19** | Vigencia de asignación de secciones | La asignación de secciones a sectores tiene vigencia temporal para soportar reubicaciones por obras sin distorsionar el histórico. | 3.ª entrevista (29 sep); SPEC-005 |
| **C20** | Flujo de estados de incidencias | Las incidencias manejan únicamente 3 estados: Reportada, En proceso y Cerrada; las tercerizadas permanecen en proceso. | 3.ª entrevista (29 sep) |
| **C21** | Restricción de maquinaria de corte | El uso de motosierras y maquinaria ruidosa solo se permite sábados, domingos y feriados para no afectar clases. | Entrevista 2; 3.ª entrevista (29 sep) |
| **C22** | Ficha técnica de poda en altura | Toda poda con escalera (< 5 m) exige ficha técnica y prevencionista presente; la poda > 5 m se deriva a contratista. | Entrevista 2; Decisión 25 sep |
| **C23** | Superconjunto de permisos ADMIN | El rol ADMIN incluye todos los permisos de COORDINADOR: el jefe de sección opera con una sola cuenta sin cambiar rol. | Decisión 25 sep; SPEC-100 |