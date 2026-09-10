# SPEC-C02 — Manejo de errores

| Campo | Valor |
|-------|-------|
| HU relacionada | Transversal — sin HU propia, spec fundacional compartido |
| Plataforma | Ambas (Web y Móvil) |
| Sprint | S0 |
| Dependencias | `REGLAS.md` |

---

## 1. Objetivo

Definir un contrato único y obligatorio de manejo de errores — backend, microservicio de datos y clientes — para que cualquier desarrollador de los 10 del equipo produzca respuestas de error consistentes y cualquier cliente (web, móvil) las interprete sin adivinar.

Este spec **documenta contrato ya implementado y en producción**, no propone uno nuevo. Donde el código actual no resuelve un caso (por ejemplo, refresco de sesión en 401, o comportamiento offline en móvil), este spec fija el requisito que deberá implementarse en SPEC-001 y en las features correspondientes.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** código ya implementado en `shared/exception/`, `frontend/src/lib/api.ts`,
> `shared/types/api.ts` y `services/app/routes/health.py` (el sobre replicado en Flask).

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.shared.exception`
- Clases existentes (no recrear, extender solo si un caso nuevo lo justifica):
  - `ApiResponse<T>` — sobre único de respuesta.
  - `GlobalExceptionHandler` — `@RestControllerAdvice`, único punto de captura de excepciones.
  - `ResourceNotFoundException`, `DuplicateResourceException`, `BusinessRuleException`, `UnauthorizedException` — las cuatro excepciones custom de dominio.
- Cualquier módulo nuevo (`modules/[modulo]/service`) lanza estas excepciones; **nunca** crea su propio manejo de errores ni captura genérica de `Exception`.

### 2.2 Módulo frontend (web)

- Todo el manejo de errores HTTP pasa por `frontend/src/lib/api.ts` (`ApiError`, función `request<T>`). Ningún componente llama `fetch` directamente ni interpreta códigos HTTP por su cuenta.
- Los componentes consumen `ApiError.status`, `ApiError.message` y `ApiError.data` para decidir la UI (toast, error inline, redirección).

### 2.3 Módulo móvil

- Mismo contrato de sobre y los mismos códigos HTTP que la web. El cliente HTTP de `mobile/src/lib/api.ts` (fase 2) debe implementar la misma interfaz que `frontend/src/lib/api.ts`, lanzando un error equivalente a `ApiError`.
- Diferencia obligatoria respecto a web: el móvil se usa en campo por operarios con conectividad intermitente, por lo que el error de red (fetch fallido, timeout) es un caso de uso frecuente y no una excepción marginal — ver sección 5.2.

### 2.4 Restricciones técnicas

- Librerías que DEBE usar: SLF4J vía `@Slf4j` (Lombok) en backend; `fetch` nativo en frontend web (ya en uso, no agregar Axios ni librerías HTTP adicionales).
- Librerías que NO debe usar: ninguna librería de manejo de excepciones adicional en backend (Spring ya cubre el caso con `@RestControllerAdvice`); ninguna librería de "result/either" en TypeScript — el contrato usa `throw` + `try/catch` sobre `ApiError`.
- Patrón de catálogos aplicable: no aplica — los tipos de error son fijos (son parte del contrato HTTP, no datos de negocio configurables).

## 3. El sobre de respuesta como contrato único

Todo endpoint, exitoso o fallido, de **cualquier servicio** (backend Spring, microservicio Flask) responde con esta forma, definida en `shared/types/api.ts` y espejada en `ApiResponse.java`:

```json
{
  "ok": true,
  "message": "string legible para humanos",
  "data": "T | null"
}
```

- `ok`: `true` únicamente si la operación fue exitosa. Nunca `true` con un código HTTP de error, ni `false` con un código 2xx.
- `message`: siempre presente, en inglés (idioma de código, ver SPEC-000 sección 5.1), legible por un desarrollador o mostrable en UI genérica.
- `data`: el payload en éxito; `null` en la mayoría de errores; en validación (400) lleva `{ "errors": [...] }` — es la única excepción donde un error trae `data` no nulo.
- El código HTTP siempre acompaña al sobre. El sobre nunca sustituye al código de estado; ambos deben ser coherentes.

### 3.1 Ejemplo de éxito

Referencia real: `HealthController.health()`.

```json
// GET /api/v1/health → 200 OK
{
  "ok": true,
  "message": "Service is healthy",
  "data": { "status": "UP" }
}
```

### 3.2 Ejemplo de error simple (sin datos)

```json
// GET /api/v1/catalog-items/999 → 404 Not Found
{
  "ok": false,
  "message": "Catalog item not found",
  "data": null
}
```

### 3.3 Ejemplo de error de validación (con datos)

```json
// POST /api/v1/interventions → 400 Bad Request
{
  "ok": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "scheduledDate", "message": "must not be null" },
      { "field": "zoneId", "message": "must not be null" }
    ]
  }
}
```

## 4. Tabla de excepciones: Java → HTTP → mensaje → logging

Esta tabla documenta con fidelidad el comportamiento de `GlobalExceptionHandler.java` tal como está implementado. Ningún handler nuevo se agrega sin pasar por este mismo archivo.

| Excepción Java | Código HTTP | Mensaje en el sobre | Nivel de log | Qué se loggea |
|---|---|---|---|---|
| `ResourceNotFoundException` | 404 Not Found | El mensaje de la excepción (definido por quien la lanza) | `warn` | `"Resource not found: {ex.getMessage()}"` |
| `DuplicateResourceException` | 409 Conflict | El mensaje de la excepción | `warn` | `"Duplicate resource: {ex.getMessage()}"` |
| `BusinessRuleException` | 422 Unprocessable Entity | El mensaje de la excepción | `warn` | `"Business rule violated: {ex.getMessage()}"` |
| `UnauthorizedException` | 401 Unauthorized | El mensaje de la excepción | `warn` | `"Unauthorized access: {ex.getMessage()}"` |
| `MethodArgumentNotValidException` (Bean Validation) | 400 Bad Request | `"Validation failed"` (fijo) | `warn` | `"Validation failed with {n} field error(s)"` — nunca los valores enviados por el usuario |
| `NoHandlerFoundException` | 404 Not Found | `"Endpoint not found"` (fijo) | `warn` | `"No handler found for {method} {url}"` |
| `Exception` (catch-all, cualquier excepción no mapeada) | 500 Internal Server Error | `"Unexpected server error"` (fijo, nunca el mensaje real de la excepción) | `error` | El stacktrace completo vía `log.error("Unexpected error", ex)` — **solo en el log del servidor, nunca en la respuesta** |

**Nota sobre `NoHandlerFoundException`**: este handler se agregó recientemente para corregir un defecto donde una ruta no mapeada (typo en la URL, endpoint inexistente) devolvía 500 en lugar de 404, porque caía en el catch-all genérico. **Es requisito de este spec que se mantenga**: cualquier cambio futuro a `GlobalExceptionHandler` debe preservar este handler explícito para `NoHandlerFoundException`, colocado antes del catch-all de `Exception`. Para que `NoHandlerFoundException` se dispare (en vez de resolver como 404 "silencioso" de Spring), la propiedad `spring.mvc.throw-exception-if-no-handler-found=true` y `spring.web.resources.add-mappings=false` deben permanecer configuradas.

## 5. Cuándo lanzar cada excepción custom

Ejemplos anclados al dominio de gestión de áreas verdes del campus PUCP (catastro de elementos vegetales, incidencias, intervenciones).

### 5.1 `ResourceNotFoundException` → 404

Se lanza cuando el cliente pide, por id o clave, una entidad que no existe (o fue eliminada vía soft delete).

```java
// Ejemplo: se pide un elemento del catastro (un árbol, un jardín) que no existe
CatalogElement element = elementsRepository.findByIdAndDeletedAtIsNull(id)
    .orElseThrow(() -> new ResourceNotFoundException("Catalog element not found"));
```

Otros casos del dominio: pedir una incidencia por id que no existe, pedir una intervención ya eliminada, pedir un ítem de catálogo (`catalog_items`) con un código inexistente.

### 5.2 `DuplicateResourceException` → 409

Se lanza al intentar crear (o actualizar a) un valor que viola una restricción de unicidad de negocio, no una PK genérica.

```java
// Ejemplo: registrar un elemento del catastro con un código de inventario
// que ya existe (code es UNIQUE en el catálogo de especies o en el tag físico del árbol)
if (elementsRepository.existsByInventoryCodeAndDeletedAtIsNull(request.inventoryCode())) {
    throw new DuplicateResourceException("An element with this inventory code already exists");
}
```

Otro caso del dominio: crear un `catalog_item` con `code` repetido dentro del mismo `catalog_type` (violaría el `UNIQUE(catalog_type_id, code)` de SPEC-003).

### 5.3 `BusinessRuleException` → 422

Se lanza cuando el request es sintácticamente válido (pasó Bean Validation) pero viola una regla del dominio que no es de "campo obligatorio", sino de negocio.

```java
// Ejemplo central del dominio: no se puede cerrar una intervención
// (poda, fumigación, trasplante) sin evidencia fotográfica adjunta
if (intervention.getPhotos().isEmpty()) {
    throw new BusinessRuleException("Cannot close an intervention without photo evidence");
}
```

Otros casos del dominio: intentar marcar una incidencia como "resuelta" sin haber asignado antes un responsable; intentar programar una intervención con fecha anterior a la fecha de reporte de la incidencia que la origina; exceder el número máximo de elementos activos permitidos en una zona por configuración del catálogo.

### 5.4 `UnauthorizedException` → 401

Se lanza cuando la identidad del solicitante no pudo establecerse o el token es inválido/expirado — **no** para permisos insuficientes (eso es 403, ver 5.5).

```java
// Ejemplo: el JWT del operario de campo expiró a mitad de una jornada de registro de incidencias
throw new UnauthorizedException("Invalid or expired token");
```

### 5.5 Nota sobre 403 (sin excepción custom dedicada)

El proyecto no define una `ForbiddenException` propia porque Spring Security ya produce 403 mediante `AccessDeniedException` cuando una regla de autorización (`@PreAuthorize`, filtros de rol) rechaza una request autenticada. Cuando SPEC-001 implemente roles y permisos, `GlobalExceptionHandler` debe ganar un handler para `AccessDeniedException` → 403, con el mismo sobre estándar y `log.warn`. Hasta que eso ocurra, ningún servicio debe simular un 403 devolviendo `UnauthorizedException` (401) — son semánticamente distintos y el frontend los trata distinto (sección 6).

## 6. Comportamiento del frontend por código de respuesta

Todo pasa por `frontend/src/lib/api.ts`. La función `request<T>` ya distingue dos familias de fallo: **fallo de `fetch`** (sin respuesta del servidor — red caída, timeout, DNS) y **respuesta con `ok:false` o status no-2xx** (el servidor sí respondió). Los componentes reaccionan sobre la instancia de `ApiError` que `request` lanza en ambos casos, usando `error.status` para diferenciar.

| Código / caso | Comportamiento obligatorio en frontend |
|---|---|
| `401` | Intentar refresco de sesión (`POST /api/v1/auth/refresh`, ver punto de extensión ya marcado en `api.ts`) y reintentar la request original una sola vez. Si el refresco también falla, redirigir a `/login` con mensaje "Tu sesión expiró, vuelve a iniciar sesión". Las requests concurrentes que reciban 401 mientras un refresco está en curso deben esperar ese refresco en vez de disparar refrescos paralelos. |
| `403` | No redirigir. Mostrar mensaje "No tienes permisos para esta acción" (toast o bloque inline según el contexto) y mantener al usuario en la pantalla actual. |
| `400` | Leer `error.data.errors` (`ValidationErrors`, tipo `FieldError[]`) y mostrar cada mensaje bajo el campo correspondiente del formulario. Nunca mostrar el 400 como toast genérico si hay `errors` estructurados. |
| `404` | Mostrar pantalla o bloque de "recurso no encontrado" con opción de volver. No es un error de aplicación: es un estado válido de la navegación (por ejemplo, seguir un enlace a una incidencia ya eliminada). |
| `409` | Mostrar mensaje inline o modal indicando el conflicto (ej. "Ya existe un elemento con este código de inventario"), permitiendo corregir el campo sin perder el resto del formulario. |
| `422` | Mostrar el `message` de la excepción de regla de negocio como error visible al usuario (no es un bug, es una regla del dominio que el usuario debe entender: ej. "No se puede cerrar la intervención sin evidencia fotográfica"). |
| `500` | Toast genérico: "Error del servidor. Intente más tarde." Nunca mostrar `error.message` crudo del backend en este caso (el backend ya lo fija a `"Unexpected server error"`, pero el frontend tampoco debe intentar interpretarlo). |
| Error de red (`ApiError.status === 0`, `fetch` lanzó) | Toast de conexión: "Sin conexión. Verifique su red." — **ver tratamiento especial en 6.1, crítico para el uso en campo, y la advertencia de 6.0 sobre falsos positivos.** |

### 6.0 `status === 0` no siempre significa "sin red"

`fetch` lanza —y por tanto se traduce a `status: 0`— ante **cualquier** fallo previo a recibir
una respuesta HTTP, no solo ante la falta de conexión. En desarrollo, la causa más frecuente no
es la red:

| Causa real | Qué ve el usuario | Cómo distinguirla |
|---|---|---|
| **CORS mal configurado** (preflight `OPTIONS` con 401, falta `Allow-Origin`, falta `Allow-Credentials`) | "Sin conexión. Verifique su red." | La consola del navegador muestra un error de CORS explícito, y la pestaña Network un `OPTIONS` fallido **antes** de la petición real. El backend responde 200 por `curl` |
| Backend caído o puerto equivocado | El mismo mensaje | `curl` al endpoint también falla |
| `NEXT_PUBLIC_API_URL` apuntando a otro host | El mismo mensaje | La URL de la petición en Network no es la esperada |
| Sin red de verdad | El mismo mensaje | Todo falla, incluido cargar la propia página |

**El mensaje al usuario no cambia** —no tiene forma de actuar distinto y especular le daría
información falsa—, pero **quien depura debe saber que este mensaje es ambiguo**. Ante un "sin
conexión" con el backend sano, revisar CORS antes que la red: es el caso más común y el menos
evidente (ver SPEC-000 §5.2.2).

### 6.1 Conectividad intermitente en campo (móvil) — tratamiento obligatorio

Los operarios registran incidencias e intervenciones desde el móvil en el campus, donde la cobertura es irregular (zonas de jardines, invernaderos, límites del campus). Un error de red **no es un caso raro**: es una condición esperada del flujo normal. Este spec fija como requisito, para toda pantalla móvil que envíe datos (crear incidencia, cerrar intervención, subir foto de evidencia):

1. El error de red se distingue siempre de un error 500: al usuario nunca se le dice "error del servidor" cuando el problema es que no hay señal.
2. El formulario **no debe perder los datos ingresados** cuando falla por red. El estado del formulario permanece editable y se ofrece un botón explícito de "Reintentar" en vez de forzar a rehacer la captura.
3. Los envíos que fallan por red deben ser **seguros de reintentar** — ver la regla de idempotencia de SPEC-C03, sección 8 — para que un doble toque en "Reintentar" (frecuente en campo, con pantallas mojadas o guantes) no cree registros duplicados.
4. Cuando el dispositivo detecta ausencia total de conectividad (no solo un fallo puntual), la UI debe distinguir ese estado de un error transitorio de request y comunicarlo de forma persistente (banner, no solo un toast que desaparece), ya que el operario puede seguir trabajando varios minutos sin señal.

## 7. Reglas de logging

- `warn` para todo 4xx (`ResourceNotFoundException`, `DuplicateResourceException`, `BusinessRuleException`, `UnauthorizedException`, validación, `NoHandlerFoundException`): son errores esperables del uso normal del sistema, no fallos del sistema.
- `error` para todo 5xx (el catch-all de `Exception`): sí son fallos del sistema y ameritan investigación; incluyen el stacktrace completo, pero **solo en el log**, nunca en la respuesta HTTP.
- Nunca loggear el stacktrace completo en un `warn` de 4xx (el mensaje de la excepción basta; el stacktrace de una regla de negocio violada no aporta valor y ensucia el log).
- Nunca incluir en ningún log: contraseñas, tokens JWT completos, números de documento de identidad u otro dato personal del operario o vecino que reporta una incidencia. Si un mensaje de excepción pudiera contener datos sensibles (por ejemplo, un mensaje de validación que ecoa el valor enviado), el mensaje debe describir el campo y la regla, no el valor.
- Formato: legible en desarrollo, JSON estructurado en producción (SPEC-000 sección 9, ya definido a nivel de arquitectura — este spec no lo redefine, solo lo hereda).

## 8. Qué NO debe hacerse

- Nunca devolver HTTP 200 con `{ "ok": false, ... }`. El código HTTP y el campo `ok` deben ser consistentes siempre.
- Nunca capturar una excepción con un `catch` vacío o que solo loggea y continúa como si nada hubiera pasado. Si un error no se puede manejar con sentido en ese punto, se relanza (o no se captura) y sube hasta `GlobalExceptionHandler`.
- Nunca exponer al cliente el mensaje real de una excepción interna no controlada (`NullPointerException`, error de SQL, excepción de librería). El catch-all de `Exception` ya fija el mensaje a `"Unexpected server error"` — no se debe crear un handler más específico para "mostrar más detalle" de errores internos.
- Nunca exponer un stacktrace, nombre de clase interna, ruta de archivo del servidor, ni versión de librería en el cuerpo de la respuesta.
- Nunca lanzar `RuntimeException` genérica desde un `Service` esperando que el frontend la interprete: siempre una de las cuatro excepciones custom (o `AccessDeniedException` de Spring Security para 403), para que el mapeo a HTTP sea explícito y verificable.
- Nunca usar `UnauthorizedException` (401) para un caso de permisos insuficientes (eso es 403); son estados distintos con manejo distinto en frontend (sección 6).

## 9. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Toda respuesta HTTP de la API (backend y microservicio Flask), exitosa o de error, tiene el sobre `{ ok, message, data }`. | Llamar cualquier endpoint (ej. `GET /api/v1/health` y `GET /api/v1/health` con id inexistente en otro recurso) con curl/Postman y verificar la forma del JSON en ambos casos. |
| CA-02 | Pedir un recurso por un id que no existe devuelve 404 con `ok:false` y `data:null`. | `GET /api/v1/{recurso}/999999` (id que no existe) → verificar código HTTP 404 y cuerpo `{"ok":false,"message":"...","data":null}`. |
| CA-03 | Pedir una URL que no corresponde a ningún endpoint devuelve 404, no 500. | `GET /api/v1/esto-no-existe-en-ningun-lado` → verificar código HTTP 404 (no 500) con el sobre estándar. |
| CA-04 | Enviar un body inválido (campo requerido faltante) a un endpoint de creación devuelve 400 con la lista de errores por campo dentro de `data.errors`. | `POST` a cualquier endpoint de creación con el body vacío o incompleto → verificar 400 y que `data.errors` sea un arreglo con al menos un `{field, message}`. |
| CA-05 | Ninguna respuesta de error expone un stacktrace, nombre de clase Java, ni ruta de archivo del servidor. | Forzar un error 500 (por ejemplo apagando la base de datos y llamando un endpoint que la use) y verificar que el cuerpo de la respuesta solo contiene `"Unexpected server error"`, sin trazas. |
| CA-06 | En la web, un 401 dispara el intento de refresco de sesión y, si falla, redirige a `/login`. | Simular un token expirado (o borrar la cookie de sesión) y hacer una acción que requiera autenticación → verificar que se intenta `/auth/refresh` (Network tab) y que, si el refresco falla, el navegador termina en `/login`. |
| CA-07 | En móvil (o simulando `fetch` caído en web), un error de red muestra un mensaje de "sin conexión" distinto al de "error del servidor", y el formulario conserva los datos ingresados. | Desconectar la red del dispositivo/emulador, enviar un formulario (ej. registrar una incidencia) → verificar el mensaje específico de conexión y que los campos siguen llenos tras el fallo. |

## 10. Tests

### 10.1 Tests unitarios / de integración backend (JUnit 5 + `@WebMvcTest` o `@SpringBootTest`)

```
- GlobalExceptionHandler.handleResourceNotFound() → 404, ok:false, message del la excepción, data:null
- GlobalExceptionHandler.handleDuplicate() → 409, ok:false, message de la excepción
- GlobalExceptionHandler.handleBusinessRule() → 422, ok:false, message de la excepción
- GlobalExceptionHandler.handleUnauthorized() → 401, ok:false, message de la excepción
- GlobalExceptionHandler.handleValidation() con MethodArgumentNotValidException de 2 campos
  → 400, ok:false, message:"Validation failed", data.errors con 2 entradas {field, message}
- GlobalExceptionHandler.handleNoHandlerFound() → 404, ok:false, message:"Endpoint not found"
- GlobalExceptionHandler.handleUnexpected() con una RuntimeException genérica
  → 500, ok:false, message:"Unexpected server error" (nunca el mensaje real de la excepción)
- Integración: GET a una ruta no registrada (ej. /api/v1/no-existe) → 404, no 500
- Integración: POST con body vacío a un endpoint con @Valid → 400 con data.errors no vacío
- Integración: ninguna respuesta de error contiene la cadena "Exception" ni una ruta de archivo
  del proyecto (assert negativo sobre el body de la respuesta)
```

### 10.2 Tests del microservicio Flask (pytest)

```
- GET /health (o /api/v1/health, según la decisión de SPEC-C03) → 200,
  cuerpo { ok: true, message, data: { status: "UP" } }, mismo sobre que el backend
```

### 10.3 Tests frontend (Jest + Testing Library)

```
- api.ts request() con fetch que rechaza (network error) → lanza ApiError con status 0
  y message "Sin conexión. Verifique su red."
- api.ts request() con response.ok:false y envelope.ok:false → lanza ApiError
  con el status HTTP real y el message del envelope
- api.ts request() con response 200 y envelope.ok:true → retorna envelope.data
- Componente de formulario: al recibir ApiError con status 400 y data.errors,
  muestra cada mensaje bajo su campo correspondiente
- Componente de formulario: al recibir ApiError con status 0 (red), muestra el toast
  de conexión y NO limpia los valores del formulario
- Hook/contexto de auth: al recibir ApiError con status 401, dispara el flujo de
  refresh; si el refresh falla, redirige a /login
```

### 10.4 Tests E2E (si aplica)

```
- Usuario intenta cerrar una intervención sin fotos adjuntas → la API responde 422
  → la UI muestra el mensaje de regla de negocio sin recargar la página
- Usuario pierde conexión a mitad de un registro de incidencia en móvil → la app
  muestra el estado de "sin conexión" y permite reintentar sin perder lo ya escrito
```

## 11. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio del manejo de errores:

- **Nunca salen al cliente:** stacktraces, nombres de clases internas, rutas de archivo del
  servidor, valores de campos sensibles ecoados en mensajes de validación, tokens.
- **XSS:** los `message` son texto plano. El frontend los renderiza como texto, nunca con
  `dangerouslySetInnerHTML`.
- **Sin catálogos:** los códigos HTTP y las cuatro excepciones custom son contrato técnico
  fijo, no datos de negocio configurables.
- **Un solo punto de mapeo:** excepción → HTTP vive en `GlobalExceptionHandler`, nunca en un
  Controller ni en un Service.
- **Idioma:** los mensajes son inglés en el código (§5.1); traducirlos al usuario final es
  responsabilidad del frontend, sin tocar el backend.

**Checklist propio** (el común está en [`REGLAS.md` §6](../REGLAS.md)):

- [ ] Toda excepción nueva de dominio extiende una de las cuatro custom, o se justifica y se
      añade a este spec.
- [ ] Ningún `try/catch` vacío.
- [ ] Ningún mensaje de excepción interna llega al cliente sin pasar por `GlobalExceptionHandler`.
- [ ] Los tests de la sección 10 pasan.

