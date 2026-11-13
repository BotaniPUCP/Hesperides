import { render, screen } from '@testing-library/react';
import { ModuleBackdrop } from '../ModuleBackdrop';

let mockPathname = '/riego';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

function canvasContextDouble() {
  const gradient = { addColorStop: jest.fn() };
  return {
    gradient,
    setTransform: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
  };
}

function useCanvasDouble() {
  const ctx = canvasContextDouble();
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as RenderingContext);
  return ctx;
}

describe('ModuleBackdrop', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['/riego', 'riego', '#0B5F8A'],
    ['/lugares/LUG-0001', 'lugares', '#8A3F1F'],
  ])('%s pinta el fondo completo de su módulo', (path, module, firstTone) => {
    const ctx = useCanvasDouble();
    mockPathname = path;

    render(<ModuleBackdrop />);

    const backdrop = screen.getByTestId('module-backdrop');
    expect(backdrop).toHaveAttribute('data-module', module);
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(ctx.gradient.addColorStop).toHaveBeenCalledTimes(4);
    expect(ctx.gradient.addColorStop).toHaveBeenCalledWith(0, firstTone);
  });

  it('no pinta nada en una ruta sin módulo', () => {
    mockPathname = '/mapa';

    render(<ModuleBackdrop />);

    expect(screen.queryByTestId('module-backdrop')).not.toBeInTheDocument();
  });

  it.each(['/incidencias', '/incidencias/7', '/incidencias/nueva'])('uses the approved neutral workspace only on %s', path => {
    mockPathname = path;
    const { container } = render(<ModuleBackdrop />);
    expect(screen.getByTestId('module-backdrop')).toHaveClass('bg-neutral-100/80');
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });
});
