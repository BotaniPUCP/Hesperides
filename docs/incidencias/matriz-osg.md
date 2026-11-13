# Correspondencia de la plantilla OSG

Fuente: `Matriz Unificada de Incidencias y Reclamos – OSG.xlsx`, hojas Matriz,
Listas, Catalogo CR, BaseServicios y Procesos_N2. Referencia de prueba versionada:
`shared/fixtures/osg-incidents.json`, contrastada con el libro completo.

El capataz puede aportar los campos opcionales en modo ampliado o al editar un
caso autorizado. Coordinación revisa esos mismos datos. No hay dos matrices paralelas.

| Columna del Excel | Campo / comportamiento en la aplicación |
|---|---|
| N° | OSG-#### automático al registrar oficialmente |
| Fecha de recepción/registro | Recepción del servidor, conservada en correcciones |
| Tipo de evento | Incidencia automática en esta captura web; otros valores existentes del catálogo se conservan |
| Tipo de servicio | Servicios de Áreas verdes, alcance de este módulo |
| Servicio | Tres opciones de BaseServicios para áreas verdes |
| Empresa | Catálogo de empresas de Listas; Ninguna es distinto de Sin determinar |
| Código Proceso (N2) | GSG-01…GSG-04, hoja Procesos_N2 |
| Subproceso | Selección dependiente del proceso; dato conocido del ejemplo de Matriz |
| Descripción del evento | Texto editable; original del remitente conservado aparte |
| Canal de ingreso | Formulario automático en esta captura web; otros canales OSG existentes se conservan, sin integración externa |
| Reportado por | Usuario de captura automático; se conserva el reportante nominal si un registro anterior lo tenía |
| Severidad | Alta, Media o Baja; independiente de urgencia |
| Impacto | Opciones de Listas, selección múltiple |
| Responsable de atención | Persona responsable del seguimiento, distinta de la cuadrilla ejecutora |
| Acción inmediata// Acción correctiva | Texto de respuesta; no fabrica trabajo ejecutado |
| Causa Raíz C | AV-01…AV-15 de Catalogo CR, con descripción completa |
| Causa raíz | Análisis particular del caso; no reemplaza el catálogo |
| Acción preventiva/ Oportunidad de mejora | Texto de prevención o mejora, separado de la contención |
| Proceso impactado para mejora | Texto editable, no obligación de copiar el subproceso |
| Estado | Derivado del circuito de registro, atención y revisión; no selector para saltar validaciones |
| Fecha de cierre | Automática al validar el cierre, solo coordinación |
| Tiempo de cierre | Días hábiles inclusivos, con calendario configurado |
| Observaciones | Texto editable; exportación incorpora también el resumen del cierre |

La ficha conserva además fotos privadas, referencia, punto opcional, sección
explícita, historial, comentarios y vínculos N:M con intervenciones reales.
Las fechas y fórmulas rotas del ejemplo Excel no se copian como reglas del sistema.

## Resumen visual

El HTML aportado orienta el alcance del tablero, no su reproducción literal. La
aplicación utiliza sus componentes y tema existentes: atención prioritaria,
indicadores, gráficos y tabla navegable (tarjetas en móvil). No simula porcentajes
de precisión IA ni vencimientos sin un SLA acordado. Los informes oficiales
incluyen registrados; el tablero declara cuándo incluye todos los reportes.

El rediseño aprobado separa consulta de edición y organiza el detalle en Datos del
caso, Intervenciones y Actividad. El original se consulta bajo demanda. El tablero
prioriza cuatro indicadores y dos gráficos; las métricas adicionales se despliegan
sin perder sus datos. La búsqueda de trabajo muestra resultados directamente y la
creación contextual conserva los permisos del módulo de Intervenciones.
