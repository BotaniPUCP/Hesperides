# SPEC-115 — Maquinaria de corte solo en sábados, domingos y feriados

| Campo | Valor |
|-------|-------|
| HU relacionada | REQ 5.11 · E-09 |
| Autor | Jean Piero David Morán |
| Plataforma | Web |
| Sprint | — |
| Dependencias | SPEC-200 (intervenciones), SPEC-114 (feriados y eventos bloqueantes), SPEC-113 (globo «Corte con maquinaria») |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-114 §2.2 (`CampusHolidays`) y §5.4 (avisos) · SPEC-113 §5.1.

> Mientras la feature no esté implementada, este spec es la fuente de verdad y el detalle se
> escribe literal. Al cerrarla, el detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Que una intervención con maquinaria de corte (motosierra, podadora de altura) solo pueda
programarse un sábado, un domingo o un feriado, para no interrumpir las clases con el ruido.

## 2. Contexto

*«Imagínate, estás haciendo tu clase… y suena una motosierra al costado»* (2.ª entrevista). En la
3.ª entrevista el cliente sumó los sábados a los domingos y feriados (catálogo, cambios del 29 sep).
La sección dio de baja su maquinaria propia: hoy la usan sobre todo los terceros, pero la regla es
por el ruido, no por quién trabaja.

**Fuera:** días de asueto o de paro como días válidos (se mencionaron en la 1.ª entrevista y no se
confirmaron); quién decide que un día es «sin actividad académica».

### 2.1 Vocabulario

| Término | Qué es |
|---|---|
| **Con maquinaria de corte** | Una marca de la intervención: el trabajo usa motosierra, podadora de altura u otra máquina ruidosa de corte. |
| **Día válido** | Sábado, domingo o un feriado registrado en el calendario del campus (SPEC-114). |
| **Tipo que la sugiere** | Un tipo de intervención cuyo `metadata` trae `"suggestsCuttingMachinery": true`. Al elegirlo, la casilla se marca sola. |

### 2.2 Backend

- Columna nueva `interventions.uses_cutting_machinery`.
- Engine puro `engine/machinery/MachineryDays`: si una fecha es día válido dados los feriados.
- `InterventionsServiceImpl` valida al crear y al editar la planificación (no al ejecutar).
- `MachineryCutBalloonSource` en `modules/interventions/balloons/` (SPEC-113 D-01).

### 2.3 Frontend web

- `InterventionForm` (y el formulario anterior que aún lo usa): casilla **«Usa maquinaria de
  corte»** junto a la fecha programada, y el aviso en línea de §5.2.
- El detalle de la intervención dice «Con maquinaria de corte» cuando corresponde.

### 2.4 Móvil

Fuera de alcance.

### 2.5 Decisiones propias de este spec

| # | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-01 | Una **casilla** en la intervención, que se **marca sola** con los tipos que la sugieren y se puede desmarcar | Decisión del usuario (16 nov 2026): preciso y sin trabajo extra en el caso común | Solo por tipo (bloquearía una poda con tijeras un martes); solo la casilla (depende de la memoria) |
| D-02 | Aplica a **toda** intervención con maquinaria, propia o de terceros | Decisión del usuario (16 nov 2026): la regla es por el ruido | Solo terceros: la intervención no registra hoy si es tercerizada |
| D-03 | La regla **impide** guardar (422); un evento bloqueante ese día solo **avisa** (SPEC-114 D-05) | REQ 5.11: «no admite» un día de lunes a viernes que no sea feriado | Solo avisar |
| D-04 | Se valida la **fecha programada**, no la de ejecución | El capataz registra lo que pasó; impedirlo borraría el dato, no el ruido | Validar también al iniciar o completar |
| D-05 | La sugerencia vive en el `metadata` del tipo, no en código | Se ajusta desde el catálogo sin desplegar; la lista inicial la valida el cliente | Una lista fija en código |
| D-06 | Las intervenciones anteriores quedan **sin** la marca | No se sabe cuáles usaron maquinaria; inventarlo sería falso | Marcar todas las podas |

## 3. Contratos de API

Sin rutas nuevas. Cambian los cuerpos de SPEC-200:

- Crear y editar la planificación aceptan `"usesCuttingMachinery": true|false` (ausente = `false`).
- El detalle y la lista devuelven `"usesCuttingMachinery"`.
- Error 422, en inglés como el resto del backend: `"Cutting machinery can only be scheduled on
  Saturdays, Sundays or holidays"`. El frontend lo traduce: «La maquinaria de corte solo se
  programa sábados, domingos o feriados. Elige otra fecha o desmarca la casilla».

## 4. Migración de base de datos

Número: el siguiente libre al implementar (hoy **V065**; la V063 de
`fix/spec-102-xerofiticas-duplicadas` pasaría a V066 si se integra después).

```sql
-- SPEC-115: maquinaria de corte solo en sabados, domingos y feriados (REQ 5.11).
ALTER TABLE interventions ADD COLUMN uses_cutting_machinery BOOLEAN NOT NULL DEFAULT FALSE;

-- D-05: los tipos de poda sugieren la marca; el cliente valida la lista y se ajusta en el catalogo.
UPDATE catalog_items i
   SET metadata = COALESCE(i.metadata, '{}'::jsonb) || '{"suggestsCuttingMachinery": true}'::jsonb
  FROM catalog_types t
 WHERE t.id = i.catalog_type_id AND t.code = 'INTERVENTION_TYPE'
   AND i.code IN ('PODA_MANTENIMIENTO', 'PODA_FORMACION', 'PODA_SANITARIA', 'PODA_DESPEJE');
```

## 5. Comportamiento

### 5.1 Programar

1. Coordinación elige el tipo. Si el tipo sugiere maquinaria y nadie tocó la casilla, se marca sola.
2. Con la casilla marcada y una fecha de lunes a viernes que no es feriado, al guardar → 422 y el
   mensaje en español; no se guarda.
3. Con un sábado, un domingo o un feriado → se guarda. Si ese día hay un evento bloqueante en sus
   jardines, el aviso del calendario (SPEC-114 §5.4) aparece como siempre, sin impedir.

### 5.2 Aviso en línea

Antes de guardar, con la casilla marcada y una fecha de lunes a viernes, el formulario consulta si
ese día es feriado (`GET /campus-events?from=&to=&type=HOLIDAY`). Si no lo es, muestra bajo la fecha:
«La maquinaria de corte solo se programa sábados, domingos o feriados». Es una ayuda: el backend
valida igual.

### 5.3 Editar

- Cambiar la fecha o marcar la casilla vuelve a validar.
- Desmarcar la casilla nunca falla.
- Editar otra cosa de una intervención ya guardada con fecha inválida (de antes de esta regla, o
  porque un feriado se dio de baja) no falla mientras no se toquen la fecha ni la casilla.

### 5.4 En el mapa: «Corte con maquinaria pendiente»

El globo gris de SPEC-113 (`MACHINERY_CUT`) gana su fuente: intervenciones con la marca, no
canceladas, programadas desde hoy hasta dentro de `MACHINERY_LOOKAHEAD_DAYS = 7` días y con alguna
ubicación sin completar. Ancla: sus ubicaciones, en minigrupos. Ficha: actividad, «Programada el
sáb 21 nov», capataz. Se va al completarse o al pasar la fecha.

### 5.5 Casos límite

- **Feriado dado de baja después de programar:** la intervención queda guardada; solo se valida
  si se vuelve a tocar la fecha o la casilla (§5.3).
- **Tipo que sugiere y la persona desmarca:** se respeta; no se vuelve a marcar si cambia otro campo.
- **Cambiar a un tipo que no sugiere:** la casilla no se desmarca sola.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Al elegir «Poda sanitaria» la casilla se marca sola | Registro de intervención |
| CA-02 | Con la casilla marcada y un martes no feriado, no se guarda y el mensaje está en español | Guardar |
| CA-03 | Con un sábado, se guarda | Guardar |
| CA-04 | Con un martes registrado como feriado en el calendario, se guarda | Registrar el feriado y guardar |
| CA-05 | Con un sábado de examen de admisión (evento bloqueante), se guarda y avisa | Calendario + guardar |
| CA-06 | Desmarcar la casilla en un martes permite guardar | Guardar |
| CA-07 | Una poda con maquinaria programada para este sábado muestra el globo gris en el mapa | `/mapa` |

## 7. Especificación visual

- Casilla bajo la fecha programada: «Usa maquinaria de corte (motosierra, podadora de altura)».
- Aviso en línea en ámbar bajo la fecha (§5.2), el mismo estilo que los errores de campo pero en
  `alert-warning`.
- En el detalle, una insignia neutra «Con maquinaria de corte».

## 8. Tests

```
Engine
- sábado y domingo → válidos; martes → inválido; martes feriado → válido

Servicio
- crear con maquinaria un martes → 422; un sábado → ok; un martes feriado → ok
- crear sin maquinaria un martes → ok
- editar solo la descripción de una vieja con fecha inválida → ok
- editar la fecha a un martes con maquinaria → 422

Globo
- con maquinaria, programada en 3 días y sin completar → MACHINERY_CUT
- completada, o programada en 10 días → sin globo

Frontend
- elegir un tipo que sugiere marca la casilla; desmarcada a mano no se vuelve a marcar
- martes no feriado con la casilla → aviso en línea; sábado → sin aviso
```

## 9. Propio de este spec

- La lista inicial de tipos que sugieren maquinaria (las cuatro podas) es **por validar** con el
  cliente; se cambia en el catálogo.
- Verificación en navegador real (INV-10).
