# Estándar de fotos de especies (`fotos-especies.csv`)

La foto genérica de una especie: la que se ve en su ficha del inventario. Plantilla:
[plantillas/fotos-especies.csv](plantillas/fotos-especies.csv).

| Columna | Obligatoria | Qué va |
|---|---|---|
| `nombre_cientifico` | **Sí** | Como en el catálogo de especies, o uno de sus nombres alternativos |
| `foto` | **Sí** | Enlace público de Google Drive o nombre de un archivo del ZIP |

Cada fila **reemplaza** la foto genérica de su especie. Una especie que no está en el catálogo se
omite y se informa con su cantidad de filas. Las fotos de ejemplares (las de cada planta) no se
cargan aquí sino en la columna `foto` del estándar de ejemplares.
