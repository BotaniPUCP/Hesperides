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
