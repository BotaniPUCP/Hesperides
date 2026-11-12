# Borrador de PR hacia develop

Título propuesto: **[SPEC-200] Conecta historial y cumplimiento por ubicación y corrige el registro web**

## Descripción para el PR

Añade historial privado desde la ficha del ejemplar y asociación por código al planificar.
Conecta las frecuencias del personal propio con actividades aprobadas por lugar, conservando
ejecución real y aprobación como fechas distintas de una sola ocurrencia. Solo cuenta los
lugares atendidos y no infiere cobertura global del campus.

Corrige la caída de «Agregar ubicación» cuando el navegador no expone `crypto.randomUUID`.
Genera referencias UUID v4 mediante `getRandomValues` en ese escenario, también para las
claves de registro y los anuncios de fotos.

La planificación, ejecución, evidencia y revisión del núcleo ya están en develop.
T08/T09 reutilizan V025 (antes V022) sin otra migración. Se incorporó `origin/develop`
en `9d5e18b` y se conciliaron cuatro conflictos, conservando la navegación de catastro,
las regresiones de inventario y la consulta privada del historial.

## Validación

La ejecución anterior a incorporar develop aprobó 675 pruebas backend y 574 frontend,
lint, build y la configuración de Compose. El usuario confirmó la revisión manual del
flujo web inicial. Las comprobaciones posteriores a incorporar develop y el fallo de
ubicaciones se registran en `SPEC-200-integracion-develop-y-ubicaciones.md`.

Después de incorporar develop: **714 pruebas backend y 683 frontend aprobadas**;
lint, compilación de producción y configuración de Compose correctos. Backend se ejecutó
desde limpio con JDK 26 y bases aisladas de Testcontainers.

La revisión visual de T08 y del panel de cumplimiento sigue pendiente. No se presenta
la prueba automatizada como sustituto de una comprobación en navegador real.

## Pendientes visibles para revisión

- Validación visual de historial por ejemplar y cumplimiento local.
- BY_SECTOR requiere historia territorial fiable. Los puntos/elementos sin lugar estable
  no producen un veredicto de cobertura. Android, terceros y publicación quedan fuera.
- Develop ya separa V025/V026, entidades, repositorios y tablas de ambos módulos.
  T10 todavía requiere acordar el vínculo funcional con las atenciones de incidencias;
  completar/aprobar una actividad no cierra una incidencia.
- Una base que aplicó la antigua V022 de intervenciones requiere revisar su historial
  antes de arrancar con las migraciones actuales de develop.

## Antes de publicar o integrar

- [x] Consultar el remoto e incorporar develop `9d5e18b`, conservando los cambios locales.
- [x] Comprobar que develop resolvió los choques de versiones y nombres con incidencias.
- [ ] Revisar los archivos y crear el commit de los cambios pendientes.
- [x] Registrar la validación posterior a resolver conflictos.
- [ ] Realizar la prueba visual pendiente o mantener el PR como borrador.
- [ ] Obtener la revisión de otro integrante conforme a las convenciones del proyecto.
- [ ] Coordinar respaldo y compatibilidad antes de arrancar una base compartida con Flyway.

Este archivo prepara un resultado revisable; no crea un PR remoto ni hace commit o push.
Se incorporó develop por avance directo y se conservaron respaldos. No se aplicaron
migraciones a la base de trabajo.
