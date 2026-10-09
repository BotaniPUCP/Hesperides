# Etiquetas del mapa — diferencias con el prototipo v39

> **Estado: pendiente.** Este documento explica por qué los textos que aparecen sobre los
> edificios y jardines del mapa no coinciden con los del prototipo
> `Campus_PUCP_3D_v39_edificio_contiguo.html`, y propone cómo resolverlo. Nada de esto afecta al
> buscador, a las fichas ni a la descripción de ubicaciones: solo a las etiquetas de la maqueta.

---

## 1. De dónde sale cada etiqueta

| | Prototipo v39 | Nuestro mapa (`components/map3d/viewer/labels.ts`) |
|---|---|---|
| **Nombre del edificio** | El nombre de **OpenStreetMap** de cada edificio | El nombre del **vocabulario de edificios** guardado en `campus_buildings.name` (`V011`). Es el mismo que usan el buscador y la descripción de ubicaciones |
| **Acortado** | Una tabla de **26 abreviaturas** solo para etiquetas, más quitar «Facultad de», «Departamento de» → «Depto.», «Sección» y lo que va entre paréntesis | Solo las reglas generales (`shortName`): quitar «Facultad de», «Departamento de» → «Depto.», «Sección» y los paréntesis. **No tiene la tabla** |
| **Jardines** | Nombres de las áreas verdes **y** de los jardines de reserva | Solo nombres de áreas verdes |
| **Un nombre, varios edificios** | Una etiqueta por nombre, sobre el edificio más grande | Igual |

## 2. Diferencias de nombre, edificio por edificio

De los 62 edificios del campus con nombre en OpenStreetMap, **40 coinciden** con nuestro vocabulario
y **22 no**:

| Nombre en OpenStreetMap (v39) | Nombre en nuestra base | Observación |
|---|---|---|
| Artes Escénicas | Facultad de Artes Escénicas (FARES) | |
| Biblioteca Central Luis Jaime Cisneros | Biblioteca Central | |
| Biblioteca de Ciencas Sociales Alberto Flores Galindo | **Facultad de Ciencias Sociales** | ⚠️ ¿Es la biblioteca o la facultad? Revisar en el vocabulario |
| CEPREPUC (Pabellon P) | CEPREPUC | |
| Cafetería de Letras | Comedor de Letras | |
| Centro de Tecnologías Avanzadas de Manufactura | CETAM | |
| Coliseo Polideportivo | Polideportivo | |
| Complejo De Innovación Académica | CIA (Complejo de Innovación Académica) | |
| Departamento de Ciencias Sociales | Departamento Académico de Ciencias Sociales | |
| Departamento de Educación | **Facultad de Educación** | ⚠️ En nuestra base el Departamento y la Facultad se llaman igual, así que sale **una sola etiqueta** donde el prototipo tenía dos («Educación» y «Depto. Educación»). Revisar en el vocabulario |
| Edificio Oficinas Administrativas | Edificio Administrativo | |
| Estudio de Tv | Estudio de TV 2 | |
| Facultad de Contabilidad y Administracion | Facultad de Ciencias Contables | |
| Facultad de Escuela de Gobierno y políticas Públicas | Escuela de Gobierno y Políticas Públicas | |
| Facultad de Estudios Generales Ciencias (Pabellon E) | Estudios Generales Ciencias | |
| Instituto de Radioastronomía | INRAS (Instituto de Radioastronomía) | |
| Juan Valdez Café | Juan Valdez | |
| Pabellón A | Aulario (Pabellón A) | |
| Pabellón V - Sección Electrónica, Informática y Telecomunicaciones | Pabellón V | |
| Sección Ingenieria Industrial | Sección Ingeniería Industrial | |
| Sección Ingeniería Mecánica ( Pabellón U ) | Sección Ingeniería Mecánica | |
| Sección Química | Química | |

La mayoría son la misma cosa con otra forma de escribirla; nuestra versión suele ser mejor (tildes
corregidas, sin «Facultad de Escuela de…»). Las dos marcadas con ⚠️ pueden ser errores del
vocabulario.

## 3. Abreviaturas del prototipo

La tabla `SHORT` del v39, tal cual. Sus claves son **nombres de OpenStreetMap**, así que no se
aplican directamente a nuestros nombres: hay que traducirlas (§5).

| Nombre completo | Etiqueta |
|---|---|
| Facultad de Escuela de Gobierno y políticas Públicas | Gobierno y Políticas Públicas |
| Pabellón V - Sección Electrónica, Informática y Telecomunicaciones | Pabellón V |
| Biblioteca Central Luis Jaime Cisneros | Biblioteca Central |
| Facultad de Estudios Generales Ciencias (Pabellon E) | EEGGCC |
| Estudios Generales Letras | EEGGLL |
| Biblioteca de Ciencas Sociales Alberto Flores Galindo | Biblioteca de CCSS |
| Facultad de Contabilidad y Administracion | Contabilidad |
| Sección Ingeniería Mecánica ( Pabellón U ) | Pabellón U |
| Centro de Tecnologías Avanzadas de Manufactura | CETAM |
| Complejo De Innovación Académica | Complejo de Innovación |
| Facultad de Ciencias y Artes de la Comunicación | Comunicaciones |
| Facultad de Gastronomía, Hotelería y Turismo | Gastronomía |
| Facultad de Letras y Ciencias Humanas | Letras |
| Facultad de Gestión y Alta Dirección | Gestión |
| Facultad de Arquitectura y Urbanismo | Arquitectura |
| Facultad de Ciencias e Ingeniería | Ciencias e Ingeniería |
| Facultad de Ciencias Sociales | Ciencias Sociales |
| Departamento de Ciencias Sociales | Depto. CCSS |
| Edificio Oficinas Administrativas | Oficinas Administrativas |
| Instituto Corrosión y Protección | Corrosión y Protección |
| Laboratorio de Mecánica de Suelos | Mecánica de Suelos |
| Laboratorio de hidraulica | Lab. de Hidráulica |
| Facultad de Psicología | Psicología |
| Facultad de Educación | Educación |
| Facultad de Derecho | Derecho |
| CEPREPUC (Pabellon P) | CEPREPUC |

## 4. Jardines de reserva: el nombre no se guardó

El prototipo etiqueta también los 20 jardines de reserva («Jardín Humanidades bloque B», «Jardín
Palmeras (Gastronomía)», «Jardín CAPU»…). En nuestra carga (`scripts/mapa/zonas.py`,
`aplicar_reserva`) cada jardín de reserva **marcó como reservable la sección que lo contiene**,
pero **su nombre propio no se guardó**. Solo sobrevivió cuando el jardín se volvió subsección
(«Jardín Frutas» y «Jardín Frutas-Lado FCCSS», en `AV-0151`). Por eso esas etiquetas no pueden
mostrarse hoy: el dato no está en la base.

Los 19 nombres que faltan: Jardin H · Jardin física · Jardín CAPU · Jardín Comedor Arte Antiguo
(centro) · Jardín Comedor Arte Antiguo (lado EEGGCC) · Jardín Comedor Central · Jardín Comedor
Letras · Jardín DAES · Jardín Estudio de TV (Paredón) · Jardín Facu Sociales · Jardín Frutas ·
Jardín Frutas-Lado FCCSS · Jardín Humanidades bloque A · Jardín Humanidades bloque B · Jardín Lidera
· Jardín Palmeras (Gastronomía) · Jardín Rosales · Jardín Tesorería · Jardín Tinkuy. Algunos ya
coinciden con el nombre de su sección («Jardín DAES», «Jardín Lidera»).

## 5. Propuesta para resolverlo

1. **Mantener nuestros nombres** como fuente de las etiquetas. Son los del buscador y los de la
   descripción que se guardará en las incidencias: una etiqueta distinta confundiría.
2. **Revisar los dos ⚠️ del §2** en `docs/dominio/datos/fuentes-mapa/vocabulario-edificios.json`
   (Ciencias Sociales y Educación) y regenerar la semilla.
3. **Portar la tabla de abreviaturas** a `labels.ts`, con las claves traducidas a nuestros nombres
   (por ejemplo «Estudios Generales Letras» → «EEGGLL», «Estudios Generales Ciencias» → «EEGGCC»,
   «Escuela de Gobierno y Políticas Públicas» → «Gobierno y Políticas Públicas»). Mejor aún: guardar
   la abreviatura como dato del edificio (una columna `short_name` en `campus_buildings`), para que
   se pueda corregir sin tocar código.
4. **Guardar el nombre de los jardines de reserva** (por ejemplo, una columna `reservation_name` en
   `zones`, cargada desde `jardines_reserva.geojson`) y etiquetarlos como hacía el prototipo.

**Decisión pendiente:** si el Departamento de Educación y el de Ciencias Sociales deben tener nombre
propio en el vocabulario.
