# Demostración del módulo de incidencias

## Preparación

Usar un entorno local de desarrollo con datos desechables: PostgreSQL/PostGIS y
backend en contenedores, frontend con Bun local. La imagen del backend incluye
JDK 26; no hace falta ejecutar Java ni exportar sus variables manualmente. El módulo
usa V026–V029 y el rediseño V067 (SPEC-201, 15 nov 2026; nació como V052). El servicio Flask no interviene.
No conectar esta demostración a una base real.
No usar `.env` ni credenciales reales en una prueba automatizada compartida.

Con el perfil `dev`, Flyway ejecuta automáticamente
`backend/src/main/resources/db/dev-migration/R__seed_demo_incidents.sql` después de
las migraciones del esquema. Crea dos capataces, un coordinador, un operario, dos cuadrillas,
una empresa externa ficticia y seis incidencias del flujo nuevo, sin trabajo fabricado.
Contraseña pública de prueba:
`Hesperides2026`. Los nombres de cuenta terminan en `@demo.invalid`.

Preparar `.env` con los valores de `.env.example`: completar `POSTGRES_PASSWORD`,
`JWT_SECRET` y `SMTP_FROM`. Los siguientes ejemplos usan backend en 8080 y frontend
en 3000; configurar `APP_PUBLIC_URL=http://localhost:3000`,
`CORS_ALLOWED_ORIGINS=http://localhost:3000` y `COOKIE_SECURE=false`.
Para que la limpieza de volúmenes incluya las fotos de prueba, usar
`STORAGE_TYPE=local` y `STORAGE_LOCAL_DIR=/data/storage`. Para ver el prellenado por IA,
completar `GEMINI_API_KEY` (y si hace falta `GEMINI_MODEL`); sin clave la demo funciona
igual y el prellenado queda fallido, con el botón para pedir otra sugerencia.

Desde la raíz, reconstruir e iniciar solo PostgreSQL/PostGIS y backend:

```bash
podman compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build db backend
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
podman compose -f docker-compose.yml -f docker-compose.dev.yml down --volumes
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
no dev explícito y no cargar `docker-compose.dev.yml`.

La carga es repetible: solo inserta los casos que faltan y no deshace lo que alguien
cambió durante la demostración. Los seis casos:

| Caso | Quién lo reportó | Estado de partida |
|---|---|---|
| Rama rajada sobre el sendero | Capataz | Por activar, sin prellenado |
| Aspersor roto | Otro capataz | Por activar, con prellenado de ejemplo |
| Cochinilla en arbustos | Operario | Por activar |
| Árbol caído | Capataz | Activa, urgencia alta, **vencida** (rojo en el mapa) |
| Plantas marchitas | Otro capataz | Activa, **por vencer** (ámbar), con GPS |
| Ficus de 10 m | Capataz | Activa, la atiende un tercero con 10 días pactados |

No hay incidencias cerradas: cerrar exige intervenciones validadas de verdad, así que
se demuestra creándolas en la aplicación. La prueba `DemoIncidentsSeedTest` verifica la
carga y que repetirla no duplica nada.

## Recorrido para presentar al cliente

1. Entrar como `capataz@demo.invalid`, abrir **Incidencias** e **Informar una incidencia**:
   escribir qué pasó y marcar la gravedad. Nada más es obligatorio. Queda **por activar**.
2. Entrar como `operario@demo.invalid`: también reporta, y solo ve lo suyo.
3. Entrar como `coordinador@demo.invalid` y abrir el reporte. Revisar la tarjeta
   **Prellenado por IA** (si hay clave) y los campos marcados «Sugerido por IA». Modificar
   lo necesario: quedan marcados «Editado» y la IA ya no los cambia. El texto original
   queda aparte.
4. **Activar incidencia**: si falta tipo, urgencia o sección/GPS, la tarjeta lo dice. Un
   árbol de 5 m o más exige marcar que lo atiende un tercero, con la empresa del Directorio
   y sus días pactados.
5. Ya activa, **Crear intervención para esta incidencia** abre Intervenciones con la
   incidencia preseleccionada; al guardar, el vínculo ya existe y la incidencia pasa a
   **En proceso**. También se puede vincular una existente buscándola por código, o desde el
   detalle de la intervención. El mismo vínculo se ve en ambos lados.
6. En la intervención: asignar, ejecutar con evidencia y finalizar. La incidencia muestra
   que hay trabajo **sin validar** y no deja cerrar.
7. Validar la intervención. Volver a la incidencia, escribir la **Solución aplicada** y
   **Cerrar incidencia**. El plazo queda congelado como «en plazo» o «fuera de plazo».
8. Probar una cancelada: cancelar una intervención vinculada y ver que bloquea el cierre;
   **Reemplazar** la quita y vincula otra en un paso, con su motivo.
9. Abrir **Mapa**: las incidencias activas aparecen en verde, ámbar o rojo según su plazo;
   pulsar una abre su detalle. El panel de capas cuenta las que no tienen ubicación.
10. Entrar como `otro-capataz@demo.invalid`: no ve los casos de la otra cuadrilla.
11. Repetir captura, lista y detalle a unos 390 px, en claro y en oscuro.

## Fotografías

Las evidencias usan únicamente el mismo `FileStorage` que el resto del producto,
con claves `incidents/{uuid}`, sin conversión JPEG ni incremento de límites. En
Compose local están en `/data/storage/incidents/`, dentro del volumen `storage`;
PostgreSQL guarda sus metadatos y claves, no los bytes. La API sigue siendo
privada, con `Cache-Control: no-store`; no se usan los endpoints públicos del catastro.

La prueba unitaria `IncidentFilesTest` cubre la lectura desde ese único almacenamiento,
los límites de claves, conservación de bytes y limpieza en rollback.

## Límites de esta versión

- Plazos provisionales (24/48/72 h), editables en los parámetros del sistema hasta que el
  cliente los confirme.
- La IA solo sugiere; coordinación valida todo al activar. Si Gemini no responde, el
  reporte se guarda igual.
- Sin regla de maquinaria de corte (irá en Intervenciones), sin riesgo por ubicación de la
  sección y sin reapertura de incidencias cerradas.
- Sin notificaciones, integración con WhatsApp o Centuria, ni app nativa.
- Sin sincronización offline: los errores conservan el formulario mientras siga abierto.
