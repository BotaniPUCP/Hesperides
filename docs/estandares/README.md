# Estándares de carga del catastro

Hesperides es la fuente oficial del catastro (SPEC-103 D-12). Lo que todavía no está registrado
entra de dos formas: por el formulario **Catastro → Registrar planta**, una planta a la vez, o por
un archivo CSV en **Catastro → Importar CSV**. Este directorio define el formato de esos archivos.

| Estándar | Documento | Plantilla | Estado |
|---|---|---|---|
| Ejemplares (árboles, palmeras, arbustos…) | [ejemplares.md](ejemplares.md) | [plantillas/ejemplares.csv](plantillas/ejemplares.csv) | Disponible |
| Tachos | [tachos.md](tachos.md) | [plantillas/tachos.csv](plantillas/tachos.csv) | Disponible |
| Bebederos | [bebederos.md](bebederos.md) | [plantillas/bebederos.csv](plantillas/bebederos.csv) | Disponible |
| Fotos genéricas de especies | [fotos-especies.md](fotos-especies.md) | [plantillas/fotos-especies.csv](plantillas/fotos-especies.csv) | Disponible |

## Reglas comunes

- **UTF-8**, con o sin BOM.
- **Separador punto y coma (`;`)**. Una coma como separador se rechaza: confundiría los decimales.
  Excel usa el separador de listas de la configuración regional, que en Perú suele ser la coma;
  LibreOffice permite elegir `;` al guardar. Si el archivo llega con comas, la carga lo rechaza
  con ese aviso.
- **Decimal con punto** (`7.5`). Se tolera la coma (`7,5`) y la vista previa lo avisa.
- Primera fila: la cabecera, con los nombres de columna exactos, en minúsculas y sin tildes. El
  orden de las columnas no importa y las opcionales se pueden omitir.
- Fechas `AAAA-MM-DD`. Sí/no: `si` o `no`; vacío significa «no se evaluó», que no es lo mismo que `no`.
- Coordenadas WGS 84 en grados decimales (`-12.069520`, `-77.080110`). Deben caer en el campus
  (con 15 m de margen, porque el límite viene de OpenStreetMap y no es exacto).

## Cómo se carga un archivo

1. **Vista previa.** El sistema lee el archivo y no escribe nada. Muestra cuántas filas crea y
   cuántas actualiza, las especies que no están en el catálogo (con cuántas filas tenía cada una)
   y los posibles duplicados.
2. **Errores de formato bloquean.** Si una fila tiene un error (una latitud vacía, una fecha mal
   escrita), no se puede confirmar: se corrige el archivo y se vuelve a subir. Cada error indica
   la línea y la columna.
3. **Especies desconocidas se omiten.** Esas filas no entran y se informan agrupadas, para pedir
   que se agregue la especie al catálogo y volver a cargarlas.
4. **Duplicados se deciden fila por fila.** Una planta nueva a menos de cierta distancia de otra de
   su especie puede ser la misma. La distancia depende del tipo: árbol 1.5 m, palmera 1 m,
   arbusto, seto o trepadora 0.5 m, herbáceas, suculentas, cubresuelos y macetones 0.3 m. Para
   tachos y bebederos es 1 m, contra otro del mismo tipo.
5. **Confirmación.** Escribe exactamente lo que mostró la vista previa, todo o nada. La vista
   previa vence a la hora.

## Exportar, corregir y volver a cargar

**Importar CSV → Exportar ejemplares** descarga todo el catastro en el estándar. Cada fila trae su
`codigo`: al volver a cargarla, actualiza ese ejemplar en vez de crear otro. Una celda vacía no
borra el dato registrado, y una medición con fecha anterior a la vigente no la reemplaza.
