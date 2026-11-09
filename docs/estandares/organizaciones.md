# Estándar de organizaciones del Directorio (`organizaciones.csv`)

Una fila es una organización: una unidad PUCP o una empresa externa (SPEC-106 §4.2). Se carga en
**Directorio → Registro masivo → Organizaciones**, solo ADMIN y COORDINADOR. Plantilla:
[plantillas/organizaciones.csv](plantillas/organizaciones.csv), con una fila de ejemplo que hay que
borrar antes de cargar.

| Columna | Obligatoria | Qué va |
|---|---|---|
| `nombre` | **Sí** | Hasta 200 caracteres. No puede repetirse en el archivo ni ser el nombre o alias de otra organización (sin tildes ni mayúsculas: «OIE» y «oie» son la misma) |
| `tipo` | **Sí** | `Unidad PUCP` o `Empresa externa` (también `PUCP_UNIT` o `EXTERNAL_COMPANY`) |
| `ruc` | No | Solo empresas externas: 11 dígitos que empiezan con `10` o `20`. Una unidad PUCP no lleva RUC |
| `telefono` | No | Hasta 30 caracteres |
| `otros_nombres` | No | Alias separados por `\|`: `EEGGCC\|EE.GG.CC.` |

## Reglas

- UTF-8 (la plantilla lleva BOM para que Excel la abra bien), separador `;`.
- La cabecera lleva **exactamente** estas cinco columnas: una que falta o una desconocida rechaza
  el archivo, porque una columna mal escrita perdería sus datos en silencio.
- Hasta 2000 filas por archivo.
- Una organización vigente con el mismo nombre **ya existe**: se muestra en la revisión y se omite.
- Una fila con error impide confirmar el archivo entero: se corrige y se vuelve a subir.

## Cómo se carga

Sigue el ciclo común de las cargas del catastro ([README](README.md)): la revisión abre un lote en
el servidor; solo quien lo subió lo confirma, dentro de la hora; la confirmación escribe
exactamente lo revisado, todo o nada, y cada organización creada recuerda su lote.
