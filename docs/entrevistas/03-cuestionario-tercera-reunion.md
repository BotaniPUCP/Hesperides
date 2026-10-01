# Cuestionario — Tercera reunión con el usuario

| Campo | Valor |
|---|---|
| Entrevistado | Robert Sánchez, jefe de la Sección de Áreas Verdes y Medio Ambiente (OSG · DAF) |
| Fuentes previas | Entrevistas 1 y 2 · Excel operativo 2025-2026 · `catastro campus.xlsx` · decisiones de alcance del 25 sep 2026 |
| Objetivo de la reunión | **Validar las definiciones que propone el equipo** (cobertura, tiempos de atención, reportes) y el alcance decidido |

> **Cómo usar este documento.** Igual que el cuestionario de la 2.ª reunión: cada pregunta trae
> **lo que ya sabemos** antes de la pregunta misma, para no hacerle repetir lo que ya dijo. Entre
> paréntesis, el requisito del [catálogo](../dominio/catalogo-requisitos.md) que la respuesta
> desbloquea.
>
> **Marcas:** 🔴 bloquea un requisito Alta · 🟡 afecta al diseño · ⚪ detalle que puede esperar.

---

## Bloque A — Comunicar el alcance decidido

> No son preguntas abiertas: son decisiones del equipo que conviene **contarle y confirmar que no
> chocan con nada que él dé por hecho**. Cinco minutos al inicio evitan sorpresas en la entrega.
> Detalle en [`fuera-de-alcance.md`](../dominio/fuera-de-alcance.md).

### A1 · Quién usará el sistema 🟡

**Lo que decidimos.** La primera versión la usan **él y los 3 capataces**. Operarios, ingeniero de
campo, asistentes y practicantes quedan para una fase futura, como él mismo propuso: *«primero
trabajaremos con sus jefes de grupo»*.

**Pregunta.** ¿Alguien más necesita **consultar** el sistema desde el inicio, aunque no registre
nada? Por ejemplo, Carolina, para copiar a su mapa lo que registren los capataces.

### A2 · Lo que queda para una fase futura 🟡

**Lo que decidimos.** Del servicio tercerizado solo registramos **los datos básicos del proveedor**:
el seguimiento de los servicios, el ingreso de HERS como usuario, la integración con Centuria y la
**integración con su mapa interactivo** quedan para después. Los periféricos no entran. Hesperides
tendrá su propio mapa, pero Carolina seguirá alimentando el suyo.

**Pregunta.** ¿Hay algo de esta lista que él esperaba ver en la primera versión?

---

## Bloque B — El trabajo de las cuadrillas

### B1 · La distribución del personal por actividad 🟡 *(nuevo)*

**Lo que sabemos.** En la 1.ª entrevista dijo que le interesa *«cómo está dispuesto el personal y
cuántas personas se usan para desarrollar cada actividad»*: un capataz puede mandar a sus nueve
personas a un espacio de 300 m² y terminar en media mañana, o mandar a tres o cuatro y cubrir dos
espacios en la jornada. Hoy solo lo sabe **recorriendo el campus**. Y advirtió: *«mientras más
compleja sea, más difícil puede ser que el personal la acepte»*.

**Preguntas.**
- ¿Le basta con saber **cuántas personas** trabajaron en cada intervención, o necesita saber
  **quiénes**?
- ¿Lo necesita **en el momento** (dónde está cada grupo ahora) o **después** (cómo se repartió el
  día o la semana)?
- ¿Cuánto trabajo extra está dispuesto a pedirle al capataz para tener ese dato?

### B2 · La ficha técnica de poda ⚪ *(3.12)*

**Lo que sabemos.** Se llena **solo cuando se usa escalera** y registra herramientas, personal y
prevencionista presente (PUCP o EULEN). En el Excel aparece con una codificación tipo `PO00`.

**Pregunta.** ¿Nos puede compartir **una ficha llenada** para copiar sus campos exactos? ¿Qué
significa la codificación `PO00`?

---

## Bloque C — Qué cuenta como «cubierto»

> **Las dos preguntas más importantes de la reunión.** Sin ellas se pueden construir los
> indicadores de cobertura, pero no calibrarlos, y son los que él reporta hacia arriba.

### C1 · ¿Qué cuenta como «zona cubierta» en el mes? 🔴 *(6.8)*

**Lo que sabemos.** Su meta es *«al mes tenemos que llegar al 100% de esa cobertura, con su riego,
su mantenimiento, su perfilado, su reemplazo de plantas si lo requieren»*, sobre las 15.6 ha.

**Preguntas.**
- ¿Una zona está «cubierta» si recibió **cualquier** intervención en el mes, o tiene que haber
  recibido las cuatro (riego, mantenimiento, perfilado, reposición)?
- ¿La cobertura se mide por **lugar** (los 74 referentes) o por **superficie** (ha)?

### C2 · ¿Qué cuenta como «zona regada»? 🔴 *(7.2)*

**Lo que sabemos.** El ciclo cubre el campus en **15-16 días**, un sector por semana, con el tercer
sector solapándose jueves, viernes y sábado. *«Cada capataz es una electroválvula.»*

**Pregunta.** Al final de un turno, ¿cómo sabe el capataz que su sector quedó regado? ¿Marca
lugares uno a uno, o el turno completo equivale a sector regado?

### C3 · Las zonas que necesitan más de una pasada ⚪ *(7.3)*

**Lo que sabemos.** Hay espacios de alto tránsito o suelo poroso que se riegan dos o tres veces por
turno.

**Pregunta.** ¿Nos puede dar **la lista** de esas zonas?

---

## Bloque D — Incidencias

> Proponemos un **modelo propio**, al estilo de la gestión de incidencias de TI. Estas preguntas lo
> ajustan a su operación; no le pedimos la matriz confidencial.

### D1 · La lista de tipos de incidencia 🟡 *(5.7)*

**Lo que sabemos.** Llevamos un borrador derivado de sus criterios de trabajo: rama caída o en
riesgo, obstrucción de vía peatonal, rama que obstaculiza ventana o acceso, planta muerta, plaga o
enfermedad, árbol con espinas en zona transitada, piso resbaladizo por riego y daño por evento.

**Pregunta.** ¿Qué le quita, qué le cambia y qué le falta a esta lista? *(Corregir en sesión, unos
15 minutos.)*

### D2 · La urgencia 🟡 *(5.1)*

**Lo que sabemos.** La urgencia la decide **dónde está el problema**, no el tamaño del árbol: el
mismo ficus es riesgo bajo en una jardinera retirada y alto sobre el Pontódromo.

**Pregunta.** ¿Hay zonas del campus que **siempre** considera de alto riesgo (vías de alto tránsito,
accesos, zonas de piso lucido)? Si hay una lista, el sistema puede sugerir la urgencia.

### D3 · Tiempos de respuesta comprometidos 🟡 *(5.6)*

**Lo que sabemos.** Personal estable: **3-5 días**. Tercero: **más de una semana**.

**Pregunta.** ¿Hay algún plazo que **se haya comprometido** con OSG o con las unidades? Si lo hay, el
sistema avisa cuando una incidencia urgente se acerca a vencerlo.

### D4 · Los días válidos para maquinaria de corte ⚪ *(5.11)*

**Lo que sabemos.** La maquinaria ruidosa solo trabaja **domingos y feriados**. En la 1.ª entrevista
también mencionó días de asueto, días sin actividad académica y hasta días de paro.

**Pregunta.** Además de domingos y feriados, ¿qué otros días se admiten? ¿Quién decide que un día
es «sin actividad académica»?

---

## Bloque E — Catastro y especies

### E1 · Los tipos de control fitosanitario e inspección ⚪ *(1.4)*

**Lo que sabemos.** En el Excel, las clases «Manejo fitosanitario» e «Inspección y monitoreo»
llegaron sin tipos. Cargamos tipos provisionales.

**Pregunta.** ¿Los revisa y corrige? *(Mostrarle la lista provisional.)*

---

## Bloque F — Reportes

### F1 · Los formatos que ya entrega 🟡 *(6.2 · 6.3 · 6.4)*

**Lo que sabemos.** Hay un **documento de gestión** que entrega a OSG; no lo hemos visto.

**Pregunta.** ¿Nos comparte un ejemplar, aunque sea con los datos tapados? Es, probablemente, el
reporte que el sistema debería generar solo.

---

## Bloque G — Residuos y material

### G1 · El residuo de la poda mayor ⚪

**Lo que sabemos.** La poda mayor atiende 215-230 árboles al año y genera mucho residuo, que va al
centro de acopio. En el Excel, el residuo aparece pero no se mide.

**Pregunta.** ¿Alguien pesa o mide ese residuo? Si hay un volumen que se reporta, cambia la decisión
de no tener un módulo de residuos.

### G2 · El material recuperado ⚪

**Lo que sabemos.** Una hoja oculta del Excel registra traslados de grass y confitillo de un lugar a
otro.

**Pregunta.** ¿Es algo que quiere controlar, o fue una anotación informal?

---

## Cierre — Los archivos que faltan 🔴

| Archivo | Para qué | Estado |
|---|---|---|
| **Confirmar que los shapes de Google Maps traen los 3 sectores** | 1.6 · 1.9 · 2.5 | Por confirmar |
| **Lista de zonas con más de una pasada de riego** | 7.3 | Pendiente |
| **Una ficha técnica de poda llenada** | 3.12 | Nuevo |
| Documento de gestión para OSG | Contrastar nuestra propuesta de reportes | Opcional |

---

## Anexo — Las tres preguntas que no podemos salir sin responder

1. **¿Acepta nuestras reglas de lugar cubierto y lugar regado?** (C1, C2) — calibran los
   indicadores que él reporta a OSG.
2. **¿Los shapes que nos dio traen los límites de los 3 sectores?** — sin ellos no se puede saber a
   qué sector pertenece cada lugar.
3. **¿Le sirve nuestra propuesta de reportes?** (F1) — reemplaza el trabajo manual que hoy hace
   para OSG.
