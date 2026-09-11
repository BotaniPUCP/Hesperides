# SPEC-C01 — Componentes UI compartidos

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec transversal, no deriva de una HU) |
| Plataforma | Ambas (Web y Móvil) |
| Sprint | S0 (fundacional) |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-002 (modelo de datos), SPEC-003 (catálogos configurables), SPEC-C02 (manejo de errores), SPEC-C03 (patrones de API) |

---

## 1. Objetivo

Definir el catálogo único de componentes de interfaz —tokens de diseño, props, variantes y estados— que web y móvil deben reutilizar, para que diez desarrolladores generando UI con IA en paralelo produzcan pantallas visualmente consistentes en vez de que cada uno invente su propio botón.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** SPEC-003 §6.1 (`useCatalog`, del que dependen `Select`,
> `StatusBadge` y `UrgencyBadge`) y SPEC-C02 §6 (estados de error que renderizan estos componentes).

**Este spec no define ninguna pantalla ni flujo de negocio.** Es una biblioteca. Cada SPEC-1XX en adelante referencia estos componentes por nombre e indica cuáles reutiliza; no vuelve a definir sus props.

### 2.1 Módulo backend

No aplica. Este spec es puramente de presentación.

### 2.2 Módulo frontend (web)

- Ubicación: `frontend/src/components/ui/` para componentes base; `frontend/src/components/forms/` para compuestos de formulario (`PhotoUpload`, `LocationPicker`, `DateRangePicker`); `frontend/src/components/map/` para el mapa y sus controles; `frontend/src/components/layouts/` para armazones de página.
- Cada componente vive en su propio archivo `PascalCase.tsx`, con su interfaz de props exportada desde el mismo archivo (`export interface [Componente]Props`).
- Tokens de diseño (colores, espaciado, tipografía): `frontend/tailwind.config.ts` (extensión de tema) y `frontend/src/styles/globals.css` (variables CSS que Tailwind referencia, para que estén disponibles también fuera de clases utilitarias, p. ej. en el mapa).
- Tipos de catálogo que consumen `Select`, `Badge`, `StatusBadge`, `UrgencyBadge`: `shared/types/catalog.ts` (ya definido por SPEC-003), nunca redeclarados localmente.
- Hook(s) necesario(s): `useToast` (dispara `Toast` desde cualquier componente), `useCatalog` (carga `catalog_items` para `Select`), ambos en `frontend/src/hooks/`.

### 2.3 Módulo móvil

- Ubicación: `mobile/src/components/ui/` (espejo 1:1 de nombres con web) y `mobile/src/components/forms/`.
- Mismos nombres de componente y misma forma de props que en web cuando la prop es de datos (`value`, `onChange`, `options`, `error`); las props de solo-presentación (`className`) no existen en RN y se sustituyen por `style` tipado con `StyleSheet`.
- Paleta de colores compartida: `mobile/src/theme/colors.ts`, valores idénticos (mismos hex) a los tokens Tailwind de la sección 3.1. No se referencia Tailwind desde RN.
- El mapa en móvil no es el mismo componente que en web (ver sección 6): usa `react-native-maps`, pero expone la misma interfaz de props de alto nivel (`layers`, `markers`, `onMarkerPress`, `filters`) para que un desarrollador que conoce el `MapView` web entienda el de RN sin releer todo.

### 2.4 Restricciones técnicas

**Librerías que DEBE usar (web):**
- React 19 + Next.js 16 (App Router), TypeScript estricto.
- Tailwind CSS (utility-first) para todo estilo de layout y superficie.
- `Leaflet` + `react-leaflet` para el mapa interactivo (justificación en sección 6).
- `date-fns` para formateo y cálculo de fechas (ya ligero, sin dependencias de red).

**Librerías que DEBE usar (móvil):**
- React Native + TypeScript estricto.
- `react-native-maps` para el mapa (proveedor de tiles OpenStreetMap, ver sección 6).
- `Pressable` para todo elemento táctil. **Nunca `TouchableOpacity`** (REGLAS.md §5.3).
- `StyleSheet.create` para estilos; nunca estilos inline en objetos literales recreados en cada render.

**Librerías que NO debe usar:**
- Ninguna librería de componentes UI preconstruida (Material UI, Ant Design, Chakra, NativeBase, React Native Paper, shadcn/ui como dependencia instalada, etc.). El catálogo de este spec **es** el design system del proyecto.
- Ningún proveedor de mapas de pago o que requiera API key facturable (Google Maps, Mapbox con plan pago, HERE). Ver justificación en sección 6.
- Ninguna librería de gráficos pesada para el Dashboard más allá de una sola elegida en el spec de esa feature; este spec no la fija porque no define esa pantalla.
- CSS-in-JS (`styled-components`, `emotion`) en web: Tailwind ya cubre el caso de uso y añadir un segundo sistema de estilos rompe la consistencia que este spec busca garantizar.

**Patrón de catálogos aplicable:** `Select`, `Badge`, `StatusBadge` y `UrgencyBadge` consumen exclusivamente objetos `{ id, code, label }` provenientes de `catalog_items` (SPEC-003) o del invariante INV-04 de SPEC-002. Ningún componente de este catálogo acepta un enum hardcodeado como fuente de opciones.

## 3. Tokens de diseño

### 3.1 Paleta de colores

Paleta construida sobre la escala de Tailwind, con un tono verde como color de marca (coherente con "áreas verdes") y colores semánticos de estado que son **fijos e idénticos en todo el sistema**: ningún componente ni feature puede redefinir qué color representa "crítico" o "resuelta".

#### Color de marca

| Token | Escala Tailwind | Hex | Uso |
|---|---|---|---|
| `brand-50` … `brand-900` | `green` | `#f0fdf4` … `#14532d` | Superficies de marca, estados activos de navegación |
| `brand-600` | `green-600` | `#16a34a` | Color primario de acción (`Button` variante `primary`) |
| `brand-700` | `green-700` | `#15803d` | Hover de acción primaria |

#### Neutros

| Token | Escala Tailwind | Hex | Uso |
|---|---|---|---|
| `neutral-0` | `white` | `#ffffff` | Fondo de superficie (`Card`, `Modal`) |
| `neutral-50` | `slate-50` | `#f8fafc` | Fondo de página |
| `neutral-200` | `slate-200` | `#e2e8f0` | Bordes, divisores |
| `neutral-500` | `slate-500` | `#64748b` | Texto secundario |
| `neutral-700` | `slate-700` | `#334155` | Texto principal |
| `neutral-900` | `slate-900` | `#0f172a` | Texto de alto énfasis, títulos |

#### Colores semánticos de acción (no de estado de dominio)

| Token | Escala Tailwind | Hex | Uso |
|---|---|---|---|
| `action-danger` | `red-600` | `#dc2626` | `Button` variante `danger`, validaciones de error |
| `action-danger-hover` | `red-700` | `#b91c1c` | Hover de `danger` |
| `info-600` | `sky-600` | `#0284c7` | `Toast` variante `info`, enlaces informativos |
| `warning-600` | `amber-500` | `#f59e0b` | `Toast` variante `warning` |
| `success-600` | `green-600` | `#16a34a` | `Toast` variante `success` (mismo verde de marca: éxito y acción primaria comparten semántica positiva) |

#### Estados de incidencia — flujo `Reportada → En evaluación → En atención → Resuelta`

Este mapeo es **obligatorio y único** en todo el sistema (web, móvil, `StatusBadge`, líneas de tiempo, mapa, dashboard, reportes). El `code` es el mismo que en `catalog_items` de `INCIDENT_STATUS` (SPEC-002 §4.9).

| `code` (catálogo) | Label | Token de color | Hex fondo | Hex texto | Significado visual |
|---|---|---|---|---|---|
| `REPORTED` | Reportada | `status-reported` | `slate-100` `#f1f5f9` | `slate-700` `#334155` | Neutro: acaba de entrar, sin acción tomada |
| `IN_REVIEW` | En evaluación | `status-in-review` | `amber-100` `#fef3c7` | `amber-800` `#92400e` | Atención pendiente, en diagnóstico |
| `IN_PROGRESS` | En atención | `status-in-progress` | `sky-100` `#e0f2fe` | `sky-800` `#075985` | En curso, alguien ya está trabajando en ello |
| `RESOLVED` | Resuelta | `status-resolved` | `green-100` `#dcfce7` | `green-800` `#166534` | Cerrado, sin acción pendiente |

Mismo criterio aplica a `INTERVENTION_STATUS` y `CONTRACT_STATUS` reutilizando la misma escala (neutro → ámbar → celeste → verde) más un rojo para estados terminales negativos:

| `code` | Label | Token de color | Hex fondo | Hex texto |
|---|---|---|---|---|
| `ASSIGNED` | Asignada | `status-reported` | `slate-100` `#f1f5f9` | `slate-700` `#334155` |
| `IN_PROGRESS` | En ejecución | `status-in-progress` | `sky-100` `#e0f2fe` | `sky-800` `#075985` |
| `COMPLETED` | Ejecutada | `status-in-review` | `amber-100` `#fef3c7` | `amber-800` `#92400e` |
| `VALIDATED` | Validada | `status-resolved` | `green-100` `#dcfce7` | `green-800` `#166534` |
| `REJECTED` | Observada | `status-danger` | `red-100` `#fee2e2` | `red-800` `#991b1b` |
| `CANCELLED` | Cancelada | `status-neutral-muted` | `slate-100` `#f1f5f9` | `slate-500` `#64748b` |

> Regla: `StatusBadge` no decide el color por texto del label (evita que "Resuelta" en un idioma distinto rompa el mapeo). Decide por `code` del catálogo. Un `code` sin entrada en el mapeo cae en `status-neutral-muted` con un aviso en consola en desarrollo (`console.warn`, nunca en producción), nunca en un color aleatorio.

#### Niveles de urgencia de incidencia

El `code` es el de `catalog_items` de `URGENCY_LEVEL` (SPEC-002 §4.9). Esta escala es intencionalmente distinta a la de estado (usa rojo progresivo, no el ciclo neutro→verde) porque urgencia y estado son dos ejes independientes: una incidencia `CRITICAL` puede estar `RESOLVED`.

| `code` | Label | Token de color | Hex fondo | Hex texto | Hex borde/acento |
|---|---|---|---|---|---|
| `LOW` | Baja | `urgency-low` | `slate-100` `#f1f5f9` | `slate-600` `#475569` | `slate-300` `#cbd5e1` |
| `MEDIUM` | Media | `urgency-medium` | `amber-100` `#fef3c7` | `amber-800` `#92400e` | `amber-400` `#fbbf24` |
| `HIGH` | Alta | `urgency-high` | `orange-100` `#ffedd5` | `orange-800` `#9a3412` | `orange-500` `#f97316` |
| `CRITICAL` | Crítica | `urgency-critical` | `red-100` `#fee2e2` | `red-800` `#991b1b` | `red-600` `#dc2626` |

`UrgencyBadge` en nivel `CRITICAL` es el único caso del sistema que además añade un ícono de alerta junto al texto: la urgencia crítica no puede depender solo del color (ver sección 4, accesibilidad — no depender del color únicamente).

### 3.2 Tipografía

| Token | Valor | Uso |
|---|---|---|
| Familia | `Inter`, con fallback `system-ui, -apple-system, sans-serif` | Toda la interfaz, web y móvil |
| `text-xs` | 12px / line-height 16px | Metadatos, timestamps, texto auxiliar |
| `text-sm` | 14px / line-height 20px | Texto de cuerpo en tablas, helper text, labels |
| `text-base` | 16px / line-height 24px | Texto de cuerpo por defecto, inputs |
| `text-lg` | 18px / line-height 28px | Subtítulos de sección |
| `text-xl` | 20px / line-height 28px | Títulos de `Card` y `Modal` |
| `text-2xl` | 24px / line-height 32px | Títulos de página (`<h1>` de cada pantalla) |
| Peso regular | 400 | Texto de cuerpo |
| Peso medio | 500 | Labels, botones |
| Peso semibold | 600 | Títulos, cifras del dashboard |

En móvil, `Inter` se embebe como fuente del proyecto (no depende de que el dispositivo la tenga instalada); no se usa `Google Fonts` en runtime en RN.

### 3.3 Escala de espaciado

Se usa la escala nativa de Tailwind (múltiplos de 4px) sin extensión: `space-1` (4px) hasta `space-16` (64px). Reglas de uso:

| Contexto | Espaciado |
|---|---|
| Padding interno de `Button` (`md`) | `space-2` vertical (8px), `space-4` horizontal (16px) |
| Padding interno de `Card` | `space-4` (16px) en móvil, `space-6` (24px) en desktop |
| Espacio entre campos de un formulario | `space-4` (16px) |
| Espacio entre secciones de página | `space-8` (32px) |
| Objetivo táctil mínimo (ver sección 7) | `space-11` (44px) de alto mínimo |

### 3.4 Radios y sombras

| Token | Valor | Uso |
|---|---|---|
| `rounded-md` | 6px | `Input`, `Select`, `Button` |
| `rounded-lg` | 8px | `Card`, `Modal` |
| `rounded-full` | 9999px | `Badge`, `StatusBadge`, `UrgencyBadge`, avatares |
| `shadow-sm` | sombra sutil | `Card` en reposo |
| `shadow-lg` | sombra pronunciada | `Modal`, `Toast` (para separarse del fondo) |

## 4. Catálogo de componentes web

**Las props exactas de cada componente están en su archivo**, `frontend/src/components/ui/` y
`components/map/`, exportadas desde `index.ts`. Una copia aquí solo puede desincronizarse: el
`.tsx` lo verifica el compilador y este documento no.

| Componente | Para qué existe | Lo que no se ve en las props |
|---|---|---|
| `Button` | Acción primaria, secundaria, destructiva o discreta | `loading` bloquea el doble click y marca `aria-busy`. `aria-label` es **obligatorio** si el contenido es solo un icono |
| `Input` | Campo de texto con etiqueta | `errorMessage` presente ⇒ estado error y `aria-invalid`. El `hover` solo aplica en dispositivos con puntero |
| `Select` | Elección de una opción | El que carga catálogos consume `useCatalog` (SPEC-003 §6.1); no hace fetch propio |
| `Modal` | Diálogo y confirmación destructiva | Atrapa el foco y cierra con `Esc`. El texto nombra a la entidad afectada, no dice "¿Está seguro?" |
| `Toast` | Feedback de resultado | Verde éxito, ámbar advertencia (p. ej. correo no entregado), rojo error |
| `DataTable` | Listados paginados | Bajo 640px **no** hace scroll horizontal: colapsa a tarjetas (§9.1, `DataTableCards`) |
| `Card` | Agrupación de contenido | — |
| `LoadingSkeleton` | Carga inicial | Con la forma del contenido que viene, no un spinner: evita el salto de layout |
| `Badge`, `StatusBadge`, `UrgencyBadge` | Estado y urgencia | Resuelven color por **`code` de catálogo**, nunca por el texto del `label` |
| `EmptyState` | Sin resultados | "No hay nada todavía" y "tu filtro no encontró nada" son estados distintos, con acciones distintas |
| `MapView` | Mapa base | URL de tiles por configuración, no literal (§6) |
| `LocationPicker` | Elegir un punto | Pide el permiso de geolocalización con interacción explícita, nunca al montar |
| `PhotoUpload` | Evidencia fotográfica | Recibe callbacks; no llama a la API por su cuenta |
| `BeforeAfterViewer` | Comparar antes/después | Consume URLs prefirmadas de vida corta; no las cachea |
| `DateRangePicker` | Rango de fechas | — |

### 4.1 Reglas que gobiernan el catálogo

**Ningún componente de aquí hace llamadas HTTP.** Reciben datos o callbacks del contenedor, que
usa `lib/api.ts`. Así la autenticación y el manejo de errores quedan en un solo sitio.

**Los colores salen de los tokens de §3**, nunca como hex sueltos dentro de un componente:
cambiar de marca debe ser tocar `tailwind.config.ts` y `theme/colors.ts`, no buscar hex por todo
el código.

**Antes de crear un componente nuevo, §10.2 decide** si es transversal (va aquí) o propio de una
feature (va en su carpeta). Un componente duplicado en dos features es el fallo que este catálogo
existe para evitar.

## 5. Catálogo de componentes móvil (React Native)

Mismos nombres, mismas props de datos que su contraparte web (secciones 4.1–4.10; `MapView`, `LocationPicker`, `PhotoUpload`, `BeforeAfterViewer` y `DateRangePicker` se detallan aparte por sus diferencias de plataforma). Toda prop de presentación web (`className`) se sustituye por `style?: StyleProp<ViewStyle>`.

| Componente web | Archivo móvil | Diferencia relevante |
|---|---|---|
| `Button` | `mobile/src/components/ui/Button.tsx` | Usa `Pressable`; el estado `active` es el `pressed` de `Pressable`, no `:active` CSS |
| `Input` | `mobile/src/components/ui/Input.tsx` | Envuelve `TextInput`; `type` se traduce a `keyboardType` (`number` → `numeric`, `email` → `email-address`, `tel` → `phone-pad`) |
| `Select` | `mobile/src/components/ui/Select.tsx` | Abre un `Modal` de pantalla completa con lista buscable en vez de un `<select>` nativo — el táctil de un dropdown nativo pequeño falla el objetivo de 44px en campo |
| `Modal` | `mobile/src/components/ui/Modal.tsx` | Usa el componente `Modal` de RN; `size="fullscreen"` es el default en pantallas <640px lógicos |
| `Toast` | `mobile/src/components/ui/Toast.tsx` | Se posiciona respetando `SafeAreaView`; mismo `useToast` expuesto desde `mobile/src/hooks/useToast.ts` |
| `DataTable` | No se replica 1:1 — ver sección 6 | En móvil una lista de `DataTable` se muestra como lista de `Card` (ver sección 6.2), no como tabla |
| `Card` | `mobile/src/components/ui/Card.tsx` | `onClick` se llama `onPress`, usa `Pressable` |
| `LoadingSkeleton` | `mobile/src/components/ui/LoadingSkeleton.tsx` | Animación con `Animated.Value`, mismos `variant` |
| `Badge` / `StatusBadge` / `UrgencyBadge` | `mobile/src/components/ui/*Badge.tsx` | Misma tabla de color de la sección 3.1, vía `mobile/src/theme/colors.ts` |
| `EmptyState` | `mobile/src/components/ui/EmptyState.tsx` | Igual, `action.onClick` se llama `action.onPress` |

### 5.1 `MapView` (móvil)

**Archivo:** `mobile/src/components/map/MapView.tsx`. Usa `react-native-maps` con `provider={PROVIDER_DEFAULT}` (no `PROVIDER_GOOGLE`, ver sección 6) y tiles OpenStreetMap. Expone la misma forma de `MapViewProps` de la sección 4.11 salvo `height`, que en RN es un `style` de dimensión explícita (RN no resuelve `'100%'` igual que web en todos los contenedores).

### 5.2 `LocationPicker`, `PhotoUpload`, `BeforeAfterViewer`, `DateRangePicker` (móvil)

Mismas props que sus contrapartes web (secciones 4.12–4.15). Diferencias de implementación, no de contrato:

- `PhotoUpload` en móvil usa `expo-image-picker` (o `react-native-image-picker`, a decidir en el spec de la feature que primero lo necesite) para tomar la foto con la cámara del dispositivo, no un `<input type="file">`.
- `LocationPicker` en móvil usa `expo-location` para `allowCurrentLocation`, con el mismo estado `locating`.
- `DateRangePicker` en móvil abre un `Modal` `fullscreen` con dos calendarios apilados en vez de un popover, porque un popover angosto no es táctilmente usable en campo.

## 6. Decisión: librería de mapas

**Elegida: Leaflet (`leaflet` + `react-leaflet`) en web, `react-native-maps` con proveedor por defecto (tiles OpenStreetMap) en móvil.**

Justificación:

1. **SPEC-000 §1 prohíbe dependencia de servicios externos en esta versión.** Mapbox exige una cuenta y un token asociado a un plan (tiene una capa gratuita, pero es un servicio de terceros con límites de uso y facturación potencial fuera del control del proyecto); Google Maps exige API key facturable por uso desde el primer despliegue productivo. Leaflet no depende de ningún proveedor: es una librería de renderizado de mapa que consume **tiles** de la fuente que se le indique, y OpenStreetMap ofrece tiles sin necesidad de cuenta ni token para volúmenes de este proyecto (un campus, no tráfico masivo público).
2. **Despliegue en AWS sin licencias aún resueltas (SPEC-000 §3).** Mapbox y Google Maps requieren decidir facturación antes de poder mostrar un mapa en producción; Leaflet + OpenStreetMap no bloquea el desarrollo ni el despliegue con una decisión de licenciamiento pendiente. Si más adelante el cliente exige imágenes satelitales de mayor resolución o un SLA de tiles, se sustituye únicamente la URL del proveedor de tiles (configuración, no código) sin tocar `MapView` ni ningún componente que lo consuma.
3. **Encaja con PostGIS/GeoJSON (SPEC-002).** Leaflet consume GeoJSON de forma nativa (`L.geoJSON()`), que es exactamente el formato que INV-03 exige en el contrato de API. No hace falta una capa de traducción adicional para pintar polígonos de zonas o de elementos de superficie.
4. **Peso y control.** Leaflet es una librería ligera sin SDK propietario; el equipo controla el bundle y no depende de cambios de términos de servicio de un proveedor comercial de mapas a mitad de proyecto de 8 semanas.
5. **Móvil coherente con la misma decisión.** `react-native-maps` con proveedor por defecto usa Apple Maps en iOS y (según configuración) tiles OSM en Android, evitando también ahí una dependencia de Google Maps con key facturable. Mantiene la misma fuente de datos (GeoJSON vía la API propia) y el mismo contrato de props de alto nivel que la versión web.

**Consecuencia para la IA:** ningún componente ni feature debe importar `mapbox-gl`, `@react-google-maps/api`, `google.maps.*` ni solicitar una API key de mapas. Toda necesidad de mapa pasa por `MapView` de este catálogo.

## 7. Consideraciones de campo

Estas reglas aplican a **todo** componente usado en las pantallas de trabajo en campo (formulario de intervención, formulario de incidencia, `PhotoUpload`, `LocationPicker`) y son más estrictas que el resto de la interfaz:

1. **Objetivos táctiles grandes.** Todo elemento interactivo en pantallas de campo (botones, checkboxes, ítems de lista tocables, controles del mapa) mide **mínimo 44×44px** de área táctil, aunque su contenido visual sea menor (el padding compensa). Esto vale para usar el sistema con guantes de trabajo o dedos húmedos. `Button` `size="md"` y `size="lg"` ya cumplen; `size="sm"` está prohibido en pantallas de formulario de campo, solo se permite en tablas/paneles de escritorio.
2. **Contraste alto para exterior.** En pantallas de campo, el contraste texto/fondo mínimo sube de 4.5:1 (ver sección 8) a **7:1** para texto de cuerpo, porque se usa bajo luz solar directa. Esto excluye combinaciones de gris claro sobre blanco en esas pantallas específicas: se usa `neutral-900` sobre `neutral-0`, no `neutral-500` sobre `neutral-50`.
3. **Feedback de subida con mala conexión.** `PhotoUpload` es el componente crítico:
   - Al agregar una foto, esta entra en estado `idle` inmediatamente y su miniatura (desde el archivo local, `previewUrl`) se muestra sin esperar red — el operario ve confirmación visual instantánea de que la foto quedó en cola, independientemente de la conexión.
   - Al iniciar la subida pasa a `uploading` con `progress` visible; si la conexión es lenta, la barra avanza lento pero **nunca desaparece ni bloquea el formulario**: el operario puede seguir llenando el resto del formulario y navegar a otro campo mientras la foto sube en segundo plano.
   - Si la subida falla (timeout, sin conexión), el ítem pasa a `error` con el mensaje "No se pudo subir. Se reintentará automáticamente" y un botón manual "Reintentar" (`onRetry`); el formulario permite guardar el registro igual, dejando la evidencia marcada como pendiente de sincronizar — nunca se pierde el registro de campo por una foto que no subió.
   - El envío del formulario que contiene un `PhotoUpload` con ítems en `uploading` o `error` no se bloquea silenciosamente: `Toast` `variant="warning"` informa "Algunas fotos aún se están subiendo" al intentar guardar, pero permite continuar si el usuario insiste (ver flujo alternativo en la sección 5.2 de la plantilla de cada feature que use este componente).
4. **Orientación y una sola mano.** Los formularios de campo mantienen controles primarios (guardar, agregar foto) alcanzables en el tercio inferior de la pantalla en móvil, no solo arriba, porque se opera muchas veces con el dispositivo sostenido con una mano.

## 8. Accesibilidad

No es una frase genérica: son reglas verificables por componente.

1. **Contraste mínimo.** Todo texto de cuerpo sobre su fondo cumple **WCAG AA (4.5:1)** como mínimo en toda la interfaz; en pantallas de campo, **7:1** (sección 7.2). Todas las combinaciones fondo/texto definidas en la sección 3.1 (estados y urgencia) fueron elegidas para cumplir 4.5:1 como mínimo — no se permite bajar la opacidad de esos pares para "suavizar" el diseño.
2. **Nunca depender solo del color.** `StatusBadge` y `UrgencyBadge` siempre muestran el `label` en texto, nunca solo un punto o barra de color. `UrgencyBadge` en `CRITICAL` añade además un ícono. Un `MapMarkerData` coloreado por `urgencyCode` también expone la urgencia en el `popupContent` como texto.
3. **Navegación por teclado (web).** Todo componente interactivo (`Button`, `Input`, `Select`, ítems de `DataTable` con `onRowClick`, `Card` con `onClick`, controles de `Modal`) es alcanzable con `Tab`/`Shift+Tab` y activable con `Enter`/`Space`. `Modal` atrapa el foco mientras está abierto (`Tab` no sale del modal) y `Esc` lo cierra si `closeOnEsc` es `true`. Al cerrar, el foco regresa al elemento que abrió el modal.
4. **Foco visible.** Todo elemento enfocable muestra un anillo de foco visible (`outline` o `box-shadow` con `brand-600`, mínimo 2px, con separación del borde del elemento) en **todos** los componentes de la sección 4 — nunca `outline: none` sin un reemplazo visible equivalente.
5. **Etiquetas en los campos.** Todo `Input`, `Select`, `LocationPicker` y `DateRangePicker` tiene un `<label>` asociado por `id`/`htmlFor` (web) o `accessibilityLabel` (móvil); ninguno se identifica solo por `placeholder`. Los campos `required` marcan el asterisco en el label y además `aria-required="true"`. Los errores (`errorMessage`) se asocian con `aria-describedby` al input correspondiente.
6. **Roles y texto alternativo.** `Toast` usa `role="status"` (`info`, `success`) o `role="alert"` (`error`, `warning`, para que el lector de pantalla lo anuncie sin esperar foco). Toda imagen en `PhotoUpload` y `BeforeAfterViewer` lleva `alt` descriptivo (mínimo: qué elemento/incidencia y si es "antes" o "después"), nunca `alt=""` salvo íconos puramente decorativos.
7. **Móvil.** Todo componente interactivo declara `accessibilityRole` y `accessibilityLabel`; `accessibilityState={{ disabled, busy }}` se refleja en `Button` `loading`/`disabled`.

## 9. Responsive

Breakpoints (`_plantilla.md` §7): móvil **<640px**, tablet **640–1024px**, desktop **>1024px**.

- **Layout general:** una sola columna en móvil; `Card`s en grilla de 2 columnas en tablet; grilla de 3–4 columnas o layout de paneles (lista + mapa/detalle lado a lado) en desktop.
- **`MapView`:** ocupa pantalla completa en móvil (controles de capas colapsados en un botón flotante que abre un panel); en desktop convive con un panel lateral de filtros/lista siempre visible.
- **`Modal`:** `size="fullscreen"` se activa automáticamente en <640px sin importar el `size` solicitado, salvo que el `size` pedido ya sea `sm` y el contenido quepa (criterio del componente, no de cada feature).

### 9.1 `DataTable` en móvil (caso difícil)

Una tabla con columnas fijas no cabe en 375px de ancho sin scroll horizontal, y el scroll horizontal en una tabla de datos operativos es una mala experiencia táctil. Regla obligatoria:

- **Debajo de 640px, `DataTable` no renderiza una tabla HTML.** Renderiza una lista vertical de `Card` compactas, una por fila:
  - La primera columna no marcada `hideOnMobile` se usa como título de la `Card` (ej. `code` o `title`).
  - Las columnas con `render` personalizado que produzcan un `StatusBadge`/`UrgencyBadge` se muestran siempre, alineadas a la derecha del título, sin importar `hideOnMobile`.
  - Las columnas marcadas `hideOnMobile: true` no aparecen en la vista de tarjeta; están pensadas para datos secundarios (ej. auditoría) que no son necesarios para escanear la lista en campo.
  - El resto de columnas visibles se listan como pares etiqueta/valor apilados dentro de la `Card`.
  - `onRowClick`, si existe, hace toda la `Card` presionable (mínimo 44px de alto, sección 7.1).
- **La búsqueda y el ordenamiento siguen disponibles** en móvil: la búsqueda como un `Input` de ancho completo sobre la lista; el ordenamiento colapsa a un `Select` ("Ordenar por: Fecha ↓") en vez de encabezados de columna clicables, porque no hay encabezados de columna en la vista de tarjetas.
- **La paginación** se conserva como controles simples "Anterior / Siguiente" con el conteo ("21–40 de 128") en vez de una lista de números de página, que no cabe ni es cómoda de tocar en una pantalla angosta.
- Este comportamiento es interno de `DataTable` (media query o `useMediaQuery` del propio componente): ninguna feature implementa su propia versión "móvil" de una tabla — sería exactamente la duplicación que este spec busca evitar.

## 10. Reglas para la IA

### 10.1 Prohibido

- **Recrear un componente que ya existe en este catálogo.** Si una feature necesita un botón, un input, un modal, una tabla paginada, un badge de estado o de urgencia, un selector de ubicación, un subidor de fotos, un visor antes/después, un selector de rango de fechas o un estado vacío, **importa el componente de `components/ui`, `components/forms` o `components/map`**. No se escribe un `<button className="...">` suelto, ni un `<div>` que imite un modal, ni un componente `MyCustomTable`.
- **CSS inline para layouts** (`style={{ display: 'flex', ... }}` en web para posicionar elementos). Layout es siempre Tailwind (web) o `StyleSheet` (móvil). `style` inline solo se admite para un valor verdaderamente dinámico y no expresable en clases (ej. el `width` en porcentaje de una barra de progreso calculada en runtime).
- **Instalar librerías de componentes no autorizadas** (ver lista de la sección 2.4). Cualquier librería nueva de UI, mapas o formularios requiere una actualización de este spec antes de instalarse, no una decisión ad-hoc de quien está generando una feature.
- **Inventar un color de estado o de urgencia** fuera de las tablas de la sección 3.1. Si un catálogo (`INCIDENT_STATUS`, `URGENCY_LEVEL`, `INTERVENTION_STATUS`, `CONTRACT_STATUS`) recibe un `code` nuevo no contemplado aquí, se actualiza este spec, no se improvisa un color en el componente que lo consume.
- **Redeclarar tipos de props ya definidos aquí** en el archivo de una feature. Los tipos de catálogo (`SelectOption`, `MapMarkerData`, etc.) se importan desde el componente o desde `shared/types/`.

### 10.2 Cómo decidir: ¿biblioteca compartida o específico de una feature?

Un componente nuevo entra a `components/ui` (o `components/forms`, `components/map`) —y por tanto a este spec, actualizándolo— cuando cumple **al menos dos** de estos criterios:

1. Lo necesitan dos o más features distintas (ej. `PhotoUpload` lo usan intervenciones e incidencias).
2. Representa un concepto transversal del dominio, no del flujo de una pantalla (un badge de estado, un selector de ubicación).
3. Su estilo o comportamiento debe ser idéntico en todo el sistema para que la interfaz se sienta coherente (cualquier cosa que pinte un estado o una urgencia).

Un componente se queda **local a la feature** (en la carpeta de esa feature, no en `components/ui`) cuando:

- Combina componentes de este catálogo de una forma específica de una sola pantalla (ej. el layout particular de la ficha de un elemento verde, que usa `Card`, `BeforeAfterViewer` y `DataTable` juntos de una manera que no se repite en ningún otro lugar).
- Contiene lógica de negocio de esa feature (ej. el cálculo de qué botones mostrar según el estado de una intervención específica).

**Regla práctica:** si al escribir el componente la IA se pregunta "¿esto se vería igual en otra pantalla del sistema?" y la respuesta es sí, va a la biblioteca compartida y se documenta aquí antes de continuar.

## 11. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Todos los componentes de la sección 4 existen como archivo en `frontend/src/components/ui/`, `forms/` o `map/`, con el nombre de archivo indicado en este spec. | Abrir la carpeta correspondiente y comparar contra la lista de archivos de este documento; no debe faltar ninguno. |
| CA-02 | Dos features distintas que muestran un estado de incidencia usan el mismo color para el mismo `code` de estado. | Abrir dos pantallas distintas que muestren incidencias en el mismo estado (ej. `RESOLVED`) y comparar visualmente el color del badge: deben ser idénticos, sin necesidad de leer código. |
| CA-03 | Ningún botón, input o ítem de lista interactivo en las pantallas de formulario de campo (intervención, incidencia) mide menos de 44px de alto. | Con las herramientas de desarrollador del navegador (o inspector de RN), medir el alto renderizado de un botón o campo en el formulario de campo; debe ser ≥44px. |
| CA-04 | Un `DataTable` de cualquier listado (inventario, incidencias, contratos) se ve como lista de tarjetas apiladas, sin scroll horizontal, al reducir el ancho de la ventana por debajo de 640px. | Abrir cualquier pantalla de listado en el navegador y reducir el ancho de la ventana a menos de 640px (o simular un dispositivo móvil en las devtools): la tabla debe transformarse en tarjetas, no mostrar scroll lateral. |
| CA-05 | Al agregar una foto en un formulario con `PhotoUpload` y simular una red lenta o sin conexión, la miniatura de la foto aparece de inmediato y el formulario sigue siendo usable (se puede seguir escribiendo en otros campos) mientras la foto está "subiendo". | En las devtools del navegador, activar limitación de red (`Slow 3G` u `Offline`), agregar una foto y verificar que la miniatura aparece al instante y que otros campos del formulario aceptan texto sin bloquearse. |
| CA-06 | Todo campo de formulario (`Input`, `Select`, `LocationPicker`, `DateRangePicker`) muestra una etiqueta visible asociada, no solo un placeholder. | Inspeccionar visualmente cualquier formulario: cada campo debe tener un texto de etiqueta encima o al costado, visible incluso cuando el campo está vacío. |
| CA-07 | Navegando solo con teclado (Tab, Shift+Tab, Enter, Esc), es posible abrir un `Modal`, interactuar con sus campos, y cerrarlo, sin usar el mouse. | En cualquier pantalla web con un `Modal` (ej. confirmación de acción), navegar únicamente con teclado desde que se abre hasta que se cierra; en ningún punto el foco debe "escaparse" fuera del modal ni perderse. |

## 12. Tests

**La suite está en `frontend/src/components/**/__tests__/`.** Los casos de renderizado básico
—"muestra el label", "dispara onClick"— viven ahí y no se enumeran aquí. Lo que debe quedar
fijado, porque es una garantía de accesibilidad o de comportamiento que se pierde en un
refactor:

```
Accesibilidad
- Button con solo un icono y sin aria-label → el test falla (es un error, no un aviso)
- Button loading → aria-busy=true y el segundo click NO dispara onClick
- Input con errorMessage → aria-invalid=true y el mensaje queda asociado por aria-describedby
- Modal → atrapa el foco, cierra con Esc y devuelve el foco al disparador
- Navegación completa por teclado en un formulario y en un modal
- jest-axe sin violaciones en Button, Input, Select, Modal y DataTable

Responsive
- DataTable bajo 640px → renderiza tarjetas, NO una tabla con scroll horizontal
- Los componentes táctiles de pantallas de campo miden 44px o más

Catálogos y color
- StatusBadge y UrgencyBadge resuelven el color por `code`, no por `label`:
  cambiar el label NO cambia el color
- Todo color usado coincide con los hex de §3.1 (comparar el valor, no a simple vista)

Aislamiento
- Ningún componente del catálogo dispara fetch por su cuenta
- EmptyState distingue "sin datos" de "sin resultados de búsqueda"
```

## 13. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio de los componentes:

- **Ningún componente del catálogo hace llamadas HTTP.** `PhotoUpload`, `Select` (con carga de
  catálogo) y `MapView` reciben datos o callbacks del contenedor, que usa `lib/api.ts` (§5.3).
  Así la autenticación y el manejo de errores quedan en un solo sitio.
- **`errorMessage` y `helperText` son texto plano.** `dangerouslySetInnerHTML` está prohibido en
  todo componente de este catálogo.
- **URLs prefirmadas de vida corta** en `BeforeAfterViewer` y en las miniaturas ya subidas de
  `PhotoUpload` (SPEC-002 INV-06). Ningún componente las cachea más allá de su ciclo de vida.
- **`LocationPicker` pide el permiso de geolocalización de forma explícita**, nunca al montar
  sin interacción, y muestra `errorMessage` si se rechaza en vez de fallar en silencio.

**Extensibilidad.** `StatusBadge` y `UrgencyBadge` resuelven el color por `code` de catálogo,
nunca por el texto del `label`: un cliente que traduzca los labels no rompe el mapeo. La paleta
de §3 vive en `tailwind.config.ts` y `theme/colors.ts`, nunca como hex sueltos en un componente
—cambiar de marca es tocar dos archivos, no buscar hex por todo el código—. La URL del
proveedor de tiles de `MapView` es configuración, no literal.

**Checklist propio** (el común está en [`REGLAS.md` §6](../REGLAS.md)):

- [ ] La feature declara qué componentes de este catálogo reutiliza. Si necesita uno que no
      existe y es transversal (§10.2), se añade aquí primero, no se improvisa en la feature.
- [ ] Ningún componente nuevo duplica uno de `components/ui`, `forms` o `map`.
- [ ] Sin reglas de layout en línea (`style={{ display: ... }}`) en componentes web.
- [ ] Ninguna librería de UI, mapas o formularios fuera de las autorizadas en §2.4.
- [ ] Todo color de estado o urgencia coincide con las tablas de §3.1 **comparando el hex**, no
      a simple vista.
- [ ] Los componentes táctiles de pantallas de campo miden 44px o más.
- [ ] `DataTable` probado bajo 640px: se ve como tarjetas, no con scroll horizontal.
- [ ] Navegación completa por teclado probada en al menos un formulario y un modal.
- [ ] Los tests de §12 pasan (`npm test` en `frontend/` y en `mobile/`).

