# Estándar de reservas de jardines (`reservas.csv`)

Una fila es una reserva de un jardín prestable por una organización (SPEC-107 §5.4). Se carga en
**Reservas → Registro masivo**, solo ADMIN y COORDINADOR. Plantilla:
[reservas.csv](../../backend/src/main/resources/imports/templates/reservas.csv), con una fila de ejemplo que hay que borrar
antes de cargar.

> **Pendiente (SPEC-107, 11 nov 2026):** este estándar describe la primera iteración. El spec
> cambia las columnas a `jardin;pedido_de;solicitante;para;responsable;inicio;fin;motivo`
> (solicitante obligatorio; responsable vacío es el solicitante). Se actualiza junto con el código.

| Columna | Obligatoria | Qué va |
|---|---|---|
| `jardin` | **Sí** | Nombre del lugar, uno de sus alias o el código de una de sus secciones. Debe ser un jardín prestable |
| `organizacion` | **Sí** | Código, nombre o alias de una organización vigente del Directorio |
| `contacto` | No | Código o nombre de un contacto vigente **vinculado a esa organización** |
| `inicio` | **Sí** | `dd/mm/aaaa hh:mm` en hora de Lima |
| `fin` | **Sí** | Posterior a `inicio`; la reserva no puede durar más de 7 días |
| `motivo` | No | Hasta 300 caracteres |

## Reglas

- UTF-8 (la plantilla lleva BOM para que Excel la abra bien), separador `;`.
- La cabecera lleva **exactamente** estas seis columnas: una que falta o una desconocida rechaza
  el archivo, porque una columna mal escrita perdería sus datos en silencio.
- Hasta 2000 filas por archivo.
- Una fila con error impide confirmar el archivo entero: se corrige y se vuelve a subir (CA-08).
- Los cruces con otras reservas y el trabajo por hacer en el jardín o cerca de él **avisan**, no
  bloquean: la fila se muestra como «Se crea con avisos» y se guarda igual.
- Una reserva pasada se permite (D-10) y queda como Terminada.

## Cómo se carga

Sigue el ciclo común de las cargas del catastro ([estándares de carga](estandares-de-carga.md)): la revisión abre un lote en
el servidor; solo quien lo subió lo confirma, dentro de la hora; la confirmación escribe
exactamente lo revisado, todo o nada, y cada reserva creada recuerda su lote.
