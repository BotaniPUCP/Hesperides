# Demostración del módulo de incidencias

## Preparación

Usar un entorno local de desarrollo con datos desechables: PostgreSQL/PostGIS y
backend en contenedores, frontend con Bun local. La imagen del backend incluye
JDK 25; no hace falta ejecutar Java ni exportar sus variables manualmente. El módulo
aplica V026 después de las migraciones de develop. El servicio Flask no interviene.
No conectar esta demostración a una base real.
No usar `.env` ni credenciales reales en una prueba automatizada compartida.

Con el perfil `dev`, Flyway ejecuta automáticamente
`backend/src/main/resources/db/dev-migration/R__seed_demo_incidents.sql` después de
las migraciones del esquema. Crea dos capataces, un coordinador, dos cuadrillas,
ocho incidencias y doce intervenciones. Contraseña pública de prueba:
`Hesperides2026`. Los nombres de cuenta terminan en `@demo.invalid`.

Preparar `.env` con los valores de `.env.example`: completar `POSTGRES_PASSWORD`,
`JWT_SECRET` y `SMTP_FROM`. Los siguientes ejemplos usan backend en 8080 y frontend
en 3000; configurar `APP_PUBLIC_URL=http://localhost:3000`,
`CORS_ALLOWED_ORIGINS=http://localhost:3000` y `COOKIE_SECURE=false`.
Para que la limpieza de volúmenes incluya las fotos de prueba, usar
`STORAGE_TYPE=local` y `STORAGE_LOCAL_DIR=/data/storage`.

Desde la raíz, reconstruir e iniciar solo PostgreSQL/PostGIS y backend:

```bash
podman compose -f compose.yml -f compose.dev.yml up -d --build db backend
```

En otra terminal, desde `frontend/` y con dependencias instaladas:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 bun --bun run dev
```

Abrir http://localhost:3000/incidencias. Si se cambian los puertos, alinear la URL
de la API del frontend, la URL pública y los orígenes CORS. Los cambios de Java o
del SQL requieren reconstruir el backend con el mismo comando `up --build`.

### Terminar y descartar los datos

Detener Bun con Ctrl+C. Desde la raíz, esta limpieza **destructiva** detiene y
elimina los contenedores y los volúmenes `pgdata` y `storage` del proyecto:

```bash
podman compose -f compose.yml -f compose.dev.yml down --volumes
```

Elimina **toda la BD y las fotos locales del proyecto**, no solo las incidencias.
No usarla con datos que se deban conservar. `stop`, `restart` y `down` sin
`--volumes` no descartan estos volúmenes. No se borran `.env`, los directorios
montados desde el host (como `inbox/`) ni los objetos en S3.

### Carga automática

No hace falta ejecutar SQL manualmente ni usar otra configuración de Compose.
El override dev activa el perfil `dev`;
al ejecutar Java fuera de Compose hay que activarlo con `SPRING_PROFILES_ACTIVE=dev`.
La configuración común de Flyway solo incluye `db/migration`: sin el perfil dev
no se crean cuentas ni incidencias de demostración. **No activar `dev` en una base
real.** Compose base también usa dev por defecto; para producción, usar un perfil
no dev explícito y no cargar `compose.dev.yml`.

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
ficticias. Flyway aplica esta migración repetible en una base nueva y cuando cambia
su contenido, no en cada `compose up` si la base ya está al día. Después de una
limpieza explícita de la demo, el siguiente arranque crea el esquema y vuelve a
cargar sus datos. Si el SQL cambia, reconstruir la imagen del backend para incluirlo.

La prueba `DemoIncidentsSeedTest` verifica la carga automática con el perfil dev,
los contadores, los permisos por cuadrilla y la conservación de ediciones y
resoluciones al repetir el SQL. `MigrationSmokeTest` comprueba que la configuración
sin dev no ejecuta la carga de demostración.

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
10. Cambiar entre claro y oscuro; revisar controles, avisos y badges. Abrir un detalle,
    recargar su URL y volver con el navegador y el breadcrumb: se conservan los filtros.

## Fotografías

Las evidencias usan únicamente el mismo `FileStorage` que el resto del producto,
con claves `incidents/{uuid}`, sin conversión JPEG ni incremento de límites. En
Compose local están en `/data/storage/incidents/`, dentro del volumen `storage`;
PostgreSQL guarda sus metadatos y claves, no los bytes. La API sigue siendo
privada, con `Cache-Control: no-store`; no se usan los endpoints públicos del catastro.

La prueba unitaria `IncidentFilesTest` cubre la lectura desde ese único almacenamiento,
los límites de claves, conservación de bytes y limpieza en rollback.

## Límites explícitos de la prueba de concepto

Verificación del realineamiento, 24 de octubre de 2026: **606 pruebas backend**
con JDK 25 y Testcontainers/Podman, **606 frontend**, lint y build correctos.
Firefox real mediante WebDriver BiDi a 390×844 y 1440×1000: claro/oscuro, controles
de 48 px, navegación/recarga con filtros, ubicación denegada, foto con reintento sin
recrear la incidencia, aprobación, dos trabajos con ejecución parcial, resolución,
permisos entre cuadrillas y contadores. Tras reiniciar Java, el estado resuelto y
los bytes de la foto siguen disponibles. Los 47 preflights observados respondieron
sin error. Configuración Compose base/dev validada, incluidos los montajes de
almacenamiento y recarga. Falta comprobar captura de cámara en un Android físico y recoger las
observaciones del cliente; no se probó contra un bucket S3 real.

- Categorías provisionales hasta recibir la matriz del cliente; no se infiere riesgo.
- Sin IA, notificaciones, integración con WhatsApp ni app React Native.
- Sin mapa interactivo: referencia textual y coordenadas editables; ningún registro
  depende de cargar mapas o de habilitar GPS.
- Sin sincronización offline: los errores conservan el formulario mientras siga
  abierto. Tras recibir el texto se reintentan fotos, no la creación completa.
- El tablero usa totales generales; los filtros afectan solo al listado.
