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
