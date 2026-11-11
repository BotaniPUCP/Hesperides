# Sprint Backlog — Hesperides

> **Qué es este documento.** El trabajo que el equipo se compromete a terminar en cada sprint,
> desglosado en tareas, con su estado. Sale del [`PRODUCT-BACKLOG.md`](product-backlog.md): las
> historias, sus criterios de aceptación y sus puntos se definen allí y aquí **no se repiten**.
> Si una historia cambia, se corrige en el Product Backlog y este documento solo la referencia.
>
> **Corte:** 22 oct 2026. **Sprint en curso:** S2 (cierra el 24 oct). **Siguiente:** S3 (25 oct – 11 nov).

---

## Cómo leer este documento

**Estado de una historia en el sprint:**

| Estado | Significa |
|---|---|
| ✅ **Hecha** | Cumple todos sus criterios de aceptación y la [Definición de Hecho](#definición-de-hecho) |
| 🔄 **En curso** | Hay código integrado, pero falta al menos un criterio |
| ⏳ **No iniciada** | Sin código integrado en el repositorio |
| ↪️ **Arrastre** | No cerró en su sprint y pasa al siguiente |

> **Solo cuentan los puntos de historias ✅.** Una historia al 90% suma 0 en el burndown: los puntos
> miden valor entregado, no esfuerzo invertido.
>
> **De dónde sale el estado.** Del código integrado en `develop` y en las ramas de feature publicadas
> al corte. **Trabajo sin subir no aparece aquí.** Cada estado se confirma en la Sprint Review.

---

## Sprint 2 · 7 oct – 24 oct *(en curso)*

### Objetivo del sprint

> **El catastro arranca con datos reales y el capataz puede registrar su trabajo desde el móvil:
> fotos, ubicación en el mapa e insumos.**

| | |
|---|---|
| Capacidad comprometida | **60 pts** (10 historias) |
| Puntos hechos al corte | **8 pts** |
| Puntos en curso | **26 pts** |
| Puntos sin iniciar | **26 pts** |

### Historias comprometidas

| ID | Historia | Pts | Prioridad | Estado | Evidencia |
|---|---|---|---|---|---|
| **C-10** | Importar el inventario forestal georreferenciado | 8 | Alta | ✅ | Migraciones `V012`–`V014`; consultable en `/inventario-verde` |
| **C-01** | Registro de elementos verdes en el mapa | 8 | Alta | 🔄 | Formulario web, carga CSV y detección de duplicados por cercanía. **Falta la captura móvil sin conexión** |
| **C-08** | Procedencia del dato dendrométrico | 5 | Alta | 🔄 | `data_source` y evaluaciones con historial. **Falta validar** la ficha («estimado por especie», «sin medir») |
| **C-12** | Tipo de uso de cada sección | 3 | Media | 🔄 | Catálogo `USE_TYPE` y tipo de uso por sección cargados. El filtro en reportes depende de F-06 (S4) |
| **A-07** | Gestión de cuadrillas y sectores | 5 | Alta | 🔄 | Entidad de cuadrillas desde S1. **Falta** la asignación sección → sector con vigencia y su pantalla |
| **C-02** | Registro progresivo del catastro | 5 | Alta | 🔄 | El catastro opera incompleto. **Falta** el porcentaje de avance y la intervención contra una zona (depende de B-01) |
| **B-02** | Evidencia fotográfica | 8 | Alta | ⏳ | Depende de B-01 |
| **B-03** | Marcado de zona intervenida en el mapa | 8 | Alta | ⏳ | Depende de B-01. El mapa 3D ya permite elegir un punto |
| **B-04** | Registro de insumos y materiales | 5 | Alta | ⏳ | Depende de B-01 y A-05 |
| **B-05** | Vista de actividades del día y la semana | 5 | Alta | ⏳ | Depende de B-01 |

> ⚠️ **B-01 (registro de actividad diaria, S1) no tiene código integrado.** Las cuatro historias B de
> este sprint cuelgan de ella: sin intervención no hay a qué adjuntar fotos, ubicación ni insumos.
> Es el **impedimento principal del sprint** (ver [Impedimentos](#impedimentos-y-riesgos)).

### Desglose en tareas

Cada tarea se marca al integrarse en `develop` con sus tests en verde.

**C-10 · Importar el inventario forestal** ✅
- [x] Migración de especies y ejemplares (`V012`, `V013`)
- [x] Semilla con los 962 registros de `catastro campus.xlsx`, agrupaciones incluidas (`V014`)
- [x] `legacy_code` sin el literal `"null"`
- [x] API de lectura y pantalla del inventario verde
- [x] Ejemplares dibujados en el mapa 3D y buscables por código

**C-01 · Registro de elementos verdes en el mapa** 🔄
- [x] Formulario web de registro con selector de ubicación en el mapa
- [x] Carga por CSV con vista previa y exportación
- [x] Detección de duplicados por cercanía según el tipo de planta
- [x] Fotos en almacenamiento propio (directorio local o S3)
- [ ] Captura desde el móvil con guardado local y subida diferida (modelo de B-02)
- [ ] Ofrecer fusionar al detectar un duplicado

**C-08 · Procedencia del dato dendrométrico** 🔄
- [x] Columna `data_source` (`MEASURED` / `GENERIC` / `UNKNOWN`)
- [x] Árboles y palmeras importados nacen `UNKNOWN`
- [x] Evaluaciones con historial
- [ ] Rechazar `GENERIC` en árboles y palmeras (validación de negocio)
- [ ] Ficha: valor `GENERIC` atenuado y `UNKNOWN` como «sin medir»
- [ ] Test que asegure que ninguna regla lee una altura que no sea `MEASURED`

**C-12 · Tipo de uso de cada sección** 🔄
- [x] Catálogo `USE_TYPE` con los seis tipos del mapa del cliente
- [x] Tipo de uso de cada sección tomado de su capa
- [ ] Mostrar y filtrar el tipo de uso en el mapa
- [ ] *(S4, con F-06)* Filtro en reportes de cobertura y mapa de calor

**A-07 · Gestión de cuadrillas y sectores** 🔄
- [x] Entidad de cuadrillas
- [ ] Asignación sección → sector con vigencia (`valid_from` / `valid_to`)
- [ ] Cuadrilla y `SUPERVISOR` de los 3 sectores verdes
- [ ] Alcance: el `SUPERVISOR` solo ve y registra en su sector
- [ ] Pantalla de cuadrillas y sectores para `COORDINADOR`
- [ ] Resolver P-15: sector de «Jardín Rosales» *(con el cliente)*

**C-02 · Registro progresivo del catastro** 🔄
- [x] Ninguna pantalla del catastro exige el inventario completo
- [ ] Indicador de avance del catastro en porcentaje
- [ ] Intervención registrada contra una zona sin elemento catastrado *(tras B-01)*

**B-02 · Evidencia fotográfica** ⏳
- [ ] `intervention_evidences` con `uploaded_at` y `client_reference`
- [ ] Endpoint de subida idempotente
- [ ] Guardado local en el móvil y cola de subida
- [ ] Indicador de pendientes que arranca en rojo y pasa a verde
- [ ] Mensaje sin espacio en el dispositivo

**B-03 · Marcado de zona intervenida en el mapa** ⏳
- [ ] Geometría de la intervención en base de datos
- [ ] Captura por GPS en el móvil
- [ ] Marcado sobre el mapa en web, reutilizando el selector de ubicación
- [ ] Zona de la jerarquía como respaldo cuando no hay GPS

**B-04 · Registro de insumos y materiales** ⏳
- [ ] Insumos por intervención (insumo + cantidad + unidad)
- [ ] Pantalla «amable»: lista corta y cantidades con botones

**B-05 · Vista de actividades del día y la semana** ⏳
- [ ] Consulta por día y semana con filtros de sector, cuadrilla, clase y tipo
- [ ] Alcance por rol
- [ ] Prueba de carga: menos de 2 s con un año de datos

### Trabajo no planificado

Trabajo integrado durante el sprint que **no estaba en el compromiso**. Se registra para que la
velocidad del equipo se lea bien: el esfuerzo existió, aunque no sume puntos del sprint.

| Trabajo | Módulo | Rama | Comentario |
|---|---|---|---|
| Mapa 3D del campus, capas y buscador (SPEC-102) | M2 | `develop` | Absorbe W-03. Habilita B-03, C-06 y F-06 |
| Registro del catastro y estándares de carga (SPEC-103) | M2 | `develop` | Base de C-01 |
| Galería de fotos por especie (SPEC-104) | M2 | `develop` | Previsto para S3 |
| **Catálogo de lugares** con perspectivas, fotos y migración de las 411 referencias | M9 | `feature/aviso-cambios-sin-guardar` | Sin historia en el Product Backlog: **hay que darla de alta** |
| Limpieza diaria de fotos dadas de baja hace más de 4 meses | Transversal | `feature/aviso-cambios-sin-guardar` | |
| Modo oscuro | Transversal | `develop` | |
| Aviso de cambios sin guardar en todos los formularios | Transversal | `feature/aviso-cambios-sin-guardar` | Estándar de usabilidad |
| Selección multisector de riego (D-01) | M7 | `wip/riego-m7` | Historia de S3 adelantada |

> **Pendiente de integrar:** `feature/aviso-cambios-sin-guardar` tiene 8 commits que `develop` aún
> no recibe. Abrir el PR antes del cierre del sprint.

### Impedimentos y riesgos

| # | Impedimento | Efecto | Acción | Responsable |
|---|---|---|---|---|
| I-1 | **B-01 sin código integrado** | Bloquea B-02, B-03, B-04, B-05 y parte de C-02: **31 pts** | Arrastrar B-01 a S3 como **primera prioridad** y no abrir otra historia B hasta cerrarla | Por asignar |
| I-2 | **No existe la app móvil** | B-02 y C-01 piden captura sin conexión | Decidir en planning: PWA sobre el frontend actual o app nativa | Equipo |
| I-3 | Sector de «Jardín Rosales» sin definir (P-15) | A-07 no puede cerrar | Preguntar al cliente | Por asignar |
| I-4 | Rama con lugares y avisos sin integrar | Riesgo de conflictos al juntar con `develop` | PR antes del 24 oct | Por asignar |

### Arrastre propuesto a S3

| ID | Pts | Motivo |
|---|---|---|
| B-01 *(de S1)* | 8 | Sin iniciar; bloquea el resto de la épica B |
| C-01 | 8 | Falta la captura móvil |
| C-08 | 5 | Falta la validación y la ficha |
| C-12 | 3 | Falta mostrarlo en el mapa |
| A-07 | 5 | Falta la asignación con vigencia |
| C-02 | 5 | Depende de B-01 |
| B-02, B-03, B-04, B-05 | 26 | Dependen de B-01 |
| **Total** | **60** | |

> ⚠️ **S3 ya tenía 86 pts.** Sumar 60 de arrastre lo lleva a 146, imposible en 18 días. En la
> planning de S3 hay que **devolver historias al Product Backlog**, no acumularlas. Candidatas a
> salir de S3: C-04, C-05, A-08 y B-11 (media o baja prioridad, sin dependientes).

---

## Sprint 3 · 25 oct – 11 nov *(por planificar)*

> **Objetivo propuesto:** riego e incidencias operativos, y el registro de intervenciones cerrado de
> punta a punta.

Compromiso **previo al arrastre**, tal como lo propone el Product Backlog. Se rehace en la planning.

| ID | Historia | Pts | Prioridad |
|---|---|---|---|
| D-01 | Registro del turno de riego por sector | 8 | Alta |
| D-02 | Cobertura del campus en la ventana de 15 días | 8 | Alta |
| E-01 | Registro de incidencia | 5 | Alta |
| E-02 | Seguimiento de estado | 5 | Alta |
| C-09 | Verificación en campo antes de asignar régimen | 3 | Alta |
| C-03 | Código de identificación nuevo para arbolado | 5 | Alta |
| A-06 | Frecuencias de mantenimiento | 8 | Media |
| A-09 | Eventos del campus | 5 | Media |
| B-06 | Actividades sobre varias zonas | 5 | Media |
| B-07 | Actividades de larga duración | 5 | Media |
| B-08 | Cantidad pedida vs. ejecutada | 3 | Media |
| B-11 | Ficha técnica de poda | 3 | Media |
| C-05 | Historial por elemento | 3 | Media |
| C-06 | Filtros y búsqueda en el mapa | 5 | Media |
| C-11 | Ficha de elemento verde | 5 | Media |
| E-08 | Catálogo de tipos de incidencia | 3 | `HAB` |
| E-09 | Maquinaria de corte solo en sábados, domingos y feriados | 3 | Media |
| C-04 | Conservar el código heredado | 2 | Media |
| A-08 | Parámetros generales | 2 | Baja |
| **Total** | | **86** | |

> **Ya hay avance en tres:** D-01 (rama `wip/riego-m7`), A-06 (SPEC-101, frecuencias con engine de
> cumplimiento) y A-08 (pantalla de parámetros del sistema). Revisar en la planning cuánto les falta.

---

## Sprint 1 · 19 sep – 6 oct *(cerrado)*

| ID | Historia | Pts | Estado |
|---|---|---|---|
| A-01 | Gestión de usuarios | 5 | ✅ |
| A-02 | Roles y permisos | 3 | ✅ |
| A-03 | Catálogo de tipos de intervención | 5 | ✅ |
| A-04 | Catálogo de zonas del campus | 8 | ✅ |
| A-05 | Catálogo de insumos y unidades | 3 | 🔄 |
| B-01 | Registro de actividad diaria | 8 | ↪️ a S3 |
| **Hechos** | | **21 de 32** | |

---

## Definición de Hecho

Una historia está **✅ Hecha** solo si cumple todo esto:

- [ ] Cumple **todos** sus criterios de aceptación del Product Backlog
- [ ] Tests unitarios y de integración en verde; casos normales, extremos y de error cubiertos
- [ ] Respeta las capas y los límites de tamaño de [`specs/REGLAS.md`](../../specs/REGLAS.md)
- [ ] Toda entrada externa validada por schema; errores con el sobre `{ok, message, data}`
- [ ] Migraciones Flyway numeradas y probadas sobre una base limpia
- [ ] Verificada en un **navegador real**, no solo con `curl` ni tests
- [ ] Integrada en `develop` por PR revisado
- [ ] Su spec actualizado en [`specs/REGISTRO.md`](../../specs/REGISTRO.md)
