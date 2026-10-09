# Estándar de fotos de especies (`fotos-especies.csv`)

Las fotos genéricas de una especie: las que se ven en su ficha del inventario, de una a varias, con
su crédito (SPEC-104). Plantilla: [plantillas/fotos-especies.csv](plantillas/fotos-especies.csv).

| Columna | Obligatoria | Qué va |
|---|---|---|
| `nombre_cientifico` | **Sí** | Como en el catálogo de especies, o uno de sus nombres alternativos |
| `foto` | **Sí** | Enlace público de Google Drive o nombre de un archivo del ZIP |
| `orden` | No | 1 = foto principal (la del listado). Sin orden, cuenta el de las filas. No se repite dentro de una especie |
| `autor` | No | Quien hizo la foto, como pide su licencia |
| `licencia` | No | Tal cual la da la fuente: `CC BY-SA 4.0`, `CC0`, `Public domain`… |
| `fuente` | No | Enlace a la página que acredita la foto (`https://…`), por ejemplo su página en Wikimedia Commons |

**Las filas de una especie reemplazan todas sus fotos.** Si el archivo trae 2 fotos de *Schinus
molle* y la especie tenía 3, queda con esas 2; las anteriores se dan de baja, nunca se borran. La
vista previa lo avisa por especie («tiene 3, quedarán 2»). Una especie que no aparece en el archivo
conserva sus fotos.

Si una foto de una especie no se puede guardar, **esa especie conserva su conjunto anterior** y la
carga lo informa; las demás especies se cargan igual.

Una especie que no está en el catálogo se omite y se informa con su cantidad de filas. Las fotos de
ejemplares (las de cada planta) no se cargan aquí sino en la columna `foto` del estándar de
ejemplares.

**Créditos.** Una foto con licencia CC BY o CC BY-SA obliga a mostrar su autor y su licencia: la
ficha los muestra bajo cada foto cuando existen. Una foto propia del cliente puede ir sin ellos.

## Límites

| Límite | Valor |
|---|---|
| Una foto | 25 MB |
| Una subida (CSV + ZIP) | 250 MB |
| ZIP descomprimido | 500 MB |

Son los mismos en toda pantalla de subida, y la pantalla avisa antes de enviar un archivo que no
cabe. Las importaciones van de a una: si otra está en curso, hay que esperar unos minutos.

## Carga inicial desde la bandeja del servidor

La primera tanda de fotos no pasa por la pantalla: se deja en la carpeta `inbox/species-photos/` del
servidor, con este mismo CSV llamado `fotos-especies.csv`, y un administrador lanza la carga
(`POST /api/v1/green-inventory/species-photos/load-inbox`). Cada original se borra de la bandeja al
quedar guardada su versión reducida. Detalle en SPEC-104 D-05 y D-06 y en el
[README de despliegue](../arquitectura/despliegue/despliegue.md).
