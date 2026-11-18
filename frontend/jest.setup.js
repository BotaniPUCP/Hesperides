import '@testing-library/jest-dom';

// Fuera de Next no hay App Router montado y useRouter() lanza. Muchos componentes
// lo usan (por ejemplo, el aviso de cambios sin guardar); este doble basta para
// los que no navegan. Las pruebas que miran la navegación declaran el suyo, que
// reemplaza a este.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom no implementa ResizeObserver ni el canvas 2D, y ModuleBackdrop se monta en
// toda pantalla de un módulo. Las pruebas que dibujan declaran su propio contexto.
global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (typeof HTMLCanvasElement !== 'undefined') HTMLCanvasElement.prototype.getContext = () => null;

// Las listas precargadas viven en el módulo (SPEC-119): sin vaciarlas, lo que cargó una prueba
// aparecería en la siguiente.
afterEach(() => require('@/lib/preload/preloadedList').resetPreloadedLists());
afterEach(() => require('@/lib/preload/placeDetailCache').clearPlaceDetailCache());
