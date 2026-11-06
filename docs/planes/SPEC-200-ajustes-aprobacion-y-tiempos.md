# SPEC-200 — Ajustes de aprobación y tiempos

Fecha: 5 nov 2026.

## Alcance conservado

- El coordinador y el capataz responsable de la cuadrilla activa pueden aprobar u observar
  ubicaciones terminadas. ADMIN/OPERARIO no aprueban; otro capataz no accede al trabajo.
- La aprobación de todas las ubicaciones hace contar la actividad en T09 sin segunda firma
  del coordinador. Se conservan autor y fecha de cada aprobación y la prohibición existente
  de aprobar ejecución, reportes o fotos propios, incluso después de cambiar de rol.
- El detalle ofrece acciones según esos mismos permisos, no solo según botones de la web.
- El tiempo transcurrido conserva el primer inicio real durante subsanaciones y termina al
  finalizar todas las ubicaciones. No añade la espera posterior de aprobación, no suma
  ejecuciones simultáneas ni representa tiempo efectivo registrado manualmente.

## Retiro de la implementación local de T10

El usuario pidió retirarla porque el responsable de incidencias ya implementó un servicio
para relacionar ambos módulos. Se retiraron nuestra tabla puente V027, entidades/repositorios,
servicio, endpoints, filtros habilitados, pantallas de vinculación y sus pruebas específicas.
Los cambios locales dentro del módulo de incidencias se restauraron al estado de HEAD,
incluido el bloqueo provisional de cierre. No se deshicieron commits ni se aplicó V027 a
la base habitual; tampoco se modificó ninguna migración publicada.

Se conserva la declaración previa de integración no disponible en esta rama. Las referencias
históricas del contrato en los specs no prueban que el servicio del compañero esté integrado.
No se implementa una segunda relación ni un segundo cierre de incidencias. La integración
del servicio compartido y sus pantallas debe comprobarse al revisar los cambios del compañero.

## Verificación

Frontend resultante: 103 suites y 699 pruebas aprobadas; lint y compilación de producción
correctos. La herramienta de navegador no está disponible; no se declara realizada la
validación visual de los ajustes nuevos.

Backend resultante: 80 pruebas aprobadas (71 de intervenciones, 7 de incidencias y 2 de
numeración de migraciones), con compilación limpia en JDK 26 y bases desechables.

Se consultó `origin/develop` mediante fetch: `a80ecb6` es antecesor de HEAD `2c6d20d`;
la rama tiene un commit propio y ningún commit pendiente de develop al comprobarlo.
Los ajustes conservados siguen locales, pendientes de commit/push. No se hizo merge,
no se publicó un PR y no se verificó el servicio nuevo del responsable de incidencias.

Recorrido manual: como capataz, aprobar trabajo reportado por un operario de su cuadrilla;
comprobar conteo al aprobar todas las ubicaciones. Intentar aprobar un reporte propio y
acceder a otra cuadrilla: ambos deben rechazarse. Verificar que la duración de ejecución
conserve el primer inicio tras una subsanación y no cambie al aprobar posteriormente.
