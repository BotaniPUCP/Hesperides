# Actividades: etapa 4 — planificación y listado web

Fecha: 18 nov 2026. Reglas: [etapa 1](SPEC-200-actividades-etapa-1.md).
Backend: [etapa 3](SPEC-200-actividades-etapa-3.md).

Actualización posterior: la [revisión de brechas](SPEC-200-cierre-de-brechas-etapas-1-5.md)
retira la compatibilidad operativa antigua de la interfaz y añade la continuidad V073
confirmada por el usuario. Los resultados de esta entrega inferior son históricos.

## Implementación

- Menú, encabezado, metadatos y navegación muestran **Actividades** y **Nueva actividad**.
  Las rutas `/intervenciones` permanecen estables para conservar enlaces y filtros.
- Crear usa `POST /api/v1/activities`, con `Idempotency-Key`, selección del campus y
  **Capataz responsable (opcional)**. No se solicita cuadrilla. Si una respuesta se
  pierde, se conserva la misma solicitud completa, incluido responsable, para reintentar.
- Elegir responsable no inicia ejecución: la actividad sigue Planificada hasta guardar
  su primer avance. Si se deja vacío, lo asume el primer capataz que guarde un avance.
- Editar una actividad global Planificada usa `PUT /activities/{id}/planning`, con versión.
  El coordinador puede cambiar responsable; administración conserva los otros campos
  editables, pero no puede modificar ese selector. Se mantienen fecha, motivo de
  reprogramación, reglas de maquinaria, vínculos de incidencias y superficie calculada.
- Las actividades anteriores se editan mediante su contrato original. No se convierten
  ni se inventan porcentajes, intentos o responsables para ellas.
- El listado sigue utilizando la consulta compartida, con filtros y paginación en SQL.
  Así se consultan juntos registros anteriores y globales sin combinar páginas en el
  navegador. La proyección incorpora `activityWorkflow` y `progressPercentage`.
- Las tarjetas globales muestran porcentaje acumulado o «Sin avances registrados».
  Las anteriores se identifican como «Registro anterior» y conservan sus conteos.
  El título sigue siendo clase/tipo, con código secundario. Los filtros por fecha,
  actividad activa/inactiva y ejemplar conservan su comportamiento y URL.
- Los estados compatibles COMPLETED/VALIDATED se presentan como Ejecutada/Terminada.
  En actividades globales, Ejecutada comparte colores con En ejecución y tiene otro
  ícono. El filtro ofrece únicamente los cinco estados acordados. Las denominaciones
  anteriores se conservan internamente para interpretar la historia, sin ofrecerlas en la interfaz.
- El detalle de actividades globales muestra planificación, responsable, porcentaje,
  objetivos e incidencias relacionadas. No muestra controles antiguos de cuadrilla,
  avance por ubicación, observaciones o intentos. Las actividades anteriores abiertas
  continúan en el flujo global mediante V073; las cerradas conservan consulta histórica.
  La etapa 5 implementa el formulario operativo con mapa y lista sincronizados.

## Verificación

- 203 pruebas frontend aprobadas en 18 suites: formulario, selección del campus,
  precarga desde planificación, reintentos, responsable opcional, edición global,
  separación del detalle anterior, listado, navegación, API y compilación real de CSS.
- 15 pruebas backend de `ActivitiesIntegrationTest` aprobadas, incluida la proyección
  del porcentaje global en la consulta compartida.
- Compilación de producción (`npm run build`), TypeScript y lint de `src` correctos.
  Se ajustó la firma de props de la página Nueva actividad a los tipos generados de Next.
  El lint global encuentra 15 errores
  previos en el archivo de terceros `public/models/equivalence/portable.js`; no se
  modifica ese archivo ni se ocultan esos errores con cambios de configuración.
- Prueba HTTP contra backend real con PostGIS temporal: crear sin responsable,
  editarlo sin iniciar la actividad y consultar juntos un registro global y uno anterior.
- Restauración de dependencias con `npm ci`, respetando `package-lock.json`. La
  instalación local tenía Next/Tailwind de otra revisión y faltaba `@tailwindcss/postcss`.
  La página de prueba `/intervenciones/nueva` responde HTTP 200 después de restaurarlas.
  No se cambian versiones de dependencias ni archivos de bloqueo.

La revisión visual no pudo completarse: la conexión de navegador no estaba disponible
y el control nativo se detuvo porque no pudo confirmar la URL de Chrome. El usuario
abrió la ventana de prueba y aportó la captura del error de dependencia, ya corregido.
HTTP 200 y las pruebas automáticas no se presentan como una inspección visual completa.

No se migra la base habitual ni una desplegada. La verificación usa una base temporal
independiente, con cuentas ficticias; no se hace commit ni se publica ningún cambio.

Sigue **etapa 5: Subir avance**, con mapa/lista limitados a los objetivos de la actividad,
porcentaje acumulado manual, descripción global y descripción de cada objetivo parcial.
