# Spec Driven Development (SDD) — Guía de Proyecto PUCP

> **Equipo:** 10 desarrolladores | **Plazo:** 8 semanas | **Cliente:** PUCP
> **Tipo:** Software interno on-premise, arquitectura extensible
> **Backend:** Java 17+ / Spring Boot · Python 3.11+ / Flask (microservicios de datos)
> **Frontend:** Next.js (React) + React Native · TypeScript
> **BD:** PostgreSQL · Hibernate/JPA · Flyway
> **Infra:** Docker · Docker Compose · GitHub Actions

---

## 1. Filosofía del enfoque

En este proyecto la IA es el **motor de implementación** y el desarrollador es el **arquitecto de intención y verificador de calidad**. Esto solo funciona si cada spec es lo suficientemente precisa para que:

- La IA no tenga que "adivinar" decisiones de diseño.
- Cualquier desarrollador pueda verificar el resultado sin dominar el stack.
- El código generado sea consistente entre módulos hechos por distintas personas.

### Principios de extensibilidad (no negociables)

Este software se diseña para la PUCP pero debe ser adaptable a otros clientes sin reescribir. Esto implica:

- **Catálogos configurables** en vez de datos hardcodeados (tipos, estados, roles, etiquetas).
- **Separación estricta** entre lógica de negocio, presentación y configuración.
- **Sin referencias hardcodeadas** a "PUCP" en lógica de negocio — usar configuración externalizada.
- **Sin dependencia de servicios externos** (SaaS, APIs de terceros) en esta versión.

**Regla de oro:** si un spec no puede ser verificado por alguien que no domina la tecnología, el spec está incompleto.

---

## 2. Estructura del proyecto en 8 semanas

```
Semana 1       Arquitectura base, specs fundacionales, entorno Docker,
               esquema inicial de BD, proyecto base Spring Boot + Next.js + RN

Semanas 2-3    Sprint 1 — Funcionalidades core (auth, entidades principales, CRUD base)

Semanas 4-5    Sprint 2 — Funcionalidades secundarias, microservicios Python,
               integraciones internas

Semanas 6-7    Sprint 3 — Pulido, edge cases, optimización, reportes

Semana 8       QA integral, fix de bugs, despliegue en servidores PUCP
```

Cada HU debe tener su spec completo **antes** de que el desarrollador comience a trabajar con la IA.

---

## 3. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIDORES PUCP (on-premise)               │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │   Next.js    │   │ React Native │   │  (Futuro: otros  │    │
│  │   (Web)      │   │   (Móvil)    │   │   clientes)      │    │
│  │   :3000      │   │              │   │                  │    │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘    │
│         │                  │                     │              │
│         └──────────────────┼─────────────────────┘              │
│                            │                                    │
│                    ┌───────▼────────┐                           │
│                    │  API Gateway   │                           │
│                    │  (Spring Boot) │                           │
│                    │  :8080         │                           │
│                    └──┬──────────┬──┘                           │
│                       │          │                              │
│              ┌────────▼──┐  ┌───▼───────────┐                  │
│              │ PostgreSQL│  │ Flask          │                  │
│              │ :5432     │  │ (Microservicios│                  │
│              │           │  │  de datos)     │                  │
│              │           │  │ :5001          │                  │
│              └───────────┘  └───────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Comunicación entre servicios

- **Frontend → Backend:** REST sobre HTTPS. Next.js consume la API de Spring Boot.
- **React Native → Backend:** Misma API REST de Spring Boot (mismos endpoints).
- **Spring Boot → Flask:** REST interno (red Docker), solo para procesamiento de datos.
- **Spring Boot → PostgreSQL:** JPA/Hibernate con connection pool (HikariCP).

---

## 4. Estructura de carpetas del repositorio

```
pruebaHesperides/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       ├── ci-frontend.yml
│       └── ci-mobile.yml
│
├── specs/
│   ├── fundacionales/
│   │   ├── SPEC-000-arquitectura-general.md      ← Este documento
│   │   ├── SPEC-001-autenticacion.md
│   │   ├── SPEC-002-modelo-datos.md
│   │   └── SPEC-003-catalogos-configurables.md
│   ├── features/
│   │   ├── SPEC-1XX-*.md                         ← Features del Sprint 1
│   │   ├── SPEC-2XX-*.md                         ← Features del Sprint 2
│   │   └── SPEC-3XX-*.md                         ← Features del Sprint 3
│   ├── compartidos/
│   │   ├── SPEC-C01-componentes-ui.md
│   │   ├── SPEC-C02-manejo-errores.md
│   │   └── SPEC-C03-patrones-api.md
│   ├── REGISTRO.md
│   └── _plantilla.md
│
├── backend/
│   ├── Dockerfile
│   ├── pom.xml (o build.gradle)
│   └── src/
│       ├── main/
│       │   ├── java/pe/edu/pucp/proyecto/
│       │   │   ├── config/          ← Configuración Spring, CORS, Security
│       │   │   ├── modules/
│       │   │   │   └── [modulo]/
│       │   │   │       ├── controller/    ← @RestController
│       │   │   │       ├── service/       ← Lógica de negocio (interfaces + impl)
│       │   │   │       ├── repository/    ← @Repository (JPA)
│       │   │   │       ├── dto/           ← Request/Response DTOs
│       │   │   │       ├── entity/        ← @Entity JPA
│       │   │   │       └── mapper/        ← Entity ↔ DTO
│       │   │   ├── shared/
│       │   │   │   ├── catalog/     ← Sistema de catálogos configurables
│       │   │   │   ├── exception/   ← Excepciones y @ControllerAdvice
│       │   │   │   ├── security/    ← JWT, filtros, UserDetails
│       │   │   │   └── util/        ← Utilidades compartidas
│       │   │   └── ProyectoApplication.java
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       └── db/migration/    ← Scripts Flyway (V1__, V2__, ...)
│       └── test/
│           └── java/pe/edu/pucp/proyecto/
│               └── modules/[modulo]/
│                   ├── controller/  ← Tests de integración (@WebMvcTest)
│                   ├── service/     ← Tests unitarios (Mockito)
│                   └── repository/  ← Tests de repositorio (@DataJpaTest)
│
├── services/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  ← Flask app factory
│       ├── routes/                  ← Blueprints
│       ├── processors/              ← Lógica de procesamiento de datos
│       └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── src/
│       ├── app/                     ← App Router (Next.js 14+)
│       │   ├── (auth)/              ← Grupo de rutas de autenticación
│       │   ├── (dashboard)/         ← Grupo de rutas autenticadas
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/                  ← Componentes base (Button, Input, Modal, etc.)
│       │   ├── forms/               ← Componentes de formulario reutilizables
│       │   └── layouts/             ← Layouts compartidos
│       ├── hooks/                   ← Custom hooks
│       ├── lib/
│       │   ├── api.ts               ← Cliente HTTP (fetch wrapper tipado)
│       │   ├── auth.ts              ← Lógica de autenticación
│       │   └── constants.ts         ← Constantes de la aplicación
│       ├── types/                   ← Tipos TypeScript compartidos
│       └── styles/
│           └── globals.css
│
├── mobile/
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   └── src/
│       ├── navigation/              ← React Navigation config
│       ├── screens/                 ← Pantallas
│       ├── components/
│       │   ├── ui/                  ← Componentes base (adaptados a móvil)
│       │   └── forms/
│       ├── hooks/
│       ├── lib/
│       │   ├── api.ts               ← Misma interfaz que web, distinta implementación
│       │   └── auth.ts
│       ├── types/                   ← Re-exporta de shared/ o define propios
│       └── stores/                  ← Estado local (AsyncStorage)
│
└── shared/
    └── types/                       ← Tipos TypeScript compartidos web + móvil
        ├── api.ts                   ← Interfaces de Request/Response
        ├── models.ts                ← Modelos de dominio
        └── catalog.ts               ← Tipos de catálogos configurables
```

---

## 5. Convenciones obligatorias

### 5.1 Convenciones generales

| Aspecto | Convención |
|---------|-----------|
| Idioma de código | **Inglés** para todo (variables, funciones, clases, comentarios en código) |
| Idioma de specs | **Español** |
| Idioma de commits | **Español**, Conventional Commits con alcance: `feat(auth): agrega inicio de sesión` |
| Branch naming | `feature/SPEC-NNN-nombre-corto`, `fix/SPEC-NNN-descripcion`, `hotfix/descripcion` |
| PR naming | `[SPEC-NNN] Descripción corta en español` |
| Aprobaciones PR | Mínimo **1** aprobación de otro integrante |

### 5.2 Convenciones Java / Spring Boot

| Aspecto | Convención |
|---------|-----------|
| Package base | `pe.edu.pucp.proyecto` |
| Clases Entity | `PascalCase`, sufijo ninguno: `User`, `Course`, `Enrollment` |
| Clases DTO | Sufijo `Request` / `Response`: `CreateUserRequest`, `UserResponse` |
| Clases Controller | Sufijo `Controller`: `UserController` |
| Clases Service | Interfaz + Impl, en **plural**: `UsersService` (interfaz), `UsersServiceImpl` (implementación) |
| Clases Repository | Sufijo `Repository`, en **plural**: `UsersRepository` |
| Métodos REST | `getAll`, `getById`, `create`, `update`, `delete`, `search` |
| Paquete por módulo | Cada feature en su propio paquete dentro de `modules/` |
| Validación | Bean Validation (`@Valid`, `@NotBlank`, `@Size`, etc.) en DTOs |
| Respuestas API | Siempre `ResponseEntity<ApiResponse<T>>` con HTTP status explícito |
| Excepciones | Excepciones custom + `@ControllerAdvice` global |
| Logs | SLF4J con `@Slf4j` (Lombok). Nunca `System.out.println` |
| Config sensible | Variables de entorno via `application.yml` con `${ENV_VAR:default}` |

### 5.3 Convenciones TypeScript / Next.js / React Native

| Aspecto | Convención |
|---------|-----------|
| Componentes | `PascalCase`, archivos `PascalCase.tsx`: `UserCard.tsx` |
| Hooks | `camelCase` con prefijo `use`: `useAuth.ts`, `useCatalog.ts` |
| Tipos/Interfaces | `PascalCase`, prefijo `I` solo si colisiona con componente |
| Archivos de utilidad | `camelCase`: `formatDate.ts`, `validateEmail.ts` |
| Props | Interface nombrada `[Componente]Props`: `UserCardProps` |
| API calls | Siempre a través de `lib/api.ts`, nunca `fetch` directo en componentes |
| Estado global | React Context para auth y catálogos, estado local para UI |
| Estilos web | Tailwind CSS (utility-first), nunca CSS inline para layouts |
| Estilos móvil | StyleSheet de React Native, misma paleta de colores que web |
| Rutas web | Next.js App Router, carpetas con `page.tsx` |
| Navegación móvil | React Navigation (Stack + Tab navigators) |

### 5.4 Convenciones de base de datos

| Aspecto | Convención |
|---------|-----------|
| Nombre de tablas | `snake_case` plural: `users`, `course_enrollments` |
| Nombre de columnas | `snake_case`: `first_name`, `created_at` |
| Primary key | `id` tipo `BIGSERIAL` o `UUID` (definir en SPEC-002) |
| Timestamps | Siempre `created_at` y `updated_at` en toda tabla |
| Soft delete | `deleted_at TIMESTAMP NULL` (nunca DELETE físico) |
| Foreign keys | `[tabla_singular]_id`: `user_id`, `course_id` |
| Índices | `idx_[tabla]_[columnas]`: `idx_users_email` |
| Migraciones | Flyway, archivos `V[N]__[description].sql` en `resources/db/migration/` |
| Rango de migraciones | Por spec propietaria: fundacionales `V001`-`V099`; un SPEC-1NN usa `V1NN__`. El rango lo fija la spec que **posee** la tabla, no la primera que la consume |
| Datos de catálogos | Tablas de catálogo con `code`, `label`, `is_active`, `sort_order` |

### 5.5 Convenciones Docker

| Aspecto | Convención |
|---------|-----------|
| Nombres de servicio | `backend`, `frontend`, `mobile-api`, `db`, `data-service` |
| Puertos | Backend: 8080, Frontend: 3000, Flask: 5001, PostgreSQL: 5432 |
| Env vars | Archivo `.env` (no commiteado), `.env.example` (commiteado con placeholders) |
| Volúmenes | Solo para BD en dev (`pgdata:/var/lib/postgresql/data`) |

---

## 6. Plantilla de Spec (copiar para cada HU)

Todo el contenido entre las líneas de corte es la plantilla. Guardar como `specs/_plantilla.md`.

---

````markdown
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
> - SPEC-002 (modelo de datos) para las entidades involucradas
> - SPEC-C01 (componentes UI) si la feature tiene interfaz
> - SPEC-C02 (manejo de errores)
> - SPEC-C03 (patrones de API)

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.proyecto.modules.[modulo]`
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
- [ ] El paquete Java es `pe.edu.pucp.proyecto.modules.[modulo].[capa]`.
- [ ] Los componentes TypeScript están en la carpeta correcta.
- [ ] Los nombres de clases/componentes siguen las convenciones.
- [ ] La migración Flyway tiene número de versión correcto.
- [ ] No se instalaron dependencias no autorizadas.
- [ ] Los tests generados cubren todos los criterios de aceptación.
- [ ] Todos los tests pasan (`mvn test` / `npm test`).
- [ ] La funcionalidad se probó manualmente en web.
- [ ] La funcionalidad se probó manualmente en móvil (o simulador).
- [ ] No hay datos hardcodeados (URLs, credenciales, nombres de PUCP en lógica).
- [ ] Los mensajes de error son claros para el usuario final.
- [ ] No hay `System.out.println`, `console.log` de depuración.
- [ ] Se usó soft delete (no DELETE físico).
- [ ] Se usaron catálogos configurables donde corresponde.
````

---

## 7. Specs fundacionales (Semana 1)

Estos specs se escriben antes de cualquier feature y son la base de todo. Aquí van las directrices clave para cada uno (cada equipo debe expandirlos):

### SPEC-000 — Arquitectura general

Este documento (el que estás leyendo). Define estructura de carpetas, convenciones de código, stack tecnológico, diagrama de arquitectura y lineamientos de extensibilidad.

### SPEC-001 — Autenticación y autorización

Debe definir:

```
- Mecanismo: JWT (access token + refresh token)
- Almacenamiento del token:
    - Web (Next.js): httpOnly cookie (no localStorage)
    - Móvil (React Native): SecureStore / Keychain
- Spring Security: filtro JWT que valida token en cada request
- Endpoints:
    POST /api/v1/auth/login    → { accessToken, refreshToken, expiresIn }
    POST /api/v1/auth/refresh  → { accessToken, expiresIn }
    POST /api/v1/auth/logout   → 204
    GET  /api/v1/auth/me       → datos del usuario autenticado
- Roles: definir como catálogo configurable (ADMIN, USER, etc.)
- Tabla: users (id, email, password_hash, role_catalog_id,
                is_active, last_login, created_at, updated_at, deleted_at)
- Password hashing: BCrypt via Spring Security
- Expiración: access token 30 min, refresh token 7 días
```

### SPEC-002 — Modelo de datos

Debe definir:

```
- Todas las entidades con sus campos, tipos y relaciones
- Diagrama ER (puede ser Mermaid en el markdown)
- Decisión de ID: BIGSERIAL vs UUID (recomendar BIGSERIAL para on-premise)
- Convención de auditoría: created_at, updated_at, deleted_at en toda tabla
- Migraciones iniciales: V1__create_catalog_tables.sql, V2__create_users.sql, etc.
- Datos semilla (seed data) para catálogos iniciales
```

### SPEC-003 — Catálogos configurables

```
Sistema para evitar enums hardcodeados. Estructura base:

CREATE TABLE catalog_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,      -- 'ROLE', 'STATUS', 'PRIORITY'
    name VARCHAR(100) NOT NULL,            -- 'Roles del sistema'
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,       -- TRUE = no editable por usuario
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_type_id BIGINT NOT NULL REFERENCES catalog_types(id),
    code VARCHAR(50) NOT NULL,             -- 'ADMIN', 'ACTIVE', 'HIGH'
    label VARCHAR(100) NOT NULL,           -- 'Administrador', 'Activo', 'Alta'
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,                        -- datos extra flexibles
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(catalog_type_id, code)
);

Uso en código:
- Backend: @ManyToOne a CatalogItem en las entidades
- Frontend: endpoint GET /api/v1/catalogs/{typeCode}/items
            retorna lista para llenar dropdowns/selects
- Toda referencia a tipos, estados, prioridades, categorías
  usa este sistema, NO enums Java ni constantes TypeScript
```

### SPEC-C01 — Componentes UI compartidos

```
Catálogo de componentes base que la IA debe reutilizar, nunca recrear:

WEB (Next.js + Tailwind):
- Button: variantes primary, secondary, danger, ghost; tamaños sm, md, lg
- Input: con label, helper text, error state, disabled
- Select: carga opciones desde catálogos
- Modal: con título, contenido, acciones
- Toast: success, error, warning, info
- DataTable: con paginación, sorting, búsqueda
- Card: contenedor genérico
- LoadingSkeleton: placeholder de carga

MÓVIL (React Native):
- Mismos componentes adaptados a primitivas RN
- Usar StyleSheet, misma paleta de colores
- Componentes táctiles: usar Pressable, no TouchableOpacity (deprecated)
```

### SPEC-C02 — Manejo de errores

```
BACKEND (Spring Boot):
- Toda excepción pasa por @ControllerAdvice GlobalExceptionHandler
- Toda respuesta, exitosa o de error, usa el sobre estándar:
  {
    "ok": boolean,      // true en éxito, false en error
    "message": "string legible",
    "data": T | null    // null cuando no hay datos que devolver
  }
- Ejemplo de error:
  {
    "ok": false,
    "message": "Catalog type not found",
    "data": null
  }
- El código HTTP acompaña al sobre: nunca devolver 200 para un error.
- Excepciones custom: ResourceNotFoundException, DuplicateResourceException,
  BusinessRuleException, UnauthorizedException
- Nunca exponer stacktraces en responses de producción
- Loggear excepciones con slf4j: warn para 4xx, error para 5xx

FRONTEND (web + móvil):
- api.ts intercepta todos los errores HTTP
- 401 → redirigir a login
- 403 → mostrar "Sin permisos"
- 400 → mostrar errores de validación inline
- 404 → pantalla de "no encontrado"
- 500 → toast genérico "Error del servidor. Intente más tarde."
- Errores de red → toast "Sin conexión. Verifique su red."
```

### SPEC-C03 — Patrones de API

```
FORMATO DE ENDPOINTS:
- Base: /api/v1/[recurso-plural]
- CRUD: GET (listar), GET /:id, POST, PUT /:id, DELETE /:id
- Búsqueda: GET /api/v1/[recurso]?search=texto&status=activo
- Acciones: POST /api/v1/[recurso]/:id/[accion] (ej: /approve, /reject)

PAGINACIÓN:
- Request: ?page=0&size=20&sort=createdAt,desc
- Response (el resultado paginado viaja dentro de `data`):
  {
    "ok": true,
    "message": "Users retrieved successfully",
    "data": {
      "content": [...],
      "page": { "number": 0, "size": 20, "totalElements": 150, "totalPages": 8 }
    }
  }
- Implementación: Spring Data Pageable

FILTROS:
- Query params: ?status=ACTIVE&type=COURSE&dateFrom=2024-01-01
- Implementación: Spring Specification o @Query

VERSIONADO:
- En URL: /api/v1/
- Cambios breaking → /api/v2/ (no anticipado en este proyecto)
```

---

## 8. Flujo de trabajo diario

```
┌──────────────────────────────────────────────────────────────┐
│                   FLUJO POR CADA HU                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SPEC WRITING (1-2 horas)                                 │
│     → Llenar la plantilla completa.                          │
│     → Definir contratos de API con request/response exactos. │
│     → Escribir la migración SQL.                             │
│     → Definir al menos 5 criterios de aceptación.            │
│                                                              │
│  2. SPEC REVIEW (30 min)                                     │
│     → Al menos 1 persona revisa y aprueba.                   │
│     → ¿Los contratos son claros?                             │
│     → ¿Los criterios son verificables sin leer código?       │
│     → ¿Se diferencia web vs móvil?                           │
│     → Aprobar como comentario en el PR del spec.             │
│                                                              │
│  3. GENERACIÓN CON IA (variable)                             │
│     → Alimentar a la IA con:                                 │
│       • El spec de la feature                                │
│       • Los specs fundacionales relevantes                   │
│       • Código existente del módulo que debe integrar        │
│     → Orden: MIGRACIÓN → TESTS → IMPLEMENTACIÓN             │
│     → Iterar hasta que los tests pasen.                      │
│                                                              │
│  4. VERIFICACIÓN HUMANA (30-60 min)                          │
│     → Ejecutar checklist post-generación.                    │
│     → `mvn test` pasa limpio.                                │
│     → `npm test` pasa limpio (web y móvil).                  │
│     → Probar cada criterio de aceptación manualmente.        │
│     → Verificar en web (localhost:3000).                     │
│     → Verificar en móvil (emulador o dispositivo).           │
│     → Si algo falla → volver al paso 3 con feedback          │
│       específico (pegar el error, no decir "no funciona").   │
│                                                              │
│  5. PEER REVIEW (30 min)                                     │
│     → Otra persona verifica criterios de aceptación.         │
│     → No necesita leer todo el código.                       │
│     → Foco: ¿funciona como dice el spec?                     │
│     → Revisar que la migración sea coherente con SPEC-002.   │
│                                                              │
│  6. MERGE                                                    │
│     → PR con al menos 1 aprobación.                          │
│     → GitHub Actions ejecuta: mvn test, npm test, lint.      │
│     → Merge a develop.                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Prompt base para interacción con la IA

```
Eres un desarrollador senior trabajando en un proyecto para la PUCP.

STACK TECNOLÓGICO:
- Backend: Java 17 + Spring Boot + JPA/Hibernate + PostgreSQL
- Frontend web: Next.js 14+ (App Router) + TypeScript + Tailwind
- Frontend móvil: React Native + TypeScript
- Migraciones: Flyway
- Contenedores: Docker + Docker Compose

ARQUITECTURA DEL PROYECTO:
[Pegar sección relevante de SPEC-000]

CONVENCIONES OBLIGATORIAS:
[Pegar sección 5 de este documento o las partes relevantes]

FEATURE A IMPLEMENTAR:
[Pegar el spec completo de la feature]

CÓDIGO EXISTENTE QUE DEBE INTEGRAR:
[Pegar archivos relevantes del módulo]

INSTRUCCIONES:
1. Genera primero la migración Flyway (V[N]__[descripcion].sql).
2. Genera los tests (JUnit para backend, Jest para frontend).
3. Genera la implementación que haga pasar esos tests.
4. Respeta estrictamente la estructura de carpetas y convenciones.
5. Usa catálogos configurables (catalog_items) donde aplique, NO enums.
6. No instales librerías adicionales sin listarlas primero.
7. Si el spec tiene ambigüedades, pregúntame antes de asumir.
8. No hardcodees URLs, credenciales, ni referencias a "PUCP" en lógica de negocio.
```

---

## 10. Señales de alerta

| Señal | Qué significa | Acción |
|-------|--------------|--------|
| La IA pide mucha clarificación | Spec ambiguo | Reescribir secciones confusas antes de continuar |
| Tests pasan pero la funcionalidad "se siente rara" | Faltan criterios de UX | Agregar criterios sobre estados, transiciones, feedback |
| Dos features se ven visualmente distintas | SPEC-C01 incompleto o ignorado | Detener y consolidar componentes UI |
| La IA instala dependencias nuevas | Spec no restringe herramientas | Agregar librerías permitidas/prohibidas |
| Un cambio rompe otro módulo | Contratos de interfaz débiles | Reforzar sección de contratos API |
| Funciona en web pero no en móvil | Spec no diferencia plataformas | Separar criterios por plataforma |
| La IA usa enums Java en vez de catálogos | No leyó SPEC-003 | Incluir SPEC-003 en el prompt |
| La migración Flyway falla | Número de versión duplicado | Respetar el rango por spec (sección 5.4): fundacionales `V001`-`V099`, SPEC-1NN usa `V1NN__` |
| `System.out.println` en el código | IA ignoró convenciones | Recordar: usar `@Slf4j` de Lombok |

---

## 11. Definición de "Hecho" (Definition of Done)

Una feature se considera completada cuando:

1. Todos los criterios de aceptación del spec se verificaron manualmente.
2. Todos los tests pasan: `mvn test` (backend), `npm test` (web y móvil).
3. GitHub Actions CI pasa en verde.
4. Funciona correctamente en web (Chrome, Firefox) Y en móvil (Android, iOS o emulador).
5. Pasó peer review con al menos 1 aprobación adicional.
6. No introduce dependencias no autorizadas.
7. Usa catálogos configurables donde corresponde.
8. No hay datos hardcodeados ni referencias a PUCP en lógica de negocio.
9. La migración Flyway se ejecuta sin errores desde cero.
10. El spec se marca como completado en `specs/REGISTRO.md`.

---

## 12. Registro de specs (tracking)

Mantener en `specs/REGISTRO.md`:

```markdown
| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|-------------|
| SPEC-000 | Arquitectura general      | ✅ Completado   | [Nombre]   | S0     | YYYY-MM-DD  |
| SPEC-001 | Autenticación             | 🔄 En progreso  | [Nombre]   | S0     |             |
| SPEC-002 | Modelo de datos           | 📝 En spec      | [Nombre]   | S0     |             |
| SPEC-003 | Catálogos configurables   | 📝 En spec      | [Nombre]   | S0     |             |
| SPEC-C01 | Componentes UI            | ⏳ Pendiente    | —          | S0     |             |
| SPEC-C02 | Manejo de errores         | ⏳ Pendiente    | —          | S0     |             |
| SPEC-C03 | Patrones de API           | ⏳ Pendiente    | —          | S0     |             |
| SPEC-100 | [Feature 1]               | ⏳ Pendiente    | —          | S1     |             |
```

---

## Anexo A — Comandos útiles de desarrollo

```bash
# Levantar todo el entorno de desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Ver logs del backend
docker-compose logs -f backend

# Ejecutar tests backend
cd backend && mvn test

# Ejecutar tests frontend web
cd frontend && npm test

# Ejecutar tests móvil
cd mobile && npm test

# Ejecutar migración Flyway manualmente
cd backend && mvn flyway:migrate

# Conectar a PostgreSQL
docker exec -it proyecto-db psql -U postgres -d proyecto_pucp

# Limpiar y reconstruir
docker-compose down -v && docker-compose up --build
```

---

## Anexo B — Checklist rápido de pre-codeo

```
Antes de abrir la IA para una feature, verificar:

[ ] ¿El spec tiene objetivo claro en una oración?
[ ] ¿Los contratos de API tienen request Y response con tipos exactos?
[ ] ¿La migración SQL está escrita?
[ ] ¿Hay al menos 5 criterios de aceptación verificables sin leer código?
[ ] ¿Se contemplan flujos alternativos y al menos 3 edge cases?
[ ] ¿Se especifica comportamiento web Y móvil?
[ ] ¿Se referencia qué catálogos configurables aplican?
[ ] ¿Las convenciones de código están incluidas en el prompt?
[ ] ¿Alguien más revisó y aprobó el spec?

Si falta alguno → completar ANTES de escribir código.
```
