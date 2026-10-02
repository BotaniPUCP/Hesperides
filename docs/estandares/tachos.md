# Estándar de tachos (`tachos.csv`)

Una fila es un tacho o una batería de tachos. Plantilla: [plantillas/tachos.csv](plantillas/tachos.csv),
con una fila de ejemplo que hay que borrar antes de cargar. Las reglas comunes están en el
[README](README.md).

| Columna | Obligatoria | Qué va |
|---|---|---|
| `codigo` | No | Vacía: tacho nuevo, el sistema le asigna `TA-000001`. Con un código (`PT_44`): corrige ese tacho |
| `latitud`, `longitud` | **Sí** | Grados decimales |
| `lugar` | No | Dónde está, como lo diría alguien en el campus |
| `residuos` | No | Los que recibe, separados por `\|`: `No Aprovechables\|Papel y Cartón\|Plástico`. Deben estar en el catálogo de residuos (once tipos); se aceptan sin tildes ni mayúsculas |
| `accion` | No | Qué hacer con él: Mantener, Retirar, Reubicar… |
| `recomendaciones` | No | Texto libre |
| `nota` | No | Texto libre |
| `foto` | No | Enlace público de Google Drive o nombre de un archivo del ZIP |

Al corregir, una celda vacía conserva lo registrado. Un tacho nuevo a menos de 1 m de otro es un
posible duplicado y se decide en la vista previa.
