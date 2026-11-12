# SPEC-200 — Revisión del contrato con incidencias

## Actualización tras integrar develop (29 oct 2026)

Se consultó el remoto y se incorporó `origin/develop` en `9d5e18b` a
`modulo-intervenciones`, conservando los cambios locales. El diagnóstico que sigue es
histórico: corresponde a la referencia antigua `origin/modulo-incidencias`, no al develop actual.

En el develop consultado ya se resolvieron los choques de nombres y versiones:

- SPEC-200 usa `V025__create_interventions.sql`; el SQL coincide con la antigua V022.
- SPEC-201 usa `V026__create_incident_workflow.sql`, la tabla `incident_interventions`,
  la entidad `IncidentIntervention` y el repositorio `IncidentInterventionsRepository`.
- Incidencias reutiliza el catálogo de estados de intervenciones sin crearlo otra vez.

Esto permite que ambos módulos coexistan, pero no completa T10: las atenciones guardadas
en `incident_interventions` todavía son distintas de las actividades por ubicación de
SPEC-200. Debe acordarse el vínculo entre ambas y sus permisos; no se conectaron
automáticamente ni se cambió el cierre de incidencias.

La renumeración viene de develop. Una base que ya aplicó la antigua V022 de intervenciones
requiere revisar su historial antes de arrancar esta versión. No se ejecutó `repair`,
`clean` ni una migración sobre la base de trabajo.

## Diagnóstico anterior, conservado como referencia histórica

Fecha: 29 oct 2026. Revisión de solo lectura, sin mezclar ramas ni desarrollar incidencias.

## Referencias examinadas

- Rama de trabajo: `modulo-intervenciones`, contrato SPEC-200 §3.6.
- Referencia local almacenada: `origin/modulo-incidencias`, commit `1d47f29`.
- `develop` local tiene migraciones hasta V021.

No se ejecutó fetch ni se consultó el servidor remoto: estas conclusiones describen las
referencias disponibles localmente, no garantizan el estado más reciente de otros integrantes.
Incidencias no está en el árbol de trabajo actual, pero sí hay implementación en esa referencia.

## Incompatibilidades concretas al combinar las ramas

| Área | Rama de incidencias | Rama de intervenciones | Consecuencia |
|---|---|---|---|
| Flyway | V022__create_incident_workflow.sql | V022__create_interventions.sql | Dos migraciones con la misma versión; no pueden coexistir directamente |
| Tabla interventions | Modelo mínimo con incident_id obligatorio y ejecución global | Cabecera planificable sin incidencia, con unidades de ejecución por ubicación | Esquemas incompatibles de la misma tabla |
| Entidad JPA | modules.incidents.entity.Intervention, @Entity sin nombre específico | modules.interventions.entity.Intervention, @Entity sin nombre específico | Colisión del nombre JPA y modelos sobre la misma tabla |
| Repositorio | modules.incidents.repository.InterventionsRepository | modules.interventions.repository.InterventionsRepository | Posible colisión del nombre del bean al escanear ambos paquetes |
| Cardinalidad | Una incidencia tiene varios trabajos con FK interventions.incident_id | SPEC-200 conserva incidents.intervention_id hacia el trabajo completo | Contratos distintos que deben conciliarse, no corregirse con una copia de DTO |
| Permisos | Controller de incidencias permite C/S; addIntervention hereda ese acceso | Crear planificación exige ADMIN/C; capataz ejecuta/corrige pero no crea/aprueba | Un adaptador no debe dar creación indirecta al supervisor |
| Ejecución | completeIntervention completa el trabajo global | Inicio/avance/fotos/completar/revisar son locales | No traducir una acción global a completar falsamente todas las ubicaciones |

La migración de incidencias también inserta INTERVENTION_STATUS y sus ítems sin comprobar
existencia; ejecutarla después del catálogo de intervenciones no es compatible sin conciliación.
Su cabecera la atribuye a SPEC-200, aunque contiene otro modelo; debe acordarse propiedad
única del módulo, no conservar dos fuentes independientes de verdad.

## Propuesta para coordinar con el responsable de incidencias

1. Acordar cardinalidad y permisos con los requisitos vigentes. Si cambia la cardinalidad de
   SPEC-200, actualizar primero el contrato compartido y sus pruebas.
2. Mantener un único servicio/modelo de intervenciones. Incidencias debe invocar ese servicio
   para crear/vincular trabajo; no persistir otra entidad Intervention incompatible.
3. Para creación y vínculo, una transacción local debe guardar ambos o ninguno. Conservar
   claves de idempotencia y validar permiso/alcance sobre ambos agregados.
4. Completar/aprobar trabajo no resuelve automáticamente la incidencia: su cierre sigue
   siendo explícito y con los permisos de su módulo.
5. Determinar qué migraciones ya se aplicaron fuera de bases desechables y acordar una
   historia de integración que preserve datos/checksums. No renumerar versiones publicadas,
   usar Flyway clean/repair ni editar la historia de una base existente para ocultar el choque.
6. Probar la integración conjunta en base aislada antes de usarla en una base compartida.

Esta propuesta es material de revisión para el equipo. No se enviaron mensajes, no se hicieron
cambios en la otra rama, no se resolvió el conflicto automáticamente y T10 no se declara completo.
