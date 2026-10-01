# Inventario verde — decisiones y datos agregados

El inventario verde (catálogo de especies y ejemplares) deja de leer datos copiados en el
frontend y pasa a leerlos de la base de datos. Este documento reúne las decisiones de esa
conexión, la información que se **agregó** a las fuentes del cliente y lo que queda por revisar.

> ## ⚠️ IMPORTANTE — Seguridad pendiente
>
> **El inventario es público por decisión temporal (1 oct 2026).** Sus pantallas
> (`/inventario-verde/…`) y sus endpoints de lectura (`GET /api/v1/green-inventory/…`) responden
> **sin sesión**. Cualquiera que conozca la dirección puede ver la **ubicación exacta y la foto de
> cada planta del campus**.
>
> Antes de publicar el sistema fuera de la red de desarrollo hay que decidir qué ve el público
> (por ejemplo, solo especies y conteos) y cerrar el resto detrás de la sesión. Mientras tanto,
> esta excepción está declarada en un solo lugar del backend (`SecurityConfig`), para retirarla con
> un cambio.

---

## 1. Fuentes y cómo se cargan

| Fuente | Copia en el repositorio | Qué aporta |
|---|---|---|
| `catastro campus.xlsx`, hoja `catastro` | `docs/dominio/datos/fuentes-catastro/catastro.csv` | Los 962 registros: ubicación, referencia, coordenadas, especie, tipo, cantidad, foto y código antiguo |
| `mediciones forestales - palmeras.csv` | `…/mediciones-palmeras.csv` | Altura, altura del fuste, DAP, radio de copa y zunchado de 76 palmeras, **medidos** |
| `mediciones forestales - Cafetos.csv` | `…/mediciones-cafetos.csv` | Nada que cargar (ver §6) |
| Limpieza de especies (nuestra) | `docs/dominio/datos/especies.csv` | Nombre corregido, nombre común, nombres alternativos, familia y tipo |

La carga no se escribe a mano: `scripts/catastro/generar_semilla_catastro.py` produce la migración
de semilla a partir de estos archivos. Para corregir un dato se corrige la fuente y se regenera.

## 2. Decisiones sobre los ejemplares

| # | Decisión | Por qué |
|---|---|---|
| D-1 | **Tipos de vegetación: los 9 del cliente** (Árbol, Arbusto, Cubresuelo, Macetones, Palmera, Planta herbácea, Planta suculenta, Seto, Trepadora). El filtro solo muestra los que tienen ejemplares | Es el catálogo confirmado en SPEC-005 §4.5; el catastro usa 6 de ellos |
| D-2 | **La sección no se guarda: se calcula por posición**, como la zona de supervisión | 349 de los 962 ejemplares (36 %) están fuera de toda sección: veredas, plazas y estacionamientos. Si la sección fuera obligatoria habría que inventarla; si se guardara, quedaría desactualizada al redibujar una sección |
| D-3 | **Código propio, neutro y correlativo: `EV-000001`** | Va en el QR y en las órdenes de trabajo, así que nunca cambia. No lleva tipo, especie ni sección, porque esos datos se corrigen. Seis dígitos alcanzan para todo el campus |
| D-4 | **Se conservan los códigos de origen**, aparte del código propio | `source_reference`: la «Referencia» del catastro (`p01`, `JC-1`, `Mec-Pal-3`…), que usa la cuadrilla y nombra la foto. `legacy_code`: los 46 códigos de placa del inventario antiguo (los demás valores de esa columna eran el texto `"null"`). Ninguno es único por diseño |
| D-5 | **La ubicación del catastro se guarda como dato de origen** (`source_location`) | La ubicación oficial la está trabajando el equipo con nuestras categorías y referencias. Las 38 ubicaciones del catastro ya existen como referencia (ver §5) |
| D-6 | **Altura y medidas con su procedencia** (C-08): `height_m`, `trunk_height_m`, `dbh_cm`, `crown_radius_m`, `is_banded` (zunchado) y `measurement_source` | Las 76 palmeras medidas nacen `MEASURED`. Todo otro árbol o palmera nace `UNKNOWN`: **ninguna altura ilustrativa se guarda**, porque la altura decide quién poda |
| D-7 | **Agrupaciones**: las 10 matas de Pita (3 plantas cada una) se cargan como **un ejemplar con `quantity = 3`** | Una mata se cuida como una unidad |
| D-8 | **Las 5 palmeras agrupadas se cargan como ejemplares individuales** (Gh-pal3: 2; rivag44: 3) con la coordenada del grupo y la nota «Falta ubicarla individualmente» | Cada palmera tiene su altura y su poda; agrupadas no se podrían distinguir. Por eso el inventario tiene **965 ejemplares** (962 registros − 2 filas de palmeras + 5 palmeras) |
| D-9 | **Fotos: el enlace de Drive del catastro**, mostrado como miniatura. La foto de una especie es la de uno de sus ejemplares | Son las fotos reales. **Algunos enlaces no son públicos** y no se verán hasta compartirlos; se corrige después. Se retiraron las fotos de stock que no correspondían a la especie |
| D-10 | **Direcciones legibles**: `/inventario-verde/especies/roystonea-regia` y `…/ejemplares/EV-000123` | El nombre científico ya es único y el código no cambia; los ids numéricos cambian en cada recarga de la base |
| D-11 | **Tipo de elemento** (`GREEN_ELEMENT_TYPE`): `INDIVIDUAL` (ejemplar) y `GROUP` (agrupación) | El catálogo previsto (árbol, jardín, césped, campo) quedó superado: los jardines son secciones (SPEC-005 §4.4) y el porte lo da el tipo de vegetación de la especie |
| D-12 | **Quién registró**: los ejemplares cargados figuran como registrados por el administrador inicial | Aún no existe un usuario «Sistema» (SPEC-004) |
| D-14 | **En el mapa, una planta sin medir se dibuja con la altura típica de su especie**, con una variación estable por ejemplar, y su ficha lo dice | Es una ayuda visual: la calcula el visor y nunca se guarda ni la consume ninguna regla (C-08). Una planta se busca en el mapa solo por su código `EV-…`; por especie está el inventario |
| D-13 | **Las 128 plantas del prototipo sin fuente no se cargan** | Están en `docs/dominio/datos/plantas-sin-fuente.csv` para revisión (SPEC-102 P-04) |

## 3. Limpieza de nombres científicos

| En el catastro | Queda como | Motivo |
|---|---|---|
| `Ficus benjamina L.` | `Ficus benjamina` | Sin autor |
| `Ficus benjamina Variegata` y `Ficus benjamina ‘Variegata’` | `Ficus benjamina 'Variegata'` | Es el mismo cultivar escrito de dos formas. Se mantiene aparte de *Ficus benjamina* porque se ve distinto en campo |
| `Caesalpinia spinosa (Molina) Kuntze` | `Caesalpinia spinosa` | Sin autor |
| `Erythrina smithiana Krukoff` | `Erythrina smithiana` | Sin autor |
| `Jacaranda mimosifolia.` · `Laurus nobilis.` | sin el punto final | Error de tipeo |
| `Citrus x sinensis` | `Citrus × sinensis` | Signo de híbrido |

Resultado: **90 especies** a partir de 91 nombres. También se normalizaron mayúsculas y tildes de
los nombres comunes («Escobillon Rojo» → «Escobillón rojo», «Jazmin del paraguay» → «Jazmín del
Paraguay», «Palo borracho (Ceiba)» → «Palo borracho» con «Ceiba» como nombre alternativo).

## 4. Información agregada — POR VALIDAR

Las fuentes no traen familia botánica ni nombres alternativos. Los agregamos nosotros a partir de la
taxonomía botánica aceptada y del uso común en el Perú. **Deben validarse con la sección antes de
darse por oficiales.** Viven en `docs/dominio/datos/especies.csv`.

| Especie | Nombre común | Familia (agregada) | Nombres alternativos (agregados) | Tipo | Ejemplares |
|---|---|---|---|---|---|
| *Acacia stenophylla* | Acacia cordón de zapato | Fabaceae | — | Árbol | 1 |
| *Adansonia digitata* | Baobab | Malvaceae | — | Árbol | 9 |
| *Adonidia merrillii* | Palmera de Navidad | Arecaceae | — | Palmera | 1 |
| *Agave americana* | Pita | Asparagaceae | Agave, Maguey | Arbusto | 10 |
| *Bismarckia nobilis* | Palmera de Bismarck | Arecaceae | — | Palmera | 2 |
| *Bougainvillea glabra* | Buganvilla | Nyctaginaceae | Papelillo | Trepadora | 22 |
| *Brachychiton populneus* | Kurrajong | Malvaceae | Braquiquito | Árbol | 2 |
| *Brunfelsia australis* | Jazmín del Paraguay | Solanaceae | — | Arbusto | 1 |
| *Butia capitata* | Palmera de la jalea | Arecaceae | Butiá | Palmera | 1 |
| *Byrsonima crassifolia* | Indano | Malpighiaceae | Nance | Árbol | 6 |
| *Caesalpinia gilliesii* | Ave del paraíso | Fabaceae | — | Arbusto | 1 |
| *Caesalpinia spinosa* | Tara | Fabaceae | — | Árbol | 17 |
| *Calliandra carbonaria* | Carbonero | Fabaceae | — | Árbol | 1 |
| *Callistemon viminalis* | Escobillón rojo | Myrtaceae | Limpiatubos | Árbol | 1 |
| *Callitris columellaris* | Pino ciprés blanco | Cupressaceae | — | Árbol | 2 |
| *Cananga odorata* | Ylang-ylang | Annonaceae | — | Árbol | 4 |
| *Cassia fistula* | Lluvia de oro | Fabaceae | Caña fístula | Árbol | 1 |
| *Cedrela odorata* | Cedro americano | Meliaceae | Cedro | Árbol | 1 |
| *Ceiba speciosa* | Palo borracho | Malvaceae | Ceiba | Árbol | 45 |
| *Chlorophytum comosum* | Lirio listado | Asparagaceae | Cinta, Mala madre | Planta suculenta | 1 |
| *Citrus × sinensis* | Naranjo | Rutaceae | — | Árbol | 2 |
| *Cocos nucifera* | Palma de coco | Arecaceae | Cocotero | Palmera | 1 |
| *Coffea arabica* | Cafeto | Rubiaceae | — | Arbusto | 55 |
| *Delonix regia* | Ponciana | Fabaceae | Flamboyán | Árbol | 135 |
| *Dracaena fragrans* | Palo de Brasil | Asparagaceae | Palo de agua | Arbusto | 1 |
| *Dypsis lutescens* | Palmera bambú | Arecaceae | Areca | Palmera | 15 |
| *Eriobotrya japonica* | Níspero japonés | Rosaceae | — | Árbol | 1 |
| *Erythrina smithiana* | Porotillo | Fabaceae | — | Árbol | 10 |
| *Erythrina variegata* | Colorín amarillo | Fabaceae | — | Árbol | 2 |
| *Eucalyptus cinerea* | Eucalipto plateado | Myrtaceae | — | Árbol | 2 |
| *Eucalyptus globulus* | Eucalipto común | Myrtaceae | — | Árbol | 16 |
| *Euphorbia tirucalli* | Árbol de los dedos | Euphorbiaceae | Esqueleto | Árbol | 1 |
| *Euphorbia umbellata* | Planta de la vida | Euphorbiaceae | Janaúba | Arbusto | 1 |
| *Ficus benjamina* | Ficus benjamina | Moraceae | — | Árbol | 22 |
| *Ficus benjamina 'Variegata'* | Ficus variegado | Moraceae | Ficus blanco | Árbol | 2 |
| *Ficus carica* | Higuera | Moraceae | — | Árbol | 4 |
| *Ficus insipida* | Higuera de agua | Moraceae | Ojé | Árbol | 3 |
| *Fraxinus uhdei* | Fresno silvestre mexicano | Oleaceae | Fresno | Árbol | 5 |
| *Ginkgo biloba* | Ginkgo | Ginkgoaceae | — | Árbol | 2 |
| *Handroanthus chrysanthus* | Guayacán amarillo | Bignoniaceae | — | Árbol | 49 |
| *Handroanthus impetiginosus* | Lapacho rosado | Bignoniaceae | Tajibo | Árbol | 1 |
| *Hibiscus rosa-sinensis* | Hibisco | Malvaceae | Cucarda | Arbusto | 1 |
| *Hibiscus tiliaceus* | Meijo | Malvaceae | Majagua | Árbol | 6 |
| *Hura crepitans* | Jabillo | Euphorbiaceae | Catahua | Árbol | 1 |
| *Hyophorbe lagenicaulis* | Palmera botella | Arecaceae | — | Palmera | 1 |
| *Inga feuilleei* | Pacae | Fabaceae | Guaba | Árbol | 2 |
| *Jacaranda mimosifolia* | Jacarandá | Bignoniaceae | — | Árbol | 24 |
| *Jarava ichu* | Ichu | Poaceae | Paja brava | Planta herbácea | 39 |
| *Khaya senegalensis* | Cedro de altura | Meliaceae | Caoba africana | Árbol | 3 |
| *Laurus nobilis* | Laurel | Lauraceae | — | Árbol | 1 |
| *Leea guineensis* | Leea púrpura | Vitaceae | — | Arbusto | 3 |
| *Livistona chinensis* | Palmera de abanico china | Arecaceae | — | Palmera | 6 |
| *Mangifera indica* | Mango | Anacardiaceae | — | Árbol | 1 |
| *Matthiola incana* | Alhelí | Brassicaceae | — | Arbusto | 1 |
| *Melaleuca alternifolia* | Árbol del té de hoja estrecha | Myrtaceae | Árbol del té | Árbol | 1 |
| *Melaleuca viminalis* | Cepillo de botella de arroyo | Myrtaceae | — | Árbol | 1 |
| *Myoporum laetum* | Mioporo | Scrophulariaceae | — | Árbol | 1 |
| *Nerium oleander* | Adelfa | Apocynaceae | Laurel rosa | Arbusto | 4 |
| *Parkinsonia praecox* | Palo verde | Fabaceae | — | Árbol | 1 |
| *Persea americana* | Palto | Lauraceae | Aguacate | Árbol | 4 |
| *Phoenix canariensis* | Palmera canaria | Arecaceae | — | Palmera | 9 |
| *Phoenix roebelenii* | Palmera enana | Arecaceae | — | Palmera | 2 |
| *Phytolacca dioica* | Ombú | Phytolaccaceae | — | Árbol | 1 |
| *Piper aduncum* | Matico | Piperaceae | — | Arbusto | 1 |
| *Plumeria obtusa* | Frangipani blanco | Apocynaceae | — | Árbol | 1 |
| *Plumeria rubra* | Suche | Apocynaceae | Frangipani | Árbol | 19 |
| *Podocarpus macrophyllus* | Podocarpus | Podocarpaceae | — | Árbol | 6 |
| *Polyscias guilfoylei* | Geranio aralia | Araliaceae | — | Arbusto | 2 |
| *Populus alba* | Álamo | Salicaceae | Álamo blanco | Árbol | 22 |
| *Prosopis pallida* | Huarango | Fabaceae | Algarrobo | Árbol | 22 |
| *Prunus serrulata* | Sakura | Rosaceae | Cerezo japonés | Árbol | 50 |
| *Psidium guajava* | Guayaba | Myrtaceae | — | Árbol | 1 |
| *Quillaja saponaria* | Quillay | Quillajaceae | — | Árbol | 2 |
| *Randia aculeata* | Crucetilla | Rubiaceae | — | Arbusto | 1 |
| *Ravenea rivularis* | Palmera majestad | Arecaceae | — | Palmera | 1 |
| *Retrophyllum rospigliosii* | Pino romerón | Podocarpaceae | Ulcumano | Árbol | 9 |
| *Robinia pseudoacacia* | Falsa acacia | Fabaceae | — | Árbol | 1 |
| *Roystonea regia* | Palmera real | Arecaceae | — | Palmera | 164 |
| *Sabal palmetto* | Palma de guano | Arecaceae | — | Palmera | 1 |
| *Schefflera arboricola* | Cheflera | Araliaceae | — | Árbol | 7 |
| *Schinus molle* | Molle serrano | Anacardiaceae | Molle, Pimiento | Árbol | 3 |
| *Stenocarpus sinuatus* | Rueda del fuego | Proteaceae | — | Árbol | 1 |
| *Syagrus romanzoffiana* | Palmera reina | Arecaceae | Palmera bruja | Palmera | 13 |
| *Tabebuia roseoalba* | Roble blanco | Bignoniaceae | — | Árbol | 1 |
| *Tecoma stans* | Huaranguay | Bignoniaceae | Fresno amarillo | Árbol | 3 |
| *Thrinax radiata* | Palmera de abanico costera | Arecaceae | — | Palmera | 1 |
| *Tipuana tipu* | Tipa | Fabaceae | — | Árbol | 27 |
| *Vachellia farnesiana* | Aromo | Fabaceae | Huarango espinoso | Arbusto | 1 |
| *Vachellia horrida* | Huaranguillo | Fabaceae | — | Árbol | 1 |
| *Washingtonia robusta* | Palmera de abanico mexicana | Arecaceae | Washingtonia | Palmera | 29 |

**90 especies en 33 familias.** Las más representadas: Fabaceae (15), Arecaceae (15), Myrtaceae (6), Malvaceae (5), Bignoniaceae (5).
Nombres alternativos: 39 especies. Solo «Palmera bruja» (*Syagrus romanzoffiana*), «Ficus blanco» (*Ficus benjamina 'Variegata'*) y «Ceiba» (*Ceiba speciosa*) vienen del catastro; el resto se agregó.

### Clasificaciones del catastro que conviene revisar

No se cambiaron: el tipo de vegetación es el que registró el cliente.

| Especie | Tipo en el catastro | Observación |
|---|---|---|
| *Chlorophytum comosum* (Lirio listado) | Planta suculenta | Es una herbácea, no una suculenta |
| *Agave americana* (Pita) | Arbusto | Es una suculenta |
| *Matthiola incana* (Alhelí) | Arbusto | Es una herbácea |
| *Callistemon viminalis* y *Melaleuca viminalis* | Árbol | Son la **misma especie** con dos nombres (sinónimos botánicos). Se cargaron aparte hasta que la sección elija uno |

## 5. Ubicaciones del catastro

Las **38 ubicaciones** del catastro ya existen como referencia o edificio en el sistema, por nombre
exacto o por alias. Solo una es ambigua:

| Ubicación | Ejemplares | Problema |
|---|---|---|
| `Estacionamiento` | 6 | No dice cuál de los 15 estacionamientos |

## 6. Mediciones

- **Cruce**: las mediciones se unen al catastro por el nombre de su foto, que es la «Referencia»:
  `p01.jpeg`–`p42.jpeg` son `p01`–`p42`, y `p43.jpeg`–`p76.jpeg` son `Mec-Pal-1`–`Mec-Pal-34`.
- **Coordenadas**: se usa la del catastro, que es la del levantamiento oficial y la del mapa. 16
  palmeras tienen en las mediciones otra coordenada, a 2–11 m: 20, 22, 26, 27, 30, 31, 32, 33, 34,
  35, 36, 37, 39, 41, 64 y 65.
- **Errores de tipeo** en las mediciones (no afectan la carga, que usa la coordenada del catastro):
  latitud de la palmera 12 (`-1,2067880` por `-12,067880`) y longitud de la palmera 52 y de los
  cafetos 3 y 24 (`-7,708…` por `-77,08…`).
- **13 palmeras** tienen `#N/A` como especie en las mediciones; la especie se toma del catastro.
- **El archivo de cafetos no trae mediciones**: altura, fuste, DAP y radio están vacíos en las 55
  filas, y sus coordenadas difieren del catastro entre 1 y 15 m. No se carga.

## 7. Pendientes

| Qué | Bloquea |
|---|---|
| Validar familias y nombres alternativos (§4) | Darlos por oficiales |
| Elegir un nombre para *Callistemon viminalis* / *Melaleuca viminalis* | Unir las dos especies |
| Compartir públicamente los enlaces de Drive que no lo son | Que se vean esas fotos |
| Ubicar individualmente las 5 palmeras agrupadas | Su poda individual |
| Revisar las 128 plantas sin fuente | Su carga |
| **Definir qué del inventario es público** | Publicar el sistema |
