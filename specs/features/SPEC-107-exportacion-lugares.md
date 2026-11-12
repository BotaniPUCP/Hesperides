# SPEC-107 · Exportación masiva del catálogo de lugares

## Objetivo

Permitir descargar los lugares seleccionados en un libro `.xlsx` compatible con
la plantilla de **Importar lugares**: una fila por lugar y exactamente los
mismos encabezados y hoja `Lugares`.

## Acceso

El submódulo **Lugares → Exportar lugares** está disponible para `ADMIN` y
`COORDINADOR`. El endpoint vuelve a validar los filtros y requiere esos mismos
roles.

## Filtros opcionales

- Categoría vigente del catálogo `REFERENCE_CATEGORY`.
- Alias exacto, sin distinguir mayúsculas, minúsculas ni tildes.
- Lugar seleccionado en **Dentro de**: solo incluye hijos cuyo padre directo
  sea el lugar seleccionado.
- Rango de fechas de creación, inclusivo en ambos extremos.
- Zona delimitada por tres pares de coordenadas (latitud/longitud), que deben
  formar un triángulo no degenerado. Si se completa un punto, deben completarse
  los tres. Se incluyen lugares cuyo punto representativo del contorno está
  dentro o sobre el borde; para lugares interiores se usa el contorno del
  ancestro más cercano que tenga ubicación.
- Perspectivas opcionales por lado (`FRONT`, `BACK`, `SIDE`). Si se incluyen,
  cada grupo conserva lado, latitud, longitud y rumbo en las columnas estándar.
  La primera foto vigente de cada perspectiva se incrusta en su celda de foto.
  Si los filtros seleccionan más de tres perspectivas de un lugar, se rechaza
  la exportación con un error explícito: la plantilla admite hasta tres.

Si no se especifica ningún filtro, se exporta todo el catálogo. Las fotos
principales y las fotos de vistas interiores no se exportan porque la plantilla
de importación no tiene columnas para ellas.

## Coordenadas del lugar

- Para cada lugar `OUTDOOR`, las columnas `Latitud de punto` y
  `Longitud de punto` contienen el centro de la geometría que representa su
  ubicación en el mapa. Al exportarlo se representa como un punto para que la
  fila pueda reimportarse con la regla de ubicación de SPEC-106; por eso se
  dejan vacías las columnas de edificios, zona, estacionamiento y contorno de
  hijos.
- Los lugares `INDOOR` conservan su `Código padre` y dejan vacías las columnas
  del punto propio, ya que el mapa los ubica mediante su padre.
