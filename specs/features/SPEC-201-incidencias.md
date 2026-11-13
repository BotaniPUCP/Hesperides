# SPEC-201 — Reportes, registro OSG y atención de incidencias

## Alcance y fuentes

Web de áreas verdes para SUPERVISOR (capataz) y COORDINADOR. Sin IA, integración
WhatsApp, SLA inventados ni app nativa en esta entrega. Leer primero REGLAS.md.

La aclaración del usuario del 5 nov 2026 sustituye el prototipo anterior:

- **Excel:** `Matriz Unificada de Incidencias y Reclamos – OSG.xlsx` define los
  23 campos y catálogos del registro. Revisadas sus cinco hojas: Matriz, Listas,
  Catalogo CR, BaseServicios y Procesos_N2; las dos últimas están ocultas.
- **HTML:** `incidencias-hesperides.html` orienta el resumen que espera el cliente,
  no obliga a copiar su estructura, estilos, simulación de IA ni reglas no aprobadas.
- `shared/fixtures/osg-incidents.json` conserva una referencia contrastable de
  columnas, eventos, canales, servicios, procesos y las 15 causas completas.
- [Correspondencia de campos](../../docs/incidencias/matriz-osg.md).

## Captura y edición

1. Modo simple por defecto: solo descripción obligatoria. Fotos, referencia y GPS
   opcionales. No se exige cargar mapas, clasificarse ni crear intervenciones.
2. «Añadir más detalles · modo ampliado» permite **también al capataz** aportar
   campos OSG opcionales. Volver al modo simple conserva esos valores.
3. Se eligen servicio de áreas verdes, empresa, proceso/subproceso,
   severidad, impactos múltiples, responsable y causa catalogada.
   Acciones, análisis de causa, proceso impactado y observaciones son textos distintos.
4. Las causas AV-01…AV-15 se muestran con la descripción completa del Excel. No se
   confunden con los códigos AV-01…AV-03 del catálogo de servicios.
5. En este flujo web no se solicitan evento, canal ni reportante nominal: una nueva
   captura corresponde a Incidencia y Formulario; usuario y recepción son automáticos.
   Los metadatos OSG existentes se conservan al revisar registros previos y en el
   CSV, sin inventar una integración con otros canales.
6. La sección es opcional y explícita; el sector se consulta por su jerarquía real.
   No se deduce del texto, del capataz, ni de una coordenada de referencia ficticia.
7. Coordinación edita los casos abiertos. El capataz edita sus pendientes y los
   casos de cuadrillas activas que supervisa. No puede asignar otras cuadrillas.
   Un caso cerrado explica por qué no se edita; coordinación puede reabrirlo.
8. Consulta y edición son excluyentes. «Editar» abre un único formulario con
   descripción/ubicación y clasificación/prioridad; gestión y análisis son grupos
   opcionales desplegables. Guardar vuelve a consulta; cancelar con cambios exige
   confirmación. Un conflicto conserva lo escrito. No hay descripción duplicada ni
   botón grande de refresco. El original se abre bajo demanda.
9. Original, recepción, autor de captura y fotografías se conservan. Las revisiones
   tienen versión y cambios antes/después con autor y fecha; un 409 no borra el formulario.
10. Mis reportes consulta únicamente los envíos del usuario y muestra total,
    pendientes de registro, activos, resueltos y hasta ocho recientes. Es distinto de
    los reportes de la cuadrilla que ese usuario también puede consultar.

## Registro y corrección inicial

- Coordinación confirma el registro oficial y asigna OSG-####. No se reinicia por
  año ni se reutiliza un correlativo. El ID técnico existe desde la recepción.
- Registro oficial admite cero intervenciones y clasificaciones desconocidas.
- Devolución opcional con motivo: PENDING_APPROVAL → CHANGES_REQUESTED.
  Solo el remitente reenvía el reporte devuelto, con sus datos ampliados si los hay.
  CHANGES_REQUESTED → PENDING_APPROVAL no genera otra incidencia ni cambia recepción.
- Se puede repetir la corrección. Aprobar un reporte devuelto exige antes reenvío.

## Intervenciones relacionadas

La única ejecución es la del módulo SPEC-200. Relación N:M mediante
`incident_intervention_links`, con propósito MITIGATION/PREVENTION por vínculo.
No hay trabajos internos, sustitución de trabajos antiguos ni endpoints paralelos.

- Desde captura se pueden seleccionar cero o varios trabajos existentes. Primero
  se recibe el reporte y luego se confirman los vínculos, conservando su versión.
  Reintentar no recrea el reporte ni duplica relaciones recibidas.
- Desde el detalle se pueden añadir relaciones **antes o después** del registro
  oficial. Se exige permiso de edición de la incidencia y lectura de la intervención.
- El selector filtra y pagina antes de responder: coordinación ve los trabajos
  autorizados; el capataz solo los de cuadrillas activas que supervisa. Un ID fuera
  de alcance devuelve 404 y no genera vínculos ni eventos.
- Captura y detalle comparten resultados visibles, búsqueda reactiva con espera,
  error recuperable y estado sin coincidencias. Las selecciones se quitan mediante
  controles compactos con etiqueta accesible; el propósito sigue siendo explícito.
  «Nueva intervención» se sitúa junto al buscador cuando la capacidad lo autoriza.
- Crear se deriva de la autorización de Intervenciones, no se amplía por llegar
  desde incidencias: ADMIN/COORDINADOR planifican; el capataz no. Se exige además
  acceso a la incidencia, por lo que ADMIN no recibe acceso nuevo a este módulo.
- «Guardar reporte y crear intervención» conserva primero el reporte pendiente,
  sin aprobarlo, y abre el formulario existente. «Nueva intervención»
  desde detalle hace lo mismo con su contexto ya guardado. Se retorna con el
  trabajo preseleccionado; **vincular requiere confirmación**. Cancelar no vincula.
- Se conservan filtros de regreso. El origen contextual admite solo un ID local
  autorizado, nunca una URL arbitraria. La actividad nace como FINDING y su fuente
  se selecciona explícitamente, sin atribuirla al nombre o rol del remitente.
- Retirar un vínculo requiere motivo, versión y ejecución no iniciada. Es soft
  delete del vínculo, no de la intervención. No elimina otros casos relacionados.
- Ambos agregados guardan eventos atómicos. El trabajo se bloquea tras la incidencia;
  al cerrar, las intervenciones se bloquean en orden. Las fuentes y eventos de origen
  respetan también el permiso propio de cada incidencia.

## Ejecución y cierre

SPEC-200 conserva sus reglas: equipo inicia/ejecuta/aporta evidencias/finaliza por
ubicación; coordinación valida u observa; capataz reabre para corregir con otro
intento. COMPLETED no equivale a VALIDATED. No se desactiva la política de fotos.

Solo coordinación cierra una incidencia registrada: al menos una intervención
relacionada y todas las requeridas VALIDATED, con resumen obligatorio de resolución
(hasta 2000 caracteres), actor y fecha. Validar trabajo no cierra casos automáticamente;
una intervención compartida se ejecuta una vez, pero cada caso se cierra por separado.

Coordinación puede observar/reabrir con motivo y estado RESOLUTION_OBSERVED. El
cierre previo queda en el historial; se limpian los datos del cierre vigente, sin
invalidar automáticamente intervenciones compartidas ya validadas.

Días hábiles inclusivos recepción→cierre: un único día hábil cuenta uno; sábado,
domingo y fechas de INCIDENT_HOLIDAYS no cuentan. Zona INCIDENT_TIME_ZONE. El
resultado se congela al cerrar; no significa cumplimiento de un SLA.

## Tablero y resumen de reportes

Coordinación dispone de vistas Tablero y Reportes en `/incidencias`:

- Reportes recibidos, activos, urgencia alta activa, pendientes de registro,
  registrados sin trabajo y pendientes de revisión final de cierre.
- Jerarquía visual aprobada el 12 nov 2026: cuatro cifras principales (recibidos,
  por registrar, registradas abiertas y cerradas), atención pendiente y dos gráficos
  principales (estados y severidad de todos los reportes). Seguimiento y análisis
  adicionales se despliegan bajo demanda; no se elimina su información.
- Atención enlazable: hasta 12 reportes recientes con registro, urgencia alta,
  observaciones o asignación pendiente. No se muestran falsos vencimientos ni confianza de IA.
- Seguimiento de estados, trabajo finalizado y trabajo validado, con conteo DISTINCT
  para intervenciones compartidas. Promedio de días hábiles solo de casos cerrados.
- Gráficos con cantidades por severidad, impacto, servicio, causa raíz, estado,
  evento, canal y empresa; activos por urgencia, sector y responsable; secciones
  con reportes. Cada gráfico muestra hasta ocho grupos y declara su población.
- Tabla de reportes enlazable en escritorio y tarjetas legibles en móvil.
  Búsqueda, estado, registro oficial, severidad, urgencia y servicio filtran el
  listado en servidor. No cambian la población global declarada del tablero.
- Filtros y vista se conservan en URL al consultar detalle, crear trabajo y volver.
  Un fallo de resumen u opciones no oculta la lista ni impide el reporte simple.
- Se conservan `PageFrame`/`PageHeader`, breadcrumbs derivados del menú y restauración
  del scroll por consulta completa, incluidos los filtros OSG, según SPEC-C01.
- Detalle organizado en Datos del caso, Intervenciones y Actividad; la ejecución y
  el cierre permanecen en Intervenciones. Área de trabajo local con tokens del tema,
  sin modificar navegación global ni tamaños por defecto de componentes compartidos.
  Esta presentación no requiere migraciones ni dependencias nuevas.

## Contratos

Prefijo `/api/v1/incidents`; sobre `{ok,message,data}`. Contratos completos en DTOs
Java y `shared/types/incidents.ts`. Estados y tipos son catálogos, no enums Java.

| Método / ruta | Contrato y permisos |
|---|---|
| GET `/` | Página; search,status,page,size,severity,urgency,service,zoneId,registration; alcance propio/cuadrilla o coordinación |
| GET `/mine` | Totales y ocho envíos recientes, únicamente del usuario autenticado |
| GET `/options` | Catálogos OSG, secciones, cuadrillas autorizadas y capacidad de crear trabajo |
| GET `/summary` | Tablero global, coordinación |
| GET `/export` | CSV UTF-8 de registrados, coordinación; 23 columnas del Excel y protección contra fórmulas |
| GET `/intervention-options` | Trabajos disponibles para seleccionar durante captura; search,page |
| POST `/` | description,locationReference,latitude,longitude,matrix opcional; Idempotency-Key UUID |
| GET `/{id}` | Datos, fotos, fuentes, historial, vínculos y capacidades efectivas |
| PUT `/{id}` | Datos editables y matrix; version obligatoria y permiso de edición |
| POST `/{id}/approve` | version, coordinación |
| POST `/{id}/request-correction` | version,reason, coordinación; sin registro oficial |
| POST `/{id}/resubmit` | version,report (incluida matrix opcional), remitente devuelto |
| GET `/{id}/intervention-options` | search,page; permiso de edición, no exige registro oficial |
| POST `/{id}/intervention-links` | version,interventionId,interventionVersion,purposeCode |
| POST `/{id}/intervention-links/{linkId}/remove` | version,reason; no ejecución iniciada |
| POST `/{id}/start` | Atención de caso registrado, cuadrilla autorizada o coordinación |
| POST `/{id}/resolve` | version,resolutionSummary, coordinación |
| POST `/{id}/observe-resolution` | version,reason, coordinación |
| POST `/{id}/comments` | body,clientReference; lector autorizado |
| POST `/{id}/photos` | Multipart file y clientReference; captura/atención autorizada |
| GET `/{id}/photos/{photoId}` | Bytes autenticados en el sobre, Cache-Control no-store |

matrix incluye serviceCode,companyCode,processCode,subprocessCode,severityCode,
impactCodes,responsibleUserId,immediateAction,rootCauseCode,rootCause,preventiveAction,
impactedProcess,observations,eventCode,intakeChannelCode,reporterName y zoneId.
No admite fijar el correlativo, autor técnico, recepción, ejecución ni cierre.

## Persistencia y demostración

V028 incorpora la matriz OSG y V029 integra vínculos N:M y revisión conservando
el legado. V035 añade canal de ingreso, reportante nominal y sección, y **elimina
la tabla del prototipo incident_interventions**, por autorización del usuario del
12 nov 2026. No convierte filas en trabajo ni mantiene adaptadores. No modifica
V001–V034; ejecutar V035 retira esos trabajos internos. Esta decisión sustituye
la conservación de solo lectura del prototipo. No autoriza migrar una base habitual.

El perfil dev carga 12 reportes, 8 intervenciones reales y 10 vínculos mediante
`R__seed_demo_incidents.sql`. Incluye captura mínima/ampliada, corrección/reenvío,
caso sin trabajo, varios trabajos, finalización pendiente de validación, observación,
trabajo validado y cierres independientes con trabajo compartido. El seed reemplaza
solo los casos identificables de la demo anterior mediante baja lógica; no borra
reportes manuales ni restablece ediciones de los nuevos ejemplos al repetirse.

DemoIncidentEvidence, exclusivamente dev, guarda mediante FileStorage imágenes
visiblemente marcadas DEMOSTRACIÓN para los cuatro trabajos de ejemplo con evidencia
recibida. No se fingen rutas de fotos ausentes ni se reutilizan fotos de personas reales.
Los actores, intentos, fechas, evidencias y validaciones son ejemplos coherentes,
explícitamente ficticios. Sin dev no se crean cuentas, fotos ni casos de demostración.

Fotos operativas privadas: FileStorage y claves incidents/{uuid}, máximo seis,
JPEG/PNG/WebP de 5 MiB, bytes originales. La indisponibilidad de mapas no bloquea captura.
No se cambia infraestructura compartida, archivos personales ni el lockfile npm.

## Aceptación de esta corrección

- Reporte simple sin clasificaciones; ampliado por capataz con causa completa e
  impactos múltiples; volver al modo simple conserva valores.
- Guardar/recargar ficha OSG y contrastar sus valores con CSV y tablero.
- Mis reportes excluye envíos ajenos aunque sean visibles por cuadrilla.
- Vínculo opcional antes de registro; varias intervenciones y una compartida;
  selección fuera de alcance rechazada sin filtrar metadatos ni alterar trabajo.
- Crear/retornar/preseleccionar solo con permisos de Intervenciones y del caso.
- Finalizar no valida; validar no cierra; cierre con resumen solo por coordinación.
- Seed sin trabajos internos, imágenes de demo disponibles y repetición sin duplicados.
- Cinco hojas del libro contrastadas; 23 cabeceras, eventos, canales, servicios,
  procesos y las 15 causas verificadas contra la referencia; no solo conteo de columnas.
- Navegador real: captura, edición persistente, selector/retorno, tablero, tabla,
  filtros y exportación; 390×844 y escritorio, claro/oscuro y CORS sin bloqueos.

Los resultados de verificaciones anteriores describían el prototipo que el usuario
objetó; no acreditan esta corrección. La validación del cliente y cámara física
Android siguen siendo comprobaciones distintas de tests y simulación de viewport.

## Verificación de la corrección — 5 nov 2026

Registro histórico anterior al rebase; no acredita la integración V035 ni sustituye
su verificación con Java 25, Podman y Bun.

- Contraste de la referencia versionada con el archivo XLSX suministrado: cinco
  hojas, 23 cabeceras exactas, cinco eventos, siete canales, tres servicios y las
  15 descripciones completas de causas. Sin instalar lectores de hojas de cálculo.
- Java 25/Maven con PostGIS temporal mediante API de Podman: **746 pruebas**,
  sin fallos, errores ni omitidas, y BUILD SUCCESS. Se verificó la migración de
  captura, entonces numerada V029, sin cambios en checksums publicados y sin
  tabla/adaptadores de trabajos internos. Tras afinar los fixtures, se repitieron
  sus dos pruebas y el empaquetado.
- Bun: **720 pruebas frontend** en 107 suites, lint y build correctos; incluye
  regresiones de filtros rápidos sin pérdida de parámetros y retorno con filtros OSG.
  Se ejecutó también una comprobación enfocada de 45 pruebas. Persisten avisos act(...) de tests y avisos de
  cierre de pools/Surefire en backend; no se presentan como fallos funcionales.
- Firefox real/WebDriver BiDi: modo simple y Mis reportes; selección de las 15
  causas del libro; captura ampliada por capataz y retorno al modo simple sin perder
  datos; dos vínculos antes de registrar; edición, guardado y recarga por capataz;
  original conservado; denegación de planificación al capataz; tablero, gráficos,
  tabla y filtros; coordinación crea desde reporte pendiente y vuelve preseleccionado
  sin vínculo automático; cierre independiente de un caso con trabajo compartido validado.
- Viewports 1440×1000 y 390×844, claro/oscuro, sin desbordamiento horizontal.
  **29 preflights**, cero errores de red y cero respuestas 5xx en el recorrido final.
- CSV realmente descargado y leído: 23 columnas por fila, cabeceras del libro,
  evento/servicio/canal/reportante aportados, dos impactos, causa AV-12 completa,
  análisis y observación editados por capataz, y códigos de trabajo real relacionado.
- Solo bases y procesos aislados. No se migró ni reinició el entorno habitual,
  no se cambiaron archivos personales de Compose, dependencias ni lockfile npm.

## Verificación de la integración del rebase — 12 nov 2026

- Java 25.0.5 y Maven del sistema: compilación limpia de producción y tests;
  Enforcer y las dos pruebas de numeración cronológica aprobados. V001–V034
  conservan su contenido; V035 ocupa el siguiente número libre.
- Podman/Testcontainers/PostGIS: suite de 908 pruebas, 906 aprobadas y dos fallos
  por contar también las intervenciones del seed de SPEC-202. Se acotaron las
  aserciones de trabajo/evidencia a los fixtures de incidencias; las dos pruebas
  corregidas pasaron al repetir `mvn -B verify -Dtest=DemoIncidentsSeedTest`,
  incluido empaquetado. No se repitió la suite completa después de esa corrección.
- Bun: suite completa de 1191 pruebas aprobadas, lint y build correctos. Después
  se añadieron dos regresiones de consulta/scroll OSG y se repitieron 32 pruebas
  enfocadas, todas aprobadas; lint repetido sin errores. Persisten avisos act(...).
- Pendiente: nueva comprobación en navegador real de esta integración. Los
  recorridos históricos no sustituyen esa verificación.
- No se migró ni reinició la base habitual. Los conflictos quedaron resueltos y
  preparados en el índice; no se ejecutó commit, push ni continuación del rebase.

## Verificación del rediseño aprobado — 12 nov 2026

- Implementación web sin dependencias, migraciones ni cambios de autorización.
  El backend conserva su derivación de Incidencia/Formulario para capturas nuevas;
  los metadatos de registros anteriores se mantienen al editar.
- Bun: lint y build correctos; **1198 pruebas en 150 suites**, todas aprobadas.
  Cobertura añadida para consulta/editor exclusivos, cancelación con borrador,
  búsqueda reactiva, respuestas tardías, paginación, reintento y selección con versión.
  Persisten avisos `act(...)` de tests; no son fallos funcionales.
- Java 25 y Maven: empaquetado correcto con tests omitidos explícitamente. No se
  repitió la suite Java: esta entrega no modifica código backend.
- Firefox real contra backend y PostGIS en contenedores Podman aislados, frontend
  con Bun: incidencia **#13 / OSG-0009**, reportada por capataz y relacionada con
  INT-000008 e INT-000005 antes del registro. Coordinación precisó la descripción,
  registró y creó INT-000021 desde el buscador, con tres ubicaciones. El retorno
  solo preseleccionó; se verificó que no hubiera vínculo hasta confirmarlo.
- Capataz ejecutó las cuatro ubicaciones pendientes (una de INT-000008 y tres de
  INT-000021), con cuatro fotos recibidas y rotuladas como prueba aislada.
  Coordinación validó esas ubicaciones y cerró el caso con resumen; recarga final
  comprobada por ambos roles. INT-000005 ya estaba validada en el seed.
- Cuatro solicitudes diagnósticas de cierre anticipado rechazadas con HTTP 422:
  trabajo asignado, trabajo contextual planificado, finalización sin validación y
  validación parcial. Se comprobó el bloqueo del resumen vacío y que validar
  intervenciones no cierre automáticamente la incidencia.
- En el recorrido completo: **82 preflights correctos**, ningún error de red,
  ninguna respuesta 5xx ni error de consola. Comprobación visual adicional sobre
  un caso pendiente: original bajo demanda, cancelar/seguir/descartar sin alterar
  datos, búsqueda sin coincidencias, selección compacta y retiro sin vinculación.
- Escritorio 1440 px y móvil 390×844, claro/oscuro, sin desbordamiento horizontal.
  Contraste medido en los colores computados: texto y acciones ≥4.5:1 y borde
  de campos ≥3:1 en ambos temas. La galería real y evidencias temporales están en
  `/tmp/opencode/incident-redesign/`; no son archivos necesarios para producción.
- Se retiraron solo los procesos y contenedores de esta verificación. No se
  migró/reinició el entorno habitual ni se realizaron commits o pushes.
