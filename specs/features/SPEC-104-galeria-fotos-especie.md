# SPEC-104 — Galería de fotos de especie

| Campo | Valor |
|-------|-------|
| HU relacionada | `REQ 2.13` Catálogo de especies · SPEC-103 P-02 (fotos genéricas de especie) |
| Autor | Equipo Hesperides |
| Plataforma | Web (la app móvil consumirá el mismo `photos` de la API) |
| Sprint | S3 |
| Dependencias | SPEC-103 (§6.5, D-07, D-08, D-09), SPEC-002 §5.4, inventario verde (`docs/inventario-verde/README.md`) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-103 D-07 (toda foto se guarda reducida en almacenamiento propio,
> nunca en PostgreSQL) y D-08 (foto genérica para la especie, real para el ejemplar), que este spec
> **enmienda**: la especie pasa de una foto a varias.

> **La regla de este spec: contiene lo que el código NO dice.** Mientras la feature no esté
> implementada, este spec **sí** es la fuente de verdad y el detalle se escribe literal.

---

## 1. Objetivo

Que cada especie del inventario muestre **de una a varias fotos genéricas con su crédito**, y que el
sistema arranque con las 230 fotos de las 90 especies ya cargadas, sin superar la memoria de un
servidor on-premise de 2 GB.

## 2. Contexto

### 2.1 Backend

- Paquetes: `modules.inventory` (lectura, carga inicial, servir fotos) y `modules.imports`
  (importación por CSV, formulario).
- Tabla: `species_photos` (SPEC-103, V015), ampliada en V017.
- Repositorio: `PhotoRepository` (inventario).
- Servicios: `InventoryPhotoService` (carga inicial y formulario), `SpeciesPhotoImportService`
  (CSV), `GreenInventoryServiceImpl` (respuesta de especie).
- Nuevo controller: `SpeciesPhotoInboxController` → `POST /api/v1/green-inventory/species-photos/load-inbox`.

### 2.2 Frontend web

- Rutas sin cambio: `/inventario-verde` (listado) y `/inventario-verde/especies/[slug]` (ficha).
- Componente nuevo: `components/inventario-verde/SpeciesPhotoViewer.tsx` (visor a pantalla completa).
- Componentes modificados: `SpeciesInfo.tsx` (contador «1/3», abre el visor, etiqueta según origen),
  `catastro/importar/SelectorDeArchivos.tsx`, `catastro/registrar/RegistroPlantaForm.tsx`,
  `catastro/registrar/RegistroComponenteForm.tsx` y el formulario de foto de especie (aviso de límite
  y comprobación previa).
- Constantes de límites: `lib/upload-limits.ts`.

### 2.3 Móvil

Fuera de alcance. La API ya entrega `photos`; el visor móvil se hará con la app (fase 2).

### 2.4 Restricciones técnicas

- DEBE usar `PhotoStore` / `PhotoProcessor` (SPEC-103 D-07): la carga inicial no tiene un
  procesamiento propio.
- NO debe usar una librería de galería o carrusel: el visor son flechas y una imagen; una dependencia
  no se justifica.
- Catálogos aplicables: no aplica. La licencia es texto libre, no catálogo: viene de la fuente tal
  cual (`CC BY-SA 4.0`, `Public domain`…) y el sistema no razona sobre ella.

### 2.5 Decisiones propias de este spec

**D-01 · Varias fotos por especie, con orden.** `sort_order = 1` es la foto principal: la del
listado y la que abre el visor. · Una especie se reconoce mejor con hoja, flor y porte que con una
sola foto. · Descartado: fotos sin orden (la principal sería arbitraria).

**D-02 · El CSV define el conjunto completo de la especie.** Las filas de una especie en
`fotos-especies.csv` **reemplazan** todas sus fotos vigentes (borrado lógico de las anteriores). ·
Conserva el comportamiento de SPEC-103 §6.5 y corregir una selección es volver a subirla. ·
Descartado: CSV que solo agrega (quitar una foto exigiría otra pantalla).

**D-03 · El formulario agrega una foto al final.** `POST /species/{slug}/photo` deja de reemplazar:
añade la foto con el siguiente `sort_order`. · Un formulario sube un archivo; si reemplazara, subir
una foto borraría las otras tres de la especie. · Descartado: que el formulario reemplace (rompe el
conjunto cargado).

**D-04 · El crédito se muestra siempre que exista.** Autor, licencia y enlace a la fuente se ven bajo
la foto en el visor. · 205 de las 230 fotos iniciales son CC BY o CC BY-SA, licencias que **obligan**
a atribuir. · Descartado: créditos en una página aparte (no cumple la atribución junto a la obra).

**D-05 · Carga inicial desde una bandeja del servidor, una foto a la vez.** Las fotos se dejan en
`inbox/species-photos/` con su CSV de créditos y un ADMIN lanza la carga. · No pasa por los límites
de subida web (la carpeta pesa ~800 MB) y nunca tiene más de una foto en memoria. · Descartado:
cargarlas en 6-7 tandas por la pantalla de importación (manual, y repetido en cada instalación).

**D-06 · Cargar es mover.** Cada original se borra de la bandeja **después** de guardarse su versión
reducida. Una carga interrumpida se reanuda con lo que quede. · Los originales pesan 1 GB y las
versiones reducidas ~70 MB; conservar ambos duplica espacio sin uso. · Descartado: copiar y borrar
a mano.

**D-07 · Límites de subida únicos para todo el sistema.** 25 MB por foto (ZIP, formulario y descarga
de Drive), 250 MB por subida, 500 MB descomprimido. · Hasta ahora el formulario no tenía límite por
foto (solo el de 150 MB por subida): una foto de 67 MB entraba por ahí y no por el ZIP. ·
Descartado: límites distintos por camino.

**D-08 · La interfaz avisa el límite y lo comprueba antes de enviar.** Los cuatro puntos de subida
muestran el máximo y rechazan un archivo mayor sin subirlo. El backend valida igual (REGLAS INV-7). ·
Nadie debería esperar a subir 60 MB para enterarse de que no cabe.

**D-09 · Memoria del backend fija: `-Xmx1g`.** Con 2 GB de RAM el servidor también corre PostgreSQL,
Next.js y Flask. Sin `-Xmx`, la JVM toma el 25 % de la RAM (512 MB), y una sola importación al límite
ocupa ~750 MB (ZIP de 250 MB + 500 MB descomprimidos). · Se fija en el compose con
`JAVA_TOOL_OPTIONS`, ajustable por `BACKEND_HEAP`.

**D-10 · Una importación a la vez.** Con 1 GB de heap caben una importación al límite y el resto del
backend, pero no dos. La confirmación y la vista previa de una importación toman un permiso único;
si otra está en curso, responden **409** con «Hay otra importación en curso. Inténtelo en unos
minutos». · Es preferible un rechazo explicable a un `OutOfMemoryError` que tumbe el backend para
todos. · Descartado: cola de importaciones (complejidad sin demanda: las importaciones son
esporádicas y las hace un ADMIN).

**D-11 · Las 2 fotos de *Thrinax radiata* se reducen fuera del sistema.** `thrinax-radiata-2.jpg`
(67 MB, 9984 × 6656) y `thrinax-radiata-3.jpg` (55 MB) superan 25 MB. Se reducen a 4000 px de lado
mayor (JPEG, calidad 90) antes de dejarlas en la bandeja. · Es una excepción única: los límites no se
suben por dos archivos. · No se pierde calidad visible: el sistema las guarda a 1600 px.

**Enmiendas:** SPEC-103 D-08 (una foto genérica → varias, con crédito) y §6.5 (columnas nuevas de
`fotos-especies.csv`). Anotadas en `REGISTRO.md`.

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/green-inventory/species` y `/species/{slug}` | Como hoy (público) | Agregan `photos` |
| `POST /api/v1/green-inventory/species/{slug}/photo` | Como hoy (`ADMIN`, `COORDINADOR`) | Agrega una foto al final (D-03) |
| `POST /api/v1/imports/species-photos/preview` · `/imports/{batchId}/confirm` | Como hoy (`LOADERS`) | CSV con orden y créditos (D-02) |
| `POST /api/v1/green-inventory/species-photos/load-inbox` | ADMIN | Carga inicial desde la bandeja (D-05) |

**Respuesta de especie** — se agrega `photos`; `imageUrl` se conserva y es la miniatura de la foto 1
(o la de un ejemplar si la especie no tiene fotos propias), para no romper el listado:

```json
{
  "slug": "acacia-stenophylla",
  "imageUrl": "/files/species/12?size=thumb",
  "imageSource": "SPECIES",
  "photos": [
    {
      "thumbnailUrl": "/files/species/12?size=thumb",
      "imageUrl": "/files/species/12?size=full",
      "author": "Stitchingbushwalker",
      "license": "CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:River_Cooba_..."
    }
  ]
}
```

`imageSource` es `SPECIES`, `SPECIMEN` o `null`: decide la etiqueta de la ficha. `photos` está
vacío cuando la especie no tiene fotos propias. El listado (`GET /species`) devuelve `photos` vacío
y solo `imageUrl`: la cuadrícula muestra una foto por especie y no necesita las demás.

**Carga desde la bandeja** — responde al terminar:

```json
{ "loaded": 230, "species": 90, "failures": [ { "file": "x-2.jpg", "reason": "larger than 25 MB" } ], "remaining": 0 }
```

### 3.1 Decisiones que el código no explica

- `load-inbox` es `POST` y no `GET` porque escribe y borra archivos.
- `load-inbox` sobre una bandeja vacía responde 200 con `loaded: 0`: volver a ejecutarlo es seguro.
- Una foto que falla (corrupta, demasiado grande, especie desconocida) **se queda en la bandeja** y se
  informa; las demás siguen. No es todo o nada: cada especie es independiente.
- El conjunto de una especie se reemplaza **solo si todas sus fotos de la bandeja se guardaron**. Si
  falla una, la especie conserva sus fotos anteriores y sus archivos quedan en la bandeja.

## 4. Migración de base de datos

`V017__allow_many_species_photos.sql` (siguiente número libre, REGLAS §0.2). Las reservas pendientes
del mapa de migraciones se corren de `V017`–`V026` a **`V018`–`V027`**.

```sql
-- Propiedad de SPEC-104. Una especie pasa de una foto generica a varias,
-- ordenadas y con su credito (SPEC-104 D-01, D-04).

DROP INDEX idx_species_photos_current;

ALTER TABLE species_photos
    ADD COLUMN sort_order      INTEGER,
    ADD COLUMN author          VARCHAR(255),
    ADD COLUMN license         VARCHAR(100),
    ADD COLUMN source_page_url VARCHAR(500);

-- Las fotos ya cargadas (una por especie, SPEC-103) pasan a ser la principal.
UPDATE species_photos SET sort_order = 1;

ALTER TABLE species_photos
    ALTER COLUMN sort_order SET NOT NULL,
    ADD CONSTRAINT chk_species_photos_sort_order CHECK (sort_order > 0);

-- Dos fotos vigentes de una especie no comparten posicion. Parcial por el
-- soft delete: reemplazar el conjunto da de baja las anteriores.
CREATE UNIQUE INDEX idx_species_photos_order_active
    ON species_photos(species_id, sort_order) WHERE deleted_at IS NULL;
```

`source_url` (de SPEC-103) sigue siendo el enlace **del que se descargó** la foto; `source_page_url`
es la página que acredita la obra (Wikimedia Commons). Son distintos: la URL de descarga de Commons
no muestra la licencia.

## 5. Comportamiento

### 5.1 Carga inicial

1. Se reducen las 2 fotos de *Thrinax radiata* (D-11).
2. Se mueven las 230 fotos y `selecciones.csv` a `inbox/species-photos/` (carpeta del repo ignorada
   por git, montada en el backend en `/data/inbox`).
3. `selecciones.csv` se versiona como `docs/dominio/datos/fotos-especies-creditos.csv`: es la fuente
   de los créditos.
4. Un ADMIN ejecuta `POST /species-photos/load-inbox`.
5. El servicio lee `selecciones.csv`, agrupa por `slug` y, especie por especie, procesa cada foto
   (≤ 25 MB) con `PhotoStore`. Si todas se guardaron, reemplaza el conjunto de la especie en una
   transacción y borra sus originales de la bandeja.
6. Responde con lo cargado y lo fallido. La bandeja queda vacía salvo los fallidos.

### 5.2 Visor de la ficha

1. La ficha muestra la foto 1. Si hay más de una, un indicador «1/3».
2. Clic en la foto → visor a pantalla completa con la versión de 1600 px.
3. Flechas (botones y teclado ←/→) recorren las fotos; `Esc` o clic fuera cierra.
4. Bajo la foto: «Foto: {autor} · {licencia} · Ver fuente». Lo que falte se omite.

### 5.3 Flujos alternativos

- **Especie sin fotos propias:** se muestra la de un ejemplar (SPEC-103 D-08) con la etiqueta «Foto
  de un ejemplar», sin contador ni créditos.
- **Especie sin ninguna foto:** el placeholder de hoy.
- **Archivo mayor al límite en la interfaz:** mensaje «La foto pesa 31 MB; el máximo es 25 MB» y no se
  envía.
- **Importación concurrente:** 409 (D-10).

### 5.4 Casos límite

- **Una sola foto:** el visor no muestra flechas ni contador.
- **Foto sin autor** (2 de las 230): «Foto: CC BY-SA 4.0 · Ver fuente».
- **`selecciones.csv` nombra un archivo que no está en la bandeja:** se informa como fallo; la especie
  conserva sus fotos anteriores.
- **Archivo en la bandeja que no está en el CSV:** se ignora y se informa; no se borra.
- **Slug desconocido:** fallo informado; sus archivos se quedan.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | La carga inicial deja las 90 especies con sus fotos | Tras `load-inbox`: responde `loaded: 230, species: 90`; la bandeja queda vacía |
| CA-02 | Cargar es mover | El tamaño de `inbox/species-photos/` pasa de ~800 MB a 0; el almacenamiento crece ~70 MB |
| CA-03 | Varias fotos en la ficha | La ficha de *Acacia stenophylla* muestra «1/4»; el visor recorre las 4 con flechas y teclado |
| CA-04 | Crédito visible | En el visor, cada foto muestra autor y licencia y «Ver fuente» abre su página en Commons |
| CA-05 | El CSV reemplaza el conjunto | Importar 2 filas de *Schinus molle*: la vista previa dice «reemplaza 3 por 2»; la ficha muestra «1/2» |
| CA-06 | El formulario agrega | Subir una foto de especie por formulario a una especie con 3: la ficha muestra «1/4» |
| CA-07 | Límite avisado y comprobado antes de enviar | En los 4 puntos de subida se ve «Máximo 25 MB por foto»; elegir un archivo de 30 MB muestra el error y la pestaña Network no registra la petición |
| CA-08 | El backend también rechaza | Un ZIP con una foto de 30 MB → 400 «larger than 25 MB» |
| CA-09 | Una importación a la vez | Dos vistas previas simultáneas: una responde, la otra 409 |
| CA-10 | Etiqueta correcta | Una especie con fotos propias no dice «Foto de un ejemplar»; una sin ellas, sí |
| CA-11 | El listado no pide más fotos | La cuadrícula de especies carga una miniatura por especie (pestaña Network) |

## 7. Especificación visual

- **Ficha:** la miniatura actual (128 px) gana un indicador «1/3» abajo a la derecha y cursor de
  zoom. Sin cambios de layout.
- **Visor:** fondo `neutral-900/90`, foto centrada a `max-h-[80vh]`, flechas a los lados (ocultas con
  una sola foto), botón cerrar arriba a la derecha, crédito en texto pequeño bajo la foto. En móvil
  (<640 px) las flechas van bajo la foto.
- **Estados:** cargando (placeholder del tamaño de la foto), error de carga (placeholder de la
  especie), una foto (sin flechas).
- **Avisos de límite:** texto `text-xs text-neutral-500` bajo cada selector de archivo; el error en
  `text-error`.

## 8. Tests

```
Varias fotos por especie
- la respuesta de especie lista photos en sort_order
- sin fotos propias → photos vacío, imageUrl del ejemplar, imageSource SPECIMEN
- CSV con 2 filas de una especie con 3 → quedan 2 vigentes, 3 dadas de baja
- formulario sobre una especie con 3 → la nueva tiene sort_order 4

Carga desde la bandeja
- procesa y borra los originales guardados
- una foto corrupta: su especie conserva las fotos anteriores y sus archivos se quedan
- archivo no listado en el CSV: se ignora y no se borra
- segunda ejecución sobre bandeja vacía → loaded 0
- nunca reemplaza el conjunto si falta una foto de la especie

Límites
- ZIP: foto de 25 MB entra, de 25 MB + 1 byte no
- formulario: foto de 26 MB → 400 (antes no tenía límite por foto)
- Drive: descarga de 26 MB → fallo informado
- importación con otra en curso → 409

Frontend
- visor: flechas y teclado, Esc cierra, una foto sin flechas
- crédito: sin autor omite el autor; sin datos no muestra la línea
- selector: archivo mayor al límite → error y ninguna petición
- etiqueta según imageSource
```

## 9. Propio de este spec

- **Despliegue:** `docker-compose.yml` monta `./inbox` en `/data/inbox` con escritura (la carga
  borra lo procesado) y fija `JAVA_TOOL_OPTIONS: -Xmx${BACKEND_HEAP:-1g}`. El README de despliegue
  documenta la bandeja, el heap y por qué 2 GB obligan a una importación a la vez.
- **`.gitignore`:** `inbox/` (los originales nunca se versionan; los créditos sí, en
  `docs/dominio/datos/fotos-especies-creditos.csv`).
- **Estándar:** `docs/estandares/fotos-especies.md` y su plantilla documentan las columnas nuevas
  (`orden`, `autor`, `licencia`, `fuente`) y la regla de reemplazo del conjunto.
- **Auditoría:** la carga inicial y cada reemplazo de conjunto se registran con `AuditService`
  (quién, cuántas fotos, qué especies).
