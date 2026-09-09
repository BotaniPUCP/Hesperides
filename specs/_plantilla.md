# SPEC-[NNN] — [Nombre descriptivo]

## Metadatos

| Campo | Valor |
|-------|-------|
| HU relacionada | [ID en GitHub Projects] |
| Autor del spec | [Nombre] |
| Plataforma | Web / Móvil / Ambas |
| Prioridad | Alta / Media / Baja |
| Sprint | S1 / S2 / S3 |
| Dependencias | SPEC-XXX, SPEC-YYY |
| Fecha límite | YYYY-MM-DD |

---

## 1. Objetivo

[Una oración clara: QUÉ hace esta funcionalidad y POR QUÉ existe.
No cómo se implementa, sino qué problema resuelve para el usuario.]

## 2. Contexto para la IA

> INSTRUCCIÓN: antes de generar código, la IA debe leer obligatoriamente:
> - Este spec completo
> - SPEC-000 (arquitectura y convenciones)
> - SPEC-001 (autenticación) — la matriz de permisos de su Anexo A gobierna
>   la autorización de TODOS los endpoints del proyecto
> - SPEC-002 (modelo de datos) para las entidades involucradas, y su §4.1:
>   toda entidad extiende `BaseEntity`
> - SPEC-003 (catálogos configurables) si la feature usa cualquier tipo, estado,
>   prioridad o categoría — son filas de `catalog_items`, nunca enums
> - SPEC-004 (auditoría) si la feature crea, edita o desactiva algo
> - SPEC-C01 (componentes UI) si la feature tiene interfaz
> - SPEC-C02 (manejo de errores)
> - SPEC-C03 (patrones de API)
>
> Si el SPEC-000 contradice a un spec fundacional, **manda el fundacional**: el
> SPEC-000 se escribió antes de conocer el dominio y algunas de sus directrices
> quedaron genéricas.

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.modules.[modulo]`
- Entidades JPA involucradas: [listar]
- Repositorios necesarios: [listar]
- Servicio: `[Nombre]Service` / `[Nombre]ServiceImpl`
- Controller: `[Nombre]Controller`, ruta base: `/api/v1/[recurso]`

### 2.2 Módulo frontend (web)

- Ruta: `/[seccion]/[pagina]` (Next.js App Router)
- Componentes nuevos a crear: [listar con ubicación]
- Componentes existentes a reutilizar: [listar]
- Hook(s) necesario(s): [listar]

### 2.3 Módulo móvil

- Pantalla: `[Nombre]Screen`
- Ubicación en navegación: [Tab / Stack, dentro de qué navigator]
- Diferencias con web: [listar o "Misma funcionalidad, adaptada a móvil"]

### 2.4 Restricciones técnicas

- Librerías que DEBE usar: [listar]
- Librerías que NO debe usar: [listar]
- Patrón de catálogos aplicable: [si usa catálogos configurables, especificar cuáles]

> **Antes de escribir código de backend, leer SPEC-000 §5.2.1.** Spring Boot 4 modularizó y
> renombró cosas que en 3.x venían incluidas (Jackson está en `tools.jackson`, `@MockBean` ya no
> existe, `@WebMvcTest` cambió de paquete, Flyway necesita su propio starter). Asumir la API de
> 3.x produce errores de compilación desconcertantes o, peor, migraciones que silenciosamente no
> se ejecutan.
>
> **Si la feature expone endpoints que consume el navegador, leer además §5.2.2 (CORS).** Un
> endpoint nuevo bajo `/api/**` ya queda cubierto por la configuración existente, pero cualquier
> cabecera personalizada que el cliente envíe debe añadirse a `allowedHeaders` o el navegador
> bloqueará la petición.

## 3. Contratos de API

> Definir TODOS los endpoints de esta feature.

### [MÉTODO] /api/v1/[recurso]

**Descripción:** [qué hace]

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request body:**
```json
{
  "campo1": "string (requerido, máx 100 chars)",
  "campo2": "integer (requerido, rango 1-100)",
  "campo3": "string (opcional, formato ISO 8601)"
}
```

**Response 200/201:**
```json
{
  "ok": true,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "long",
    "campo1": "string",
    "campo2": "integer",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Response 400 (validación):**
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "campo1", "message": "No puede estar vacío" }
    ]
  }
}
```

**Response 401 (no autenticado):**
```json
{
  "ok": false,
  "message": "Invalid or expired token",
  "data": null
}
```

**Response 403 (sin permisos):**
```json
{
  "ok": false,
  "message": "Insufficient permissions for this action",
  "data": null
}
```

[Repetir para cada endpoint de la feature]

## 4. Migración de base de datos

> Definir el script Flyway necesario para esta feature.
>
> **Rango por spec propietaria:** los fundacionales ocupan `V001`–`V012`. Un
> SPEC-1NN usa `V1NN__` en adelante. El rango lo fija la spec que **posee** la
> tabla, no la primera que la consume.
>
> **Si tu feature no necesita tablas nuevas, dilo explícitamente y no inventes una
> migración.** Muchas features operan sobre tablas que los fundacionales ya
> crearon. Una migración duplicada rompe Flyway por conflicto de checksum.
>
> Toda tabla nueva lleva `created_at`, `updated_at` y `deleted_at` (SPEC-000 §5.4),
> y su entidad JPA extiende `BaseEntity` (SPEC-002 §4.1) en vez de redeclararlos.

```sql
-- V[N]__[descripcion].sql
-- Ejemplo:

CREATE TABLE nombre_tabla (
    id BIGSERIAL PRIMARY KEY,
    campo1 VARCHAR(100) NOT NULL,
    campo2 INTEGER NOT NULL CHECK (campo2 BETWEEN 1 AND 100),
    campo3 TIMESTAMP,
    catalog_type_id BIGINT REFERENCES catalog_items(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_nombre_tabla_campo1 ON nombre_tabla(campo1);
```

## 5. Comportamiento esperado

### 5.1 Flujo principal (Happy Path)

1. El usuario hace X.
2. El sistema responde con Y.
3. Se muestra Z.

### 5.2 Flujos alternativos

- **Si el usuario no llena un campo obligatorio:** mostrar validación inline, no enviar request.
- **Si hay error de red:** mostrar toast/alerta "Error de conexión. Intente de nuevo."
- **Si la sesión expiró:** redirigir a login con mensaje.
- **Si el recurso no existe (404):** mostrar pantalla de "no encontrado" con opción de volver.

### 5.3 Casos límite (Edge Cases)

- ¿Qué pasa con datos vacíos?
- ¿Qué pasa con volúmenes grandes? (paginación requerida si >20 items)
- ¿Qué pasa con caracteres especiales o emojis?
- ¿Qué pasa si el usuario hace doble clic? (debounce/disable en submit)
- ¿Qué pasa si dos usuarios editan lo mismo simultáneamente?

## 6. Criterios de aceptación (verificables por cualquiera)

> Cada criterio debe poder verificarse SIN leer el código fuente.

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | [Descripción] | [Cómo verificar: qué hacer, qué esperar ver] |
| CA-02 | [Descripción] | [Cómo verificar] |
| CA-03 | [Descripción] | [Cómo verificar] |
| CA-04 | [Descripción] | [Cómo verificar] |
| CA-05 | [Descripción] | [Cómo verificar] |

## 7. Especificación visual

### 7.1 Web (Next.js)

- Responsive breakpoints: móvil (<640px), tablet (640-1024px), desktop (>1024px)
- Layout: [descripción o referencia a wireframe/Figma]
- Estados de componentes: default, hover, active, disabled, error, loading
- Feedback visual: [loading spinners, skeleton screens, toasts de éxito/error]

### 7.2 Móvil (React Native)

- Gestos soportados: [tap, swipe, pull-to-refresh, long press]
- Adaptaciones: [qué cambia respecto a web — layout, navegación, interacciones]
- Navegación: [cómo se llega a esta pantalla, cómo se sale]
- Orientación: solo portrait / ambas

### 7.3 Referencia visual

[Enlace a Figma/mockup, o descripción textual detallada si no hay diseño]

## 8. Tests que la IA debe generar

> REGLA: la IA genera tests ANTES de la implementación.

### 8.1 Tests unitarios (backend — JUnit 5 + Mockito)

```
- [NombreService].create() con datos válidos → retorna entidad creada
- [NombreService].create() con datos duplicados → lanza DuplicateException
- [NombreService].getById() con ID inexistente → lanza NotFoundException
- [NombreService].update() con entidad eliminada (soft) → lanza NotFoundException
```

### 8.2 Tests de integración (backend — @WebMvcTest o @SpringBootTest)

```
- POST /api/v1/[recurso] con body válido → 201 + body correcto
- POST /api/v1/[recurso] con body inválido → 400 + errores detallados
- POST /api/v1/[recurso] sin token → 401
- GET /api/v1/[recurso]/{id} existente → 200 + body correcto
- GET /api/v1/[recurso]/{id} inexistente → 404
- DELETE /api/v1/[recurso]/{id} → 204 (soft delete, verificar deleted_at)
```

### 8.3 Tests frontend (Jest + React Testing Library)

```
- [Componente] renderiza correctamente con datos
- [Componente] muestra loading state
- [Componente] muestra error state
- [Componente] submit con datos válidos → llama API
- [Componente] submit con datos inválidos → muestra validación
```

### 8.4 Tests E2E (si aplica)

```
- Usuario completa flujo desde [pantalla inicio] hasta [resultado esperado]
```

## 9. Seguridad

- [ ] Validación en backend (Bean Validation), no solo en frontend.
- [ ] Endpoint requiere autenticación JWT: sí / no.
- [ ] Roles/permisos necesarios: [listar].
- [ ] Datos sensibles que NO deben exponerse en response: [listar].
- [ ] Prevención de inyección SQL: usa JPA, no queries concatenados.
- [ ] XSS: sanitizar inputs de texto libre.
- [ ] Acciones auditables: ¿esta feature crea, edita o desactiva algo que deba
      dejar rastro en `audit_log` (SPEC-004 §3.2)? Si sí, listar cuáles.
- [ ] Qué se registra en logs y qué NO (nunca contraseñas, hashes ni tokens).

## 10. Consideraciones de extensibilidad

- [ ] ¿Usa catálogos configurables en vez de enums hardcodeados?
- [ ] ¿La lógica de negocio está en el Service, no en el Controller?
- [ ] ¿Los textos de UI son externalizables (i18n-ready)?
- [ ] ¿Las reglas de negocio específicas de PUCP están en configuración, no en código?

## 11. Checklist de verificación (para el desarrollador)

### Antes de pedir código a la IA

- [ ] ¿El spec tiene objetivo claro y en una oración?
- [ ] ¿Los contratos de API están definidos con tipos exactos?
- [ ] ¿La migración SQL está definida?
- [ ] ¿Hay al menos 5 criterios de aceptación verificables?
- [ ] ¿Se contemplan flujos alternativos y edge cases?
- [ ] ¿Se especifica comportamiento para web Y móvil?
- [ ] ¿Alguien más revisó y aprobó el spec?

### Después de recibir código de la IA

- [ ] El código respeta la estructura de carpetas del proyecto.
- [ ] El paquete Java es `pe.edu.pucp.hesperides.modules.[modulo].[capa]`.
- [ ] Los componentes TypeScript están en la carpeta correcta.
- [ ] Los nombres de clases/componentes siguen las convenciones.
- [ ] La migración Flyway tiene número de versión correcto.
- [ ] No se instalaron dependencias no autorizadas.
- [ ] Los tests generados cubren todos los criterios de aceptación.
- [ ] Todos los tests pasan (`mvn test` / `npm test`).
- [ ] La funcionalidad se probó manualmente **en un navegador real** (no solo con `curl` ni con
      tests de MockMvc): esos dos no hacen preflight de CORS, así que una suite en verde es
      compatible con una pantalla que el navegador bloquea entera (SPEC-000 §5.2.2).
- [ ] Si la feature añade endpoints que el navegador consume, la pestaña Network no muestra
      ningún `OPTIONS` con 401 ni error de CORS en consola.
- [ ] La funcionalidad se probó manualmente en móvil (o simulador).
- [ ] No hay datos hardcodeados (URLs, credenciales, nombres de PUCP en lógica).
- [ ] Los mensajes de error son claros para el usuario final.
- [ ] No hay `System.out.println`, `console.log` de depuración.
- [ ] Se usó soft delete (no DELETE físico).
- [ ] Se usaron catálogos configurables donde corresponde; no hay ningún `enum`
      de dominio ni `@Enumerated` en el código Java.
- [ ] Toda entidad nueva extiende `BaseEntity` y no redeclara `id`, `createdAt`,
      `updatedAt` ni `deletedAt`.
- [ ] La autorización de cada endpoint coincide con la matriz del Anexo A de
      SPEC-001, sin reinterpretarla.
