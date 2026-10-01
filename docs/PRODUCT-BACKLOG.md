# Product Backlog — Hesperides

> **Qué es este documento.** El backlog priorizado del producto, en historias de usuario con
> criterios de aceptación. Es la lista de trabajo del equipo; se reordena cada sprint.
>
> **De dónde sale.** Se deriva de [`catalogo-requisitos.md`](dominio/catalogo-requisitos.md), que
> sigue siendo la **fuente de verdad del dominio**. Cada historia cita su requisito de origen
> (`REQ 3.5`) y el dolor del cliente que ataca (`D4`). Si una historia y el catálogo se
> contradicen, **manda el catálogo** y esta lista se corrige.
>
> **Horizonte:** primera versión operativa el **26 de noviembre de 2026**.

---

## Cómo leer este backlog

**Roles del sistema** (SPEC-100, catálogo `ROLE`):

| Rol | Quién es en la realidad del cliente |
|---|---|
| `ADMIN` | El **jefe de sección**. Configura catálogos, usuarios y parámetros. **Incluye todos los permisos de `COORDINADOR`** |
| `COORDINADOR` | Jefatura de la sección. Planifica, consulta reportes, valida |
| `SUPERVISOR` | Capataz / jefe de grupo. Responsable de un sector y su cuadrilla. **Registra desde el móvil** |
| `OPERARIO` | Jardinero. **Se conserva por formalidad, sin cuentas en esta versión** |

> **Usuarios reales de la primera versión:** el jefe de sección (`ADMIN`) y los 3 capataces
> (`SUPERVISOR`). Por eso las historias de campo se escriben «Como `SUPERVISOR`».

**Estimación en story points** (Fibonacci). Referencia del equipo:

| Puntos | Significa |
|---|---|
| **1** | Cambio trivial: un campo, una constante, un catálogo semilla |
| **2** | CRUD simple sobre una entidad existente, sin reglas de negocio |
| **3** | CRUD con validación de negocio, o una pantalla con estado |
| **5** | Entidad nueva con reglas propias, o integración entre dos módulos |
| **8** | Módulo con lógica compleja: geometría, cálculo de cobertura, sincronización |
| **13** | Vertical completa con incertidumbre alta. **Candidata a dividirse antes de entrar a sprint** |

**Estado de construcción**, heredado del catálogo:

- ✅ **Listo** — información suficiente, se puede construir hoy
- 🔶 **Parcial** — se puede empezar; falta un dato para cerrarlo
- 🔒 **Bloqueado** — necesita algo del cliente antes de empezar

> **Los puntos son una propuesta, no un compromiso.** Los fija el equipo en planning. Aquí sirven
> para dimensionar el conjunto y detectar historias demasiado grandes.

---

## Resumen

| | Cantidad |
|---|---|
| Historias en el backlog activo | **54** |
| Historias en el backlog en espera (🔒 / 🔶 críticas) | **3** |
| Historias movidas a fase futura | **8** |
| **Total** | **65** |
| Puntos del backlog activo | **247** |
| Puntos en espera | **15** |

> Recontado el 29 sep sumando los puntos de cada historia. Las cifras anteriores eran estimaciones
> acumuladas y ya no cuadraban con el detalle.
>
> **W-03 (8 pts) se absorbió en A-04** al llegar el mapa v32, igual que W-02 en C-10. A-04 conserva
> sus 8 pts, pero ahora incluye importar 519 polígonos y la capa de supervisión: **reestimar en
> planning**.

**Distribución por sprint propuesto:**

| Sprint | Fechas | Foco | Puntos |
|---|---|---|---|
| **S0** *(cerrado)* | hasta 18 sep | Arquitectura, auth, catálogos, modelo de datos | — |
| **S1** | 19 sep – 6 oct | Habilitadores + registro de intervenciones | 32 |
| **S2** | 7 oct – 24 oct | Catastro con datos reales, canal móvil, insumos | 60 |
| **S3** | 25 oct – 11 nov | Riego, incidencias, ficha del ejemplar, eventos | 86 |
| **S4** | 12 nov – 26 nov | Reportes, tablero, QA y despliegue | 69 |

> ⚠️ **S3 y S4 concentran 155 de los 247 puntos**, y S4 comparte ventana con QA y despliegue. S1
> tiene holgura. Candidatas a adelantar a S1-S2: **B-06, B-07 y B-08** (intervenciones, sin
> dependencias externas). Candidatas a un backlog post-lanzamiento si S4 no cierra: **H-01** (QR, la
> última prioridad), **C-07**, **D-03** y **D-04**.

### Cambios tras la entrega del inventario forestal *(21 sep 2026)*

El cliente entregó `catastro campus.xlsx` — el **inventario forestal georreferenciado**, 962 registros
que corresponden al «30-35% capturado» que documenta el dominio.

| Historia | Cambio |
|---|---|
| **C-08** Procedencia del dato dendrométrico | 🆕 **Nueva.** Introduce `data_source` |
| **C-09** Verificación antes de asignar régimen | 🆕 **Nueva.** Impide que una regla lea altura no medida |
| **C-10** Importar el inventario forestal | 🆕 **Nueva.** Absorbe W-02 |
| **W-02** Catálogo de especies | ✅ **Desbloqueada** — 91 especies reales |
| **W-04** Inventario botánico | ⬆️ **Sube a Alta** — es lo que puede medir los 817 `UNKNOWN` |
| **W-10** Ficha de elemento verde | 🔒 → 🔶 **Parcial** — ya se puede empezar |
| **C-01, E-03** | Incorporan `data_source` en sus criterios |

**Lo que el archivo NO resolvió:** los datos dendrométricos por ejemplar (W-04). **Los shapes de los
3 sectores siguen siendo la entrega que más desbloquea.**

### Decisiones de alcance *(21 sep 2026)*

| Decisión | Efecto |
|---|---|
| **El inventario de ~100 jardines pasa a fase posterior** | W-06 sale del backlog activo. El corte de césped se mide por frecuencia (F-03), no por cobertura de jardines. **No libera los shapes de los 3 sectores**, que siguen haciendo falta |
| **La matriz de incidencias no se comparte — es confidencial** | **Deja de ser un bloqueo.** Nunca necesitamos la matriz, sino la lista de tipos. W-14 se convierte en **E-08**, historia activa en S3 |

> **Sobre la matriz:** conviene decirle al cliente que **no queremos el documento**. Tenerlo nos haría
> custodios de información sensible sin necesidad funcional. Que sea confidencial no es un obstáculo
> del proyecto — es una razón más para no pedirlo.

### Decisiones de alcance *(25 sep 2026)*

Lo que queda fuera, y por qué, está en
[`fuera-de-alcance.md`](dominio/fuera-de-alcance.md).

| Decisión | Efecto |
|---|---|
| **Solo el jefe de sección y los 3 capataces usan el sistema** | `ADMIN` incluye los permisos de `COORDINADOR` (A-02). Las historias «Como `OPERARIO`» pasan a `SUPERVISOR` (B-02, B-04, C-01) |
| **Servicios tercerizados: solo los datos básicos del proveedor** | G-02 se queda. **G-01, W-05, W-07 y W-08 pasan a fase futura** |
| **Sin integración con Centuria** | E-04 se reduce a una **marca de origen** (3 → 1 pt). **W-16 pasa a fase futura** |
| **Incidencias con modelo propio, al estilo TI** | E-01 y E-02 incorporan urgencia por ubicación y el estado «en proceso» |
| **Ficha técnica de poda** | 🆕 **B-11** |
| **Maquinaria de corte solo en domingos y feriados** | 🆕 **E-09**. A-08 incorpora la lista de feriados |
| **Mapa de calor en nuestro modelado** | W-09 sale de la espera como 🆕 **F-06** |
| **QR: dentro, pero es lo último** | H-01 se construye al final de S4 |

**Tras la 3.ª entrevista (29 sep):**

| Decisión | Efecto |
|---|---|
| **Tipo de uso por sección** | 🆕 **C-12** |
| **Eventos del campus:** bloqueantes y de préstamo | 🆕 **A-09** |
| **Jerarquía sector → sección → subsección**, sin cuarteles | A-04 usa solo esas tres palabras |
| **Mapa v32 del cliente:** cada área verde es una sección y trae su responsable | A-04 siembra **5 sectores y 519 secciones**. W-03 sale de la espera (✅) |
| **5 sectores:** Sector verde 01-03, Sector Polideportivo y Sector Bosque húmedo | A-07: solo los tres verdes tienen cuadrilla |
| **Sistema de referencias (30 sep):** 411 referencias oficiales, con jerarquía y alias | A-04 las carga. Las 77 plantas sin especie que venían en la tabla **no se cargan por ahora** |
| **Zonas de supervisión como capa aparte, con supervisor** | A-04 carga las 4 zonas; por ahora las supervisa el coordinador |
| **La asignación de secciones a sectores cambia por obras** | A-07 incorpora vigencia |
| **Incidencias: Reportada, En proceso y Cerrada** | E-02 sin estados intermedios |
| **Plazos por urgencia; con tercero, el pactado** | W-15 sale de la espera como 🆕 **E-10** |
| **La maquinaria también trabaja sábados** | E-09 amplía los días válidos y avisa ante eventos bloqueantes |

**Segunda revisión de pendientes (25 sep):**

| Decisión | Efecto |
|---|---|
| **Sin integración con el mapa del cliente.** Sería otro proyecto | **W-01 pasa a fase futura** |
| **Basta la clase de altura (< 5 m / ≥ 5 m)**, no la medida exacta | **W-04 pasa a fase futura.** C-08 y C-09 operan sobre la clase |
| **La ficha se infiere de `catastro campus.xlsx`** | W-10 sale de la espera como 🆕 **C-11** |
| **El equipo define el criterio del código** | C-03 y H-01 🔶 → ✅ |
| **Valida el jefe de sección; el capataz no** | B-10 🔶 → ✅ |
| **Proveedores con datos de prueba** | G-02 🔶 → ✅ |
| **Reportes: propuesta propia** | W-11, W-12 y W-13 🔒 → 🔶 |

---

# Backlog activo

## Épica A · Habilitadores y configuración *(M1)*

> No atacan ningún dolor, pero sin ellos nada funciona. Van primero por dependencia, no por valor.

---

### A-01 · Gestión de usuarios `REQ 1.1` `HAB` ✅ · **5 pts** · S1

**Como** `ADMIN`
**quiero** dar de alta, editar, desactivar y reactivar cuentas del personal
**para que** el acceso al sistema refleje en todo momento quién trabaja hoy en el campus y con qué rol.

**Criterios de aceptación**
- Un `ADMIN` crea una cuenta con nombre, apellido, correo y rol; el sistema envía las credenciales por correo.
- Un `ADMIN` **nunca** puede escribir directamente la contraseña de una cuenta existente: solo regenerar y reenviar.
- Desactivar una cuenta revoca sus sesiones activas; reactivarla **no** las restaura ni regenera clave.
- Un `SUPERVISOR` solo ve las cuentas de su cuadrilla; una ficha ajena devuelve 404, no 403.
- Si el envío SMTP falla, la cuenta queda en `PENDING_DELIVERY` y el `ADMIN` puede marcar entrega manual.

> Ya especificado en SPEC-100. Esta historia es su implementación.

---

### A-02 · Roles y permisos `REQ 1.2` `HAB` ✅ · **3 pts** · S1

**Como** `ADMIN`
**quiero** que cada rol tenga un alcance definido sobre cada operación
**para que** nadie vea ni modifique lo que no le corresponde.

**Criterios de aceptación**
- Los cuatro roles (`ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO`) existen como ítems del catálogo `ROLE` con `is_system = TRUE`.
- **`ADMIN` incluye todos los permisos de `COORDINADOR`**: el jefe de sección opera con una sola cuenta, sin cambiar de rol.
- Ningún rol de sistema puede borrarse ni renombrarse desde la pantalla de catálogos.
- Cada endpoint declara su autorización; un acceso sin permiso devuelve 403 con el sobre de error estándar.

> **Por qué superconjunto y no varios roles por usuario:** el modelo implementado guarda **un rol
> por usuario** (`users.role_item_id`, un solo `role` en el JWT). El superconjunto resuelve el caso
> real sin tocar SPEC-001 ni SPEC-100.

---

### A-03 · Catálogo de tipos de intervención `REQ 1.4` `HAB` 🔶 · **5 pts** · S1

**Como** `ADMIN`
**quiero** administrar la taxonomía de actividades en dos niveles
**para que** el sistema hable el vocabulario real del cliente sin recompilar.

**Criterios de aceptación**
- Las **9 clases** y los **45 tipos** del cliente están sembrados, con el tipo colgando de su clase (`parent_item_id`).
- Las cuatro clases prioritarias están marcadas con `metadata->priority`.
- Un `ADMIN` puede crear, editar y desactivar tipos; desactivar **no** altera las intervenciones históricas que lo referencian.
- `DECORACION` y `REMOCION_TERRENO` no existen en la taxonomía: fueron valores inventados y se desactivan.

> 🔶 **Falta:** las clases `FITOSANITARIO` e `INSPECCION` están declaradas **sin ningún tipo**. El
> catálogo funciona; esas dos clases quedan vacías hasta que el cliente las desglose (P-10).

---

### A-04 · Catálogo de zonas del campus `REQ 1.6` `HAB` 🔶 · **8 pts** · S1

**Como** `ADMIN`
**quiero** administrar la jerarquía territorial del campus
**para que** cada intervención se registre contra una sección que el personal reconozca.

**Criterios de aceptación**
- La jerarquía es **sector → sección → subsección (opcional)**, con `parent_zone_id`. **Solo se usan esas tres palabras:** no hay cuarteles forestales.
- Los **5 sectores** están sembrados: **Sector verde 01, 02 y 03**, **Sector Polideportivo** y **Sector Bosque húmedo**. Quién los mantiene no es un atributo del sector: lo dice la cuadrilla asignada (A-07), y cada trabajo dice quién lo ejecutó.
- Las **519 secciones** son las áreas verdes del mapa v32 del cliente, con su polígono, superficie, tipo de uso y sector.
- Una subsección es una división interna de una sección; la crea el `ADMIN` si hace falta.
- Las **4 zonas de supervisión** están cargadas en una capa aparte, **cada una con su supervisor** (por defecto, el coordinador). La zona de una sección se calcula por posición.
- Una zona nunca se borra: se desactiva.

- Las **411 referencias oficiales** (edificios, pisos, oficinas, estacionamientos, puertas…) están cargadas, con su categoría configurable, su referencia padre y sus alias. Se buscan sin tildes ni mayúsculas, y un nombre puede repetirse.

> 🔶 **Falta:** el sector de «Jardín Rosales», la única sección sin responsable (P-15), y el
> algoritmo de cercanía que describe dónde ocurrió una incidencia (lo detalla el equipo). Detalle en
> SPEC-005 §4.4.

---

### A-05 · Catálogo de insumos y unidades `REQ 1.10` `REQ 1.11` `HAB` ✅ · **3 pts** · S1

**Como** `ADMIN`
**quiero** administrar la lista de insumos y sus unidades de medida
**para que** el personal de campo registre consumos desde una lista cerrada y comparable.

**Criterios de aceptación**
- Los insumos extraídos del Excel están sembrados (arena, confitillo, abono, plantas, champa, mulch…).
- Las unidades son `und`, `m`, `m²`, `m³`.
- Cada insumo declara su unidad por defecto, que el capataz puede cambiar al registrar.

---

### A-06 · Frecuencias de mantenimiento `REQ 1.7` Media ✅ · **8 pts** · S3

**Como** `COORDINADOR`
**quiero** configurar cada cuánto debe repetirse cada actividad y con qué holgura
**para que** el sistema señale un mantenimiento vencido sin reportar como incumplimiento una desviación justificada por el clima.

**Criterios de aceptación**
- El **criterio de evaluación es configurable** (`DAYS_BETWEEN`, `MIN_PER_YEAR`, `NONE`), no un `enum` en código.
- Cada frecuencia lleva **valor objetivo + tolerancia por actividad**: césped 30 días con 50% (hasta 45), riego 15 con 10%, fitosanitario mínimo 4 al año con 0%.
- **Vigencia temporal:** cambiar una tolerancia cierra la configuración vigente y crea otra. Un periodo ya evaluado conserva su veredicto.
- La poda a demanda se configura con criterio **`NONE` explícito**, no dejándola sin configurar.
- Un tipo sin frecuencia configurada se reporta `NOT_CONFIGURED`, **nunca como incumplido**.

> 📄 **Especificado en [SPEC-006](../specs/fundacionales/SPEC-006-frecuencias-mantenimiento.md).**
> Cierra el pendiente P-03 de SPEC-002.
>
> ⬆️ **Sube de 3 a 8 pts.** El análisis reveló que no es un CRUD: son tres criterios de evaluación
> distintos (intervalo, conteo anual, ninguno), vigencia temporal, evaluadores puros en el Engine y
> pantalla de administración. La estimación de 3 pts asumía una tabla de valores fijos.
>
> ⚠️ **No llamarlo «pactado vs. real» todavía.** Conocemos las frecuencias **operativas** por
> entrevista, pero no si están escritas en los contratos (W-07 pasó a fase futura). Compara contra una
> referencia operativa, no contra una obligación contractual.
>
> La razón de la tolerancia está documentada: en 2026 un «verano eterno» obligó a cortar césped cada
> 30-35 días y a sumar un tercer control fitosanitario. **El clima manda.**

---

### A-07 · Gestión de cuadrillas y sectores `REQ 1.9` **Alta** `D5` `D7` 🔶 · **5 pts** · S2

**Como** `COORDINADOR`
**quiero** definir las cuadrillas y asignar cada una a su sector
**para que** el trabajo y el ciclo de riego tengan un responsable identificable.

**Criterios de aceptación**
- Los **3 sectores verdes** tienen su cuadrilla (9 + 9 + 7 personas) y su `SUPERVISOR`. **Sector Polideportivo** y **Sector Bosque húmedo** no tienen cuadrilla: los atiende un tercero, por contrato o a demanda.
- **El sector es territorio, no persona**: el capataz lo etiqueta pero puede cambiar sin que el sector se mueva. No existe una zona llamada «Alfonso».
- Un `SUPERVISOR` solo ve y registra sobre el sector que tiene asignado.
- **La asignación de una sección a un sector tiene vigencia.** Mover una sección a otro sector cierra la asignación vigente y abre otra; la cobertura de los meses anteriores se sigue contando en el sector que la tenía.

> 🔶 **Falta:** el sector de «Jardín Rosales» (P-15). Los límites ya no faltan: salen del mapa v32.
>
> **Por qué la vigencia:** *«probablemente lo modifiquemos en algunos meses por un tema de
> ejecuciones de obra… pequeñas modificaciones»* (3.ª entrevista).

---

### A-09 · Eventos del campus `REQ 1.12` Media `D5` `D7` ✅ · **5 pts** · S3

**Como** `COORDINADOR`
**quiero** registrar los periodos que afectan al trabajo de campo
**para que** nadie programe trabajo sin saber que ese día hay un examen o que ese jardín está prestado.

**Criterios de aceptación**
- Un evento tiene tipo (**bloqueante** o **préstamo**, catálogo configurable), nombre, fechas de inicio y fin, y **recurrencia** opcional (cada jueves, cada semestre).
- Su ámbito es **todo el campus**, un **sector** o una **sección**.
- **Un evento bloqueante solo avisa:** quien programa trabajo en ese ámbito y esas fechas ve el aviso, pero puede seguir.
- **Un préstamo marca la sección** mientras dura. Al terminar, la sección aparece como **«requiere recuperación»**.

> OSG presta unos 12 jardines de forma recurrente: *«esos espacios nos demandan mucho tiempo para
> recuperarlos»*. Y la sección no programa trabajo ruidoso *«en exámenes de admisión… y menos en
> exámenes de fin de ciclo»* (3.ª entrevista).

---

### A-08 · Parámetros generales `REQ 1.8` Baja ✅ · **2 pts** · S3

**Como** `ADMIN`
**quiero** configurar los parámetros del sistema sin tocar código
**para que** adaptar la instalación a otro cliente no exija un despliegue.

**Criterios de aceptación**
- Nombre de la institución, logo, zona horaria y ventana horaria operativa son configurables.
- La **lista de feriados** es configurable: la consume la regla de maquinaria de corte (E-09).

> **Pasa de S4 a S3** porque E-09 (S3) necesita la lista de feriados.
- **Ninguna referencia a «PUCP» queda escrita en la lógica de negocio.**

---

## Épica B · Intervenciones del personal estable *(M3)*

> El corazón del sistema. Ataca D4 (reporte verbal con intermediario) y D7 (procesos sin formalizar).

---

### B-01 · Registro de actividad diaria `REQ 3.1` **Alta** `D4` `D7` ✅ · **8 pts** · S1

**Como** `SUPERVISOR`
**quiero** registrar la actividad ejecutada por mi cuadrilla
**para que** el trabajo quede documentado sin pasar por un intermediario que lo teclee después.

**Criterios de aceptación**
- El registro captura clase, tipo, zona, fecha, responsable y comentario.
- La zona se elige de la jerarquía territorial; el tipo, de la taxonomía de 9 clases y 45 tipos.
- **Los campos obligatorios son los mínimos**: clase, tipo, zona y fecha. Todo lo demás es opcional.
- Una intervención registrada nunca se borra: se anula dejando rastro.

> **La restricción de diseño más importante de esta historia:** el Excel actual tiene el 81% de
> registros sin estado porque el registro era opcional y pesado. Si exigimos demasiados campos, la
> gente deja de registrar. **Completitud por diseño, no por obligación.**

---

### B-02 · Evidencia fotográfica `REQ 3.3` **Alta** `D4` ✅ · **8 pts** · S2

**Como** `SUPERVISOR`
**quiero** tomar fotos del trabajo de mi cuadrilla desde el móvil, con o sin señal
**para que** nunca pierda evidencia por estar en una zona sin cobertura.

**Criterios de aceptación**
- La foto se guarda **siempre** en el almacenamiento del teléfono al tomarse, con flag `subida_a_la_nube = NO`.
- **Para el capataz nunca existe un «no se pudo guardar».** Guardar y subir son pasos distintos; solo el primero es inmediato.
- Al haber conexión, la app sube las pendientes y cambia el flag a `SÍ`.
- Un **indicador de pendientes arranca encendido** con la primera foto y solo pasa a verde cuando todas llegaron a la nube.
- Sin espacio en el dispositivo: solo un mensaje. **No se gestiona almacenamiento ni se borran fotos subidas.**
- En servidor, `uploaded_at NULL` significa «el dispositivo la tiene, la nube aún no»; `client_reference` da idempotencia en reintentos.

> **Por qué el indicador arranca en rojo:** un indicador que solo avisa de problemas se ignora; uno
> que hay que llevar al verde se mira. Es la garantía de que nadie termina su turno con fotos sin subir.

---

### B-03 · Marcado de zona intervenida en el mapa `REQ 3.4` **Alta** `D1` `D6` ✅ · **8 pts** · S2

**Como** `SUPERVISOR`
**quiero** marcar en el mapa la zona donde intervine
**para que** la ubicación quede registrada sin que nadie la transcriba después.

**Criterios de aceptación**
- La intervención admite coordenadas capturadas desde el móvil o marcadas sobre el mapa en web.
- Si el GPS no está disponible, la zona de la jerarquía territorial basta: **la coordenada es deseable, no obligatoria**.
- Las coordenadas se almacenan como geometría, no como texto.

> **Esta historia es la que automatiza el trabajo manual semanal de la asistencia de sección** (D1).
> Es la de mayor retorno de todo el backlog.

---

### B-04 · Registro de insumos y materiales `REQ 3.5` **Alta** `D4` ✅ · **5 pts** · S2

**Como** `SUPERVISOR`
**quiero** registrar lo que mi cuadrilla consumió en una intervención
**para que** la oficina sepa cuánto insumo se usa realmente.

**Criterios de aceptación**
- El registro es insumo + cantidad + unidad, desde la lista del catálogo.
- Varios insumos por intervención.
- La pantalla es **amable**: lista corta, cantidades con botones, sin teclado cuando se puede evitar.
- Si una intervención consume plantas, se registran como insumo **sin rastrear de qué vivero salieron**.

> **Es un pedido textual del cliente:** *«hoy consumí 5 sacos de arena, hoy consumí 20 sacos de
> confitillo… de alguna forma un poquito amable»*. La palabra «amable» no es decorativa: son
> personas con 30-40 años de oficio, no usuarios de software. **Si les resulta incómoda, no la usarán.**

---

### B-05 · Vista de actividades del día y la semana `REQ 3.7` **Alta** `D1` `D7` ✅ · **5 pts** · S2

**Como** `COORDINADOR`
**quiero** ver qué se hizo hoy y esta semana, por sector y por cuadrilla
**para que** pueda responder qué está pasando en el campus sin abrir un Excel.

**Criterios de aceptación**
- Vista por día y por semana, filtrable por sector, cuadrilla, clase y tipo.
- Un `SUPERVISOR` ve su sector; un `COORDINADOR`, todos.
- Carga en menos de 2 segundos con un año de datos.

---

### B-06 · Actividades sobre varias zonas `REQ 3.10` Media `D6` ✅ · **5 pts** · S3

**Como** `SUPERVISOR`
**quiero** registrar una actividad que cubrió varios lugares a la vez
**para que** el registro refleje la realidad y no me obligue a inventar filas.

**Criterios de aceptación**
- Una intervención admite varias zonas.
- Al importar el histórico, una celda como «Comedor Central, Gastronomía y Matemática» genera una intervención por zona.
- Los reportes de cobertura cuentan la intervención en **cada** zona que tocó, sin duplicar el esfuerzo.

---

### B-07 · Actividades de larga duración `REQ 3.9` Media `D7` ✅ · **5 pts** · S3

**Como** `SUPERVISOR`
**quiero** registrar avances parciales de un trabajo que dura semanas
**para que** un trabajo largo no aparezca como un único registro al final.

**Criterios de aceptación**
- Una intervención puede tener fecha de inicio y fecha de cierre distintas.
- Admite reportes de avance intermedios, cada uno con su fecha y evidencia.
- Mientras no se cierre, aparece como «en curso» en las vistas operativas.

> Caso real del cliente: una nueva área verde junto a las losas de Minas —350 m² de césped, 10
> cerezos japoneses, 105 matas de *Peniceti* reubicadas o divididas— **empezó a fines de junio y
> terminó a principios de septiembre.**

---

### B-08 · Cantidad pedida vs. ejecutada `REQ 3.11` Media `D2` ✅ · **3 pts** · S3

**Como** `COORDINADOR`
**quiero** comparar lo que se pidió contra lo que se ejecutó
**para que** exista un indicador de cumplimiento donde tiene sentido.

**Criterios de aceptación**
- Los campos `requested_quantity` y `executed_quantity` con su unidad **solo aplican a poda a demanda**.
- La poda rutinaria no tiene «pedido»: se hace lo que se ve. Los campos quedan vacíos y **no se reporta incumplimiento**.

---

### B-09 · Asignación de tareas `REQ 3.2` Media `D7` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** asignar una tarea a una cuadrilla desde el sistema
**para que** quede registro de lo encargado, no solo de lo ejecutado.

**Criterios de aceptación**
- Una tarea asignada genera una intervención en estado «pendiente».
- **La orden verbal sigue siendo válida**: el sistema no la sustituye, la documenta cuando se usa.

> Prioridad Media a propósito: hoy la orden verbal **funciona**. Formalizarla no es el dolor.

---

### B-10 · Cierre y validación de actividad `REQ 3.6` Media `D7` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** validar una actividad registrada
**para que** exista un estado confiable de qué está terminado.

**Criterios de aceptación**
- Una intervención transita entre estados del catálogo `INTERVENTION_STATUS`.
- El estado es opcional al registrar: **no bloquea el registro en campo**.
- **Valida el `COORDINADOR`** (y por tanto el `ADMIN`). **El `SUPERVISOR` no valida**: registra, y nadie valida su propio trabajo.
- La validación registra quién validó y cuándo.

> 🔶 → ✅ **Decisión del 25 sep:** valida el jefe de sección. El capataz registra; no valida.

---

### B-11 · Ficha técnica de poda `REQ 3.12` Media `D7` ✅ · **3 pts** · S3

**Como** `SUPERVISOR`
**quiero** registrar la ficha técnica cuando mi cuadrilla poda con escalera
**para que** el trabajo en altura del personal propio quede documentado con su prevencionista.

**Criterios de aceptación**
- La ficha **solo aplica a poda con escalera** (árbol < 5 m). La poda a ras de suelo con tijera telescópica no la lleva.
- Registra herramientas utilizadas, personal que ejecuta y **prevencionista presente**, de la PUCP o del servicio tercerizado EULEN.
- La ficha cuelga de su intervención; una intervención tiene como máximo una ficha.
- Una poda de árbol > 5 m no admite ficha: es trabajo del tercero y se gestiona como incidencia derivada (E-02).

> *«Te caes de 2 metros y medio, 3 metros y medio, la posibilidad de que te fractures el cuello…»*
> (entrevista 2). La ficha es la trazabilidad de seguridad del trabajo en altura.

---

## Épica C · Catastro verde *(M2)*

> Ataca D3 (no existe catastro). La restricción que lo define: **hoy está al 30-35%**, y el sistema
> debe ser útil igual.

---

### C-01 · Registro de elementos verdes en el mapa `REQ 2.2` **Alta** `D3` ✅ · **8 pts** · S2

**Como** `SUPERVISOR`
**quiero** capturar un árbol o elemento verde con su ubicación desde el móvil
**para que** el catastro se complete durante el trabajo diario, sin una campaña aparte.

**Criterios de aceptación**
- Captura de especie, ubicación GPS, tipo de elemento y foto.
- Funciona sin conexión con el mismo modelo de B-02: se guarda local y sube después.
- Un elemento capturado dos veces por error se detecta por proximidad y se ofrece fusionar.
- Un árbol o palmera capturado sin medir la altura nace con `data_source = UNKNOWN` (C-08).
- Medir la altura es opcional en la captura y disponible después desde la ficha.

---

### C-10 · Importar el inventario forestal georreferenciado `REQ 2.13` **Alta** `D3` ✅ · **8 pts** · S2

**Como** `COORDINADOR`
**quiero** cargar el levantamiento de campo que ya existe
**para que** el catastro arranque con datos reales y no con semilla inventada.

**Criterios de aceptación**
- Importa los **962 registros** del archivo `catastro campus.xlsx` (hoja `catastro`).
- Mapea: ubicación, referencia, latitud, longitud, nombre común, nombre científico, forma biológica, cantidad y foto.
- Siembra el catálogo de especies con las **91 especies** distintas encontradas (cubre W-02).
- Siembra el catálogo de formas biológicas con las **6** del archivo.
- Las **12 filas con cantidad > 1** (matas de Pita agrupadas) se importan como agrupación, no como un ejemplar: **962 registros = 985 ejemplares**.
- Todo árbol y palmera nace `data_source = UNKNOWN` (C-08).
- La columna `Código` se importa a `legacy_code` **descartando el literal `"null"`**: de 557 celdas con contenido, solo **46 son códigos reales**.
- La importación es idempotente: repetirla no duplica ejemplares.

**Calidad del archivo, verificada:**

| Aspecto | Estado |
|---|---|
| Columnas núcleo (10) | **100% completas** en los 962 registros |
| Coordenadas duplicadas | **Cero** |
| Rango geográfico | Dentro del campus (lat −12.0738 a −12.0644, lon −77.0830 a −77.0780) |
| Fotos en Drive | 962, una por ejemplar, con referencia única |
| Columna `Código` | 58% llena, pero **solo 46 valores reales**; el resto es el texto `"null"` |
| Columna `FEN 2026` | **1 valor en 962 filas.** Registro fenológico abandonado — no se importa |

> **Lo que este archivo NO trae:** familia botánica, altura, diámetro de copa ni fuste. No sustituye
> al inventario botánico (W-04), que sigue pendiente. Ver la nota de W-04.

---

### C-12 · Tipo de uso de cada sección `REQ 2.14` Media `D6` ✅ · **3 pts** · S2

**Como** `COORDINADOR`
**quiero** clasificar cada sección por su tipo de uso
**para que** pueda ver la cobertura y el desgaste según cómo se usa cada espacio.

**Criterios de aceptación**
- Catálogo configurable `USE_TYPE` sembrado con los seis tipos del mapa del cliente: uso administrativo · manejo sostenible, ahorro de agua · recreativo y descanso · deportivo · institucional · conservación.
- Cada sección tiene un tipo de uso, tomado de la capa de tipos de uso del mapa del cliente.
- Los reportes de cobertura y el mapa de calor (F-06) se pueden filtrar por tipo de uso.

> *«El tipo de uso es una clasificación un poco más práctica… en función al uso y demanda del área
> verde»* (3.ª entrevista).

---

### C-02 · Registro progresivo del catastro `REQ 2.12` **Alta** `D3` ✅ · **5 pts** · S2

**Como** `COORDINADOR`
**quiero** que el sistema funcione con el catastro incompleto
**para que** no tengamos que esperar a tenerlo todo para empezar a usarlo.

**Criterios de aceptación**
- Una intervención se registra contra una **zona** aunque no exista el elemento verde catastrado.
- El avance del catastro es visible como porcentaje (hoy ~1.000 de ~3.500 árboles).
- Ninguna funcionalidad exige catastro completo para operar.

> **Es la historia que hace viable todo el módulo.** Sin ella, el sistema sería inútil hasta que
> alguien termine un levantamiento que hoy va al 30%.

---

### C-08 · Procedencia del dato dendrométrico `REQ 2.3` **Alta** `D3` ✅ · **5 pts** · S2

**Como** `COORDINADOR`
**quiero** saber si la altura de un ejemplar fue medida o solo estimada
**para que** nadie tome una decisión operativa sobre un dato que nadie verificó.

> **Ajuste del 25 sep:** para decidir quién poda basta la **clase de altura** (< 5 m / ≥ 5 m), no la
> medida exacta. `MEASURED` significa que **alguien registró la clase en campo**, no que midió
> con cinta. El inventario botánico (W-04) pasa a fase futura.

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

> **Un matiz:** dentro del arbolado, el campo crítico es **solo la altura**. El diámetro de copa y el
> fuste no deciden régimen por sí solos, así que admiten `GENERIC` sin bloquear nada.

---

### C-09 · Verificación en campo antes de asignar régimen `REQ 2.3` **Alta** `D3` ✅ · **3 pts** · S3

**Como** `COORDINADOR`
**quiero** que el sistema me pida verificar la altura antes de clasificar una poda
**para que** ninguna cuadrilla salga a campo con el equipamiento equivocado.

**Criterios de aceptación**
- La clasificación `< 5 m` / `> 5 m` **solo se resuelve si `data_source = MEASURED`**.
- Con `UNKNOWN` o `GENERIC`, el sistema devuelve **«requiere verificación en campo»**, nunca un régimen.
- Ese estado no bloquea el registro de la intervención: se puede ejecutar y medir en el mismo acto.
- Medir un ejemplar desde el móvil es una acción de un paso, disponible desde la ficha y desde la intervención.
- Un ejemplar `UNKNOWN` que recibe intervención queda señalado como candidato prioritario a medición.

> **Esta historia es la que convierte `data_source` en una salvaguarda y no en un adorno.** Sin ella,
> el campo existe pero nada impide que una regla lea una altura inventada.

---

### C-03 · Código de identificación nuevo para arbolado `REQ 2.9` **Alta** `D3` ✅ · **5 pts** · S3

**Como** `COORDINADOR`
**quiero** que cada ejemplar reciba un código nuevo y confiable
**para que** el inventario deje de depender de placas que ya no son fiables.

**Criterios de aceptación**
- Cada elemento verde recibe un código único generado por el sistema.
- El código es estable: no cambia si el elemento se reclasifica o cambia de zona.

> 🔶 → ✅ **El criterio de codificación lo define el equipo** (decisión del 25 sep).
>
> **Por qué hace falta:** las placas de aluminio actuales están rotas como sistema — hay árboles sin
> placa, placas en ejemplares que ya no existen, y placas reasignadas: *«un código de un eucalipto
> se lo puso a una palmera»*.

---

### C-04 · Conservar el código heredado `REQ 2.10` Media `D3` ✅ · **2 pts** · S3

**Como** `COORDINADOR`
**quiero** guardar el código antiguo junto al nuevo
**para que** se pueda cruzar con los documentos históricos.

**Criterios de aceptación**
- `legacy_code` con índice **no único**: los códigos viejos están duplicados y reasignados.
- El código heredado se muestra como referencia, nunca como identificador.

---

### C-05 · Historial por elemento `REQ 2.7` Media `D7` ✅ · **3 pts** · S3

**Como** `COORDINADOR`
**quiero** ver todas las intervenciones que recibió un ejemplar
**para que** pueda evaluar su manejo a lo largo del tiempo.

**Criterios de aceptación**
- La ficha del elemento lista sus intervenciones en orden cronológico, con fecha, tipo y responsable.

---

### C-06 · Filtros y búsqueda en el mapa `REQ 2.4` Media `D6` ✅ · **5 pts** · S3

**Como** `COORDINADOR`
**quiero** filtrar el mapa por periodo, clase, tipo y responsable
**para que** pueda ver dónde se está interviniendo y dónde no.

**Criterios de aceptación**
- Filtros por mes, clase, tipo y responsable, combinables.
- Buscador por sector y por sección, con nombres reconocibles (facultad, edificio, vía).

> El cliente busca por «Jardines de Ingeniería Civil»: se orienta por referentes, que son las secciones.

---

### C-07 · Registro de campos deportivos `REQ 2.6` Baja `D3` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** registrar las superficies deportivas con vegetación
**para que** entren en la cobertura como el resto de las áreas verdes.

**Criterios de aceptación**
- Un campo deportivo es un tipo de elemento verde con superficie y tipo de césped.

---

### C-11 · Ficha de elemento verde `REQ 2.3` Media `D3` ✅ · **5 pts** · S3

**Como** `COORDINADOR`
**quiero** consultar la ficha de cada ejemplar
**para que** tenga en un solo lugar qué es, dónde está, en qué estado y qué se le hizo.

**Criterios de aceptación**
- Muestra ubicación, referencia, coordenadas, nombre común, nombre científico, forma biológica, cantidad y foto, tal como vienen de `catastro campus.xlsx`.
- Muestra el código nuevo (C-03) y el heredado (C-04).
- Muestra la **clase de altura** (< 5 m / ≥ 5 m / sin clasificar) con su procedencia (C-08).
- Muestra el **estado sanitario** (bueno / regular / malo), editable.
- Lista su historial de intervenciones (C-05).

> 🆕 **Sale de la espera (antes W-10).** Ya no esperamos el «Excel forestal»: los campos se infieren
> del inventario entregado y el equipo propone el resto.

---

## Épica D · Riego *(M7)*

> El proceso mejor estructurado del cliente y **su métrica principal**. Es la única actividad que se
> **planifica y se verifica contra un plan**, no solo se registra.

---

### D-01 · Registro del turno de riego por sector `REQ 7.1` **Alta** `D5` ✅ · **8 pts** · S3

**Como** `SUPERVISOR`
**quiero** registrar el turno de riego de mi sector
**para que** quede constancia de qué se regó y cuándo.

**Criterios de aceptación**
- El turno es semanal por sector, de lunes a sábado.
- El modelo admite el **solapamiento** del tercer sector con los otros dos los jueves, viernes y sábado.
- El ciclo completo del campus se cierra en **15-16 días**.
- Se registra qué zonas del sector se cubrieron en cada turno.

> El cliente lo explica así: **«cada capataz es una electroválvula»**. El riego es manual pero
> funciona como un sistema automatizado por sectores.

---

### D-02 · Cobertura del campus en la ventana de 15 días `REQ 7.2` **Alta** `D5` 🔶 · **8 pts** · S3

**Como** `COORDINADOR`
**quiero** ver qué porcentaje del campus se regó en el ciclo
**para que** pueda demostrar la cobertura sin contarla a mano.

**Criterios de aceptación**
- El indicador muestra cobertura por sector y total, contra la ventana de 15 días.
- Una zona sin regar en el ciclo aparece señalada.

> 🔶 **Falta, y es una definición de negocio, no técnica:** qué cuenta como «zona regada». Sin ese
> criterio el indicador se puede construir pero no se puede calibrar.

---

### D-03 · Control de la ventana horaria `REQ 7.4` Baja ✅ · **2 pts** · S4

**Como** `COORDINADOR`
**quiero** que el sistema conozca la ventana horaria de riego
**para que** un registro fuera de horario sea visible.

**Criterios de aceptación**
- Ventana configurable, por defecto 6:30-7:00 a 11:30.
- Un registro fuera de ventana **se acepta** y se marca; nunca se rechaza.

> **La razón de la ventana no es agronómica:** después de las 11:30 no se riega para que al mediodía
> las áreas verdes estén disponibles para los estudiantes.

---

### D-04 · Registro de horas de bomba `REQ 7.5` Baja ✅ · **2 pts** · S4

**Como** `SUPERVISOR`
**quiero** registrar las horas de bomba del turno
**para que** el consumo quede documentado por estación.

**Criterios de aceptación**
- Referencia: 5.5 h/día en verano, 3 h en invierno. El valor se registra, no se asume.

---

## Épica E · Incidencias *(M5)*

> Ataca D7. **Modelo propio, al estilo de la gestión de incidencias de TI:** no replicamos la
> matriz del cliente, proponemos nuestro flujo de registro, urgencia, estados y cierre. **Las
> incidencias las registra el capataz.**

---

### E-01 · Registro de incidencia `REQ 5.1` **Alta** `D7` ✅ · **5 pts** · S3

**Como** `SUPERVISOR`
**quiero** registrar un problema detectado en el campus
**para que** no dependa de que alguien lo recuerde.

**Criterios de aceptación**
- Captura tipo, zona, urgencia (**alta / media / baja** — tres niveles, no cuatro), descripción y foto.
- **La urgencia la decide el riesgo según la ubicación**, no el tamaño del árbol: el mismo árbol es riesgo bajo en una jardinera retirada y alto sobre una vía de alto tránsito.
- Puede originarse en una inspección de rutina o en un pedido externo.
- Se vincula opcionalmente a un elemento del catastro.

---

### E-02 · Seguimiento de estado `REQ 5.3` **Alta** `D7` ✅ · **5 pts** · S3

**Como** `COORDINADOR`
**quiero** seguir una incidencia hasta su cierre
**para que** ninguna quede olvidada.

**Criterios de aceptación**
- Estados del catálogo, con fecha de cada transición.
- Los estados son **Reportada, En proceso y Cerrada.** La incidencia derivada a un tercero sigue **en proceso** mientras la dirección valida, Logística tramita la orden de compra y el proveedor atiende; el detalle va en comentarios.
- El tablero distingue las que llevan más tiempo abiertas del promedio de su tipo.

> Tiempos reales de referencia: casos simples **1 día, máximo 48 horas**; tercerizado **2-3 semanas
> en el mejor caso, hasta mes y medio** (3.ª entrevista).

---

### E-03 · Asignación por tamaño del árbol `REQ 5.2` Media `D7` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** que el sistema proponga quién atiende según el tamaño
**para que** la regla quede documentada y no dependa del criterio de cada quien.

**Criterios de aceptación**
- **< 5 m → personal estable**; **> 5 m → tercerizado**. La propuesta es editable.
- **La regla solo se aplica si la altura es `MEASURED`** (C-09). Con `UNKNOWN` o `GENERIC` devuelve «requiere verificación en campo».
- Aplica a árboles y palmeras. Arbustos, herbáceas y trepadoras van siempre a personal estable, sin evaluar altura.

> **Es el consumidor principal de `data_source`.** Sobre los 817 árboles y palmeras del inventario
> —hoy todos `UNKNOWN`— esta regla no propondrá régimen hasta que alguien mida.

---

### E-04 · Marca de origen Centuria `REQ 5.8` Baja `D1` ✅ · **1 pt** · S4

**Como** `SUPERVISOR`
**quiero** marcar que una incidencia llegó por Centuria
**para que** se distingan las solicitudes de las unidades de los hallazgos propios.

**Criterios de aceptación**
- El origen se registra con el catálogo `INCIDENT_SOURCE`; uno de sus valores es Centuria.
- Registrar a mano una solicitud de Centuria es **opcional**: el sistema no se conecta a Centuria.

> ⬇️ **Reformulada (25 sep):** antes guardaba el código externo. Sin acceso a Centuria, basta la
> marca; cuando llegue la integración (fase futura) las incidencias históricas ya estarán
> identificadas.

---

### E-05 · Distinguir hallazgo de mantenimiento rutinario `REQ 5.9` Media `D7` ✅ · **2 pts** · S4

**Como** `COORDINADOR`
**quiero** distinguir un hallazgo de una actividad programada
**para que** los indicadores no mezclen lo reactivo con lo planificado.

**Criterios de aceptación**
- Cada intervención declara su origen (catálogo `INTERVENTION_ORIGIN`).

---

### E-06 · Vinculación con el catastro `REQ 5.4` Media `D3` `D7` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** ligar una incidencia al ejemplar afectado
**para que** su historial muestre los problemas que tuvo.

**Criterios de aceptación**
- La vinculación es opcional: una incidencia puede registrarse sobre una zona sin elemento catastrado.

---

### E-07 · Historial de incidencias `REQ 5.5` Media `D7` ✅ · **2 pts** · S4

**Como** `COORDINADOR`
**quiero** consultar las incidencias pasadas con sus filtros
**para que** pueda identificar zonas problemáticas recurrentes.

**Criterios de aceptación**
- Listado filtrable por zona, tipo, prioridad y periodo, exportable.

---

### E-08 · Catálogo de tipos de incidencia `REQ 5.7` `HAB` ✅ · **3 pts** · S3

**Como** `ADMIN`
**quiero** administrar los tipos de incidencia desde el sistema
**para que** el catálogo refleje la realidad del cliente sin que nos entreguen su matriz confidencial.

**Criterios de aceptación**
- El catálogo `INCIDENT_TYPE` se siembra con una **lista propuesta por el equipo y corregida por el cliente en sesión**.
- El cliente puede crear, renombrar y desactivar tipos desde `/admin/catalogs` **sin intervención del equipo de desarrollo**.
- Un tipo desactivado desaparece de los formularios nuevos **sin alterar las incidencias históricas** que lo referencian.
- El registro de incidencia admite un tipo «Otro» con texto libre, para no bloquear a quien reporta algo que no está en la lista.
- **Revisión a los dos meses de uso:** los textos libres más frecuentes se promueven a tipos formales.

**Por qué esto ya no está bloqueado**

El cliente confirmó que la **matriz de control de incidentes no se puede compartir**: contiene
información sensible que se maneja con la jefatura. **Eso no bloquea nada, porque nunca necesitamos
la matriz.** Necesitamos la lista de categorías, que es un subconjunto sin datos sensibles.

Conviene decírselo explícitamente al cliente: **no queremos el documento.** Tenerlo nos haría
custodios de información confidencial sin ninguna necesidad funcional, con la responsabilidad que
eso implica. Que sea confidencial no es un obstáculo del proyecto — es una razón más para no pedirlo.

**Cómo se obtiene la lista, en orden de preferencia:**

| | Vía | Qué exige | Cuándo usarla |
|---|---|---|---|
| **1** | **Llevar una lista propuesta y que la corrija en sesión** | 15 min de reunión | **Preferida.** Corregir es más rápido que redactar |
| **2** | **Taller de enumeración** — el cliente lista categorías sin casos ni ubicaciones | 30 min de reunión | Si la lista propuesta queda corta |
| **3** | **Que el cliente cargue los tipos él mismo** desde la pantalla de catálogos | Trabajo del cliente | Si prefiere no reunirse. No nos enseña nada |
| **4** | **Catálogo mínimo + «Otro» que se promueve con el uso** | Nada del cliente | Respaldo si ninguna de las anteriores ocurre |

> El cliente ya dijo que **puede comentar la matriz, no entregarla**. La vía 1 es exactamente lo que
> él mismo ofreció.

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

> ⚠️ **Ninguna de estas entradas proviene de la matriz confidencial.** Todas se derivan de los
> criterios de trabajo que el cliente explicó en entrevista y que ya están documentados en
> [`docs/dominio/README.md`](dominio/README.md).

---

### E-10 · Plazos y avisos de incidencias `REQ 5.6` Media `D7` ✅ · **5 pts** · S4

**Como** `COORDINADOR`
**quiero** que el sistema me avise cuando una incidencia está por vencer su plazo
**para que** ninguna quede fuera de plazo sin que me entere.

**Criterios de aceptación**
- **Personal estable:** el plazo depende de la **urgencia** y es configurable. Valores iniciales propuestos: alta 24 h, media 48 h, baja 72 h.
- **Tercero:** el plazo es el **pactado previamente** con el proveedor y se registra al derivar la incidencia.
- La incidencia se marca **«vence hoy»** el día del vencimiento y **«fuera de plazo»** al pasarlo; en ese momento se avisa al `COORDINADOR`.
- El reporte mensual muestra el porcentaje de incidencias atendidas en plazo.

> 🆕 **Sale de la espera (antes W-15).** Referencia del cliente: *«por lo general un día, máximo 48
> horas»* (3.ª entrevista). Los valores iniciales se confirman con él.

---

### E-09 · Maquinaria de corte solo en sábados, domingos y feriados `REQ 5.11` Media `D7` ✅ · **3 pts** · S3

**Como** `COORDINADOR`
**quiero** que el sistema solo admita sábados, domingos y feriados como fecha de una atención con maquinaria de corte
**para que** ningún servicio con motosierra interrumpa la actividad académica.

**Criterios de aceptación**
- Al programar la atención de una incidencia derivada a un tercero con maquinaria de corte, la fecha debe ser **sábado, domingo o feriado**; un día de lunes a viernes que no sea feriado se rechaza con un mensaje claro.
- Los feriados salen de la lista configurable de A-08.
- Si la fecha cae en un **evento bloqueante** (A-09) del mismo ámbito, el sistema **avisa**, pero no impide.
- La regla no aplica al trabajo del personal estable sin maquinaria.

> *«Imagínate, estás haciendo tu clase, tu profesor está que habla y suena una motosierra al
> costado»* (entrevista 2).

---

## Épica F · Reportes y analítica *(M6)*

> Ataca D5 (cuesta demostrar cobertura) y D6 (no se puede equilibrar el mantenimiento).

---

### F-01 · Dashboard general `REQ 6.1` **Alta** `D1` `D5` ✅ · **8 pts** · S4

**Como** `COORDINADOR`
**quiero** un tablero con el estado del mes
**para que** pueda responder cómo va la sección sin construir el dato.

**Criterios de aceptación**
- Muestra cobertura mensual, cumplimiento de frecuencias, intervenciones por sector e incidencias abiertas.
- Carga en menos de 3 segundos.
- Cada indicador es navegable hasta el detalle que lo compone.

---

### F-02 · Cobertura mensual del 100% de las 15.6 ha `REQ 6.8` **Alta** `D5` 🔶 · **8 pts** · S4

**Como** `COORDINADOR`
**quiero** ver qué porcentaje del área verde recibió atención este mes
**para que** pueda demostrar la meta que ya reporto hacia arriba.

**Criterios de aceptación**
- El indicador contrasta superficie atendida contra las 15.6 ha totales.
- Distingue las cuatro dimensiones de la meta: riego, mantenimiento, perfilado y reposición de plantas.
- Las zonas no cubiertas son visibles en el mapa, no solo un número.

> 🔶 **Falta:** qué cuenta como «zona cubierta». Es la misma definición pendiente de D-02.
>
> Meta textual del cliente: *«al mes tenemos que llegar al 100% de esa cobertura, con su riego, su
> mantenimiento, su perfilado, su reemplazo de plantas si lo requieren»*.

---

### F-03 · Cumplimiento de frecuencias por servicio `REQ 6.10` **Alta** `D2` `D5` ✅ · **5 pts** · S4

**Como** `COORDINADOR`
**quiero** comparar la frecuencia pactada contra la real
**para que** pueda ver si un servicio se está cumpliendo.

**Criterios de aceptación**
- Compara contra el **rango** configurado en A-06, no contra un valor fijo.
- Una desviación justificada por estación se puede anotar sin alterar el histórico.

---

### F-04 · Filtros por zona, período y tipo `REQ 6.6` Media `D6` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** filtrar cualquier reporte por zona, período y tipo
**para que** pueda responder preguntas concretas sin pedir un desarrollo.

**Criterios de aceptación**
- Los filtros son consistentes en todos los reportes y se conservan al navegar al detalle.

---

### F-05 · Exportación de reportes `REQ 6.5` Media `D1` ✅ · **5 pts** · S4

**Como** `COORDINADOR`
**quiero** exportar un reporte a PDF y Excel
**para que** pueda adjuntarlo a lo que entrego a la oficina.

**Criterios de aceptación**
- La exportación respeta los filtros aplicados e incluye fecha de generación y autor.

---

### F-06 · Mapa de calor de intervenciones `REQ 6.9` Media `D6` ✅ · **5 pts** · S4

**Como** `COORDINADOR`
**quiero** ver en el mapa qué zonas concentran más intervenciones y cuáles menos
**para que** pueda programar más atención donde falta y equilibrar el mantenimiento.

**Criterios de aceptación**
- Mapa de calor sobre el mapa propio del sistema, alimentado por las intervenciones registradas.
- Filtrable por periodo, clase y tipo (F-04).

> 🆕 **Sale de la espera (antes W-09).** El cliente ya tiene un mapa de calor en su mapa, pero
> decidimos incluirlo en nuestro modelado: es *«la función principal de la herramienta que ya
> usan»*.

---

## Épica G · Servicios tercerizados *(M4)*

> **En esta versión solo se registran los datos básicos del proveedor.** El seguimiento de los
> servicios pasa a fase futura: no tenemos información de ello (ni un contrato ni un informe de
> proveedor).

---

### ~~G-01 · Calendario de servicios programados~~ `REQ 4.7` `D2` ⏭️ **FASE FUTURA**
Es seguimiento de los servicios tercerizados (decisión del 25 sep).

---

### G-02 · Registro de proveedor `REQ 4.2` Media `D2` ✅ · **3 pts** · S4

**Como** `ADMIN`
**quiero** registrar las empresas contratadas
**para que** los servicios tengan un responsable identificable.

**Criterios de aceptación**
- **Solo datos básicos** de la empresa: razón social, RUC, contacto y servicios que presta.
- El modelo admite una empresa principal y una subsidiaria relacionada.
- El proveedor **no** es usuario del sistema.
- Se siembra con **datos de prueba**, suficientes para mostrar que funciona.

---

## Épica H · Información pública (QR) *(M8)*

> **Dentro del alcance, pero es la última prioridad:** se construye al final de S4, si hay capacidad.

---

### H-01 · Generación de QR por elemento `REQ 8.1` Baja `D3` ✅ · **3 pts** · S4

**Como** `COORDINADOR`
**quiero** generar un QR por ejemplar
**para que** la comunidad pueda consultar su ficha.

**Criterios de aceptación**
- El QR apunta a la ficha pública y se genera a partir del código nuevo (C-03).

> Depende de C-03, cuyo criterio define el equipo.
>
> **Un antecedente que conviene recordar:** las placas de aluminio fracasaron —se perdieron, quedaron
> en ejemplares muertos y se reasignaron. Cualquier etiqueta física hereda ese riesgo.

---

# Backlog en espera

> **Historias que no pueden empezar** hasta que llegue información del cliente. Están aquí para que
> nadie las dé por olvidadas y para que se vea **qué desbloquea qué**.

## Qué desbloquea más cosas

| Lo que falta | Desbloquea | Estado |
|---|---|---|
| ~~Los shapes de los sectores~~ | ~~A-04 · A-07 · W-03 · D-02~~ | ✅ **Llegó el mapa v32** (29 sep). Solo queda el sector de «Jardín Rosales» (P-15) |
| ~~Un contrato + un reporte de proveedor~~ | ~~W-05 · W-07 · W-08~~ | ⏭️ **Fase futura** — seguimiento de tercerizados fuera de alcance |
| **Validar la propuesta de reportes** | W-11 · W-12 · W-13 | 🔄 Propuesta propia |
| ~~Inventario de ~100 jardines~~ | ~~W-06~~ | ⏭️ **Fase posterior** — ya no es prioridad |
| ~~La matriz de incidencia~~ | ~~W-14~~ | ✅ **Ya no bloquea** — nunca la necesitamos (E-08) |

---

### ~~W-01 · Integración con el mapa interactivo existente~~ `REQ 2.8` `D1` ⏭️ **FASE FUTURA**
Decisión del 25 sep: la integración con el mapa del cliente sería **otro proyecto**. El análisis
queda en [`integracion-mapa-interactivo.md`](dominio/integracion-mapa-interactivo.md).

### ~~W-02 · Catálogo de especies~~ `REQ 1.5` `HAB` ✅ **DESBLOQUEADA** → pasa a C-10
El inventario forestal entregado trae **91 especies** con nombre común y científico, y **6 formas
biológicas**. Ya no hay que esperar: la siembra del catálogo es parte de C-10 (S2).

### W-03 · Carga de capas y sectores del campus `REQ 2.5` Media `D1` ✅ **DESBLOQUEADA** → se carga en A-04
**Llegó el mapa v32 del cliente** (29 sep): 521 áreas verdes, cada una con su responsable, y las 4
zonas de supervisión. La carga es la semilla de A-04 (SPEC-005 §4.4).

### ~~W-04 · Importar el inventario botánico sin coordenadas~~ `REQ 2.11` `D3` ⏭️ **FASE FUTURA**
Para decidir quién poda basta la **clase de altura** (< 5 m / ≥ 5 m), que se registra en campo
(C-08, C-09). La altura exacta, la copa y el fuste quedan como enriquecimiento futuro.

### ~~W-05 · Seguimiento de ejecución del servicio tercerizado~~ `REQ 4.3` `D2` ⏭️ **FASE FUTURA**
Seguimiento de tercerizados fuera de alcance (25 sep).

### ~~W-06 · Checklist de cumplimiento por servicio~~ `REQ 4.6` `D2` ⏭️ **FASE POSTERIOR**
**Decisión del equipo (21 sep 2026): el inventario de ~100 jardines deja de ser prioridad.** El
checklist ya existe en papel —es la lista que se marca durante el corte de césped— y seguirá así
en esta fase.

> **Qué se pierde mientras tanto:** el corte de césped queda sin su unidad de control. Se registra
> que se cortó y en qué zona, pero **no se puede marcar «37 de los 100 jardines»**. El cumplimiento
> del servicio se mide por frecuencia (F-03), no por cobertura de jardines.
>
> **Ojo:** esto **no** libera los shapes de los **3 sectores**, que siguen haciendo falta para A-04,
> A-07 y D-02. Lo que sale de alcance son los ~100 jardines, no toda la entrega de shapes.

### ~~W-07 · Frecuencia pactada vs. real del tercero~~ `REQ 4.5` `D2` `D5` ⏭️ **FASE FUTURA**
Seguimiento de tercerizados fuera de alcance (25 sep).

### ~~W-08 · Registro de contratos~~ `REQ 4.1` `D2` ⏭️ **FASE FUTURA**
Seguimiento de tercerizados fuera de alcance (25 sep).

### ~~W-09 · Mapa de calor de intervenciones~~ `REQ 6.9` `D6` ✅ **DESBLOQUEADA** → pasa a F-06
Decisión del 25 sep: entra en nuestro modelado.

### ~~W-10 · Ficha de elemento verde~~ `REQ 2.3` `D3` ✅ **DESBLOQUEADA** → pasa a C-11

### W-11 · Reporte operativo `REQ 6.2` Media `D1` 🔶 · **5 pts**
**Propuesta propia**, pendiente de validar con el cliente.

### W-12 · Reporte de coordinación `REQ 6.3` Media `D1` 🔶 · **5 pts**
Ídem.

### W-13 · Reporte de dirección `REQ 6.4` Media `D1` 🔶 · **5 pts**
Ídem. Conviene contrastarla con el **documento de gestión** que la sección entrega a OSG, si lo
comparte.

### ~~W-14 · Catálogo de tipos de incidencia~~ `REQ 5.7` `HAB` ✅ **DESBLOQUEADA** → pasa a E-08
**El cliente confirmó que la matriz de incidencias no se comparte: contiene datos confidenciales.**
Eso deja de ser un bloqueo, porque **nunca necesitamos la matriz** — necesitamos la lista de tipos.
Ver **E-08**.

### ~~W-15 · Notificaciones de incidencias urgentes~~ `REQ 5.6` `D7` ✅ **DESBLOQUEADA** → pasa a E-10

### ~~W-16 · Aviso a la unidad solicitante al cerrar~~ `REQ 5.10` `D7` ⏭️ **FASE FUTURA**
Las unidades no son usuarias y su canal es Centuria, que queda fuera de alcance (25 sep).

---

# Fuera del backlog

> Existe en el dominio pero **no se construye ahora**. El detalle, con motivo y lo que el diseño
> actual no debe impedir, está en [`fuera-de-alcance.md`](dominio/fuera-de-alcance.md).

**Fase futura — se planea incluir:**

| Qué | Historias o requisitos afectados |
|---|---|
| **Inventario de ~100 jardines** | W-06 · `REQ 4.6` |
| **Seguimiento de los servicios tercerizados** | G-01 · W-05 · W-07 · W-08 · `REQ 4.4` `4.8` `4.9` `4.10` `6.7` |
| **Proveedores tercerizados como usuarios** | — |
| **Integración con Centuria** | W-16 · `REQ 5.10` |
| **Integración con el mapa del cliente** — sería otro proyecto | W-01 · `REQ 2.8` |
| **Inventario botánico** (altura exacta, copa, fuste) | W-04 · `REQ 2.11` |
| **Operarios y resto del personal como usuarios** | — |
| **Rehabilitación de jardines e intensidad de uso** | — |
| **Vivero** | — ⚠️ La clase «Propagación y plantación» **sí permanece** en la taxonomía |
| **Zoocriadero** | — |
| **Inventario de plagas y productos agronómicos** | — |
| **Migración de las fotos históricas del Drive** | — |
| **Trazabilidad de material reutilizado** | — |
| **Enlace con la ortofoto del campus** | — |
| **Residuos vegetales como módulo propio** | — Mientras tanto, queda cubierto dentro de la Épica B |

**No se planea incluir:** locales periféricos · áreas fuera de los muros · riego automatizado
(pero **no diseñar nada que lo impida**) · riego de los campos deportivos · reemplazar el mapa del
cliente · tramitar órdenes de compra · generar códigos OSG o de Centuria · adoptar la matriz de
incidencias del cliente · levantar el catastro · control de maquinaria y combustible · cuarteles
forestales (el modelo usa solo sector, sección y subsección) · app para iOS.

---

## Riesgos del backlog

| Riesgo | Señal temprana | Respuesta |
|---|---|---|
| ~~Los shapes no llegan~~ | — | **Resuelto (29 sep):** llegó el mapa v32, y el propio mapa dice el sector de cada sección |
| **B-04 no lo adoptan los capataces** | Pocos registros de insumo en la primera semana de uso real | Rediseñar con un capataz delante. **El criterio es «amable», no «completo»** |
| **Sobrecarga de S4** | 69 puntos con QA y despliegue en la misma ventana | Mover H-01 y las historias Baja a un backlog post-lanzamiento |
| **Sobrecarga de S3** | 86 puntos, el sprint más cargado | Adelantar B-06, B-07 y B-08 a S1-S2, que tienen holgura |
| **Los 817 `UNKNOWN` nunca se miden** | E-03 nunca propone régimen; el equipo empieza a ignorar «requiere verificación» | Priorizar la clasificación de los ejemplares que reciben intervención (C-09). Registrar la clase de altura es un toque en el móvil, no una medición |
| **Presión por relajar C-09** | Alguien propone usar genéricos «solo para estimar» en reglas | El criterio no es negociable: manda una cuadrilla sin grúa a un árbol de 12 m. El genérico se muestra, no se consume |
| **La sesión de tipos de incidencia no ocurre** | E-08 llega a S3 sin lista corregida | Arrancar con el borrador propuesto más «Otro» con texto libre, y promover los frecuentes a los dos meses (vía 4) |
| **Alguien vuelve a pedir la matriz confidencial** | Aparece en una minuta como pendiente del cliente | **No es un pendiente.** Está resuelto por diseño: pedirla añade riesgo de custodia sin aportar nada funcional |
| **El backlog y el catálogo divergen** | Una historia contradice a su requisito | **Manda el catálogo.** Esta lista se corrige, no al revés |

---

> *Derivado de [`catalogo-requisitos.md`](dominio/catalogo-requisitos.md) · Hesperides, PUCP 2026.*
