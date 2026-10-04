/**
 * El destino de un clic si es un enlace que saca de la pantalla dentro de la
 * app; null si el navegador o la app deben resolverlo sin preguntar: otra
 * pestaña, una descarga, otro sitio, un ancla de la misma página o un clic con
 * tecla modificadora.
 */
export function leavingLink(event: MouseEvent, location: Location): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
