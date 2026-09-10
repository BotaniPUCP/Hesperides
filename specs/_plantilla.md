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

> Todos los endpoints, con tipos exactos. El sobre `{ok, message, data}` es INV-1;
> las envolturas 400/401/403 son las de SPEC-C02 §3 y no se repiten por endpoint.

### [MÉTODO] /api/v1/[recurso]

**Qué hace:** [una línea] · **Autorización:** [roles, según Anexo A de SPEC-001]

**Request:**
```json
{ "campo1": "string (requerido, máx 100)", "campo2": "integer (1-100)" }
```

**Response 200/201:**
```json
{ "ok": true, "message": "...", "data": { "id": "long", "campo1": "string" } }
```

**Errores propios:** [código → cuándo. Solo los que no sean los genéricos de SPEC-C02.]

## 4. Migración de base de datos

> Rango: lo fija la spec que **posee** la tabla (fundacionales `V001`-`V099`, SPEC-1NN usa
> `V1NN__`). Toda tabla lleva `created_at`, `updated_at`, `deleted_at` (INV-4) y su entidad
> extiende `BaseEntity` (INV-3).
>
> **Si no necesita tablas nuevas, decirlo aquí y no inventar una migración.**

```sql
-- V[N]__[descripcion].sql
```

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

> Se escriben **antes** de la implementación. Formato: `caso → resultado esperado`.
> El stack de test es el de `REGLAS.md`; no se repite aquí.

### 8.1 Unitarios (backend)

```
- [Servicio].create() con datos válidos → entidad creada
- [Servicio].getById() inexistente → NotFoundException
```

### 8.2 Integración (backend)

```
- POST /api/v1/[recurso] válido → 201 + body correcto
- POST sin token → 401
- DELETE /{id} → 204 y deleted_at no nulo
```

### 8.3 Frontend

```
- [Componente] con datos → renderiza filas
- [Componente] submit inválido → muestra validación, no llama API
```

## 9. Propio de este spec

> Reglas de seguridad, extensibilidad o verificación que **no** están en `REGLAS.md`:
> política de contraseñas, acciones auditables (SPEC-004 §3.2), campos que nunca salen en
> una response, checklist específico.
>
> **Si no hay nada propio, se borra esta sección.** Las invariantes generales y el checklist
> común ya están en `REGLAS.md` §0 y §6.
