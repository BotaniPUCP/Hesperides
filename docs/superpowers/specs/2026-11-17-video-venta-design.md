# Diseño — Video de presentación de Hesperides para el cliente

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-17 |
| Alcance | Video de venta de 70 a 85 s, con Hespo en 3D, que presenta Hesperides a la Sección de Áreas Verdes de la PUCP |
| Audiencia | El jefe de la sección y, a través de él, su jefatura (OSG y DAF) |
| Entrega | Antes del fin de semana del 21-22 de noviembre de 2026 |
| Ubicación | `docs/demos/video-flujos/`, como tercera composición del mismo proyecto Remotion |
| Base | [Primer video](2026-11-04-video-flujos-design.md) y [segundo video](2026-11-12-video-planificacion-design.md): aquí solo va lo que cambia |
| Referencia | «How GitHub works» (GitHub, 3:32). Transcripción y fotogramas en `docs/demos/referencia/` |

## 1. Objetivo

Que el cliente quiera usar Hesperides. Los dos videos anteriores explican cómo se usa; este
explica **por qué vale la pena**: parte de un problema que el cliente ya vive y muestra, en tres
beneficios, cómo el sistema lo resuelve.

De la referencia se toma la forma de contar (una historia corta, cada concepto en una sola frase,
un cierre con lema), no su duración ni su técnica de actores grabados.

## 2. Criterios de éxito

| # | Criterio | Cómo se comprueba |
|---|----------|-------------------|
| CE-01 | El MP4 dura entre 70 y 85 s, en 1920×1080 a 30 fps, con video H.264 y audio AAC | `npx remotion ffprobe` sobre `out/hespo-venta.mp4` |
| CE-02 | Cada afirmación del guion tiene respaldo en código o en las entrevistas (sección 5) | Tabla 5.1 revisada |
| CE-03 | Hespo es el mismo modelo 3D en todas las escenas, nunca tapa subtítulos ni el elemento resaltado de la pantalla | Hoja de contacto de un cuadro por segundo |
| CE-04 | La boca de Hespo se mueve con la voz y está cerrada en los silencios | Revisión de 3 frases en el estudio |
| CE-05 | Los dos videos anteriores se siguen generando: sus pruebas pasan | `npm run prueba` |
| CE-06 | Cada captura nueva registra la rama y el commit de la que salió | `public/capturas/venta/origen.json` |
| CE-07 | Las capturas no muestran personas reales | Revisión de cada captura |

## 3. Enfoques considerados

| Enfoque | Qué es | Por qué sí o no |
|---------|--------|-----------------|
| **A. Hespo 3D en código** (elegido) | Hespo modelado con formas simples en `@remotion/three`, sobre el mismo proyecto | Mismo personaje en todas las tomas, sin costo, junto a las pantallas reales. Prueba aprobada por el equipo el 2026-11-17 (rama `spike/hespo-3d`) |
| B. Modelo 3D generado con IA (Tripo/Meshy) + Blender | Malla con texturas, esqueleto a mano | Más detalle, pero Hespo no es humanoide y el esqueleto requiere Blender; no cabe en el plazo |
| C. Video generado con IA (Higgsfield, Kling, Veo) | Clips de 8 a 15 s a partir de imágenes de Hespo | Inventa las pantallas del producto y no mantiene el personaje entre tomas. Open Higgsfield es solo una interfaz sobre APIs de pago, con copias de origen dudoso |
| D. Montaje de los videos existentes | Recortar y poner inicio y cierre | Sigue siendo un recorrido de funciones, no un video de venta |

## 4. Guion

Vive en `guion-venta.json`, con el formato de los guiones anteriores. Son unas 150 palabras: a
149 palabras por minuto (velocidad medida en el primer video) son unos 61 s de voz, unos 75 s con
pausas y escenas sin voz. Voz `es-PE-CamilaNeural`, la de siempre.

| Id | Tiempo aprox. | Frase | Hespo | En pantalla |
|----|---------------|-------|-------|-------------|
| v1 | 0–8 s | Cuarenta y una hectáreas de campus. Más de tres mil árboles. | Aún no aparece | Escena 3D: el campus visto desde arriba, árboles que brotan |
| v2 | 8–14 s | Y toda la información, repartida en hojas que no se hablan entre sí. | Aún no aparece | Escena 3D: hojas de cálculo que caen y se apilan desordenadas |
| v3 | 14–22 s | ¿Qué se podó? ¿Quién lo hizo? ¿Qué está atrasado? Hoy, la única forma de saberlo es recorrer el campus. | Camina entre los árboles, mira a los lados, se rasca la cabeza | Escena 3D: camino del campus |
| v4 | 22–28 s | ¡Hola! Soy Hespo. Y para eso existe Hesperides. | Salta, aterriza de frente y saluda | Fondo verde, suelo arena, título «Hesperides» |
| v5 | 28–40 s | Cada especie y cada árbol, con su ficha y su lugar en el mapa. Una sola información maestra, siempre al día. | Señala la pantalla | Captura: catálogo de especies → ejemplar en el mapa |
| v6 | 40–52 s | ¿Una rama caída? El capataz la cuenta en una frase desde el celular, y la inteligencia artificial completa el resto. | Señala el formulario; sorpresa cuando aparece lo prellenado | Captura: reporte nuevo → incidencia con tipo y sección prellenados |
| v7 | 52–58 s | Coordinación la revisa, la activa, y nada se pierde en el camino. | Asiente | Captura: incidencia activa en el tablero |
| v8 | 58–68 s | Las actividades se programan según su frecuencia: ustedes ven qué está atrasado, qué vence esta semana, y si choca con una reserva de jardín. | Señala cada parte | Captura: planificación (atrasados, vence en 7 días) y aviso de reserva |
| v9 | 68–73 s | Y cada trabajo, propio o tercerizado, queda registrado con su evidencia. | Pulgar arriba | Captura: intervención con fotos (ver 4.1) |
| v10 | 73–80 s | Hesperides. Sus áreas verdes: visibles, ordenadas y con seguimiento. ¡Nos vemos en el campus! | Salta y saluda | Captura del mapa con colores por zonas, luego logo |

Donde aparece «Hesperides», `textoVoz` dice «Hespérides», como en los videos anteriores.

### 4.1 Regla para la escena v9

Si al tomar las capturas la pantalla de una intervención con fotos de evidencia funciona en la
rama de captura (sección 8), v9 va como está. Si no, v9 usa el tablero de incidencias con una
incidencia **Cerrada** y la frase cambia a «Y cada incidencia se cierra solo cuando su trabajo
fue validado.» La decisión queda registrada en `origen.json`.

## 5. Reglas de contenido

Se heredan las reglas 5.2 y 5.3 del primer video, con un cambio decidido por el equipo el
2026-11-17: **se puede afirmar que el sistema usa inteligencia artificial** para completar el
reporte de una incidencia. Se sigue sin afirmar que existe una aplicación móvil, que funciona sin
conexión o que avisa por vencimiento. «Desde el celular» se refiere a la web abierta en el
teléfono. No se mencionan plazos de 24, 48 o 72 horas: el cliente no los confirmó.

### 5.1 Respaldo de cada afirmación

| Afirmación | Respaldo |
|------------|----------|
| 41 ha, más de 3.000 árboles | `docs/dominio/README.md` §1 |
| Información repartida en hojas sueltas | `docs/dominio/README.md` §8.1 |
| Hoy se sabe recorriendo el campus | `docs/entrevistas/03-cuestionario-tercera-reunion.md` B1 |
| Ficha de especie y ejemplar en el mapa | §5.1 del primer video |
| Reporte en una frase desde el celular | SPEC-201 (rama de captura), README «Incidencias de áreas verdes» |
| La IA completa tipo, sección y plan | `OllamaPrefillAgent.java`, `IncidentPrefillAgent.java` |
| Coordinación revisa y activa | SPEC-201, estados Reportada → En proceso → Cerrada |
| Atrasados, vence en 7 días, choque con reservas | §5.1 del segundo video |
| Trabajo con evidencia | SPEC-200, `InterventionDetail.tsx` (o la alternativa de 4.1) |
| «Visibles, ordenadas, con seguimiento» | Palabras del jefe de sección, `docs/dominio/README.md` §2.2 |

## 6. Hespo 3D

Parte de `src/hespo3d/PruebaHespo3D.tsx` (prueba aprobada) y se vuelve componente reutilizable
`Hespo3D` con estado por cuadro, como el Hespo 2D:

- **Forma**: la de la prueba. Se corrige que la hoja derecha sea la más grande, regla de marca.
- **Poses**: quieto, camina, saluda, señala (izquierda o derecha), sorpresa, asiente, pulgar,
  salta, confundido (se rasca la cabeza). Cada pose es una función de articulaciones por cuadro.
- **Boca**: la apertura sale de la voz con la misma lógica de `useApertura` y `boca.ts`.
- **Sobre capturas**: el lienzo 3D es transparente y se dibuja encima de `Pantalla`; Hespo se
  para sobre la banda de subtítulos, como el Hespo 2D (`SUELO_PAGINA`). Lleva sombra propia
  suave para no verse pegado.

## 7. Escenas 3D (v1 a v4)

Hechas con formas simples en el mismo estilo de la prueba (colores de `tema.ts`, contorno oscuro):

- **Campus desde arriba** (v1): suelo arena, caminos, árboles de copa redonda que brotan con
  rebote. Un contador «41 ha» y «+3 000 árboles» aparece en tarjetas.
- **Hojas sueltas** (v2): rectángulos blancos con cuadrícula verde que caen, se apilan torcidos.
- **Camino del campus** (v3): Hespo camina; la cámara lo sigue de lado.
- **Presentación** (v4): el fondo verde y el suelo arena de la prueba, con el título.

## 8. Capturas

- **Reutilizadas** de `public/capturas/` y `public/capturas/planificacion/`: catálogo, ejemplar,
  planificación y reservas (v5, v8).
- **Nuevas**, de la rama `feature/spec-112-colores-por-zonas` (es la que tiene el agente de IA,
  el mapa por zonas e intervenciones): reporte nuevo, incidencia prellenada, tablero, intervención
  con evidencia y mapa con colores (v6, v7, v9, v10). Se toman con el método de los videos
  anteriores, contra una base recién creada, en `public/capturas/venta/`.
- El prellenado de IA necesita `OLLAMA_API_KEY` en el entorno desechable. Sin clave, la captura
  de v6 se toma del formulario de coordinación completado a mano, y v6 no cambia de frase.

## 8.1 Decisiones del constructor

Tomadas el 2026-11-17 tras la revisión del diseño; el equipo puede corregirlas:

- **v6 en celular**: la captura del reporte se toma con ventana de teléfono (390×844) y se
  muestra dentro de un marco de celular centrado; Hespo va a un lado. v7 vuelve a la pantalla de
  escritorio.
- **Logo**: no hay marca oficial en el repositorio. v4 y v10 usan el nombre «Hesperides» con la
  tipografía de los videos (Nunito) junto a Hespo. Si el equipo entrega un logo, se reemplaza.
- **Rama**: el trabajo sigue en `docs/video-venta` (antes `spike/hespo-3d`). La composición
  `PruebaHespo3D` se retira al final. Las capturas y voces existentes se copian de la copia local
  (no se versionan).
- **IA en el guion**: la excepción vale solo para `guion-venta.json`; las reglas compartidas de
  los otros dos guiones no cambian.
- **Hojas de Hespo**: la más grande va a la derecha de quien mira, como en el Hespo 2D.

## 9. Verificación

1. `npm run tipos` y `npm run prueba`.
2. Hoja de contacto de un cuadro por segundo del MP4 (CE-03).
3. `npx remotion ffprobe` (CE-01).
4. El equipo ve el video completo antes de presentarlo.

## 10. Fuera de alcance

- Música de fondo. Se puede agregar luego si el equipo trae una pista con licencia.
- Versión en inglés y versión vertical para redes.
- Tomas generadas con IA (enfoque C), salvo que el equipo lo pida después.

## 11. Riesgos

| Riesgo | Plan |
|--------|------|
| El plazo (fin de semana) | Orden de trabajo: guion y voz → Hespo 3D con poses → capturas → escenas 3D. Si falta tiempo, v1-v3 pasan a escenas 3D más simples (fondo verde con iconos), sin tocar el resto |
| La rama de captura cambia antes de la presentación | Se registra el commit en `origin.json` |
| El agente de IA falla al capturar | Alternativa de la sección 8 |
