# SPEC-200 — Etapa 3, núcleo T06: evidencia por ubicación

Fecha: 22 oct 2026. Continúa T04 y T05 parcial. Implementa anuncio, subida y consulta
de fotos sin decidir obligatoriedad, cuotas ni aceptación del mantenimiento.

## API y autorización

| Ruta bajo `/api/v1/interventions/{id}` | Comportamiento |
|---|---|
| `POST /evidences` | Anuncia una foto con ubicación obligatoria, referencia UUID y momento BEFORE/AFTER; requiere versión e Idempotency-Key. Nueva → 201, reintento → 200 |
| `PUT /evidences/{evidenceId}/file` | Recibe multipart file JPEG/PNG/WebP hasta 25 MB, sin exigir versión en formulario; devuelve metadatos y versión actual |
| `GET /evidences/{evidenceId}/file` | Entrega bytes solo tras autorizar lectura del trabajo y pertenencia de foto/ubicación; pendiente → 409 |

Anuncia el ejecutor real del intento activo IN_PROGRESS. Sube únicamente el autor de esa
evidencia con rol SUPERVISOR/OPERARIO y alcance/membresía vigentes. Leer conserva la matriz
de alcance de T04: ADMIN/COORDINADOR todos, SUPERVISOR sus cuadrillas, OPERARIO sus trabajos
asignados. La autoría histórica no mantiene permisos de escritura tras cambiar de rol o dejar la cuadrilla.
Una foto de otro trabajo devuelve 404 incluso si ambos son visibles.

Se congela ubicación, intento y autor en el anuncio. El elemento opcional debe estar asociado
a esa ubicación; no basta que exista en otra del mismo trabajo. Hora/GPS declarados por el
dispositivo son metadatos opcionales, no prueba de presencia ni sustituto de la FK del lugar.
Se preservan microsegundos de captura y precisión de coordenadas al reconocer reintentos.

## Reintentos, archivos y transacciones

La clave del submit tiene ventana de 24 horas; la referencia UUID de la foto es permanente,
incluidas las bajas lógicas. Mismo actor, lugar, trabajo y metadatos recuperan la misma foto
antes de rechazar versión obsoleta. Referencia con otro contexto/metadatos → 409. Los bloqueos
transaccionales de clave/referencia son no bloqueantes; en curso → 409. Las escrituras se
serializan tomando cabecera, ubicación y evidencia en ese orden.

Se guarda SHA-256 de los bytes originales. Un archivo idéntico ya recibido no se escribe
otra vez, no añade evento ni incrementa versión. Otro contenido → 409. Una recepción exitosa
se reconoce antes de comprobar estado local, manteniendo las comprobaciones de autorización.
El nombre/MIME del formulario no decide el formato; se decodifica la imagen y se fija MIME real.
Se rechazan SVG, GIF, contenido ilegible/vacío y archivos por encima del límite compartido.
El formato HTTP incompatible devuelve 415 en ApiResponse mediante el manejador global,
porque Spring puede rechazarlo antes de seleccionar controller.

Se reutilizan FileStorage y PhotoUploads. El código de dominio no conoce S3/local concreto.
Se agrega `com.twelvemonkeys.imageio:imageio-webp:3.12.0` para decodificar WebP localmente,
conforme a la [documentación del proyecto TwelveMonkeys](https://github.com/haraldk/TwelveMonkeys).
No se incorpora ningún servicio externo. No se usa PhotoStore para recomprimir: conservar
bytes permite comparar reintentos exactamente. La validación limita la salida del decodificador
por submuestreo sin reducir la resolución del original guardado.

Las claves se generan dentro de `interventions/{id}/locations/{locationId}/attempts/...`, con
UUID nuevo por escritura; no se usan rutas elegidas por el usuario. Antes de escribir se
registra compensación para rollback confirmado, incluso si el proveedor falla tras escribir
parcialmente. Solo se intenta borrar el objeto nuevo. Si el resultado del commit es incierto,
se conserva el objeto para reconciliación; si falla la limpieza se registra para revisión.
Nunca se borra el objeto de un reintento ya aceptado.

EVIDENCE_ANNOUNCED/EVIDENCE_UPLOADED y la versión general se guardan atómicamente con sus
filas; el evento identifica lugar e intento original, también para una foto anterior. La foto
solo deja de contar como pendiente cuando se reciben los bytes. Detalle y respuesta devuelven
fileUrl únicamente para archivos recibidos, sin filtrar claves internas ni URLs firmadas.
El GET usa no-store/private y nosniff. El frontend deberá descargar con autorización/Blob;
no se abre una ruta pública para facilitar etiquetas img. El éxito binario entrega archivo;
metadatos y errores mantienen el sobre ApiResponse, siguiendo las rutas de archivos existentes.

## Verificación

Se amplía InterventionsIntegrationTest sobre PostGIS temporal exclusivo, con FileStorage real
espiado para comprobar escrituras/compensaciones. Casos: pendientes por lugar, archivos reales
JPEG/PNG/WebP, lectura privada y alcance, autoría/membresía/rol vigentes, contexto ajeno,
elementos por ubicación, referencias permanentes, expiración, coordenadas, bytes repetidos o
distintos, contenido inválido, carreras de anuncio/subida y error de formato HTTP.

Se inyecta fallo de almacenamiento después de escribir y fallo de evento en la BD temporal:
se comprueban rollback, conservación de anuncios y de fotos previas, eliminación del objeto
nuevo y reintento posterior. Los triggers solo existen durante esas pruebas, no en migraciones.

```powershell
# Desde backend, seleccionando JDK 26 para el proceso.
.\mvnw.cmd -B clean '-Dtest=InterventionsIntegrationTest,GlobalExceptionHandlerTest' test
.\mvnw.cmd -B clean test
```

Resultados finales: **51 pruebas de intervenciones aprobadas** (35 previas y 16 nuevas).
La ejecución seleccionada junto con GlobalExceptionHandlerTest aprobó 58 pruebas.
La suite completa aprobó **656 pruebas, 0 fallos, 0 errores y 0 omitidas**, con BUILD SUCCESS,
salida 0 y duración 5 min 49 s. Incluye migraciones, autenticación/renovación, usuarios,
catálogos, frecuencias, mapa, lugares, inventario, importaciones y almacenamiento/fotos.
`git diff --check` sin incidencias.

Como en la referencia previa, Surefire informó que terminó el JVM tras esperar 30 segundos
después de System.exit(0); la ejecución terminó con salida 0 y BUILD SUCCESS. No se modificó
esa infraestructura ajena a esta entrega.

## Límites y continuación

No se creó/editó SQL de migración ni se migró la base de trabajo; se reutilizan las seis tablas
V022. No se modificaron las fotos ni sus servicios de lugares, especies o inventario.
La etapa 3 sigue parcial: completar/validar/observar/reabrir/relevar no se habilitan. Una subida
nueva solo se admite en IN_PROGRESS/COMPLETED; cargas pendientes en VALIDATED/OBSERVED
esperan P-02/P-03. Los estados de esas pruebas se preparan como fixtures; no prueban rutas
de finalización/revisión todavía inexistentes. No hay cuota BEFORE/AFTER ni reglas de fotos
obligatorias. Indicadores, publicación e incidencias conservan sus límites anteriores.

Esta entrega es backend. No se repitió frontend sin cambios en sus archivos; las pantallas
y su verificación en navegador real siguen en T07. No se presenta esta API como flujo web
completo ni como MVP aprobado.
