import { notifyWrite } from '../../writeEvents';
import { cachedPlaceDetail, clearPlaceDetailCache } from '../placeDetailCache';

afterEach(() => clearPlaceDetailCache());

describe('cachedPlaceDetail', () => {
  it('pide cada ficha una sola vez aunque la pidan muchas tarjetas', async () => {
    const load = jest.fn().mockResolvedValue({ code: 'LUG-1' });
    await Promise.all([cachedPlaceDetail('LUG-1', load), cachedPlaceDetail('LUG-1', load)]);
    await cachedPlaceDetail('LUG-1', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('una escritura en /places la vacía: la próxima vez se pide de nuevo', async () => {
    const load = jest.fn().mockResolvedValue({ code: 'LUG-1' });
    await cachedPlaceDetail('LUG-1', load);
    notifyWrite('/places/LUG-1/perspectives');
    await cachedPlaceDetail('LUG-1', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('una escritura en otro módulo no la vacía', async () => {
    const load = jest.fn().mockResolvedValue({ code: 'LUG-1' });
    await cachedPlaceDetail('LUG-1', load);
    notifyWrite('/directory/organizations');
    await cachedPlaceDetail('LUG-1', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('un fallo no queda guardado: se puede reintentar', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ code: 'LUG-1' });
    await expect(cachedPlaceDetail('LUG-1', load)).rejects.toThrow('x');
    await expect(cachedPlaceDetail('LUG-1', load)).resolves.toEqual({ code: 'LUG-1' });
  });
});
