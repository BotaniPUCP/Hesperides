# Hesperides

Sistema modular en monorepo desarrollado bajo especificación (Spec Driven Development) por un equipo de 10 desarrolladores de la PUCP.

## Descripción

**Hesperides** es un proyecto de investigación que implementa una arquitectura distribuida en tres capas:
- Backend REST escalable (Spring Boot 4.1, Java 25 LTS)
- Frontend responsivo (Next.js, TypeScript/React)
- Data service especializado (Python Flask)

El dominio funcional y las características específicas se definen en los specs de `specs/`. Este repositorio contiene por ahora la arquitectura base, las convenciones comunes y un sistema de catálogos configurables que permite extender tipos, estados y categorías sin recompilación.

## Incidencias — prueba de concepto web

Disponible en `/incidencias` para `SUPERVISOR` (capataz) y `COORDINADOR`.
Spec: [`SPEC-200`](specs/features/SPEC-200-incidencias.md).

- Capataz: enviar una frase, añadir fotos/ubicación opcionales y seguir sus envíos.
- Coordinación: revisar, aprobar y asignar la atención a una cuadrilla.
- Capataz responsable o coordinación: registrar intervenciones realizadas y resolver
  cuando no quede ninguna pendiente. Se permiten varias intervenciones por incidencia.
- El tablero de coordinación cuenta estos casos y sus intervenciones, no el
  mantenimiento rutinario de otros módulos. Las categorías son provisionales;
  no hay IA ni aplicación React Native en esta entrega.

Solo la descripción es obligatoria para informar o aprobar. Fotos JPEG/PNG/WebP:
máximo seis por incidencia y 5 MiB por archivo. La posición del teléfono se obtiene
solo al solicitarla; puede corregirse o quitarse. Geolocalización desde un teléfono
requiere **HTTPS**: abrir una IP de la red local por HTTP no basta. La captura sigue
funcionando sin permisos de ubicación.

Las fotografías se guardan en `INCIDENT_UPLOAD_DIR` (por defecto
`backend/uploads/incidents` si Java se ejecuta desde `backend/`). Compose usa el
volumen `incident-uploads`; respaldarlo junto con PostgreSQL. Las fotos se consultan
autenticadas por la API, no mediante un directorio público. No se promete guardado
offline ni sincronización automática: ante error se conserva el formulario abierto,
y una subida de fotos fallida no vuelve a crear el registro recibido.

La guía de prueba y las cuentas de ejemplo para una **base aislada** están en
[`docs/demos/incidencias.md`](docs/demos/incidencias.md). No ejecutar los fixtures en
una base con información real.

### Verificación local con Bun y Maven

En este entorno se usa Bun como runtime del frontend. Los cambios de Docker/CI
para migrar el frontend a Bun se gestionan por separado de este módulo. Con
dependencias ya instaladas:

```bash
# Desde frontend/ (el --bun evita ejecutar los scripts con Node)
bun --bun run lint
bun --bun run test -- --runInBand
bun --bun run build
bun --bun run dev

# Desde backend/, con JDK 25 y el socket Podman disponible
DOCKER_HOST=unix://${XDG_RUNTIME_DIR}/podman/podman.sock TESTCONTAINERS_RYUK_DISABLED=true mvn -B verify
```

## Requisitos previos

- **Docker con Docker Compose**, o **Podman** con `podman compose` y su proveedor
  Compose configurados. No es necesario instalar ambos motores.
- **JDK 25 LTS** — obligatorio para todos. El backend fija `<java.version>25</java.version>`
  y Maven Enforcer exige JDK 25.x al iniciar el ciclo de build. Configura `JAVA_HOME`
  para que Maven use esa instalación; no basta generar bytecode 25 con otro JDK.
- **Node.js** 20+
- **Python** 3.11+
- **Git**

## Configuración inicial

Los mismos archivos Compose y Dockerfiles sirven para ambos motores. Elige **una**
alternativa; los comandos de Docker Compose también pueden ejecutarse con
`podman compose` conservando los argumentos. `podman-compose` puede usarse
directamente si es el proveedor instalado. La CI conserva Docker Compose.

```bash
# Clonar el repositorio
git clone https://github.com/BotaniPUCP/Hesperides.git
cd Hesperides

# Copiar configuración de ejemplo
cp .env.example .env

# Completar los valores de .env, incluidos JWT_SECRET, SMTP_FROM y APP_PUBLIC_URL

# Levantar todos los servicios con Docker
docker compose -f compose.yml -f compose.dev.yml up -d

# O, con Podman (alternativa al comando anterior)
podman compose -f compose.yml -f compose.dev.yml up -d

# Seguir los logs con el motor elegido (sustituir por podman compose si aplica)
docker compose -f compose.yml -f compose.dev.yml logs -f
```

Acceso local:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080/api/v1 (sin autenticación todavía; la define el SPEC-001)
- **Data Service**: http://localhost:5001
- **PostgreSQL**: localhost:5432

## Servicios y puertos

| Servicio        | Puerto | Contenedor          | Descripción                          |
|-----------------|--------|---------------------|--------------------------------------|
| PostgreSQL      | 5432   | hesperides-db       | Base de datos relacional con PostGIS |
| Backend (API)   | 8080   | hesperides-backend  | Spring Boot, endpoints REST          |
| Frontend (Web)  | 3000   | hesperides-frontend | Next.js, UI para navegador           |
| Data Service    | 5001   | hesperides-data-service | Python Flask, procesamiento de datos |

## Ejecución de tests

Los tests de backend con Testcontainers requieren una API compatible con Docker.
Con Podman, configurar su socket para Testcontainers es independiente de configurar
`podman compose`; consultar la [guía de Testcontainers para Podman](https://java.testcontainers.org/supported_docker_environment/#podman).

Cada stack tiene su suite de pruebas:

```bash
# Backend (Spring Boot)
cd backend
./mvnw test

# Frontend (Next.js)
cd frontend
npm test

# Data Service (Python)
cd services
python -m pytest
```

## Trabajar en el frontend con recarga en caliente

El override de desarrollo construye una etapa `dev` de la imagen que ejecuta el
servidor de desarrollo de Next en lugar del build de producción. Editar cualquier
archivo bajo `frontend/src/` se refleja en http://localhost:3000 sin reconstruir:

```bash
# Docker
docker compose -f compose.yml -f compose.dev.yml up -d frontend
# O Podman
podman compose -f compose.yml -f compose.dev.yml up -d frontend
```

Dos detalles del entorno que conviene conocer:

- En desarrollo dentro del contenedor se usa **webpack** (`next dev --webpack`), no
  Turbopack. WSL2 no propaga los eventos del sistema de archivos de Windows al
  contenedor, así que el servidor necesita sondear los cambios, y Turbopack
  ignora esa opción. Fuera del contenedor, `npm run dev` sí usa Turbopack, que es
  más rápido.
- El primer arranque tras `--build` tarda unos segundos en compilar. Los
  cambios posteriores se aplican en menos de un segundo.

## Flujo de desarrollo (Spec Driven Development)

1. **Especificación**: escribir el spec (SPEC-NNN) en `specs/`
2. **Revisión**: que otra persona revise el spec antes de código
3. **Código**: implementar según el spec, capas separadas
4. **Verificación**: pruebas pasan, comportamiento verificado
5. **Pull Request**: cambios a `develop`, review de código
6. **Merge a main**: cuando está listo para despliegue

## Estructura del monorepo

```
.
├── specs/                      # Documentación técnica (specs)
│   ├── fundacionales/          # Arquitectura y convenciones
│   │   └── SPEC-000-arquitectura-general.md
│   ├── features/               # Funcionalidades por implementar
│   ├── compartidos/            # Especificaciones transversales
│   ├── _plantilla.md           # Template para nuevos specs
│   └── REGISTRO.md             # Seguimiento de specs
│
├── backend/                    # Spring Boot (Java 25 LTS)
│   ├── src/
│   ├── pom.xml
│   └── .mvn/wrapper/           # Maven Wrapper
│
├── frontend/                   # Next.js (TypeScript/React)
│   ├── src/
│   │   ├── app/
│   │   └── components/
│   └── package.json
│
├── services/                   # Data Service (Python)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   └── processors/
│   └── requirements.txt
│
├── shared/                     # Código compartido
│   └── types/                  # Definiciones TypeScript (api.ts, models.ts, catalog.ts)
│
├── mobile/                     # React Native (Fase 2)
│   └── README.md               # Pendiente de desarrollo
│
├── .github/workflows/          # CI/CD (GitHub Actions)
│
├── compose.yml                 # Orquestación de contenedores (despliegue)
├── compose.dev.yml             # Overrides de desarrollo local
│
├── .env.example                # Plantilla de variables de entorno
├── .gitignore
└── README.md                   # Este archivo
```

## Convenciones

### Idioma
- **Código e identificadores**: inglés
- **Specs, commits, documentación**: español

### Ramas
- `main`: versión estable, lista para producción
- `develop`: rama de integración de features
- Feature branches: `feature/nombre-descriptivo`
- Bugfix branches: `fix/nombre-descriptivo`

### Commits
Usar Conventional Commits con alcance:

```
feat(backend): agrega autenticación por JWT
fix(frontend): corrige renderizado en móvil
docs(specs): añade SPEC-002 modelo de datos
test(backend): cubre casos extremos de validación
chore: actualiza dependencias
```

### Respuesta de API
Todos los endpoints devuelven un sobre unificado:

```json
{
  "ok": true,
  "message": "Operación exitosa",
  "data": { /* payload */ }
}
```

El código HTTP acompaña (200, 400, 404, 422, 500); nunca se devuelve 200 en error.

### Soft Delete
Las entidades nunca se borran físicamente. Usan:
```sql
deleted_at TIMESTAMP NULL
```

### Configuración
Cero credenciales en el código. Toda configuración por variables de entorno:
```
POSTGRES_DB=hesperides
POSTGRES_PASSWORD=cambiar_en_local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
SPRING_PROFILES_ACTIVE=dev
```

## Despliegue

### Desarrollo local
```bash
# Docker
docker compose -f compose.yml -f compose.dev.yml up -d
# O Podman
podman compose -f compose.yml -f compose.dev.yml up -d
```

### Validación en CI
Los tests se ejecutan automáticamente en GitHub Actions:
- `./mvnw test` en cada push a `develop` o PR a `main`
- `npm test` en frontend
- `python -m pytest` en services
- Infraestructura: `docker compose -f compose.yml -f compose.dev.yml config --quiet`,
  con variables ficticias para validar la configuración sin levantar servicios.

### Producción (AWS)
El despliegue a la nube está pendiente de licencias AWS. Cuando esté disponible:
- **Compute**: EC2 para backend
- **Data**: RDS PostgreSQL con la extensión PostGIS habilitada (el catastro usa columnas `GEOMETRY`)
- **Storage**: S3 para archivos y reportes
- **Monitoring**: CloudWatch

## Contribuir

1. Lee `SPEC-000` (arquitectura y convenciones)
2. Crea una rama desde `develop`
3. Implementa según el spec asignado
4. Corre los tests: `./mvnw test`, `npm test`, `pytest`
5. Haz commit con Conventional Commits en español
6. Abre PR a `develop`, pide revisión
7. Una vez aprobado, mezcla a `develop`
8. El merge a `main` lo hace el líder de versión

## Licencia

PUCP — Proyecto de Investigación (2026)
