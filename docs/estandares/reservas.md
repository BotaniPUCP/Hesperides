# Estándar de reservas de jardines (`reservas.csv`)

Una fila es una reserva de un jardín prestable por una organización (SPEC-107 §5.4). Se carga en
**Reservas → Registro masivo**, solo ADMIN y COORDINADOR. Plantilla:
[reservas.csv](../../backend/src/main/resources/imports/templates/reservas.csv), con una fila de ejemplo que hay que borrar
antes de cargar.

> **Implementado (SPEC-107, 11 nov 2026):** las columnas siguen a D-02: «Pedido de», su
> solicitante, «Para» opcional y el responsable, todos del Directorio.

| Columna | Obligatoria | Qué va |
|---|---|---|
| `jardin` | **Sí** | Nombre del lugar, uno de sus alias o el código de una de sus secciones. Debe ser un jardín prestable |
| `pedido_de` | **Sí** | Código, nombre o alias de una organización vigente del Directorio: la que pide el jardín |
| `solicitante` | **Sí** | Código o nombre de un contacto vigente **vinculado a `pedido_de`**. Si el nombre coincide con dos personas, se usa su código |
| `para` | No | La organización que usará el jardín, cuando no es la que pide; vacío si es la misma |
| `responsable` | No | Código o nombre de un contacto vigente, de cualquier organización. Vacío: el solicitante |
| `fecha` | **Sí** | `dd/mm/aaaa`. Una reserva es de un solo día |
| `inicio` | **Sí** | `hh:mm` en hora de Lima (`9:00` o `09:00`) |
| `fin` | **Sí** | `hh:mm`, posterior a `inicio` el mismo día: de 23:00 a 01:00 son dos filas |
| `motivo` | No | Hasta 300 caracteres |

## Reglas

- UTF-8 (la plantilla lleva BOM para que Excel la abra bien), separador `;`.
- La cabecera lleva **exactamente** estas nueve columnas: una que falta o una desconocida rechaza
  el archivo, porque una columna mal escrita perdería sus datos en silencio.
- Una organización o un contacto que no está en el Directorio es **error de esa fila**: el registro
  masivo no crea nada en el Directorio; se carga con su propio registro masivo.
- Hasta 2000 filas por archivo.
- Una fila con error impide confirmar el archivo entero: se corrige y se vuelve a subir (CA-08).
- Los cruces con otras reservas y el trabajo por hacer en el jardín o cerca de él **avisan**, no
  bloquean: la fila se muestra como «Se crea con avisos» y se guarda igual.
- Una reserva pasada se permite (D-10) y queda como Terminada.

## Cómo se carga

Sigue el ciclo común de las cargas del catastro ([estándares de carga](estandares-de-carga.md)): la revisión abre un lote en
el servidor; solo quien lo subió lo confirma, dentro de la hora; la confirmación escribe
exactamente lo revisado, todo o nada, y cada reserva creada recuerda su lote.
