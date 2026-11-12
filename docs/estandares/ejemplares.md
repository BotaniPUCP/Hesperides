# Estándar de ejemplares (`ejemplares.csv`)

Una fila es una planta, o una agrupación si `cantidad` es mayor que 1. Es el mismo formato que
exporta el sistema. Plantilla: [plantillas/ejemplares.csv](plantillas/ejemplares.csv), con dos filas de ejemplo (una completa con medidas y evaluación, y otra solo con obligatorios) que hay que borrar antes de cargar. Las reglas comunes están en el
[README](README.md).

## Identificación y ubicación

| Columna | Obligatoria | Qué va |
|---|---|---|
| `codigo` | No | Vacía: planta nueva, el sistema le asigna un código nuevo. Con un código vigente: corrige ese ejemplar. Un código dado de baja es histórico y no se puede reusar para crear ni corregir |
| `nombre_cientifico` | **Sí** | Como figura en el catálogo de especies, o uno de sus nombres alternativos. Una especie que no está se omite |
| `latitud` | **Sí** | Grados decimales, negativa en Lima (`-12.069520`) |
| `longitud` | **Sí** | Grados decimales, negativa en Lima (`-77.080110`) |
| `cantidad` | No (1) | Entero de 1 o más. Mayor que 1 es una agrupación (un seto, un macizo) |

## Dato de origen

Lo que identificaba a la planta en la fuente de donde se tomó. Ayuda a rastrearla, no se valida.

| Columna | Qué va |
|---|---|
| `referencia_catastro` | El código de la hoja del catastro del cliente (`p01`, `SA-45`) |
| `placa_antigua` | El número de una placa física anterior |
| `ubicacion_catastro` | El lugar como lo escribió la fuente (`Pista de Salud`) |

## Medición

Si hay alguna medida, `fecha_medicion` es obligatoria: decide cuál es la medición vigente. Una
fecha anterior a la registrada no la reemplaza.

| Columna | Unidad | Notas |
|---|---|---|
| `fecha_medicion` | `AAAA-MM-DD` | |
| `altura_m` | metros | Mayor que 0 |
| `altura_fuste_m` | metros | Altura del tronco hasta la primera rama; 0 o más |
| `dap_cm` | centímetros | Diámetro a la altura del pecho (1.30 m); 0 o más |
| `radio_copa_m` | metros | Mayor que 0 |
| `zunchado` | `si` / `no` | |

## Evaluación

Si hay alguna columna de evaluación, `fecha_evaluacion` es obligatoria. Cada carga **añade** una
evaluación al historial del ejemplar; no reemplaza las anteriores. En los sí/no, vacío es «no se
evaluó».

| Columna | Qué se evaluó |
|---|---|
| `fecha_evaluacion` | `AAAA-MM-DD` |
| `enfermedades` | `si` / `no` |
| `plagas` | `si` / `no` |
| `danos_mecanicos` | `si` / `no` — cortes, golpes, anillado |
| `inclinacion` | `si` / `no` — inclinación riesgosa |
| `ramas_secas` | `si` / `no` |
| `cavidades` | `si` / `no` — cavidades o pudrición |
| `raices_expuestas` | `si` / `no` |
| `interferencia` | `si` / `no` — con cables, veredas o edificios |
| `manejo_recomendado` | Texto, hasta 200 caracteres (`Poda de ramas secas`) |
| `observacion_evaluacion` | Texto libre |

## Foto y notas

| Columna | Qué va |
|---|---|
| `foto` | Un enlace **público** de Google Drive, o el nombre de un archivo del ZIP de fotos que se sube junto al CSV. Otros enlaces se rechazan. Máximo 15 MB por foto |
| `observaciones` | Texto libre sobre la planta |

## Columnas informativas

`nombre_comun`, `nombres_alternativos`, `familia`, `tipo_vegetacion`, `tipo_elemento` y
`origen_medidas` salen en la exportación para que el archivo se pueda leer. Al cargar se aceptan y
se ignoran: la especie se decide solo por `nombre_cientifico`.

`origen_medidas` dice `Medido`, `Sin medir` o `Promedio de la especie`. En este último caso las
celdas de medidas salen vacías: el promedio vive en la especie y no es una medida del ejemplar.

Una fila nueva solo puede vincularse a una especie activa; los selectores de formulario e importación
no ofrecen especies inactivas, y el servidor rechaza también una asociación explícita inválida. Una
corrección de un ejemplar existente puede conservar el vínculo con su especie inactiva si no cambia
esa relación.
