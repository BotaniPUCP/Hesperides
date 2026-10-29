# Referencia de pruebas previa a implementar intervenciones

Fecha: 22 oct 2026, America/Lima.
Commit de código: `a5e5c6e422951d68a6b5fd17d260242cfa8b3621`.
Documentación de SPEC-200 en preparación, sin cambios funcionales en backend/frontend.
Relacionado: [plan de implementación](SPEC-200-implementacion-intervenciones.md).

## 1. Entorno preparado

- Se instalaron las dependencias frontend con `npm.cmd ci`, usando el lockfile existente
  y una caché temporal. No se actualizaron package.json ni package-lock.json.
- Node 22.19.0, npm 10.9.3; se usa npm.cmd para respetar la política de scripts PowerShell.
- Maven Wrapper descargó Maven 3.9.9 en la caché habitual del usuario.
- JAVA_HOME apuntaba a JDK 25.0.3 mientras java del PATH resolvía Java 26. El primer intento
  de backend falló al compilar para release 26: no fue un fallo de un test de aplicación.
- Se seleccionó `C:/Program Files/Java/jdk-26` únicamente para el proceso de Maven del
  reintento. No se modificaron JAVA_HOME global, PATH ni las versiones del proyecto.
- Se inició Docker Desktop y se comprobó Docker Engine 29.9.2. Las pruebas backend usan
  Testcontainers/PostGIS temporal y configuración de tests; no se ejecutó Docker Compose.
- Después de npm ci quedó disponible la documentación de Next.js en node_modules/next/dist/docs.

## 2. Comandos y resultados

| Directorio | Comando | Resultado |
|------------|---------|-----------|
| frontend | `npm.cmd ci --cache "$env:TEMP/hesperides-npm-cache" --no-audit --no-fund` | Correcto; 705 paquetes instalados |
| frontend | `npm.cmd test -- --runInBand` | Correcto; 80 suites y 555 pruebas aprobadas, sin snapshots |
| frontend | `npm.cmd run lint` | Correcto; salida 0 |
| frontend | `npm.cmd run build` | Correcto; compilación de producción, comprobación TypeScript y generación de páginas |
| backend | `mvnw.cmd -B test`, con JAVA_HOME del proceso en JDK 26 | Primera ejecución completa: 589 pruebas, 2 fallos por clases generadas incompatibles, 0 errores, 0 omitidas |
| backend | `mvnw.cmd -B clean test`, con JAVA_HOME del proceso en JDK 26 | Referencia final: BUILD SUCCESS; 589 pruebas, 0 fallos, 0 errores, 0 omitidas; 4 min 25 s |

El primer intento completo con JDK 26 ejecutó 589 pruebas: 2 fallos, 0 errores y 0 omitidas.
Fallaron `SpecimenImportIntegrationTest.exportCorrectAndLoadAgainUpdatesTheSpecimen` y
`theWholeExportLoadsBackWithoutErrors` porque la exportación respondió 500 en lugar de 200.
El reporte mostró `java.lang.Error: Unresolved compilation problems` al ejecutar
`SpecimenExportRepository.text`, indicando que pattern matching en switch requería nivel 21+,
a pesar de que las pruebas corrían con Java 26. Maven había informado «Nothing to compile».
La recompilación limpia compiló las 299 fuentes principales y las 62 fuentes de test con
release 26. Las 17 pruebas de SpecimenImportIntegrationTest, incluidas las dos que habían
fallado, pasaron y la suite completa terminó correctamente. Esto identifica los fallos de la
primera ejecución como un problema de artefactos generados anteriores, no como regresiones
del código actual. No se modificó ese código ni sus tests.

Antes de Maven clean se verificó que el directorio generado era exactamente backend/target
del workspace. Se limpió ese producto de compilación, no una base de datos. Maven clean es
distinto de Flyway clean; no se ejecutaron Flyway clean/repair ni Docker Compose down.

Reproducción de backend desde PowerShell, sin persistir cambios en el entorno del usuario:

```powershell
Set-Location D:\GitHubProyectos\PIDS\Hesperides\backend
$previousJavaHome = $env:JAVA_HOME
try {
    $env:JAVA_HOME = 'C:/Program Files/Java/jdk-26'
    .\mvnw.cmd -B clean test
} finally {
    $env:JAVA_HOME = $previousJavaHome
}
```

La ejecución de Maven de esta revisión utilizó un proceso independiente con esa selección
de JDK; el bloque anterior permite repetirla conservando JAVA_HOME en una consola interactiva.

## 3. Observaciones y límites

- Jest emitió advertencias existentes de actualizaciones React fuera de `act(...)`, pero
  terminó con todas las pruebas aprobadas. No se modificaron tests para silenciarlas.
- npm informó dependencias deprecadas ya fijadas en el lockfile; no se actualizaron versiones
  dentro de esta preparación. `--no-audit` no equivale a una revisión de vulnerabilidades.
- Java/Maven emitieron advertencias de acceso nativo/reflexión en sus dependencias. No se
  alteraron flags globales ni pom.xml para ocultarlas.
- Surefire informó que terminó forzosamente su JVM hija al agotarse 30 segundos después
  de System.exit(0). Maven terminó con salida 0 y BUILD SUCCESS, y reportó las 589 pruebas
  aprobadas. Se conserva como observación de cierre del proceso; no se investigaron ni
  cambiaron los hilos de la aplicación en esta referencia inicial.
- No se hizo verificación manual en navegador: no hay una interfaz nueva de intervenciones
  en esta entrega. La futura implementación web deberá verificarse allí según INV-10.
- Una suite actual aprobada es una referencia previa, no prueba de que una migración futura
  preserve todos los datos. T03 deberá ensayar actualización con datos representativos y
  comprobar checksums de las migraciones publicadas.
- Este trabajo no ha creado una base de incidencias ni aplicado SQL de SPEC-200 a una base
  de uso. Las decisiones de fotos, indicadores y múltiples ubicaciones continúan pendientes.

## 4. Uso de esta referencia

Comparar contra estos checks después de implementar cada parte afectada, y repetir las
suites completas al integrar el flujo. Conservar diferencias y fallos preexistentes con su
contexto. Los reportes Maven se generan en backend/target/surefire-reports y los productos
de compilación/dependencias permanecen fuera del control de versiones según .gitignore.
El entorno queda preparado para desarrollo local y Docker Desktop permanece iniciado.
La integración de incidencias y las decisiones operativas pendientes no se habilitaron como
consecuencia de estos checks. La actualización de una base con una futura migración de
intervenciones aún necesita su ensayo específico de conservación de datos.
