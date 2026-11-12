# Video de planificación y reservas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un segundo video de Hespo, de 3:30 a 4:30, sobre Frecuencias, Planificación y Reservas de jardines, generado en el mismo proyecto que el primero sin cambiar el primero.

**Architecture:** El motor del primer video (`docs/demos/video-flujos`) se generaliza para servir dos composiciones: `VideoFlujos` (sin cambios visibles) y `VideoPlanificacion`. El video nuevo tiene su propio guion, audio, capturas y medidas; las medidas se cargan al calcular la composición, no por import estático, para que un video no dependa de los archivos generados del otro. Las capturas salen de dos sesiones desechables, una por rama, cada una en su `git worktree` y su proyecto Docker.

**Tech Stack:** Remotion 4.0.540, React 19, TypeScript 5.5, Vitest 3, Playwright-core 1.64 con Chrome, Python 3.14 con `edge-tts`, Docker Compose, PostgreSQL/PostGIS de las ramas.

**Spec:** `docs/superpowers/specs/2026-11-12-video-planificacion-design.md` (base: `docs/superpowers/specs/2026-11-04-video-flujos-design.md`).

Todas las rutas sin prefijo son relativas a `docs/demos/video-flujos/`. Los comandos corren desde esa carpeta salvo que se diga otra cosa.

## Global Constraints

- MP4 de 1920×1080 a 30 fps, H.264 y AAC; duración entre 3:30 y 4:30 (CE-01).
- El primer video no cambia: sus pruebas pasan y su render es idéntico (CE-10). `guion.json` y `scripts/capturas.ts` no se modifican.
- Las frases de `guion-planificacion.json` son las de la sección 4 del spec, palabra por palabra. Solo se ajustan los campos `hespo`.
- Voz `es-PE-CamilaNeural` con `edge-tts`; solo se envía el texto del guion. Si la voz no está, se detiene: no se cambia de acento.
- El guion no usa «ronda», «ritmo», «alcance», «scope» ni códigos como `OVERDUE`, y no afirma nada de §5.2 del spec. Se habla de «ustedes».
- Poses solo de `POSES`: `quieto`, `saluda`, `senala`, `presenta`, `pulgar`, `sorpresa`, `asiente`, `salta`.
- Datos de demostración exactos: organizaciones «Organización de demostración» y «Organización invitada de demostración»; contactos «Ana Ejemplo» (900 000 001) y «Bruno Ejemplo» (900 000 002). Cuentas `coordinador@demo.invalid` y `capataz@demo.invalid`, clave pública `Hesperides2026`.
- Rama A: `origin/feature/conjuntos-con-ejemplares`. Rama B: `origin/feature/spec-107-reservas-jardines`. Se leen en worktrees; nunca se commitea en ellas.
- Nunca se detienen, reutilizan ni borran los contenedores `hesperides-*` ni los volúmenes `hesperides_pgdata`, `hesperides-dev_pgdata`, `hesperides_pgdata_respaldo_*`, `hesperides_storage`, `hesperides-dev_storage`. Solo se borran los proyectos `hespo-video-a` y `hespo-video-b`.
- Audio (`public/voz/`), capturas (`public/capturas/`), `out/`, `node_modules/` y `.venv/` no entran a git.
- No se tocan frontend, backend ni CI del repositorio.
- Texto propio del video de al menos 32 px; colores de `src/tema.ts`.

## Review Focus

1. **Puertos ocupados por el entorno del usuario** (3000, 8080, 5432 en uso por `hesperides-*`): la sesión se detiene con un mensaje que nombra el puerto; nunca detiene ni reutiliza esos contenedores. Lo pinta la Tarea 3.
2. **Captura cerca de medianoche o con la base en UTC:** «4 días tarde», «hace 3 días» y «faltan 2 días» deben salir exactos. Las fechas pasadas se fijan al mediodía de Lima del día que toca. Lo pinta la Tarea 4 (`mediodiaLimaHace`).
3. **Sesión B fuera del horario diurno:** las reservas «En curso» y «Terminada» de hoy no caben en un solo día; la sesión se detiene antes de crear nada. Lo pinta la Tarea 5 (`cabenReservasDeHoy`).
4. **El primer video sin capturas del segundo, o al revés:** renderizar `VideoFlujos` no requiere `public/capturas/planificacion/`; renderizar `VideoPlanificacion` sin sus medidas falla nombrando el comando que las genera. Lo pinta la Tarea 1 (`crearMedida`) y la Tarea 6.
5. **Una etiqueta de la web cambió en la rama:** la sesión falla nombrando la captura y el elemento, y no deja `medidas.json` a medias. Lo pintan las Tareas 4 y 5 (escritura al final, con prueba de fallo).

---

## Archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/VideoBase.tsx` | Línea de tiempo, escenas, Hespo, subtítulos y audio de cualquier video | 1 |
| `src/Video.tsx` | Configuración del primer video sobre `VideoBase` | 1 |
| `src/escenas/componentes.ts` | `componenteDeEscena`: busca el componente de una escena o falla | 1 |
| `src/pagina/medidasCargadas.ts` | `crearMedida` y el contexto de medidas cargadas | 1 |
| `src/guion.ts` | Tipos, `guion` y `guionPlanificacion` | 1, 2 |
| `src/hespo/recorrido.ts` | Suelo de las escenas nuevas | 1 |
| `scripts/generar_voz.py` | `--guion` | 1 |
| `scripts/fotogramas.ts` | `--video` | 1 |
| `guion-planificacion.json` | Guion del segundo video | 2 |
| `src/reglasDeGuion.ts` | Reglas comunes de los dos guiones, como pruebas | 2 |
| `src/guion-planificacion.test.ts` | Reglas propias del segundo guion | 2 |
| `scripts/duracion.ts` | Duración estimada de un video desde su manifiesto | 2 |
| `scripts/sesion.sh` | Levanta y baja la sesión A o B | 3 |
| `scripts/escenario/fechas.ts` | Fechas del escenario y ventana horaria de la sesión B | 4, 5 |
| `scripts/escenario/sesion-a.sql`, `sesion-b.sql` | Corrimiento de fechas en la base desechable | 4, 5 |
| `scripts/navegador.ts` | Captura con medidas, entrada con cuenta demo, API autenticada | 4 |
| `scripts/capturas-planificacion.ts` | `--sesion a` o `--sesion b`: escenario y capturas | 4, 5 |
| `src/VideoPlanificacion.tsx` | Configuración del segundo video | 6 |
| `src/escenas/planificacion/*.tsx` | Inicio, Frecuencias, Planificacion, Reservas, Cierre | 6–9 |
| `src/Root.tsx` | Registra las dos composiciones | 6 |

---

### Task 1: Motor para dos videos sin cambiar el primero

**Files:**
- Create: `src/VideoBase.tsx`, `src/escenas/componentes.ts`, `src/escenas/componentes.test.ts`, `src/pagina/medidasCargadas.ts`, `src/pagina/medidasCargadas.test.ts`
- Modify: `src/Video.tsx`, `src/guion.ts`, `src/hespo/recorrido.ts`, `scripts/generar_voz.py`, `scripts/test_generar_voz.py`, `scripts/fotogramas.ts`

**Interfaces:**
- Produces:
  - `type EscenaId = 'inicio' | 'especies' | 'ejemplares' | 'incidencias' | 'cierre' | 'frecuencias' | 'planificacion' | 'reservas'`
  - `type ConfigVideo = { escenas: Partial<Record<EscenaId, React.FC<PropsEscena>>>; escalas: Partial<Record<EscenaId, number>>; carpetaVoz: string }`
  - `VideoBase: React.FC<{ linea: Linea; config: ConfigVideo }>`
  - `componenteDeEscena(config: ConfigVideo, id: EscenaId): React.FC<PropsEscena>`
  - `type Medidas = Record<string, Record<string, Medida>>`
  - `crearMedida(datos: Medidas, comando: string): (captura: string, elemento: string) => Medida`
  - `MedidasContexto` (React context de `(captura, elemento) => Medida`) y `useMedida(): (captura: string, elemento: string) => Medida`
  - `generar_voz.py --guion <archivo>` (por defecto `guion.json`) y `_leer_argumentos(argv: list[str] | None = None)`
  - `npm run fotogramas -- --video VideoPlanificacion` (por defecto `VideoFlujos`)

- [ ] **Step 1: Guardar la línea base del primer video**

Con el audio y las capturas actuales del primer video, renderizar estos fotogramas a `out/base-ce10/` antes de tocar código y guardar su SHA-256:

Run: `npx remotion still src/index.ts VideoFlujos out/base-ce10/f0300.png --frame=300` (y lo mismo para 1500, 2700, 4200 y 5300)
Expected: cinco PNG en `out/base-ce10/`.

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/escenas/componentes.test.ts`:

```ts
test('devuelve el componente registrado', () => {
  const Inicio = () => null;
  expect(componenteDeEscena({ escenas: { inicio: Inicio }, escalas: {}, carpetaVoz: 'voz' }, 'inicio')).toBe(Inicio);
});
test('falla nombrando la escena sin componente', () => {
  expect(() => componenteDeEscena({ escenas: {}, escalas: {}, carpetaVoz: 'voz' }, 'reservas')).toThrow('La escena reservas no tiene componente');
});
```

`src/pagina/medidasCargadas.test.ts`:

```ts
const datos = { lista: { fila: { x: 1, y: 2, ancho: 3, alto: 4 } } };
test('devuelve la medida de un elemento', () => {
  expect(crearMedida(datos, 'npm run capturas:planificacion')('lista', 'fila')).toEqual({ x: 1, y: 2, ancho: 3, alto: 4 });
});
test('falla nombrando captura, elemento y comando', () => {
  expect(() => crearMedida(datos, 'npm run capturas:planificacion -- --sesion a')('lista', 'boton'))
    .toThrow('Falta boton en la captura lista: ejecuta npm run capturas:planificacion -- --sesion a');
});
```

En `scripts/test_generar_voz.py`, una prueba `test_guion_por_defecto_y_elegido`: `_leer_argumentos([]).guion == "guion.json"` y `_leer_argumentos(["--guion", "guion-planificacion.json", "--salida", "public/voz/planificacion"])` devuelve esos dos valores.

- [ ] **Step 3: Verificar que fallan**

Run: `npm run prueba` y `.venv/Scripts/python -m unittest scripts/test_generar_voz.py`
Expected: FAIL por `componenteDeEscena`, `crearMedida` y el argumento `guion` inexistentes.

- [ ] **Step 4: Implementar**

- `VideoBase.tsx` es el `Contenido` actual de `Video.tsx`, con `ESCENAS`, `ESCALA_HESPO` y la carpeta del audio (`voz/`) tomados de `config`. La escala que falta vale 1.
- `Video.tsx` exporta `Video` (mismo nombre y props que hoy) como `VideoBase` con la configuración del primer video. `Root.tsx` no cambia en esta tarea.
- `EscenaId` gana `frecuencias`, `planificacion` y `reservas`; en `recorrido.ts`, `SUELO` les asigna `SUELO_PAGINA`.
- `medidasCargadas.ts` no importa ningún JSON: recibe los datos. `src/pagina/medidas.ts` del primer video no cambia.
- `generar_voz.py`: `--guion` relativo a la raíz del proyecto; `_principal` lo usa en lugar de `guion.json` fijo.
- `fotogramas.ts`: `--video` elige la composición; la carpeta de salida es `out/fotogramas/<video>/`.

- [ ] **Step 5: Verificar pruebas y tipos**

Run: `npm run prueba`, `npm run tipos`, `.venv/Scripts/python -m unittest scripts/test_generar_voz.py`
Expected: todo PASS, sin errores de tipos.

- [ ] **Step 6: Verificar CE-10**

Renderizar los mismos cinco fotogramas a `out/despues-ce10/` y comparar SHA-256 con el Step 1.
Expected: los cinco hashes coinciden.

- [ ] **Step 7: Commit**

```bash
git add src scripts/generar_voz.py scripts/test_generar_voz.py scripts/fotogramas.ts
git commit -m "refactor(video): el motor sirve a más de un video sin cambiar el primero"
```

---

### Task 2: Guion del segundo video y su voz

**Files:**
- Create: `guion-planificacion.json`, `src/reglasDeGuion.ts`, `src/guion-planificacion.test.ts`, `scripts/duracion.ts`
- Modify: `src/guion.ts`, `src/guion.test.ts`, `package.json`

**Interfaces:**
- Consumes: `EscenaId`, `Guion`, `construirLinea`, `FPS` (Tarea 1).
- Produces:
  - `guionPlanificacion: Guion` exportado por `src/guion.ts`, cargado de `../guion-planificacion.json`.
  - `probarReglasComunes(nombre: string, guion: Guion): void` en `src/reglasDeGuion.ts`: registra las pruebas de poses, recorrido, orden de movimientos, términos técnicos y promesas que hoy viven en `guion.test.ts`.
  - `npm run duracion -- --guion guion-planificacion.json --voz public/voz/planificacion` imprime `m:ss` y sale con código 1 fuera de 3:30–4:30.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/guion.test.ts` conserva sus pruebas propias (cinco escenas, 37 frases, `i1` = «¡Hola! Soy Hespo.») y llama `probarReglasComunes('primer video', guion)`.

`src/guion-planificacion.test.ts`:

```ts
probarReglasComunes('segundo video', guionPlanificacion);
const frases = guionPlanificacion.escenas.flatMap((e) => e.frases);
const texto = frases.map((f) => f.texto).join(' ');

test('tiene las cinco escenas en orden y 39 frases', () => {
  expect(guionPlanificacion.escenas.map((e) => e.id)).toEqual(['inicio', 'frecuencias', 'planificacion', 'reservas', 'cierre']);
  expect(frases.map((f) => f.id)).toEqual([
    'i1','i2','i3','i4','i5','f1','f2','f3','f4','f5',
    'p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13',
    'r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','c1','c2','c3','c4','c5','c6']);
});
test('usa la voz del primer video', () => expect(guionPlanificacion.voz).toBe('es-PE-CamilaNeural'));
test('presenta a Hespo de nuevo', () => expect(frases[0]).toMatchObject({ id: 'i1', texto: '¡Hola de nuevo! Soy Hespo.' }));
test('no usa las palabras que la web evita', () => {
  ['ronda', 'ritmo', 'alcance', 'scope', 'OVERDUE', 'DUE', 'SCHEDULED'].forEach((t) =>
    expect(texto).not.toMatch(new RegExp(`\\b${t}\\b`, 'i')));
});
test('no afirma lo que el sistema no hace', () => {
  ['correo', 'notifica', 'calendario de la OSG', 'se repite', 'automáticamente', 'aplicación móvil', 'evento bloqueante']
    .forEach((p) => expect(texto.toLowerCase()).not.toContain(p.toLowerCase()));
});
test('solo r10 habla de impedir, y para negarlo', () => {
  expect(frases.filter((f) => /impide/i.test(f.texto)).map((f) => f.id)).toEqual(['r10']);
  expect(frases.find((f) => f.id === 'r10')!.texto.startsWith('Ningún aviso impide')).toBe(true);
});
test('pronuncia Hespérides', () => {
  frases.filter((f) => f.texto.includes('Hesperides')).forEach((f) => expect(f.textoVoz).toContain('Hespérides'));
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npm run prueba`
Expected: FAIL: `guionPlanificacion` no existe.

- [ ] **Step 3: Escribir `guion-planificacion.json` y `guionPlanificacion`**

`voz` = `es-PE-CamilaNeural`; las 39 frases de §4 del spec con su `id` y su `texto` exactos, en sus cinco escenas. `r2` lleva `textoVoz` igual al texto con «Hespérides». Los `hespo` son provisionales: `{ "x": 960, "pose": <la pose de la columna Hespo> }`, con `x: 420` y `saluda` en i1 y `x: 2100` en i5 y c6 (salidas). Las Tareas 6 a 9 los ajustan.

- [ ] **Step 4: Verificar que pasan**

Run: `npm run prueba` y `npm run tipos`
Expected: PASS.

- [ ] **Step 5: Generar la voz y medir la duración**

`scripts/duracion.ts` lee el guion y el manifiesto, usa `construirLinea` y escribe `framesTotales / FPS` como `m:ss`.

Run: `.venv/Scripts/python scripts/generar_voz.py --guion guion-planificacion.json --salida public/voz/planificacion` y luego `npm run duracion -- --guion guion-planificacion.json --voz public/voz/planificacion`
Expected: «39 frases con voz es-PE-CamilaNeural…» y una duración entre 3:30 y 4:30, código 0. Si sale fuera, se detiene y se informa al controlador: el texto lo aprueba el usuario, no se ajusta por cuenta propia (§9 del primer spec).

- [ ] **Step 6: Commit**

```bash
git add guion-planificacion.json src/guion.ts src/guion.test.ts src/reglasDeGuion.ts src/guion-planificacion.test.ts scripts/duracion.ts package.json
git commit -m "feat(video): guion y voz del video de planificación y reservas"
```

---

### Task 3: Sesiones desechables por rama

**Files:**
- Create: `scripts/sesion.sh`
- Modify: `README.md`, `../../../.gitignore` (raíz del repositorio: agrega `.worktrees/`)

**Interfaces:**
- Produces: `bash scripts/sesion.sh arriba a|b` y `bash scripts/sesion.sh abajo a|b`.
  - Rama: `a` → `origin/feature/conjuntos-con-ejemplares`; `b` → `origin/feature/spec-107-reservas-jardines`.
  - Worktree en `<raíz>/.worktrees/video-<s>` (detached, en el commit de la rama remota tras `git fetch`).
  - Proyecto Docker `hespo-video-<s>`; contenedores `hespo-video-<s>-db` y `hespo-video-<s>-backend` (override generado junto al worktree, como `video-nombres.yml` del README).
  - Archivo de entorno desechable `<raíz>/.worktrees/video-<s>.env` con valores de prueba (los cinco del README).
  - Frontend del worktree en `http://localhost:3000` con `npm ci` y `npm run dev` en segundo plano; su log en `<raíz>/.worktrees/video-<s>-frontend.log`; su PID en `video-<s>-frontend.pid`.
  - Imprime la rama y el commit que levantó.
  - Contenedor de la base para el escenario: `hespo-video-<s>-db`.

- [ ] **Step 1: Comprobar que `.worktrees/` queda ignorado**

Agregar `.worktrees/` a la `.gitignore` de la raíz.
Run (desde la raíz): `git check-ignore -q .worktrees/video-a && echo ignorado`
Expected: `ignorado`.

- [ ] **Step 2: Escribir `scripts/sesion.sh`**

`arriba`: falla con «El puerto N está ocupado; la sesión no detiene contenedores ajenos» si 3000, 8080 o 5432 responden; crea el worktree, el entorno y el override; `docker compose -p hespo-video-<s> --env-file … -f docker-compose.yml -f docker-compose.dev.yml -f <override> up -d --build db backend` desde el worktree; espera a que `http://localhost:8080/api/v1/auth/login` deje de rechazar la conexión (hasta 5 min); levanta el frontend y espera `http://localhost:3000/login` (hasta 5 min). `abajo`: mata el PID del frontend, `docker compose -p hespo-video-<s> … down --volumes`, `git worktree remove --force .worktrees/video-<s>` y borra el entorno y el override. Ningún comando nombra `hesperides`.

- [ ] **Step 3: Verificar el rechazo por puerto ocupado**

Run: abrir un oyente en el puerto 8080 (`python -m http.server 8080` en segundo plano) y ejecutar `bash scripts/sesion.sh arriba a`.
Expected: sale con código distinto de 0 y el mensaje del puerto 8080; no se creó el worktree ni el proyecto (`docker compose ls` no muestra `hespo-video-a`).

- [ ] **Step 4: Verificar la sesión A de punta a punta**

Run: `bash scripts/sesion.sh arriba a`, luego `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login`, luego `bash scripts/sesion.sh abajo a` y `docker volume ls --filter name=hespo-video-a -q`.
Expected: imprime rama y commit; `200`; tras bajar, ningún volumen `hespo-video-a`; los volúmenes `hesperides*` siguen en `docker volume ls`.

- [ ] **Step 5: Documentar en el README**

Sección «Video de planificación y reservas» con los tres pasos de este video (voz, sesiones A y B, render), los comandos de esta tarea y la advertencia de revisar cada captura.

- [ ] **Step 6: Commit**

```bash
git add scripts/sesion.sh README.md ../../../.gitignore
git commit -m "feat(video): sesiones desechables por rama para las capturas"
```

---

### Task 4: Escenario y capturas de la sesión A

**Files:**
- Create: `scripts/navegador.ts`, `scripts/capturas-planificacion.ts`, `scripts/escenario/fechas.ts`, `scripts/escenario/fechas.test.ts`, `scripts/escenario/sesion-a.sql`
- Modify: `vitest.config.ts` (incluye `scripts/**/*.test.ts`), `package.json` (`capturas:planificacion`), `../../superpowers/specs/2026-11-12-video-planificacion-design.md` (CE-11 dice `origen.json`)

**Interfaces:**
- Consumes: `scripts/sesion.sh arriba a` (Tarea 3).
- Produces:
  - `mediodiaLimaHace(dias: number, ahora: Date): string` → ISO con `-05:00`, a las 12:00 de Lima del día que corresponde.
  - `navegador.ts`: `capturar(page, id, elementos)`, `entrar(page, correo)`, `api(page, metodo, ruta, cuerpo?)` (usa la sesión del navegador), con salida `public/capturas/planificacion/`. Las medidas se acumulan en memoria y se escriben solo al terminar la sesión sin errores (`guardarMedidas()`).
  - `npm run capturas:planificacion -- --sesion a`.
  - `public/capturas/planificacion/origen.json`: `{ "a": { "rama", "commit", "fecha" }, "b": {…} }`.
  - Capturas y elementos de la sesión A (contrato con las Tareas 7 y 8):

| Captura | Elementos medidos |
|---|---|
| `frecuencias-lista` | `filaCorte`, `frecuenciaCorte`, `columnaFrecuencia`, `filaEstacion`, `filaVeces`, `filaTemporada` |
| `frecuencia-ficha` | `seAplicaA`, `modalidad`, `aviso`, `botones` |
| `conjuntos-lista` | `tarjeta`, `cantidad` |
| `conjunto-selector-0`, `conjunto-selector-1`, `conjunto-selector-arrastre`, `conjunto-selector-2` | `jardinClic`, `inicioArrastre`, `finArrastre`, `lista` |
| `planificacion-nueva` | `conjunto`, `actividad`, `frecuencia` |
| `inicio` | `bloqueAtrasados`, `bloqueVencen`, `irAPlanificacion` |
| `planificacion-lista` | `primeraTarjeta`, `estado`, `ultimaVez`, `sueleRealizarse`, `filtros` |
| `planificacion-elegida` | `primeraTarjeta`, `mapa`, `alDia`, `botonPlanificar` |
| `intervencion-prellenada` | `ubicaciones`, `guardar` |
| `planificacion-programada` | `estado` |
| `planificacion-en-curso` | `estado` |

- [ ] **Step 1: Escribir las pruebas que fallan**

`scripts/escenario/fechas.test.ts`:

```ts
test('el mediodía de Lima de hace 39 días, aunque en UTC ya sea el día siguiente', () => {
  // 12 nov 2026, 23:30 en Lima = 13 nov 04:30 UTC.
  expect(mediodiaLimaHace(39, new Date('2026-11-13T04:30:00Z'))).toBe('2026-10-04T12:00:00-05:00');
});
test('hace 0 días es hoy en Lima', () => {
  expect(mediodiaLimaHace(0, new Date('2026-11-12T06:00:00Z'))).toBe('2026-11-12T12:00:00-05:00');
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npm run prueba`
Expected: FAIL: `mediodiaLimaHace` no existe.

- [ ] **Step 3: Implementar fechas y navegador**

`mediodiaLimaHace` calcula el día civil de Lima (UTC−5, sin horario de verano) y resta días. `navegador.ts` toma de `scripts/capturas.ts` el tamaño de ventana (1280×627, escala 1,5), el estilo que oculta las ayudas de Next y la espera de pintado; `capturas.ts` no se modifica (CE-10).

- [ ] **Step 4: Verificar que pasan**

Run: `npm run prueba`
Expected: PASS.

- [ ] **Step 5: Escribir el escenario A**

En `capturas-planificacion.ts`, la sesión A arma por la API, como coordinador, salvo donde dice capataz:

1. Frecuencias de todo el campus con personal propio: «Corte de césped» cada 30 a 35 días; y tres más con actividades del catálogo cuya celda diga exactamente «Según la estación», «Mín. 2 veces al año» y «1 vez entre marzo y mayo». Si la base ya trae una regla de todo el campus para Corte de césped con otro intervalo, se edita a 30–35 por la API; para las otras tres, sirve cualquier regla existente que ya muestre ese texto.
2. Seis secciones contiguas J1–J6 y otras dos K1–K2 cercanas, elegidas en la base de la sesión. Conjunto P con J1–J6 y conjunto S con J6, K1 y K2. Cada nombre describe la zona real de sus jardines (por ejemplo, el edificio o el acceso más cercano).
3. Planificaciones: P × Corte de césped y S × Corte de césped, con la regla de todo el campus.
4. Historial: una intervención de corte con J1–J6, ejecutada y completada por el capataz; otra con K1 y K2; otra con J6. Después, `sesion-a.sql` corre en `hespo-video-a-db` con `psql -v` y fija `started_at` y `completed_at` de sus ubicaciones (y la fecha programada de cada intervención) en `mediodiaLimaHace(39)`, `mediodiaLimaHace(28)` y `mediodiaLimaHace(3)` respectivamente, y la vigencia de «Corte de césped» en `mediodiaLimaHace(60)`.

Con eso, P sale «Atrasada» con «Al día: 1 de 6 jardines» y «Planificar los 5 pendientes», y S sale «Al día (faltan 2 días)». El inicio muestra «1 conjunto atrasado» y «1 conjunto vence en los próximos 7 días». Si `sesion-a.sql` no encuentra una tabla o columna, la sesión se detiene antes de capturar e indica cuál.

- [ ] **Step 6: Escribir las capturas A**

Una captura por fila de la tabla de Interfaces, en este orden y con estas acciones:

- `frecuencias-lista`: `/intervenciones/frecuencias`.
- `frecuencia-ficha`: clic en la fila de «Corte de césped». Si el aviso «El cambio rige desde hoy…» solo aparece tras un cambio, se cambia un campo sin guardar.
- `conjuntos-lista`: `/intervenciones/conjuntos`, tarjeta de P.
- Selector: `/intervenciones/conjuntos/nuevo`, abrir el selector. `-0` sin nada elegido; `-1` tras un clic en un jardín; `-arrastre` con Control apretado y el ratón a mitad de un rectángulo; `-2` al soltar. Este conjunto no se guarda.
- `planificacion-nueva`: `/intervenciones/planificacion/nueva` con P y Corte de césped elegidos, sin guardar.
- `inicio`: `/`.
- `planificacion-lista`: clic en «Ir a Planificación».
- `planificacion-elegida`: clic en la tarjeta de P.
- `intervencion-prellenada`: clic en «Planificar los 5 pendientes».
- `planificacion-programada`: guardar y volver a `/intervenciones/planificacion`.
- `planificacion-en-curso`: como capataz, empezar esa intervención y completar tres ubicaciones; recargar como coordinador. La tarjeta dice «En curso (faltan 3 jardines)».

Al final escribe `medidas.json` y la entrada `a` de `origen.json` (rama, commit del worktree, fecha).

- [ ] **Step 7: Verificar el fallo limpio**

Con la sesión A arriba y capturas previas en la carpeta, cambiar a mano el texto buscado de `irAPlanificacion` por uno inexistente y correr `npm run capturas:planificacion -- --sesion a`.
Expected: falla con «No se ve «irAPlanificacion» en la captura inicio»; `medidas.json` queda igual que antes (mismo SHA-256). Revertir el cambio.

- [ ] **Step 8: Correr la sesión A y revisar**

Run: `bash scripts/sesion.sh arriba a`, `npm run capturas:planificacion -- --sesion a`, `bash scripts/sesion.sh abajo a`.
Expected: 14 PNG de la tabla en `public/capturas/planificacion/`, todas sus medidas, y `origen.json` con `a`. Se abre cada PNG: textos esperados («Cada 30 a 35 días», «Atrasada», «Al día: 1 de 6 jardines», «Planificar los 5 pendientes», «En curso (faltan 3 jardines)», los dos bloques del inicio) y ningún dato personal.

- [ ] **Step 9: Commit**

```bash
git add scripts/navegador.ts scripts/capturas-planificacion.ts scripts/escenario vitest.config.ts package.json ../../superpowers/specs/2026-11-12-video-planificacion-design.md
git commit -m "feat(video): escenario y capturas de frecuencias y planificación"
```

---

### Task 5: Escenario y capturas de la sesión B

**Files:**
- Create: `scripts/escenario/sesion-b.sql`
- Modify: `scripts/capturas-planificacion.ts`, `scripts/escenario/fechas.ts`, `scripts/escenario/fechas.test.ts`

**Interfaces:**
- Consumes: `navegador.ts`, `mediodiaLimaHace` (Tarea 4), `scripts/sesion.sh arriba b` (Tarea 3).
- Produces:
  - `cabenReservasDeHoy(ahora: Date): boolean`: verdadero si en Lima son entre las 09:00 y las 20:00.
  - `npm run capturas:planificacion -- --sesion b`.
  - Capturas y elementos de la sesión B (contrato con la Tarea 9):

| Captura | Elementos medidos |
|---|---|
| `reservas-agenda` | `fila`, `horario`, `jardin`, `pedidoDe`, `encabezadoHoy`, `encabezadoManana`, `estadoProxima`, `estadoEnCurso`, `estadoTerminada`, `filtroJardin`, `filtroOrganizacion`, `nuevaReserva` |
| `reserva-nueva-0` … `reserva-nueva-4` | `jardin`, `horario`, `pedidoDe`, `solicitante`, `responsable`, `avisos`, `guardar` (cada uno donde ya se ve) |
| `reserva-ficha` | `banner`, `mapa` |
| `intervencion-aviso-reserva` | `aviso`, `guardar` |

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
test('a las 10:00 de Lima caben las reservas de hoy', () => expect(cabenReservasDeHoy(new Date('2026-11-12T15:00:00Z'))).toBe(true));
test('a las 22:00 de Lima no caben', () => expect(cabenReservasDeHoy(new Date('2026-11-13T03:00:00Z'))).toBe(false));
test('a las 07:00 de Lima no caben', () => expect(cabenReservasDeHoy(new Date('2026-11-12T12:00:00Z'))).toBe(false));
```

- [ ] **Step 2: Verificar que fallan, implementar y verificar que pasan**

Run: `npm run prueba`
Expected: primero FAIL por `cabenReservasDeHoy`; tras implementarla, PASS.

- [ ] **Step 3: Escribir el escenario B**

Si `cabenReservasDeHoy(new Date())` es falso, la sesión termina antes de crear nada con «La sesión B necesita luz del día en Lima (09:00 a 20:00) para las reservas en curso y terminada de hoy». Si no, como coordinador y por la API:

1. Las dos organizaciones y los dos contactos de los Global Constraints, Ana de la primera y Bruno de la segunda.
2. Un jardín prestable (preferir «Jardín Rosales» si existe) y una sección que no sea suya a entre 3 y 9 m de su contorno, elegida con `sesion-b.sql` (`ST_Distance` sobre `geography`, como SPEC-107 §2.4). Si no hay ninguna, se detiene y lo indica.
3. Una intervención de Corte de césped programada para mañana en esa sección.
4. Reservas de otros jardines prestables pedidas por la primera organización: una de hoy que empezó hace una hora y termina en dos (En curso), una de hoy que terminó hace dos horas y duró una (Terminada), y una de mañana de 08:00 a 09:30 (Próxima), para que la agenda tenga «Hoy» y «Mañana». Ninguna es del jardín que se reserva en las capturas, así que no hay cruce de horarios.

- [ ] **Step 4: Escribir las capturas B**

- `reservas-agenda`: `/reservas`.
- `reserva-nueva-0` a `-4`: «Nueva reserva»; `-0` vacío; `-1` con el jardín elegido; `-2` con mañana de 10:00 a 14:00 y sus avisos debajo del horario; `-3` con «Pedido de» = «Organización de demostración»; `-4` con «Solicitante» = «Ana Ejemplo» y el responsable ya lleno. Motivo: «Actividad de demostración».
- `reserva-ficha`: guardar; se abre la ficha con el banner «Reserva RES-… registrada» y el mapa.
- `intervencion-aviso-reserva`: `/intervenciones/nueva` con Corte de césped, fecha de mañana y la sección cercana como ubicación; sin guardar. El aviso dice «A N m, <jardín> está reservado de 10:00 a 14:00 (Organización de demostración)».

Al final escribe sus medidas (sin borrar las de A) y la entrada `b` de `origen.json`.

- [ ] **Step 5: Correr la sesión B y revisar**

Run: `bash scripts/sesion.sh arriba b`, `npm run capturas:planificacion -- --sesion b`, `bash scripts/sesion.sh abajo b`.
Expected: 8 PNG nuevos; las medidas de A siguen; `origen.json` con `a` y `b`. Se abre cada PNG: «Hoy», «Mañana», «Próxima», «En curso», «Terminada», el aviso de trabajo cercano en `-2`, el mapa en la ficha y el aviso de reserva; solo los nombres y teléfonos de demostración.

- [ ] **Step 6: Commit**

```bash
git add scripts/capturas-planificacion.ts scripts/escenario
git commit -m "feat(video): escenario y capturas de reservas de jardines"
```

---

### Task 6: Composición del segundo video, Inicio y Cierre

**Files:**
- Create: `src/VideoPlanificacion.tsx`, `src/escenas/planificacion/Inicio.tsx`, `Cierre.tsx`, `Frecuencias.tsx`, `Planificacion.tsx`, `Reservas.tsx`
- Modify: `src/Root.tsx`, `guion-planificacion.json` (solo `hespo` de i1–i5 y c1–c6), `package.json` (`render:planificacion`)

**Interfaces:**
- Consumes: `VideoBase`, `ConfigVideo`, `MedidasContexto`, `useMedida`, `crearMedida` (Tarea 1); `guionPlanificacion` (Tarea 2); capturas y medidas (Tareas 4 y 5).
- Produces:
  - Composición `VideoPlanificacion`: `calculateMetadata` lee `voz/planificacion/manifiesto.json` y `capturas/planificacion/medidas.json` con `staticFile` y falla con «Falta public/capturas/planificacion/medidas.json: ejecuta npm run capturas:planificacion -- --sesion a y --sesion b» si no están.
  - Si `capturas/planificacion/origen.json` no tiene la entrada `a` o la `b`, falla con «Faltan las capturas de la sesión <a|b>: ejecuta npm run capturas:planificacion -- --sesion <a|b>».
  - Props `{ linea, medidas }`; `VideoPlanificacion` envuelve `VideoBase` en `MedidasContexto` con `crearMedida(medidas, 'npm run capturas:planificacion')`.
  - Escalas: `inicio` y `cierre` 1; `frecuencias`, `planificacion` y `reservas` 0,6. Audio en `voz/planificacion/`.
  - `npm run render:planificacion` → `out/hespo-planificacion.mp4` con `--codec=h264`.

- [ ] **Step 1: Inicio y Cierre**

Como `src/escenas/Inicio.tsx` y `Cierre.tsx` del primer video, con `src/ui/Tarjeta.tsx`: Inicio con el título «Hesperides» y tres tarjetas «Frecuencias», «Planificación» y «Reservas»; Cierre con cuatro tarjetas «Frecuencia: cada cuánto», «Conjunto: dónde», «Planificación: qué toca» y «Reserva: cuándo no molestar», cada una al decirse su frase (c2–c5), y el título en c6. Texto de al menos 32 px; las cuatro tarjetas caben en 1920 px con el margen de las tres del primer video.

- [ ] **Step 2: Escenas de página iniciales**

`Frecuencias`, `Planificacion` y `Reservas` muestran con `Pantalla` la primera captura de su escena (`frecuencias-lista`, `conjuntos-lista`, `reservas-agenda`, con la ruta `planificacion/<captura>`). Las Tareas 7 a 9 las completan.

- [ ] **Step 3: Registrar la composición y renderizar fotogramas**

Run: `npm run tipos`, `npm run prueba`, `npm run fotogramas -- --video VideoPlanificacion --escena inicio` y `--escena cierre`.
Expected: tipos y pruebas PASS; fotogramas en `out/fotogramas/VideoPlanificacion/`. Se revisan contra CE-02 a CE-05: Hespo entra, señala cada tarjeta al nombrarla, no tapa tarjetas ni subtítulos, y la boca se mueve solo con voz.

- [ ] **Step 4: Verificar que el primer video no depende de lo nuevo**

Run: mover temporalmente `public/capturas/planificacion` fuera y renderizar el fotograma 300 de `VideoFlujos`; luego intentar el fotograma 0 de `VideoPlanificacion`; restaurar la carpeta.
Expected: `VideoFlujos` renderiza (mismo hash que `out/base-ce10/f0300.png`); `VideoPlanificacion` falla con el mensaje de las medidas.

- [ ] **Step 5: Commit**

```bash
git add src guion-planificacion.json package.json
git commit -m "feat(video): composición del video de planificación con Inicio y Cierre"
```

---

### Task 7: Escena Frecuencias

**Files:**
- Modify: `src/escenas/planificacion/Frecuencias.tsx`, `guion-planificacion.json` (solo `hespo` de f1–f5)

**Interfaces:**
- Consumes: `useMedida` (Tarea 1); capturas `frecuencias-lista` y `frecuencia-ficha` (Tarea 4); `apareceEn`, `capturaEn`, `llegadaDe`, `pulsoDesde` de `src/ui/anim.ts` y `src/hespo/recorrido.ts`.

- [ ] **Step 1: Implementar la escena**

| Frase | Captura | Resaltes | Hespo |
|---|---|---|---|
| f1 | `frecuencias-lista` | — | Entra caminando |
| f2 | `frecuencias-lista` | `filaCorte`, luego `frecuenciaCorte` al decir «cada 30 a 35 días» | Salta al borde de `filaCorte` y señala |
| f3 | `frecuencias-lista` | `columnaFrecuencia`; luego `filaEstacion`, `filaVeces` y `filaTemporada`, cada una al nombrarse su forma | Señala la columna |
| f4 | `frecuencia-ficha` desde que Hespo pulsa `filaCorte` | `seAplicaA` y luego `modalidad` | Pulsa `filaCorte` (con `Pulso`) y salta junto a `seAplicaA` |
| f5 | `frecuencia-ficha` | `aviso` | Señala el aviso sin taparlo |

Los momentos de cada resalte se anclan a fracciones de su frase (`apareceEn`), nunca a segundos.

- [ ] **Step 2: Revisar fotogramas**

Run: `npm run fotogramas -- --video VideoPlanificacion --escena frecuencias`
Expected: en cada fotograma, Hespo junto al elemento del que se habla, sin taparlo ni tapar los subtítulos; la captura cambia a la ficha justo cuando Hespo pulsa la fila.

- [ ] **Step 3: Commit**

```bash
git add src/escenas/planificacion/Frecuencias.tsx guion-planificacion.json
git commit -m "feat(video): escena de frecuencias sobre la pantalla real"
```

---

### Task 8: Escena Planificación y muestra para el usuario

**Files:**
- Modify: `src/escenas/planificacion/Planificacion.tsx`, `guion-planificacion.json` (solo `hespo` de p1–p13), `scripts/duracion.ts` (`--escena <id>` imprime además `desde-hasta` en fotogramas de esa escena)

**Interfaces:**
- Consumes: capturas de la sesión A de `conjuntos-lista` a `planificacion-en-curso` (Tarea 4); lo mismo que la Tarea 7.

- [ ] **Step 1: Implementar la escena**

| Frase | Captura | Resaltes | Hespo |
|---|---|---|---|
| p1 | `conjuntos-lista` | — | Entra caminando |
| p2 | `conjuntos-lista` | `tarjeta`, luego `cantidad` | Señala la tarjeta |
| p3 | `conjunto-selector-0` → `-1` al pulsar `jardinClic` → `-arrastre` durante el arrastre → `-2` al soltar | `lista` en `-2` | Pulsa `jardinClic`; camina de `inicioArrastre` a `finArrastre` |
| p4 | `planificacion-nueva` | `conjunto`, `actividad`, `frecuencia` en ese orden | Camina por los tres campos |
| p5 | `planificacion-lista` | `ultimaVez`, `sueleRealizarse`, `estado` al nombrarse cada dato | Señala cada dato |
| p6 | `inicio` | `bloqueAtrasados`, luego `bloqueVencen` | Gesto de presentar |
| p7 | `inicio` → `planificacion-lista` al pulsar | — | Pulsa `irAPlanificacion` |
| p8 | `planificacion-lista` | `estado`, luego `filtros` | Salta a `primeraTarjeta` y señala `filtros` |
| p9 | `planificacion-elegida` desde que pulsa la tarjeta | `mapa` | Pulsa `primeraTarjeta` |
| p10 | `planificacion-elegida` | `alDia`, luego `botonPlanificar` | Señala `alDia` |
| p11 | `intervencion-prellenada` desde que pulsa `botonPlanificar` | `ubicaciones` | Pulsa `botonPlanificar` |
| p12 | `intervencion-prellenada` | `guardar` | Asiente junto a `guardar` |
| p13 | `planificacion-programada` desde que pulsa `guardar` → `planificacion-en-curso` al decir «cuando el capataz empieza» | `estado` en cada una | Pulsa `guardar`; señala `estado` |

En p5, la tarjeta de `planificacion-lista` se usa antes de mostrar el inicio: es la misma lista que se recorre en p8.

- [ ] **Step 2: Revisar fotogramas**

Run: `npm run fotogramas -- --video VideoPlanificacion --escena planificacion`
Expected: como en la Tarea 7; además, en p3 se ve el rectángulo del arrastre en `-arrastre` y la lista crecida en `-2`.

- [ ] **Step 3: Renderizar la muestra (revisión 1 del usuario)**

Run: `npx remotion render src/index.ts VideoPlanificacion out/muestra-planificacion.mp4 --codec=h264 --frames=<inicio>-<fin>` con el rango que imprime `npm run duracion -- --guion guion-planificacion.json --voz public/voz/planificacion --escena planificacion`.
Expected: `out/muestra-planificacion.mp4` con audio.

- [ ] **Step 4: Commit y pausa**

```bash
git add src/escenas/planificacion/Planificacion.tsx guion-planificacion.json scripts/duracion.ts
git commit -m "feat(video): escena de planificación sobre la pantalla real"
```

**Pausa:** se entrega `out/muestra-planificacion.mp4` al usuario y no se sigue hasta su respuesta. Sus cambios se aplican antes de la Tarea 9.

---

### Task 9: Escena Reservas

**Files:**
- Modify: `src/escenas/planificacion/Reservas.tsx`, `guion-planificacion.json` (solo `hespo` de r1–r10)

**Interfaces:**
- Consumes: capturas de la sesión B (Tarea 5); lo mismo que la Tarea 7.

- [ ] **Step 1: Implementar la escena**

| Frase | Captura | Resaltes | Hespo |
|---|---|---|---|
| r1 | `reservas-agenda` | — | Entra caminando |
| r2 | `reservas-agenda` | `horario`, `jardin`, `pedidoDe` al nombrarse | Señala `fila` |
| r3 | `reservas-agenda` | `encabezadoHoy`, `encabezadoManana`; luego `estadoProxima`, `estadoEnCurso`, `estadoTerminada` al nombrarse | Señala encabezados y etiquetas |
| r4 | `reservas-agenda` | `filtroJardin`, luego `filtroOrganizacion` | Señala los filtros |
| r5 | `reserva-nueva-0` desde que pulsa `nuevaReserva` → `-1`, `-2`, `-3`, `-4` al nombrarse jardín, horario, organización y persona | el campo que se llena | Pulsa `nuevaReserva`; camina campo por campo |
| r6 | `reserva-nueva-4` | `responsable` | Señala el campo |
| r7 | `reserva-nueva-4` | `avisos` | Pose `sorpresa` junto al aviso |
| r8 | `reserva-ficha` desde que pulsa `guardar` | `banner`, luego `mapa` | Pulsa `guardar` |
| r9 | `intervencion-aviso-reserva` | `aviso` | Camina al aviso |
| r10 | `intervencion-aviso-reserva` | `guardar` | `pulgar` |

- [ ] **Step 2: Revisar fotogramas**

Run: `npm run fotogramas -- --video VideoPlanificacion --escena reservas`
Expected: como en la Tarea 7; el formulario avanza al ritmo de r5 y el aviso de r9 se lee completo.

- [ ] **Step 3: Commit**

```bash
git add src/escenas/planificacion/Reservas.tsx guion-planificacion.json
git commit -m "feat(video): escena de reservas sobre la pantalla real"
```

---

### Task 10: Borrador, video final y cierre

**Files:**
- Modify: `README.md` (si cambió algún comando), `../../superpowers/specs/2026-11-12-video-planificacion-design.md` (estado al final de la cabecera)

- [ ] **Step 1: Revisión completa de fotogramas**

Run: `npm run fotogramas -- --video VideoPlanificacion`
Expected: los tres fotogramas de cada una de las 39 frases cumplen CE-02 a CE-05 y CE-09.

- [ ] **Step 2: Borrador (revisión 2 del usuario)**

Run: `npx remotion render src/index.ts VideoPlanificacion out/borrador-planificacion.mp4 --codec=h264 --scale=0.5`
Expected: MP4 de 960×540. **Pausa:** se entrega al usuario y se aplican sus cambios.

- [ ] **Step 3: Video final y CE-01**

Run: `npm run render:planificacion` y `npx remotion ffprobe out/hespo-planificacion.mp4`
Expected: `Duration` entre 00:03:30 y 00:04:30; video h264 1920x1080 30 fps; audio aac.

- [ ] **Step 4: CE-10 sobre el primer video**

Run: `npm run render` y `npx remotion ffprobe out/hespo-flujos.mp4`; `npm run prueba`; `npm run tipos`.
Expected: `Duration: 00:02:58.30` como antes; pruebas y tipos PASS.

- [ ] **Step 5: Commit y entrega (revisión 3 del usuario)**

```bash
git add README.md ../../superpowers/specs/2026-11-12-video-planificacion-design.md
git commit -m "docs(video): video de planificación y reservas terminado"
```

Se entrega `out/hespo-planificacion.mp4` con `origen.json` (qué commit de cada rama muestra) y la lista de capturas revisadas.
