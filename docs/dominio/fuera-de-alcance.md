# Fuera de alcance — Hesperides

> **Qué es este documento.** Todo lo que existe en el dominio del cliente pero **no se construye en
> la primera versión** (cierre: 26 de noviembre de 2026), separado en dos grupos:
>
> 1. **Fase futura** — se planea incluir después. El diseño actual **no debe cerrarle la puerta**.
> 2. **No se planea incluir** — queda fuera del producto, con su motivo.
>
> **Para qué sirve.** Que nadie reintroduzca por descuido algo descartado, ni dé por olvidado algo
> que solo se pospuso. Si una historia del [backlog](../PRODUCT-BACKLOG.md) toca algo de esta
> lista, se detiene y se discute.
>
> **Fuentes:** entrevistas 1 y 2 con el cliente, [KICK-OFF.md §4](../../KICK-OFF.md) y las
> decisiones del equipo al **25 de septiembre de 2026**.

---

## Lo que sí entra, para ubicar el límite

Una sola línea por ámbito; el detalle vive en el [catálogo de requisitos](catalogo-requisitos.md).

- **Usuarios:** el **jefe de sección**, con rol de administrador y de coordinador, y los
  **3 capataces**. Nadie más tiene cuenta. El rol `OPERARIO` se conserva en el catálogo por
  formalidad, sin cuentas asignadas.
- **Territorio:** el campus Pando completo, organizado en **sector → sección → subsección**, con el
  **tipo de uso** de cada sección.
- **Intervenciones** del personal estable sobre la taxonomía real (9 clases, 45 tipos), incluida la
  **ficha técnica de poda** cuando se usa escalera.
- **Incidencias** con **modelo propio**, al estilo de la gestión de incidencias de TI: registro,
  urgencia, estados (incluido **«en proceso»** mientras espera a un tercero) y cierre. **Las
  registra el capataz.** Una solicitud que llega por Centuria puede registrarse a mano en el
  sistema, pero el sistema no se conecta a Centuria.
- **Regla de maquinaria de corte:** los servicios con maquinaria ruidosa solo se programan en
  **sábados, domingos y feriados**.
- **Eventos del campus:** periodos bloqueantes (exámenes, jueves culturales) y de préstamo de
  jardines, sobre el campus, un sector o una sección. Los bloqueantes solo avisan.
- **Proveedores tercerizados:** solo sus **datos básicos**. Ni el seguimiento de sus servicios ni
  el detalle de sus actividades.
- **Información pública (QR):** dentro del alcance, pero es **la última prioridad**.

---

## 1. Fase futura — se planea incluir

### 1.1 Inventario de ~100 jardines y control de cumplimiento por jardín

| | |
|---|---|
| **Qué es** | La lista de jardines, con código numérico y shape, que recorre el servicio de corte de césped, y el check de «¿se cortaron todos?» al cerrar cada servicio |
| **Por qué se pospone** | Decisión del equipo (21 sep). El corte de césped se controla por **frecuencia**, no por cobertura de jardines |
| **Requisitos afectados** | `REQ 4.6` (checklist de cumplimiento) · el nivel **jardín** de `REQ 1.6` |
| **No cerrarle la puerta** | La jerarquía de zonas debe admitir un tercer nivel bajo **lugar** sin migrar datos |

### 1.2 Seguimiento de los servicios tercerizados

| | |
|---|---|
| **Qué es** | Registrar y controlar lo que hacen los proveedores (HERS y su empresa relacionada): contratos, programación y ejecución de cada servicio, informe final, conformidad, frecuencia pactada frente a la real y rendimiento (árboles/día, metrado/día) |
| **Por qué se pospone** | **No tenemos información de ello.** No hemos visto un contrato tipo, un informe de proveedor ni el detalle de qué revisa la sección antes de dar conformidad. En esta versión solo se registran los **datos básicos del proveedor** (`REQ 4.2`) |
| **Requisitos afectados** | `REQ 4.1`, `4.3`, `4.4`, `4.5`, `4.6`, `4.7`, `4.8`, `4.9`, `4.10` y el indicador que depende del rendimiento, `REQ 6.7` |
| **No cerrarle la puerta** | El proveedor ya existe como entidad propia: los servicios futuros cuelgan de él sin migrar datos |

### 1.3 Proveedores tercerizados como usuarios del sistema

| | |
|---|---|
| **Qué es** | Que los ingenieros de campo de HERS registren directamente en Hesperides el avance diario de sus servicios, en vez de entregar un informe al final |
| **Lo que dijo el cliente** | *«Me gustaría explorar esa posibilidad de que HERS pueda reportar de forma ágil usando esta herramienta»* (entrevista 2), aunque subir el informe ya le basta |
| **Por qué se pospone** | Abre un rol externo a la PUCP, con acceso, contrato y soporte propios. La primera versión es solo para la sección. Además, depende de §1.2: no hay seguimiento de servicios donde el proveedor pueda registrar |

### 1.4 Integración con Centuria

| | |
|---|---|
| **Qué es** | Conectarse a Centuria, la plataforma donde las unidades del campus piden atenciones (poda a demanda, sobre todo), para leer esas solicitudes y crear la incidencia sin transcribirla |
| **Por qué se pospone** | **No tenemos acceso a Centuria.** Es una plataforma de otra área, sin acuerdo técnico. Hoy el jefe de sección y el ingeniero de campo la revisan a diario a mano |
| **Mientras tanto** | Quien recibe la notificación de Centuria **puede** registrar la incidencia a mano en Hesperides. Es opcional, no un flujo que el sistema gestione |
| **Lo que arrastra** | **Avisar a la unidad solicitante** al cerrar la atención (`REQ 5.10`): la unidad no es usuaria del sistema y su canal hoy es Centuria o el correo |

### 1.5 Operarios y resto del personal como usuarios

| | |
|---|---|
| **Qué es** | Extender las cuentas a los **~26 operarios**, al ingeniero de campo, a las asistentes y a los practicantes |
| **Lo que dijo el cliente** | *«Primero trabajaremos con sus jefes de grupo, que son los capataces… en un corto plazo sería interesante extenderlo a todo el personal operativo»* (entrevista 1) |
| **Por qué se pospone** | La sección tiene **5 celulares** del campus y la adopción se valida primero con los capataces |
| **No cerrarle la puerta** | El rol `OPERARIO` **se conserva** en el catálogo `ROLE` por formalidad, sin cuentas asignadas. La intervención registra **quién la ejecutó** aparte de **quién la registró** |

### 1.6 Rehabilitación de jardines e intensidad de uso

| | |
|---|---|
| **Qué es** | Visibilizar qué espacios se degradan por uso intenso (jueves culturales, zonas de alto tránsito) y medir el costo de recuperarlos: cambio de cobertura, reposición de césped y plantas |
| **Lo que dijo el cliente** | *«Ese elemento me gustaría trabajarlo en el futuro»* (entrevista 1) |
| **No cerrarle la puerta** | Las intervenciones de rehabilitación ya se registran con la taxonomía actual, cada sección tiene su **tipo de uso** y los **préstamos** quedan registrados como eventos que marcan la sección como «requiere recuperación». El análisis futuro se construye **sobre esos datos**, sin capturar nada nuevo |

### 1.7 Vivero

| | |
|---|---|
| **Qué es** | El control de stock de plantas del vivero, del que se saca material para rehabilitar jardines |
| **Por qué se pospone** | Decisión del equipo |
| **Aclaración** | La clase de actividad **«Propagación y plantación» sí está en alcance**: se propaga en campo, no solo en el vivero. Las plantas que consume una intervención se registran como insumo, **sin rastrear de qué vivero salieron** |

### 1.8 Zoocriadero

| | |
|---|---|
| **Qué es** | Venados, tortugas motelo, pavos reales y una alpaca, con **inventario anual al Ente Técnico Forestal** |
| **Por qué se pospone** | Es fauna, no flora: dominio y normativa distintos |
| **No cerrarle la puerta** | Nada del modelo de flora debe asumirse como «todo lo que gestiona la sección» |

### 1.9 Inventario de plagas y productos agronómicos

| | |
|---|---|
| **Qué es** | La lista de plagas, la de productos y las ~6 especies que necesitan una o dos aplicaciones extra sobre el ciclo estacional de control fitosanitario |
| **Por qué se pospone** | Es un módulo propio ligado a un servicio hoy tercerizado |

### 1.10 Migración de las fotos históricas del Drive

| | |
|---|---|
| **Qué es** | Traer al sistema las ~250 fotos que el Excel actual enlaza desde Google Drive |
| **Por qué se pospone** | Enlaces que pueden caducar, permisos de una cuenta que no controlamos y ninguna distinción entre fotos de antes y de después. Necesita su propio spec |

### 1.11 Trazabilidad de material reutilizado

| | |
|---|---|
| **Qué es** | El traslado de césped o confitillo de un lugar a otro, con un origen y varios destinos (hoja oculta del Excel) |
| **Por qué se pospone** | Es un concepto de inventario que el cliente registra de forma incipiente. No se modela a ciegas |

### 1.12 Enlace con la ortofoto del campus

| | |
|---|---|
| **Qué es** | Usar la ortofoto con dron de 2-3 cm de resolución que prepara una tesista para afinar el catastro y contrastarlo con la de 2016 |
| **Por qué se pospone** | Depende de un trabajo externo que avanza en paralelo, sin fecha |
| **No cerrarle la puerta** | Las geometrías se guardan en un sistema de referencia estándar, para superponerlas con una capa ráster futura |

### 1.13 Gestión de residuos vegetales como módulo propio

| | |
|---|---|
| **Qué es** | Seguir el traslado de residuos al centro de acopio y su eliminación |
| **Por qué se pospone** | Hoy son 10 registros de un solo tipo. Mientras tanto, el traslado se registra como una intervención más |

### 1.14 Integración con el mapa interactivo del cliente

| | |
|---|---|
| **Qué es** | Publicar automáticamente cada intervención en el mapa que Carolina alimenta hoy a mano cada semana y que comparten las tres secciones de OSG |
| **Por qué se pospone** | Decisión del equipo (25 sep): **sería otro proyecto**. El mapa vive en el repositorio personal de una locadora de servicios y no tenemos acceso a él |
| **Lo que se pierde mientras tanto** | Carolina sigue alimentando su mapa a mano. Hesperides tiene **su propio mapa** (registro, filtros, mapa de calor), pero no actualiza el del cliente |
| **No cerrarle la puerta** | La publicación debe poder añadirse **fuera de la transacción** que guarda una intervención, sin que ningún servicio de dominio conozca al proveedor del mapa. El análisis está en [`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md) |

### 1.15 Inventario botánico con medidas exactas

| | |
|---|---|
| **Qué es** | Importar el inventario de especies antiguo, sin coordenadas, con familia botánica, altura, diámetro de copa y fuste |
| **Por qué se pospone** | La altura solo decide **quién poda**, y para eso basta la **clase de altura** (< 5 m / ≥ 5 m) que el capataz registra en campo |
| **No cerrarle la puerta** | La ficha del ejemplar admite medidas exactas opcionales, además de la clase |

---

## 2. No se planea incluir

| Qué | Por qué |
|---|---|
| **Locales periféricos** | Casa Codesido (Pueblo Libre) y Escuela de Música de Chorrillos. El personal estable los atiende a pedido, más o menos cada trimestre, y el cliente no los necesita: *«La mayor dinámica de atención y recursos es el campus»* (entrevista 2) |
| **Áreas fuera de los muros del campus** | Son **retiros municipales** de San Miguel, que la municipalidad mantiene. ⚠️ La poda de ramas que entran al campus y activan los sensores **sí se registra**: es trabajo del personal estable a pedido de Seguridad |
| **Riego automatizado** | Electroválvulas y aspersores son proyectos de Infraestructura a 1-3 años, con presupuesto ajeno. **No diseñar nada que lo impida**: el riego se registra por sector, que es también la unidad de un sistema automatizado |
| **Riego y consumo de agua de los campos deportivos** | Los gestiona un servicio tercerizado junto con Deportes, con bomba y tanque propios |
| **Reemplazar el mapa interactivo del cliente** | Ya existe y lo comparten las tres secciones de la OSG. Hesperides tiene su propio mapa, pero no sustituye al suyo. Integrarse con él sería otro proyecto (§1.14) |
| **Capas de las otras secciones en el mapa** | Supervisión de campus y administración de contratos tienen sus propias capas: no son dominio de áreas verdes |
| **Tramitar órdenes de compra y contratos** | Los tramita Logística. El sistema registra **la ejecución y la conformidad**, no el proceso de compra |
| **Generar códigos OSG o de Centuria** | Los emiten otras áreas. Hesperides nunca los genera |
| **Adoptar la matriz de incidencias del cliente** | Es confidencial y se maneja con la jefatura. El módulo de incidencias es una **propuesta propia**: no necesitamos la matriz y **no queremos custodiarla** |
| **Levantar el catastro** | El sistema entrega **la herramienta** para completarlo y mantenerlo. El levantamiento en campo lo hace el personal del cliente |
| **Control de maquinaria, combustible y repuestos** | El equipo propio se dio de baja. La maquinaria actual es del proveedor tercerizado |
| **Cuarteles forestales** | Están en desuso: el cliente se orienta por edificios y jardines emblemáticos. **El sistema no los usa** (29 sep): la jerarquía es sector → sección → subsección |
| **App para iOS** | Los 5 celulares de la sección son Android |

---

> *Hesperides — Proyecto de Investigación PUCP, 2026.*
