import { notifyWrite } from '../../writeEvents';
import { definePreloadedList, resetPreloadedLists } from '../preloadedList';

/** Una promesa que el test resuelve cuando quiere, para ver el estado intermedio. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
let seq = 0;
const uniqueName = () => `lista-${++seq}`;

afterEach(() => resetPreloadedLists());

describe('carga al abrir', () => {
  it('pide la lista al abrirse y la guarda', async () => {
    const load = jest.fn().mockResolvedValue([{ id: 1 }]);
    const list = definePreloadedList(uniqueName(), load, [/^\/x/]);
    list.open();
    expect(list.snapshot().loading).toBe(true);
    await flush();
    expect(list.snapshot()).toMatchObject({ items: [{ id: 1 }], loaded: true, loading: false, errorMessage: null });
  });

  it('dos buscadores de la misma pantalla comparten una sola petición', async () => {
    const load = jest.fn().mockResolvedValue([]);
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    list.open();
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('montar, desmontar y volver a montar mientras carga no repite la petición', async () => {
    const load = jest.fn().mockResolvedValue([]);
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    list.close();
    list.open();
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('volver a abrir la pantalla pide la lista otra vez', async () => {
    const load = jest.fn().mockResolvedValue([]);
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    await flush();
    list.close();
    list.open();
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('un fallo deja el mensaje en español y conserva lo que había', async () => {
    const load = jest.fn().mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(new Error('x'));
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    await flush();
    list.reload();
    await flush();
    expect(list.snapshot().items).toEqual([{ id: 1 }]);
    expect(list.snapshot().errorMessage).toEqual(expect.any(String));
  });

  it('descarta una respuesta vieja que llega después de una nueva', async () => {
    const first = deferred<number[]>();
    const load = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([2]);
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    list.reload();
    await flush();
    first.resolve([1]);
    await flush();
    expect(list.snapshot().items).toEqual([2]);
  });
});

describe('recarga tras un registro (D-03)', () => {
  it('recarga solo las listas abiertas relacionadas con la ruta escrita', async () => {
    const directory = jest.fn().mockResolvedValue([]);
    const places = jest.fn().mockResolvedValue([]);
    const orgs = definePreloadedList(uniqueName(), directory, [/^\/directory/]);
    const placeList = definePreloadedList(uniqueName(), places, [/^\/places/]);
    orgs.open();
    placeList.open();
    await flush();
    notifyWrite('/directory/organizations');
    await flush();
    expect(directory).toHaveBeenCalledTimes(2);
    expect(places).toHaveBeenCalledTimes(1);
  });

  it('no pide una lista cerrada: se pedirá al abrirla', async () => {
    const load = jest.fn().mockResolvedValue([]);
    definePreloadedList(uniqueName(), load, [/^\/directory/]);
    notifyWrite('/directory/organizations');
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it.each(['/imports/7/preview', '/imports/7/confirmation-summary', '/places/export', '/map/describe'])(
    'un POST que no guarda nada (%s) no recarga', async (path) => {
      const load = jest.fn().mockResolvedValue([]);
      const list = definePreloadedList(uniqueName(), load, [/^\/imports/, /^\/places/, /^\/map/]);
      list.open();
      await flush();
      notifyWrite(path);
      await flush();
      expect(load).toHaveBeenCalledTimes(1);
    });

  it('ignora la parte de consulta de la ruta', async () => {
    const load = jest.fn().mockResolvedValue([]);
    const list = definePreloadedList(uniqueName(), load, [/^\/users$/]);
    list.open();
    await flush();
    notifyWrite('/users?x=1');
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('cerrar sesión (D-05)', () => {
  it('descarta lo cargado y las respuestas en vuelo', async () => {
    const pending = deferred<number[]>();
    const load = jest.fn().mockResolvedValueOnce([1]).mockReturnValueOnce(pending.promise);
    const list = definePreloadedList(uniqueName(), load, []);
    list.open();
    await flush();
    list.reload();
    resetPreloadedLists();
    pending.resolve([9]);
    await flush();
    expect(list.snapshot()).toMatchObject({ items: [], loaded: false, loading: false });
  });
});

describe('avisos a quien escucha', () => {
  it('avisa cada cambio de estado', async () => {
    const list = definePreloadedList(uniqueName(), jest.fn().mockResolvedValue([]), []);
    const listener = jest.fn();
    const stop = list.subscribe(listener);
    list.open();
    await flush();
    stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
