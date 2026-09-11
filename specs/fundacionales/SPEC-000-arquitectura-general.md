# Spec Driven Development (SDD) — Guía de Proyecto PUCP

> **Equipo:** 10 desarrolladores | **Plazo:** 8 semanas | **Cliente:** PUCP
> **Tipo:** Software interno con despliegue en la nube (AWS, pendiente de licencias), arquitectura extensible
> **Backend:** Java 26 / Spring Boot 4.1 · Python 3.11+ / Flask (microservicios de datos)
> **Frontend:** Next.js 16+ (React 19) + React Native · TypeScript · Tailwind CSS
>   (subido desde Next.js 14 / React 18 por 1 vulnerabilidad crítica y 7 altas, incluido un bypass de autorización en middleware, CVSS 9.1)
> **BD:** PostgreSQL + PostGIS · Hibernate/JPA + Hibernate Spatial · Flyway
> **Infra:** Docker · Docker Compose · GitHub Actions
> **Calidad:** JaCoCo 0.8.15+ (cobertura backend) · Jest + React Testing Library (frontend) · pytest (data service)
>
> **Versiones exactas verificadas en el pom** (§5.2.1 documenta lo que Spring Boot 4
> cambió respecto a 3.x): Spring Boot **4.1.1**, Spring Security **7.1.1**, Java **26**
> (Temurin 26.0.2), JJWT **0.12.6**, Testcontainers **2.x**, JaCoCo **0.8.15**.

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
- **Sin dependencia de servicios externos** (SaaS, APIs de terceros) en esta versión, **con una
  única excepción: el envío de correo por SMTP** (ver nota abajo).

> **Nota sobre SMTP** (enmienda de SPEC-100 §2.5). La excepción del SMTP, su justificación y
> la condición que la acota —su caída nunca impide una operación de negocio— están en
> [`REGLAS.md` §0.1](../REGLAS.md). Ninguna otra dependencia externa se admite sin enmendar
> este documento.

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
│         SERVIDORES CLOUD (AWS, pendiente de licencias)          │
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
Hesperides/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       ├── ci-frontend.yml
│       └── ci-data-service.yml
│
├── specs/
│   ├── fundacionales/
│   │   ├── SPEC-000-arquitectura-general.md      ← Este documento
│   │   ├── SPEC-001-autenticacion.md
│   │   ├── SPEC-002-modelo-datos.md
│   │   ├── SPEC-003-catalogos-configurables.md
│   │   └── SPEC-004-auditoria.md
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
│       │   ├── java/pe/edu/pucp/hesperides/
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
│       │   │   │   ├── entity/      ← BaseEntity (@MappedSuperclass de auditoría)
│       │   │   │   ├── audit/       ← Auditable, AuditLog, AuditorAware
│       │   │   │   ├── catalog/     ← Sistema de catálogos configurables
│       │   │   │   ├── exception/   ← Excepciones y @ControllerAdvice
│       │   │   │   ├── security/    ← JWT, filtros, UserDetails
│       │   │   │   └── util/        ← Utilidades compartidas
│       │   │   └── HesperidesApplication.java
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       └── db/migration/    ← Scripts Flyway (V1__, V2__, ...)
│       └── test/
│           └── java/pe/edu/pucp/hesperides/
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
│       ├── app/                     ← App Router (Next.js 16+)
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
├── mobile/                           ← Fase 2, posterior al lanzamiento web
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

**Se trasladaron a [`specs/REGLAS.md`](../REGLAS.md), que conserva su numeración:** §5.1
generales, §5.2 Java/Spring Boot, **§5.2.1 Spring Boot 4 vs 3.x**, **§5.2.2 CORS**, §5.3
TypeScript/Next.js/React Native, §5.4 base de datos, §5.5 Docker.

Una referencia a `SPEC-000 §5.x` sigue siendo válida: mismo número, ahora en `REGLAS.md`.

Ahí viven además las diez invariantes del proyecto (§0) y el checklist común (§6), que antes se
repetían en cada spec.

---

## 6. Plantilla de spec

La plantilla es [`specs/_plantilla.md`](../_plantilla.md). Se copia para cada spec nuevo.

Antes se reproducía aquí una segunda copia; se eliminó porque dos copias divergen y ya lo
habían hecho.

---

## 7. Specs fundacionales y compartidos

El índice, el estado y las enmiendas de cada spec están en
[`specs/REGISTRO.md`](../REGISTRO.md).

Antes esta sección resumía el contenido de los otros ocho specs. Se eliminó: los resúmenes
quedaron desfasados respecto a los specs reales —llegaron a contradecir a SPEC-001 sobre el
almacenamiento del token— y un resumen que miente es peor que ninguno. **Cada spec es la
fuente de verdad de su propio contenido.**

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
- Backend: Java 26 + Spring Boot 4.1 + JPA/Hibernate + PostgreSQL
- Frontend web: Next.js 16+ (React 19, App Router) + TypeScript + Tailwind
- Frontend móvil: React Native + TypeScript
- Migraciones: Flyway
- Contenedores: Docker + Docker Compose

ARQUITECTURA DEL PROYECTO:
[Pegar sección relevante de SPEC-000]

CONVENCIONES OBLIGATORIAS:
[Pegar specs/REGLAS.md completo: invariantes, convenciones y checklist]

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
| La migración Flyway falla | Número de versión duplicado | Respetar el rango por spec (REGLAS.md §5.4): fundacionales `V001`-`V099`, SPEC-1NN usa `V1NN__` |
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
7. Cumple las diez invariantes de `REGLAS.md` §0 y su checklist §6.2.
9. La migración Flyway se ejecuta sin errores desde cero.
10. El spec se marca como completado en `specs/REGISTRO.md`.

---

## 12. Registro de specs

El índice vivo, con estados, asignaciones y enmiendas, es
[`specs/REGISTRO.md`](../REGISTRO.md). Antes se reproducía aquí una tabla de ejemplo; se
eliminó para no mantener dos versiones del mismo índice.

---

## Anexo A — Comandos útiles de desarrollo

> `docker-compose.dev.yml` es un **override**, no un compose completo: no
> declara `build` ni `image`, solo modifica lo que ya define el archivo base.
> Por eso todo comando de desarrollo encadena ambos archivos con `-f`.
> Usarlo solo falla con "no image / build context" en `backend`.

### Arranque desde cero (laptop nueva o repo recién clonado)

```bash
# 1. Crear el .env local a partir de la plantilla (solo la primera vez).
#    No se commitea: cada quien tiene el suyo.
cp .env.example .env

# 2. Validar que la combinacion de ambos compose es correcta
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet

# 3. Construir imágenes y levantar los cuatro servicios
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# 4. Verificar que los cuatro servicios están arriba
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

# 5. Seguir el arranque del backend (Flyway aplicando migraciones)
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend
```

Para no repetir los dos `-f` en cada comando, exportar la variable una vez por
terminal. A partir de ahí basta con `docker compose up -d`, `logs -f backend`,
`ps`, `down`:

```bash
export COMPOSE_FILE="docker-compose.yml:docker-compose.dev.yml"
```

### Comandos del día a día

```bash
# Levantar el entorno ya construido (sin --build: solo tras cambiar
# un Dockerfile o las dependencias hace falta reconstruir)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Estado de los servicios
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Ver logs del backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Detener el entorno conservando los datos de la BD
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Ejecutar tests backend
cd backend && mvn test

# Ejecutar tests frontend web
cd frontend && npm test

# Ejecutar tests móvil
cd mobile && npm test

# Ejecutar migración Flyway manualmente
cd backend && mvn flyway:migrate

# Conectar a PostgreSQL (usuario y BD por defecto del .env.example)
docker exec -it hesperides-db psql -U hesperides -d hesperides

# Limpiar y reconstruir (--volumes borra pgdata: la BD arranca vacía
# y Flyway vuelve a aplicar todas las migraciones desde cero)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

---

## Anexo B — Checklist de pre-codeo

Está en [`REGLAS.md` §6.1](../REGLAS.md), junto al checklist posterior a recibir el código.
