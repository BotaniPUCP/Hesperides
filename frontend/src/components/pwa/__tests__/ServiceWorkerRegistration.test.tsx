import { render, waitFor } from '@testing-library/react';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

type FakeServiceWorker = { register: jest.Mock };

function setServiceWorker(value: FakeServiceWorker) {
  Object.defineProperty(window.navigator, 'serviceWorker', { value, configurable: true });
}

describe('ServiceWorkerRegistration', () => {
  afterEach(() => {
    delete (window.navigator as unknown as { serviceWorker?: FakeServiceWorker }).serviceWorker;
  });

  it('registra el service worker de la raiz', async () => {
    const register = jest.fn().mockResolvedValue({});
    setServiceWorker({ register });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' }));
  });

  it('no hace nada si el navegador no soporta service workers', () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });

  it('un registro fallido no rompe la pantalla', async () => {
    const register = jest.fn().mockRejectedValue(new Error('sin https'));
    setServiceWorker({ register });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });

  it('no pinta nada', () => {
    setServiceWorker({ register: jest.fn().mockResolvedValue({}) });
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container).toBeEmptyDOMElement();
  });
});
