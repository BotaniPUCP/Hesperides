# Edificios del plano oficial en el mapa — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el mapa 3D dibuje los edificios con los modelos del SKP, agrupados según las relaciones de Nicolás y con los nombres de Jean Piero, sin romper nada de lo que ya apunta a un edificio.

**Architecture:** scripts de Python en `scripts/mapa/plano_pucp/` generan dos cosas a partir de las relaciones y del modelo: un GLB con su manifiesto (servidos por el backend con sesión) y una migración que agrupa los edificios y guarda huella, altura, base y códigos. El visor mete las mallas del GLB en la misma estructura de capa que hoy usan los prismas (`PolyLayer`), de modo que selección, resaltado, clic y etiquetas siguen funcionando. Los desniveles se abren al dibujar con una máscara de stencil, sin tocar los datos.

**Tech Stack:** Python 3.14 con numpy, scipy y shapely (entorno de `plano-pucp-datos/.venv`) · Java 26 con Spring Boot 4.1.1, PostGIS, Flyway y Testcontainers · Next.js 16, three 0.147.0 y Jest.

**Spec:** `specs/features/SPEC-108-edificios-del-plano.md`. El prototipo aprobado que reproduce estas reglas es `scripts/mapa/plano_pucp/prototipo/preparar_propuesta.py` y `plantilla_comparacion.html`.

## Global Constraints

- Leer `specs/REGLAS.md`, en especial INV-1 (sobre `{ok, message, data}`), INV-9 (nada fijado en el código: las excepciones son datos) e INV-10 (verificación en navegador real).
- **No ejecutar `scripts/mapa/generar_semilla_mapa.py` ni editar migraciones publicadas.** La migración nueva es generada y no se regenera una vez publicada (D-09 del registro).
- Número de la migración: el siguiente libre al implementar. En las ramas remotas ya están usados V039, V040 (dos veces) y V041. Se comprueba con `git fetch` y `git ls-tree` sobre todas las ramas remotas.
- **Sin dependencias nuevas en npm.** `three` sigue en 0.147.0 y `GLTFLoader` se importa de `three/examples/jsm/loaders/GLTFLoader.js`.
- Python: solo numpy, scipy y shapely (`scripts/mapa/plano_pucp/requirements.txt`). Los tests usan `unittest` de la biblioteca estándar.
- El Pabellón C (código `2`) no entra en nada (D-05).
- El acabado del visor no cambia (D-11). Las mallas del SKP van sin índice, con normales por cara, `side: DoubleSide` y `shadowSide: BackSide`.
- Umbrales de la spec: suelo al ras hasta 0,6 m; piezas bajas hasta 2 m dentro de un desnivel o un patio, o a menos de 2 m de su borde; desnivel desde −0,3 m; fondo cerrado a −10,5 m; guía del patio de OSM de 1,5 m; etiquetas de 160 px, o hasta 190 px si el nombre entra completo.
- Rutas de datos de esta rama: `docs/datos/procesados/mapa/` (fuentes del mapa) y `docs/datos/procesados/ejemplares.csv`.
- Datos fuera del repositorio (en `PLANO_PUCP_DATOS`, por defecto `../plano-pucp-datos`): `export/campus_pucp.glb` y `trabajo/transformacion.npz`. Los tests que los necesitan se saltan si faltan.
- Textos en español y sin anglicismos en la interfaz. Commits con el formato `tipo(ámbito): …` del repositorio.

## Review Focus

1. **Falla la descarga del modelo** (red móvil, 401 con la sesión vencida o un 500): el mapa debe abrir con prismas, como hoy, y avisar sin bloquear. Lo prueba la Task 7.
2. **Un lugar ligado a un edificio agrupado** (por ejemplo, uno de los 13 de Artes Escénicas): al marcarlo debe resaltarse el edificio principal y no quedar nada sin pintar. Lo prueba la Task 6.
3. **Copia local de capas en formato 2, sin conexión:** los edificios sin `parentId` se tratan como principales y se dibujan como prismas, sin error. Lo prueba la Task 6.
4. **Modo noche o «edificios en gris»:** las mallas del modelo se repintan igual que los prismas, porque usan los mismos colores por vértice. Lo prueba la Task 7.
5. **Búsqueda por el nombre de un edificio agrupado** («CEMDUC» o «Gimnasio»): debe llevar al principal. Lo prueba la Task 6.

---

### Task 1: Entradas del plano: relaciones, nombres y excepciones

**Files:**
- Create: `scripts/mapa/plano_pucp/relaciones.py`
- Create: `scripts/mapa/plano_pucp/excepciones.json`
- Modify: `scripts/mapa/plano_pucp/rutas.py` (agregar rutas)
- Test: `scripts/mapa/plano_pucp/pruebas/test_relaciones.py`

**Interfaces:**
- Produces:
  - En `rutas.py`: `EQUIVALENCIAS = RAIZ / 'frontend/src/components/map3d/equivalence'`, `MODELO_SKP = RAIZ / 'frontend/public/models/equivalence/campus.glb'`, `RECURSOS_MAPA = RAIZ / 'backend/src/main/resources/mapa'` y `MIGRACIONES = RAIZ / 'backend/src/main/resources/db/migration'`.
  - En `relaciones.py`:
    - `@dataclass(frozen=True) class Entrada` con `plan_key: str` (el `id` de la relación, como en `unifiedEntries`; solo Lugar prestado usa `unified:lugar-prestado`), `nombre: str`, `origen_nombre: str`, `codigos: tuple[tuple[str, str], ...]` (código y etiqueta oficial), `map_ids: tuple[str, ...]` (ids de la base en el orden de V011), `piezas: tuple[str, ...]`, `alias: tuple[str, ...]` y `geometria: str` (`'skp'`, `'mapa'` o `'adaptada'`).
    - `leer_equivalencias(carpeta: Path) -> tuple[list[dict], list[dict], dict]`, que devuelve relaciones, códigos y referencias.
    - `nombres_v011(sql: str, osm: list[dict]) -> dict[str, str | None]`, que devuelve el nombre por id. Falla si el orden no coincide con `edificios-osm.geojson`.
    - `cargar_excepciones(ruta: Path) -> dict`.
    - `entradas(relaciones, codigos, referencias, nombre_bd, excepciones) -> list[Entrada]`.
    - `piezas_sin_relacion(relaciones, todas: list[str], excepciones) -> list[str]`.

- [ ] **Step 1: Write the failing tests** en `test_relaciones.py`, con relaciones sintéticas mínimas:
  - `test_regla_de_nombres`: la corrección de referencias gana a todo. Después van `nombres_fijos['codigo:62']`, luego `nombres_fijos['mapa:22']`, luego `name` de la relación, luego los nombres de la base unidos con `' / '` (en orden de id y sin repetir) y al final las etiquetas en el orden de `codes.json`. `origen_nombre` dice cuál ganó.
  - `test_excepciones`: la relación `izquierda` da `geometria == 'mapa'` aunque tenga piezas; la `caseta` da `'adaptada'`; una relación sin piezas da `'mapa'`.
  - `test_lugar_prestado`: las piezas `C-161` y `C-1970` salen de la relación con código `39` y forman la entrada `unified:lugar-prestado`, con nombre «Lugar prestado» y alias «Caseta junto a Maestranza».
  - `test_retirados`: una relación con el código `2` no produce entrada, y sus piezas no aparecen en `piezas_sin_relacion`.
  - `test_datos_reales` (con `skipUnless`, si existen los archivos de `EQUIVALENCIAS`):

    ```python
    e = entradas(...)
    assert len(e) == 133
    assert sum(len(x.map_ids) == 1 for x in e) == 91
    assert sum(len(x.map_ids) > 1 for x in e) == 22 and sum(len(x.map_ids) for x in e if len(x.map_ids) > 1) == 71
    assert sum(not x.map_ids for x in e) == 20
    assert len({c for x in e for c, _ in x.codigos}) == 127
    por_clave = {x.plan_key: x for x in e}
    assert por_clave['249a8c11-620a-48d6-98aa-df74d1f90f69'].geometria == 'mapa'   # Sub-estación N-7 (CA-04)
    assert por_clave['b9a4a553-9c25-45f2-b2fc-43592ab2b917'].geometria == 'adaptada'  # caseta del 95 (CA-04)
    assert por_clave['unified:lugar-prestado'].nombre == 'Lugar prestado'
    artes = next(x for x in e if any(c == 'C51' for c, _ in x.codigos))
    assert len(artes.map_ids) == 13   # Artes Escénicas (CA-03)
    ```

- [ ] **Step 2: Run** `$PY -I -X utf8 -m unittest discover -s scripts/mapa/plano_pucp/pruebas -v`, con `PY` igual a `../plano-pucp-datos/.venv/Scripts/python.exe`. Debe fallar con `ModuleNotFoundError: relaciones`.

- [ ] **Step 3: Implement.** `excepciones.json` contiene:
  - `izquierda`: `249a8c11-620a-48d6-98aa-df74d1f90f69`
  - `caseta`: `b9a4a553-9c25-45f2-b2fc-43592ab2b917`
  - `plantilla_caseta`: `C-3446`
  - `separada`: `{de_codigo: "39", piezas: ["C-161", "C-1970"], plan_key: "unified:lugar-prestado", nombre: "Lugar prestado", alias: ["Caseta junto a Maestranza"]}`
  - `nombres_fijos`: `{"codigo:62": "Instituto de Ciencias Ómicas y Biotecnología Aplicada", "mapa:22": "Aulas Móviles A"}`
  - `retirados`: `["2"]`

  `entradas()` sigue `unifiedEntries` de `unification.ts` y la sección «Entradas» del prototipo. El código `C06-C07` ya viene unido en `codes.json`.

- [ ] **Step 4: Run** el mismo comando. Debe salir PASS (con 1 test saltado si faltan los datos externos).

- [ ] **Step 5: Commit**

```bash
git add scripts/mapa/plano_pucp/relaciones.py scripts/mapa/plano_pucp/excepciones.json scripts/mapa/plano_pucp/rutas.py scripts/mapa/plano_pucp/pruebas/test_relaciones.py
git commit -m "feat(mapa): entradas del plano desde las relaciones de Nicolás con nombres y excepciones de Jean Piero"
```

### Task 2: Reglas de geometría: patios, suelo, desniveles y huaca

**Files:**
- Create: `scripts/mapa/plano_pucp/geometria_plano.py`
- Test: `scripts/mapa/plano_pucp/pruebas/test_geometria_plano.py`

**Interfaces:**
- Consumes: triángulos `np.ndarray` de forma `(n, 3, 3)` en metros locales (x este, y norte, z desde el suelo del modelo), como los entrega `glb.leer()` después de aplicar la transformación del plano.
- Produces, con constantes de módulo `SUELO_MAX_M = 0.6`, `BAJO_MAX_M = 2.05`, `BORDE_M = 2.0`, `GUIA_PATIO_M = 1.5`, `CANTO_MAX_M = 0.6`, `HUNDIDO_UMBRAL_M = -0.3`, `FONDO_M = 10.5` y `COPLANAR_M = 0.05`:
  - `huella(tri) -> Polygon`: unión de la proyección de las caras no verticales.
  - `patio_del_skp(tri, huecos: list[Polygon]) -> Polygon`: D-07.
  - `zonas_hundidas(suelo_plano: dict[str, np.ndarray], piezas: np.ndarray) -> tuple[Polygon, Polygon]`: devuelve el hundimiento y lo que tiene algo encima.
  - `separar(tri, patio, hundido, cubierto) -> tuple[np.ndarray, np.ndarray]`: devuelve la parte de edificio y la de suelo (D-07 y D-08).
  - `corte_con_piso(hundido, pisos) -> Polygon`: D-09.
  - `muros_y_fondo(corte) -> tuple[np.ndarray, np.ndarray]`: los muros van de 0 a −10,5 m, porque el zócalo ya no se recorta en la geometría.
  - `uv_por_cara(tri) -> np.ndarray`: forma `(n, 3, 2)`, en metros. Desde arriba para las caras con |nz| ≥ |nx| y |ny|; de frente para las demás.
  - `adaptar_caseta(plantilla, destino: Polygon, alto: float) -> np.ndarray`.
  - `huaca(capa_l6) -> tuple[np.ndarray, np.ndarray, list[float]]`: devuelve el muro, la parte de arriba (con el piso apoyado a 0,04 m) y la etiqueta `[x, y, z]`.

- [ ] **Step 1: Write the failing tests** con geometría sintética (cajas armadas a mano):
  - `test_patio_sin_losas`: un edificio de 20 × 20 m con patio de 6 × 6 m y losas a 3,5 m y a 7 m. Después de `separar`, no queda ninguna cara horizontal con centro dentro del patio y z ≥ 0,6. Los muros del patio siguen.
  - `test_canto_y_contrahuella`: dentro del patio, una cara vertical de 0,2 m de alto a z = 3,5 se quita y un muro de 3 m se queda.
  - `test_suelo_al_ras`: un sardinel entre 0 y 0,3 m pasa a suelo; una cara horizontal a z = 0,0 fuera del hundimiento se descarta (no está en ninguna de las dos salidas).
  - `test_baranda_en_desnivel`: una cara vertical de 0 a 1,1 m, a 1 m del borde de un hundimiento, pasa a suelo; una igual a 5 m del borde se queda como edificio; un muro de 0 a 3 m junto al hundimiento se queda como edificio.
  - `test_corte_solo_con_piso`: si un hundimiento de 10 × 10 m tiene piso solo en su mitad oeste, `corte_con_piso` mide 50 ± 1 m².
  - `test_uv_vertical`: en una cara vertical que mira al norte, la segunda coordenada de textura varía con z.

- [ ] **Step 2: Run** el comando de la Task 1. Debe fallar con `ModuleNotFoundError: geometria_plano`.

- [ ] **Step 3: Implement** portando las funciones del prototipo (`ahuecar`, el bloque de desniveles, `adaptar_caseta` y `poligonos_xy`). `separar` usa `shapely.contains_xy` sobre los centros de las caras y `shapely.constrained_delaunay_triangles` para recortar las losas que cruzan el borde del patio.

- [ ] **Step 4: Run** el mismo comando. Debe salir PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mapa/plano_pucp/geometria_plano.py scripts/mapa/plano_pucp/pruebas/test_geometria_plano.py
git commit -m "feat(mapa): reglas de patios, suelo, desniveles y huaca para los modelos del plano"
```

### Task 3: Generador del modelo y su manifiesto

**Files:**
- Create: `scripts/mapa/plano_pucp/glb_escritor.py`
- Create: `scripts/mapa/plano_pucp/generar_modelo.py`
- Create (generados): `backend/src/main/resources/mapa/edificios-plano.glb` y `backend/src/main/resources/mapa/edificios-plano.json`
- Test: `scripts/mapa/plano_pucp/pruebas/test_glb.py`

**Interfaces:**
- Consumes: `entradas`, `piezas_sin_relacion` (Task 1) y todo `geometria_plano` (Task 2).
- Produces:
  - `escribir_glb(ruta: Path, nodos: list[tuple[str, np.ndarray, np.ndarray | None]]) -> str`: cada nodo es nombre, triángulos `(n, 3, 3)` en el marco del visor (x este, y arriba, z = −norte) y UV opcional. Escribe solo `POSITION` (float32, sin índice) y `TEXCOORD_0` si hay UV. Devuelve el sha256 del archivo.
  - Manifiesto `edificios-plano.json`:
    ```json
    {"version": "<sha256>", "anchor": {"lat": …, "lon": …},
     "nodes": {"<plan_key>": "edificio", "suelo": "suelo", "jardin-hundido": "jardin",
               "muros-desnivel": "muro", "fondo-desnivel": "muro", "huaca-muro": "huaca-muro",
               "huaca-tope": "huaca-tope", "decoracion": "decoracion"},
     "sunken": [{"polygon": <GeoJSON Polygon WGS84>, "floorM": <float>}],
     "huaca": {"label": "Camino Prehispánico", "at": [lat, lon, zM]}}
    ```
    `anchor` es el origen de `alinear.PlanoLocal`.
  - `trabajo/edificios_plano_principales.json`: una fila por entrada con `plan_key`, `huella` (GeoJSON WGS84), `alto_m` y `base_m`. Lo lee la Task 4.

- [ ] **Step 1: Write the failing tests** en `test_glb.py`:
  - `test_ida_y_vuelta`: escribir dos nodos y leerlos con `glb.leer()`. Se recuperan los mismos nombres y la misma cantidad de triángulos (con una tolerancia de 1e-4 m), y el sha256 coincide con `hashlib.sha256(ruta.read_bytes())`.
  - `test_modelo_real` (`skipUnless` con datos): después de `generar_modelo.main()` hay exactamente un nodo `edificio` por entrada con `geometria != 'mapa'` (126). No hay ningún nodo con el plan_key del Pabellón C. `len(manifiesto['sunken']) > 0` y el GLB pesa menos de 12 MB.

- [ ] **Step 2: Run** el comando de la Task 1. Debe fallar con `ModuleNotFoundError: glb_escritor`.

- [ ] **Step 3: Implement.** `glb_escritor.py` se basa en `writeGlb` de `frontend/scripts/build-equivalence-assets.mjs`. `generar_modelo.main()` hace, en orden:
  1. Lee las piezas de `MODELO_SKP` y les aplica `transformacion.npz`.
  2. Para cada entrada aplica `separar` (patio desde los huecos de OSM de sus `map_ids`) y junta el suelo de todas.
  3. Arma los desniveles con `zonas_hundidas` y `corte_con_piso`, y luego `muros_y_fondo`.
  4. Agrega la huaca y la decoración (las piezas sin relación).
  5. Escribe el GLB, el manifiesto y la tabla de principales.

  Convierte al marco del visor como `(x, z, −y)`.

- [ ] **Step 4: Run**, en este orden, `$PY -I -X utf8 scripts/mapa/plano_pucp/generar_modelo.py` y después los tests. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mapa/plano_pucp/glb_escritor.py scripts/mapa/plano_pucp/generar_modelo.py scripts/mapa/plano_pucp/pruebas/test_glb.py backend/src/main/resources/mapa/
git commit -m "feat(mapa): modelo generado de los edificios del plano y su manifiesto"
```

### Task 4: Migración generada y su prueba

**Files:**
- Create: `scripts/mapa/plano_pucp/generar_migracion.py`
- Create (generada): `backend/src/main/resources/db/migration/V<N>__group_buildings_by_plan.sql`
- Test: `scripts/mapa/plano_pucp/pruebas/test_migracion.py`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/migration/PlanBuildingsMigrationTest.java`

**Interfaces:**
- Consumes: `entradas` (Task 1) y `trabajo/edificios_plano_principales.json` (Task 3).
- Produces: `main(version: str) -> Path`. Falla con `SystemExit` si ya existe una migración con esa versión o con la descripción `group_buildings_by_plan`.

- [ ] **Step 1: Write the failing tests**
  - En `test_migracion.py`:
    - `test_no_sobrescribe`: con un archivo `V999__x.sql` presente, `main('999')` lanza `SystemExit`.
    - `test_sql` (con datos): el texto contiene `ALTER TABLE campus_buildings`, `CREATE TABLE campus_building_codes` y 127 `INSERT` de códigos. Busca los edificios del mapa solo por `source_ref`. Nunca hace `UPDATE … SET source_ref`. Termina con el `DO` que comprueba 133, 71 y 127.
  - En `PlanBuildingsMigrationTest.java` (patrón de `GreenAreaSetsMigrationTest`: Flyway con `target` a la versión anterior y después a la nueva):
    - `principalesYAgrupados`: `count(*) WHERE parent_building_id IS NULL AND is_campus` es 133; `WHERE parent_building_id IS NOT NULL` es 71.
    - `conservaIdsAliasYLugares`: los 162 ids del campus anteriores siguen existiendo. La cantidad de `campus_building_aliases` no baja. Un `places.building_id` sembrado antes sigue resolviendo.
    - `elEntornoNoCambia`: los 255 de `is_campus = false` tienen la misma `footprint` (`ST_Equals`).
    - `sinPabellonC`: no hay ningún `campus_building_codes.code = '2'`.
    - `bibliotecaConservaSuId` (CA-02): el edificio que antes se llamaba Biblioteca Central tiene el mismo `id`, un `plan_key` no nulo, `parent_building_id` nulo y los mismos alias.
    - `artesEscenicasAgrupa13` (CA-03): el principal con el código `C51` tiene 13 edificios con `parent_building_id` igual a su id.
    - `sourceRefIntacto`: el `source_ref` de los edificios reutilizados es igual al de antes.
    - `abortaSiFaltaUnEdificio`: si se borra (con `DELETE`) un edificio esperado antes de migrar, la migración falla y la columna `parent_building_id` no existe.

- [ ] **Step 2: Run** los tests de Python y `cd backend && ./mvnw -q test -Dtest=PlanBuildingsMigrationTest`. Deben fallar: falta el generador y falta la migración.

- [ ] **Step 3: Implement** `generar_migracion.py` con `sql_util.q`, `sql_util.multipoligono` y `sql_util.valores`. Su orden:
  1. DDL de la spec §4.
  2. `UPDATE` de los 91 principales reutilizados por `source_ref`, que pone `plan_key`, `name`, `footprint`, `height_m`, `base_m` y `source` (`'PUCP'` si `geometria == 'skp'`).
  3. `INSERT` de 42 principales nuevos: 22 grupos y 20 que solo están en el SKP. Son `is_campus TRUE`. Su categoría es la de sus hijos si todos coinciden.
  4. `UPDATE` de los hijos con `parent_building_id = (SELECT id … WHERE plan_key = …)`.
  5. Códigos y alias.
  6. El `DO` de comprobación.

  Genera la migración con el número libre que se comprueba al implementar.

- [ ] **Step 4: Run** los tests de Python y luego `./mvnw -q test -Dtest=PlanBuildingsMigrationTest,MigrationNumberingTest,MigrationSmokeTest`. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mapa/plano_pucp/generar_migracion.py scripts/mapa/plano_pucp/pruebas/test_migracion.py backend/src/main/resources/db/migration/V*__group_buildings_by_plan.sql backend/src/test/java/pe/edu/pucp/hesperides/migration/PlanBuildingsMigrationTest.java
git commit -m "feat(db): agrupa los edificios del campus según el plano oficial con códigos y base"
```

### Task 5: API del mapa: campos nuevos, cercanía y modelo

**Files:**
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/map/repository/MapLayerQueries.java` (consulta `BUILDINGS`)
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/map/repository/ProximityDataRepository.java` (consulta `BUILDINGS`)
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/modules/map/controller/MapController.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/map/service/BuildingModelService.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/map/dto/BuildingModelManifest.java`
- Modify: `backend/src/main/resources/application.yml` (compresión)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/map/MapIntegrationTest.java`

**Interfaces:**
- Consumes: las columnas y la tabla de la Task 4, y los recursos de la Task 3.
- Produces:
  - `BUILDINGS` agrega `'parentId', b.parent_building_id`, `'planKey', b.plan_key`, `'baseM', b.base_m` y `'codes'`. Este último es `json_agg(json_build_object('code', c.code, 'label', c.official_label) ORDER BY c.code)` de `campus_building_codes` no borrados, o `null`.
  - `MapController.LAYERS_FORMAT = 3`.
  - `BuildingModelService` con `byte[] model()`, `String etag()` (con la forma `"\"" + sha256 + "\""`) y `String manifestJson()`. Lee `classpath:mapa/edificios-plano.glb` y `.json` una sola vez.
  - `record BuildingModelManifest(@JsonRawValue String manifest)`.
  - `GET /api/v1/map/models/buildings`, con `@PreAuthorize(READERS)`: devuelve 200 con `Content-Type: model/gltf-binary`, `ETag` y `Cache-Control: no-cache`, o 304 si coincide `If-None-Match`.
  - `GET /api/v1/map/models/buildings/manifest`: devuelve `ApiResponse<BuildingModelManifest>`.
  - En `application.yml`: `server.compression.enabled: true`, `mime-types: model/gltf-binary` y `min-response-size: 2048`.

- [ ] **Step 1: Write the failing tests** en `MapIntegrationTest`:
  - `buildingsCarryPlanFields`: un edificio con `planKey` trae `codes[0].code` y `parentId` nulo, y al menos un edificio trae `parentId` no nulo.
  - `theEtagCarriesFormat3`: el `ETag` de `/layers` termina en `-f3"`.
  - `modelRequiresSession`: sin `@WithMockUser`, `/api/v1/map/models/buildings` responde 401.
  - `modelIsServedWithEtag`: con `OPERARIO`, responde 200, el tipo es `model/gltf-binary` y los 4 primeros bytes son `glTF`. Repetido con `If-None-Match`, responde 304.
  - `manifestComesInTheEnvelope`: `$.data.manifest.anchor.lat` existe.
  - `proximityUsesOnlyPrincipals`: el `describe` de un punto dentro de la huella de un edificio agrupado (las coordenadas se sacan de la base en el propio test) devuelve el `described_building_id` del principal.
  - Actualizar `theLayersCarryEveryLoadedElement`: los edificios pasan de 417 a 459 (417 + 42 principales nuevos).

- [ ] **Step 2: Run** `cd backend && ./mvnw -q test -Dtest=MapIntegrationTest`. Debe fallar.

- [ ] **Step 3: Implement.** El filtro de cercanía es `AND b.parent_building_id IS NULL`.

- [ ] **Step 4: Run** `./mvnw -q test -Dtest=MapIntegrationTest` y luego la suite completa, `./mvnw -q test`. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main backend/src/test/java/pe/edu/pucp/hesperides/modules/map/MapIntegrationTest.java
git commit -m "feat(mapa): capas con grupos y códigos del plano, cercanía por edificio principal y modelo con sesión"
```

### Task 6: Datos del visor: tipos, grupos, búsqueda, ficha y lugares

**Files:**
- Modify: `shared/types/map.ts`
- Modify: `frontend/src/lib/map-api.ts`
- Modify: `frontend/src/components/map3d/sceneData.ts`
- Modify: `frontend/src/components/map3d/searchIndex.ts`
- Modify: `frontend/src/components/map3d/infoCard.ts`
- Modify: `frontend/src/components/map3d/viewer/createViewer.ts` (`setMarkedBuildings`)
- Modify: `frontend/src/components/map3d/__fixtures__/mapLayers.ts`
- Test: `frontend/src/components/map3d/__tests__/sceneData.test.ts`, `searchIndex.test.ts` e `infoCard.test.ts`

**Interfaces:**
- Consumes: el JSON de la Task 5.
- Produces:
  - `BuildingProperties` agrega `parentId: number | null`, `planKey: string | null`, `baseM: number | null` y `codes: BuildingCode[] | null`, con `interface BuildingCode { code: string; label: string }`.
  - `interface BuildingModelManifest { version: string; anchor: { lat: number; lon: number }; nodes: Record<string, 'edificio' | 'suelo' | 'jardin' | 'muro' | 'huaca-muro' | 'huaca-tope' | 'decoracion'>; sunken: { polygon: GeoJsonGeometry; floorM: number }[]; huaca: { label: string; at: [number, number, number] } }`
  - `mapApi.buildingModel(): Promise<Blob>` (con `apiClient.getBlob`) y `mapApi.buildingModelManifest(): Promise<BuildingModelManifest>`.
  - `SceneData` agrega `groupedBuildings: ScenePoly<BuildingProperties>[]` (los hijos) y `buildingIndexById: Map<number, number>` (el id de cualquier edificio, principal o hijo, apunta al índice del principal en `campusBuildings`). `campusBuildings` pasa a tener solo los principales: `parentId` nulo o ausente.
  - `buildSearchIndex`: el texto secundario de un principal suma sus códigos, sus etiquetas oficiales y los nombres y alias de sus hijos.
  - La ficha del edificio agrega «Códigos oficiales» (`C51 · PABELLÓN X: …`, unidos con `; `) y, si tiene hijos, «Agrupa N edificios del mapa» con sus nombres.

- [ ] **Step 1: Write the failing tests**
  - `sceneData.test.ts`:
    - `separa principales y agrupados`: con un fixture de 3 edificios (uno principal y dos hijos con `parentId` igual al id del principal), `campusBuildings.length` es 1, `groupedBuildings.length` es 2 y `buildingIndexById.get(idHijo)` es 0.
    - `trata como principal un edificio sin parentId`: un fixture en formato 2, sin el campo, queda en `campusBuildings`.
  - `searchIndex.test.ts`: `search(index, 'cemduc')` devuelve el principal, y `search(index, 'C51')` también.
  - `infoCard.test.ts`: la ficha de un principal con dos hijos tiene la fila «Agrupa 2 edificios del mapa» y la fila «Códigos oficiales».
  - En el test de `setMarkedBuildings` (o en uno nuevo, sobre el ayudante puro que traduce ids): marcar el id de un hijo marca el índice del principal.

- [ ] **Step 2: Run** `cd frontend && npx jest src/components/map3d/__tests__/sceneData.test.ts src/components/map3d/__tests__/searchIndex.test.ts src/components/map3d/__tests__/infoCard.test.ts`. Debe fallar.

- [ ] **Step 3: Implement.** `setMarkedBuildings(ids)` traduce cada id con `data.buildingIndexById` antes de pintar.

- [ ] **Step 4: Run** los mismos tests y después `npx jest src/components/map3d`. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/types/map.ts frontend/src/lib/map-api.ts frontend/src/components/map3d
git commit -m "feat(mapa): el visor agrupa los edificios por relación y muestra códigos oficiales"
```

### Task 7: Visor: modelo del SKP, suelo, desniveles y huaca

**Files:**
- Create: `frontend/src/components/map3d/viewer/planModel.ts`
- Create: `frontend/src/hooks/usePlanModel.ts`
- Modify: `frontend/src/components/map3d/viewer/geometry.ts` (exportar el ensamblado)
- Modify: `frontend/src/components/map3d/viewer/sceneLayers.ts`
- Modify: `frontend/src/components/map3d/viewer/stage.ts`
- Modify: `frontend/src/components/map3d/viewer/polyLayer.ts`
- Modify: `frontend/src/components/map3d/viewer/textures.ts`
- Modify: `frontend/src/components/map3d/viewer/vegetation.ts`
- Modify: `frontend/src/components/map3d/viewer/createViewer.ts`
- Modify: `frontend/src/components/map3d/MapScreen.tsx`
- Test: `frontend/src/components/map3d/__tests__/planModel.test.ts`

**Interfaces:**
- Consumes: `BuildingModelManifest` y `mapApi.buildingModel` (Task 6), y `merged` y `assemble` de `geometry.ts`.
- Produces:
  - `interface PlanModel { buildings: Map<string, Float32Array>; nodes: Record<string, { positions: Float32Array; uv: Float32Array | null }>; sunken: { g: Polygon[]; floorM: number }[]; offset: { x: number; z: number } }`.
    - `buildings` va de `planKey` a posiciones sin índice en el marco de la escena.
    - `sunken` son los polígonos en metros del plano local.
  - `parsePlanModel(manifest: BuildingModelManifest, glb: ArrayBuffer, plane: LocalPlane): Promise<PlanModel>`, que usa `GLTFLoader.parseAsync`.
  - `usePlanModel(plane: LocalPlane | null): { model: PlanModel | null; failed: boolean }`. Nunca lanza: si algo falla, devuelve `failed: true`.
  - `mergedBuildings(feats: ScenePoly<BuildingProperties>[], model: PlanModel | null, heightOf, baseOf): MergedGeometry`. Por cada edificio usa su malla del modelo si existe y, si no, su prisma (`merged` de hoy). Los `starts` siguen un orden por edificio y las normales se calculan por cara.
  - `createViewer(container, labelRoot, data, cb, initialPose?, model?: PlanModel | null)`.
  - `SceneTextures` agrega `tapial`, `tapialNormal`, `tierra` y `tierraNormal`. Los pintores se portan de `prototipo/plantilla_comparacion.html` (`HUACA`), con los colores de la spec D-10.
  - `createSunkenMask(scene: THREE.Scene, sunken: PlanModel['sunken']): THREE.Mesh` usa `colorWrite: false`, `depthWrite: false`, `stencilWrite: true`, `stencilRef: 1`, `stencilZPass: ReplaceStencilOp` y `renderOrder: -10`. La cara de arriba del zócalo y los materiales de `greenAreas`, `xerophytic`, `parking`, `sidewalks`, `reserve` y `supervision` usan `stencilFunc: NotEqualStencilFunc` con `stencilRef: 1`.

- [ ] **Step 1: Write the failing tests** en `planModel.test.ts`, sobre funciones puras:
  - `mergedBuildings usa la malla del modelo`: un edificio con `planKey` y una malla de 2 triángulos, y otro sin `planKey` y con huella cuadrada. `starts` tiene 3 valores: el primer tramo mide 6 vértices y el segundo, los del prisma.
  - `mergedBuildings sin modelo` (`model = null`): el resultado es igual en `starts` a `merged` de hoy.
  - `repinta el modelo`: después de `paintPoly(layer, () => '#8A8A90')`, los colores del tramo del modelo son los de `#8A8A90` por su tono.
  - `parsePlanModel ubica con el anclaje`: con un GLB mínimo de un nodo armado en el test y un `anchor` 10 m al este del origen del plano, las posiciones se desplazan +10 en x.
  - `usePlanModel no lanza`: si `mapApi.buildingModel` rechaza con un 401 simulado, el resultado es `{ model: null, failed: true }`.

- [ ] **Step 2: Run** `cd frontend && npx jest src/components/map3d/__tests__/planModel.test.ts`. Debe fallar.

- [ ] **Step 3: Implement**
  - El material de `campusBuildings` no cambia (D-11), salvo `side: DoubleSide` y `shadowSide: BackSide` cuando hay modelo.
  - Los nodos del manifiesto se dibujan así:
    - `suelo` y `muro`: con el material de la cara de arriba y la de los costados del zócalo.
    - `jardin`: con el material del césped.
    - `huaca-*`: tierra mate con las texturas nuevas.
    - `decoracion`: con el color de edificio, sin clic.
  - Las plantas dentro de un polígono `sunken` bajan a su `floorM`.
  - `createLabels` suma la etiqueta de la huaca (`manifest.huaca.label`, en `manifest.huaca.at`) con el estilo de los jardines, cuando hay modelo.
  - `MapScreen` pasa el modelo cuando llega. Si `failed`, muestra el aviso «No se pudo cargar el modelo del plano; los edificios se ven como bloques.» con el estilo de avisos de `MapScreen`.

- [ ] **Step 4: Run** `npx jest src/components/map3d`, `npm run lint` y `npm run build`. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/map3d frontend/src/hooks/usePlanModel.ts
git commit -m "feat(mapa): el visor dibuja los modelos del SKP con suelo, desniveles y huaca"
```

### Task 8: Recorte de nombres en las etiquetas

**Files:**
- Modify: `frontend/src/components/map3d/viewer/labels.ts`
- Test: `frontend/src/components/map3d/__tests__/labels.test.ts`

**Interfaces:**
- Produces:
  - `trimLabel(text: string, measure: (t: string) => number): string`, pura.
  - Constantes `LABEL_MAX_PX = 160` y `LABEL_TOLERANCE_PX = 190`.
  - `createLabels` mide con un canvas (`600 12px Inter, "Segoe UI", system-ui, sans-serif`) después de `document.fonts.ready` y aplica `trimLabel` a edificios y jardines, no a las puertas.

- [ ] **Step 1: Write the failing tests**, con `measure = (t) => t.length * 7` para las minúsculas o un medidor que pese más las mayúsculas:
  - `'Estudios Generales Ciencias' → 'EE.GG. Ciencias'`
  - `'Departamento Académico de Ciencias Sociales' → 'Dpto. Ciencias Sociales'`
  - `'AULAS MOVILES PSICOLOGÍA'` queda igual (cabe en la tolerancia)
  - `'PABELLÓN I: FACULTAD DE ARTE Y DISEÑO, DEPARTAMENTO ACADÉMICO DE ARTE Y DISEÑO, CIDE' → 'PABELLÓN I'`
  - el resultado nunca termina en `' de…'` ni en `' y…'`
  - con un nombre de una sola palabra de 40 letras, el resultado mide como mucho `LABEL_MAX_PX` y termina en `…`

- [ ] **Step 2: Run** `cd frontend && npx jest src/components/map3d/__tests__/labels.test.ts`. Debe fallar.

- [ ] **Step 3: Implement** siguiendo el orden de la spec D-12 (las abreviaturas de la tabla `ABREVIATURAS` del prototipo van en mayúsculas si el nombre lo está).

- [ ] **Step 4: Run** el mismo test y `npx jest src/components/map3d`. Deben salir PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/map3d/viewer/labels.ts frontend/src/components/map3d/__tests__/labels.test.ts
git commit -m "feat(mapa): las etiquetas recortan los nombres largos por ancho medido"
```

### Task 9: Limpieza, documentación y verificación en navegador

**Files:**
- Modify: `frontend/src/app/(dashboard)/mapa/page.tsx` (quitar los dos enlaces de la rama de Jean Piero)
- Modify: `specs/REGISTRO.md` (mapa de migraciones con la versión real y estado de SPEC-108)
- Modify: `specs/features/SPEC-102-mapa-3d.md` (enmiendas a D-03, §4.1, §7.1 y P-02 como cita con su procedencia)
- Modify: `specs/features/SPEC-108-edificios-del-plano.md` (§4: la versión real)
- Modify: `scripts/mapa/plano_pucp/README.md` (orden: `generar_modelo.py` y después `generar_migracion.py`; tests con `unittest`)

- [ ] **Step 1: Run** la suite completa: `cd backend && ./mvnw -q test`, `cd frontend && npx jest && npm run lint && npm run build`, y los tests de Python. Todo debe salir PASS.

- [ ] **Step 2: Verificación en navegador (INV-10).** Levantar el entorno con la base nueva (`docker compose -p hesperides-dev …`) y abrir `/mapa` con Playwright en escritorio y en 390 px de ancho, en claro y en oscuro. Revisar CA-02 a CA-11, CA-13 y CA-14 de la spec contra la página de comparación aprobada. Los lugares de revisión son: Biblioteca Central (CA-02), clic en Artes Escénicas (CA-03), Sub-estación N-7 y la caseta del 95 (CA-04), patios de Ciencias Humanas, Pabellón Z y Arquitectura (CA-06), el pórtico del Polideportivo (CA-07), el desnivel junto al CIA, mirado a ras del suelo (CA-08), y el Camino Prehispánico (CA-09). CA-13 se prueba bloqueando `/map/models/buildings` en Playwright. Guardar las capturas en `.playwright-mcp/` (no se versiona).

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/(dashboard)/mapa/page.tsx" specs/REGISTRO.md specs/features/SPEC-102-mapa-3d.md specs/features/SPEC-108-edificios-del-plano.md scripts/mapa/plano_pucp/README.md
git commit -m "docs(spec-108): registro, enmiendas a SPEC-102 y guía del generador; quita los enlaces de prueba del mapa"
```
