# SPEC-106 · Importación masiva del catálogo de lugares

## Objetivo

Dar de alta varios lugares desde un único archivo `.xlsx`, conservando las reglas
del formulario individual, permitiendo hasta tres perspectivas y sus fotos, y
sin crear ningún registro si hay errores.

## Dependencias

- Backend: `org.apache.poi:poi-ooxml:5.4.1` para generar y validar libros `.xlsx`
  y extraer las fotos incrustadas en sus celdas.

## Acceso

La opción **Lugares → Importar lugares** está disponible para `ADMIN` y
`COORDINADOR`. El backend vuelve a validar el archivo al confirmar: una vista
previa correcta no sustituye la autorización ni las validaciones del servidor.

## Formato

- Solo se acepta un libro `.xlsx` con una única hoja llamada `Lugares`.
- Cada fila representa un lugar; los encabezados deben coincidir con la plantilla.
- Obligatorios: `Nombre`, `Tipo` (`OUTDOOR`/`INDOOR`) y `Categoría` (código de
  `REFERENCE_CATEGORY`). Todo lugar `OUTDOOR` requiere `Latitud de punto` y
  `Longitud de punto`, con coordenadas válidas. Este punto es su única fuente
  de ubicación y se guarda como geometría del lugar para mostrarlo en el mapa y
  conservarlo al editar. No se combina con edificios, zona, estacionamiento ni
  contorno de hijos. Los lugares `INDOOR` continúan ubicándose por su `Código
  padre` y no admiten punto ni contorno propios.
- Alias: opcionales, separados por punto y coma. Los nombres y alias se comparan
  como identificadores completos, sin distinguir mayúsculas, minúsculas ni
  tildes, no por fragmentos contenidos. Un lugar puede repetir su propio nombre
  como alias; ese valor cuenta una sola vez. No se permiten identificadores
  repetidos entre lugares existentes ni entre filas del archivo. Por ejemplo,
  si ya existe un lugar con nombre y alias `Prueba`, se permite importar otro
  con nombre y alias `Prueba 3`; `Prueba`, `Prueba 2` y `Lugar de Prueba` son
  distintos. Los códigos internos se generan al crear.
- Un lugar interior requiere `Código padre` existente y no admite contorno ni
  perspectivas. Un exterior requiere coordenadas válidas de punto (latitud y
  longitud); no se admiten otras fuentes de ubicación en esa fila.
- Se admiten hasta tres grupos de perspectiva. Cada grupo está vacío o incluye
  lado (`FRONT`, `BACK`, `SIDE`), latitud, longitud y rumbo en grados (`0` a
  menos de `360`). El frente y la espalda no se repiten en un mismo lugar.
- La foto de una perspectiva es opcional, y se inserta en la celda de foto del
  grupo correspondiente. No se aceptan imágenes sin perspectiva. Cada imagen
  respeta el límite estándar de 25 MB y se procesa igual que una foto individual.
- Los decimales se escriben con punto. Alias e IDs múltiples usan punto y coma.

## Flujo y errores

1. La persona descarga la plantilla, completa filas e inserta imágenes.
2. La vista previa valida estructura, valores, catálogos, coordenadas,
   perspectivas, fotos y duplicados contra el catálogo actual. Cada error indica
   fila, columna, valor y corrección esperada. También detecta coincidencias
   exactas entre el punto importado y el centro representativo de lugares
   existentes; si hay varias, muestra todas.
3. Mientras haya errores no se permite confirmar. Se puede descargar un CSV con
   los errores. Para cada coincidencia de ubicación se debe elegir
   explícitamente qué lugar sobrescribir. **Detalle** abre su ficha en modo de
   solo lectura. Un mismo lugar existente no se puede elegir para más de una
   fila. Cancelar detiene la importación completa.
4. Confirmar vuelve a leer y validar el mismo `.xlsx` y las elecciones; solo si
   todas las filas pasan se crean o actualizan lugares, perspectivas y fotos en
   una transacción. Al sobrescribir se conserva el código, los hijos, las
   referencias y las fotos principales; los datos del lugar y sus perspectivas
   (incluidas las fotos de perspectiva) se sustituyen por los de la fila.

## Alcance

El padre de un lugar interior debe ser un código de lugar ya registrado. Las
fotos se aceptan únicamente insertadas en las celdas designadas del archivo
Excel; no se descargan imágenes desde URLs.
