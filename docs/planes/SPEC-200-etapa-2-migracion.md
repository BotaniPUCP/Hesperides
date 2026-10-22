# Etapa 2 de intervenciones — Migración y conservación de datos

Fecha: 22 oct 2026. Alcance: los tres pasos autorizados de base de datos; sin aplicar cambios
a la base de trabajo y sin desarrollar todavía entidades JPA, API o interfaz.

## 1. Archivo SQL nuevo

Se crea [V022__create_interventions.sql](../../backend/src/main/resources/db/migration/V022__create_interventions.sql),
después de verificar que las versiones presentes terminaban en V021. Propietaria: SPEC-200.
Se comprobaron hashes SHA-256 de las 21 migraciones anteriores antes/después: sin cambios.

La migración crea seis tablas: interventions, intervention_locations, intervention_elements,
intervention_evidences, intervention_events e intervention_submissions; además de la secuencia
y función de código interno. Agrega solo los catálogos ausentes y no modifica datos previos.
La ejecución por ubicación, referencias compuestas y unicidad de referencias corresponden
al diseño confirmado. No crea incidencias/contratos ni impone mínimo de fotos, reglas de
subsanación o política de indicadores todavía pendientes.

## 2. Bases temporales y pruebas

La nueva suite [InterventionsMigrationTest](../../backend/src/test/java/pe/edu/pucp/hesperides/migration/InterventionsMigrationTest.java)
usa Testcontainers con postgis/postgis:16-3.4. Obtiene conexión, usuario y contraseña del
contenedor; no carga el datasource de la aplicación ni .env. Dentro del contenedor crea dos
bases desechables: interventions_fresh e interventions_upgrade.

- **Desde vacío:** Flyway aplica V001–V022 y valida el historial. Se comprueban tablas y catálogos nuevos.
- **Actualización:** Flyway aplica hasta V021, se agregan registros de prueba, se toma referencia
  de filas/estructura/historial y luego se aplica V022.
- **Restricciones:** tres lugares con estados/cantidades distintos, lugar sin sección, rechazo
  de referencias cruzadas entre trabajos, cantidades inválidas, autovalidación y fechas incoherentes.
- **Reintentos:** referencias dadas de baja no se reutilizan; repetir migrate no duplica catálogos
  ni cambia el historial. Foto pendiente/recibida mantiene coherencia de metadatos.
- **Código interno:** no trunca ni repite el formato al superar seis dígitos.

Se escribió primero la prueba y se ejecutó sin V022: falló porque la base llegaba a V021,
como se esperaba. Después de crear V022 pasaron las 16 pruebas nuevas, junto con numeración
y smoke de migraciones existentes: **51 pruebas, cero fallos/errores/omitidas**.

## 3. Conservación comprobada

La base de actualización contiene las semillas actuales del proyecto y fixtures adicionales:
usuarios y cuadrilla, configuración de frecuencia, una medición de ejemplar modificada,
un lugar con geometría, metadatos de foto de especie y un ítem de unidad personalizado,
inactivo y con baja lógica.

Para cada tabla pública previa, excepto el historial Flyway, la prueba toma huellas de todas
sus filas y las compara después. Las tablas de catálogos admiten filas adicionales, pero
deben conservar todas las anteriores sin cambios. Las demás tablas deben conservar exactamente
sus filas. También se comparan columnas, índices y constraints de cada tabla anterior y
versiones/checksums/estado de las migraciones previas.

No se modifican etiquetas, metadata, flags o bajas del ítem personalizado por coincidir su
código con una semilla. UNIT de unidad y UNIT de origen de reporte son independientes porque
la coincidencia se verifica por catálogo/código. Las únicas tablas nuevas son las seis del núcleo.

Esta es una actualización representativa de V021, no una copia de la base real. Las fotos de
prueba aquí son metadatos; la migración no lee, transforma ni borra archivos físicos de almacenamiento.
Las reglas de permiso, tipo/clase, mínimo de ubicaciones activas y transición por estado que
necesitan consultar otras filas siguen correspondiendo al futuro servicio.

## 4. Comandos y resultado de regresión

PowerShell, desde backend, con JDK 26 seleccionado solo en el proceso:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-26'
.\mvnw.cmd -B '-Dtest=InterventionsMigrationTest,MigrationNumberingTest,MigrationSmokeTest' test
.\mvnw.cmd -B clean test
```

Resultado de la ejecución completa: **BUILD SUCCESS**, salida 0; **605 pruebas, 0 fallos,
0 errores y 0 omitidas**, en 5 min 6 s. Incluye las 16 nuevas pruebas de migración y la
regresión de los módulos actuales. Los reportes están en backend/target/surefire-reports.

Persiste el aviso de cierre de Surefire ya observado en la referencia previa: termina su
JVM hija al agotar 30 segundos después de System.exit(0), aunque todas las pruebas pasan
y Maven devuelve 0. Se registra sin ocultarlo ni modificar hilos de otros módulos para esta tarea.
Maven clean elimina únicamente productos de compilación de backend/target, cuyo destino
se verificó dentro del workspace. No es Flyway clean ni un borrado de base de datos.

La [referencia anterior](SPEC-200-referencia-pruebas.md) conserva los 589 tests backend y
555 frontend previos. No se repite frontend porque esta etapa no cambia su código ni contratos
implementados; los DTO nuevos de SPEC-200 aún son especificación.

## 5. Estado posterior

Los tres pasos de esta etapa están completados: archivo nuevo, prueba aislada y comparación
de conservación de datos/definiciones previos. El SQL está probado en contenedores temporales.
No se inició el backend contra
la base de trabajo, no se ejecutó Docker Compose ni se usaron credenciales de esa base.
Aplicar V022 a una base en uso queda fuera de estos tres pasos y requiere su respaldo y
ensayo de actualización correspondientes.

La etapa posterior es mapear entidades/repositorios y desarrollar los servicios del núcleo,
conservando pendientes las políticas de fotos, indicadores y correcciones del personal propio.
