#!/usr/bin/env bash
# Recorre el flujo completo de SPEC-001 contra el backend levantado.
#
#   docker compose up -d
#   bash backend/probar-auth.sh
#
# No modifica nada del sistema salvo el last_login del administrador.

set -u

API="http://localhost:8080/api/v1"
EMAIL="admin@pucp.edu.pe"
PASSWORD="Hesperides2026"
COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

titulo() { printf '\n\033[1;36m%s\033[0m\n' "$1"; }
ok()     { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
fallo()  { printf '  \033[0;31m✗\033[0m %s\n' "$1"; }

# Comprueba que el codigo HTTP recibido es el esperado.
verificar() {
  local esperado="$1" real="$2" descripcion="$3"
  if [ "$real" = "$esperado" ]; then
    ok "$descripcion (HTTP $real)"
  else
    fallo "$descripcion — esperaba $esperado, recibio $real"
  fi
}

extraer() {
  # Extrae un campo de texto del JSON sin depender de jq.
  grep -oE "\"$2\":\"[^\"]*\"" <<<"$1" | head -1 | cut -d'"' -f4
}

titulo "1. Health check (ruta publica, sin token)"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$API/health")
verificar 200 "$CODIGO" "GET /health responde sin autenticacion"

titulo "2. Ruta protegida sin token"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$API/auth/me")
verificar 401 "$CODIGO" "GET /auth/me sin token queda bloqueado"

titulo "3. Login con credenciales incorrectas"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"clave-que-no-es\"}")
verificar 401 "$CODIGO" "Contrasena incorrecta rechazada"

titulo "4. Login con un correo que no existe"
RESPUESTA=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"nadie@pucp.edu.pe","password":"loquesea"}')
MENSAJE=$(extraer "$RESPUESTA" message)
if [ "$MENSAJE" = "Invalid credentials" ]; then
  ok "Mismo mensaje que una contrasena mala: no revela que correos existen"
else
  fallo "El mensaje delata informacion: $MENSAJE"
fi

titulo "5. Login web (el refresh token va en cookie, no en el cuerpo)"
RESPUESTA=$(curl -s -c "$COOKIES" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(extraer "$RESPUESTA" accessToken)

[ -n "$TOKEN" ] && ok "Login correcto, access token recibido" || fallo "No llego access token"
grep -q 'refresh_token' "$COOKIES" && ok "Cookie refresh_token presente" || fallo "Falta la cookie"
grep -qi 'HttpOnly\|#HttpOnly' "$COOKIES" && ok "La cookie es HttpOnly: JavaScript no puede leerla" \
  || fallo "La cookie no es HttpOnly"
grep -q 'refreshToken' <<<"$RESPUESTA" && fallo "El refresh token viaja en el cuerpo (no deberia en web)" \
  || ok "El cuerpo NO contiene refreshToken"
grep -qE 'passwordHash|\$2a\$' <<<"$RESPUESTA" && fallo "La respuesta expone el hash de la contrasena" \
  || ok "La respuesta no expone ningun hash"

titulo "6. Perfil del usuario autenticado"
RESPUESTA=$(curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN")
ROL=$(extraer "$RESPUESTA" code)
[ "$ROL" = "ADMIN" ] && ok "GET /auth/me devuelve el perfil con rol $ROL" || fallo "Rol inesperado: $ROL"

titulo "7. Token manipulado"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$API/auth/me" \
  -H "Authorization: Bearer ${TOKEN%????}XXXX")
verificar 401 "$CODIGO" "Un token con la firma alterada se rechaza"

titulo "8. Rotacion de refresh token (movil)"
RESPUESTA=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -H 'X-Client-Type: mobile' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
REFRESH=$(extraer "$RESPUESTA" refreshToken)
[ -n "$REFRESH" ] && ok "En movil el refresh token si viene en el cuerpo" || fallo "Falta refreshToken"

CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' -H 'X-Client-Type: mobile' \
  -d "{\"refreshToken\":\"$REFRESH\"}")
verificar 200 "$CODIGO" "Primer uso del refresh token: valido"

titulo "9. Reuso del mismo refresh token (deteccion de robo)"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/refresh" \
  -H 'Content-Type: application/json' -H 'X-Client-Type: mobile' \
  -d "{\"refreshToken\":\"$REFRESH\"}")
verificar 401 "$CODIGO" "Segundo uso rechazado: la cadena se revoca entera"

titulo "10. Bloqueo por fuerza bruta (5 intentos + 1)"
VICTIMA="fuerzabruta-$RANDOM@pucp.edu.pe"
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$VICTIMA\",\"password\":\"mala\"}"
done
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$VICTIMA\",\"password\":\"mala\"}")
verificar 429 "$CODIGO" "El sexto intento responde 429, no otro 401"

printf '\n\033[1;36mFin. Todo lo marcado con ✓ funciona como especifica SPEC-001.\033[0m\n\n'
