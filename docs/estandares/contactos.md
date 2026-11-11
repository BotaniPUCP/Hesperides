# Estándar de contactos del Directorio (`contactos.csv`)

Una fila es una persona de contacto y las organizaciones a las que pertenece (SPEC-106 §4.2). Se
carga en **Directorio → Registro masivo → Contactos**, solo ADMIN y COORDINADOR. Plantilla:
[contactos.csv](../../backend/src/main/resources/imports/templates/contactos.csv), con una fila de ejemplo que hay que borrar
antes de cargar. Las organizaciones se cargan primero ([organizaciones.md](organizaciones.md)).

> **Pendiente (SPEC-106 §4.3, 11 nov 2026):** se agrega la columna opcional `roles` al final, un
> rol por organización en el mismo orden, separados por `|`. Un archivo sin ella sigue valiendo.
> Se documenta aquí cuando el código la acepte.

| Columna | Obligatoria | Qué va |
|---|---|---|
| `nombre` | **Sí** | Nombre completo, hasta 200 caracteres |
| `organizaciones` | **Sí** | Por nombre, alias o código (`ORG-0001`), separadas por `\|`: `Estudios Generales Ciencias\|OIE` |
| `anexo` | No | 4 dígitos; se aceptan espacios (`45 49`) |
| `celular` | No | 9 dígitos que empiezan con 9; se aceptan espacios (`987 654 321`) |
| `correo` | No | Un correo válido |

## Reglas

- UTF-8 (la plantilla lleva BOM para que Excel la abra bien), separador `;`.
- La cabecera lleva **exactamente** estas cinco columnas: una que falta o una desconocida rechaza
  el archivo.
- Hasta 2000 filas por archivo.
- Un contacto con el mismo nombre ya vinculado a la primera organización de su fila **ya existe**:
  se muestra en la revisión y se omite.
- **Una organización que no está en el Directorio omite la fila entera**, aunque sus otras
  organizaciones existan: un contacto no se registra con solo parte de sus organizaciones. Esas
  filas no bloquean el archivo; la revisión y el resultado las cuentan por organización faltante,
  para registrarla y volver a subirlas.
- Una fila con error de formato (un anexo de 3 dígitos, un correo mal escrito) impide confirmar el
  archivo entero, aunque también le falte una organización.

## Cómo se carga

Igual que las organizaciones: la revisión abre un lote, solo quien lo subió lo confirma dentro de
la hora, y la confirmación escribe exactamente lo revisado, todo o nada. Los teléfonos no aparecen
en los mensajes de error: son datos personales.
