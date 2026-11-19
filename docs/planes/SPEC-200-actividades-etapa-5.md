# Actividades — etapa 5: avance global en la web

Fecha: 18 nov 2026. Contrato vigente: SPEC-200 §2.13.

## Implementación

- Las actividades nuevas utilizan su detalle y comandos `/activities`. Según la
  confirmación posterior del usuario, V073 incorpora las anteriores abiertas al mismo
  flujo global; las cerradas conservan consulta histórica sin comandos retirados.
  Ver [revisión de acuerdos](SPEC-200-cierre-de-brechas-etapas-1-5.md).
- «Subir avance» abre un formulario sin iniciar trabajo ni asignar responsable.
  Guardar registra el porcentaje acumulado manual (0–100, hasta dos decimales), la
  descripción general y una instantánea completa de los objetivos planificados.
- El mapa y la lista del avance solo permiten trabajar con jardines y ejemplares de
  esa actividad. Las casillas se sincronizan con el mapa. Marcar indica Terminado;
  «Avance parcial» requiere una descripción por objetivo; desmarcar indica Sin avance.
  Se distinguen los tres estados mediante color, símbolo y texto. El barrido agrega
  objetivos sin convertir un avance parcial existente en terminado.
- Los polígonos del plan se conservan. Si falta el inventario o WebGL, la lista sigue
  disponible; un ejemplar retirado no desaparece del trabajo por faltar en el mapa.
  El cálculo del porcentaje no se deriva del número ni de la superficie de objetivos.
- El primer guardado válido inicia En ejecución y asigna al capataz cuando no existe
  responsable. El 100 % requiere todos los objetivos terminados y pasa a Ejecutada.
  Puede corregirse incluso hacia abajo mientras no haya aprobación. No hay botón
  Enviar a revisión, intentos nuevos, observaciones ni subsanaciones en este flujo.
- El historial muestra autor, fecha, porcentaje, descripción y estados por objetivo.
  Inicio, fin de ejecución y aprobación se presentan por separado.
- Las fotos se anuncian y suben como borradores antes de vincularlas al avance; no
  inician ni reclaman la actividad. La API mantiene la regla fotográfica existente.
  La lectura usa blobs autenticados y libera sus URLs al cerrar la vista.
- El coordinador puede cambiar responsable, cancelar con motivo opcional incluso en
  ejecución y aprobar una actividad Ejecutada para pasarla a Terminada. Las acciones
  visibles proceden de `allowedActions`; el backend vuelve a autorizar cada operación.
- Un envío sin respuesta conserva su UUID, versión y contenido para reintentar sin
  duplicarlo. Un conflicto explícito de versión conserva el borrador y exige cargar
  la versión actual antes de otro guardado. Subir fotos no permite adoptar de forma
  silenciosa cambios concurrentes de ejecución o planificación.
- Las marcas de avance del visor son opcionales. La creación sigue usando selección
  celeste y el mapa general conserva su presentación habitual.

## Verificación y límites

- Regresión frontend: 770 pruebas aprobadas en 73 suites de intervenciones, visor 3D,
  navegación, guardado pendiente y estilos. Incluye creación/listado anteriores y el
  comportamiento predeterminado del mapa compartido.
- Comprobación final específica: 13 pruebas del avance global aprobadas, incluidas
  recuperación de fotos, actualización de versión tras subirlas y liberación de URLs
  privadas. También cubren mapa/lista, objetivos ajenos, inventario no disponible,
  coherencia del 100 %, correcciones y reintentos con el mismo contenido.
- Backend: 15 pruebas de `ActivitiesIntegrationTest` aprobadas con PostgreSQL/PostGIS
  temporal, sin fallos, errores ni pruebas omitidas.
- TypeScript y lint de `src` correctos. La compilación de producción genera las rutas
  nuevas y compatibles. No se cambian dependencias ni archivos de bloqueo.
- `git diff --check` sin errores. El lint global del archivo de terceros
  `public/models/equivalence/portable.js` conserva los errores anteriores documentados
  en etapa 4; no se alteran sus reglas para ocultarlos.

La revisión visual sigue pendiente: el host de acceso al navegador no está disponible.
Las pruebas de componentes y de proyección no sustituyen la inspección real de WebGL,
modo claro/oscuro y dispositivos. No se cambia de rama, no se aplican migraciones a una
base habitual o desplegada y no se hace commit ni publicación.

Sigue la etapa 6 del nuevo flujo: recorrido integrado, demostración y preparación de
entrega. No corresponde al antiguo R6 que el usuario decidió no ampliar.
