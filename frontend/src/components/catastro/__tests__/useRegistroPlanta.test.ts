import { act, renderHook } from '@testing-library/react';
import { todayLocal } from '@/lib/local-date';
import { useRegistroPlanta } from '../registrar/useRegistroPlanta';

jest.mock('@/lib/catastro-api', () => ({ catastroApi: { register: jest.fn().mockResolvedValue('PL-1') } }));

describe('useRegistroPlanta', () => {
  it('abre con hoy en las fechas sin contarlo como un cambio por guardar', () => {
    const { result } = renderHook(() => useRegistroPlanta());

    expect(result.current.valores.fechaMedicion).toBe(todayLocal());
    expect(result.current.valores.fechaEvaluacion).toBe(todayLocal());
    expect(result.current.sinGuardar).toBe(false);
  });

  it('«Registrar otra» vuelve a proponer hoy aunque la anterior usara otra fecha', async () => {
    const { result } = renderHook(() => useRegistroPlanta());
    act(() => {
      result.current.cambiar('especie', 'Schinus molle');
      result.current.cambiar('lat', '-12');
      result.current.cambiar('lon', '-77');
      result.current.cambiar('alturaM', '5');
      result.current.cambiar('fechaMedicion', '2020-01-01');
    });
    await act(() => result.current.enviar());

    act(() => result.current.registrarOtra());

    expect(result.current.valores.fechaMedicion).toBe(todayLocal());
    expect(result.current.sinGuardar).toBe(false);
  });
});
