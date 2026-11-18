import type { MetadataRoute } from 'next';

/** Verde de marca (docs/marca/paleta.md): barra del sistema y pantalla de arranque. */
export const BRAND_GREEN = '#02591F';

const ICON_SIZES = [192, 512] as const;

/**
 * Cada tamaño se declara dos veces porque Android elige el «maskable» para
 * recortarlo con la forma del lanzador y el «any» para el resto (SPEC-120 D-02).
 */
function appIcons(): MetadataRoute.Manifest['icons'] {
  return ICON_SIZES.flatMap((size) =>
    (['any', 'maskable'] as const).map((purpose) => ({
      src: `/icons/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose,
    })),
  );
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hesperides',
    short_name: 'Hesperides',
    description: 'Gestión de áreas verdes del campus PUCP',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND_GREEN,
    theme_color: BRAND_GREEN,
    icons: appIcons(),
  };
}
