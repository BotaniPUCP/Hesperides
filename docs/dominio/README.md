# El negocio de Hesperides

> **Para quien acaba de entrar al equipo.** Este documento explica **de qué trata el proyecto**:
> quién es el cliente, cómo trabaja, qué palabras usa y qué le duele. No habla de código,
> tecnologías ni base de datos — eso está en otros documentos. Aquí solo el negocio.
>
> **Qué sabemos y de dónde.** Todo lo que sigue viene de tres fuentes, todas del cliente:
> la **1.ª entrevista**, la **2.ª entrevista** y un **Excel operativo** que nos entregó.
> Cuando algo no lo sabemos, lo decimos. Cuando dos fuentes se contradicen, también.
>
> **Última actualización:** tras la 2.ª entrevista. Esa reunión **corrigió** dos cosas que
> dábamos por buenas — el papel de los cuarteles forestales (§5.3) y qué significa «sector»
> (§5.1) — y reveló que el cliente **ya tiene un mapa interactivo funcionando** (§8.9).

---

## 1. En una frase

La PUCP tiene **41 hectáreas de campus**, de las cuales **15.6 son áreas verdes** y **~3.500 son
árboles**. Un equipo de unas 30 personas las mantiene. Hoy lo gestionan con **hojas de Excel en
varios Drives** que alimentan a mano un mapa interactivo, y **solo 1.000 de esos árboles están
ubicados**. Hesperides es el sistema que debe ordenar eso.

---

## 2. Quién es el cliente

### 2.1 Dónde encaja en la universidad

```
Dirección de Administración y Finanzas (DAF)
   └── Oficina de Servicios Generales (OSG)
        ├── Sección de Áreas Verdes y Medio Ambiente   ← NUESTRO CLIENTE
        ├── Sección de Administración de Contratos
        └── Sección de Supervisión de Campus
```

**Nuestro contacto es Robert Sánchez**, jefe de la Sección de Áreas Verdes y Medio Ambiente.
Él reporta a OSG, y OSG a la DAF.

### 2.2 Un dato que explica casi todo

**La sección existe desde agosto de 2024.** Es nueva — las otras dos secciones de OSG son mucho
más antiguas y tienen procesos asentados.

Antes de existir, las áreas verdes se administraban desde sitios distintos según la época: la
antigua Intendencia de Campus, luego la Dirección de Operaciones. Nunca hubo un dueño estable.

> **Por qué importa:** cuando veas que algo no está formalizado, que falta un procedimiento o que
> los datos están desordenados, **no es dejadez**. Es un área joven que todavía está construyendo
> sus procesos. Robert lo dice explícitamente: quiere que esos procesos «sean visibles, tengan un
> orden, un seguimiento, una programación».

### 2.3 Qué tiene a su cargo

| Ámbito | Detalle |
|---|---|
| **Arbolado** | Los árboles del campus |
| **Césped** | Grass americano (mayoría), bermuda, paspalum |
| **Campos deportivos** | Superficies deportivas con vegetación |
| **Jardines** | Macizos, jardineras, cubresuelos, setos, macetas |
| **Residuos orgánicos** | Los que genera el mantenimiento (poda, hojarasca) |
| **Zoocriadero** | Venados, tortugas motelo, pavos reales, una alpaca |
| **Vivero** | Producción y propagación de plantas |

El zoocriadero está **reconocido oficialmente** y obliga a la sección a presentar **inventarios
anuales al Ente Técnico Forestal** (por las alpacas y las tortugas). Es fauna, no flora — aún no
está decidido si entra en el sistema.

---

## 3. La idea más importante: hay dos regímenes de trabajo

Si te llevas una sola cosa de este documento, que sea esta. **El trabajo se ejecuta de dos formas
completamente distintas**, y casi todas las decisiones del proyecto dependen de cuál sea.

| | **Personal estable PUCP** | **Servicios tercerizados** |
|---|---|---|
| **Quién lo hace** | Empleados de la universidad, muchos con 30-40 años de experiencia | Dos empresas contratadas (una principal y una subsidiaria) |
| **Qué hacen** | Mantenimiento de jardines · Poda menor (árboles < 5 m) · Riego | Poda de altura (> 5 m) · Control fitosanitario · Corte de césped |
| **Cómo se les ordena** | **Orden verbal** al jefe de grupo. No hay papel de por medio | Requerimiento → orden de compra → reporte → conformidad |
| **Quién aprueba** | La propia sección | **Logística del campus** tramita la orden, no la sección |
| **Qué evidencia queda** | Fotos en Google Drive | Informe final del proveedor, fichas diarias, charlas de seguridad |
| **Con qué frecuencia** | Diario | Según contrato (ver §6) |
| **¿Está en el Excel?** | **Sí** | **No — ni una mención** |

### 3.1 Por qué se tercerizó

No fue una decisión de costos, sino de **seguridad y salud en el trabajo**. Las labores que
requieren equipamiento especializado —poda de altura, motosierras, cortadoras de césped— se
fueron pasando a terceros. Con ellas se dio de baja la maquinaria propia, porque mantener equipos
costosos sin personal que los opere no tiene sentido.

Esto ocurrió sobre todo **después de la pandemia**. En 2018-2019 el panorama era distinto: mucho
más trabajo se hacía con personal propio.

### 3.2 El dolor concreto con los tercerizados

Robert lo resume así: del servicio tercerizado **«lo que se controla es el producto final»**.

Le entregan un informe al terminar, pero no ve el proceso. Su ejemplo: durante el cierre de fin de
año podan **10 a 15 árboles por día**, cuando una cuadrilla trabajando con detalle hace **1 o 2**.
No dice que esté mal hecho — dice que **no tiene cómo saberlo**.

Quiere «transparentar algunas cosas con ellos»: pedirles datos de rendimiento que hoy no entregan.

---

## 4. Las cuatro actividades prioritarias

De todo lo que hace la sección, Robert señaló **cuatro como prioritarias**:

| Actividad | Quién la ejecuta | ¿Tenemos el detalle? |
|---|---|---|
| **Poda** | Menor: estable · Altura: tercerizado | ✅ Sí — 4 tipos |
| **Mantenimiento de jardines** | Estable | ✅ Sí — 10 tipos |
| **Control fitosanitario** | Tercerizado | ❌ **No** — sabemos que existe, no qué incluye |
| **Corte de césped** | Tercerizado | ❌ **No** — no aparece en el Excel |

> **Fíjate en el patrón:** las dos que **sí** tenemos detalladas son las del personal estable. Las
> dos que **no**, son las tercerizadas. No es casualidad — el Excel documenta solo al personal
> estable, y el detalle del tercerizado vive en los contratos, que no hemos visto.

### 4.1 Las cuatro son ejes gruesos, no la taxonomía completa

En la segunda entrevista le preguntamos si el sistema debía quedarse en esas cuatro o soportar las
**9 clases** del Excel. Su respuesta fue clara: **las cuatro son «ejes principales, actividades
gruesas»**, pero en la ejecución real **«se traslapan varias actividades adicionales»**.

Sus ejemplos:

- Para **rehabilitar un jardín** puede hacer falta sacar plantas del **vivero**, propagarlas
  directamente en campo, o comprar insumos.
- La **propagación** no es solo una actividad de vivero — también se hace en campo.
- La **poda** no es solo tercerizada — también hay poda menor del personal estable.

> **Conclusión:** el sistema debe soportar **las 9 clases con sus 45 tipos**. Las cuatro
> prioritarias marcan por dónde empezar, no dónde terminar. Robert lo dijo así: *«sí esperaría que
> el mantenimiento podamos incluir esos matices adicionales»*.

### 4.2 Criterios de poda — por qué se poda, no solo cuándo

Robert explicó la lógica que hay detrás, y es útil para entender qué significa una poda «bien
hecha»:

| Criterio | Qué busca |
|---|---|
| **Transitabilidad** | Que no obstaculice vías peatonales. **Es un campus: la gente circula** |
| **Sanidad** | Retirar ramas secas, rotas o enfermas |
| **Limpieza** | Algunas especies no eliminan su follaje solas y acumulan residuo |
| **Seguridad** | Que no entre por ventanas ni bloquee accesos |
| **Estética** | Conservar la forma y cobertura de la especie |

> **Una tensión de fondo:** existe un criterio conservacionista que dice que el árbol debe crecer
> como en la naturaleza. Robert lo rechaza para un campus: *«en el bosque las ramas caen, pero no
> hay nadie abajo»*. En un campus universitario ese riesgo no se puede sostener.

**Un efecto secundario que conviene saber:** una buena poda **reduce plagas**. Cuando el follaje
se acumula y no pasa luz ni hay ventilación, las poblaciones de insectos se descontrolan. Las
plagas son parte de la dinámica natural — el objetivo no es eliminarlas, es **controlar su
población**.

---

## 5. El vocabulario del cliente

Estas palabras aparecen en todas las conversaciones. Usar las suyas evita malentendidos.

### 5.0 Cómo se divide el campus (hay cuatro formas, no una)

Esta es la parte que más cuesta entender al llegar. El campus **no tiene una sola división**:
conviven cuatro, y cada una sirve para algo distinto.

```
Sector de mantenimiento (3)      ← la división operativa VIVA
   └── Lugar / referente (74)     ← lo que se registra a diario
        └── Jardín (~100)         ← unidad de trabajo del corte de césped

Cuartel forestal (17)             ← división histórica, EN DESUSO
```

| División | Cuántos | ¿Se usa hoy? | Para qué sirve |
|---|---|---|---|
| **Sector de mantenimiento** | 3 | ✅ Sí, a diario | Organiza al personal y **el ciclo de riego** |
| **Lugar / referente** | 74 | ✅ Sí, a diario | Es lo que se anota al registrar una actividad |
| **Jardín** | ~100 | ✅ Sí | Unidad de control del corte de césped. Tiene código numérico |
| **Cuartel forestal** | 17 | ⚠️ Casi no | Solo sobrevive en el inventario de especies antiguo |

### 5.1 Sector de mantenimiento — la división que sí importa

**Tres sectores fijos**, uno por capataz. Robert fue explícito: **«sus zonas no varían»**. Están
dibujados en el mapa interactivo.

| Sector | Superficie | Personal |
|---|---|---|
| Sector 1 | ~4.5 ha | 9 personas |
| Sector 2 | ~4.5 ha | 9 personas |
| Sector 3 | ~3 ha | 7 personas |

Cada persona cubre **~5.000 m² (media hectárea)**. Los sectores son la unidad con la que se
organiza el riego (§6.1).

> ⚠️ **Cuidado con el nombre.** En el Excel la columna se llama «Sector de jefe de grupo» y
> contiene nombres de personas (Andrés, Óscar, Alfonso). **El sector es territorio, no persona** —
> el capataz lo etiqueta, pero puede cambiar mientras el sector permanece. Nunca hay que crear una
> zona del campus llamada «Alfonso».

### 5.2 Lugar o referente — el vocabulario del día a día

Lo que Robert usa al hablar: **edificios y facultades** («Jardines de Ingeniería Civil»), **vías**
(el Tontódromo, que atraviesa varias facultades) y **jardines emblemáticos** (Comedor Central,
Arte Antiguo, Patio Central).

Son los 75 lugares con coordenadas del Excel. Robert dijo que **le gustaría usar términos aún más
reconocibles**: es el vocabulario que orienta de verdad a quien trabaja en el campus.

### 5.3 Cuartel forestal — vocabulario heredado, casi muerto

**La división histórica.** Hay **18 denominados**; el **cuartel 7 desapareció** cuando se puso en
valor la Huaca — era el área verde que bordeaba el camino Inca entre Electrónica y Minas.
**Quedan 17.**

Pero Robert **casi no los usa**:

> «Personalmente yo no lo uso siempre… se usa cada vez menos. Es más fácil referenciar Jardines de
> Ingeniería Civil que referenciarte cuartel 11. No me da mucha información.»

Eso explica por qué de 283 registros del Excel **solo 2 mencionan un cuartel**. No es un dato que
falte: es un vocabulario que se está abandonando.

> **Dónde sí siguen vivos:** en el **inventario de especies**, donde cada planta está referenciada
> como «cuartel 1… cuartel 18» y **no tiene coordenadas**. Ahí el cuartel es la única ubicación
> disponible. Por eso hay que conservarlos: sin ellos no se puede leer ese inventario.

### 5.4 Otros términos

| Término | Qué significa |
|---|---|
| **Poda menor** | Árboles de menos de 5 metros. La hace el personal estable |
| **Poda de altura / mayor** | Árboles de más de 5 metros. Requiere grúa, motosierra y un **prevencionista** de seguridad. Tercerizada |
| **Catastro** | El inventario georreferenciado de qué hay plantado y dónde. **En construcción** |
| **Canteo** | Delimitar y perfilar los bordes de jardineras o macizos. Es la actividad más frecuente |
| **Deshierbo / desmalezado** | Quitar malas hierbas |
| **Champa** | Panel de césped que se coloca ya crecido |
| **Confitillo** | Piedra pequeña decorativa de acabado |
| **Mulch** | Cobertura vegetal triturada sobre el suelo |
| **Incidencia / hallazgo** | Un problema detectado (rama caída, planta muerta, riesgo) |
| **Orden de compra** | El documento con que se contrata a un tercero. La tramita Logística |
| **Conformidad** | La aprobación que da la sección al terminar un servicio tercerizado |
| **OSG** | Oficina de Servicios Generales. También el prefijo de códigos que vienen de la **matriz de incidentes** |
| **Centuria** | La **plataforma de la universidad** por la que las unidades piden atenciones. Genera su propio código |
| **Mapa interactivo** | La herramienta que ya usan: varias capas sobre el campus, compartida entre las 3 secciones de OSG |
| **Retiro municipal** | La franja verde **fuera de los muros** del campus. Es de la Municipalidad de San Miguel, **no de la PUCP** |
| **Ortofoto** | Fotografía aérea georreferenciada. Una tesista está levantando una con dron (2-3 cm de precisión) |
| **Peniceti** | Planta ornamental (*Pennisetum*). Aparece en el ejemplo del trabajo largo de §8.6 |
| **Pop-up / electroválvula** | Componentes de riego automatizado. Hoy **no los tienen**: el riego es semi-tecnificado y manual |

---

## 6. Los ritmos del trabajo

El campus no se mantiene igual todo el año. Estas frecuencias son parte del dominio:

| Actividad | Frecuencia | Detalle |
|---|---|---|
| **Riego** | Campus completo cada **15 días** | 3 sectores de riego · 5.5 h/día de bomba en verano, 3 h en invierno |
| **Corte de césped** | Cada **30-45 días** | Teóricamente 21, pero el clima de Lima lo estira. El corte completo se hace en **3-4 días** |
| **Control fitosanitario** | **Estacional**, cada 3 meses | Aplicación a todo el campus. Puede haber refuerzos según la plaga |
| **Poda mayor** | **Anual**, diciembre-enero | Durante el cierre del campus. ~200-250 árboles en ~20 días |
| **Poda a demanda** | ~3 veces al año | Sin frecuencia fija. Se activa por riesgo |
| **Mantenimiento de jardines** | Diario | Es el trabajo de fondo del personal estable |

**Un matiz sobre el corte de césped:** la teoría dice 21 días, pero Robert corta cada 30-45 según
la estación — en verano crece más rápido, en invierno más lento. Además, **los eventos del campus
condicionan cuándo se puede intervenir**: es una ciudad universitaria con actividades constantes.
El servicio se hace en **4 días consecutivos**, buscando fines de semana sin eventos.

> **2026 fue un año atípico:** «casi como si tuviéramos un verano eterno». Sin invierno frío, las
> plagas no se redujeron y hubo que cortar más seguido (cada 30-35 días). Van por el **tercer
> control fitosanitario** y podría hacer falta uno más. Esto explica por qué las frecuencias
> nunca son fijas: **el clima manda**.

### 6.1 El ciclo de riego en detalle

Es el proceso mejor explicado de toda la entrevista, y la métrica principal de la sección.

**Cómo funciona:** cada sector tiene su **turno semanal de riego**, de lunes a sábado.

```
Semana 1:  Sector A riega (9 personas, 4.5 ha)
Semana 2:  Sector B riega (9 personas, 4.5 ha)
           Sector C (3 ha, 7 personas) se solapa con ambos
           los jueves, viernes y sábado
                              ↓
           Campus completo regado en 15-16 días
```

Robert usa una analogía que vale la pena recordar: **«cada capataz es una electroválvula»**. El
riego del campus es manual, pero funciona como un sistema automatizado — se activa un sector,
cubre sus hectáreas, y pasa al siguiente.

**No todas las zonas se riegan igual.** Las de alto tránsito o suelo muy poroso necesitan dos o
tres pasadas; otras se cubren con las cinco horas del turno y se pasa al siguiente sector.

**El horario tiene una razón que no es agronómica:** se riega de **6:30-7:00 a 11:30 como tope**.
Después de esa hora ya no se riega, para que al mediodía las áreas verdes estén **disponibles para
los estudiantes** — que almuercen, descansen, hagan picnic. Antes se regaba hasta las 3 o 4 de la
tarde y eso molestaba a la comunidad.

> **Por qué importa para el sistema:** el riego no es solo una actividad más. Tiene turnos,
> solapamientos, una ventana horaria y una métrica de cobertura. Es el proceso con más estructura
> de todos.

---

## 7. Las métricas que ya reporta

Robert las expresó como **metas de cobertura**, no como promedios:

| Métrica | Meta |
|---|---|
| **Cobertura mensual** | **100% de las 15.6 ha** al mes: riego, mantenimiento, perfilado y reposición de plantas |
| **Poda mayor** | Mínimo **1 al año** (215-230 árboles de gran envergadura) |
| **Control fitosanitario** | Mínimo **4 al año** (uno estacional), más los que exija el clima |
| **Corte de césped** | Cada **30-45 días**, servicio completo en 4 días |

### 7.1 Sobre el impacto económico

Le preguntamos directamente si hay pérdidas económicas. **Su respuesta fue que no**, y el matiz
importa:

- **No hay pérdida de ejemplares** por plagas no atendidas.
- Sí hubo **ahorro** desde que existe la sección: antes se regaba sin programación (5, 7, 8 horas,
  hasta las 4 de la tarde); ahora la rutina está acotada por estación.
- **Se puede ahorrar más**, pero requiere inversión: hay proyectos para pasar a **riego
  automatizado** (electroválvulas, pop-up, cañones) que permitiría regar de madrugada. Son
  proyectos a **1-3 años**, de Infraestructura, **fuera de nuestro alcance**.

> **Conclusión para el proyecto:** el valor no es ahorrar dinero. Es **visibilidad y
> trazabilidad** — poder mostrar dónde se interviene, con qué frecuencia y con qué recursos.

### 7.2 El riesgo que sí les preocupa

No es económico, es de **seguridad**. El campus tiene veredas antiguas de **piso lucido**, que con
garúa o salpicaduras de aspersor se vuelve **muy resbaladizo**. San Miguel es zona húmeda en
invierno.

Por eso, en esas zonas se riega con **preventores, conos y cintas**. No pueden modernizar las
veredas —eso es presupuesto de Infraestructura—, así que lo manejan con prevención.

> Existe una **matriz de control de incidentes** con esta información. Robert dijo que **puede
> comentarla pero no compartirla**: es información sensible que se maneja con la jefatura.

---

## 8. Cómo trabajan hoy (el sistema que vamos a reemplazar)

### 8.1 El panorama

- **Todo está en Excel**, repartido en **varios Google Drives sin conexión entre sí**.
- Los llena el **practicante de la sección** o **Robert mismo**.
- No hay Power BI ni ninguna herramienta que cruce información.
- Para consultar algo, se busca **a mano** en el archivo que toque.
- Intentaron un **mapa interactivo con tecnología Google** para visualizar las atenciones.

La aspiración que Robert declaró: **«tener una información maestra»** donde se pueda sistematizar
todo. Eso —no el registro de actividades en sí— es el problema que el proyecto resuelve.

### 8.2 Qué contiene el Excel que nos dieron

Nueve hojas. Las importantes:

| Hoja | Qué tiene |
|---|---|
| **`tipo de actividades`** | El catálogo maestro: 9 clases de actividad, 45 tipos detallados |
| **`lugares`** | 75 lugares del campus con coordenadas GPS |
| **`2026`** | 283 actividades registradas (enero-agosto 2026) |
| **`Podas arbpalm`** | 25 podas con código de incidencia, cantidades y ficha técnica |
| **`tipologia de flora`** | 9 tipos de vegetación |
| **`Periféricos`** | Trabajos fuera del campus (San Miguel, Chorrillos, Codesido, Mausoleo) |
| **`PUCP`** (oculta) | 368 registros históricos; los 337 con fecha van de marzo 2025 a febrero 2026 |

### 8.3 Las 9 clases de actividad

Esta es la taxonomía real del cliente, en **dos niveles** (clase → tipo):

| Clase | Tipos | Grupo responsable |
|---|---|---|
| Habilitación de jardines | 6 | jardineros |
| Rehabilitación y rediseño | 7 | jardineros |
| **Mantenimiento de jardines** | 10 | jardineros |
| **Poda** | 4 | jardineros |
| Propagación y plantación | 10 | jardineros |
| Riego | 4 | jardineros |
| **Manejo fitosanitario** | **0 — vacía** | `herts` |
| Manejo de residuos vegetales | 4 | jardineros / `herts` |
| **Inspección y monitoreo** | **0 — vacía** | `Roobert` |

> **Dos clases están declaradas pero vacías**, y son justo las asignadas a grupos que no son
> «jardineros». No sabemos aún qué son `herts` ni `Roobert`.

### 8.4 Qué tan bien se registra (la realidad)

De las 280 filas de 2026:

| Campo | Vacío |
|---|---|
| Estado | **81%** |
| Coordenadas | **63%** |
| Responsable | **38%** |
| Tipo de actividad | 38% |
| Foto | 22% |

Además: **abril no tiene ni una sola fila**, los nombres están sin normalizar («Alfonso» y
«Alfonso Garay» son la misma persona), y hay celdas con varios lugares a la vez («Comedor Central,
Gastronomía y Matemática»).

> **Cómo leer esto:** no es descuido, es lo que pasa cuando el registro es opcional y manual.
> Es justo el problema a resolver — pero también una advertencia: si el sistema exige demasiados
> campos obligatorios, la gente dejará de usarlo.

### 8.5 Quién ejecuta y quién registra NO son los mismos

Esta distinción es fundamental y la segunda entrevista la dejó clara:

| | Quiénes | Qué hacen |
|---|---|---|
| **Ejecutan** | **3 capataces / jefes de grupo**: Alfonso, Óscar, Andrés (+ ~25 jardineros) | Hacen el trabajo y **reportan sus actividades** verbalmente |
| **Registran** | **Robert**, **Carolina** (su asistente) y **Fabiola Llullo** (locadora por servicios) | Recogen esos reportes y los vuelcan al Excel |

> **Los capataces NO leen el Excel.** Robert fue explícito: *«ellos no tienen ninguna lectura de
> este documento, lo que sí nos reportan son las actividades»*. Saben lo que pasa en su sector y
> cumplen su rutina, pero la matriz es una herramienta de gestión, no de campo.

**Por qué importa para el diseño:** hoy hay un **intermediario** entre quien hace el trabajo y
quien lo registra. Robert quiere cambiar eso — ver §8.7.

Los nombres que aparecen en el Excel de 2026 son los de los capataces (Alfonso 69, Óscar 56,
Andrés 48): son **a quién se le atribuye el trabajo**, no quién tecleó la fila.

### 8.7 Lo que Robert quiere que los capataces reporten

Dijo algo muy concreto sobre hacia dónde le gustaría ir: que **los capataces reporten el consumo
de recursos** directamente.

> «Sería mucho más interesante ver que ellos lo reporten. O tener una herramienta en la cual ellos
> van reportando el consumo: *hoy consumí 5 sacos de arena, hoy consumí 20 sacos de confitillo*.
> Y de alguna forma un poquito **amable**, que ellos puedan interactuar y compartir esa data.»

Tres cosas de esa frase merecen atención:

1. Es un **cambio de modelo**: de «el capataz reporta al jefe y el jefe registra» a «el capataz
   registra».
2. El recurso que le interesa es el **consumo de insumos** (arena, confitillo, abono, plantas).
   Hoy la oficina no planifica cuánto se usa.
3. La palabra **«amable»** no es decorativa. Son personas con 30-40 años de oficio, no usuarios de
   software. Si la herramienta les resulta incómoda, no la usarán.

### 8.8 Las actividades no siempre duran un día

Robert dio un ejemplo real que conviene tener presente: una nueva área verde junto a las losas
deportivas de Minas.

- **350 m² de césped** instalados y **10 cerezos japoneses** sembrados.
- Había ~100 matas de *Peniceti*: **45 se reubicaron** en macetas en el perímetro de Riva-Agüero,
  **60 se dividieron** y se replantaron en el mismo espacio como diseño decorativo.
- **Empezó a fines de junio. Terminó a principios de septiembre.** Más de dos meses.

> Durante un trabajo así **se cruzan varias actividades** (movilización de materiales, preparación
> de suelos, traslado de césped, destacar personal) y los capataces **sí hacen reportes
> intermedios**. Otras intervenciones, en cambio, empiezan y terminan el mismo día.

### 8.9 El mapa interactivo — lo más parecido a un sistema que ya tienen

**Esto es lo más importante de la segunda entrevista.** No parten de cero: ya tienen una
herramienta funcionando, y hay que entenderla antes de proponer nada.

| Qué es | Un mapa de varias **capas** sobre el campus |
|---|---|
| **Quién lo usa** | Las **tres secciones** de OSG, no solo Áreas Verdes |
| **Quién lo mantiene** | La propia sección de Áreas Verdes |
| **Qué capas tiene** | Catastro de áreas verdes · Inventario forestal (los ~1.000 árboles) · Sectores de mantenimiento · Actividades con coordenadas y fotos |
| **Cómo se alimenta** | **Carolina lo actualiza semanalmente** desde el Excel |
| **Para qué sirve** | Ver **dónde se está interviniendo**: qué zonas reciben muchas atenciones y cuáles pocas, para equilibrar el mantenimiento |

> **Robert no pidió reemplazarlo.** Pidió *«desarrollar algún tipo de aplicación que pueda
> enlazarse a este insumo»* y que la actualización sea **más eficaz** — hoy depende de que Carolina
> cargue los datos a mano cada semana.
>
> **Cómo leerlo:** el mapa es el aliado, no el competidor. El dolor no es que no vean el campus —
> es que **alimentarlo es manual**.

*(Intentó mostrárnoslo en pantalla pero no cargó. Quedó pendiente para la próxima reunión.)*

> **Decisión del equipo: nos integramos con él**, no construimos uno nuevo ni lo reemplazamos.
> Lo que falta averiguar está en
> [`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md).

---

## 9. El catastro: el gran vacío

Esto merece sección propia porque es probablemente lo más importante del proyecto.

**No existe un catastro actualizado.** Robert: *«No existe un catastro. Estamos justo en ese
proceso de actualizar el catastro»*.

Pero no se parte de cero. Hay **tres piezas heredadas**, cada una incompleta:

| Pieza | Qué es | Su problema |
|---|---|---|
| **Catastro de áreas verdes** | Levantado por **Infraestructura** (la fuente sería GIM), año desconocido, previo a la sección. Probablemente por teledetección | **Desfasado**: hay áreas marcadas como verdes que hoy son edificios, y al revés — aulas modulares que hoy son jardines |
| **Inventario de especies** | Lista botánica: especie, familia, característica forestal, **altura, diámetro de copa, fuste** | **Sin coordenadas.** Se ubica solo por «cuartel 1… cuartel 18» |
| **Inventario forestal nuevo** | Captura de árboles **con coordenadas GPS** | **Al 30-35%** |

### 9.0 La cifra concreta del catastro

**~3.500 árboles en el campus. ~1.000 capturados con coordenadas.** Eso es el 30-35% que Robert
menciona, y están ya en el mapa interactivo.

Lo levanta **un ingeniero del campus** (personal PUCP, distinto de Carolina que es locadora). El
avance se incorpora conforme entrega productos.

### 9.1 Tres fuentes que hay que fusionar

Este es el reto real del catastro, y conviene verlo claro:

```
Inventario de especies        →  tiene datos botánicos, NO tiene coordenadas
                                  (se ubica por cuartel)
Inventario forestal nuevo     →  tiene coordenadas, cubre solo el 30%
Catastro de áreas verdes      →  tiene superficies, está desfasado
                                        ↓
                          Hay que unirlos en uno solo
```

El puente entre el inventario botánico y el georreferenciado **es el cuartel** — por eso, aunque
esté en desuso operativo, hay que conservarlo (§5.3).

### 9.2 La ortofoto con dron

Una **tesista** está levantando una ortofoto del campus con dron, con precisión de **2-3 cm**
—«una precisión que tal vez ni el GPS alcanza»—. Existe además una ortofoto histórica de
**2015-2016** que permitiría comparar cómo cambió el campus.

Robert quiere enlazarla con el catastro forestal y dijo que **le encantaría que su trabajo y el
nuestro se sumen**. Es un proyecto paralelo al nuestro, no un competidor.

### 9.3 Cómo miden el estado de conservación

Le preguntamos con qué escala miden la salud de un ejemplar. **No hay una escala numérica.** Lo
valoran por tres dimensiones:

| Dimensión | Qué observan |
|---|---|
| **Intensidad de uso** | Hay espacios muy transitados y otros poco. Condiciona su conservación |
| **Tipo de cobertura** | Áreas extensas simples vs. ambientes con criterio de diseño o decoración |
| **Estado sanitario** | Presencia o ausencia de plagas y enfermedades |

Para el **arbolado** hay criterios adicionales de crecimiento: ramas **elongadas** por el clima,
**deformaciones**, y especies que **no eliminan su follaje naturalmente** y requieren poda
asistida. Todo esto **varía de especie en especie**.

> Aquí no hay un dato listo que copiar. Si el sistema necesita un «estado de conservación», habrá
> que proponer una escala y validarla con el cliente.

### 9.4 El problema de los códigos

Los árboles antiguos tienen **placas de aluminio** con códigos de un inventario de hace décadas.
No sirven:

- Hay árboles **sin placa** (plantados después, o se perdió).
- Hay placas de ejemplares **que ya no existen**.
- Hay placas **reasignadas**: Robert cuenta que un código de un eucalipto *«se lo puso a una
  palmera»* porque alguien encontró el alambre suelto.

Su conclusión: hace falta **una codificación nueva** y una actualización completa del inventario.

### 9.5 El campus cambió mucho

Un par de datos que dan idea de por qué el inventario viejo no sirve:

- Donde hoy está el **edificio McGregor** había un bosque de eucaliptos. Quedan tres o cuatro.
- Donde está el **edificio Centenario** había araucarias y eucaliptos. Queda una araucaria.

El campus tiene **109 años** y ha sido zona agrícola, zona de rosales, y ha tenido riego por
gravedad completo. Por eso Robert insiste en que los procesos deben ser **flexibles**: el terreno
es heterogéneo en suelos, plantas y arborización, y no admite un procedimiento rígido único.

---

## 10. Cómo fluye una incidencia

Una **incidencia** es un problema detectado: una rama que amenaza caer, una planta muerta, un
árbol que estorba el paso.

```
Alguien detecta un problema
   │
   ├── ¿De dónde viene?
   │     ├── Sección de Supervisión de Campus  →  código OSG-####
   │     ├── Una unidad, vía plataforma CENTURIA →  código de Centuria
   │     ├── Oficina de Seguridad (ramas que activan sensores)
   │     └── Nadie: lo detecta el propio personal en su rutina
   │
   ├── Prioridad:  alta · media · baja
   │
   └── ¿Quién lo atiende?  →  lo decide el TAMAÑO DEL ÁRBOL
        │
        ├── < 5 m  →  PERSONAL ESTABLE
        │      └── Orden verbal al jefe de grupo
        │          Se cierra en 3-5 días. Sin documentación de por medio
        │
        └── > 5 m  →  TERCERIZADO
               └── Requerimiento → Logística cotiza → traer al proveedor →
                   revisar el arbolado → cotizar → ejecutar → conformidad →
                   AVISAR A LA UNIDAD que pidió
                   Puede tomar MÁS DE UNA SEMANA
```

### 10.1 Hay dos sistemas de códigos, no uno

Esto se aclaró en la segunda entrevista:

| Código | De dónde viene | Para qué |
|---|---|---|
| **`OSG-####`** | Matriz de incidentes de la **Sección de Supervisión de Campus** | Atenciones menores, casi siempre de **transitabilidad** o reducción de riesgo (ramas que obstaculizan, árboles con espinas). Se resuelven en minutos u horas |
| **Código Centuria** | **Plataforma de la universidad** por la que cualquier unidad pide atención | Pedidos «a demanda», sobre todo **arbolado interior** de los edificios |

**El arbolado interior es un caso frecuente y con matiz.** Las facultades más antiguas tienen
árboles en sus patios que las unidades **aprecian** — piden que se poden «de la forma más estética
posible», conservando su forma, no una poda de limpieza agresiva.

### 10.2 Por qué la poda tiene «cantidad pedida» y las demás no

Le preguntamos por qué solo las podas registran pedido vs. ejecutado. La respuesta: **la poda
tiene dos naturalezas**.

- **Poda rutinaria** — la que decide la sección por criterio propio (transitabilidad, sanidad,
  limpieza). No hay «pedido»: se hace lo que se ve.
- **Poda a demanda** — alguien la solicita, con fecha de inicio y fin. **Ahí sí hay un pedido
  contra el cual medir.**

### 10.3 Cuándo se cierra una atención

| Caso | Cierre |
|---|---|
| Poda menor (< 5 m), sin escaleras | **3-5 días.** Se cierra «casi de inmediato» |
| Requiere escaleras | Necesita **ficha con prevencionista** — el uso de escaleras está muy regulado |
| Tercerizado (> 5 m) | Más de una semana. Al terminar hay que **avisar a la unidad** que lo pidió |

---

## 11. Lo que NO sabemos todavía

Tan importante como lo anterior. **Si alguien te dice que esto está decidido, no lo está.**

### 11.1 Archivos que el cliente mencionó y no tenemos

Robert **se comprometió a compartir** los tres primeros en la segunda entrevista:

| Archivo | Estado | Para qué lo necesitamos |
|---|---|---|
| **Inventario de especies** | ✅ Prometido | Datos botánicos: especie, familia, altura, diámetro de copa, fuste. **Sin coordenadas** — se ubica por cuartel |
| **Shapes de los ~100 jardines** | ✅ Prometido | Tienen **código numérico y coordenadas**. Es la unidad de control del corte de césped |
| **Capas de cuarteles** | ✅ Prometido («creo que sí lo tengo en algún lugar») | Permite interpretar el inventario de especies |
| **Reportes de tercerizados** | 🔄 Los está compilando | Estaba terminando de reunirlos cuando hablamos |
| **Matriz de incidencia** | ❓ Sin confirmar | Definiría los tipos de incidencia |
| **Un contrato tipo** | ❓ Sin confirmar | Todo lo tercerizado |
| **El documento de gestión que entrega a OSG** | ❓ Sin confirmar | El reporte que el sistema debería generar |
| **Matriz de control de incidentes** | ❌ **No se comparte** | Es sensible, se maneja con la jefatura. Robert puede comentarla, no entregarla |

### 11.2 Decisiones de alcance — casi todas cerradas

| Pregunta | Respuesta |
|---|---|
| ¿Los **periféricos** entran? | **No en el mínimo.** Son solo 2 (Codesido y Chorrillos), atención **trimestral** = 4 al año. «La mayor dinámica es el campus» |
| ¿Cubre **todo el campus Pando**? | **Sí**, eso es el mínimo |
| ¿Se mantienen las **9 clases** de actividad? | **Sí.** Robert quiere registrar los matices, no solo las 4 gruesas |
| ¿Qué pasa con las **áreas fuera de los muros**? | **No son de la PUCP.** Son retiros municipales de San Miguel (§11.4) |
| ¿Entra el **zoocriadero**? | ❓ Sin resolver — es fauna |
| ¿Entra el **vivero**? | 🔄 Aparece ligado al mantenimiento: se saca stock de plantas para rehabilitar jardines |
| ¿Entra el **control de insumos**? | 🔄 Robert lo quiere (§8.7), falta definir alcance |

### 11.3 Contradicciones entre fuentes

| Tema | Qué pasaba | Estado |
|---|---|---|
| Zonificación | El Excel tiene 75 lugares planos; la 1.ª entrevista hablaba de 17 cuarteles | ✅ **Resuelto** — pero al revés de lo que creíamos: los cuarteles están **en desuso**, los sectores son la división viva (§5) |
| Qué es «sector» | Tres significados en la misma hoja | ✅ **Resuelto** — son 3 sectores de mantenimiento reales y fijos |
| Cobertura | El Excel solo cubre personal estable | ✅ **Resuelto** — cubre media operación |
| Taxonomía | «Cuatro actividades» vs. 9 clases | ✅ **Resuelto** — las 4 son ejes gruesos; se mantienen las 9 |
| Mapeo lugar → cuartel | Solo 2 de 283 filas lo mencionan | ⚠️ **Abierto, pero baja prioridad** — ya no bloquea reportes operativos, solo la lectura del inventario antiguo |

### 11.4 Un límite de alcance que conviene tener claro

Las áreas verdes **fuera de los muros** del campus (por ejemplo hacia la Puerta Urubamba) **no son
de la PUCP**: son **retiros municipales** de San Miguel, y la municipalidad los mantiene desde hace
más de una década.

**Pero sí aparecen registros del personal PUCP trabajando ahí.** La razón: el perímetro tiene
**sensores de movimiento e infrarrojos**, y las ramas que crecen desde fuera los activan y generan
falsas alarmas. **La Oficina de Seguridad pide podarlas**, a demanda, no como rutina programada.

> Si ves una actividad en un lugar que parece fuera del campus, probablemente sea esto.

---

## 12. Las cifras del dominio

Para tener sentido de escala:

| Dato | Valor |
|---|---|
| Superficie del campus | **41 ha** |
| De ellas, áreas verdes | **15.6 ha** |
| Antigüedad del campus | **109 años** |
| **Árboles en el campus** | **~3.500** |
| **Árboles ya capturados con coordenadas** | **~1.000** (30-35%) |
| Sectores de mantenimiento | **3** (~4.5 + ~4.5 + ~3 ha) |
| **Personal de campo** | **~25** jardineros (9 + 9 + 7) + 3 capataces |
| Cobertura por persona | **~5.000 m²** |
| Lugares con coordenadas | **75** |
| Jardines en la ruta de corte | **~100** (con código numérico y shape) |
| Cuarteles forestales | **17** vigentes (de 18) — **en desuso** |
| Árboles en la poda anual | **215-230** |
| Controles fitosanitarios al año | **4** mínimo (uno estacional) |
| Actividades registradas en 2026 | **283** (enero-agosto) |
| Quienes registran en el Excel | **3**: Robert, Carolina, Fabiola |
| Empresas contratistas | **2** (relacionadas entre sí) |
| Periféricos atendidos | **2** (Codesido y Chorrillos), trimestralmente |

> **Es un sistema de bajo volumen y alta trazabilidad.** El valor no está en procesar muchos
> datos, sino en que cada intervención quede registrada y se pueda reconstruir la historia de un
> árbol o de un jardín. Ninguna decisión del proyecto debería justificarse por escala.

---

## 13. Por dónde seguir

| Documento | Qué encontrarás |
|---|---|
| [`catalogo-requisitos.md`](catalogo-requisitos.md) | Los 72 requisitos por módulo, con su prioridad, el dolor que atacan y qué los bloquea |
| [`integracion-mapa-interactivo.md`](integracion-mapa-interactivo.md) | Qué necesitamos saber para integrarnos con el mapa que ya usan |
| [`docs/entrevistas/02-cuestionario-segunda-reunion.md`](../entrevistas/02-cuestionario-segunda-reunion.md) | Las preguntas abiertas, con el contexto de cada una |
| [`specs/fundacionales/SPEC-005`](../../specs/fundacionales/SPEC-005-actualizacion-modelo-operacion-real.md) | Cómo se tradujo todo esto a un modelo de datos, con las decisiones y su porqué |
| [`specs/REGISTRO.md`](../../specs/REGISTRO.md) | El estado de todos los specs y las decisiones abiertas |
| [`README.md`](../../README.md) | Lo técnico: cómo levantar el proyecto |

---

## Apéndice — Errores que es fácil cometer

Cosas que ya nos pasaron o estuvimos a punto de hacer:

1. **Tratar el Excel como si fuera el sistema a replicar.** Es el síntoma del problema, no el
   modelo. Pero tampoco es basura: contiene la taxonomía real y las coordenadas reales.
2. **Creer que los cuarteles forestales son la zonificación oficial.** Lo parecían en la primera
   entrevista; en la segunda Robert aclaró que **casi no los usa**. La división viva son los
   **3 sectores de mantenimiento** y los **referentes** (edificios, facultades, vías).
3. **Confundir el sector con la persona que lo dirige.** El sector es territorio fijo; el capataz
   solo lo etiqueta. Nunca crear una zona llamada «Alfonso».
4. **Asumir que el Excel cubre toda la operación.** Le falta la mitad tercerizada.
5. **Pensar que parten de cero.** Ya tienen un **mapa interactivo** funcionando, compartido entre
   las tres secciones de OSG. El dolor es que alimentarlo es manual.
6. **Confundir «instalación de césped» con «corte de césped».** La primera la hace el personal
   estable (colocar champa nueva); la segunda es tercerizada.
7. **Dar por hecho que hay 4 actividades y ya.** Son cuatro **ejes gruesos** — se mantienen las
   9 clases, porque durante el trabajo real «se traslapan varias actividades adicionales».
8. **Creer que quien ejecuta es quien registra.** Los capataces reportan verbalmente; Robert,
   Carolina y Fabiola vuelcan al Excel. **Los capataces no leen el Excel.**
9. **Suponer que una actividad dura un día.** Hay trabajos de **más de dos meses** (§8.8).
10. **Asumir que solo hay un sistema de códigos.** Hay dos: **OSG** (matriz de incidentes de
    Supervisión de Campus) y **Centuria** (plataforma de la universidad).
11. **Diseñar una herramienta compleja para los capataces.** Robert pidió explícitamente que sea
    **«amable»**: son personas con 30-40 años de oficio, no usuarios de software.
12. **Buscar justificar el proyecto por ahorro económico.** Robert dijo que **no hay pérdidas**.
    El valor es **visibilidad y trazabilidad**.
