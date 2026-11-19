# Hesperides — Documento de Kick-Off

> **Qué es este documento.** La base del speech de arranque del proyecto: el problema que
> resolvemos, qué construimos, cómo se mide el éxito y qué necesitamos para lograrlo.
> No es un documento técnico — la arquitectura vive en `specs/`, el dominio en `docs/dominio/`.
>
> **Cliente de referencia:** Sección de Áreas Verdes y Medio Ambiente, PUCP.
> **Horizonte:** cierre de la primera versión operativa el **26 de noviembre de 2026**.

---

## 1. Problema y contexto

Una organización que administra un patrimonio vivo y disperso no puede gestionarlo con hojas de
cálculo, y sin embargo casi todas lo hacen. Nuestro cliente de referencia administra **41 hectáreas
de campus, de las cuales 15.6 son áreas verdes y unos 3.500 son árboles**, con un equipo de
aproximadamente 30 personas. Todo el registro de ese trabajo —qué se hizo, dónde, quién lo hizo, con
qué insumos— vive hoy en **hojas de Excel repartidas en varios Google Drives sin conexión entre sí**,
que llena a mano el jefe de sección o su practicante. No hay herramienta que cruce esa información:
para responder una pregunta tan simple como *«¿cuándo se intervino por última vez en Ingeniería
Civil?»* hay que abrir el archivo que toque y buscar a ojo.

El síntoma se ve en los datos que ya analizamos. De los 283 registros de 2026, el **81% no tiene
estado**, el **63% no tiene coordenadas** y el **38% no tiene responsable**; abril entero no tiene ni
una sola fila. Eso no es descuido del equipo: es lo que ocurre inevitablemente cuando el registro es
opcional, manual y está separado de quien ejecuta el trabajo. Existe además un mapa interactivo del
campus que las tres secciones de la Oficina de Servicios Generales consultan, pero **se alimenta
copiando datos del Excel a mano, una vez por semana**. Ese trabajo de transcripción es el cuello de
botella más visible de toda la operación.

El problema real no es registrar actividades. Es que **no existe una información maestra**: una sola
fuente confiable sobre el estado del patrimonio verde, contra la cual planificar, justificar
presupuesto y demostrar lo que se hizo. Y esta situación no es exclusiva de una universidad limeña
—es la condición por defecto de cualquier institución que administre áreas verdes, arbolado urbano o
infraestructura distribuida: municipios, clubes, campus corporativos, concesionarias de parques.

---

## 2. Objetivos y beneficios esperados

**El objetivo central es convertir un registro disperso y opcional en una fuente única y confiable**,
y hacerlo sin que el equipo de campo pague el costo. Todo lo demás se deriva de ahí.

Tres beneficios concretos, en el orden en que el cliente los valora:

**Visibilidad de la operación.** Hoy la jefatura ve el producto final del trabajo, no el proceso. Con
Hesperides puede responder en segundos dónde se está interviniendo, qué zonas reciben mucha atención
y cuáles ninguna, y con qué frecuencia real —no la teórica— se cumple cada ciclo. Eso convierte la
gestión de áreas verdes en algo que se puede discutir con números frente a una dirección
administrativa.

**Trazabilidad ante terceros y ante la autoridad.** Una parte creciente del trabajo está tercerizada:
poda de altura, control fitosanitario y corte de césped los ejecutan empresas contratadas. El cliente
lo resume con precisión: *«lo que se controla es el producto final»*. Recibe un informe al terminar,
pero no tiene cómo contrastar rendimientos. A eso se suman obligaciones formales —el zoocriadero
reconocido oficialmente exige **inventarios anuales al Ente Técnico Forestal**. Un sistema con
histórico auditable convierte ambas cosas en una consulta, no en una reconstrucción.

**Reducción de riesgo institucional.** El riesgo que de verdad preocupa a la jefatura no es
económico: es de seguridad. Veredas antiguas de piso lucido que con garúa o salpicadura de aspersor
se vuelven resbaladizas; ramas que pueden caer sobre vías peatonales transitadas. La lógica de poda
del cliente lo dice todo: *«en el bosque las ramas caen, pero no hay nadie abajo»*. Un registro
georreferenciado de intervenciones, con evidencia fotográfica y fecha, es la documentación que hoy no
existe si algo ocurre.

> **Una precisión que sostiene la credibilidad de este pitch.** Preguntamos directamente al cliente
> si hay pérdidas económicas por la gestión actual. **Dijo que no**: no pierde ejemplares por plagas
> desatendidas, y ya obtuvo ahorros al ordenar el ciclo de riego. No vamos a inventar un retorno que
> la evidencia no respalda. **El valor de Hesperides es control, trazabilidad y reducción de riesgo**
> —y es un valor que el cliente pidió explícitamente, que es exactamente la clase de demanda que
> sostiene a un producto.

---

## 3. Propuesta de solución

Hesperides es una **plataforma de gestión de patrimonio verde** con tres puntos de contacto, cada uno
diseñado para una persona distinta.

Una **aplicación web** para la jefatura y el equipo administrativo: es donde vive la información
maestra. Registro de intervenciones sobre el catastro georreferenciado, catálogos de actividades,
seguimiento de incidencias, tableros de cobertura y reportes. Una **aplicación móvil Android** para
el personal de campo, con un principio de diseño no negociable: **para el operario nunca existe un
«no se pudo guardar»**. La foto se toma y se guarda siempre en el teléfono, con o sin señal; cuando
hay red, sube sola. Un indicador arranca encendido con la primera foto y solo pasa a verde cuando
todas llegaron a la nube. Y un **motor de datos** que alimenta automáticamente el mapa interactivo
que el cliente ya usa, eliminando la carga manual semanal.

Esa última pieza merece énfasis porque define nuestra postura: **no reemplazamos el mapa del cliente,
nos integramos con él.** Ya funciona, ya lo comparten tres secciones, ya tiene mapa de calor y
filtros. Competir con una herramienta que la gente ya adoptó es la forma más rápida de que un sistema
nuevo no se use.

[aquí debe ir el diagrama de arquitectura general — tres capas: web + móvil → API → base de datos
georreferenciada, con la integración lateral hacia el mapa interactivo del cliente]

[aquí debe ir el mockup de la pantalla principal — mapa del campus con las intervenciones del mes
y el panel de filtros por clase de actividad, responsable y periodo]

**Lo que hace a Hesperides un producto y no un encargo:** desde la primera línea de arquitectura, el
sistema se construyó sobre **catálogos configurables**. Los tipos de actividad, estados, roles,
unidades y categorías no están escritos en el código: son datos que un administrador edita desde la
propia aplicación, sin recompilar ni desplegar. Adaptar Hesperides a un municipio con otra taxonomía
de mantenimiento no es un proyecto de desarrollo, es una sesión de configuración. La regla que lo
garantiza está escrita en las invariantes del proyecto: **ninguna referencia a «PUCP» en la lógica de
negocio**.

---

## 4. Alcance y fuera de alcance

Delimitar esto el primer día es lo que evita que un proyecto de ocho semanas se convierta en uno de
ocho meses.

### Sí incluye

| Ámbito | Detalle |
|---|---|
| **Cobertura territorial** | Campus completo: las 15.6 ha de áreas verdes |
| **Taxonomía de trabajo** | Las **9 clases y 45 tipos** de actividad reales del cliente, no una simplificación |
| **Catastro georreferenciado** | Jerarquía sector de mantenimiento (3) → lugar (74) → jardín (~100), con el vocabulario heredado conservado para leer el inventario antiguo |
| **Registro de intervenciones** | Con responsable, zona, evidencia fotográfica, cantidad pedida vs. ejecutada e insumos consumidos |
| **Gestión de incidencias** | Con los dos sistemas de códigos que el cliente ya maneja y sus tres niveles de urgencia |
| **Canal móvil** | Android: evidencia fotográfica, insumos y captura de elementos del catastro |
| **Reportes y cobertura** | Contra las metas que la jefatura ya reporta hacia arriba |
| **Integración con el mapa** | Publicación automática hacia el mapa interactivo existente |
| **Auditoría** | Histórico completo; las entidades nunca se borran físicamente |

### No incluye (y por qué)

| Fuera de alcance | Razón |
|---|---|
| **Locales periféricos** | Solo dos sedes, atención trimestral. *«La mayor dinámica es el campus»* |
| **Áreas fuera de los muros** | Son retiros municipales de San Miguel: no son patrimonio del cliente |
| **Riego automatizado** | Electroválvulas y aspersores son proyectos de Infraestructura a 1-3 años, con presupuesto ajeno |
| **Gestión del vivero** | La propagación en campo sí entra como actividad; el control de stock del vivero no |
| **Zoocriadero** | Es fauna, no flora. Decisión de alcance aún abierta con el cliente |
| **Reemplazar el mapa interactivo** | Ya existe y funciona. Nos integramos |
| **Digitalizar los contratos de terceros** | El sistema registra la ejecución y la conformidad, no tramita órdenes de compra |

> **Un supuesto que conviene declarar en voz alta:** el catastro del cliente está **al 30-35%**
> (unos 1.000 árboles ubicados de ~3.500). Hesperides entrega **la herramienta para completarlo y
> mantenerlo**, no el levantamiento en sí, que depende del personal de campo del cliente y de un
> proyecto de ortofoto con dron que avanza en paralelo.

---

## 5. KPI's / Indicadores de éxito

Cuatro indicadores. Los dos primeros miden si el sistema resuelve el problema; los dos últimos, si el
producto es viable más allá de este cliente.

**KPI 1 — Completitud del registro: de 19% a 90%.** Hoy el 81% de los registros no tiene estado y el
63% no tiene coordenadas. El objetivo es que **al menos el 90% de las intervenciones registradas en
el sistema tengan zona, responsable, estado y evidencia**. Es el indicador más honesto que existe:
mide si la gente usa la herramienta de verdad. Y tiene una contracara que vigilamos activamente —si
el sistema exige demasiados campos obligatorios, la gente deja de registrar. La meta es completitud
por diseño, no por obligación.

**KPI 2 — Latencia de actualización del mapa: de 7 días a menos de 1 hora.** Hoy el mapa se alimenta
con carga manual semanal. La meta es que una intervención registrada en campo aparezca en el mapa
**el mismo día**. Este KPI mide directamente la eliminación del cuello de botella y es trivialmente
verificable.

**KPI 3 — Tiempo de respuesta a una consulta de gestión: de minutos a segundos.** *«¿Cuántas podas
llevamos este año en el sector 2?»* hoy exige abrir archivos y contar filas. La meta es que las
consultas que la jefatura ya reporta hacia arriba —cobertura mensual de las 15.6 ha, podas mayores
anuales, controles fitosanitarios del año— se respondan desde un tablero **sin trabajo manual
previo**.

**KPI 4 — Esfuerzo de adaptación a un segundo cliente: bajo 2 semanas, sin tocar código.** Este es el
indicador que convierte un proyecto en un producto. La prueba es concreta: **configurar una taxonomía
de actividades, una jerarquía territorial y un conjunto de roles completamente distintos usando solo
la pantalla de administración de catálogos**. Si eso exige un despliegue, la arquitectura falló.

---

## 6. Organización del proyecto y stakeholders

### El equipo

**Diez desarrolladores** organizados por especificación. El método es **Spec Driven Development**:
ninguna funcionalidad se implementa sin un documento previo que defina su contrato, sus criterios de
aceptación y su verificación —y que otra persona del equipo haya revisado. La regla que gobierna el
método es exigente a propósito: *si un spec no puede ser verificado por alguien que no domina la
tecnología, el spec está incompleto.*

Esto importa para un financiador por una razón práctica: significa que **el conocimiento del proyecto
vive en documentos, no en las cabezas de diez estudiantes**. La rotación del equipo no destruye el
activo.

| Rol | Responsabilidad |
|---|---|
| **Arquitectura y specs fundacionales** | Decisiones transversales: modelo de datos, autenticación, catálogos, auditoría |
| **Backend** | API REST, lógica de negocio, persistencia georreferenciada |
| **Frontend web** | Aplicación de gestión para jefatura y administración |
| **Móvil** | Canal de campo Android, con el modelo de captura sin conexión |
| **Servicio de datos** | Procesamiento, reportes e integración con el mapa del cliente |
| **Líder de versión** | Integración a la rama estable y control de calidad de entregas |

### Los interlocutores del cliente

| Quién | Rol en el proyecto |
|---|---|
| **Jefe de la Sección de Áreas Verdes** | Interlocutor principal. Valida alcance, taxonomía y prioridades |
| **Asistencia de sección** | Mantiene hoy el mapa interactivo. Clave para la integración técnica |
| **Capataces (3)** | Usuarios reales del canal móvil. Su adopción es la prueba de fuego |
| **Ingeniero de catastro** | Levanta el inventario georreferenciado que el sistema consumirá |
| **Oficina de Servicios Generales** | Destinataria de los reportes de gestión |

### Qué necesitamos del cliente como contraparte

Esto no es un trámite: **es la ruta crítica del proyecto.** Tres compromisos concretos.

**Entregas de información**, ya comprometidas en la segunda entrevista: el inventario de especies con
sus datos botánicos, los shapes de los ~100 jardines con código y coordenadas, y las capas del
vocabulario territorial heredado. Sin ellas, el catastro se construye a ciegas.

**Acceso al mapa interactivo y a su fuente de datos.** Es el único punto que puede bloquear de verdad
una funcionalidad comprometida. Necesitamos saber de dónde lee cada capa y si podemos escribir en
ella.

**Ventanas de validación quincenales.** No pedimos disponibilidad permanente: pedimos una sesión cada
dos semanas para revisar lo construido. El riesgo que esto mitiga es el más caro de todos —construir
durante ocho semanas sobre un supuesto equivocado.

---

## 7. Cronograma y roadmap

Cierre de la primera versión operativa: **26 de noviembre de 2026.**

[aquí debe ir el diagrama de línea de tiempo — cinco fases en barra horizontal, con los hitos H1 a
H5 marcados y las entregas del cliente señaladas como dependencias sobre la fase correspondiente]

| Fase | Foco | Hito de salida |
|---|---|---|
| **Fase 0 — Fundación** *(completada)* | Arquitectura, entorno reproducible, autenticación, modelo de datos, catálogos configurables | **H1** · Base técnica operativa y specs fundacionales cerradas |
| **Fase 1 — Núcleo de gestión** | Usuarios y roles, catastro georreferenciado, registro de intervenciones sobre la taxonomía real | **H2** · Se puede registrar trabajo real contra el campus real |
| **Fase 2 — Campo e integración** | Canal móvil Android con captura sin conexión; publicación automática al mapa interactivo | **H3** · El primer capataz registra desde el campo y aparece en el mapa el mismo día |
| **Fase 3 — Gestión y reportes** | Incidencias, insumos, tableros de cobertura, reportes de la jefatura | **H4** · La jefatura genera su reporte mensual sin tocar Excel |
| **Fase 4 — Cierre** | QA integral, corrección de defectos, despliegue y puesta en marcha | **H5** · Sistema en producción — **26 de noviembre de 2026** |

**Dependencias del cliente sobre el cronograma.** La Fase 1 necesita las entregas de inventario y
shapes para arrancar con datos reales. La Fase 2 necesita el acceso a la fuente del mapa interactivo.
Son las dos fechas que vigilamos con más atención, porque no dependen de nosotros.

---

## 8. Riesgos y plan de mitigación

| Riesgo | Mitigación |
|---|---|
| **Que el personal de campo no adopte la app.** Son operarios con 30-40 años de oficio, no usuarios de software. El propio cliente pidió una herramienta *«amable»* | Diseño de mínima fricción: la foto se guarda siempre, sin bloqueos ni campos obligatorios de más. Validación temprana con los capataces reales, no con usuarios simulados |
| **Que el mapa interactivo resulte cerrado.** Vive en el repositorio personal de una locadora de servicios; esa dependencia puede desaparecer | Regla de aislamiento ya escrita en la arquitectura: **ningún servicio de dominio conoce al proveedor concreto**. Si la integración automática no es posible, degrada a exportación de datos sin tocar el núcleo |
| **Que el catastro incompleto frene el registro** | El sistema no exige catastro completo para funcionar: registra contra la jerarquía territorial existente y absorbe el catastro conforme avanza |
| **Que las entregas de información del cliente lleguen tarde** | Cada fase arranca con datos semilla propios. El calendario de entregas se acuerda en el kick-off, no sobre la marcha |
| **Que el alcance crezca durante la ejecución** | Fuera de alcance escrito y acordado (§4). Toda ampliación es una decisión explícita con impacto declarado en el cronograma |
| **Rotación del equipo de diez desarrolladores** | Spec Driven Development: el conocimiento vive en documentos revisados, no en personas |
| **Que la infraestructura de despliegue no esté lista a tiempo** | El sistema corre íntegramente en contenedores. Cambiar de destino de despliegue es configuración, no rediseño |

---

## 9. Próximos pasos

**Inmediatamente después de este kick-off:**

1. **Tercera reunión con el cliente**, con dos objetivos que no pueden postergarse: ver el mapa
   interactivo funcionando en pantalla y resolver de qué fuente lee cada capa, y cerrar las
   decisiones de alcance que siguen abiertas —el zoocriadero y el detalle del control de insumos.

2. **Recepción de las entregas comprometidas**: inventario de especies, shapes de los ~100 jardines y
   capas del vocabulario territorial heredado. Es el insumo que desbloquea la Fase 1 con datos
   reales.

3. **Acuerdo del calendario de validaciones**: fijar las fechas de las sesiones quincenales hasta el
   26 de noviembre, con nombre y responsable por sesión.

**Qué necesitamos del cliente antes de la próxima reunión:** los tres archivos comprometidos y la
confirmación de quién puede darnos acceso a la fuente de datos del mapa.

**Qué estará listo para el siguiente hito (H2):** el registro de intervenciones operando sobre la
taxonomía real de 9 clases y 45 tipos, contra la jerarquía territorial del campus, con usuarios y
roles funcionando. Es decir: **el momento en que el Excel deja de ser necesario para registrar.**

---

> *Hesperides — Proyecto de Investigación PUCP, 2026.*
