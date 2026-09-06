# Diseño — Proyecto base Hesperides

| Campo | Valor |
|-------|-------|
| Fecha | 2026-09-06 |
| Alcance | Monorepo, entorno Docker, CI, scaffolding mínimo verificable |
| Referencia | `specs/fundacionales/SPEC-000-arquitectura-general.md` |
| Fuera de alcance | Autenticación, entidades de negocio, React Native, tests E2E, despliegue AWS |

## 1. Objetivo

Dejar el monorepo listo para que el equipo empiece a desarrollar features sin
inventar estructura ni contratos: un comando levanta los cuatro servicios, tres
comandos corren los tests, y el CI valida cada PR.

**Monorepo.** Backend, frontend, servicios Python, móvil, tipos compartidos y specs
viven en un único repositorio como carpetas hermanas. Un `git clone` trae todo, los
tipos de `shared/` se comparten sin publicar paquetes, y un cambio que cruza backend
y frontend viaja en un solo PR. El costo es que el CI debe filtrar por ruta para no
correr de más — resuelto en la sección 8.

## 2. Principio rector: mínimo verificable

Cada servicio incluye el código más pequeño que demuestre las convenciones del
SPEC-000 y pase un test. El calendario de ocho semanas del documento es informativo
y no condiciona este diseño. Nada de lógica de negocio: las entidades, servicios y
módulos pertenecen a los specs fundacionales que aún no se escriben, y adelantarlos
desde aquí los contradiría.

Lo que sí se escribe es el contrato compartido — el sobre de respuesta y el manejo
de errores — porque es la pieza que evita que diez personas generando código con IA
produzcan diez formatos distintos.

## 3. Estructura del repositorio

```
Hesperides/
├── docker-compose.yml            db + backend + frontend + data-service
├── docker-compose.dev.yml        override de desarrollo: hot reload, puertos
├── .env.example                  placeholders, sin credenciales reales
├── .gitignore
├── README.md
├── .github/workflows/
│   ├── ci-backend.yml
│   ├── ci-frontend.yml
│   └── ci-data-service.yml
├── specs/
│   ├── fundacionales/SPEC-000-arquitectura-general.md
│   ├── features/
│   ├── compartidos/
│   ├── _plantilla.md
│   └── REGISTRO.md
├── backend/     Spring Boot 3 · Java 17 · Maven · pe.edu.pucp.hesperides
├── services/    Flask 3 · pytest
├── frontend/    Next.js 14 App Router · TypeScript · Tailwind
├── mobile/      README: fase 2, posterior al web
└── shared/types/  api.ts · models.ts · catalog.ts
```

`mobile/` queda como carpeta con README porque React Native es fase 2, posterior a
tener el web funcionando. `shared/types/` se diseña desde ahora para consumo dual
web + móvil: es lo que sostiene la reutilización de código entre plataformas.

## 4. Servicios y puertos

| Servicio | Contenedor | Puerto | Publicado al host |
|----------|-----------|--------|-------------------|
| PostgreSQL 16 | `hesperides-db` | 5432 | solo en dev |
| Spring Boot | `hesperides-backend` | 8080 | sí |
| Next.js | `hesperides-frontend` | 3000 | sí |
| Flask | `hesperides-data-service` | 5001 | solo en dev |

Flask no se expone al host en producción: solo el backend lo alcanza por la red
interna de Docker, como define la sección 3 del SPEC-000.

El servicio `mobile-api` que lista la sección 4 del SPEC-000 no se crea. No existe
en el diagrama de arquitectura de la sección 3, donde móvil consume la misma API de
Spring Boot que el web. Se corrige el documento.

## 5. Contrato compartido

### Sobre de respuesta

Todo endpoint devuelve `{ ok, message, data }`. En `shared/exception/`:

- `ApiResponse<T>` — el sobre, con factorías `ok()` y `error()`.
- `GlobalExceptionHandler` — `@RestControllerAdvice`, log `warn` en 4xx y `error`
  en 5xx, nunca stacktrace en la respuesta.
- `ResourceNotFoundException`, `DuplicateResourceException`,
  `BusinessRuleException`, `UnauthorizedException`.

El frontend lo refleja en `shared/types/api.ts` con `ApiResponse<T>` y `Page<T>`.

### Cliente HTTP

`frontend/src/lib/api.ts` es el único lugar que llama a `fetch`. Centraliza el
manejo de 401, 403, 400, 404, 500 y errores de red según SPEC-C02. Los componentes
nunca hacen `fetch` directo.

**Preparado para refresh tokens.** El SPEC-000 (sección 7, SPEC-001) define sesiones
con access token de 30 minutos y refresh token de 7 días, con
`POST /api/v1/auth/refresh`. Eso condiciona la forma del cliente HTTP: ante un 401 no
basta con redirigir a login — hay que intentar el refresh y reintentar la petición
original, y evitar que varias peticiones simultáneas disparen varios refreshes en
paralelo encolándolas tras el primero.

El scaffold deja esa estructura montada con el punto de extensión marcado, pero no
implementa la autenticación: el flujo de login, el almacenamiento del token y el
filtro de Spring Security pertenecen a SPEC-001. Se prepara el hueco para que esa
pareja no tenga que reescribir el cliente.

## 6. Base de datos

Una sola migración Flyway en este scaffold:
`V001__create_catalog_tables.sql`, con `catalog_types` y `catalog_items` tal como
las define la sección 7 del SPEC-000, más semilla del tipo `ROLE`.

`V002__create_users.sql` **no** se escribe aquí: la tabla `users` pertenece a
SPEC-001 y la escribe esa pareja. Adelantarla generaría conflicto de versiones.

## 7. Testing

| Capa | Herramientas | Test incluido |
|------|-------------|---------------|
| Backend | JUnit 5, Mockito, JaCoCo | `HealthController` (`@WebMvcTest`) y `GlobalExceptionHandler` |
| Frontend | Jest, React Testing Library | render de la home |
| Flask | pytest | `GET /health` |

Cypress/Playwright y Appium quedan fuera: son E2E y no hay flujos que ejercitar
todavía. Se registran en el README como pendientes de sprint.

## 8. Integración continua

Tres workflows, cada uno con filtro `paths:` para no correr de más, disparados en
push y PR contra `main` y `develop`:

- `ci-backend.yml` — `mvn -B verify`, JDK 17, caché de `~/.m2`.
- `ci-frontend.yml` — `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- `ci-data-service.yml` — `pip install -r requirements.txt`, `pytest`.

## 9. Configuración y despliegue

Toda la configuración se externaliza por variables de entorno con la forma
`${ENV_VAR:default}`. Ninguna credencial, host ni puerto vive en el código.

**Destino: la nube.** El equipo decidió alojar la solución en AWS — EC2, RDS
PostgreSQL 16, S3 y CloudWatch, con entornos de staging y producción. Las
licencias de la cuenta educativa aún no están disponibles, así que hasta que
lleguen el desarrollo ocurre en Docker Compose local y la validación en GitHub
Actions.

Esto no impone ningún cambio al scaffold. La externalización de configuración es
justamente lo que hace que el mismo build corra contra Postgres en contenedor hoy
y contra RDS mañana: cambia el `.env`, no el código. Cuando lleguen las
licencias, el trabajo pendiente será el pipeline de despliegue y los security
groups, no tocar la aplicación.

El SPEC-000 describe despliegue on-premise en servidores PUCP (secciones 1 y 3).
Queda obsoleto y se corrige.

## 10. Git

- `git init`, remoto `https://github.com/BotaniPUCP/Hesperides.git`.
- Ramas `main` y `develop`; el flujo de la sección 8 del SPEC-000 mergea a `develop`.
- Commits separados y legibles: scaffold por servicio, actualización de SPEC-000
  aparte, para que el diff de cada uno se pueda revisar.

## 11. Cambios al SPEC-000

1. Placeholder `proyecto` → `hesperides` (paquete Java, nombre de BD, contenedores).
2. Raíz `pruebaHesperides/` → `Hesperides/`.
3. Se elimina el servicio Docker `mobile-api`, inexistente en la arquitectura.
4. `mobile/` se marca como fase 2, posterior al web.
5. Tailwind CSS y JaCoCo se listan como dependencias autorizadas.
6. Despliegue on-premise → nube (AWS, pendiente de licencias). Afecta el
   encabezado del documento, la sección 1 y el diagrama de la sección 3.
