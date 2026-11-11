# Índice de la documentación

Qué hay en `docs/` y dónde buscar cada cosa. Las especificaciones (SPEC) viven aparte, en
[`specs/`](../specs/), con su propio registro.

| Carpeta | Contenido |
|---|---|
| [`producto/`](producto/) | Kick-off, product backlog (`.md` y los `.xlsx` v7) y sprint backlogs |
| [`dominio/`](dominio/) | El negocio: [negocio](dominio/negocio.md), [catálogo de requisitos](dominio/catalogo-requisitos.md), [fuera de alcance](dominio/fuera-de-alcance.md) e [integración del mapa interactivo](dominio/integracion-mapa-interactivo.md) |
| [`entrevistas/`](entrevistas/) | Cuestionarios de las reuniones con el cliente |
| [`arquitectura/`](arquitectura/) | [Análisis y diseño](arquitectura/analisis-y-diseno.md), [base de datos](arquitectura/base-de-datos.md), [despliegue](arquitectura/despliegue.md) y [estándares y CI/CD](arquitectura/estandares-y-ci-cd.md) |
| [`estandares/`](estandares/) | Cómo llenar cada plantilla de carga masiva; empieza por [estándares de carga](estandares/estandares-de-carga.md). Las plantillas están en `backend/src/main/resources/imports/templates/` |
| [`modulos/`](modulos/) | Notas por módulo: [inventario verde](modulos/inventario-verde.md), [etiquetas del mapa](modulos/mapa-etiquetas.md) y el [guion de demo de incidencias](modulos/demo-incidencias.md) |
| [`datos/`](datos/) | Originales del cliente y datos procesados que alimentan las semillas; ver el [catálogo de datos](datos/catalogo-de-datos.md) |
| [`planes/`](planes/) | Planes de implementación y diseños de trabajo, uno por archivo con fecha |
| [`propuestas/`](propuestas/) | Maquetas HTML presentadas al cliente |
| [`marca/`](marca/) | [Paleta de colores](marca/paleta.md) |
| [`sostenibilidad/`](sostenibilidad/) | [Estimación de horas ahorradas](sostenibilidad/ahorro-de-horas.md) |

## Reglas para agregar documentos

- Nombres en minúsculas con guiones (`ahorro-de-horas.md`), que digan qué contiene; no `README.md`.
- Un documento va en la carpeta de su tema. Si no encaja en ninguna, se agrega una fila aquí.
- Los datos que usa el sistema al funcionar o en sus pruebas van **junto a su código**, no aquí.
- Nada con datos de personas (teléfonos, correos, nombres de trabajadores) se versiona: va a
  `docs/datos/privados/`, que está en `.gitignore`. El repositorio es público.
