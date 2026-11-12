# Diseño — Video de flujos para el cliente

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-04 |
| Alcance | Video animado de unos 3 minutos sobre los flujos de Especies, Ejemplares e Incidencias, presentado por un personaje animado |
| Audiencia | Cliente (PUCP) |
| Ubicación | `docs/demos/video-flujos/` |
| Fuera de alcance | Ver sección 11 |

## 1. Objetivo

Que el cliente entienda en unos 3 minutos cómo fluye el trabajo en Hesperides: qué
es una especie, qué es un ejemplar y qué camino sigue una incidencia desde que se
informa hasta que se resuelve.

El video se explica solo: no necesita un presentador humano ni conocimientos
técnicos. Lo presenta «Hespo», un personaje animado que camina por la pantalla, señala
cada paso y lo explica con voz.

## 2. Criterios de éxito

| # | Criterio | Cómo se comprueba |
|---|----------|-------------------|
| CE-01 | El MP4 dura entre 2:30 y 3:30, en 1920×1080 a 30 fps, con video H.264 y audio AAC | `npx remotion ffprobe` sobre el archivo final |
| CE-02 | Hespo se desplaza por la pantalla y señala cada elemento mientras se habla de él | Fotogramas clave revisados (sección 10) |
| CE-03 | La boca de Hespo se mueve solo mientras suena la voz | Fotogramas de una frase y de una pausa |
| CE-04 | Cada frase hablada aparece como subtítulo, sincronizada | Fotograma al inicio y al final de cada escena |
| CE-05 | Hespo nunca tapa una tarjeta que se está explicando ni los subtítulos | Fotogramas clave revisados |
| CE-06 | El guion no contiene términos técnicos ni promesas de funciones inexistentes | Prueba automática sobre `guion.json` y sección 5.2 |
| CE-07 | Cada afirmación del guion tiene respaldo en el sistema actual | Tabla de la sección 5.1 |
| CE-08 | Un cambio de texto se regenera con un comando, sin tocar las animaciones | Cambiar una frase y volver a generar |
| CE-09 | En Especies, Ejemplares e Incidencias, Hespo usa la página: salta hasta los elementos, los pulsa y la pantalla reacciona | Fotogramas clave revisados (sección 4.1) |

## 3. Enfoque

Se usa **Remotion**, que crea videos con componentes React y TypeScript, el mismo
lenguaje del frontend. Se descartaron una página HTML capturada por fotogramas, porque
habría que construir a mano la sincronización y el renderizado, y una presentación de
PowerPoint, porque limita el movimiento del personaje y sincroniza mal la voz.

Remotion da además una vista previa navegable (`remotion studio`) y genera el MP4 con
sus propias herramientas, por lo que no hace falta instalar ffmpeg en la máquina.

**Licencia.** La licencia gratuita de Remotion cubre a personas individuales y a
organizaciones sin fines de lucro. El equipo debe confirmar que el proyecto entra en
ese supuesto antes de distribuir el video.

## 4. Guion

Es la versión aprobable del texto. Vive en `guion.json`, única fuente del texto para
la voz y los subtítulos. Cada línea es una frase con su propio audio.

Son 37 frases y 413 palabras. Con pausas y transiciones, el total estimado va de 2:37 a
3:09, según la velocidad real de la voz (entre 140 y 170 palabras por minuto). Las
duraciones por escena son estimaciones a 155 palabras por minuto.

### Inicio (unos 12 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| i1 | ¡Hola! Soy Hespo. | Entra caminando desde la izquierda y saluda | Fondo verde y suelo arena |
| i2 | Hoy les voy a mostrar cómo Hesperides organiza la información verde del campus. | Se detiene al centro | Aparece el título «Hesperides» |
| i3 | Vamos a recorrer tres partes: las especies, los ejemplares y las incidencias. | Señala cada tarjeta | Tres tarjetas, una por módulo |
| i4 | ¡Acompáñenme! | Sale caminando por la derecha | Las tarjetas se desvanecen |

### Especies (unos 37 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| e1 | Empecemos por las especies. | Entra caminando | Título «Especies» |
| e2 | Una especie es como la ficha botánica de una planta: su nombre científico, su nombre común, su familia y su tipo de vegetación. | Señala la ficha | Ficha de ejemplo: *Roystonea regia*, Palmera real, Arecaceae, Palmera. Cada dato aparece al nombrarse |
| e3 | Hoy el catálogo reúne 90 especies. | Gesto de presentar | Contador que sube hasta 90 |
| e4 | Se puede buscar una por cualquiera de sus nombres, o filtrar por tipo: árbol, palmera, arbusto y otros. | Camina hasta el buscador | Buscador escribiendo «palmera» y etiquetas de tipo |
| e5 | Al abrirla, se ven sus fotos, sus datos y cuántos ejemplares hay en el campus. | Señala la ficha ampliada | Ficha con foto ilustrada y conteo |
| e6 | Y si aparece una planta nueva, el personal autorizado la registra en un formulario, y el sistema revisa que ese nombre científico no exista ya. | Camina hasta el formulario y levanta el pulgar | Formulario simplificado y marca de verificación |

### Ejemplares (unos 52 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| j1 | Ahora, los ejemplares. | Entra caminando | Título «Ejemplares» |
| j2 | Si la especie es la ficha, el ejemplar es cada planta real del campus. | Va de la ficha al mapa | Ficha a la izquierda; líneas hacia tres plantas en un plano esquemático |
| j3 | Ya hay 965 registrados, y cada uno tiene su propio código, que nunca cambia. | Señala la etiqueta | Contador hasta 965 y etiqueta `EV-000123` |
| j4 | Para registrar uno, se elige la especie, se marca el punto en el mapa y, si se quiere, se agrega una foto, sus medidas y una evaluación de su salud. | Camina paso por paso | Tres pasos que se encienden en orden |
| j5 | Si hay otra planta de la misma especie demasiado cerca, el sistema avisa, porque podría ser la misma registrada dos veces. | Mira sorprendido los dos puntos | Dos puntos cercanos y un aviso |
| j6 | Quien decide es la persona. | Señala al frente | Botones «No, es otro: registrar» y «Revisar el punto» |
| j7 | Cuando son muchas plantas, coordinación puede cargar un archivo. | Camina hacia el archivo | Icono de archivo con varias filas |
| j8 | Primero ve una vista previa con los errores y los posibles duplicados, y nada se guarda hasta confirmar. | Señala el botón | Tabla simplificada y botón «Confirmar carga» |
| j9 | La ficha del ejemplar reúne su ubicación, sus medidas y el historial de sus evaluaciones. | Gesto de presentar | Ficha de ejemplar con tres bloques |

### Incidencias (unos 55 s)

Un camino con cuatro estaciones cruza la pantalla: **Informa**, **Aprueba**, **Atiende**
y **Resuelve**. Bajo cada una aparece la etiqueta real del estado.

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| n1 | Y cuando algo pasa en el campus, entran las incidencias. | Entra caminando | Título «Incidencias» |
| n2 | Sigamos el camino de una. | Señala el camino | Se dibujan las cuatro estaciones |
| n3 | Primero, el capataz la informa desde el navegador de su celular. | Camina a la estación 1 | Celular esquemático |
| n4 | Una frase basta, como: rama caída en la puerta principal. | Señala el mensaje | Globo con el texto; etiqueta «Pendiente de aprobación» |
| n5 | La foto y la ubicación son opcionales. | Gesto de restar importancia | Iconos de cámara y ubicación atenuados |
| n6 | Segundo, coordinación la revisa: puede completar el tipo, la urgencia y la cuadrilla responsable, y aprueba el registro. | Camina a la estación 2 | Campos que se completan; etiqueta «Pendiente de atención» |
| n7 | El mensaje original siempre se conserva. | Señala el mensaje | El globo original queda fijado |
| n8 | Tercero, se atiende: coordinación puede planificar los trabajos, y el capataz registra lo que se hizo. | Camina a la estación 3 | Lista de trabajos; etiqueta «En atención» |
| n9 | Una incidencia puede necesitar varias intervenciones. | Señala la lista | Dos trabajos, uno marcado y otro pendiente |
| n10 | Cuarto, se resuelve. | Camina a la estación 4 | Se marca el segundo trabajo |
| n11 | Eso solo es posible cuando hay al menos un trabajo realizado y ninguno pendiente. | Salta de alegría | Etiqueta «Resuelta» |
| n12 | Todo queda en su historial, y coordinación ve en un tablero cuántas incidencias hay en cada etapa. | Gesto de presentar | Línea de historial y cuatro contadores |
| n13 | Los tipos de incidencia son provisionales: los ajustaremos con ustedes. | Mira al frente y asiente | Lista de tipos con la marca «Provisional» |

### Cierre (unos 14 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| c1 | Así de simple. | Entra al centro | Fondo limpio |
| c2 | La especie dice qué es. | Señala a la izquierda | Tarjeta «Especie: qué es» |
| c3 | El ejemplar dice dónde está. | Señala al centro | Tarjeta «Ejemplar: dónde está» |
| c4 | Y la incidencia cuenta qué pasó y cómo se atendió. | Señala a la derecha | Tarjeta «Incidencia: qué pasó» |
| c5 | ¡Gracias por acompañarme! Nos vemos en el campus. | Saluda y sale caminando | Título «Hesperides» |

### 4.1 Interacción con la página

Pedido por el usuario el 2026-11-04 tras la primera revisión. En Especies, Ejemplares e
Incidencias prevalece sobre las columnas «Hespo» y «En pantalla» de las tablas anteriores. El
texto hablado no cambia.

**El fondo es la pantalla real de la web**, decidido por el usuario el 2026-11-04 tras ver la
réplica. Reemplaza a la réplica y a la regla inicial de no usar capturas. Un script maneja la
aplicación real en local, con la base de demostración, y guarda una captura por estado de cada
pantalla junto con las medidas de sus elementos. Hespo salta hasta el borde de un elemento real y
lo pulsa; la captura cambia al estado siguiente.

| Escena | Pantalla real | Lo que hace Hespo y cómo reacciona la página |
|--------|--------------------|---------------------------------------------|
| Especies | Inventario de Especies | Señala la tarjeta de Ponciana mientras se resaltan sus datos, y se resalta el conteo de 90 especies |
| Especies | Inventario de Especies | Salta al buscador, se escribe «ponciana», salta a la etiqueta Árbol y la lista se filtra |
| Especies | Ficha de la especie | Pulsa la tarjeta y se abre la ficha con su foto real y 135 ejemplares censados |
| Especies | Registrar especie botánica | Pulsa «Registrar especie» en la barra, se escribe *Tabebuia rosea*, pulsa el botón y aparece «Especie registrada exitosamente» |
| Ejemplares | Catastro de Ejemplares y Registrar en el catastro | Marca el punto en el mapa, aparece el aviso de duplicado y pulsa «No, es otro: registrar» |
| Ejemplares | Importar al catastro | Pulsa «Revisar archivo», ve la vista previa y pulsa «Confirmar carga» |
| Incidencias | Informar una incidencia y detalle | Pulsa «Enviar», «Aprobar registro», «Marcar realizada» y «Resolver incidencia»; las etiquetas de estado cambian |

La aplicación corre en un proyecto Docker aislado y desechable, con el perfil `dev`: catálogo real y
cuentas e incidencias de demostración. Se entra con `coordinador@demo.invalid` y
`capataz@demo.invalid`, que no son personas reales. *Tabebuia rosea* es un ejemplo: se registra en
esa base temporal. Cada captura se revisa antes de usarla, porque ahora se ven datos reales del
catálogo, como ubicaciones y coordenadas de plantas.

El ejemplo es Ponciana y no Palmera real porque la frase e5 dice «se ven sus fotos», y las fotos de
Palmera real en Drive no son públicas: sin sesión la página muestra un marcador en su lugar.

## 5. Reglas de contenido

**Solo se cuenta lo que funciona hoy.** No se muestran los problemas encontrados en
el análisis de flujos: el video explica el producto, no su estado interno.

### 5.1 Respaldo de cada afirmación

| Afirmación | Respaldo |
|------------|----------|
| 90 especies y 965 ejemplares | `docs/dominio/datos/especies.csv` y `ejemplares.csv` |
| Búsqueda por nombres y filtro por tipo | `InventoryQueries.java`, `SPECIES_FILTER` |
| La ficha muestra fotos, datos y conteo | `SpeciesResponse.java`, `SpeciesInfo.tsx` |
| Se valida que el nombre no exista | `SpeciesRegistrationService.java:40` |
| Código propio que nunca cambia | Decisión D-3 de `docs/inventario-verde/README.md` |
| Registro con especie, punto y datos opcionales | `RegistroPlantaForm.tsx`, `formularioPlanta.ts` |
| Aviso de planta cercana y decisión humana | `DuplicateDetector.java`, `useRegistroPlanta.ts` |
| Carga por archivo con vista previa | `ImportController.java`, `SpecimenImportService.java` |
| Ficha con ubicación, medidas y evaluaciones | `SpecimenDetailScreen.tsx` |
| Incidencia desde el navegador con una frase | SPEC-201, `IncidentCaptureForm.tsx` |
| Se conserva el mensaje original | `Incident.java`, `originalDescription` |
| Revisión y aprobación por coordinación | `IncidentsController.java`, `IncidentDetailPanel.tsx` |
| Condición para resolver | `IncidentsServiceImpl.java:158` |
| Historial y tablero | `IncidentHistoryRepository.java`, `IncidentsScreen.tsx` |
| Tipos de incidencia provisionales | SPEC-201 y migración V026 |

### 5.2 Lo que el video no debe afirmar

- Que una incidencia se liga a un árbol o a una especie.
- Que el sistema envía notificaciones o avisos por vencimiento.
- Que funciona sin conexión, o que existe una aplicación móvil.
- Que usa inteligencia artificial.
- Que una evaluación nueva se agrega desde la ficha de un ejemplar existente.
- Que especies o ejemplares se editan o se dan de baja desde el sistema.

### 5.3 Lenguaje

Se habla al cliente en español peruano, de «ustedes». En el texto del guion no aparecen
nombres técnicos: estados en inglés, roles como `SUPERVISOR`, «API», «endpoint», «CSV» ni
nombres de tablas. Se dice «capataz», «coordinación», «archivo» y «vista previa». El único
código visible es la etiqueta `EV-000123`, que en pantalla se lee como el código de una
planta y no se pronuncia.

Los datos de ejemplo no identifican personas. *Roystonea regia* y «rama caída en la puerta
principal» ya son ejemplos públicos del proyecto. Las capturas reales usan solo la base de
demostración (sección 4.1).

## 6. Hespo

Personaje original creado para este video. El diseño elegido el 2026-11-04 es la propuesta
A, «Retoño», entre cuatro opciones: un retoño redondeado en forma de huevo, con barriga clara,
mejillas, ojos grandes, brazos y piernas cortos, y dos hojas asimétricas en la cabeza, la derecha
más grande. Ese detalle es su rasgo reconocible y debe conservarse en todas las poses.

Se dibuja en SVG con partes separadas para poder animarlas por código. Su geometría de partida
es `Retono.dc.html`, en el lienzo privado [Diseños de Hespo](https://claude.ai/artifact/HKvak3U1KQahHnYttepHWB).
Al implementar, esa geometría se copia al repositorio para que el proyecto no dependa del lienzo.

| Parte | Comportamiento |
|-------|---------------|
| Cuerpo | Respira con un vaivén suave cuando está quieto |
| Piernas y brazos | Ciclo de caminata mientras se desplaza; mira hacia donde camina |
| Ojos | Parpadeo cada pocos segundos, con una variación estable |
| Boca | Se abre según el volumen del audio de la frase; cerrada en los silencios |
| Hojas | Se mecen con un pequeño retraso respecto al cuerpo |

Poses: `quieto`, `saluda`, `senala`, `presenta`, `pulgar`, `sorpresa`, `asiente` y `salta`.

## 7. Estilo visual

Se aplica `docs/marca/README.md`, con el verde como color dominante.

| Uso | Color |
|-----|-------|
| Fondo principal | Verde `#02591F` |
| Tarjetas y texto sobre verde | Blanco `#FFFFFF` |
| Banda de subtítulos | Negro `#000000` con texto blanco |
| Suelo | Arena `#D8CFA4` |
| Cuerpo de Hespo | Verde producto `#91CAA4` |
| Barriga de Hespo | Verde producto claro `#D3E3D9` |
| Hojas de Hespo y detalles sobre oscuro | Verde claro `#6FBF87` |
| Bordes de Hespo | Acento oscuro `#244C32` |
| Texto sobre tarjetas y arena | Verde `#02591F` |

Nunca se usa texto verde sobre negro, ni colores de variante. La tipografía es Nunito, por
su aspecto cercano, cargada mediante `@remotion/google-fonts`. El texto mínimo en pantalla es
de 32 px en 1080p.

**Distribución de la pantalla.** Los 140 px inferiores son la banda de subtítulos. Encima
está el suelo por el que camina Hespo. En Inicio y Cierre el contenido se ubica en la zona
superior. En las demás escenas, la ventana de la réplica ocupa de `y = 36` a `y = 796`; Hespo
camina delante de ella o salta al borde inferior de un elemento, sin tapar lo que se explica.

Desde el cambio a pantallas reales, en Especies, Ejemplares e Incidencias la captura ocupa todo el
ancho por encima de la banda de subtítulos, sin ventana simulada. Los colores de esas capturas son
los de la aplicación, y la regla de 32 px se aplica solo al texto propio del video.

## 8. Arquitectura

```
docs/demos/video-flujos/
  README.md                 Cómo regenerar el video
  package.json              Dependencias fijadas
  remotion.config.ts
  tsconfig.json
  guion.json                Texto y acciones: única fuente
  scripts/
    generar_voz.py          Genera audio y manifiesto
    requirements.txt
  public/voz/               Audio y manifiesto generados, ignorados por git
  src/
    Root.tsx                Registra la composición
    Video.tsx               Une escenas, audio y subtítulos
    tiempos.ts              Convierte duraciones en fotogramas
    tiempos.test.ts
    guion.test.ts           Reglas de contenido
    tema.ts                 Colores, tipografía y distribución
    hespo/                  Personaje, poses y recorridos
    escenas/                Inicio, Especies, Ejemplares, Incidencias y Cierre
    ui/                     Subtítulos, tarjetas, estaciones y contadores
  out/                      MP4 final, ignorado por git
```

| Unidad | Responsabilidad | Depende de |
|--------|-----------------|------------|
| `guion.json` | Frases, voz y acciones de Hespo | Nada |
| `generar_voz.py` | Un MP3 por frase y `manifiesto.json` con duración y huella | `guion.json`, `edge-tts` |
| `tiempos.ts` | Calcula el inicio y el fin de cada frase y escena; función pura | Manifiesto |
| `hespo/` | Dibuja a Hespo dada su posición, pose y fotograma | `tema.ts` |
| `escenas/` | Dibuja cada módulo a partir de la frase activa | `tiempos.ts`, `hespo/`, `ui/` |
| `Video.tsx` | Coloca escenas, audio y subtítulos en la línea de tiempo | Todo lo anterior |

**Flujo de datos.** `guion.json` alimenta a `generar_voz.py`, que produce el audio y el
manifiesto. `tiempos.ts` deriva de ahí la línea de tiempo, y Remotion renderiza el MP4. Las
animaciones se anclan a identificadores de frase, nunca a segundos escritos a mano. Por eso
cambiar un texto solo exige volver a generar la voz y renderizar.

**Tiempos.** 30 fps, 0,25 s de pausa entre frases y 0,6 s de transición entre escenas. La
duración total se calcula a partir del manifiesto.

**Voz.** `edge-tts` con `es-PE-CamilaNeural`. La alternativa es `es-PE-AlexNeural`, si en la
primera revisión gusta más. Solo se genera lo que cambió, según la huella de texto y voz. Se
instala en un entorno virtual dentro del proyecto. Al servicio de Microsoft solo se envía el
texto del guion.

**Aislamiento.** Es un proyecto autónomo con su propio `package.json`. No modifica el frontend,
el backend, las dependencias del frontend ni el CI. La raíz del repositorio ya ignora
`node_modules/`, `out/` y `.venv/`; una regla local ignora `public/voz/`.

## 9. Manejo de errores

| Situación | Comportamiento |
|-----------|----------------|
| Falla el servicio de voz | El script termina con error, indica la frase y conserva el audio ya generado |
| Las voces `es-PE` no están disponibles | Se detiene y se consulta. No se cambia de acento en silencio |
| El manifiesto no coincide con `guion.json` | El video falla al iniciar e indica las frases desactualizadas |
| Falta un audio del manifiesto | El video falla al iniciar e indica el archivo |
| No carga la tipografía | El render falla; no se reemplaza en silencio por otra fuente |
| La duración sale de 2:30 a 3:30 | Se ajusta el texto del guion, no la velocidad de la voz |

## 10. Verificación

**Automática**

- `tiempos.test.ts`: las frases no se solapan, respetan las pausas y la duración total
  coincide con el manifiesto.
- `guion.test.ts`: identificadores únicos, ningún término prohibido de la sección 5.3 ni
  afirmación de la sección 5.2, y toda acción usa una pose existente.
- Revisión de tipos con `tsc --noEmit`.

**Visual.** Se renderizan fotogramas al inicio, a la mitad y al final de cada frase de cada
escena, y se revisan contra CE-02, CE-03, CE-04 y CE-05.

**Técnica.** `remotion ffprobe` sobre el MP4 para CE-01.

**Límite de la verificación.** La revisión automatizada puede inspeccionar imágenes, pero
no escuchar audio. La pronunciación, el ritmo y la naturalidad de la voz los valida una
persona.

**Revisiones del usuario**

1. Una escena de muestra con Hespo animado y audio de las dos voces.
2. Borrador completo en menor resolución.
3. Video final en 1080p.

## 11. Fuera de alcance

- Música y efectos de sonido.
- Versiones en otro idioma o en formato vertical.
- Publicación en plataformas de video.
- Corrección de los problemas encontrados en el análisis de flujos.
- Cambios en backend, frontend o CI.

## 12. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `edge-tts` es una herramienta no oficial y puede dejar de funcionar | El audio queda generado en local; regenerar solo hace falta si cambia el texto |
| Los términos de uso de la voz no contemplan una distribución amplia | El video es para el cliente. Para publicarlo, regenerar con Azure Speech, que ofrece las mismas voces |
| Las cifras de 90 y 965 envejecen | Viven en `guion.json`; actualizarlas es cambiar una frase |
| El guion queda desactualizado si cambian los flujos | El respaldo de la sección 5.1 indica qué revisar |
| Las capturas quedan viejas si cambia la interfaz | `npm run capturas` las regenera con la aplicación en local |
| Las capturas muestran datos reales del catálogo | Solo base de demostración y revisión de cada captura; el video es para el cliente, dueño de esos datos |
| La licencia de Remotion no aplica al equipo | Confirmarlo antes de distribuir; el video se puede rehacer con otra herramienta reutilizando guion y audio |
