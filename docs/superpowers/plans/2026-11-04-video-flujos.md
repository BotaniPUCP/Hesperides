# Video de flujos para el cliente — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar un MP4 de unos 3 minutos donde Hespo, un retoño animado, presenta con voz los flujos de Especies, Ejemplares e Incidencias al cliente PUCP.

**Architecture:** Proyecto Remotion autónomo en `docs/demos/video-flujos/`. `guion.json` alimenta a un script Python que genera un MP3 por frase y un manifiesto; TypeScript deriva de ahí la línea de tiempo, y las escenas se anclan a identificadores de frase, nunca a segundos escritos a mano.

**Tech Stack:** Remotion 4.0.540, React 19.1.1, TypeScript 5.5.4, Vitest 3.2.7, tsx 4.23.15, Python 3.14, edge-tts 7.3.1, mutagen 1.48.1.

**Spec:** `docs/superpowers/specs/2026-11-04-video-flujos-design.md`

## Global Constraints

- MP4 de 2:30 a 3:30, 1920×1080, 30 fps, H.264 y AAC.
- Pausa entre frases 0,25 s; transición entre escenas 0,6 s.
- Voz `es-PE-CamilaNeural`; alternativa `es-PE-AlexNeural`. Nunca cambiar de acento en silencio.
- Colores de la spec §7, exactos. Sin texto verde sobre negro ni colores de variante.
- Tipografía Nunito con `@remotion/google-fonts`; texto mínimo 32 px en 1080p.
- Los 140 px inferiores son la banda de subtítulos.
- El texto del guion es el de la spec §4, literal. No se afirma nada de la spec §5.2 ni aparecen los términos de §5.3.
- Ningún valor animado usa `Math.random`, `Date` ni estado acumulado: todo se deriva del fotograma.
- Solo se toca `docs/demos/video-flujos/`. Nada de frontend, backend ni CI.
- La revisión visual se hace con fotogramas. La voz la valida una persona, porque no se puede escuchar de forma automatizada.
- La rama y los pasos de commit solo se ejecutan si el usuario los autorizó. Sin autorización, los cambios quedan en el árbol de trabajo.

## Review Focus

- Una frase editada sin regenerar la voz debe impedir el render y nombrar la frase, no salir desincronizada. Prueba en Task 3.
- Si el servicio de voz se corta a mitad de un archivo, ese audio parcial no debe aceptarse como válido en el siguiente intento. Prueba en Task 2.
- La frase más larga del guion debe caber en dos líneas de subtítulo sin invadir la pantalla. Prueba en Task 5.
- «Hesperides», «90» y «965» deben sonar bien aunque el texto escrito no cambie, con un `textoVoz` opcional. Prueba en Task 2.
- Renderizar dos veces debe dar el mismo resultado: parpadeo y caminata dependen solo del fotograma. Prueba en Task 4.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `package.json`, `tsconfig.json`, `remotion.config.ts`, `vitest.config.ts`, `.gitignore` | Proyecto autónomo |
| `guion.json` | Frases, voz y acciones de Hespo |
| `src/guion.ts` | Tipos y lectura del guion |
| `src/guion.test.ts` | Reglas de contenido |
| `scripts/generar_voz.py`, `scripts/test_generar_voz.py`, `scripts/requirements.txt` | Voz y manifiesto |
| `src/tiempos.ts`, `src/tiempos.test.ts` | Línea de tiempo y validación del manifiesto |
| `src/tema.ts` | Colores, tipografía y medidas |
| `src/hespo/poses.ts`, `recorrido.ts`, `boca.ts`, `useApertura.ts`, `Hespo.tsx` y sus pruebas | Personaje |
| `src/ui/anim.ts`, `subtitulos.ts`, `Subtitulos.tsx`, `Escenario.tsx`, `Tarjeta.tsx`, `Contador.tsx`, `Estacion.tsx` | Piezas visuales |
| `src/escenas/*.tsx` | Una escena por módulo |
| `src/Video.tsx`, `src/Root.tsx`, `src/index.ts` | Composición |
| `scripts/fotogramas.ts` | Fotogramas clave para revisión |
| `README.md` | Cómo regenerar el video |

---

### Task 1: Proyecto y guion

**Files:**
- Create: `docs/demos/video-flujos/package.json`, `tsconfig.json`, `remotion.config.ts`, `vitest.config.ts`, `.gitignore`, `guion.json`, `src/guion.ts`, `src/index.ts`, `src/Root.tsx`
- Test: `docs/demos/video-flujos/src/guion.test.ts`

**Interfaces:**
- Produces, en `src/guion.ts`:

```ts
export const POSES = ['quieto', 'saluda', 'senala', 'presenta', 'pulgar', 'sorpresa', 'asiente', 'salta'] as const;
export type Pose = (typeof POSES)[number];
export type Frase = { id: string; texto: string; textoVoz?: string; hespo: { x: number; pose: Pose } };
export type EscenaId = 'inicio' | 'especies' | 'ejemplares' | 'incidencias' | 'cierre';
export type Escena = { id: EscenaId; frases: Frase[] };
export type Guion = { voz: string; escenas: Escena[] };
export const guion: Guion;
```

- [ ] **Step 1: Crear la rama y el proyecto**

Crear la rama `video-flujos` desde `develop`. En `docs/demos/video-flujos/`, `package.json` con `"private": true`, `"type": "module"` y versiones exactas:

| Paquete | Versión |
|---------|---------|
| `remotion`, `@remotion/cli`, `@remotion/media-utils`, `@remotion/google-fonts`, `@remotion/bundler`, `@remotion/renderer` | `4.0.540` |
| `react`, `react-dom` | `19.1.1` |
| `typescript` | `5.5.4` |
| `vitest` | `3.2.7` |
| `tsx` | `4.23.15` |

Scripts: `"estudio": "remotion studio src/index.ts"`, `"prueba": "vitest run"`, `"tipos": "tsc --noEmit"`, `"render": "remotion render src/index.ts VideoFlujos out/hespo-flujos.mp4 --codec=h264"`, `"fotogramas": "tsx scripts/fotogramas.ts"`. `.gitignore` local: `public/voz/`, `public/muestras/`.

- [ ] **Step 2: Escribir `src/guion.test.ts`**

Pruebas, todas contra `guion.json`:

```ts
test('tiene las cinco escenas en orden y 37 frases', () => {
  expect(guion.escenas.map((e) => e.id)).toEqual(['inicio', 'especies', 'ejemplares', 'incidencias', 'cierre']);
  expect(guion.escenas.flatMap((e) => e.frases)).toHaveLength(37);
});
test('los identificadores son únicos', ...);            // Set de ids con tamaño 37
test('usa una voz peruana', ...);                       // guion.voz empieza por 'es-PE-'
test('cada frase usa una pose existente', ...);         // hespo.pose ∈ POSES
test('Hespo no pisa fuera del recorrido', ...);         // -260 <= hespo.x <= 2180
test('no usa términos técnicos', ...);
test('no promete funciones inexistentes', ...);
test('presenta a Hespo', ...);                          // i1.texto === '¡Hola! Soy Hespo.'
```

Términos técnicos, sensibles a mayúsculas y por palabra completa: `PENDING_APPROVAL`, `IN_PROGRESS`, `RESOLVED`, `SUPERVISOR`, `COORDINADOR`, `API`, `endpoint`, `CSV`, `backend`, `frontend`. Promesas, sin distinguir mayúsculas: `notifica`, `sin conexión`, `aplicación móvil`, `inteligencia artificial`, `se liga`, `se vincula`, `dar de baja`, `editar`.

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `npm install && npm run prueba`
Expected: FAIL porque `src/guion.ts` no existe.

- [ ] **Step 4: Escribir `guion.json` y `src/guion.ts`**

Copiar las 37 frases de la spec §4, literales y en orden, con la forma:

```json
{ "voz": "es-PE-CamilaNeural", "escenas": [{ "id": "inicio", "frases": [
  { "id": "i1", "texto": "¡Hola! Soy Hespo.", "hespo": { "x": 420, "pose": "saluda" } }
] }] }
```

`hespo.x` es el centro de Hespo en píxeles de 1920 y se traduce desde la columna «Hespo» de la spec: `x < 0` o `x > 1920` significa fuera de pantalla. Cada escena empieza con Hespo entrando desde `x = -220`. En Incidencias, las frases n3, n6, n8 y n10 usan `x = 300, 760, 1160, 1620`, las posiciones de las estaciones. `src/guion.ts` importa `guion.json` y exporta los tipos.

- [ ] **Step 5: Comprobar pruebas y tipos**

Run: `npm run prueba && npm run tipos`
Expected: 8 pruebas PASS y sin errores de tipos.

- [ ] **Step 6: Registrar una composición mínima y comprobar el render**

`src/Root.tsx` registra `VideoFlujos` (1920×1080, 30 fps, 60 fotogramas) con fondo `#02591F`; `src/index.ts` llama a `registerRoot`.

Run: `npx remotion still src/index.ts VideoFlujos out/prueba.png --frame=0`
Expected: crea `out/prueba.png` de 1920×1080. La primera vez descarga Chrome Headless Shell; es lo que confirma que el render funciona en esta máquina.

- [ ] **Step 7: Commit**

```bash
git add docs/demos/video-flujos docs/superpowers/specs/2026-11-04-video-flujos-design.md docs/superpowers/plans/2026-11-04-video-flujos.md
git commit -m "feat(video): crea el proyecto y el guion del video de flujos"
```

---

### Task 2: Voz y manifiesto

**Files:**
- Create: `docs/demos/video-flujos/scripts/generar_voz.py`, `scripts/requirements.txt`
- Test: `docs/demos/video-flujos/scripts/test_generar_voz.py`

**Interfaces:**
- Consumes: `guion.json` de Task 1.
- Produces: `public/voz/<id>.mp3` y `public/voz/manifiesto.json`:

```json
{ "voz": "es-PE-CamilaNeural", "frases": { "i1": { "archivo": "i1.mp3", "duracion": 1.52, "texto": "¡Hola! Soy Hespo." } } }
```

La huella de la spec es la pareja de `voz` y `texto` guardada en claro. `texto` es el que se envió a sintetizar: `textoVoz` si existe y, si no, `texto`.

- [ ] **Step 1: Crear el entorno**

`requirements.txt` con `edge-tts==7.3.1` y `mutagen==1.48.1`.

Run: `python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/requirements.txt`
Expected: instala sin errores.

- [ ] **Step 2: Escribir `scripts/test_generar_voz.py`**

Con `unittest`, sin red y con `sintetizar` y `medir` falsos:

```python
def test_genera_cada_frase_y_el_manifiesto(self): ...          # 2 frases: 2 mp3 y 2 entradas
def test_no_repite_lo_que_no_cambio(self): ...                 # segunda corrida: 0 llamadas
def test_regenera_si_cambia_el_texto(self): ...                # solo 1 llamada
def test_regenera_todo_si_cambia_la_voz(self): ...             # 2 llamadas
def test_usa_texto_voz_si_existe(self): ...                    # sintetiza 'Hespérides', no 'Hesperides'
def test_un_corte_no_deja_audio_valido(self): ...              # sintetizar escribe bytes y lanza error
def test_lee_acentos_en_utf8(self): ...                        # '¡Hola, ñandú!' intacto
def test_rechaza_voz_inexistente(self): ...                    # VozNoDisponible
```

`test_un_corte_no_deja_audio_valido` afirma: se propaga el error, no existe `i1.mp3`, el manifiesto no contiene `i1` y conserva las frases previas; al reintentar, `i1` se genera.

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `.venv/Scripts/python -m unittest scripts/test_generar_voz.py -v`
Expected: FAIL por módulo inexistente.

- [ ] **Step 4: Implementar `scripts/generar_voz.py`**

```python
class VozNoDisponible(Exception): ...
def cargar_guion(ruta: Path) -> dict: ...                       # encoding='utf-8'
def texto_de_frase(frase: dict) -> str: ...
def comprobar_voz(voz: str, disponibles: list[str]) -> None: ...
async def generar(guion: dict, ruta_manifiesto: Path, salida: Path,
                  sintetizar: Callable[[str, str, Path], Awaitable[None]],
                  medir: Callable[[Path], float],
                  solo: set[str] | None = None) -> dict: ...
```

Cada audio se escribe en `<id>.mp3.tmp` y pasa a `<id>.mp3` con `os.replace` solo si terminó. El manifiesto se guarda igual tras cada frase. Un audio se reutiliza si el archivo existe y coinciden `voz` y `texto`.

CLI: `--voz`, `--salida` (por defecto `public/voz`) y `--solo i1,i2`. `sintetizar` real con `edge_tts.Communicate(...).save`; `medir` con `mutagen.mp3.MP3(ruta).info.length`. Ante un fallo imprime `Falló la frase <id>: <error>` y sale con código 1; con voz inexistente, código 2.

- [ ] **Step 5: Comprobar las pruebas**

Run: `.venv/Scripts/python -m unittest scripts/test_generar_voz.py -v`
Expected: 8 pruebas OK.

- [ ] **Step 6: Generar el audio real y medir**

Run: `.venv/Scripts/python scripts/generar_voz.py`
Expected: 37 MP3 y manifiesto con 37 frases.

Run: `node -e "const m=require('./public/voz/manifiesto.json');const d=Object.values(m.frases).reduce((s,f)=>s+f.duracion,0);console.log((d+37*0.25+4*0.6).toFixed(1)+' s')"`
Expected: entre 150 y 210 s. Fuera de ese rango se ajusta el texto, no la velocidad.

- [ ] **Step 7: Generar las muestras de las dos voces**

Run: `.venv/Scripts/python scripts/generar_voz.py --voz es-PE-AlexNeural --salida public/muestras/alex --solo i1,i2,n4` y lo mismo con `es-PE-CamilaNeural` en `public/muestras/camila`.
Expected: tres MP3 por voz para la revisión de Task 5.

- [ ] **Step 8: Commit**

```bash
git add docs/demos/video-flujos/scripts
git commit -m "feat(video): genera la voz y el manifiesto por frase"
```

---

### Task 3: Línea de tiempo

**Files:**
- Create: `docs/demos/video-flujos/src/tiempos.ts`
- Test: `docs/demos/video-flujos/src/tiempos.test.ts`

**Interfaces:**
- Consumes: `Guion`, `Frase`, `EscenaId` de Task 1; forma del manifiesto de Task 2.
- Produces, en `src/tiempos.ts`:

```ts
export const FPS = 30;
export const FRAMES_PAUSA = 8;       // 0,25 s redondeado
export const FRAMES_TRANSICION = 18; // 0,6 s
export type Manifiesto = { voz: string; frases: Record<string, { archivo: string; duracion: number; texto: string }> };
export type TramoFrase = { frase: Frase; escenaId: EscenaId; desde: number; frames: number; archivo: string };
export type TramoEscena = { id: EscenaId; desde: number; frames: number; frases: TramoFrase[] };
export type Linea = { escenas: TramoEscena[]; framesTotales: number };
export function problemasDeVoz(guion: Guion, manifiesto: Manifiesto): string[];
export function construirLinea(guion: Guion, manifiesto: Manifiesto): Linea;
export function comprobarAudios(linea: Linea, existe: (archivo: string) => Promise<boolean>): Promise<void>;
export function fraseActiva(linea: Linea, frame: number): TramoFrase | null;
export function framesClave(linea: Linea): { id: string; frame: number; momento: 'inicio' | 'mitad' | 'final' }[];
```

- [ ] **Step 1: Escribir `src/tiempos.test.ts`**

Con un guion de dos escenas de dos frases y duraciones de 1,0 s y 2,0 s:

```ts
test('las frases no se solapan y respetan la pausa', ...);     // desde[n+1] === desde[n] + frames[n] + 8
test('las escenas dejan la transición', ...);                  // escena2.desde === fin de escena1 + 18
test('redondea los fotogramas hacia arriba', ...);             // 1,01 s => 31 fotogramas
test('el total cubre la última frase', ...);
test('durante una pausa no hay frase activa', ...);            // fraseActiva(...) === null
test('falla si una frase cambió sin regenerar la voz', () => {
  expect(() => construirLinea(guionCambiado, manifiesto)).toThrow(/i1/);
});
test('falla si falta una frase en el manifiesto', ...);        // mensaje con el id
test('falla si cambió la voz', ...);
test('falla con una duración de cero', ...);
test('comprobarAudios nombra el archivo que falta', ...);
test('framesClave da inicio, mitad y final por frase', ...);   // 3 por frase, dentro del tramo
```

La comparación usa `textoVoz ?? texto` contra `manifiesto.frases[id].texto`.

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm run prueba -- src/tiempos.test.ts`
Expected: FAIL por módulo inexistente.

- [ ] **Step 3: Implementar `src/tiempos.ts`**

`construirLinea` lanza `Error` con `Voz desactualizada: <ids>` si `problemasDeVoz` no está vacío.

- [ ] **Step 4: Comprobar las pruebas**

Run: `npm run prueba`
Expected: todas PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/demos/video-flujos/src/tiempos.ts docs/demos/video-flujos/src/tiempos.test.ts
git commit -m "feat(video): deriva la línea de tiempo del manifiesto de voz"
```

---

### Task 4: Hespo

**Files:**
- Create: `docs/demos/video-flujos/src/tema.ts`, `src/hespo/poses.ts`, `src/hespo/recorrido.ts`, `src/hespo/boca.ts`, `src/hespo/useApertura.ts`, `src/hespo/Hespo.tsx`
- Test: `docs/demos/video-flujos/src/hespo/hespo.test.ts`

**Interfaces:**
- Consumes: `Pose`, `Frase` de Task 1; `TramoEscena`, `FPS` de Task 3.
- Produces:

```ts
// tema.ts
export const COLOR: { verde; blanco; negro; arena; cuerpo; barriga; hoja; borde };
export const ANCHO = 1920; export const ALTO = 1080; export const BANDA = 140; export const SUELO_Y = 880;
// poses.ts
export type Articulaciones = { brazoI: number; brazoD: number; piernaI: number; piernaD: number; inclina: number; saltoY: number };
export const POSES_HESPO: Record<Pose, Articulaciones>;
export function mezclar(a: Articulaciones, b: Articulaciones, t: number): Articulaciones;
// recorrido.ts
export type EstadoHespo = { x: number; mira: 1 | -1; caminando: boolean; articulaciones: Articulaciones };
export function estadoHespo(escena: TramoEscena, frame: number): EstadoHespo; // frame global
export function parpadeo(frame: number): number;                              // 1 abierto, 0 cerrado
// boca.ts
export type Boca = 'cerrada' | 'media' | 'abierta';
export function formaDeBoca(apertura: number): Boca;
export function aperturaDesdeEspectro(muestras: number[]): number;            // 0 a 1
// useApertura.ts
export function useApertura(archivo: string | null, frameLocal: number): number;
// Hespo.tsx
export const Hespo: React.FC<{ estado: EstadoHespo; frame: number; apertura: number; escala?: number }>;
```

- [ ] **Step 1: Escribir `src/hespo/hespo.test.ts`**

```ts
test('existe una pose para cada nombre del guion', ...);        // POSES.every(p => POSES_HESPO[p])
test('mezclar respeta los extremos', ...);                       // t=0 da a, t=1 da b
test('camina hacia el destino y luego se detiene', ...);         // x final === hespo.x; caminando false
test('mira hacia donde camina', ...);                            // destino menor: mira === -1
test('llega antes de que termine la frase', ...);                // incluso con 2000 px en una frase corta
test('el parpadeo es determinista', ...);                        // misma entrada, misma salida
test('la caminata es determinista', ...);                        // dos llamadas con iguales datos: toEqual
test('en silencio la boca está cerrada', ...);                   // formaDeBoca(0) === 'cerrada'
test('los umbrales de boca', ...);                               // 0.14 cerrada, 0.15 media, 0.54 media, 0.55 abierta
test('aperturaDesdeEspectro se mantiene entre 0 y 1', ...);
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm run prueba -- src/hespo/hespo.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar la lógica**

- `tema.ts` con los colores de la spec §7.
- `export const ENTRADA_X = -220` en `recorrido.ts`: la posición de Hespo al empezar cada escena.
- Velocidad de caminata 420 px/s, limitada al 80 % de la frase. El movimiento empieza al iniciar la frase.
- Mientras camina: piernas `sin(2π·frame/14)·24°`, brazos en oposición a 18°, y gana a la pose de la frase. Al llegar, 6 fotogramas de mezcla hacia la pose.
- Valores de partida de los brazos: `saluda` y `senala` con `brazoD: -100`, `presenta` con `brazoI: 40` y `brazoD: -40`, `pulgar` con `brazoD: -62`, `salta` con `brazoI: 118`, `brazoD: -118` y `saltoY: -30`.
- `parpadeo`: cerrado 4 de cada 96 fotogramas, con desplazamiento fijo. La respiración y el mecido de hojas derivan de `sin(frame)`.
- `aperturaDesdeEspectro`: promedio de las primeras 8 muestras por 3,5, acotado a 1.
- `useApertura` con `useAudioData` y `visualizeAudio` (`numberOfSamples: 16`); con `archivo` nulo devuelve 0.

- [ ] **Step 4: Comprobar las pruebas**

Run: `npm run prueba`
Expected: todas PASS.

- [ ] **Step 5: Implementar `src/hespo/Hespo.tsx`**

Leer `project/Retono.dc.html` del lienzo `https://claude.ai/artifact/HKvak3U1KQahHnYttepHWB` y trasladar cada forma sin cambiar coordenadas, con `viewBox="-30 -40 360 380"`. Pivotes: `piernaI (118,268)`, `piernaD (182,268)`, `brazoI (74,196)`, `brazoD (226,196)`. Las bocas cerrada, media y abierta y la lengua usan los trazados de esa ficha; `formaDeBoca` elige cuál. Los pies quedan en `y = 323` del `viewBox` y se alinean con `SUELO_Y`. `mira = -1` refleja el grupo.

- [ ] **Step 6: Verificar a Hespo en una imagen**

Registrar una composición temporal `PruebaHespo` con las ocho poses en fila.
Run: `npx remotion still src/index.ts PruebaHespo out/hespo.png`
Expected: las ocho poses se distinguen, las hojas asimétricas se ven en todas y coincide con la propuesta A. Quitar la composición después.

- [ ] **Step 7: Commit**

```bash
git add docs/demos/video-flujos/src
git commit -m "feat(video): anima a Hespo con poses, caminata y boca"
```

---

### Task 5: Composición, subtítulos y escena de Inicio

**Files:**
- Create: `docs/demos/video-flujos/src/ui/anim.ts`, `src/ui/subtitulos.ts`, `src/ui/Subtitulos.tsx`, `src/ui/Escenario.tsx`, `src/ui/Tarjeta.tsx`, `src/ui/Contador.tsx`, `src/escenas/Inicio.tsx`, `src/Video.tsx`, `scripts/fotogramas.ts`
- Modify: `docs/demos/video-flujos/src/Root.tsx`
- Test: `docs/demos/video-flujos/src/ui/ui.test.ts`

**Interfaces:**
- Consumes: `Linea`, `construirLinea`, `comprobarAudios`, `fraseActiva`, `framesClave` de Task 3; `Hespo`, `estadoHespo`, `useApertura` de Task 4; `COLOR` de `tema.ts`.
- Produces:

```ts
// anim.ts: todas reciben el fotograma global
export function apareceEn(escena: TramoEscena, fraseId: string, frame: number, retraso?: number): number; // 0 a 1
export function indiceFrase(escena: TramoEscena, frame: number): number;
// subtitulos.ts
export function partirEnLineas(texto: string, maximo?: number): string[]; // máximo 85 caracteres, 2 líneas
// escenas
export type PropsEscena = { escena: TramoEscena; frame: number };
```

`retraso` es una fracción de la frase de 0 a 1: ancla un elemento dentro de una frase sin escribir segundos.

- [ ] **Step 1: Escribir `src/ui/ui.test.ts`**

```ts
test('la frase más larga cabe en dos líneas', () => {
  const frases = guion.escenas.flatMap((e) => e.frases);
  frases.forEach((f) => {
    const lineas = partirEnLineas(f.texto);
    expect(lineas.length).toBeLessThanOrEqual(2);
    lineas.forEach((l) => expect(l.length).toBeLessThanOrEqual(85));
    expect(lineas.join(' ')).toBe(f.texto);
  });
});
test('apareceEn vale 0 antes de la frase y 1 al terminar', ...);
test('el retraso desplaza la aparición dentro de la frase', ...);
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm run prueba -- src/ui/ui.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar `anim.ts` y `subtitulos.ts`**

`apareceEn` usa `interpolate` de 12 fotogramas con `Easing.out(Easing.cubic)`.

- [ ] **Step 4: Comprobar las pruebas**

Run: `npm run prueba`
Expected: todas PASS.

- [ ] **Step 5: Implementar composición y escena de Inicio**

- `Escenario`: fondo verde, suelo arena desde `y = 800` y banda negra de 140 px.
- `Root`: `calculateMetadata` lee `staticFile('voz/manifiesto.json')`, llama a `construirLinea` y `comprobarAudios` con `fetch(..., { method: 'HEAD' })`, y devuelve `durationInFrames` y `props`. La tipografía se carga con `loadFont` de `@remotion/google-fonts/Nunito`, sin fuente alternativa: si no carga, el render debe fallar.
- `Video`: `<Sequence>` por escena con fundido de 18 fotogramas, `<Sequence>` con `Html5Audio` por frase, `Hespo` y `Subtitulos` por encima de las escenas.
- `Inicio`: spec §4, frases i1 a i4. Las escenas aún sin implementar muestran solo el título. El contenido vive entre `y = 60` e `y = 590`, por encima de la cabeza de Hespo, y `Hespo` usa escala 0,8.

- [ ] **Step 6: Implementar `scripts/fotogramas.ts`**

Con `bundle`, `selectComposition` y `renderStill`, escribe `out/fotogramas/<id>-<momento>.png`. Acepta `--escena <id>`.

Run: `npm run fotogramas -- --escena inicio`
Expected: 12 PNG sin errores.

- [ ] **Step 7: Revisar los fotogramas**

Comprobar CE-02, CE-03, CE-04 y CE-05 en los 12 PNG. Corregir antes de seguir.

- [ ] **Step 8: Primera revisión del usuario**

Run: `npx remotion render src/index.ts VideoFlujos out/muestra-inicio.mp4 --codec=h264 --frames=0-<fin de inicio>`

Entregar `out/muestra-inicio.mp4` y las muestras de `public/muestras/`. **Detenerse hasta que el usuario elija voz y apruebe la animación.** Si elige Alex: cambiar `voz` en `guion.json` y repetir Task 2, Step 6.

- [ ] **Step 9: Commit**

```bash
git add docs/demos/video-flujos
git commit -m "feat(video): compone el video con subtítulos y la escena de inicio"
```

---

### Task 6: Escena de Especies

**Files:**
- Create: `docs/demos/video-flujos/src/escenas/Especies.tsx`
- Modify: `docs/demos/video-flujos/src/Video.tsx`

**Interfaces:**
- Consumes: `PropsEscena`, `apareceEn`, `Tarjeta`, `Contador` de Task 5; `COLOR` de `tema.ts`.

- [ ] **Step 1: Implementar la escena**

Frases e1 a e6 de la spec §4. Ficha de ejemplo con *Roystonea regia*, Palmera real, Arecaceae y Palmera; cada dato aparece con `apareceEn(escena, 'e2', frame, 0.2 | 0.4 | 0.6 | 0.8)`. Contador hasta 90 en e3, buscador escribiendo «palmera» en e4 y foto ilustrada en SVG en e5, sin fotos reales.

- [ ] **Step 2: Generar y revisar fotogramas**

Run: `npm run fotogramas -- --escena especies`
Expected: 18 PNG que cumplen CE-02, CE-04 y CE-05. Cada dato aparece al nombrarse.

- [ ] **Step 3: Commit**

```bash
git add docs/demos/video-flujos/src
git commit -m "feat(video): anima la escena de especies"
```

---

### Task 7: Escena de Ejemplares

**Files:**
- Create: `docs/demos/video-flujos/src/escenas/Ejemplares.tsx`
- Modify: `docs/demos/video-flujos/src/Video.tsx`

**Interfaces:**
- Consumes: `PropsEscena`, `apareceEn`, `Tarjeta`, `Contador` de Task 5.

- [ ] **Step 1: Implementar la escena**

Frases j1 a j9. Plano esquemático propio, no el mapa real, con tres plantas. Contador hasta 965 y etiqueta `EV-000123`. Tres pasos encendidos en orden con retrasos 0,1, 0,4 y 0,7 de j4. Botones de j6 con los textos exactos «No, es otro: registrar» y «Revisar el punto». Botón de j8 «Confirmar carga».

- [ ] **Step 2: Generar y revisar fotogramas**

Run: `npm run fotogramas -- --escena ejemplares`
Expected: 27 PNG que cumplen CE-02, CE-04 y CE-05.

- [ ] **Step 3: Commit**

```bash
git add docs/demos/video-flujos/src
git commit -m "feat(video): anima la escena de ejemplares"
```

---

### Task 8: Escena de Incidencias

**Files:**
- Create: `docs/demos/video-flujos/src/ui/Estacion.tsx`, `src/escenas/Incidencias.tsx`
- Modify: `docs/demos/video-flujos/src/Video.tsx`

**Interfaces:**
- Consumes: `PropsEscena`, `apareceEn`, `Tarjeta` de Task 5.
- Produces: `Estacion: React.FC<{ numero: number; nombre: string; estado: string; activa: boolean; x: number }>`

- [ ] **Step 1: Implementar la escena**

Frases n1 a n13. Cuatro estaciones en `x = 300, 760, 1160, 1620`, con los nombres Informa, Aprueba, Atiende y Resuelve. Las etiquetas son literales del sistema: «Pendiente de aprobación» en n4, «Pendiente de atención» en n6, «En atención» en n8 y «Resuelta» en n11. El trabajo pendiente se marca en n10. La lista de n13 lleva la marca «Provisional». En n12 los cuatro contadores son ilustrativos, sin cifras: muestran solo las etapas, para no inventar datos.

- [ ] **Step 2: Generar y revisar fotogramas**

Run: `npm run fotogramas -- --escena incidencias`
Expected: 39 PNG que cumplen CE-02, CE-04 y CE-05. Hespo llega a cada estación en la frase que la nombra.

- [ ] **Step 3: Commit**

```bash
git add docs/demos/video-flujos/src
git commit -m "feat(video): anima la escena de incidencias"
```

---

### Task 9: Cierre y borrador completo

**Files:**
- Create: `docs/demos/video-flujos/src/escenas/Cierre.tsx`
- Modify: `docs/demos/video-flujos/src/Video.tsx`

**Interfaces:**
- Consumes: `PropsEscena`, `apareceEn`, `Tarjeta` de Task 5.

- [ ] **Step 1: Implementar la escena**

Frases c1 a c5, con tres tarjetas: «Especie: qué es», «Ejemplar: dónde está» e «Incidencia: qué pasó». Hespo sale caminando en c5.

- [ ] **Step 2: Revisar los fotogramas de cierre y todas las transiciones**

Run: `npm run fotogramas -- --escena cierre`
Expected: 15 PNG correctos. Revisar además el último y el primer fotograma de cada cambio de escena: sin saltos de Hespo.

- [ ] **Step 3: Renderizar el borrador**

Run: `npx remotion render src/index.ts VideoFlujos out/borrador.mp4 --codec=h264 --scale=0.5`
Expected: MP4 de 960×540 sin errores.

- [ ] **Step 4: Segunda revisión del usuario**

Entregar `out/borrador.mp4`. **Detenerse hasta recibir sus comentarios** y aplicar los cambios en `guion.json` o en la escena que corresponda.

- [ ] **Step 5: Commit**

```bash
git add docs/demos/video-flujos/src docs/demos/video-flujos/guion.json
git commit -m "feat(video): completa el cierre del video"
```

---

### Task 10: Video final y documentación

**Files:**
- Create: `docs/demos/video-flujos/README.md`

- [ ] **Step 1: Escribir `README.md`**

Requisitos, generación de voz, vista previa, render y cómo cambiar una frase. Incluye las condiciones de la licencia de Remotion y el riesgo de `edge-tts` de la spec §12.

- [ ] **Step 2: Comprobar CE-08 con un cambio real**

Cambiar una frase, ejecutar `generar_voz.py` y confirmar que solo se llama al servicio una vez. Probar `npm run fotogramas -- --escena inicio` antes de regenerar: debe fallar con `Voz desactualizada: <id>`. Devolver el texto y regenerar.

- [ ] **Step 3: Pasar toda la verificación**

Run: `npm run prueba && npm run tipos && .venv/Scripts/python -m unittest scripts/test_generar_voz.py`
Expected: todo pasa.

- [ ] **Step 4: Renderizar el video final**

Run: `npm run render`
Expected: `out/hespo-flujos.mp4`.

- [ ] **Step 5: Verificar CE-01**

Run: `npx remotion ffprobe out/hespo-flujos.mp4 -hide_banner -show_entries stream=codec_name,width,height,r_frame_rate:format=duration`
Expected: `h264`, 1920×1080, `30/1`, `aac` y duración entre 150 y 210 s.

- [ ] **Step 6: Confirmar el aislamiento**

Run: `git status --short` y `git diff --stat develop -- frontend backend services .github`
Expected: sin cambios fuera de `docs/`, y ningún MP3 ni MP4 en el índice.

- [ ] **Step 7: Tercera revisión del usuario**

Entregar `out/hespo-flujos.mp4` para validar voz, ritmo y resultado final.

- [ ] **Step 8: Commit**

```bash
git add docs/demos/video-flujos/README.md
git commit -m "docs(video): explica cómo regenerar el video de flujos"
```

---

## Cambio del 2026-11-04: Hespo interactúa con la página

Tras la primera revisión, el usuario eligió a Camila y pidió que Hespo interactúe con la página. Spec §4.1 y CE-09. Este bloque prevalece sobre Tasks 4, 6, 7 y 8 donde difieran. Task 6 se entrega al usuario para aprobar el estilo antes de seguir.

**Interfaces nuevas:**

```ts
// guion.ts: hespo gana y (por defecto SUELO_Y) y movimientos dentro de la frase
type Paso = { x: number; y?: number; pose: Pose };
hespo: Paso & { espera?: number; luego?: (Paso & { en: number })[] };
// recorrido.ts: el estado gana la altura de los pies
EstadoHespo = { x; y; mira; caminando; pose; articulaciones };
// src/pagina/: réplica, sin lógica de negocio
Ventana: React.FC<{ ruta: string; activo: string; pulsado?: string | null; aparicion: number; children }>;
Pulso: React.FC<{ x: number; y: number; progreso: number }>;
```

**Pruebas nuevas en `hespo.test.ts`:** sube a un elemento saltando, vuelve al suelo si la frase no indica `y`, salta sin cambiar de `x`, `luego` agrega un movimiento dentro de la frase. **En `guion.test.ts`:** `y` y `luego` dentro del recorrido y con poses existentes.

**Task 6, Step 1 reemplazado:** escena según spec §4.1, con `src/pagina/` (`Ventana`, `Pulso`, `Ilustracion`, `PaginaCatalogo`, `PaginaFicha`, `PaginaRegistro`). Después de Task 6: renderizar `out/muestra-especies.mp4` y detenerse hasta la aprobación del usuario.

**Tasks 7 y 8:** mismas piezas, con las pantallas de spec §4.1. `Estacion` deja de ser necesaria si las etiquetas de estado de la réplica muestran el avance.

## Cambio del 2026-11-04: el fondo es la pantalla real

El usuario pidió que el fondo sea la pantalla real de la web. Prevalece sobre el bloque anterior donde difiera: `src/pagina/PaginaCatalogo`, `PaginaFicha`, `PaginaRegistro`, `Ventana` e `Ilustracion` se retiran.

**Entorno:** `docker compose -p hespo-video --env-file <desechable>` con `db` y `backend`; frontend local en `http://localhost:3000`. No toca `.env`. Al terminar se elimina con `down --volumes`.

**Interfaces nuevas:**

```ts
// scripts/capturas.ts maneja la app real y escribe public/capturas/<id>.png
// y public/capturas/medidas.json: { [capturaId]: { [elemento]: { x, y, ancho, alto } } } en píxeles de video
// src/pagina/Pantalla.tsx
Pantalla: React.FC<{ captura: string; visible?: number }>;
```

La captura es de 1280×627 CSS a escala 1,5: 1920×940 de video. Los movimientos de Hespo en `guion.json` usan las medidas reales. Las pulsaciones siguen ancladas con `llegadaDe`.
