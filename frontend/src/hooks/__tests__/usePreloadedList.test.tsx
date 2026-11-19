import { render, screen, waitFor } from '@testing-library/react';
import { definePreloadedList, resetPreloadedLists } from '@/lib/preload/preloadedList';
import { usePreloadedList } from '../usePreloadedList';

afterEach(() => resetPreloadedLists());

function Sonda({ list, enabled = true }: { list: ReturnType<typeof definePreloadedList<string>>; enabled?: boolean }) {
  const { items, loaded } = usePreloadedList(list, enabled);
  return <p>{loaded ? items.join(',') : 'cargando'}</p>;
}

describe('usePreloadedList', () => {
  it('pide la lista al montarse y muestra lo que llega', async () => {
    const load = jest.fn().mockResolvedValue(['a', 'b']);
    render(<Sonda list={definePreloadedList<string>('h1', load, [])} />);
    expect(screen.getByText('cargando')).toBeInTheDocument();
    expect(await screen.findByText('a,b')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('dos componentes montados juntos hacen una sola petición', async () => {
    const load = jest.fn().mockResolvedValue(['x']);
    const list = definePreloadedList<string>('h2', load, []);
    render(<><Sonda list={list} /><Sonda list={list} /></>);
    await waitFor(() => expect(screen.getAllByText('x')).toHaveLength(2));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('desactivado no pide nada', () => {
    const load = jest.fn().mockResolvedValue([]);
    render(<Sonda list={definePreloadedList<string>('h3', load, [])} enabled={false} />);
    expect(load).not.toHaveBeenCalled();
  });
});
