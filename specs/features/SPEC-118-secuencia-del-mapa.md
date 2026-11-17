# SPEC-118 — Secuencia de acercamiento del mapa (de poca a buena calidad)

| Campo | Valor |
|-------|-------|
| HU relacionada | — (pieza de presentación del mapa 3D) |
| Autor | Jean Piero David Morán |
| Plataforma | Web, escritorio (no se ofrece en móvil) |
| Sprint | — |
| Dependencias | SPEC-102 (visor), SPEC-112 (Atardecer realista y colores reales) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> Mientras la feature no esté implementada, este spec es la fuente de verdad y el detalle se
> escribe literal. Al cerrarla, el detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Reproducir dentro de la app una toma de 12 s en la que la cámara se acerca al campus. Durante
los primeros 5 s el mapa se ve de «poca calidad»: pixelado, plano y con árboles simples. En el
segundo 5, un desenfoque breve esconde el cambio y el mapa aparece con el Atardecer realista.
Jean Piero la graba en pantalla y la exporta a MP4 por su cuenta.

La idea viene del piloto de una serie animada: un mundo 3D de baja calidad que «despierta» a
uno bien renderizado. Tomamos la técnica, no su contenido.

## 2. Alcance

- **Sí:** un modo secuencia en el visor web, una trayectoria fija de cámara y la transición.
- **No:** grabar ni exportar video (lo hace el usuario), editar la trayectoria desde la UI,
  móvil y Android, ni cambios en el backend.
- **Anti-objetivo:** que el cambio se note como un corte o como un efecto deliberado. Si se
  ve el salto de un modo a otro, o la cámara se traba en el cambio, la secuencia fracasó aunque
  funcione.

## 3. Cómo se entra

- Ruta `/secuencia`, solo para usuarios con sesión. No aparece en ningún menú. Va fuera del panel
  (como `/embed/mapa`): dentro de `/mapa` la barra lateral impediría la pantalla completa.
- Al entrar se ocultan la barra, la búsqueda, la ficha, los globos, las etiquetas y los
  marcadores (lo que hoy hace `setCaptureMode`), y el visor ocupa toda la pantalla.
- Durante la preparación (§6.4) se muestra un velo oscuro con «Preparando…» y después «Pulsa
  espacio para empezar». Así el usuario arranca la grabación antes de que corra la toma.
- Espacio arranca y, al terminar, vuelve a arrancar desde cero. Esc sale a `/mapa`.
- Al terminar, el último cuadro queda quieto: sin controles ni movimiento.

## 4. Cronología (12 s)

| Tiempo | Qué se ve |
|---|---|
| 0,0–5,0 s | Versión de poca calidad; la cámara se acerca |
| 5,0–5,6 s | Transición (§5.3) |
| 5,6–12,0 s | Atardecer realista a las 15:00; la cámara frena hasta detenerse en la pose final |

La cámara no se detiene durante la transición: el movimiento continuo hace que se lea como un
solo plano.

## 5. Las dos versiones y el cambio

### 5.1 Poca calidad

- El mapa normal (sin Atardecer), con las copas facetadas que dibuja `vegetation.ts` cuando
  `setGolden(false)`. Esos son los «árboles simplificados»: no se modela nada nuevo.
- Sin sombras.
- Pixelado: el lienzo se dibuja a un cuarto de su resolución (`setPixelRatio`) y el navegador
  lo amplía sin suavizar (`image-rendering: pixelated`).

### 5.2 Buena calidad

- El Atardecer de SPEC-112 a la hora más temprana del deslizador: `SUNSET_HOURS[0]` (15:00).
- Resolución normal de la pantalla y sombras en cascada, como en el modo Atardecer de siempre.

### 5.3 Transición (0,6 s, empieza en 5,0 s)

| Tramo | Duración | Qué pasa |
|---|---|---|
| Sube el desenfoque | 0,25 s | Desenfoque de 0 a 8 px; brillo de 100 % a 104 % |
| Cambio | 0,10 s | Se congela el último cuadro malo en una capa encima; abajo se pasa a la buena calidad y la capa congelada se desvanece |
| Baja el desenfoque | 0,25 s | Desenfoque de 8 a 0 px; brillo de 104 % a 100 % |

- Todas las curvas son suaves (*ease-in-out*), nunca lineales.
- El desenfoque y el brillo se aplican como filtros CSS al contenedor del lienzo y a la capa
  congelada. El contenedor recorta lo que se sale y escala 1,03 durante el desenfoque, para que
  los bordes no se vean oscuros.

## 6. Decisiones

| ID | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-01 | Trayectoria: curva limpia nueva entre el inicio y el final de la grabación de referencia | Se siente como un plano de cine; el segundo 5 cae en un tramo tranquilo | Repetir la grabación acelerada ~3×: sus giros finales se verían bruscos (elegido por Jean Piero) |
| D-02 | Cambio en un solo cuadro, oculto por el desenfoque | Dibujar las dos versiones a la vez obliga a alternar el Atardecer en cada cuadro, que es caro | Mezclar en vivo las dos versiones con un shader |
| D-03 | Desenfoque, brillo y pixelado en CSS, fuera de three.js | No toca el compositor del Atardecer (`sunset.ts`) y es barato | Un pase de posprocesado propio |
| D-04 | El reloj de la secuencia avanza con la hora real, pero nunca más de 1/30 s por cuadro | Si un cuadro tarda (el cambio recompila shaders y vuelve a calcular el reflejo del cielo), la cámara no da un salto; solo dura un instante más la capa congelada | Reloj de pared sin tope: un tirón en el cambio se vería en la grabación. 1/60 fijo por cuadro: en pantallas de 120 Hz iría al doble |
| D-05 | Al pasar a buena calidad no se usa `setSunset` del visor tal cual | `setSunset(true)` vuela a la toma del Atardecer (`sunsetPose`) y movería la cámara. Se aplica el tema sin ese vuelo | — |
| D-06 | La cámara va libre (`rig.setFree(true)`) y sin límites de órbita durante la secuencia | La pose final está a ~38 m y casi horizontal, fuera de los límites de la órbita normal | — |

### 6.1 Poses (escena en metros: x este, y arriba, z sur; FOV 38°)

Tomadas de la grabación de referencia `perspectiva-2026-11-17-113634.json` (primera y última
muestra):

| | Posición | Mira a |
|---|---|---|
| Inicio | `[-76.463, 304.492, 1330.868]` | `[-16.72, 22, 229.821]` |
| Final | `[0.666, 37.962, 256.692]` | `[-16.952, 27.439, 170.911]` |

### 6.2 Trayectoria

- La posición sigue una curva cúbica (Bézier) del inicio al final. Sus puntos de control hacen
  que baje sobre todo en la segunda mitad: primero avanza, luego desciende y frena.
- El punto al que mira se interpola aparte, con la misma curva de tiempo.
- La curva de tiempo arranca a velocidad media (no desde cero: la toma empieza en movimiento) y
  llega a velocidad cero en 12 s.
- Sin balanceo ni temblor de cámara.

### 6.3 Archivos

Carpeta nueva `frontend/src/components/map3d/sequence/`, cada archivo con una sola tarea:

- trayectoria: dado `t` en segundos, devuelve la posición y el punto mirado (función pura);
- cronología: dado `t`, devuelve la versión, el desenfoque, el brillo y la opacidad de la capa
  congelada (función pura);
- reproductor: avanza el reloj por cuadro y aplica pose y efectos al visor;
- la pantalla que monta el visor en modo secuencia y atiende Espacio y Esc.

El visor expone lo mínimo: mover la cámara a una pose sin vuelo, cambiar de versión sin mover
la cámara, el ajuste de resolución y capturar el cuadro actual (como hace `snapshot`).

### 6.4 Preparación

Antes de habilitar Espacio, la pantalla prende una vez la buena calidad bajo el velo, dibuja un
cuadro y vuelve a la poca calidad. Eso compila los shaders de ambas versiones y carga la ciudad
y las nubes del Atardecer. Así el cambio en el segundo 5 no espera a la red ni compila todo
desde cero.

## 7. Criterios de aceptación

- **CA-01** `/secuencia` oculta toda la interfaz del mapa y, tras la preparación, espera
  Espacio.
- **CA-02** La toma dura 12 s ± 1 cuadro a 60 fps, empieza en la pose de inicio y termina en la
  pose final de §6.1.
- **CA-03** Hasta los 5,0 s se ve pixelado, sin sombras y con copas facetadas; desde los 5,6 s,
  el Atardecer a las 15:00 a resolución completa.
- **CA-04** La transición dura 0,6 s, no muestra ningún salto de cámara ni bordes oscuros, y a
  la vista no se distingue el cuadro del cambio.
- **CA-05** Esc vuelve al mapa normal con su interfaz y sus límites de cámara de siempre.
- **CA-06** Las funciones de trayectoria y cronología tienen pruebas unitarias: extremos
  (t = 0, t = 12, t < 0, t > 12), los bordes de cada tramo y la continuidad de la pose.
- **CA-07** Verificado en un navegador real de escritorio (INV-10).

## 8. Exportación a MP4 (añadido el 17 nov 2026)

El equipo de Jean Piero no dibuja el Atardecer en tiempo real, así que grabar la pantalla da un
video a tirones. La pantalla exporta la toma **cuadro a cuadro**: el reloj ya no es real, cada
cuadro se dibuja el tiempo que haga falta y lleva su marca de tiempo exacta.

- En `/secuencia`, cuando pide Espacio, **E** exporta. El velo muestra el avance («Exportando…
  37 %») y Esc cancela. Al terminar se descarga `secuencia-mapa.mp4` y la pantalla vuelve a pedir
  Espacio o E.
- **1920×1080, 60 fps, H.264 en MP4**: 721 cuadros, de t = 0 a t = 12 s. La resolución no depende
  de la ventana.
- Los efectos de §5.3 (desenfoque, brillo, escala y cuadro congelado) se dibujan en un canvas 2D
  por cuadro. Los filtros CSS no quedan en el video.
- Mientras exporta, el bucle de dibujo del visor se pausa: cada cuadro se dibuja una sola vez.
- Sin WebCodecs con H.264 (navegador sin soporte), la exportación falla al inicio con un mensaje
  en español; no se dibuja ningún cuadro.

| ID | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-07 | Mediabunny 1.64.0 (MPL-2.0, sin cambios a sus archivos) empaqueta el MP4 y maneja WebCodecs; se importa solo al exportar | Un `.h264` crudo no se abre en Windows; `mp4-muxer` está obsoleta y su autor la reemplazó por Mediabunny | WebM con `MediaRecorder` (graba en tiempo real: con un equipo lento sale a tirones); PNG + ffmpeg (no está instalado) |

- **CA-08** E descarga un MP4 de 12 s a 1920×1080 que se abre con doble clic en Windows, con la
  transición en el segundo 5 y sin tirones, aunque el equipo dibuje a menos de 60 fps.

## 9. El logo de Hespérides (añadido el 17 nov 2026)

Imágenes en `frontend/public/secuencia/`: `hesperides-pixelado.png` y `hesperides-original.png`
(1080×1080 con fondo transparente; la hoja ocupa ~965 px de ancho). La pixelada es otro dibujo,
no solo la original pixelada: el cambio queda oculto porque el logo todavía gira y está
desenfocado.

| Tiempo | Qué hace el logo |
|---|---|
| < 2,0 s | No se ve |
| 2,0 → 4,0 s | Aparece centrado en horizontal, con su centro a 15 % del borde superior y al 15 % de su tamaño. Baja al centro, crece al 100 % y gira **1 vuelta** en sentido horario que va frenando. Los primeros 0,3 s pasa de transparente a opaco |
| 4,0 → 6,0 s | Queda en pantalla a tamaño completo, sin girar, y se desliza suave del centro a (35 %, 35 %) del cuadro, hacia arriba a la izquierda |
| 5,25 s | Cambia de la imagen pixelada a la original, junto con el mapa y bajo el mismo desenfoque |
| ≥ 6,0 s | Queda anclado en el espacio a **300 m**, donde estaba en pantalla. La cámara lo pasa por su derecha: tapa como máximo ~30 % de la pantalla y sale por arriba a la izquierda hacia los 10,3 s |

- Al 100 %, la hoja ocupa el **40 %** del ancho del cuadro. Anclado, su tamaño en pantalla es el
  de un cartel de ~150 m de ancho a esa distancia.
- Se ancla fuera del centro a propósito (D-09): centrado, la cámara avanza casi directo hacia él y lo
  pasa tan cerca que llena la pantalla; anclado más lejos, nunca lo pasa y termina bajo el campus.
- Se dibuja siempre de frente a la cámara y encima del mapa (D-08). La pixelada va sin suavizar y la
  original, suavizada. Lleva el mismo desenfoque, brillo y escala de §5.3, en vivo y en el MP4.

| ID | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-08 | El logo anclado se dibuja en 2D, de frente, con la posición y el tamaño que tendría en el espacio | Conserva sus colores (el Atardecer gradúa todo lo que está en la escena) y siempre se ve completo | Un cartel dentro de la escena 3D: se inclinaría al pasarlo, pero la bruma y la gradación le cambian los colores y los edificios pueden taparlo |

| D-09 | Antes de anclarse se desliza a (35 %, 35 %) y se ancla a 300 m (elegido por Jean Piero el 17 nov 2026) | Así la cámara lo pasa de lado tapando ~30 % de la pantalla | Anclarlo en el centro y desvanecerlo al llegar al 45 % del ancho: no se vería pasar al lado |

- **CA-09** El logo aparece a los 2 s, gira una vuelta y llega al centro a los 4 s, se desliza hasta los 6 s,
  cambia de imagen a los 5,25 s sin que se note y desde los 6 s queda fijo en el espacio hasta salir
  por un costado, sin tapar nunca más de un tercio de la pantalla.

### 9.1 El logo se va con el desenfoque (17 nov 2026)

La tabla de §9 es la **coreografía original**. La secuencia la reproduce comprimida para que el logo
se vaya justo cuando ocurre el desenfoque:

| Tiempo de la secuencia | Tiempo de la coreografía | Velocidad |
|---|---|---|
| 2,0 → 4,0 s | 2,0 → 6,4 s | 2,2× (cae de 2,0 a 2,9 s, se desliza hasta 3,8 s y ahí se ancla) |
| 4,0 → 5,0 s | 6,4 → 8,0 s | Baja en línea recta de 2,2× a 1×, sin frenazo |
| 5,0 → 6,0 s | 8,0 → 9,0 s | 1×: exactamente lo que la coreografía muestra de 8 a 9 s |
| ≥ 6,0 s | — | No se ve |

- El cambio de imagen sigue en el segundo 5,25 de la secuencia, con el mapa.
- A los 9 s de la coreografía la hoja todavía tapa ~30 % de la esquina superior izquierda (sale del
  todo hacia los 10,3 s). Para que no desaparezca de golpe, se desvanece de 5,7 a 6,0 s, ya pasado
  el desenfoque (D-10).
- Sigue siendo 1 vuelta en la caída, que ahora dura ~0,9 s.

| ID | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-10 | Coreografía comprimida (opción A, elegida por Jean Piero) y desvanecimiento de 0,3 s al final | Se va con el desenfoque sin cortarse de golpe | Adelantar toda la animación 3 s (empezaría a media caída); comprimir solo 4-8 s a 4× (se vería apurado) |

- **CA-10** El logo se ve de 2 a 6 s; de 5 a 6 s se ve igual que de 8 a 9 s de la coreografía y a los 6 s ya
  no está.

### 9.2 Aparece en transparencia desde el inicio (17 nov 2026)

Reemplaza la caída girando de §9 y §9.1. Lo demás de §9.1 sigue igual.

| Tiempo de la secuencia | Qué hace el logo |
|---|---|
| 0,0 → 2,9 s | Aparece quieto en el centro, sin girar: la opacidad sube de 0 a 100 % entre 0 y 2,5 s (arranca lento) y el tamaño "respira" de 92 % a 100 % hasta los 2,9 s |
| 2,9 → 6,0 s | Igual que §9.1: se desliza, se ancla, cambia de imagen a los 5,25 s y se va con el desenfoque |

| ID | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-11 | Aparición en transparencia con un leve crecimiento (opción B, elegida por Jean Piero) | Sutil, con algo de vida, y no compite con el desenfoque del segundo 5 | Quieto sin crecer (A); enfocándose desde un desenfoque (C: repite el recurso del segundo 5); marca de agua al 30 % (D) |

- **CA-11** En el primer cuadro el logo está en el centro y transparente; a los 2,5 s es opaco y nunca gira.
