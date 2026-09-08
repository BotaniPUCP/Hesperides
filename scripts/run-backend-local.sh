#!/usr/bin/env bash
# Arranca el backend Spring Boot EN EL HOST con la configuración de desarrollo,
# sin reconstruir la imagen de Docker por cada cambio de código.
#
# - Carga el .env (gitignored). Antes de la primera vez:
#     cp .env.example .env
#     sed -i "s|JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48)|" .env
#   (un JWT_SECRET < 32 chars tira WeakKeyException al arrancar).
# - Sobrescribe DB_HOST=localhost: dentro de compose el host de la BD es el
#   alias de red `db`, que no existe fuera del contenedor.
# - Con spring-boot-devtools, al guardar un cambio Java el servidor se reinicia
#   solo (hot restart). La BD local espera en localhost:${POSTGRES_PORT}.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Falta $ENV_FILE. Copia la plantilla primero: cp .env.example .env" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# Fuera de Docker la BD corre en el host (compose expone ${POSTGRES_PORT}).
export DB_HOST="${DB_HOST_FOR_HOST_RUN:-localhost}"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"

exec "$ROOT/backend/mvnw" -f "$ROOT/backend/pom.xml" spring-boot:run