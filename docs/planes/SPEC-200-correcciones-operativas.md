# SPEC-200 — Correcciones operativas del 5 nov 2026

## Comportamiento

- «Enviar a revisión» reemplaza «Reportar terminada»; el coordinador conserva la aprobación final.
- «Subsanar observación» abre el siguiente intento sin ocultar las observaciones anteriores.
- Cada ubicación muestra sus observaciones y avances con fecha, autor e intento. El historial
  recupera eventos ya guardados; las cantidades son acumuladas y admiten cero o correcciones.
- «Actualizar información» consulta el último detalle del servidor. No guarda borradores;
  ante conflictos conserva el texto pendiente y comunica una actualización correcta como información.
- Se permite planificar y asignar trabajo futuro. Los ejecutores no pueden comenzar, guardar
  avance, enviar a revisión, subsanar ni cargar evidencia antes del día programado, comparado
  en la zona configurada del campus. La API impone la regla, además de las acciones de la web.
- La reprogramación previa al inicio conserva los permisos existentes y exige motivo.

No se modificó el esquema ni se crearon migraciones. Se reutilizan los eventos de V025.

## Validación realizada

- 694 pruebas frontend aprobadas en 102 suites.
- 70 pruebas backend afectadas aprobadas: 68 de integración y 2 de la regla de fechas.
- Lint, compilación de producción y `git diff --check` correctos.
- La integración usa exclusivamente la base desechable de Testcontainers.
- La primera ejecución de backend encontró Docker detenido; después de iniciarlo se repitió
  correctamente. No se presenta esa primera ejecución como una validación satisfactoria.

## Recorrido visual pendiente

El servicio de acceso a navegadores de Computer Use devolvió
`The browser access host is unavailable`. No se pudo verificar visualmente esta ampliación.

Con backend y frontend reconstruidos con el código de esta rama:

1. Como coordinador, programar y asignar una intervención futura. Como capataz, abrirla:
   debe informar la fecha habilitada y no ofrecer acciones de ejecución. El coordinador
   puede reprogramarla para hoy con motivo, antes de que se inicie.
2. Como capataz, iniciar una ubicación y registrar dos avances, con notas distintas.
   Actualizar la información y comprobar que aparecen ambos en «Historial de avances».
   El segundo valor representa el total acumulado informado; no se suma al primero.
3. Adjuntar evidencia, enviar a revisión y observarla como coordinador indicando un motivo.
   Como capataz, abrir «Subsanar observación»: el motivo debe verse también en la ventana.
4. Confirmar la subsanación. Comprobar que aumentó el intento y siguen visibles el motivo
   y los avances previos. Registrar un nuevo avance y comprobar que se identifica como
   perteneciente al nuevo intento. Recargar la página y repetir la consulta.
5. Si otro usuario modifica el trabajo mientras hay un reporte pendiente, intentar guardarlo:
   debe avisar del conflicto. Usar «Actualizar información y conservar borrador» y comprobar
   que el texto permanece y la actualización correcta aparece como información.

La aprobación no se ha simplificado ni se ha eliminado la evidencia obligatoria por intento.
