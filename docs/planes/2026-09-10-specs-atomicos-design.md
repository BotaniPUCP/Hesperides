# Diseño — Specs atómicos

| Campo | Valor |
|-------|-------|
| Fecha | 2026-09-10 |
| Estado | Aprobado |
| Alcance | Los 10 archivos de `specs/` |
| Rama | `refactor/specs-atomicos` |

---

## 1. Objetivo

Reestructurar los specs para que cada uno contenga **solo información atómica no derivable**:
lo que una IA necesita para generar código estandarizado de este proyecto, sin párrafos
repetidos en nueve archivos ni secciones que se contradicen entre sí.

No es un recorte de líneas por el número. Es eliminar la **duplicación** —la única causa real
de que un spec envejezca mal— y comprimir el estilo del resto sin perder contenido.

## 2. Diagnóstico

7.601 líneas en 10 archivos. Desglose de lo recuperable:

| Origen | Líneas | Veredicto |
|---|---|---|
| SPEC-000 §6 (copia entera de `_plantilla.md`) | ~300 | Borrar. El propio texto admite que puede estar desfasada: *"si ambas difieren, manda el archivo"* |
| SPEC-000 §7 (resúmenes de los otros 8 specs) | ~185 | Borrar. Ya contradice a SPEC-001 en el almacenamiento del token |
| Checklists genéricos ×9 | ~250 | Mover a `REGLAS.md` |
| §9 Seguridad / §10 Extensibilidad genéricos ×9 | ~130 | Mover a `REGLAS.md` |
| Cabeceras "leer obligatoriamente" ×9 | ~90 | Colapsar a una línea |
| Prosa de tests y ejemplos redundantes | ~350 | Condensar |
| **Total recuperable** | **~1.300** | ~17% |

**Lo que NO es desperdicio, pese al volumen.** SPEC-002 §5.2 documenta decisiones con su
alternativa descartada (por qué no `BYTEA`, por qué no una tabla `attachments` polimórfica, por
qué no `element_history`). Eso es precisamente lo que impide que una IA "simplifique" el modelo
rompiéndolo. Se condensa el estilo, no el contenido.

**El problema de fondo no es el exceso de líneas: es la falta de un nivel de indirección.**
Hoy cada spec intenta ser autosuficiente, así que repite el contexto compartido, y cada copia
envejece por su cuenta.

## 3. Arquitectura de tres niveles

Una responsabilidad por documento (SRP aplicado a la documentación):

```
specs/
  REGLAS.md        <- invariantes del proyecto. Se lee SIEMPRE.
  REGISTRO.md      <- indice, estados, enmiendas. Ya existe.
  _plantilla.md    <- molde para specs nuevos.
  fundacionales/   <- solo lo propio de cada spec
  compartidos/
  features/
```

### 3.1 `REGLAS.md` no se inventa: se mueve

Su contenido sale de texto que ya existe:

- **SPEC-000 §5 completo** (5.1 a 5.5), incluidos **§5.2.1 (Spring Boot 4 vs 3.x)** y
  **§5.2.2 (CORS)** íntegros, sin condensar: cada fila costó un fallo de compilación o un test
  en rojo.
- Las invariantes que hoy se repiten en los nueve checklists:
  - Sobre `{ok, message, data}` en toda respuesta, incluido el servicio Flask
  - Catálogos configurables; nunca `enum` de dominio ni `@Enumerated`
  - Toda entidad extiende `BaseEntity`; no redeclara `id/createdAt/updatedAt/deletedAt`
  - Soft delete siempre; nunca `DELETE` físico
  - La matriz del Anexo A de SPEC-001 gobierna toda autorización
  - Verificación en navegador real, no solo `curl` ni MockMvc
  - Precedencia: un spec fundacional manda sobre SPEC-000

SPEC-000 §5 se sustituye por un puntero, para no dejar dos copias.

### 3.2 La regla que sostiene el sistema

> Un spec contiene solo lo que **no se puede derivar** de `REGLAS.md`.
> Si una línea es cierta para todos los specs, pertenece a `REGLAS.md` y se borra del spec.

## 4. Anatomía del spec atómico

```
1. Objetivo            1 oracion
2. Contexto            Modulo, paquete, rutas, archivos. Tabla, no prosa.
   2.x Decisiones      Solo las NO derivables. Decision + por que (1-2 lineas)
                       + alternativa descartada.
3. Contratos de API    Sin cambio. Es el corazon del spec.
4. Migracion           Sin cambio. SQL literal.
5. Comportamiento      Happy path + alternativos + limites. Vinetas.
6. Criterios (CA)      Tabla. Verificable sin leer codigo.
7. Visual              Solo si tiene UI. Si no: "No aplica".
8. Tests               Lista 'caso -> resultado'. Sin config de framework.
9. Propio de este spec Reglas que NO estan en REGLAS.md. Si no hay: se borra.
```

Desaparecen como secciones fijas §9 Seguridad genérica, §10 Extensibilidad y §11 Checklist. Lo
específico migra a §9 "Propio de este spec": la política de contraseñas de SPEC-100 §9.1 se
queda; "validación en backend, no solo en frontend" se va a `REGLAS.md`.

La cabecera de cada spec se colapsa de ~12 líneas a:

```
> Lectura obligatoria: specs/REGLAS.md.
> Especifico de este spec: SPEC-001 Anexo A (autorizacion), SPEC-003 (rol es catalogo).
```

### 4.1 Reglas de escritura

- Una decisión, dos líneas: qué se decidió y qué se descartó. Tabla antes que párrafo.
- Cero repetición entre specs: si aparece en dos, va a `REGLAS.md`.
- El POR QUÉ se conserva, condensado. Sin él, una IA "corrige" una rareza intencional.

## 5. Restricción crítica: 103 referencias cruzadas

`grep` sobre `specs/` encuentra **103 referencias con número de sección** (`SPEC-002 §4.1`,
`SPEC-000 §5.4`, `SPEC-000 §5.2.2`...). Son justo las que la plantilla obliga a leer antes de
generar código.

**Decisión: la numeración se conserva.** Cada sección mantiene su número actual aunque quede más
corta. Un puntero roto es peor que una línea de más: manda a la IA a leer una sección que ya no
existe.

Solo se redirigen las que apuntan a algo que desaparece:

| Referencia actual | Pasa a |
|---|---|
| `SPEC-000 §5.x` | `REGLAS.md §5.x` (mismo número dentro del archivo nuevo) |
| `SPEC-000 §7` (3 apariciones) | `REGISTRO.md` |

## 6. Plan de ejecución

Cada paso deja el sistema consistente; ninguno depende de un paso posterior.

1. Crear `REGLAS.md` (mover SPEC-000 §5 + invariantes de los checklists).
2. Reescribir `_plantilla.md` con la anatomía de §4.
3. SPEC-000: borrar §6 y §7; §5 pasa a puntero. De 1.100 a ~420 líneas.
4. Los 6 en revisión: C01, C02, C03, 002, 003, 004.
5. Los 2 cerrados: 001 y 100, sin tocar ninguna decisión.
6. Reparar referencias y anotar la enmienda en `REGISTRO.md`.

## 7. Qué no se toca

Contratos de API · SQL de migraciones · SPEC-000 §5.2.1 (Spring Boot 4) · §5.2.2 (CORS) ·
Anexo A de SPEC-001 · Enmiendas de `REGISTRO.md` · las decisiones de diseño de SPEC-002 §5.2
(solo condensación de estilo).

## 8. Regla de borrado

Una línea se borra **solo si**:

- (a) es literalmente idéntica a otra en otro spec, **o**
- (b) es genérica y ya quedó en `REGLAS.md`, **o**
- (c) el propio texto se declara desactualizado.

Todo lo demás se condensa reescribiendo. Nunca se elimina.

Sobre los specs cerrados (SPEC-000, SPEC-001, SPEC-100): se reescribe la forma, no el fondo.
Ninguna decisión técnica, contrato ni criterio de aceptación cambia de significado. Si al
condensar aparece una contradicción con el código real, **se reporta, no se resuelve**.

## 9. Verificación

- Conteo de líneas antes/después por archivo.
- `grep` de las 103 referencias: todas deben resolver a una sección existente.
- Recuento de que los 9 specs conservan sus endpoints, columnas SQL, CA y casos de test.

Resultado estimado: ~6.300 líneas. El número no es la meta; la meta es que cada línea que quede
sea no derivable de otra.
