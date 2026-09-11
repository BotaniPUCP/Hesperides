# SPEC-[NNN] — [Nombre descriptivo]

| Campo | Valor |
|-------|-------|
| HU relacionada | [ID en GitHub Projects] |
| Autor | [Nombre] |
| Plataforma | Web / Móvil / Ambas |
| Sprint | S1 / S2 / S3 |
| Dependencias | SPEC-XXX, SPEC-YYY |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** [SPEC-XXX §N (qué aporta), ...]

> **La regla de este spec: contiene lo que el código NO dice.**
> Formas de request y response, props, DDL y listas de tests viven en el repositorio, que es
> donde se compilan y se ejecutan. Aquí van las decisiones, las reglas de negocio y los
> porqués: lo que nadie puede deducir leyendo la implementación.
> Mientras la feature no esté implementada, este spec **sí** es la fuente de verdad y el
> detalle se escribe literal. Al cerrarla, ese detalle se sustituye por un puntero al código.

---

## 1. Objetivo

[Una oración: QUÉ hace y QUÉ problema resuelve. No cómo se implementa.]

## 2. Contexto

### 2.1 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.[modulo]`
- Entidades: [listar, indicando qué spec las posee]
- Repositorios: [listar]
- Servicio: `[Nombre]Service` / `[Nombre]ServiceImpl`
- Controller: `[Nombre]Controller` → `/api/v1/[recurso]`

### 2.2 Frontend web

- Rutas: `/[seccion]` (Next.js App Router)
- Componentes nuevos: [ruta de archivo por componente]
- Reutilizados de SPEC-C01: [listar; no se redefinen sus props]
- Hooks: [listar]

### 2.3 Móvil

[Pantalla y navegación, o "Fuera de alcance" + por qué.]

### 2.4 Restricciones técnicas

- DEBE usar: [librerías]
- NO debe usar: [librerías] + motivo en media línea
- Catálogos aplicables: [tipos] o "no aplica"

### 2.5 Decisiones propias de este spec

> Solo las **no derivables** de `REGLAS.md` ni de otro spec.
> Formato: decisión · por qué en 1-2 líneas · alternativa descartada.
> Si este spec enmienda uno cerrado, decirlo aquí y anotarlo en `REGISTRO.md`.

## 3. Contratos de API

> **Ya implementado:** apuntar a los DTO (`modules/[modulo]/dto/`) y a `shared/types/`, y dejar
> aquí solo la tabla de rutas y las decisiones de §3.1.
> **Sin implementar:** escribir los cuerpos JSON literales — este spec es la fuente de verdad
> hasta que exista el código. El sobre `{ok, message, data}` (INV-1) y las envolturas
> 400/401/403 de SPEC-C02 nunca se repiten por endpoint.

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `[MÉTODO] /api/v1/[recurso]` | [roles, según Anexo A de SPEC-001] | [una línea] |

### 3.1 Decisiones que el código no explica

> Por qué este verbo y no otro, por qué este código de error y no el evidente, qué defecto tiene
> un parámetro y por qué. Si no hay ninguna decisión de este tipo, se borra la subsección.

## 4. Migración de base de datos

> **Ya implementada:** nombrar el archivo (`V[N]__[descripcion].sql`) y explicar solo lo que el
> DDL no dice: por qué ese default, por qué ese índice es parcial, por qué esa columna no es un
> catálogo.
> **Sin implementar:** el SQL literal va aquí.
>
> Rango: lo fija la spec que **posee** la tabla (fundacionales `V001`-`V099`, SPEC-1NN usa
> `V1NN__`). Toda tabla lleva `created_at`, `updated_at`, `deleted_at` (INV-4) y su entidad
> extiende `BaseEntity` (INV-3).
>
> **Si no necesita tablas nuevas, decirlo aquí y no inventar una migración.**

## 5. Comportamiento

### 5.1 Flujo principal

1. [Paso] → [respuesta del sistema]

### 5.2 Flujos alternativos

- **[Condición]:** [comportamiento]

### 5.3 Casos límite

- **[Caso]:** [comportamiento]

## 6. Criterios de aceptación

> Verificables sin leer el código fuente. Mínimo 5.

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | [Descripción] | [Qué hacer, qué esperar ver] |

## 7. Especificación visual

> Si no tiene interfaz: "No aplica".

- Layout y breakpoints: móvil (<640px), tablet (640-1024px), desktop (>1024px)
- Estados: default, hover, disabled, error, loading
- Móvil: [gestos, navegación, o "fuera de alcance"]

## 8. Tests

> Se escriben **antes** de la implementación. Una vez escritos, la suite del repo es la lista
> ejecutable y esta sección deja de enumerarlos.
>
> **No se listan los casos mecánicos** —sin token → 401, campo vacío → 400, rol insuficiente →
> 403—: son invariantes de `REGLAS.md` y valen para todos los endpoints.
>
> **Sí se listan las reglas de negocio que un método no hace evidentes:** límites, idempotencia,
> qué NO debe ocurrir, qué se revoca y qué sobrevive.

```
[Agrupar por regla, no por capa]
- [caso concreto] → [resultado esperado]
```

## 9. Propio de este spec

> Reglas de seguridad, extensibilidad o verificación que **no** están en `REGLAS.md`:
> política de contraseñas, acciones auditables (SPEC-004 §3.2), campos que nunca salen en
> una response, checklist específico.
>
> **Si no hay nada propio, se borra esta sección.** Las invariantes generales y el checklist
> común ya están en `REGLAS.md` §0 y §6.
