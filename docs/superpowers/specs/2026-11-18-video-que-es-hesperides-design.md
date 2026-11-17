# Diseño — Video «¿Qué es Hesperides?» (Lucía, don Julio y el mapa 3D al atardecer)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-18 |
| Guion | El del usuario (`guion.txt` en su copia, fuera de git), estructura inspirada en «How GitHub works» |
| Composición | `VideoQueEsHesperides` (`npm run render:que-es` → `out/que-es-hesperides.mp4`) |
| Duración | ≈ 3:27 (voz al +20 %, 12 s de respiros, 3 s de cola), 1920×1080, 30 fps |
| Rama | `docs/video-historia-2` (sale de `docs/video-historia`) |
| Reglas de contenido | Las de [2026-11-18-video-historia-design.md](2026-11-18-video-historia-design.md) §1, con la excepción de «Excel» (abajo) |

## 1. Decisiones

- **La narración es la del usuario, palabra por palabra.** Se partió en 49 frases para la voz y los subtítulos; las
  líneas que el guion parte entre bloques se unieron («El equipo necesita organizar el trabajo / sin chocar…», «Ya sea
  que coordines… / o simplemente cruces…»). Las frases muy largas se partieron solo en sus dos puntos o comas, sin
  cambiar palabras (q6-q7, q15-q16, q41-q43, q46-q47). `src/guion-que-es-hesperides.test.ts` compara el texto con
  `guion-que-es-hesperides.narracion.txt`, copia de la narración del usuario.
- **«Hespérides»** en la voz (`textoVoz`) en todas las frases que nombran Hesperides; «mapa 3D» se lee «mapa tres D».
- **«Excel»**: es palabra del usuario (q15) y se mantiene en la voz y los subtítulos. En pantalla se ven hojas de
  cálculo genéricas, sin el logo ni la interfaz de Excel. Las reglas comunes no la bloquean; la prueba del guion
  permite «Excel» solo en q15.
- **Velocidad de la voz +20 %** (`velocidad` nuevo en el guion, `generar_voz.py`): a velocidad normal el video duraba
  4:06; con +20 % y respiros más cortos queda en ≈ 3:27. La voz sigue siendo es-PE-CamilaNeural.
- **Personajes ficticios**, mismo estilo plano: Lucía (coordinadora, nueva: pelo largo oscuro, chaqueta terracota,
  aretes), don Julio (el de la historia, ahora con **botas** y **pala**), otro capataz (gorra verde y chaleco
  naranja), la cuadrilla (los podadores, con llave y pala) y estudiantes (una estudiante con mochila, nueva).
- **Hespo** solo brota al final, junto al logo (escena `logo`): el guion es de narrador y no lo nombra.
- **Animación**: personas y Hespo «a dos» (`aDos`, un dibujo cada dos cuadros); cámara, mapa y pantallas «a uno».
  Movimientos de cámara suaves: empujes de 4 a 14 % y giros lentos del mapa (0,1 a 0,2° por cuadro).
- **Jugo en los tres golpes** (`src/queEs/jugo.ts`, con pruebas): anticipación de 4 cuadros, 2 cuadros congelados,
  temblor amortiguado con semilla, 12-14 partículas con semilla, anillo y separación cromática de 6 cuadros, en
  (1) el globo que aparece, (2) el sello «Cerrada» de Lucía y (3) el globo que se va.
- **Música** original (`generar_musica.py`, ahora con `--secciones`): mañana tranquila hasta 0:52, tono de problema
  de 0:52 a 1:18 (hojas de cálculo y la tubería) y luminosa desde que Lucía aprueba. Baja bajo la voz como antes.
- El grano, el tinte por escena y la viñeta son el `Acabado` de la historia, con tintes para las escenas nuevas.

## 2. Escenas

| Escena | Frases | Imagen |
|--------|--------|--------|
| `queEs` | q1-q3 | Vuelo real sobre el campus al atardecer (secuencia `vuelo`) con «¿Qué es Hesperides?», el nombre y el lema |
| `lucia` | q4-q9 | Lucía en su escritorio con el inicio real de Hesperides; fichas riego/poda/prioridad; el equipo en retratos repartidos sobre el mapa |
| `julio` | q10-q12 | Don Julio con botas y pala caminando entre jardines (paneo) |
| `campus` | q13-q16 | Vuelo real; fichas «cientos de jardines…»; hojas de cálculo genéricas en carpetas y un mapa de papel dibujado a mano que se desvanecen |
| `tuberia` | q17-q20 | Tubería de riego rota con chorro (gotas con semilla); «Antes»: la llamada que se borra (escena desaturada); «Hoy»: celular con el formulario real de incidencia (texto escrito, sin enviar) y fichas de para qué sirven las incidencias y la urgencia |
| `bandeja` | q21-q22 | Lucía con la bandeja real de incidencias; la revisión real con «Aprobar registro» y «Cuadrilla responsable» resaltados |
| `actividad` | q23-q27 | Alejamiento real del mapa con los globos que laten y fichas de riego/poda/evento; luego la vida del campus (estudiantes, un toldo de ceremonia) junto a la cuadrilla |
| `calendario` | q28-q29 | Semana dibujada con feriado, préstamo y la **ceremonia del viernes**; la tarea «Reparar tubería» va al viernes y salta el aviso; luego el aviso real de la app al programar |
| `cuadrilla` | q30-q31 | La cuadrilla repara (el chorro se corta, abrazadera nueva); intervención real con «Validada»/«Ejecutada» y la historia del jardín que se llena |
| `globo` | q32-q34 | **Momento clave**: órbita real alrededor del jardín; el globo brota con golpe; fichas qué/dónde/urgencia; el equipo mira el mismo globo |
| `observacion` | q35 | Otro capataz con su celular junto a un árbol rajado; la incidencia real en su celular con «Actualizar detalle» resaltado |
| `historial` | q36 | Historial real de una incidencia con cada paso firmado, resaltado paso a paso |
| `cierra` | q37-q38 | Lucía sella «Cerrada» (golpe); el globo se va del mapa y el jardín se pone verde; el reporte semanal real |
| `sano` | q39 | Estudiantes sentados en el jardín reparado, el aspersor funciona y don Julio saluda |
| `futuro` | q40-q44 | Alejamiento y giro del campus; capa «zonas de más atención» sobre los globos reales; fichas de especies y cambios en el tiempo |
| `juntos` | q45-q47 | Una estudiante cruza el jardín; retratos «coordinas / trabajas en el campo / cruzas un jardín»; todos juntos |
| `logo` | q48-q49 | Mapa 3D completo girando, logo y lema «Juntos»; Hespo brota y saluda |

## 3. Pantallas reales y capturas

`scripts/capturas-que-es-hesperides.ts` (solo navega y lee; nunca envía formularios ni guarda nada):

- **Web**: `feature/spec-112-atardecer` @ `8219d569` (exportada con `git archive frontend shared`, `next dev -p 3019`,
  la API va directo al backend dev en 8080 con origen `http://localhost:3000`). Modo «Atardecer», «Nombres» apagado,
  pantalla completa y la interfaz oculta con CSS (la atribución de OpenStreetMap se deja).
- **Secuencias del mapa** grabadas con el reloj de Playwright detenido (`page.clock`): cada cuadro avanza el tiempo de
  la página lo mismo, así el giro («Girar») y el vuelo de «Encuadrar» salen parejos. `vuelo` (300 capturas), `globo`
  y `globo-sin` (300 + 300, la misma órbita con y sin globos, para que el globo aparezca y se vaya sin cortar),
  `alejar` (75) y `final` (150). `medidas.json` guarda dónde quedó cada globo en cada captura.
- En la órbita se oculta el globo vecino de urgencia media (sigue en el mapa): la historia cuenta una sola incidencia.
- **Pantallas**: inicio, bandeja de incidencias, calendario del campus, reporte semanal (con los **datos de
  demostración del propio reporte**: se arman en el navegador; en el video se rotula «Cifras de demostración»),
  intervención con su historial, formulario de incidencia en celular con el texto de la tubería (no se envía) y la
  incidencia vista por el otro capataz.
- Se reutilizan capturas existentes (copiadas de la copia principal): `revision-aprobar`, `incidencia-historial`,
  `incidencia-resuelta` (primer video) y `planificacion/intervencion-aviso-reserva`.

## 4. Lo que dice el guion contra el código

| Afirmación | Respaldo | Estado |
|------------|----------|--------|
| Incidencias con urgencia | módulo `incidents`, formulario «¿Qué tan grave es?» | ✔ |
| Lucía la revisa, la aprueba y elige cuadrilla | revisión con «Cuadrilla responsable» y «Aprobar registro»; `IncidentAccess` | ✔ |
| Cruza cada tarea con feriados, eventos y jardines prestados; avisa antes de programar | SPEC-114 `CampusEventWarnings.forWork` (feriados, eventos bloqueantes) y avisos de reservas SPEC-107 | ✔ (los datos de demo no tienen eventos: el calendario con la ceremonia del viernes es **dibujo**; el aviso real que se muestra es el de un jardín reservado) |
| Registra cada intervención y guarda su historia | `interventions`, historial de la actividad y de avances | ✔ |
| Al aprobarse aparece un globo en el mapa 3D | SPEC-113: `IncidentBalloonQueries` toma incidencias activadas y no cerradas | ✔ |
| Otro capataz suma lo que vio al mismo trabajo | `IncidentLinksController` (vincular a un trabajo), comentarios y fotos de la incidencia | ✔ |
| Guarda quién reportó, aprobó, trabajó y cuándo | historial de la incidencia («Aprobada por», cada estado con persona y fecha) | ✔ |
| Lucía cierra; el globo desaparece | cierre de incidencia; los globos excluyen `CLOSED` | ✔ |
| El reporte de la semana lo incluye | SPEC-202 `WeeklyReportBuilder` («Semanal del sector», incidencias de la semana) | ✔ (en la captura, cifras de demostración) |
| Qué especies crecen y cómo cambian con el tiempo | catálogo botánico, historial de evaluaciones (SPEC-103), tendencias de reportes | ✔ |
| Capa «zonas de más atención» en el mapa | **no existe como capa** en ninguna rama | ⚠ **dibujada**: halos sobre los globos reales de incidencias abiertas. El texto del usuario se mantiene. |
| «Tres capataces y sus cuadrillas», «cientos de jardines, miles de árboles» | dato del usuario, no del código | ⚠ sin verificar |
| Antes: hojas de Excel y mapa a mano | `docs/dominio/integracion-mapa-interactivo.md` | ✔ |

No se promete app móvil, modo sin conexión, avisos por vencimiento ni plazos 24/48/72 h.

## 5. Arquitectura

- `src/queEs/jugo.ts` y `src/queEs/secuencia.ts`: lógica pura con pruebas (golpe, temblor, partículas, cromática,
  «a dos»; posición y mezcla dentro de una secuencia, centro del globo).
- `src/queEs/piezas.tsx`: `TomaMapa` (dos capturas vecinas mezcladas, empuje de cámara, capa sin globos y separación
  cromática), `Chispas`, `Chip`, `Titulo`, `Logo` (solo el nombre: no hay isotipo en `docs/marca`), `Retrato`,
  `Tuberia`, `HojaDeCalculo`, `Carpeta`, `Semana`, `AvisoCruce`.
- `src/queEs/escenas.tsx`: las 17 escenas; `src/VideoQueEsHesperides.tsx`: `VideoBase` con `hespo: 'semilla'`,
  `aDos: true`, música y `Acabado`.
- Nuevos `EscenaId` y sus suelos en `recorrido.ts`; `Guion.velocidad` opcional.

## 6. Para regenerar

```
npx tsx scripts/capturas-que-es-hesperides.ts  # SOLO=vuelo,pantallas y luego SOLO=globo,alejar (ver cabecera)
.venv/Scripts/python scripts/generar_voz.py --guion guion-que-es-hesperides.json --salida public/voz/que-es-hesperides
python scripts/generar_musica.py --salida public/musica/que-es-hesperides.wav --duracion 206.5 --secciones "0:manana,52:problema,78:solucion"
npm run render:que-es
```
