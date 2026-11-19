# HESPERIDES — Sprint Backlog de la Semana
**Alcance del Sprint**: Integración de los módulos de **Inventario Verde, Riego, Intervenciones e Incidencias**, correcciones de estabilización y **despliegue integrado**.

---

## 1. Meta del Sprint (Sprint Goal)
Lograr la **integración funcional, estabilización y despliegue en producción** de los cuatro módulos operativos centrales de Hespérides (**Inventario Verde y Catastro, Riego, Intervenciones e Incidencias**), asegurando que convivan sobre un único esquema de base de datos, compartan trazabilidad por ejemplar/sector y cuenten con las correcciones de validación y experiencia de usuario.

---

## 2. Resumen del Sprint por Frente de Trabajo

| Frente del Sprint | Épica / Módulo del Product Backlog | Historias de Usuario (IDs) | Story Points (SP) | Estado |
| :--- | :--- | :--- | :---: | :---: |
| **1. Módulo de Inventario Verde y Catastro + Correcciones** | Épica C · Catastro verde (M2) | `C-01`, `C-03`, `C-04`, `C-05`, `C-08`, `C-09`, `C-10`, `C-11`, `C-13`, `C-14`, `C-15` | **47 SP** | Completado ✅ |
| **2. Módulo de Riego** | Épica D · Riego (M7) | `D-01`, `D-02`, `D-03` | **18 SP** | Completado ✅ |
| **3. Módulo de Intervenciones** | Épica B · Intervenciones (M3) | `B-01`, `B-03`, `B-04`, `B-05`, `B-06`, `B-07`, `B-08`, `B-09`, `B-10`, `B-11` | **43 SP** | Completado ✅ |
| **4. Módulo de Incidencias** | Épica E · Incidencias (M5) | `E-01`, `E-02`, `E-03`, `E-04`, `E-05`, `E-06`, `E-07`, `E-08` | **24 SP** | Completado ✅ |
| **5. Integración de los 4 Módulos y Despliegue** | Transversal (`develop` / Infra / QA) | Unificación de BD (`V024`-`V026`), pruebas de integración, Docker y despliegue | *Transversal* | Completado ✅ |

---

## 3. Desglose de Historias y Tareas del Sprint Backlog

### 3.1. Módulo de Inventario Verde y Catastro + Correcciones (Épica C · M2)

| ID HU | Req. | Historia de Usuario (Product Backlog v7) | SP | ID Tarea | Tarea Técnica / Corrección Ejecutada | Tipo | Estado |
| :---: | :---: | :--- | :-: | :---: | :--- | :---: | :---: |
| **C-11** | REQ 2.3 | *COMO COORDINADOR QUIERO consultar la ficha de cada ejemplar con su información botánica, ubicación y estado PARA tomar decisiones de manejo sin ir físicamente al árbol.* | 5 | **T-INV-01** | Implementar catálogo botánico de especies (`/inventario-verde`) y listado general de ejemplares (`/catastro/ejemplares`) en vista de tarjetas y tabla, con filtros por ubicación, búsqueda sin tildes y registro de nuevas especies (`RegistroEspecieModal`). | Desarrollo | Hecho ✅ |
| **C-11** | REQ 2.3 | *(Misma HU)* | — | **T-INV-02** | **Corrección en Ficha de Especie (`SpeciesInfo.tsx`, `SpeciesDetailScreen.tsx`)**: exponer origen botánico (*Nativa/Introducida*), descripción, notas de cuidado y lista completa de sectores en campus; ocultar enlace a ejemplares cuando la especie tiene `0` individuos censados. | Corrección | Hecho ✅ |
| **C-11** | REQ 2.3 | *(Misma HU)* | — | **T-INV-03** | **Corrección de navegación y filtrado por sector (`InventarioEjemplaresScreen.tsx`)**: enlazar cada chip de ubicación en la ficha de especie hacia `/catastro/ejemplares?search=...&location=...` usando `useSearchParams()` con `<Suspense>` para que filtre especie + sector al instante. | Corrección | Hecho ✅ |
| **C-08 / C-09** | REQ 2.3 | *COMO COORDINADOR QUIERO saber si la altura de un ejemplar viene de una medición real o estimación y verificar la altura antes de programar poda con grúa.* | 8 | **T-INV-04** | Implementar ficha dendrométrica (`SpecimenMeasures.tsx`) con cálculo de régimen operativo (< 5 m personal PUCP vs >= 5 m grúa tercerizada) y modal de actualización de medidas (`SpecimenEditModal.tsx`). | Desarrollo | Hecho ✅ |
| **C-08** | REQ 2.3 | *(Misma HU)* | — | **T-INV-05** | **Corrección de recarga de medidas (`SpecimenDetailScreen.tsx`, `useInventarioVerde.ts`)**: refrescar automáticamente los datos del ejemplar y su historial al guardar nuevas medidas sin obligar al usuario a salir y volver a entrar a la ficha. | Corrección | Hecho ✅ |
| **C-13 / C-05** | REQ 1.5 / 2.7 | *COMO ADMIN/COORDINADOR QUIERO registrar evaluaciones fitosanitarias VTA y ver todas las intervenciones que recibió un ejemplar.* | 6 | **T-INV-06** | Implementar registro e historial de evaluaciones fitosanitarias VTA (`SpecimenAssessments.tsx`) e integración del historial de intervenciones realizadas sobre el ejemplar (`SpecimenInterventions.tsx`). | Integración | Hecho ✅ |
| **C-10 / C-03 / C-04** | REQ 2.13 / 2.9 / 2.10 | *COMO COORDINADOR QUIERO cargar el levantamiento de campo por CSV con código único `EV-XXXXXX` y placa antigua.* | 15 | **T-INV-07** | **Corrección de plantilla y validaciones CSV (`ejemplares.csv`, `Cells.java`, `SpecimenRowReader.java`, `SpecimenResolver.java`, `mensajes.ts`)**: dejar vacía la foto en la plantilla para carga directa de prueba; validar rangos positivos/no negativos de medidas, longitudes máximas de texto y códigos `EV-XXXXXX` repetidos dentro del mismo CSV; limpiar banner redundante en duplicados. | Corrección | Hecho ✅ |
| **C-01 / C-15** | REQ 2.2 / 2.15 | *COMO SUPERVISOR/ADMIN QUIERO capturar un árbol o mobiliario (tachos y bebederos) en campo con foto, especie y posición.* | 10 | **T-INV-08** | **Corrección en formulario de registro (`useRegistroPlanta.ts`, `useRegistroComponente.ts`)**: limpiar inmediatamente la alerta roja de error (*«El punto cae fuera del campus»*) apenas el usuario corrige las coordenadas o mueve el pin dentro del campus. | Corrección | Hecho ✅ |
| **C-14** | REQ 2.3 | *COMO SUPERVISOR QUIERO visualizar un visor fotográfico tipo lightbox.* | 3 | **T-INV-09** | Implementar visor fotográfico a pantalla completa (`SpeciesPhotoViewer.tsx`) con soporte de galería por especie y foto referencial de respaldo en ejemplares sin foto propia. | Desarrollo | Hecho ✅ |

---

### 3.2. Módulo de Riego (Épica D · M7)

| ID HU | Req. | Historia de Usuario (Product Backlog v7) | SP | ID Tarea | Tarea Técnica / Corrección Ejecutada | Tipo | Estado |
| :---: | :---: | :--- | :-: | :---: | :--- | :---: | :---: |
| **D-01** | REQ 7.1 | *COMO SUPERVISOR QUIERO registrar el turno de riego de mi cuadrilla (horario, sector y fuente de agua) PARA que la jefatura sepa qué zonas se regaron y con qué método.* | 8 | **T-RIE-01** | Implementar registro de turnos de riego con **selección multisector** (`V024__irrigation_multi_sector.sql`), fuente de agua, método y acceso directo desde el menú principal (`/riego`). | Desarrollo | Hecho ✅ |
| **D-02** | REQ 7.2 | *COMO COORDINADOR QUIERO ver qué porcentaje del campus se regó en el mes y qué zonas llevan más días sin agua PARA asegurar una cobertura hídrica regular.* | 8 | **T-RIE-02** | Implementar indicadores de cobertura hídrica mensual y seguimiento de sectores regados vs pendientes en la pantalla de Riego. | Desarrollo | Hecho ✅ |
| **D-03** | REQ 7.4 | *COMO COORDINADOR QUIERO que el sistema conozca la ventana horaria de riego permitida PARA no programar riego diurno que interfiera con los peatones.* | 2 | **T-RIE-03** | Validar ventana horaria de riego e integrar tipos compartidos de `shared/types` corrigiendo errores de compilación y linter con el resto de módulos. | Corrección | Hecho ✅ |

---

### 3.3. Módulo de Intervenciones (Épica B · M3)

| ID HU | Req. | Historia de Usuario (Product Backlog v7) | SP | ID Tarea | Tarea Técnica / Corrección Ejecutada | Tipo | Estado |
| :---: | :---: | :--- | :-: | :---: | :--- | :---: | :---: |
| **B-01 / B-09 / B-10** | REQ 3.1 / 3.2 / 3.6 | *COMO COORDINADOR/SUPERVISOR QUIERO asignar tareas a una cuadrilla, registrar la actividad ejecutada y validarla antes de que entre al historial definitivo.* | 14 | **T-INT-01** | Implementar flujo completo de intervenciones (`SPEC-200`, migración `V025__interventions_spec200.sql`) con ciclo de estados (`PLANNED` → `IN_PROGRESS` → `EXECUTED` → `VALIDATED` / `OBSERVED` / `CANCELLED`) en `/intervenciones`. | Desarrollo | Hecho ✅ |
| **B-03 / B-06 / B-07** | REQ 3.4 / 3.10 / 3.9 | *COMO SUPERVISOR QUIERO georreferenciar la intervención, cubrir varios lugares a la vez y registrar avances parciales de labores de varios días.* | 18 | **T-INT-02** | Implementar formulario operativo (`InterventionForm.tsx`, `InterventionWorkflow.tsx`) con selección de múltiples zonas/lugares/ejemplares y registro de sesiones de avance parcial. | Desarrollo | Hecho ✅ |
| **B-04 / B-08 / B-11** | REQ 3.5 / 3.11 / 3.12 | *COMO SUPERVISOR/COORDINADOR QUIERO registrar consumo de insumos (comparando planeado vs usado) y la ficha técnica cuando la labor fue poda mayor o tala.* | 11 | **T-INT-03** | Implementar captura de insumos consumidos, validación de evidencias fotográficas (incluyendo decodificación WebP) y ficha técnica arbórea para podas mayores y talas. | Desarrollo | Hecho ✅ |

---

### 3.4. Módulo de Incidencias (Épica E · M5)

| ID HU | Req. | Historia de Usuario (Product Backlog v7) | SP | ID Tarea | Tarea Técnica / Corrección Ejecutada | Tipo | Estado |
| :---: | :---: | :--- | :-: | :---: | :--- | :---: | :---: |
| **E-01 / E-04 / E-05 / E-08** | REQ 5.1 / 5.7 / 5.8 / 5.9 | *COMO SUPERVISOR/COORDINADOR QUIERO registrar un problema en campo con foto, tipo, urgencia y canal de origen (Centuria o hallazgo interno).* | 11 | **T-INC-01** | Implementar flujo web de captura de incidencias (`SPEC-201`, `/incidencias/nueva`, `IncidentCaptureForm.tsx`) distinguiendo hallazgos vs encargos y canal externo/interno, con datos semilla de demostración. | Desarrollo | Hecho ✅ |
| **E-02 / E-03 / E-06 / E-07** | REQ 5.2 / 5.3 / 5.4 / 5.5 | *COMO COORDINADOR QUIERO ligar la incidencia a un ejemplar o sección, recibir sugerencia de atención, filtrarla por zona/tipo/estado y seguirla hasta su resolución.* | 13 | **T-INC-02** | Implementar bandeja filtrable y panel de detalle (`IncidentsScreen.tsx`, `IncidentDetailPanel.tsx`) con vinculación a ejemplares/secciones, sugerencia de responsable y cierre enlazado a una intervención (`V026__complete_incidents_web_flow.sql`). | Integración | Hecho ✅ |

---

### 3.5. Integración de los 4 Módulos, Correcciones Transversales y Despliegue

| ID Tarea | Actividad de Integración / Corrección / Despliegue | Módulos Afectados | Responsabilidad / Resultado | Estado |
| :---: | :--- | :---: | :--- | :---: |
| **T-INTG-01** | **Unificación de migraciones Flyway (`V024`, `V025`, `V026`)**: renumeración y ajuste de llaves foráneas entre `green_elements` (Inventario), `irrigation_shifts` (Riego), `interventions` (Intervenciones) e `incidents` (Incidencias) para que levanten desde cero sin colisiones. | BD (Los 4 módulos) | Esquema PostgreSQL/PostGIS unificado de `V001` a `V026`. | Hecho ✅ |
| **T-INTG-02** | **Corrección de pruebas de integración y linter tras el merge**: ajuste de `SecurityIntegrationTest`, `ImportIntegrationTest`, mocks con `AuthProvider`, limpieza de `eslint` y aviso de cambios sin guardar (`useUnsavedChanges`) en formularios. | Backend + Frontend | `679` tests unitarios en frontend + tests de integración en backend pasando con 0 errores de linter. | Hecho ✅ |
| **T-INTG-03** | **Preparación y validación de despliegue (`docker-compose.yml`, `next build`, `mvnw package`)**: restauración de archivos de orquestación Docker, validación de build de producción de Next.js (`Suspense` + rutas estáticas/dinámicas) y empaquetado del JAR de producción de Spring Boot. | Infra / Despliegue | Build de producción de frontend y backend verificados y listos para despliegue en servidor. | Hecho ✅ |

