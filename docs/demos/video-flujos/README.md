# Video de flujos

Video de unos 3 minutos para el cliente. Hespo, un retoño animado, recorre la web real de
Hesperides y explica Especies, Ejemplares e Incidencias.

- Diseño: [`docs/superpowers/specs/2026-11-04-video-flujos-design.md`](../../superpowers/specs/2026-11-04-video-flujos-design.md)
- Resultado: `out/hespo-flujos.mp4`

Es un proyecto autónomo: no toca el frontend, el backend ni el CI. El audio, las capturas y el MP4
se generan y no se suben a git.

## Requisitos

- Node.js 22 y Python 3.14.
- Docker, solo para regenerar las capturas.
- Google Chrome instalado, solo para regenerar las capturas.

```bash
npm install
python -m venv .venv
.venv/Scripts/python -m pip install -r scripts/requirements.txt
```

## Generar el video

Se hace en tres pasos. Cada uno solo hace falta si cambió lo que produce.

### 1. Voz

Lee `guion.json` y genera un MP3 por frase. Solo vuelve a pedir las frases que cambiaron.

```bash
.venv/Scripts/python scripts/generar_voz.py
```

Usa una voz de Microsoft Edge con una herramienta no oficial: necesita internet y envía el texto del
guion a sus servidores. Para publicar el video fuera del cliente, conviene regenerarlo con Azure
Speech, que ofrece la misma voz.

### 2. Capturas de la web real

Un script maneja la aplicación y guarda cada pantalla con la posición de sus elementos. Debe correr
contra una **base recién creada**, porque registra datos de ejemplo. Nunca contra una base real.

1. Crear un archivo de entorno desechable, por ejemplo `video.env`, con valores de prueba para
   `POSTGRES_PASSWORD`, `JWT_SECRET`, `SMTP_FROM`, `APP_PUBLIC_URL=http://localhost:3000` y
   `SPRING_PROFILES_ACTIVE=dev`.
2. Crear un archivo `video-nombres.yml` que cambie los nombres de los contenedores, para no chocar
   con los de desarrollo:

   ```yaml
   services:
     db:
       container_name: hespo-video-db
     backend:
       container_name: hespo-video-backend
   ```

3. Levantar la base y el backend desde la raíz del repositorio:

   ```bash
   docker compose -p hespo-video --env-file video.env \
     -f docker-compose.yml -f docker-compose.dev.yml -f video-nombres.yml \
     up -d --build db backend
   ```

4. Levantar el frontend desde `frontend/`:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 npm run dev
   ```

5. Capturar desde esta carpeta:

   ```bash
   npm run capturas
   ```

6. Al terminar, borrar la copia temporal. Elimina solo los volúmenes del proyecto `hespo-video`:

   ```bash
   docker compose -p hespo-video --env-file video.env \
     -f docker-compose.yml -f docker-compose.dev.yml -f video-nombres.yml \
     down --volumes
   ```

Las capturas usan las cuentas de demostración del perfil `dev`, que no son personas reales. Se ven
datos reales del catálogo, así que hay que revisar cada captura antes de compartir el video.

### 3. Render

```bash
npm run render
```

Para revisar mientras se trabaja:

```bash
npm run estudio                                  # vista previa navegable
npm run fotogramas -- --escena especies          # inicio, mitad y final de cada frase
npm run fotogramas -- --momentos e4:0.8,e6:0.2   # un instante exacto de una frase
```

## Video de planificación y reservas

Segundo video del proyecto: Hespo explica Frecuencias, Planificación y Reservas de jardines.

- Diseño: [`docs/superpowers/specs/2026-11-12-video-planificacion-design.md`](../../superpowers/specs/2026-11-12-video-planificacion-design.md)
- Resultado: `out/hespo-planificacion.mp4`

Comparte a Hespo, los subtítulos y los tiempos con el primer video; tiene su propio guion
(`guion-planificacion.json`), su audio (`public/voz/planificacion/`) y sus capturas
(`public/capturas/planificacion/`).

### 1. Voz

```bash
.venv/Scripts/python scripts/generar_voz.py --guion guion-planificacion.json --salida public/voz/planificacion
npm run duracion -- --guion guion-planificacion.json --voz public/voz/planificacion
```

La duración debe quedar entre 3:30 y 4:30.

### 2. Capturas, en dos sesiones

Las pantallas salen de dos ramas que todavía no están en `develop`, y sus migraciones chocan: cada
una corre en su propia sesión desechable.

| Sesión | Rama | Escenas |
|--------|------|---------|
| `a` | `feature/conjuntos-con-ejemplares` | Frecuencias y Planificación |
| `b` | `feature/spec-107-reservas-jardines` | Reservas |

```bash
bash scripts/sesion.sh arriba a                  # worktree, base, backend y frontend de la rama
npm run capturas:planificacion -- --sesion a     # arma los datos de ejemplo y captura
bash scripts/sesion.sh abajo a                   # borra el worktree y el proyecto hespo-video-a
```

Igual con `b`. La sesión `b` necesita correr de día en Lima (09:00 a 20:00), porque arma reservas
en curso y terminadas de hoy.

`sesion.sh` saca la rama en `.worktrees/video-<s>` y la levanta en el proyecto Docker
`hespo-video-<s>`, con la base en el puerto 55432. Si 3000, 8080 o 55432 están ocupados, se detiene:
nunca detiene ni reutiliza contenedores ajenos, y al bajar solo borra lo de su proyecto.
`public/capturas/planificacion/origen.json` guarda la rama y el commit de cada sesión.

Las organizaciones, los contactos y sus teléfonos son de demostración. Los jardines son los del
campus: hay que revisar cada captura antes de compartir el video.

### 3. Render

```bash
npm run render:planificacion
npm run fotogramas -- --video VideoPlanificacion --escena planificacion
```

## Cambiar algo

- **Una frase:** editar `guion.json` y repetir los pasos 1 y 3. Si la frase cambió y no se regeneró
  la voz, el render falla e indica cuál. Para corregir solo la pronunciación, usar `textoVoz`: el
  subtítulo sigue mostrando `texto`.
- **Dónde va Hespo:** en `guion.json`. `x` e `y` son píxeles de video: `y` es la altura de los pies y
  sin ella camina por el borde inferior. `luego` agrega movimientos dentro de la frase.
- **Una pantalla de la web:** repetir los pasos 2 y 3. Si un elemento se movió, ajustar `guion.json`
  con las posiciones de `public/capturas/medidas.json`.

## Comprobaciones

```bash
npm run prueba
npm run tipos
.venv/Scripts/python -m unittest scripts/test_generar_voz.py
```

## Licencias

Remotion es gratuito para personas y organizaciones sin fines de lucro. El equipo debe confirmar que
el proyecto entra en ese supuesto antes de distribuir el video.
