# Hesperides

Plataforma integral de gestión de biodiversidad y conservación de flora. Sistema modular en monorepo desarrollado bajo especificación (Spec Driven Development) por un equipo de 10 desarrolladores de la PUCP.

## Descripción

**Hesperides** es una aplicación web, móvil y API backend que permite a botánicos, conservacionistas y equipos de investigación:

- Catalogar y monitorear especies de flora
- Registrar observaciones de campo con geolocalización
- Gestionar proyectos de investigación colaborativa
- Generar reportes de biodiversidad
- Configurar catálogos de tipos, estados y categorías sin recompilación

La arquitectura sigue principios SOLID, separación de capas limpia, y garantiza trazabilidad, escalabilidad y mantenibilidad.

## Requisitos previos

- **Docker** 24+ (compose incluido)
- **JDK 17+** (se compila a Java 17; el entorno local tiene JDK 21)
- **Node.js** 20+
- **Python** 3.11+
- **Git**

## Configuración inicial

```bash
# Clonar el repositorio
git clone https://github.com/BotaniPUCP/Hesperides.git
cd Hesperides

# Copiar configuración de ejemplo
cp .env.example .env

# Levantar todos los servicios (base de datos, backend, frontend, data service)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Verificar que está listo
docker compose logs -f
```

Acceso local:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080/api/v1 (requiere autenticación)
- **Data Service**: http://localhost:5001
- **PostgreSQL**: localhost:5432

## Servicios y puertos

| Servicio        | Puerto | Contenedor          | Descripción                          |
|-----------------|--------|---------------------|--------------------------------------|
| PostgreSQL      | 5432   | hesperides-db       | Base de datos relacional             |
| Backend (API)   | 8080   | hesperides-backend  | Spring Boot, endpoints REST          |
| Frontend (Web)  | 3000   | hesperides-frontend | Next.js, UI para navegador           |
| Data Service    | 5001   | hesperides-data-service | Python Flask, procesamiento de datos |

## Ejecución de tests

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

_Nota: Las carpetas `backend/`, `frontend/` y `services/` se crean en tareas posteriores._

## Flujo de desarrollo (Spec Driven Development)

1. **Especificación**: escribir el spec (SPEC-NNN) en `specs/`
2. **Revisión**: que los arcos revisen el spec antes de código
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
├── backend/                    # Spring Boot (Java 17)
│   ├── src/
│   ├── pom.xml
│   └── .mvn/wrapper/           # Maven Wrapper
│
├── frontend/                   # Next.js (TypeScript/React)
│   ├── app/
│   ├── components/
│   └── package.json
│
├── services/                   # Data Service (Python)
│   ├── app.py
│   └── requirements.txt
│
├── shared/                     # Código compartido
│   └── types/                  # Definiciones TypeScript/OpenAPI
│
├── mobile/                     # React Native (Fase 2)
│   └── README.md               # Pendiente de desarrollo
│
├── .github/workflows/          # CI/CD (GitHub Actions)
│
├── docker-compose.yml          # Orquestación de contenedores (despliegue)
├── docker-compose.dev.yml      # Overrides de desarrollo local
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
DATABASE_URL=postgres://...
API_KEY=${API_KEY}
DEBUG=${DEBUG:false}
```

## Despliegue

### Desarrollo local
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Validación en CI
Los tests se ejecutan automáticamente en GitHub Actions:
- `./mvnw test` en cada push a `develop` o PR a `main`
- `npm test` en frontend
- `python -m pytest` en services

### Producción (AWS)
El despliegue a la nube está pendiente de licencias AWS. Cuando esté disponible:
- **Compute**: EC2 para backend
- **Data**: RDS PostgreSQL
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

## Contacto

- Equipo: Desarrollo PUCP
- Email: p.david@pucp.edu.pe
