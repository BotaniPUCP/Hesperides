# Estándar de especies (`especies.csv`)

Plantilla: [`plantillas/especies.csv`](plantillas/especies.csv), con dos filas de ejemplo (una completa y una solo con obligatorios) que hay que borrar antes de cargar. Las reglas comunes están en el [README](README.md).

Sirve tanto para registrar especies nuevas como para actualizar especies activas del catálogo botánico:
si el `nombre_cientifico` no tiene una ficha vigente, crea la especie; si tiene ficha activa, actualiza
sus datos con las celdas no vacías. Las especies inactivas exportadas se muestran en la vista previa,
pero sus filas se omiten: no se editan ni se reactivan. Si todas las fichas anteriores con ese nombre
tienen baja lógica, se permite una ficha nueva con ID y slug nuevos; la ficha anterior y sus relaciones
se conservan, y su slug histórico no se reutiliza.

## Columnas

| Columna | Obligatoria | Qué espera |
|---|---|---|
| `nombre_cientifico` | Sí | Binomio botánico (ej. `Jacaranda mimosifolia` o `Ficus sp.`). Identifica la especie |
| `nombre_comun` | No | Nombre común principal (hasta 150 caracteres) |
| `nombres_alternativos` | No | Otros nombres comunes separados por `\|` (ej. `Tarco\|Gualanday`) |
| `familia` | No | Familia botánica (ej. `Bignoniaceae`, hasta 100 caracteres) |
| `tipo_vegetacion` | Sí (al crear) | Etiqueta o código del catálogo `SPECIES_TYPE`: `Árbol`, `Palmera`, `Arbusto`, `Cubresuelo`, `Macetones (herbáceas)`, `Planta herbácea`, `Planta suculenta`, `Seto (cerco vivo)`, `Trepadora` |
| `origen` | No | Etiqueta o código de `SPECIES_ORIGIN`: `Nativa`, `Introducida` |
| `descripcion` | No | Descripción botánica (hasta 2000 caracteres) |
| `notas_cuidado` | No | Recomendaciones de mantenimiento y cuidado (hasta 2000 caracteres) |
| `es_critica` | No | `si` o `no`. Al crear, si va vacía se asume `si` en árboles y palmeras y `no` en el resto |
| `altura_promedio_m` | Condicional | En metros (`> 0`). Obligatoria si la especie no es crítica |
| `fuente_altura` | Condicional | Obligatoria si se indica `altura_promedio_m`: `Ficha botánica`, `Estimación del equipo` o `Muestra en el campus` |
| `radio_copa_promedio_m` | Condicional | En metros (`> 0`). Obligatoria si la especie no es crítica |
| `fuente_radio_copa` | Condicional | Obligatoria si se indica `radio_copa_promedio_m`: `Ficha botánica`, `Estimación del equipo` o `Muestra en el campus` |
| `usa_altura_fuste` | No | `si` o `no`. Indica si sus ejemplares se miden con altura de fuste |
| `usa_dap` | No | `si` o `no`. Indica si sus ejemplares se miden con DAP (diámetro a la altura del pecho) |
| `foto` | No | Enlace público de Google Drive o nombre de archivo dentro del ZIP de fotos |

## Columnas informativas al exportar

Al exportar (`GET /api/v1/green-inventory/species/export.csv`), el archivo incluye al final `slug` y
`ejemplares`. Al volver a cargar el archivo, estas dos columnas se aceptan y se ignoran.
