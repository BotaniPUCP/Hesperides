# SPEC-200 — Etapa 3, T04: consulta, planificación y asignación

Fecha: 22 oct 2026. Alcance: backend de intervenciones, conforme a SPEC-200 §§3–5.
Este informe registra T04; la continuación posterior de
[inicio/avance local](SPEC-200-etapa-3-inicio-avance.md) se registra como T05 parcial.
La autorización del usuario permite implementar este núcleo; las políticas P-01/P-02/P-03
siguen pendientes. Esta entrega no declara terminado todo el módulo ni la etapa 3 completa.

## Implementación

- Entidades de las seis tablas V022, todas derivadas de BaseEntity. Catálogos referenciados
  por sus IDs; no se añaden enums de dominio, dependencias ni otra migración.
- Repositorios de persistencia, consultas parametrizadas y servicio InterventionsService
  reutilizable por una futura integración transaccional con incidencias.
- Siete rutas bajo `/api/v1/interventions`: listado paginado, detalle, opciones, creación,
  edición de planificación, asignación/reasignación y cancelación previa al inicio.
- ADMIN/COORDINADOR crean y editan. ADMIN no asigna. COORDINADOR asigna a cuadrillas
  activas; SUPERVISOR solo a las que supervisa actualmente, sin atraer trabajos ajenos.
  OPERARIO solo lee sus asignaciones. Se comprueban cuenta y rol vigentes en base de datos.
- Una cabecera y varias ubicaciones con referencias permanentes. Edición completa conserva
  IDs al reordenar; omitir una ubicación la retira por baja lógica y conserva su historia.
  No permite retirar la última ni editar/asignar/cancelar tras el inicio de cualquier lugar.
- Clase/tipo y jerarquía, origen/reportante, fechas, cantidades, unidades y referencias
  espaciales validadas en la transacción. Referencias inactivas existentes siguen legibles;
  no se admiten como selección nueva. Los puntos no requieren pertenecer a una sección.
  No se modifican geometrías ni datos maestros de zonas, lugares o elementos.
- Eventos atómicos CREATED, UPDATED, REPROGRAMMED, ASSIGNED y CANCELLED. Reprogramar
  exige motivo y conserva fecha anterior/nueva. Las instantáneas no contienen archivos ni tokens.
- Bloqueo de cabecera y versión común: cada comando exitoso aumenta una vez la versión;
  una edición con versión antigua devuelve 409. Los reintentos de creación usan una clave
  UUID, hash y bloqueo transaccional: mismo contenido devuelve el recurso sin duplicar;
  otra petición concurrente o contenido diferente devuelve 409. Retención de 24 horas con
  baja lógica del submit vencido, sin borrar el trabajo original.
- Estado y fechas generales calculados desde ubicaciones activas; cantidades agrupadas
  por unidad sin convertir valores desconocidos en cero. Filtros espaciales combinados
  sobre la misma ubicación, sin duplicar trabajos. Spring Data gestiona conteo/paginación
  sobre la consulta filtrada, con orden permitido y desempate por ID.
- CORS admite Idempotency-Key y expone Location; no cambia autenticación ni sus permisos.

## Validación

Las pruebas usan un contenedor exclusivo PostGIS 16, migrado desde vacío hasta V022.
No cargan credenciales de la base de trabajo. Las peticiones HTTP tienen transacciones
reales para comprobar que un hijo inválido revierte cabecera, ubicaciones, eventos y submit.
Las carreras de creación y cancelación se ejecutan con dos hilos y peticiones simultáneas.

La suite específica `InterventionsIntegrationTest` contiene 23 pruebas aprobadas. Cubre
permisos vigentes, supervisión frente a membresía, alcance por asignación, cuentas inactivas,
idempotencia/expiración, edición estable, referencias retiradas, rollback, reprogramación,
validación de catálogos/cantidades/puntos, filtros/paginación, estados agregados, unidades,
instantes UTC, concurrencia y preflight CORS.

Comandos desde `backend`, con JAVA_HOME del proceso apuntando al JDK 26:

```powershell
.\mvnw.cmd -B clean -Dtest=InterventionsIntegrationTest test
.\mvnw.cmd -B clean test
```

Resultado final de regresión: **628 pruebas aprobadas, 0 fallos, 0 errores y 0 omitidas**;
Maven BUILD SUCCESS, salida 0, duración 5 min 2 s. Incluye las 605 pruebas de la referencia
posterior a V022 y las 23 nuevas de intervenciones. La prueba existente de CORS ahora
comprueba que se exponen tanto ETag como Location, permitiendo conservar la caché del mapa
y leer la ubicación de un recurso creado desde el navegador.
Se verificaron migraciones, autenticación/renovación, usuarios, catálogos, frecuencias,
mapa, lugares, inventario, importaciones y almacenamiento/fotos existentes.
`Maven clean` limpia únicamente productos de compilación en backend/target; no es Flyway clean.

## Límites y continuación

No se ejecutó la aplicación ni se aplicó V022 a la base de trabajo. V001–V022 no se editaron
en T04. No se implementaron frontend, rutas de ejecución, entrega/subida de fotos,
indicadores, publicación externa ni módulo de incidencias. Las lecturas de evidencia
conservan metadatos pero no anuncian una URL de archivo todavía inexistente.
El detalle declara `incidentIntegrationAvailable:false` y `sourceIncidents:[]`.

La siguiente tarea es T05: inicio y avance por ubicación y las acciones cuyas precondiciones
se hayan acordado. Completar/validar con fotos pendientes y observar/reabrir/relevar siguen
dependiendo de P-02/P-03; contar mantenimiento espera P-01. El proveedor de frecuencias
existente conserva su fallback. El contrato con incidencias se coordina con su responsable.

No se repitió frontend porque esta entrega no cambia sus archivos. La comprobación en
navegador real y el recorrido por pantallas quedan para T07; un preflight de MockMvc no
sustituye esa comprobación. El esquema y la API no prueban por sí solos el flujo web completo.
