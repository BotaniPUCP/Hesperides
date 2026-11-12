#!/usr/bin/env bash
# Levanta o baja una sesión desechable de captura para el video de planificación.
#   bash scripts/sesion.sh arriba a|b
#   bash scripts/sesion.sh abajo a|b
# a = feature/conjuntos-con-ejemplares (Frecuencias y Planificación)
# b = feature/spec-107-reservas-jardines (Reservas)
# Cada sesión vive en su worktree (.worktrees/video-<s>) y su proyecto Docker (hespo-video-<s>).
# Nunca detiene, reutiliza ni borra contenedores o volúmenes de otros proyectos.
set -euo pipefail

accion="${1:-}"
s="${2:-}"
case "$s" in
  a) rama="feature/conjuntos-con-ejemplares" ;;
  b) rama="feature/spec-107-reservas-jardines" ;;
  *) echo "Uso: bash scripts/sesion.sh arriba|abajo a|b" >&2; exit 2 ;;
esac

raiz="$(git rev-parse --show-toplevel)"
dir="$raiz/.worktrees"
wt="$dir/video-$s"
entorno="$dir/video-$s.env"
nombres="$dir/video-$s-nombres.yml"
log="$dir/video-$s-frontend.log"
pid="$dir/video-$s-frontend.pid"
proyecto="hespo-video-$s"
# La base no se publica en 5432: así no compite con una base local.
puerto_db=55432
puertos=(3000 8080 "$puerto_db")

ruta_windows() { if command -v cygpath > /dev/null; then cygpath -w "$1"; else echo "$1"; fi; }

compose() {
  (cd "$wt" && docker compose -p "$proyecto" --env-file "$(ruta_windows "$entorno")" \
    -f docker-compose.yml -f docker-compose.dev.yml -f "$(ruta_windows "$nombres")" "$@")
}

puerto_ocupado() {
  if netstat -ano > /dev/null 2>&1; then
    netstat -ano | grep -i "LISTEN" | grep -qE "[:.]$1[[:space:]]"
  else
    (echo > "/dev/tcp/127.0.0.1/$1") > /dev/null 2>&1
  fi
}

esperar() { # url, segundos, qué es
  local hasta=$((SECONDS + $2)) codigo
  until codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1")" && [ "$codigo" != "000" ]; do
    [ "$SECONDS" -ge "$hasta" ] && { echo "$3 no respondió en $2 s ($1)" >&2; return 1; }
    sleep 5
  done
  echo "$3 responde ($codigo)"
}

arriba() {
  for p in "${puertos[@]}"; do
    if puerto_ocupado "$p"; then
      echo "El puerto $p está ocupado; la sesión no detiene contenedores ajenos." >&2
      exit 1
    fi
  done
  [ -e "$wt" ] && { echo "Ya existe $wt: baja la sesión antes ($0 abajo $s)." >&2; exit 1; }

  mkdir -p "$dir"
  git -C "$raiz" fetch -q origin "$rama"
  git -C "$raiz" worktree add -q --detach "$wt" "origin/$rama"
  commit="$(git -C "$wt" rev-parse HEAD)"

  cat > "$entorno" <<EOF
POSTGRES_PASSWORD=video-prueba
POSTGRES_PORT=$puerto_db
JWT_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n=+/')
SMTP_FROM=video@demo.invalid
APP_PUBLIC_URL=http://localhost:3000
SPRING_PROFILES_ACTIVE=dev
EOF
  cat > "$nombres" <<EOF
services:
  db:
    container_name: $proyecto-db
  backend:
    container_name: $proyecto-backend
EOF

  compose up -d --build db backend
  esperar "http://localhost:8080/api/v1/auth/login" 300 "El backend"

  (cd "$wt/frontend" && npm ci --no-audit --no-fund > "$log" 2>&1)
  (cd "$wt/frontend" && NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 nohup npm run dev >> "$log" 2>&1 &
    echo $! > "$pid.msys"
    if [ -r "/proc/$!/winpid" ]; then cat "/proc/$!/winpid" > "$pid"; else echo $! > "$pid"; fi)
  esperar "http://localhost:3000/login" 300 "El frontend"

  echo "Sesión $s arriba: $rama @ $commit"
}

detener_frontend() {
  if [ -f "$pid" ]; then
    if command -v taskkill > /dev/null; then taskkill //PID "$(cat "$pid")" //T //F > /dev/null 2>&1 || true
    else kill "$(cat "$pid")" 2> /dev/null || true; fi
    rm -f "$pid" "$pid.msys"
  fi
  # En Windows, el servidor de Next sobrevive al árbol de npm: se detiene todo lo que corre
  # desde este worktree, y nada más.
  if command -v powershell.exe > /dev/null; then
    powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*\\.worktrees\\video-$s\\*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" || true
  fi
}

abajo() {
  detener_frontend
  if [ -e "$wt" ]; then
    compose down --volumes --rmi local || true
    git -C "$raiz" worktree remove --force "$wt" || { rm -rf "$wt" && git -C "$raiz" worktree prune; }
  fi
  rm -f "$entorno" "$nombres" "$log"
  echo "Sesión $s abajo"
}

case "$accion" in
  arriba) arriba ;;
  abajo) abajo ;;
  *) echo "Uso: bash scripts/sesion.sh arriba|abajo a|b" >&2; exit 2 ;;
esac
