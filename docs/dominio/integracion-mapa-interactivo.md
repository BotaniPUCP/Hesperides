# Integración con el mapa interactivo del cliente

> **Decisión tomada:** nos **integramos** con el mapa que ya tienen. No construimos uno nuevo ni
> lo reemplazamos.
>
> **Este documento lista lo que necesitamos saber para que eso sea posible.**
>
> **Actualizado con una captura de pantalla del mapa real.** Robert intentó mostrárnoslo en la
> 2.ª entrevista y no cargó, pero la captura resolvió casi todas las preguntas de tecnología:
> es **GitHub Pages + Google Maps API**, en el repositorio personal de Carolina.

---

## Lo que ya sabemos — actualizado con la captura de pantalla

Una captura del mapa en uso resolvió de golpe casi todo el Bloque 1 original.

### La URL lo dice casi todo

```
clluncor-lang.github.io/mapa-web-6/
```

| Lo que revela | Consecuencia |
|---|---|
| **`github.io`** → es **GitHub Pages** | **Sitio estático**: no hay backend ni base de datos. Los datos viven en archivos del repositorio o en una fuente externa que el navegador lee |
| **`clluncor`** → la cuenta de **Carolina Lluncor** | Es su repositorio personal. El mismo correo que aparece en un comentario del Excel (`clluncor@pucp.edu.pe`) |
| **`mapa-web-6`** | Sugiere que hubo versiones 1 a 5. Encaja con lo que Robert contó de una versión anterior «con un archivo de carga previo» |

**Es Google Maps JavaScript API, no Google My Maps.** Lo delatan el mapa base satelital con POI
nativos, los controles `+`/`−` y una interfaz propia. **Eso descarta el peor escenario: es código
propio y modificable.**

### Lo que muestra la interfaz

El panel «Filtros de Actividades» revela el modelo de datos que ya maneja:

| Control visible | Qué confirma |
|---|---|
| **Ver Marcadores** / **Ver Mapa de Calor** | **El mapa de calor ya está construido** |
| Filtro **Mes** | Los registros llevan mes |
| Filtro **Clase de Actividad** | Las 9 clases del Excel están ahí |
| Filtro **Tipo de Actividad** | Los 45 tipos también |
| Filtro **Responsable / Cuadrilla** | Alfonso, Óscar, Andrés |
| Buscador «facultad, especialidad o lugar» | Usa los referentes, no los cuarteles |
| Capas laterales | Gestión · **Zonas de…** · Plan de… · **Vivero** |

> **Este mapa ya consume el Excel casi tal cual.** Sus filtros son exactamente las columnas que
> analizamos: Mes, Clase, Actividad, Responsable y coordenadas.

### Dos requisitos nuestros ya existen ahí

| Requisito | Estado real |
|---|---|
| **6.9** Mapa de calor de intervenciones por zona | **Ya construido** |
| **2.1** Mapa interactivo del campus | **Ya existe**, con búsqueda y filtros |

**Duplicarlos sería absurdo.** Refuerza la decisión de integrarnos.

### Lo que Robert dijo y ahora cobra sentido

- *«Tal vez por la cuenta de GitHub, probablemente no esté logueado»* cuando no cargó —
  **no era un lapsus**.
- *«Algunos algoritmos para enlazarlos y actualizarlos desde su computadora, desde su servidor»* —
  «su servidor» es GitHub Pages.
- *«Cualquiera que tenga el enlace puede ir viendo las actualizaciones»* — coherente con un sitio
  estático público.

---

## Preguntas que siguen abiertas

La captura cerró el «qué es». Lo que queda es **cómo entran los datos** y **qué nos dejan tocar**.

### Bloque A · La fuente de datos — lo único que bloquea de verdad

#### A1 · ¿Dónde están los datos que el mapa pinta? 🔴

**Lo que sabemos.** Es GitHub Pages, un sitio estático. Eso deja solo dos posibilidades:

| Posibilidad | Qué implicaría para nosotros |
|---|---|
| **Un archivo dentro del repositorio** (JSON, GeoJSON, CSV) | Carolina lo regenera y hace *commit* cada semana. Integración = **escribir ese archivo y hacer commit** |
| **Una fuente externa que el navegador lee** (Google Sheet publicada, CSV en Drive) | Integración = **escribir en esa fuente**. Ni siquiera hay que tocar el repositorio |

**Por qué es la única pregunta que bloquea.** Las dos rutas son viables y de bajo riesgo, pero
**son trabajos distintos**. Todo lo demás se puede decidir después.

**Cómo responderla sin preguntar:** si el repositorio es público o nos dan acceso, **se ve en el
código**. Media hora mirando el JavaScript responde esto y buena parte de A2.

#### A2 · ¿Qué formato exacto tiene esa fuente? 🔴

**La pregunta.** Las columnas o campos, sus nombres y **el formato de las coordenadas**.

**Por qué importa.** Escribimos en una estructura que ya existe: si el mapa espera `latitud` y
`longitud` en campos separados y nosotros escribimos otra cosa, no pinta nada.

**Lo que ya intuimos** por los filtros visibles: Mes · Clase de Actividad · Tipo de Actividad ·
Responsable/Cuadrilla · coordenadas · probablemente la foto y el comentario.

#### A3 · ¿Cómo lo actualiza Carolina hoy, paso a paso? 🔴

**La pregunta.** Desde que el Excel tiene filas nuevas hasta que aparecen en el mapa, **¿qué hace
exactamente?** ¿Exporta, transforma, hace commit, ejecuta un script?

**Por qué importa.** Es el trabajo manual que queremos eliminar (dolor D1). Para automatizarlo hay
que verlo. **Verla hacerlo una vez responde A1, A2 y A3 de golpe.**

---

### Bloque B · Acceso y permisos

#### B1 · ¿Nos dan acceso al repositorio? 🔴

**La pregunta.** ¿Podemos ver `clluncor-lang/mapa-web-6`? ¿Es público o hay que invitarnos?

**Por qué bloquea.** Con acceso de lectura respondemos A1 y A2 sin gastar tiempo de nadie. Sin
acceso, dependemos de que nos lo expliquen.

#### B2 · ¿Quién puede escribir ahí? 🔴

**Lo que sabemos.** Es una cuenta **personal** de Carolina, no institucional de la PUCP.

**La pregunta.** ¿Nos daría permiso de escritura, o prefiere que le entreguemos los datos y ella
publique? ¿Qué pasa el día que Carolina deje el puesto?

**Por qué importa, y es delicado.** El mapa que usan **tres secciones de OSG** vive en el
repositorio personal de una locadora de servicios. Es una dependencia frágil que conviene nombrar
—con tacto— porque nos afecta: si mañana cierra esa cuenta, el mapa desaparece.

#### B3 · ¿Afecta a las otras dos secciones? 🔴

**Lo que sabemos.** El mapa lo comparten **Supervisión de Campus** y **Administración de
Contratos**. Las capas laterales de la captura («Gestión», «Plan de…») sugieren que sus datos
también están ahí.

**La pregunta.** Si escribimos, ¿tocamos datos que ellas ven? ¿Hay que avisarles?

**Por qué es el riesgo más subestimado.** No tocamos una herramienta de nuestro cliente, sino
**una compartida por tres áreas**. Un error nuestro se ve en tres sitios.

#### B4 · ¿Podemos trabajar sobre una copia? 🟡

**La pregunta.** ¿Se puede hacer una copia del repositorio para probar sin tocar el mapa real?

**Por qué importa.** En GitHub esto es trivial —un *fork*— y nos da un sitio donde equivocarnos
sin consecuencias. Probablemente sea un «sí» fácil, pero hay que pedirlo.

---

### Bloque C · Qué datos y hasta dónde llegamos

#### C1 · ¿Qué debe aparecer en el mapa? 🟡

**La pregunta.** De lo que registre nuestro sistema, ¿todo va al mapa, o solo algunas cosas?
¿Actividades cerradas, todas, algunas clases?

**Por qué importa.** Son ~283 registros al año. Sin filtro, el mapa puede saturarse más de lo que
ayuda.

#### C2 · ¿Qué pasa con los datos que ya están? 🟡

**La pregunta.** Cuando nuestro sistema empiece a escribir, lo que Carolina ya cargó ¿se mantiene,
se migra o convive?

**Por qué importa.** Evita ver la misma intervención dos veces.

#### C3 · ¿Las capas de Vivero y Zonas también? 🟡

**Lo que sabemos.** La captura muestra capas de **Vivero**, **Zonas de…**, **Gestión** y **Plan
de…**.

**La pregunta.** ¿Qué contienen y quién las mantiene? **El vivero quedó fuera de nuestra fase 1**,
pero en el mapa existe — conviene saber si esperan que lo alimentemos.

#### C4 · ¿Nuestro sistema tendrá mapa propio, o solo escribe en el suyo? 🟡

**La pregunta.** ¿Se imagina entrando a nuestro sistema para ver el mapa, o seguirá usando este y
nuestro sistema solo lo alimenta?

**Por qué importa.** Decide si construimos visualización o solo integración — y afecta
directamente a los requisitos 2.1 y 6.9, que **ya existen en su mapa**.

---

## Si solo pudiéramos hacer dos cosas

1. **Pedir acceso al repositorio** `clluncor-lang/mapa-web-6` (B1). Con lectura respondemos A1,
   A2 y media parte de A3 **sin gastar el tiempo de nadie**.
2. **Pedir 20 minutos con Carolina** para verla actualizar el mapa una vez. Responde el resto.

> **Robert sabe qué quiere ver; Carolina sabe cómo funciona.** Esta conversación es con ella.

---

## Los dos escenarios que quedan

La captura eliminó el escenario malo. Quedan dos, **ambos viables**:

| | Escenario | Cómo sería la integración | Riesgo |
|---|---|---|---|
| **A** | **El mapa lee un archivo del repositorio** | Nuestro sistema genera el archivo y hace *commit*. GitHub Pages republica solo | **Bajo**. Versionado gratis: cada cambio queda en el historial y se puede revertir |
| **B** | **El mapa lee una fuente externa** (Sheet/CSV publicado) | Nuestro sistema escribe en esa fuente. **Ni siquiera tocamos el repositorio** | **Muy bajo** |

**El escenario C —mapa cerrado sin integración posible— queda descartado.** Es código propio sobre
Google Maps API, en un sitio estático cuyo contenido está a la vista.

> **En ambos casos, Carolina deja de copiar a mano.** Eso es el dolor D1 resuelto.

---

## Lo que esto cambia en el catálogo de requisitos

| Requisito | Qué pasa |
|---|---|
| **2.1** Mapa interactivo del campus | ⚠️ **Ya existe.** Revisar si construimos uno o solo alimentamos el suyo (C4) |
| **6.9** Mapa de calor por zona | ⚠️ **Ya está construido.** Mismo caso |
| **2.8** Integración con el mapa existente | ✅ Se confirma como **el requisito clave** de M2 |
| **3.4** Marcado de zona intervenida | ✅ Sigue en Alta: es lo que alimenta el mapa automáticamente |

**No conviene tocar las prioridades todavía** — primero hay que saber si el cliente quiere seguir
usando su mapa o migrar al nuestro (C4). Pero **el equipo debe saber que dos requisitos Alta
podrían estar ya resueltos por el cliente**.
