# Estándar de bebederos (`bebederos.csv`)

Plantilla: [plantillas/bebederos.csv](plantillas/bebederos.csv), con una fila de ejemplo que hay
que borrar antes de cargar. Las reglas comunes están en el [README](README.md).

| Columna | Obligatoria | Qué va |
|---|---|---|
| `codigo` | No | Vacía: bebedero nuevo, el sistema le asigna `BB-000001`. Con un código (`PT_bb1`): corrige ese bebedero |
| `latitud`, `longitud` | **Sí** | Grados decimales |
| `lugar` | No | Dónde está |
| `tipo` | No | `Fuente`, `Llenador de botella` o `Sin dato` |
| `estado` | No | `Operativo`, `Nuevo`, `En remodelación`, `En deterioro` o `De baja` |
| `sector` | No | El sector del registro de bebederos: `CAMPUS`, `CIA`, `EEGGCC`, `EEGGLL`, `AULARIO` |
| `nota` | No | Texto libre |
| `foto` | No | Enlace público de Google Drive o nombre de un archivo del ZIP |

`tipo` y `estado` aceptan la etiqueta o el código del catálogo, sin importar tildes ni mayúsculas.
Al corregir, una celda vacía conserva lo registrado.
