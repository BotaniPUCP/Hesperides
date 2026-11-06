# Demostración de captura OSG y atención

## Preparación

Usar un entorno local de desarrollo con datos desechables: PostgreSQL/PostGIS y
backend en contenedores, frontend con Bun local. La imagen del backend incluye
JDK 25; no hace falta ejecutar Java ni exportar sus variables manualmente. El módulo
aplica V026, V028, V029 y V035 junto con las migraciones de develop. Flask no interviene.
No conectar esta demostración a una base real.
No usar `.env` ni credenciales reales en una prueba automatizada compartida.

Usar exclusivamente una base de demostración con perfil dev. La imagen nueva del
backend debe incluir V035 y el seed actual. **V035 elimina los trabajos internos
del prototipo**; no convertirlos ni intentar mantener compatibilidad. No se alteran
V001–V034. Aplicar migraciones/recrear una base de trabajo requiere autorización
y, si contiene datos importantes, respaldo previo.

El arranque general del repositorio está en README. No hace falta importar SQL a
mano: Flyway carga `db/dev-migration/R__seed_demo_incidents.sql` únicamente con dev.
Las imágenes de evidencia ficticia se guardan a través de FileStorage al arrancar.
No activar dev en bases reales.

| Cuenta | Rol |
|---|---|
| capataz@demo.invalid | Capataz de Cuadrilla de demostración |
| otro-capataz@demo.invalid | Capataz de Otra cuadrilla de demostración |
| coordinador@demo.invalid | Coordinación |

Contraseña pública para las tres: **Hesperides2026**. Usar perfiles de navegador
separados, no pestañas de una misma sesión. ADMIN no participa en incidencias.

## Qué debe haber al iniciar una base nueva

**12 reportes, 8 intervenciones reales y 10 vínculos.** No hay trabajos internos.
Estos conteos corresponden al seed de incidencias. El perfil dev también carga
el seed de reportes de SPEC-202, que añade sus propias intervenciones y evidencias.

| Indicador | Total |
|---|---:|
| Pendientes de registro | 3 |
| Reportes por corregir | 1 |
| Pendientes de atención | 3 |
| En atención | 2 |
| Resoluciones observadas | 1 |
| Resueltas | 2 |
| Intervenciones finalizadas (incluye validadas) | 3 |
| Intervenciones validadas | 2 |
| Casos pendientes de revisión final de cierre | 1 |

Una intervención validada es compartida por un reporte aún abierto y otro cerrado;
otra intervención asignada atiende dos pendientes de registro. Hay además un caso
registrado sin trabajo y otro con dos intervenciones. Las imágenes recibidas dicen
DEMOSTRACIÓN: no representan fotos ni trabajos reales del campus.

Flyway aplica el seed repetible en una base nueva y cuando cambia su contenido,
no en cada `compose up` si ya está al día. Si cambia el SQL, reconstruir la imagen
del backend para incluirlo. No recrear ni limpiar una base sin autorización.

## Recorrido manual

1. **Capataz → Informar una incidencia.** Ver Mis reportes con solo sus ocho envíos
   iniciales. Enviar una frase sin datos adicionales: no exigir campos OSG ni trabajo.
2. Crear otro reporte. Abrir **Añadir más detalles · modo ampliado**. Seleccionar
   servicio, severidad, dos impactos, causa raíz catalogada y escribir el análisis.
   Ver las 15 causas completas del Excel. Volver al modo simple y enviar: conservar
   esos valores. Recargar el detalle y comprobarlos en Registro OSG.
3. En la ficha, **Ir a editar el registro OSG**, cambiar datos y Guardar cambios.
   Recargar y confirmar persistencia, original conservado e historial de revisión.
4. Antes de enviar otro reporte, abrir **Relacionar intervenciones existentes**,
   elegir trabajos visibles y enviar. También se pueden relacionar desde el detalle
   pendiente, sin registrarlo oficialmente. El capataz no ve Crear intervención.
5. **Coordinación:** revisar el caso. Opcionalmente devolver con motivo; capataz
   corrige datos OSG y reenvía el mismo reporte. Confirmar después el registro oficial.
   Se puede registrar sin intervenciones, pero no cerrar sin trabajo validado.
6. **Coordinación → Registrar nueva intervención**, desde un caso pendiente o
   registrado; o **Guardar reporte y crear intervención**, durante captura. Completar
   su formulario existente y volver: verificar preselección y confirmar Vincular
   intervención. Cancelar la creación no debe generar asociaciones.
7. Relacionar esa intervención con una segunda incidencia. Confirmar que no se
   duplica el trabajo y que las fuentes solo se ven con permiso de cada caso.
8. Asignar el trabajo. Capataz inicia por ubicación, sube evidencia y reporta terminada.
   Aún no habilita el cierre. Coordinación observa con motivo; capataz corrige con
   un nuevo intento/evidencia; coordinación aprueba todas las ubicaciones.
9. Cerrar cada incidencia por separado como coordinación, con resumen obligatorio.
   Verificar que aprobar una intervención no autocierra ninguno de sus reportes.
10. **Tablero:** comprobar atención prioritaria, totales, gráficos y tabla resumen.
    Alternar con Reportes; filtrar por registro oficial, estado, severidad, urgencia
    y servicio. Los filtros del listado no cambian la población global del tablero.
11. Descargar la matriz: 23 columnas, causas completas, canales de ingreso, impactos,
    acciones relacionadas y resúmenes de cierre. Excluir pendientes de registro.
12. Probar los enlaces de detalle y retorno conservando filtros; usar 390 px y
    escritorio en claro/oscuro. No debe desbordar horizontalmente la página.

## Límites

Sin IA ni integración WhatsApp: el canal se registra como dato. No hay SLA inventado.
La sección es opcional; no se infiere el sector de un nombre ni se inventa GPS.
El reporte simple sigue funcionando si fallan opciones, resumen o mapa.
Una foto fallida permite reintentar sin duplicar el reporte.

La validación funcional del cliente y captura de cámara en Android físico son
comprobaciones pendientes distintas de la automatización en navegador.
