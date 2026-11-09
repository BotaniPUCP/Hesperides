import { useLayoutEffect } from 'react';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { readListScroll, saveListScroll } from '@/lib/listScroll';
import { useListScrollRestoration } from '../useListScrollRestoration';

const PATH = '/lista';
let scrollTo: jest.SpyInstance;
let frames: FrameRequestCallback[];

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value });
}

function scrollUserTo(value: number) {
  setScrollY(value);
  fireEvent.scroll(window);
}

/** Avanza la animación del navegador: cada cuadro corre lo que estaba pedido. */
function runFrames(count: number) {
  act(() => {
    for (let i = 0; i < count; i += 1) frames.splice(0).forEach((frame) => frame(performance.now()));
  });
}

function setup(initial: { query?: string; ready?: boolean } = {}) {
  return renderHook(
    ({ query, ready }) => useListScrollRestoration(PATH, query, ready),
    { initialProps: { query: initial.query ?? '', ready: initial.ready ?? true } },
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  setScrollY(0);
  frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => frames.push(frame));
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { frames = []; });
  scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(((_x: number, y: number) => setScrollY(y)) as typeof window.scrollTo);
});

afterEach(() => jest.restoreAllMocks());

it('al salir guarda la última posición con los filtros vigentes', () => {
  const view = setup({ query: 'type=PALM' });

  scrollUserTo(900);
  view.unmount();

  expect(readListScroll(PATH)).toEqual({ query: 'type=PALM', top: 900 });
});

it('guarda antes de que el router lleve la página arriba al cambiar de pantalla', () => {
  const view = renderHook(() => {
    useListScrollRestoration(PATH, '', true);
    // Lo que hace la navegación real: en el mismo commit que retira la lista, la página sube.
    useLayoutEffect(() => () => scrollUserTo(0), []);
  });
  scrollUserTo(842);

  view.unmount();

  expect(readListScroll(PATH)).toEqual({ query: '', top: 842 });
});

it('al salir sin haberse desplazado no guarda nada', () => {
  const view = setup();

  view.unmount();

  expect(readListScroll(PATH)).toBeNull();
});

it('no restaura hasta que los datos están listos: antes la página es muy corta', () => {
  saveListScroll(PATH, '', 900);
  const view = setup({ ready: false });
  runFrames(2);
  expect(scrollTo).not.toHaveBeenCalled();

  view.rerender({ query: '', ready: true });
  runFrames(1);

  expect(scrollTo).toHaveBeenCalledWith(0, 900);
});

it('sigue intentando mientras la página crece, por ejemplo al cargar imágenes', () => {
  saveListScroll(PATH, '', 900);
  scrollTo.mockImplementation(((_x: number, y: number) => setScrollY(Math.min(y, 300))) as typeof window.scrollTo);
  setup();
  runFrames(2);
  expect(window.scrollY).toBe(300);

  scrollTo.mockImplementation(((_x: number, y: number) => setScrollY(y)) as typeof window.scrollTo);
  runFrames(2);

  expect(window.scrollY).toBe(900);
});

it('deja de intentar cuando el navegador dejó quieta la posición pedida', () => {
  saveListScroll(PATH, '', 900);
  setup();
  runFrames(5);
  scrollTo.mockClear();

  runFrames(5);

  expect(scrollTo).not.toHaveBeenCalled();
  expect(frames).toHaveLength(0);
});

it('corrige si algo vuelve a llevar la página arriba justo después de restaurar', () => {
  saveListScroll(PATH, '', 900);
  setup();
  runFrames(1);
  setScrollY(0);

  runFrames(1);

  expect(window.scrollY).toBe(900);
});

it('no restaura si los filtros cambiaron', () => {
  saveListScroll(PATH, 'type=PALM', 900);
  setup({ query: 'type=TREE' });
  runFrames(2);

  expect(scrollTo).not.toHaveBeenCalled();
});

it('sin posición guardada no mueve la página', () => {
  setup();
  runFrames(2);

  expect(scrollTo).not.toHaveBeenCalled();
});

it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])('si la persona se mueve (%s), deja de restaurar', (event) => {
  saveListScroll(PATH, '', 900);
  scrollTo.mockImplementation(((_x: number, y: number) => setScrollY(Math.min(y, 300))) as typeof window.scrollTo);
  setup();
  runFrames(1);
  scrollTo.mockClear();

  act(() => { window.dispatchEvent(new Event(event)); });
  runFrames(3);

  expect(scrollTo).not.toHaveBeenCalled();
});

it('se abandona al cumplirse el tiempo, si la página nunca alcanza la altura', () => {
  saveListScroll(PATH, '', 900);
  const now = jest.spyOn(performance, 'now').mockReturnValue(1000);
  scrollTo.mockImplementation(((_x: number, y: number) => setScrollY(Math.min(y, 300))) as typeof window.scrollTo);
  setup();
  runFrames(1);
  scrollTo.mockClear();

  now.mockReturnValue(1000 + 60000);
  runFrames(2);

  expect(scrollTo).not.toHaveBeenCalled();
  expect(frames).toHaveLength(0);
});

it('mientras restaura, los saltos de la página no pisan la posición guardada', () => {
  saveListScroll(PATH, '', 900);
  const view = setup({ ready: false });

  scrollUserTo(0);
  view.unmount();

  expect(readListScroll(PATH)).toEqual({ query: '', top: 900 });
});

it('una vez restaurada, guarda lo que la persona haga después', () => {
  saveListScroll(PATH, '', 900);
  const view = setup();
  runFrames(5);

  scrollUserTo(1200);
  view.unmount();

  expect(readListScroll(PATH)).toEqual({ query: '', top: 1200 });
});

it('filtrar después de restaurar no vuelve a mover la página', () => {
  saveListScroll(PATH, '', 900);
  const view = setup();
  runFrames(5);
  scrollTo.mockClear();

  view.rerender({ query: 'type=PALM', ready: false });
  view.rerender({ query: 'type=PALM', ready: true });
  runFrames(3);

  expect(scrollTo).not.toHaveBeenCalled();
});
