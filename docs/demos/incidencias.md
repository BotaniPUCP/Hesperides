# Demostración del módulo de incidencias

## Preparación

Usar una base local **aislada**, backend con JDK 25 y frontend con Bun. El módulo
aplica V022 para incidencias después de las migraciones de develop. La base compartida
requiere PostGIS; el servicio Flask no interviene en este flujo.
No usar `.env` ni credenciales reales en una prueba automatizada compartida.

En la base aislada, el archivo `incidencias.sql` crea dos capataces, un coordinador
y dos cuadrillas, ocho incidencias y doce intervenciones. Contraseña pública de prueba:
`Hesperides2026`. Los nombres de cuenta terminan en `@demo.invalid`.

La carga es repetible: no duplica los casos ni restablece cambios realizados durante
la demostración. Cada capataz ve cuatro casos iniciales, uno por estado, y el
coordinador ve los ocho. En una base sin otras incidencias, el tablero comienza con:

| Indicador | Total inicial |
|---|---:|
| Pendientes de aprobación | 2 |
| Pendientes de atención | 2 |
| En atención | 2 |
| Resueltas | 2 |
| Intervenciones realizadas | 5 |

El caso del Tontódromo tiene una intervención realizada y otra pendiente, útil para
demostrar la resolución parcial. El caso de la puerta principal contiene solo el
texto mínimo. Las coordenadas de ejemplo son ilustrativas; no se crean fotografías
ficticias. Ejecutar la carga después de las migraciones. Con el override dev, repetirla
si se reinicia el contenedor de PostgreSQL: su almacenamiento `tmpfs` es desechable.

Desde la raíz, con el backend ya iniciado y usando únicamente una base local aislada:

```bash
podman exec -i hesperides-db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' \
  < docs/demos/incidencias.sql
```

No requiere reconstruir las imágenes. La prueba `DemoIncidentsSeedTest` verifica
la carga en PostgreSQL, los contadores, los permisos por cuadrilla y que una nueva
ejecución conserva las ediciones y resoluciones realizadas durante la demo.

La cuenta inicial ADMIN puede seguir administrando usuarios, pero no participa en
este flujo operativo. Para la prueba se necesitan los perfiles de coordinación y
capataz; cambiar el rol de ADMIN no es necesario.

## Recorrido para presentar al cliente

1. Entrar como `capataz@demo.invalid` y abrir **Incidencias**.
2. Informar «Rama caída en puerta principal», sin completar nada más. Abrir el
   detalle: pendiente de aprobación, remitente y fecha de recepción visibles.
3. Repetir con una fotografía y, si el contexto es HTTPS/localhost, ubicación.
   Denegar ubicación y comprobar que sigue siendo posible enviar.
4. Entrar como `coordinador@demo.invalid`. Ver el contador de pendientes y abrir
   el caso. Revisar la sugerencia provisional, dejar urgencia desconocida o elegirla,
   comprobar la cuadrilla y **Aprobar registro**.
5. Planificar dos intervenciones (desmarcar «Trabajo ya realizado»). La incidencia
   permanece pendiente hasta iniciar o registrar ejecución.
6. Volver a `capataz@demo.invalid`; marcar una intervención realizada. La incidencia
   pasa a **En atención**, pero no permite resolver mientras quede otra pendiente.
7. Completar la segunda y **Resolver incidencia**. Revisar historial y tablero:
   una incidencia resuelta más y dos intervenciones realizadas más que al inicio.
8. Entrar como `otro-capataz@demo.invalid`: ve sus propios casos, no el caso creado
   para la otra cuadrilla.
9. En una ventana de unos 390 px, repetir captura/listado/detalle sin scroll lateral.

## Límites explícitos de la prueba de concepto

Verificación técnica realizada el 17 de octubre de 2026: 213 pruebas backend,
211 frontend, lint y build correctos. Recorrido completo en Firefox a 390×844,
incluida ubicación denegada y foto; persistencia de registro/foto comprobada tras
reiniciar Java. Falta comprobar captura de cámara en un Android físico y recoger
las observaciones del cliente.

- Categorías provisionales hasta recibir la matriz del cliente; no se infiere riesgo.
- Sin IA, notificaciones, integración con WhatsApp ni app React Native.
- Sin mapa interactivo: referencia textual y coordenadas editables; ningún registro
  depende de cargar mapas o de habilitar GPS.
- Sin sincronización offline: los errores conservan el formulario mientras siga
  abierto. Tras recibir el texto se reintentan fotos, no la creación completa.
- El tablero usa totales generales; los filtros afectan solo al listado.
