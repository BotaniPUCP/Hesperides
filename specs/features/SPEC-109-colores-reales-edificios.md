# SPEC-109 — Colores reales de los edificios

| Campo | Valor |
|-------|-------|
| HU relacionada | SPEC-102 (mapa 3D), sobre el modelo de SPEC-108 |
| Autor | Jean Piero, con Claude |
| Plataforma | Ambas: el visor es el mismo en web y en el `WebView` de Android |
| Estado | 12 nov 2026: los 80 edificios fotografiados llevan tramos de sus fotos (D-15), verificado en navegador. Pendiente: revisión del Anexo A, la Huaca y dónde servir el atlas (P-08) |
| Dependencias | SPEC-108 (modelo del plano, `plan_key`, `edificios-plano.glb`), rama `feature/spec-108-edificios-del-plano` |

> **Lectura obligatoria:** `specs/REGLAS.md` y SPEC-108 §2 (de dónde sale el modelo).
> **La regla de este spec: contiene lo que el código NO dice.**

---

## 1. Objetivo

Que el mapa 3D pueda mostrar cada edificio con los colores que tiene en la vida real, como si se le
hubiera tomado una foto: muros, losas, zócalos, barandas, techo y **ventanas**. El mapa rosado de hoy
no se pierde: un botón cambia entre los dos.

**Éxito:** al poner la cámara frente a un edificio fotografiado, el usuario lo reconoce por su color y
su ritmo de ventanas, sin leer la etiqueta.

**No es objetivo:** texturas fotográficas proyectadas, letreros, letras, carpintería fina, interiores,
ventanas encendidas de noche, ni cambiar la geometría del modelo.

**Sería un fracaso aunque funcione:** un edificio pintado con los colores de otro (mal emparejado), un
mapa que se vuelve lento al activar el modo, o un clic o un resaltado que deja de funcionar en ese modo.

## 2. Contexto

### 2.1 Fuentes

| Pieza | Dónde está |
|---|---|
| Fotos de los edificios (80 carpetas, 289 fotos, tomadas entre el 10 y el 12 nov 2026) | `C:\Users\ElNicolays\Downloads\Edificios\edificios-pucp`, **fuera del repositorio** |
| Modelo de los edificios: un nodo por principal, nombre = `plan_key` | `backend/src/main/resources/mapa/edificios-plano.glb` y su manifiesto |
| Nombre, códigos y huella de cada `plan_key` | `backend/src/main/resources/db/migration/V045__group_buildings_by_plan.sql` |
| Cómo se arman los edificios en la escena | `frontend/src/components/map3d/viewer/planModel.ts` (`mergedBuildings`) y `sceneLayers.ts` |
| Botones de apariencia | `frontend/src/components/map3d/MapToolbar.tsx` (`ViewOptions`) y `viewer/palette.ts` |

### 2.2 Lo que dicen los nombres de las carpetas y de las fotos

- **La carpeta** es un edificio o un conjunto. Usa el nombre de uso común (`facuttad-derecho`), el
  nombre oficial (`Centro de Investigaciones y Servicios Educativos (CISE)`) o los códigos del plano
  (`C21 · Izquierda 118 · SKP C-3883, C-3918`, donde «Izquierda» es el id del edificio del mapa y «SKP»
  son las piezas). Las carpetas `Desconocido_NN` corresponden a los principales de V045 con ese nombre.
- **La foto** dice desde dónde se tomó: la cara (`frente`, `detras`/`espalda`, `lado`, `esquina`), hacia
  qué vecino mira (`lado-hacia-comedor-letras`, `frente-a-dintilhac`), qué edificio de un conjunto
  muestra (`frente-a-pabellon-I-edificio-con-escalera`) y a veces un ejemplar o un jardín cercano
  (`EV-000750`, `D12 AV-0333`). Con esos datos y el mapa se sabe qué cara del modelo se ve en cada foto.
- Los nombres sin información (`IMG_20261111_151555.jpg`) se ubican mirando la foto.

### 2.3 Lo que tiene el modelo

Cada edificio es **una sola malla de volumen**, sin materiales ni partes separadas: unos 200 triángulos
de mediana y hasta 25 000. Muros, losas, voladizos, techos y escaleras son volúmenes; **las ventanas,
los marcos y los muros cortina no están modelados**. Por eso las ventanas se pintan con un patrón (D-04)
y no con geometría.

## 3. Decisiones

**D-01 · Una ficha por edificio fotografiado.** Es un archivo de datos con clave `plan_key` que
describe su apariencia: una o más **zonas** con su paleta y, por cada cara de cada zona, su patrón de
ventanas. La ficha cita las fotos de las que sale cada dato (por nombre de archivo) para poder revisarla.
Las fichas se versionan en el frontend; las fotos no (D-11).

**D-02 · Zonas dentro de un edificio.** Un edificio puede tener partes de distinto material, como Derecho
(torre de concreto caravista, bloque de vidrio, volumen blanco y pórtico gris verdoso). La ficha divide
la malla en zonas con un selector espacial en metros del plano local (por ejemplo, un polígono en
planta, un rango de cotas o los dos). Lo que no cae en ninguna zona usa la zona por defecto. La forma
exacta del selector la decide el builder.

**D-03 · Partes de cada zona.** Cada triángulo se clasifica solo por su geometría:

| Parte | Cómo se reconoce | Color |
|---|---|---|
| Techo | Cara horizontal mirando hacia arriba | El color predominante de su zona (D-05) |
| Cielo raso / parte de abajo | Cara mirando hacia abajo | Color de losa de la zona |
| Zócalo | Franja vertical desde la base hasta la altura que dice la ficha | Color de zócalo |
| Cara vertical | El resto | Patrón de la cara (D-04) |

La cara vertical se identifica por su orientación (N, S, E, O y las intermedias que hagan falta), que es
como se traducen «frente», «lado» o «detrás» de las fotos al modelo.

**D-04 · Ventanas con patrón (opción «b»), en todos los edificios fotografiados.** Cada cara vertical
lleva un patrón paramétrico que se dibuja en el material, con coordenadas tomadas de la propia cara
(distancia horizontal a lo largo de la cara y altura). Como mínimo cubre estos tipos:

- **Ventanas sueltas:** altura de piso, altura de alféizar, alto y ancho de ventana, módulo horizontal,
  desfase, y colores de muro, vidrio y marco.
- **Banda corrida:** vidrio continuo por piso, con un antepecho de otro color (las losas beige con vidrio
  del Pabellón Z).
- **Muro cortina:** vidrio con una retícula de perfiles.
- **Muro ciego.**

El primer piso puede tener un patrón distinto al de los pisos de arriba. Si las fotos muestran un
caso que estos tipos no cubren, se agrega el tipo y se anota en §8.

**D-05 · Techos.** Llevan el color predominante de su zona. En un edificio con zonas de distinto color,
cada techo sigue el de su zona, y así el patrón del edificio continúa arriba. Ninguna foto muestra
techos: no se inventan detalles (tanques, claraboyas).

**D-06 · Lo que no se ve.** Una cara sin foto copia el patrón de la cara fotografiada más parecida del
mismo edificio. Por defecto es la opuesta y, si no hay, la de la misma zona con más foto. La ficha lo
dice de forma explícita («igual a: frente»), para que quede revisable. Los árboles, las palmeras y las
personas que tapan una fachada se resuelven igual: con el color y el ritmo de la parte que sí se ve.

**D-07 · Luz neutra.** Se registra el color del material bajo luz diurna pareja, no el tono en sombra ni
el quemado por el sol. Las fotos se tomaron con cielo despejado y con cielo nublado, y el campus debe
verse parejo.

**D-08 · Casos especiales de las fotos.**
- `Desconocido_08` solo tiene una foto de interior: **su color interior se toma como exterior.**
- `Desconocido_13` existe dos veces en V045 (SPEC-108 P-02): las fotos («está bajo tierra», «solo se ve
  el techo desde el piso») corresponden al que tiene la base negativa.
- Las fotos de interior de los demás edificios se usan solo si muestran un patio o una fachada que se
  ve desde afuera (`CIGA-Pulso-pucp/vista-espacio-interior-desde-fuera.jpg`).
- Una carpeta puede pintar varios `plan_key` (conjuntos), y una foto puede servir a dos edificios.

**D-09 · Edificios sin ficha.** Tanto los principales sin carpeta como los prismas del mapa y los
edificios del entorno se dibujan con la paleta de hoy en los dos modos (rosado, o gris si «Edificios
grises» está activo). El suelo, los desniveles y la decoración no cambian.

**D-09b · Carpetas cuyo edificio no tiene malla propia** *(decisión de Claude)*.
- **Edificio agrupado:** su carpeta pinta una **zona** en la ficha de su principal, porque el agrupado
  no se dibuja (SPEC-108). Por ejemplo, si `auditorio-derecho` cuelga de Derecho.
- **Principal sin nodo en el modelo:** se dibuja como prisma y también lleva ficha. El clasificador de
  D-03 funciona igual sobre un prisma.
- **Huaca:** la carpeta `Huaca` pinta los nodos `huaca-muro` y `huaca-tope`, con la misma ficha y sin
  ventanas.
- **Principal que es solo suelo (`groundOnly`):** no tiene nada que pintar. Queda anotado en la tabla.

**D-13 · Material del modo real** *(decisión de Claude)*. Para que el color se parezca al de la foto, el
modo real usa un material propio:
- mate en muros, losas y techos, sin el brillo (clearcoat) ni la textura de `textures.building`;
- un poco de reflejo solo en el vidrio.

Los dos materiales se arman al cargar y el botón solo cambia cuál se usa: la geometría no se rearma
(D-10) y el modo rosado queda idéntico al de hoy (CA-03).

**D-14 · Rendimiento** *(decisión de Claude)*. Al cargar se precalcula por vértice la parte, la zona, la
orientación y las coordenadas de la cara. En cada cuadro el shader solo evalúa el patrón de ventanas,
que son unas pocas operaciones por píxel. CA-08 se mide en la laptop de desarrollo y en un Android de
gama media dentro del `WebView`. Se acepta si el modo real no baja más de un 10 % los cuadros por
segundo frente al rosado, con la misma cámara y sombras activas. Si los baja más, el patrón se
simplifica con la distancia.

**D-10 · El botón.** Es una opción más de `ViewOptions`, «Colores reales», junto a las de hoy, y se
recuerda como las demás. Cómo se combina con los otros botones:
- con «Edificios grises», los edificios con ficha siguen con sus colores reales y los demás van en gris;
- de noche, los mismos colores con la luz de noche de la escena;
- el hover, la selección y el resaltado se dibujan encima, igual que hoy, y el clic sigue funcionando
  por índice.

Cambiar de modo no vuelve a descargar ni a armar las mallas.

**D-11 · Lo que no se versiona.** Las fotos tienen personas y son material de trabajo: quedan fuera del
repositorio. Se versionan las fichas y la tabla carpeta → `plan_key`.

**D-12 · Primero se empareja, después se pinta.** Antes de escribir fichas se arma la tabla carpeta →
`plan_key` (con el nombre de V045 y la razón del emparejamiento) y **Jean Piero la revisa**. Un error
ahí pinta un edificio con los colores de otro.

**D-15 · Fotos reales en vez de patrones** *(pedido de Jean Piero tras la tanda 1)*. Los patrones de D-04
no se parecían a las fotos. Ahora cada cara lleva un **tramo de su propia foto**: se marcan las cuatro
esquinas de un paño de fachada, se le quita la perspectiva (`scripts/mapa/colores_reales/enderezar.py`) y
se repite a lo largo del muro a escala real (`kind: "photo"`). Un tramo puede ir **una sola vez**, centrado
en un punto del muro, con otro tramo fuera de él (el frente de la Biblioteca). Las caras sin foto toman el
tramo de la cara más parecida (D-06). En las fotos:
- el **cielo** (claro y unido al borde de arriba) se marca con color clave y la cara toma el color del muro;
- el **follaje** (verde que domina) se rellena por filas con la continuación de la banda de la fachada;
- una foto sobresaturada se iguala en color con otra del mismo edificio;
- la gente se deja fuera recortando el tramo.

Todos los tramos van en un atlas de 4096 px de ancho (`frontend/public/models/real-look/atlas.jpg`). Las
fichas se escriben en forma compacta en `scripts/mapa/colores_reales/fichas.json` y `fichas.py` genera los
JSON del visor. Los patrones de D-04 quedan para lo que ninguna foto muestra bien.

## 4. Entrega por tandas

Decisión de Jean Piero (12 nov 2026):

1. **Tanda 1:** el motor (clasificación, zonas, patrón y material), el botón, la tabla carpeta →
   `plan_key` aprobada (D-12) y unos 10 edificios variados. Entre ellos van al menos uno con muro
   cortina (Derecho), uno con banda corrida (Pabellón Z), un conjunto (C17…C29) y una caseta. Jean Piero
   revisa el criterio de color con esta tanda antes de seguir.
2. **Tandas siguientes:** el resto de las fichas, en grupos, con los ajustes que salgan de la revisión
   anterior.

**Tanda 1 (hecha):** Pabellón Z, Facultad de Derecho, Biblioteca Central, Arte Antiguo (C17…C29),
Centro de fotocopiado de Pabellón Z, Estudios Generales Letras, Polideportivo, Pabellón V y Tinkuy.

**Calibración (D-07):** la escena entibia y aclara todo (luz cálida, exposición 1,4 y ACES). El shader
invierte esa curva (`LOOK_GAIN` en `lookShader.ts`) para que el color de la ficha sea el que se ve en
pantalla en una cara vertical al sol: medido, #4a5159 se ve (79, 81, 84) y #ebe9e3 se ve (234, 232, 226).

Cada tanda se puede integrar sola: los edificios que todavía no tienen ficha se ven con la paleta de hoy
(D-09). Los casos de §8 que sigan abiertos no bloquean una tanda; quedan anotados.

## 5. Proceso por edificio

1. Leer los nombres de las fotos y ubicar cada una sobre el modelo (cara y orientación).
2. Escribir la ficha: zonas, paleta con luz neutra y patrón por cara.
3. Dibujarlo en el visor desde la misma posición aproximada de cada foto y compararlo lado a lado.
4. Ajustar y pasar al siguiente. Los casos dudosos se anotan en §8 y se le consultan a Jean Piero en
   tandas, sin detener el resto.

Para el paso 3 conviene una página de comparación local (foto ↔ captura del visor), que no se publica
ni se versiona con las fotos.

## 6. Criterios de aceptación

| # | Criterio |
|---|---|
| CA-01 | La tabla carpeta → `plan_key` cubre las 80 carpetas (Anexo A), y Jean Piero la aprobó antes de pintar |
| CA-02 | Con «Colores reales» activo, cada edificio con ficha muestra sus colores y su patrón de ventanas; los demás, la paleta de hoy |
| CA-03 | Al desactivar el botón, el mapa queda idéntico al de hoy (rosado o gris) |
| CA-04 | La opción se recuerda al volver al mapa, como las demás de la barra |
| CA-05 | Hover, selección, resaltado, clic y ficha del edificio funcionan igual en los dos modos |
| CA-06 | En 10 edificios elegidos por Jean Piero, la captura del visor desde el ángulo de la foto es reconocible |
| CA-07 | Ninguna cara de un edificio con ficha queda sin color asignado |
| CA-08 | El cambio de modo es inmediato y no baja los cuadros por segundo de forma notable frente al modo rosado |
| CA-09 | Se verifica en un navegador real, de día y de noche (INV-10) |

## 7. Tests

```
Clasificación (función pura, sin Three.js)
- techo, cielo raso, zócalo y cara vertical según la normal y la cota
- orientación de una cara vertical: N, S, E, O e intermedias; los bordes entre sectores no fallan
- un triángulo cae en la zona cuyo selector lo contiene; si no cae en ninguna, en la de por defecto
- una cara «igual a: X» toma el patrón de X; una referencia a una cara inexistente falla con un mensaje claro

Fichas
- toda ficha apunta a un plan_key que existe en el manifiesto
- toda ficha valida su esquema: colores hexadecimales, medidas positivas, alféizar + ventana ≤ piso
- no hay dos fichas para el mismo plan_key

Visor
- sin ficha: el color es el de la paleta de hoy en los dos modos
- cambiar de modo no reconstruye la geometría
```

## 8. Casos difíciles y pendientes

Se llena durante la implementación con lo que no se pudo decidir con las fotos, para consultarlo con
Jean Piero.

| # | Caso | Estado |
|---|---|---|
| P-01 | **Anexo A, filas «por confirmar»:** Desconocido_13 (cuál de los dos), Pabellón H (`80d344a8`), Facultad de Letras y Ciencias Humanas (`c657216b`), las dos Facultades de Ciencias Sociales y el comedor de arte antiguo | Lo revisa Jean Piero antes de la tanda 2 |
| P-02 | **Pabellón Z, cara sur de la barra sur:** ninguna foto la muestra; copia la fachada de vidrio norte (D-06) | Abierto |
| P-03 | **Polideportivo:** el frente con enchape azul se supuso al norte (bloque ancho) y el anexo de granito al este; las fotos no traen GPS ni sombras que lo fijen | Abierto |
| P-04 | **Lo que el patrón no dibuja:** celosías rojas verticales de Pabellón V, murales (Arte Antiguo, Tinkuy), letreros, el filo de concreto de Derecho como volumen aparte y los hastiales rojos de las casetas de Arte Antiguo | Aceptado: son franjas o piezas sueltas, no ritmos de fachada |
| P-05 | **Huaca (D-09b):** su carpeta todavía no pinta los nodos `huaca-muro` y `huaca-tope`; hoy conservan su textura de tapial | Tanda 2 |
| P-06 | **CA-08 en Android:** medido solo en la laptop (96,5 cps en rosado y 97,5 en real, girando). Falta el `WebView` de un Android de gama media | Abierto |
| P-08 | **El atlas se sirve desde `frontend/public`:** se descarga sin sesión, a diferencia del modelo. Conviene servirlo desde el backend con sesión, como `edificios-plano.glb` | Abierto |
| P-09 | **Restos de árboles y postes en algunos tramos:** el follaje oscuro o gris y los troncos no se detectan como verde y quedan pintados en el muro (EE.GG.LL., Letras, Pabellón V) | Abierto: mejorar con mejores fotos o con máscaras a mano (`tapar`) |
| P-10 | **Caras con patrón y no con foto:** la torre de Derecho, la cara curva oeste de Pabellón Z, la L beige de Arte Antiguo y Desconocido_13 no tienen una vista enderezable | Abierto |
| P-11 | **Fotos chicas** (500–800 px): frente de la Biblioteca, Física, Industrial, Auditorio de Humanidades, Dpto. de Ciencias Sociales; se ven borrosas de cerca | Mejora con fotos de mayor resolución |
| P-12 | **Fotos que no son de su carpeta:** `auditorio-humanidades/frente-lado-frente-a-educacion.png` muestra EE.GG.LL.; `faci/faci-frente.png` viene rayada | No se usan |
| P-07 | **Las fotos no traen GPS ni rumbo** (EXIF sin GPS en las 289): la orientación sale de los nombres, de los vecinos, de la hora y de las sombras | Informativo |
