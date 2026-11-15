# SPEC-112 — Colores por zonas de la fachada

| Campo | Valor |
|-------|-------|
| HU relacionada | SPEC-102 (mapa 3D). Reemplaza D-04, D-06 y D-15 de SPEC-109 y cambia su D-10 (el modo arranca encendido) |
| Autor | Jean Piero, con Claude |
| Plataforma | Ambas: el visor es el mismo en web y en el `WebView` de Android |
| Estado | 13 nov 2026: entrega 1 hecha (motor, arranque encendido, hoja de revisión y cinco edificios del piloto), verificada en Chrome sin ventana con el material real. Jean Piero aprobó el piloto en el navegador, con el extremo del McGregor y la cara sur del Pabellón Z corregidos (P-02) y las franjas de Química (P-03). 14 nov: grupos 2 a 5 hechos, en revisión de Jean Piero: 79 de los 80 edificios fotografiados tienen ficha. Sin pintar: el comedor de arte antiguo, por confirmar en el Anexo A de SPEC-109 (P-01). Los 12 «Desconocido» que faltaban van de ladrillo liso (P-04). Llegaron fotos de cinco más por D-15 (Auditorio Juan Pablo II, Aulario, CEPREPUC, CIA y Pabellón G), que ya tienen ficha, y luego de seis más (Instituto de Corrosión, CETAM, Aulas Móviles A y C, Gastronomía y Matemáticas) y de la Librería PUCP con el Juan Valdez, que pasó a ser otro edificio (SPEC-108 D-18). 15 nov: once fotos más, el edificio 1 de Contables como el Pabellón G, y todos los snacks y centros de fotocopiado con un mismo color cada grupo; luego el edificio 1 de Contables como espejo del Pabellón G, y cuatro con el estilo de otro (la casa autosostenible como la Sumaq Wasi 2, Ciencias Ómicas y Admisión como Matemáticas, el taller I-114 como los talleres de Escultura). Al final, los 8 que quedaban: los quioscos de Letras y Sociales como el de Deportes, la Sub-estación N-7 como la N-11, el Lugar prestado y el Laboratorio de Cocinas Mejoradas como el Aula R102 de Educación, la jefatura de Humanidades como los edificios de Educación (por confirmar), y el Pabellón O y el Puente Huaca con fotos de referencia. No queda ningún principal rosado |
| Dependencias | SPEC-109 (motor de colores reales y Anexo A de carpetas), SPEC-108 (modelo del plano) |
| Rama | `feature/spec-112-colores-por-zonas`, desde `develop` |

> **Lectura obligatoria:** `specs/REGLAS.md` y SPEC-109 (lo que sigue vigente de ella está en §2.3).
> **La regla de este spec: contiene lo que el código NO dice.**

---

## 1. Objetivo

Que al entrar al mapa cada edificio fotografiado se vea **simple pero con los colores del original**:
cada material donde está (vidrio con sus perfiles, ladrillo, losas de concreto, zócalo, franjas de
color), al nivel del McGregor de Modelos 3D, que es «simplificado pero reconocible y no se ve nada raro».

**Por qué:** las dos formas anteriores se leen como copias. La tanda 1 de SPEC-109 repetía el mismo
sello de ventana por toda la cara («un edificio no tiene cientos de ventanas»), y la tanda 2 (D-15)
repite un tramo de foto a lo largo del muro. Jean Piero no quiere detalle: quiere similitud de color.

**Éxito:** quien entra al mapa reconoce cada edificio por sus colores y por dónde van, sin leer la
etiqueta, y nada le parece repetido ni copiado.

**No es objetivo:** ventanas sueltas, carpintería, letreros, murales, fotos sobre el modelo, ventanas
encendidas de noche, cambiar la geometría (`edificios-plano.glb` o el SKP) ni tocar Modelos 3D.

> **Enmienda del 15 nov 2026 (D-19):** las ventanas encendidas de noche pasan a ser objetivo: tres de cada diez
> paños del vidrio de las fichas se encienden en luz cálida.

**Sería un fracaso aunque funcione:**
- ventanas por todos lados, o cualquier parte que se lea como un sello repetido a lo largo del muro;
- vidrio inventado en una cara que ninguna foto muestra;
- un edificio con colores que no se parecen a sus fotos, o con los de otro;
- perfiles o franjas que titilan al mover la cámara;
- un mapa más lento, o un clic o un resaltado que deja de funcionar en este modo.

## 2. Contexto

### 2.1 La referencia: el McGregor

Su apariencia la genera `frontend/scripts/pabellon-n-appearance.mjs` con seis materiales:
- **fachadas largas:** vidrio en una retícula de 1,2 × 3,6 m. Cada paño tiene un tono un poco
  distinto, cada módulo lleva al pie un antepecho claro, y uno de cada nueve antepechos es de color:
  azul `#24608b` en la torre y rojo `#963e3d` en los cuerpos bajos;
- **testeros:** concreto beige `#c5bca8`;
- **el resto:** techos gris cálido, remates metálicos claros y un atrio de vidrio gris verdoso.

No lleva ventanas sueltas. Lo único que se repite es la retícula del muro cortina, que es como se ve
uno.

### 2.2 La opción elegida

El 13 nov Jean Piero vio maquetas del Pabellón Z y de la Biblioteca Central con la geometría del modelo
del campus, y eligió **«B · Color por zonas de la fachada»** frente a «A · Un color por cara».
- **Pabellón Z:** el vidrio norte con sus perfiles, el marco blanco, la banda del primer piso, el zócalo
  y la franja melón de los antepechos del patio.
- **Biblioteca Central:** el ladrillo con sus losas de concreto, el paño de vidrio del oeste y la torre
  de vidrio de la entrada.

### 2.3 Lo que se conserva de SPEC-109

- el botón «Colores reales», el material propio (D-13) y cómo se combina con noche, «Edificios grises»,
  hover y selección (D-10);
- la clasificación de cada triángulo (techo o cara vertical, y su orientación) y las zonas con selector
  (D-02 y D-03);
- la calibración contra la luz de la escena (`LOOK_GAIN`, SPEC-109 §4);
- las fichas por `plan_key`, el Anexo A y los casos de D-08, D-09, D-09b, D-11 y D-12.

Las coordenadas de fachada no cambian:
- **u:** metros a lo largo del muro desde el centro de la caja del edificio. Crece hacia la derecha de
  quien mira la fachada desde afuera.
- **v:** la cota de la escena, no la altura sobre la base del edificio. Un edificio hundido usa cotas
  negativas.

## 3. Enfoques

| | Enfoque | A favor | En contra |
|---|---|---|---|
| **1 (elegido)** | **Regiones por cara sobre el motor de SPEC-109:** la ficha ubica cada material en metros sobre cada cara, y el shader lo pinta | Reusa la clasificación, las zonas, el botón, la calibración y el rendimiento ya medido. No descarga nada nuevo. Sumar un edificio es escribir datos | Cada región se ubica a mano. Hace falta una herramienta para verla (D-11) |
| 2 | Texturas dibujadas por fachada, como se hizo el McGregor | Admite cualquier forma | Otra imagen grande que descargar, borrosa de cerca, coordenadas de textura por fachada y más tiempo por edificio |
| 3 | Cortar las mallas en bandas de material y pintar cada pedazo de un color | El shader más simple | Pierde los perfiles del vidrio, que es justo lo que hace bien el McGregor. Además, cortar mallas sin errores es delicado |

Jean Piero eligió el 1 el 13 nov. Las fichas quedan como datos: cuando los modelos de Modelos 3D
reemplacen al del campus, podrán servirles de fuente.

## 4. Decisiones

**D-01 · Regiones de material.** Cada cara (una orientación dentro de una zona) lleva una lista corta
de regiones. Una región es un rectángulo en coordenadas de fachada, con un tramo de u, un tramo de v y
un material:
- sin tramo de u ocupa todo el ancho; sin tramo de v, toda la altura;
- lo que ninguna región cubre lleva el muro de la zona;
- se pintan en orden, y la última que cubre un punto gana.

**D-02 · Materiales.** Cada ficha declara sus materiales con nombre (`ladrillo`, `vidrio-norte`,
`melón`). Hay dos tipos:
- **Liso:** un color.
- **Vidrio:** muro cortina o paño de vidrio con su retícula. Lleva el color del vidrio, el color y el
  grosor de los perfiles, el ancho del módulo y su alto (por lo general, un piso).

Como el McGregor, el vidrio puede llevar además:
- un antepecho opaco al pie de cada módulo, con su color y su alto;
- una variación leve del tono de cada paño;
- antepechos de acento: un color y la proporción de módulos que lo llevan, repartidos sin que se note
  un patrón.

La retícula arranca en el borde izquierdo e inferior de su región. Si la región no tiene tramo de u,
arranca en el centro del edificio.

Los colores se registran con luz neutra (SPEC-109 D-07). El de cada material sale de una muestra de la
foto tomada en una parte a luz pareja, sin sombra ni brillo, y se ajusta en la hoja de revisión (D-11).

**D-03 · Las únicas repeticiones permitidas.**
- La retícula de perfiles dentro de una región de vidrio.
- Las **franjas por piso** dentro de una región: cantos de losa, antepechos y cintas de vidrio corridas.
  Una región de este tipo lleva el alto del piso y el tramo de cada piso que ocupa.

Nada más se repite: no hay ventanas sueltas ni sellos a lo largo del muro. Para que no vuelvan por la
puerta de atrás, la validación (D-10) pone dos límites *(decisión de Claude)*:
- una franja por piso mide al menos 4 m de ancho;
- una cara lleva a lo sumo 12 regiones, contando las comunes.

**D-04 · Ventanas sueltas en las fotos** *(decisión de Claude; Jean Piero la confirmó con Química el
13 nov)*. Una fila de ventanas sueltas no se dibuja ventana por ventana:
- si a la distancia marca el color del piso, va como una franja corrida de poco contraste, del color
  que resulta de mezclar el muro y el vidrio;
- si no, el color del muro la absorbe.

Una pieza que domina el color de una fachada, como las celosías rojas de Pabellón V, va como una región
de su color en el tramo que ocupa. Los murales y los letreros no se dibujan.

**D-05 · Zona, regiones comunes y caras.** Cada zona lleva:
- su muro, que es el material de fondo (puede ser un vidrio, como en una torre de vidrio curva);
- su techo;
- sus **regiones comunes**, que van en todas sus caras (zócalo, cantos de losa);
- por orientación, las regiones propias de cada cara, que se pintan encima de las comunes.

Una cara puede copiar a otra con `sameAs`. Con `mirror`, la copia conserva los tramos sobre el mismo
largo del edificio (la u cambia de signo), que es lo que corresponde a la fachada opuesta de una barra.

Desaparece la cara «other» de SPEC-109: una orientación sin entrada lleva el muro y las regiones
comunes. La primera zona sigue siendo la de por defecto, y las demás llevan selector.

Forma orientativa (la exacta la fija el builder; las medidas son ilustrativas):

```json
{
  "planKey": "91277172-…", "name": "Biblioteca Central", "folder": "bibblioteca-central",
  "photos": ["espalda-opuesto-de-delante.jpg", "frente-visto-desde-el-jardind12-grande.jpg"],
  "materials": {
    "ladrillo": { "color": "#c47a65" },
    "concreto": { "color": "#b8b3ab" },
    "vidrio": { "glass": "#2e3437", "frame": "#e4e4df", "moduleM": 1.25, "heightM": 1.3 }
  },
  "zones": [{
    "id": "edificio", "wall": "ladrillo", "roof": "concreto",
    "common": [{ "material": "concreto", "floors": { "everyM": 3.9, "startM": -1.2, "bandM": [-0.3, 0.45] } }],
    "faces": {
      "W": [{ "material": "vidrio", "u": [-6, 5], "v": [-2, 13] }],
      "E": [{ "material": "vidrio", "u": [-5, 5], "v": [0, 14.5] }]
    }
  }]
}
```

**D-06 · Lo que ninguna foto muestra** (reemplaza SPEC-109 D-06). Una cara sin foto lleva el muro de su
zona con las regiones comunes, **sin vidrio inventado**. Copia otra cara solo cuando es evidente, como
la fachada opuesta de una barra idéntica o el lado gemelo de un edificio simétrico, y la ficha anota
por qué. Lo que tapan los árboles o las personas se completa continuando las regiones que se ven a los
lados.

> **Ajuste del 13 nov 2026 (revisión del piloto, P-02):** manda la coherencia del edificio. Si una
> fachada larga sin foto tiene enfrente, en el mismo edificio, una fachada de vidrio, repite su
> composición (vidrio, ventanal, paños). Un muro liso frente a una fachada de vidrio se ve raro. Si la
> opuesta es muro, la cara sin foto sigue siendo muro. La ficha anota de dónde copia.
>
> Excepción confirmada por Jean Piero el mismo día: la torre de la Facultad de Derecho. Su cara este
> queda de concreto, aunque la oeste lleva muro cortina.

**D-07 · Techos.** Toda cara horizontal lleva el material liso del techo de su zona, como en SPEC-109
D-05.

> **Desde el 14 nov 2026 (SPEC-108 D-17):** una escalera que reemplaza parte de la malla, como la del Comedor
> Central, tampoco es fachada. Todas sus caras llevan el techo de su zona, aunque sus contrahuellas y costados sean
> verticales: así no se le pintan franjas de ventanas.

**D-08 · Lejos y cerca.** Perfiles, franjas finas y antepechos se funden en su color promedio cuando en
pantalla quedan más finos que un par de píxeles, como ya hace el patrón de SPEC-109. Así no titilan ni
hacen muaré al girar la cámara. Los bordes de las regiones no se ven escalonados.

**D-09 · El McGregor en el mapa.** No tiene carpeta de fotos: su ficha sale del McGregor de Modelos 3D.
Lleva sus seis materiales y sus colores (§2.1), ubicados sobre las caras del nodo `95fbf9df` del modelo
del campus:
- vidrio con antepechos azules en las fachadas largas de la torre;
- vidrio con antepechos rojos en las de los cuerpos bajos;
- concreto beige en los testeros;
- techos gris cálido.

> **Ajuste del 13 nov 2026 (revisión del piloto):** cada material va donde está su plano en
> `pabellon-n-appearance.mjs`. El atrio solo viste la torre: con un tramo de u en una sola zona pintaba
> también el extremo este del bloque bajo del frente, que cae en el mismo tramo 18 m más adelante. Los
> dos extremos de ese bloque son volúmenes de concreto: zonas en planta (este −33,6 a −28,5 m y 9,9 a
> 17 m desde el centro de la caja), y su vidrio queda en el tramo central de 38,4 m, como en Modelos 3D.

La ficha cita como fuente el generador, no fotos. Su hoja de revisión compara contra vistas del modelo
de Modelos 3D. Si la geometría del campus difiere de la del SKP, manda la del campus: el GLB no se toca.

**D-10 · Validación.** Falla rápido al cargar, con `LookError`, como hoy.
- Colores en `#rrggbb`.
- El techo de cada zona es un material liso.
- Cada región cita un material de su ficha, y sus tramos de u y v van de menor a mayor.
- Vidrio en rangos de edificio: ancho de módulo de 0,6 a 6 m, alto de módulo de 1 a 6 m (el vidrio de la
  Biblioteca tiene travesaños cada 1,3 m), y el antepecho cabe en el módulo.
- Franja por piso: el alto del piso va de 2,4 a 6 m, su tramo cabe en el piso y mide al menos 4 m de
  ancho (D-03).
- A lo sumo 12 regiones por cara.
- `sameAs` termina en una cara con regiones, sin ciclos.
- Siguen las reglas de SPEC-109: una ficha por `plan_key`, el `plan_key` existe en el modelo, la primera
  zona va sin selector y las demás con él.

**D-11 · Hoja de revisión local.** Una herramienta arma una sola imagen por edificio:
- arriba, sus fotos;
- abajo, el edificio pintado con su ficha, visto desde cada orientación fotografiada a la altura de una
  persona y desde la distancia de encuadre del mapa (unos 230 m);
- a pedido, una cuadrícula con la u y la v cada 5 m, para ubicar las regiones.

La hoja muestra cada color como lo deja la calibración en una cara al sol. No simula la luz de la
escena: el color final se confirma en el navegador.

Usa la misma clasificación, las mismas huellas y la misma resolución de regiones que el visor. Hay una
sola copia en TypeScript, y el GLSL la sigue con las mismas constantes (§8). Corre en Node sobre
`edificios-plano.glb` y la carpeta de fotos, que recibe por argumento. Las hojas quedan fuera del
repositorio, porque llevan fotos con personas (SPEC-109 D-11).

La rectificación de SPEC-109 (`enderezar.py` y `tramos.json`) se queda como ayuda local para medir en
metros dónde va cada material de una fachada. Sus imágenes no se versionan.

Cómo se usa, desde `frontend/`:

```
node --import ./scripts/ts-register.mjs scripts/look-sheet.mjs <ficha.json> --salida <carpeta local>
     --fotos <carpeta edificios-pucp> [--cuadricula] [--medidas]
node --import ./scripts/ts-register.mjs scripts/real-look-shader-check.mjs
node --test scripts/look-sheet/
```

`--cuadricula` marca la u y la v cada 5 m (la u = 0 en rojo, la cota 0 en azul). `--medidas` lista los paños
de cada cara con su tramo de u, su cota y su área. El segundo comando compila el shader en Chrome sin ventana
y lo compara píxel a píxel con `facadeColor`: falla si se separan. Se corre después de tocar el GLSL. El tercero
prueba la lectura de V045 de la hoja.

**D-12 · Salen el atlas y los patrones de SPEC-109.** Se van:
- el tipo `photo` y los patrones `windows`, `ribbon`, `curtain` y `blind`;
- `frontend/public/models/real-look/atlas.jpg`, `atlas.json` y la textura que los carga (con esto se
  cierra SPEC-109 P-08);
- la forma compacta, `fichas.json` y `fichas.py`. Las fichas se escriben directamente, un JSON por
  edificio en `realLook/looks/`, y `looks/index.ts` lo regenera un script, no se edita a mano.

Las 80 fichas de SPEC-109 salen en la entrega 1 *(decisión de Claude)*. Cada edificio vuelve al rosado
hasta que llega su ficha nueva. Convertirlas automáticamente no sirve, porque el color de muro que
guardan no es el dominante: en la Biblioteca es gris, no ladrillo. Lo que sus notas sabían (qué foto
muestra qué cara, lo que confirmó Jean Piero) pasa a la ficha nueva, tomándolo del historial de Git.

**D-13 · Arranca encendido** (cambia SPEC-109 D-10). `INITIAL_OPTIONS.realColors` pasa a `true`, y el
rosado queda a un clic.

Ojo con un detalle: `applyToViewer` solo aplica lo que difiere de `INITIAL_OPTIONS`, porque supone que
el visor nace en ese estado. Por eso `createViewer` tiene que nacer con los colores reales y sus
aristas ya puestos. Si no, la barra dice «encendido» y el mapa se ve rosado.

**D-14 · Rendimiento.** Vale el criterio de SPEC-109 D-14: en la laptop, el modo real no baja más de un
10 % los cuadros por segundo frente al rosado. El shader primero lee solo los límites de cada región, y
después el material de la que gana.

**D-15 · Agregar un edificio.** Es el camino de los edificios que hoy siguen rosados, cuando lleguen
sus fotos:
1. Las fotos van en una carpeta nueva de `edificios-pucp`, con nombres que digan la cara o el vecino,
   como hasta ahora.
2. La carpeta suma su fila al Anexo A de SPEC-109, con su `plan_key` y la razón. Si queda «por
   confirmar», Jean Piero la revisa antes de pintar (SPEC-109 D-12).
3. Se escribe su ficha y se regenera `looks/index.ts`.
4. Se arma su hoja (D-11), se compara con las fotos y se ajusta.
5. Se verifica en el navegador y se hace el commit de la ficha.

Ninguno de estos pasos cambia código.

### 4.1 Enmienda del 15 nov 2026: acabados, luz y sombras

**Por qué:** con las fichas, los edificios ganaron sus colores pero perdieron cuerpo. El material del
modo real (SPEC-109 D-13) es mate, de una sola rugosidad y sin relieve. Además, el shader quita el
degradado de tono por vértice que en el modo rosado aclara el techo y oscurece el pie de los muros. El
prototipo v39 (develop, 5 nov) se veía con más volumen y más material aunque fuera de un solo color:
barniz, paneles en relieve con su normal map, degradado y sol a la hora. El 15 nov Jean Piero aprobó
traer eso al modo real sin perder el color de las fichas. Rama: `feature/spec-112-acabados-de-materiales`.

**La condición de todas:** el color de la ficha no cambia. `facadeColor` y `lookDisplay` siguen dando el
mismo color que hoy, y `LOOK_GAIN` no se vuelve a medir. Lo nuevo modula alrededor de 1: su promedio
sobre la cara es 1, y se funde en 1 cuando su detalle queda más fino que un par de píxeles (D-08). Por
eso, a la distancia de encuadre, cada edificio se ve del color de su ficha.

**D-16 · Volumen de los muros** *(decisión de Claude)*. El muro vuelve a llevar una parte del degradado
del modo rosado: el factor es `mix(1, tono / 0,72, 0,4)`, más oscuro al pie y más claro arriba, entre
0,92 y 1,08. Los techos no cambian. El tinte del resaltado se sigue aplicando igual.

**D-17 · Acabados por material.** Cada material liso lleva un acabado, que da el grano del material en
la cara y el relieve que toma la luz:

| Acabado | Cerca | Relieve |
|---|---|---|
| `brick` (ladrillo) | Hiladas de 7,5 cm con ladrillos de 25 cm a soga, cada uno con un tono algo distinto (±7 %), y juntas de mortero hundidas | Junta 8 mm abajo |
| `concrete` (concreto) | Paños de encofrado de 2,4 × 1,2 m, cada uno con un tono algo distinto (±4 %), y juntas finas | Junta 5 mm abajo |
| `plaster` (tarrajeo pintado) | Manchas muy suaves cada 1,6 m (±3,5 %) | Sin relieve |
| `metal` | Engrapes verticales cada 60 cm | Engrape 15 mm arriba |
| `glazed` (cinta o paño acristalado pintado liso) | Nada | Sin relieve |
| `smooth` (liso) | Nada | Sin relieve |

- **Sin tocar las fichas:** el acabado se deduce del nombre del material. Un `finish` en el material lo
  reemplaza, y la validación (D-10) rechaza un acabado que no está en la lista. Los nombres empiezan así:
  - `ladrillo…`: `brick`;
  - `concreto…`, `losa…`, `zocalo…`, `testero…`, `base…`, `bloque…`: `concrete`;
  - `metal…`, `oxido…`, `remate…`: `metal`;
  - `ventana…`, `vidrio…`, `vano…`, `translucido…`, `vitr…`, `cinta…`: `glazed`;
  - `techo…`, `sombra…`: `smooth`;
  - cualquier otro, como `muro` o un color: `plaster`.
- **Techos:** no llevan grano ni relieve, porque sus coordenadas no son de una fachada (la u es la x de
  la escena y la v, su cota).
- **No contradice D-03 ni CA-02.** Hiladas, paños y engrapes son el grano del material, no ventanas ni
  sellos a lo largo del muro. Se funden antes de la distancia de encuadre, como los perfiles del vidrio.
- **Relieve:** se calcula en el shader con las derivadas de la altura en pantalla, igual que el
  `bumpMap` de three. No se descarga ni se dibuja ninguna imagen.

**D-18 · Rugosidad y metal por material** (cambia SPEC-109 D-13). La rugosidad deja de ser una sola
(0,88) y pasa a ir con cada acabado:

| Acabado | `smooth` | `plaster` | `brick` | `concrete` | `metal` | `glazed` |
|---|---|---|---|---|---|---|
| Rugosidad | 0,88 | 0,9 | 0,92 | 0,86 | 0,45 | 0,3 |
| Metal | 0 | 0 | 0 | 0 | 0,3 | 0,05 |

**D-19 · Vidrio** (cambia SPEC-109 D-13; levanta «ventanas encendidas de noche» de lo que no es objetivo).
- Los paños llevan rugosidad 0,18 y metal 0,1, y reflejan el cielo con el doble de intensidad que los
  muros. El Fresnel ya lo hace el BRDF de three: de costado, el vidrio refleja más.
- Los perfiles, rugosidad 0,6 y metal 0,2.
- **De noche** se encienden en luz cálida (#ffd9a0) tres de cada diez paños. Cuáles, lo elige el hash
  del módulo con la semilla de la cara, así que siempre son los mismos y no se nota un patrón. Un paño
  que pinta un acento no se enciende, y de lejos el brillo se promedia como el resto del vidrio. Solo
  pasa en el vidrio de las fichas: una cinta `glazed` lisa no se enciende.
- La luz va a intensidad 0,5, y cada paño encendido tiene su propio nivel, de 0,6 a 1, que también sale
  del hash *(decisión de Claude tras el banco de pruebas del 15 nov)*. A intensidad 1 los paños se veían
  casi blancos y se leían como calcomanías, el sello que esta spec quiere evitar.

**D-20 · Contacto con el suelo** *(decisión de Claude)*. El primer 0,9 m de cada muro, medido desde el
vértice más bajo de su edificio, se oscurece hasta un 14 % en el pie. La sombra bajo los aleros queda
fuera, porque la malla no tiene aleros modelados.

**D-21 · Sombras que siguen a la cámara.** Hoy el mapa de sombras cubre ±720 m alrededor del centro del
campus, unos 35 cm por texel. Pasa a cubrir alrededor del punto que mira la cámara un radio de 0,9 veces
su distancia, entre 60 m y 720 m. Para que las sombras no tiemblen al moverse:
- el centro se ajusta a la retícula de texeles de la luz;
- el radio cambia en saltos de 25 %.

Vale también para el modo rosado: CA-01 queda «idéntico salvo por sombras más nítidas».

**D-22 · Una sola copia probada** (sigue D-11). Cada cosa nueva tiene su copia en TypeScript, que es la
que prueban los tests:
- el grano, el relieve, la rugosidad y el encendido de cada punto (`facadeColor` devuelve también
  `shade`, `height`, `rough`, `metal` y `lit`);
- el volumen y el contacto (`wallLight`);
- el ajuste de las sombras (`shadowFit`).

`real-look-shader-check.mjs` compara además el sombreado, la rugosidad y el encendido píxel a píxel.
El rendimiento sigue con el criterio de D-14.

**Tests de la enmienda:**

```
Acabados
- un nombre de material da su acabado; un finish lo reemplaza; un finish que no está en la lista falla
- ladrillo: hay junta entre hiladas y entre ladrillos, a soga; el promedio del grano sobre la cara es 1
  (±1 %); de lejos, shade = 1 y height = 0
- concreto y metal: la junta o el engrape caen donde dice D-17; de lejos se funden
- un techo no lleva grano ni relieve
- rugosidad y metal de cada acabado; el vidrio mezcla paño y perfil según su cobertura
- de noche: tres de cada diez paños (±5 % en 10 000), siempre los mismos; un acento no se enciende;
  un perfil no se enciende; cada paño con su nivel, de 0,6 a 1; de lejos, el promedio
- el color de la ficha (rgb) es el mismo que antes de la enmienda

Luz y sombras
- wallLight: el pie del muro es más oscuro que la parte alta; el techo da 1; sobre 0,9 m no hay contacto
- shadowFit: el radio sigue a la distancia entre 60 y 720 m, en saltos; el centro cae en la retícula
  de texeles y no se mueve con un desplazamiento menor que un texel
```

## 5. Entregas

1. **Motor y piloto.** Incluye:
   - las regiones, los materiales, la validación y el shader;
   - la salida del atlas y de las fichas viejas;
   - la hoja de revisión y el arranque encendido;
   - cinco edificios: el McGregor, Pabellón Z (vidrio y franja melón), Biblioteca Central (ladrillo,
     losas y vidrio), Facultad de Derecho (varias zonas) y uno de ventanas sueltas, elegido mirando las
     fotos, para ver D-04 aplicado.

   Jean Piero revisa el piloto en el navegador antes de seguir.
2. **Grupos siguientes:** el resto de los edificios fotografiados, de 15 a 20 por vez. Cada grupo lleva
   sus hojas para que Jean Piero lo revise, y los ajustes que salieron del anterior.
3. **Edificios nuevos:** según lleguen las fotos, por D-15.

Cada entrega se puede integrar sola: lo que todavía no tiene ficha se ve con la paleta de hoy (SPEC-109
D-09). Cuándo se integra a `develop` lo decide Jean Piero. Si se integra la entrega 1 sola, los
edificios sin ficha nueva se verán rosados.

## 6. Proceso por edificio

1. Ubicar cada foto sobre el modelo, con su cara y su orientación (SPEC-109 §2.2).
2. Decidir los materiales y dónde va cada uno en cada cara, con la cuadrícula de la hoja y, si ayuda,
   con la fachada rectificada.
3. Escribir la ficha: materiales, zonas, regiones comunes y caras. En sus notas va de qué foto sale cada
   cosa.
4. Armar la hoja, compararla con las fotos y ajustar.
5. Mirar el edificio en el navegador, a la distancia de encuadre y de cerca.

## 7. Criterios de aceptación

| # | Criterio |
|---|---|
| CA-01 | Al entrar al mapa, «Colores reales» está activo y el mapa se ve así. Un clic lo apaga y el rosado queda idéntico al de hoy |
| CA-02 | Ningún edificio muestra ventanas sueltas ni un sello repetido a lo largo del muro. Lo único que se repite son los perfiles dentro de un vidrio y las franjas por piso |
| CA-03 | En su hoja, cada edificio fotografiado tiene cada material donde está en sus fotos. Jean Piero aprueba el piloto y cada grupo |
| CA-04 | Ninguna cara sin foto lleva vidrio, salvo que copie una cara evidente y la ficha diga cuál y por qué |
| CA-05 | El McGregor del mapa se reconoce como el de Modelos 3D: testeros beige, vidrio con antepechos azules en la torre y rojos en los cuerpos bajos, y techos gris cálido |
| CA-06 | Los edificios sin ficha se ven como hoy: rosados, o grises con «Edificios grises» |
| CA-07 | No queda nada del atlas, y el modo real no descarga ninguna imagen |
| CA-08 | Al girar la cámara a la distancia de encuadre, perfiles y franjas no titilan ni hacen muaré |
| CA-09 | Hover, selección, resaltado, clic, noche y «Edificios grises» funcionan como dice SPEC-109 D-10 |
| CA-10 | El modo real no baja más de un 10 % los cuadros por segundo frente al rosado (D-14) |
| CA-11 | Un edificio nuevo entra con su carpeta, su fila del Anexo A y su ficha, sin cambiar código |
| CA-12 | Se verifica en un navegador real, de día y de noche (INV-10) |

## 8. Tests

```
Validación
- materiales lisos y de vidrio bien escritos pasan; un color mal escrito, un módulo fuera de rango
  o un antepecho más alto que el módulo fallan, y el mensaje dice la ficha, la zona y la cara
- una región que cita un material inexistente falla; tramos de u o de v al revés fallan
- una franja por piso de menos de 4 m de ancho falla; una cara con 13 regiones falla
- sameAs a una cara inexistente, o en ciclo, falla
- toda ficha del repositorio valida y apunta a un plan_key del manifiesto; no hay dos para el mismo

Resolución de regiones (la función pura que usan las pruebas y la hoja)
- fuera de toda región, el muro; dentro de dos, la última
- sin tramo de u, todo el ancho; sin tramo de v, toda la altura
- franja por piso: dentro del tramo de cada piso sí; entre pisos, no
- una orientación sin entrada: el muro y las regiones comunes, sin vidrio
- sameAs con mirror: el mismo punto del edificio cae en la misma región
- vidrio: hay perfil en el borde del módulo; los acentos salen siempre iguales y en la proporción
  pedida (±5 % en 10 000 módulos)

Tabla y shader
- materiales y regiones iguales se comparten, y el orden de pintado se conserva
- la disposición de la tabla que lee el GLSL sale de las mismas constantes de TypeScript (`LAYOUT_GLSL`);
  como jsdom no tiene GPU, lo comprueba real-look-shader-check.mjs (D-11) píxel a píxel
- el material del modo real no carga texturas: solo recibe la tabla

Visor
- INITIAL_OPTIONS.realColors es true, y el visor nace con el modo real puesto
- sin ficha, la paleta de hoy en los dos modos; cambiar de modo no reconstruye la geometría
```

## 9. Casos difíciles y pendientes

| # | Caso | Estado |
|---|---|---|
| P-01 | Filas «por confirmar» del Anexo A de SPEC-109 (su P-01) | Abierto: no se pintan hasta confirmarlas |
| P-02 | **Pabellón Z, cara sur de la barra sur:** ninguna foto la muestra. Con D-06, copia el vidrio norte solo si el plano muestra dos barras gemelas; si no, lleva muro | Resuelto el 13 nov: lleva vidrio por coherencia del edificio (ajuste de D-06). Repite la composición norte en su propio largo: vidrio, ventanal y el paño blanco del extremo este. Va en una zona propia, solo el frente sur, porque las paredes del patio también miran al sur |
| P-03 | **D-04 (ventanas sueltas como franja tenue)** es decisión de Claude | Resuelto el 13 nov: Jean Piero comparó Química con franjas y sin ellas, y se quedan las franjas |
| P-04 | **Edificios sin fotos:** al 15 nov ya no queda ninguno: los 8 últimos copian a otro edificio por decisión de Jean Piero (su ficha la cita como fuente), o se pintan con una foto de referencia (Pabellón O, Puente Huaca) | Rosados hasta que lleguen sus fotos (D-15). Excepción de Jean Piero del 14 nov: los «Desconocido» sin ficha (12: del 01 al 06, del 09 al 11, los dos 13 y el 14) van de ladrillo liso con el color y el techo de Ingeniería Mecánica, sin ventanas; su ficha cita esa decisión como fuente. Los que tienen fotos (07, 08 y 12) siguen con su ficha |
| P-05 | **CA-10 en el `WebView` de Android** (SPEC-109 P-06) | Abierto. Si baja más de un 10 %, se decide si en Android el modo arranca apagado |
| P-06 | **Huaca:** sigue con su textura de tapial (SPEC-109 P-05) | Fuera de este spec |
| P-07 | **Química, testeros verde oliva con el letrero** (frente.jpg, frente2.jpg): ninguna foto dice hacia dónde miran | Quedan del color del muro hasta saberlo |
| P-08 | **La hoja no simula la luz del mapa:** con el sol de media tarde de frente, el ladrillo de la Biblioteca se ve más claro que en la foto (visto en three.js con las luces del visor). La calibración es para una cara al sol promedio | Se confirma en el navegador con el piloto |

Con los tramos de foto dejan de aplicar estos pendientes de SPEC-109:
- P-08: dónde servir el atlas;
- P-09: restos de árboles en los tramos;
- P-10: caras sin una vista que se pueda enderezar;
- P-11: fotos chicas, borrosas de cerca.

P-12 sigue igual: esas fotos no se usan.
