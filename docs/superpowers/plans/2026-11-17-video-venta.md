# Video de venta con Hespo 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tercera composición `VideoVenta` (70-85 s) en `docs/demos/video-flujos/`, con Hespo en 3D sobre escenas 3D y capturas reales.

**Architecture:** Se reutiliza `VideoBase`, `construirLinea`, `estadoHespo`, `useApertura` y `Subtitulos`. Hespo 3D lee el mismo `EstadoHespo` que el 2D y se dibuja en un `ThreeCanvas` transparente de pantalla completa con cámara ortográfica en píxeles; `ConfigVideo` gana `hespo: '2d' | '3d'`. Las escenas nuevas son componentes `React.FC<PropsEscena>` como las existentes.

**Tech Stack:** Remotion 4.0.540, `@remotion/three` 4.0.540, three 0.171, @react-three/fiber 9.1.2, vitest, edge-tts (`scripts/generar_voz.py`), playwright-core.

**Spec:** `docs/superpowers/specs/2026-11-17-video-venta-design.md`

Todas las rutas son relativas a `docs/demos/video-flujos/` salvo que se diga otra cosa.

## Global Constraints

- 1920×1080, 30 fps, H.264 + AAC; duración 70-85 s.
- Voz `es-PE-CamilaNeural`; «Hesperides» se pronuncia con `textoVoz` «Hespérides».
- Colores solo de `src/tema.ts`. Tipografía de `src/ui/fuente.ts`.
- «inteligencia artificial» permitida solo en `guion-venta.json`; las reglas de los otros dos guiones no cambian.
- No afirmar app móvil, sin conexión, avisos por vencimiento ni plazos 24/48/72 h.
- Hespo nunca tapa subtítulos ni el elemento resaltado.
- Render con `--gl=angle` (también en `remotion.config.ts`).
- Los dos videos anteriores siguen pasando `npm run prueba`.

## Review Focus

- Silencios entre frases: la boca 3D debe quedar cerrada (apertura 0) → prueba en Task 3.
- Hespo 3D fuera de cuadro (x = ENTRADA_X = -220) no debe dibujar artefactos en el borde → prueba en Task 3 (transformación con x negativa).
- Escena sin captura medida (falta `medidas.json` de venta) debe fallar con mensaje que nombre el comando → Task 6, `calcularVenta`.
- Guion editado que supere 85 s → prueba de palabras en Task 1.
- Cambio de escena: Hespo 3D debe desvanecerse con la escena (misma opacidad) → Task 3, se monta dentro del `AbsoluteFill` con opacidad.

---

### Task 1: Guion de venta y reglas

**Files:**
- Create: `guion-venta.json`, `src/guion-venta.test.ts`
- Modify: `src/guion.ts` (EscenaId, POSES, export `guionVenta`), `src/reglasDeGuion.ts` (parámetro `permitidas`), `src/hespo/recorrido.ts` (SUELO de escenas nuevas), `src/hespo/poses.ts` (pose `confundido`)

**Interfaces:**
- Produces: `guionVenta: Guion`; EscenaId nuevas `'problema' | 'presentacion' | 'informacion' | 'reporte' | 'seguimiento' | 'final'`; Pose nueva `'confundido'`; `probarReglasComunes(nombre, guion, permitidas?: string[])`.

- [ ] **Step 1:** Test `src/guion-venta.test.ts`: `probarReglasComunes('guion de venta', guionVenta, ['inteligencia artificial'])`; ids exactamente `v1`…`v10` en escenas `problema`(v1-v3), `presentacion`(v4), `informacion`(v5), `reporte`(v6-v7), `seguimiento`(v8-v9), `final`(v10); total de palabras de `texto` entre 140 y 170; `v6.texto` contiene «inteligencia artificial»; ningún texto contiene «24», «48» ni «72»; v4 y v10 tienen `textoVoz` con «Hespérides».
- [ ] **Step 2:** `npx vitest run src/guion-venta.test.ts` → FAIL (no existe `guionVenta`).
- [ ] **Step 3:** Escribir `guion-venta.json` con las frases v1-v10 tal cual la tabla §4 del spec (voz `es-PE-CamilaNeural`). Poses por frase: v1-v2 `quieto` con x=-220 (fuera de cuadro), v3 `confundido` x=960 con `luego` caminando, v4 `saluda`, v5 `senala`, v6 `senala`→`sorpresa`, v7 `asiente`, v8 `senala`, v9 `pulgar`, v10 `salta`→`saluda`. Agregar `confundido: { brazoI: 0, brazoD: -150, inclina: 8, mirada: -6, piernaI: 0, piernaD: 0, saltoY: 0 }` a `POSES_HESPO`; SUELO: `problema`, `presentacion`, `final` → `SUELO_Y`; el resto → `SUELO_PAGINA`. `probarReglasComunes` filtra `PROMESAS` con `permitidas`.
- [ ] **Step 4:** `npm run prueba` → PASS (incluye los guiones anteriores).
- [ ] **Step 5:** Commit `feat(video): guion del video de venta`.

### Task 2: Voz

**Files:** genera `public/voz/venta/*.mp3` y `manifiesto.json` (no versionados).

- [ ] **Step 1:** `.venv/Scripts/python scripts/generar_voz.py --guion guion-venta.json --salida public/voz/venta` (crear el venv con `scripts/requirements.txt` si falta).
- [ ] **Step 2:** Verificar suma de `duracion` del manifiesto entre 55 y 72 s; si no, ajustar frases (Task 1) y regenerar.

### Task 3: Hespo 3D sobre cualquier escena

**Files:**
- Create: `src/hespo3d/Hespo3D.tsx` (modelo, a partir de `PruebaHespo3D.tsx`), `src/hespo3d/transformacion.ts`, `src/hespo3d/transformacion.test.ts`, `src/hespo3d/HespoEnEscena3D.tsx`
- Modify: `src/escenas/componentes.ts` (`hespo?: '2d' | '3d'`), `src/VideoBase.tsx`

**Interfaces:**
- Consumes: `EstadoHespo` (`recorrido.ts`), `Articulaciones` (grados, convención del Hespo 2D: brazoD negativo = arriba).
- Produces: `transformacion3D(estado: EstadoHespo, escala: number): { x: number; y: number; giroY: number; escalaPx: number; brazoI: number; brazoD: number; piernaI: number; piernaD: number; inclina: number }` en píxeles de la cámara ortográfica (origen arriba-izquierda, y hacia abajo invertida) y radianes; `<HespoEnEscena3D estado frame apertura escala />`.

- [ ] **Step 1:** Tests en `transformacion.test.ts`: con estado en x=960, y=880, mira=1, escala 1 → `{x: 960, y: -880}` y `giroY` 0; mira=-1 → `giroY` = π; `brazoD: -100` → `brazoD` ≈ 100·π/180 (signo invertido: arriba positivo en 3D); `escalaPx` = 0,8·380/2,9·escala ≈ 104,8·escala (el Hespo 2D mide 304 px de pies a punta de hoja a escala 1; el modelo 3D mide 2,9 unidades); x=-220 → x=-220 (sin recorte).
- [ ] **Step 2:** `npx vitest run src/hespo3d` → FAIL.
- [ ] **Step 3:** Implementar `transformacion3D`; mover el modelo de `PruebaHespo3D` a `Hespo3D.tsx` con props `{ t: Transformacion3D; frame: number; apertura: number }`, hoja grande a la derecha de quien mira. `HespoEnEscena3D`: `ThreeCanvas` 1920×1080 transparente, `orthographic`, `camera={{ zoom: 1, position: [960, -540, 1000] }}`, luces de la prueba, sombra sobre un plano invisible con `shadowMaterial` en y = -pies.
- [ ] **Step 4:** `VideoBase` usa `HespoEnEscena3D` cuando `config.hespo === '3d'`, dentro del mismo `AbsoluteFill` con opacidad. `npm run prueba && npm run tipos` → PASS.
- [ ] **Step 5:** Commit `feat(video): Hespo 3D sigue el mismo recorrido que el 2D`.

### Task 4: Escenas 3D del problema y la presentación

**Files:** Create `src/escenas/venta/Problema.tsx`, `src/escenas/venta/Presentacion.tsx`, `src/escenas/venta/Final.tsx`, `src/escenas/venta/campus3d.tsx` (árboles, caminos, hojas de cálculo).

**Interfaces:** `React.FC<PropsEscena>`; usan `apareceEn(escena, id, frame, fraccion)` de `src/ui/anim.ts`.

- [ ] **Step 1:** `Problema`: v1 campus desde arriba con árboles que brotan con `spring` escalonado y tarjetas «41 ha» y «+3 000 árboles» (`Tarjeta`); v2 hojas blancas con cuadrícula verde que caen y se apilan torcidas; v3 la cámara baja a nivel del camino.
- [ ] **Step 2:** `Presentacion`: fondo verde/arena de la prueba y título «Hesperides» (Nunito 800, 120 px). `Final`: captura del mapa por zonas (Task 6) que se desvanece al título «Hesperides» con el lema «Sus áreas verdes: visibles, ordenadas y con seguimiento.»
- [ ] **Step 3:** `npx remotion still` de un cuadro por frase de cada escena; revisar a ojo.
- [ ] **Step 4:** Commit `feat(video): escenas 3D del video de venta`.

### Task 5: Capturas de venta

**Files:** Create `scripts/capturas-venta.ts` (reutiliza `src/escenas/planificacion/comun.ts` → `navegador.ts`: `BASE`, `CLAVE_DEMO`, `Capturar`), `public/capturas/venta/` (no versionado). Modify `package.json` (`"capturas:venta": "tsx scripts/capturas-venta.ts"`).

- [ ] **Step 1:** Levantar la app desde un worktree de `feature/spec-112-colores-por-zonas` con el método del README de este proyecto (entorno desechable, `OLLAMA_API_KEY` si está disponible).
- [ ] **Step 2:** Capturar con medidas: `reporte-celular` (ventana 390×844, formulario «cuéntalo con tus palabras» lleno con «Rama caída en la puerta principal»), `incidencia-prellenada` (escritorio, campos prellenados medidos), `incidencias-tablero`, `intervencion-evidencia` (o `incidencia-cerrada`, regla §4.1), `mapa-zonas`. `origen.json` con rama, commit y si v9 usó la alternativa.
- [ ] **Step 3:** Revisar cada PNG: sin personas reales.
- [ ] **Step 4:** Commit del script.

### Task 6: Escenas de pantalla y composición

**Files:** Create `src/escenas/venta/Informacion.tsx`, `Reporte.tsx` (marco de celular para v6), `Seguimiento.tsx`, `src/VideoVenta.tsx`. Modify `src/Root.tsx` (registrar `VideoVenta` con `calcularVenta`, quitar `PruebaHespo3D`), `package.json` (`"render:venta": "remotion render src/index.ts VideoVenta out/hespo-venta.mp4 --codec=h264 --gl=angle"`). Delete `src/hespo3d/PruebaHespo3D.tsx`.

**Interfaces:** `CARPETA_VOZ = 'voz/venta'`, `CARPETA_CAPTURAS = 'capturas/venta'`; `ConfigVideo` con `hespo: '3d'` y escalas `{ problema: 1, presentacion: 1, final: 1, informacion: 0.6, reporte: 0.6, seguimiento: 0.6 }`. `calcularVenta` sigue el patrón de `calcularPlanificacion` (error con el comando si falta manifiesto o medidas).

- [ ] **Step 1:** `Informacion` con `catalogo.png` → `ejemplar.png` (capturas del primer video) y `Resalte`; `Reporte` con marco de celular centrado (rect redondeado `COLOR.borde`, 430×900) y luego `incidencia-prellenada`/`incidencias-tablero`; `Seguimiento` con `planificacion/planificacion-lista.png`, `planificacion/intervencion-aviso-reserva.png` y `venta/intervencion-evidencia.png`.
- [ ] **Step 2:** `npm run tipos && npm run prueba` → PASS.
- [ ] **Step 3:** `npm run render:venta`.
- [ ] **Step 4:** Commit `feat(video): composición del video de venta`.

### Task 7: Verificación final

- [ ] **Step 1:** `npx remotion ffprobe out/hespo-venta.mp4` → 70-85 s, 1920×1080, h264 + aac.
- [ ] **Step 2:** Hoja de contacto a 1 cuadro/s; revisar CE-03 y CE-04.
- [ ] **Step 3:** `npm run prueba` (CE-05).
- [ ] **Step 4:** Copiar el MP4 a la copia principal `docs/demos/video-flujos/out/`, push de la rama.
