# Diseño — Video de venta contado como historia (Don Julio y Hespo Semilla)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-18 |
| Reemplaza | La forma de contar de [2026-11-17-video-venta-design.md](2026-11-17-video-venta-design.md); se mantienen sus reglas de contenido (§5) |
| Audiencia | Jefe de la Sección de Áreas Verdes PUCP y su jefatura (OSG, DAF) |
| Entrega | Fin de semana del 21-22 de noviembre de 2026 |
| Duración | 80 a 100 s, 1920×1080, 30 fps |

## 1. Decisiones del equipo (2026-11-17/18)

- Más historia que pantallas: el producto aparece en 3 o 4 vistazos dentro de las escenas.
- Personajes humanos dibujados: **Don Julio** (capataz ficticio, 30 años de oficio) y **el jefe** (sin nombre, no
  representa a ninguna persona real), más una cuadrilla.
- Hespo en 2D, diseño **«2 · Semilla»** (`DISENOS[1]`), con la animación por resortes, cuerpo blando, hojas-oreja y
  emociones de la prueba `spike/hespo-2d`. No se usan las variantes con estilo de la imagen de stock.
- Se puede decir «inteligencia artificial». No: app móvil, sin conexión, avisos por vencimiento, plazos 24/48/72 h,
  nombres de marcas (WhatsApp, Excel): se dice «un mensaje», «hojas de cálculo».

## 2. Guion (`guion-historia.json`, voz es-PE-CamilaNeural)

| Id | Escena | Frase | Imagen |
|----|--------|-------|--------|
| h1 | mañana | Seis de la mañana en el campus. Don Julio lleva treinta años cuidando estos jardines. | Amanecer, campus ilustrado; Don Julio camina por un sendero |
| h2 | mañana | Hoy encuentra una rama rajada justo encima de un sendero por donde pasa mucha gente. | Árbol grande, rama con grieta que se mece; peatones pasan debajo |
| h3 | hoy | Avisa como siempre: un mensaje y una foto, que se pierden entre cientos de mensajes. | Celular con burbujas de chat genéricas que suben y lo tapan |
| h4 | hoy | En la oficina, el jefe solo se entera si sale a recorrer el campus. | Oficina: el jefe entre pilas de hojas de cálculo |
| h5 | hoy | Y cuando la empresa tercerizada poda quince árboles, nadie sabe si quedaron bien. | Cuadrilla tercerizada podando; signos de pregunta sobre los árboles |
| h6 | aparece | ¡Hola! Soy Hespo. ¿Y si todo eso quedara en un solo lugar? | Hespo brota del suelo junto a Don Julio |
| h7 | solución | Don Julio lo cuenta en una frase desde su celular. | Mano con celular: captura real `venta/reporte-celular` |
| h8 | solución | La inteligencia artificial completa el resto, y el jefe lo revisa al instante. | Laptop del jefe: captura real `venta/incidencia-prellenada` |
| h9 | solución | Lo activa, aparece en el mapa, y se programa el trabajo de la cuadrilla. | Captura real `venta/mapa-zonas` con un punto que late |
| h10 | solución | La cuadrilla registra el trabajo con su foto y, validado, la incidencia se cierra. | Cuadrilla corta la rama, foto con destello, sello «Cerrada» |
| h11 | resultado | Ahora todo el campus está a la vista: ordenado, visible y con seguimiento. | El jefe presenta a su jefatura; el campus se llena de verde |
| h12 | resultado | Hesperides. El cuidado de sus áreas verdes, en un solo lugar. | Título, lema, Don Julio, el jefe y Hespo saludan |

«Hesperides» se pronuncia «Hespérides» (`textoVoz`). Respaldo: 30 años de oficio y 10-15 árboles al día
(`docs/dominio/README.md` §3, §3.2), mensajes que se pierden y recorrer el campus (entrevistas B1), IA
(`OllamaPrefillAgent`), activar y mapa (SPEC-201, README), cierre con intervención validada (SPEC-201).

## 3. Arquitectura

- **Mismo motor**: `construirLinea`, `generar_voz.py`, `Subtitulos`, `VideoBase`. Escenas nuevas en `EscenaId`:
  `manana`, `hoy`, `aparece`, `solucion`, `resultado`.
- **Hespo Semilla dentro de `VideoBase`**: `ConfigVideo.hespo = 'semilla'`. Un adaptador integra los resortes de la
  prueba usando como meta el `estadoHespo` del guion (posición, pose, salto) y la `emocion` de cada frase (campo
  opcional nuevo en `Frase`). La boca usa la forma de la voz (abre/ancho), no solo la apertura.
- **Personas** (`src/historia/Persona.tsx`): mismo estilo plano que Hespo (contorno `COLOR.borde`), con caminata de pies
  plantados, parpadeo, poses por resortes de Remotion y accesorios (gorra, bigote, lentes, casco, celular, laptop,
  podadora). Paleta extendida solo para personas: dos tonos de piel y pelo.
- **Fondos** (`src/historia/fondos`): campus de día y amanecer con capas en paralaje, árbol con rama rajada, oficina,
  sala de reunión. Todo SVG.
- **Vistazos del producto**: capturas reales dentro de un celular o una laptop dibujados, con `Resalte`.

## 4. Fuera de alcance

Música (se puede sumar luego), versión en inglés, versión vertical.
