import { render, waitFor } from '@testing-library/react';
import { Map3DView } from '../Map3DView';
import type { SceneData } from '../sceneData';
import { createViewer, type Viewer } from '../viewer/createViewer';

jest.mock('../viewer/createViewer', () => ({ createViewer: jest.fn() }));

const mockedCreate = createViewer as jest.MockedFunction<typeof createViewer>;
const SCENE = {} as SceneData;
const nada = () => undefined;

function mount(start?: { realColors?: boolean }) {
  mockedCreate.mockReturnValue({ dispose: jest.fn(), pose: jest.fn() } as unknown as Viewer);
  render(<Map3DView data={SCENE} start={start} onReady={nada} onUnsupported={nada}
    onSelect={nada} onGroundPick={nada} onHover={nada} onCompass={nada} />);
}

describe('Map3DView', () => {
  beforeEach(() => mockedCreate.mockReset());

  it('nace en colores reales si quien lo monta no dice nada (SPEC-112 D-13)', async () => {
    mount();
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0][6]).toMatchObject({ realColors: true });
  });

  it('respeta a quien pide nacer en rosado', async () => {
    mount({ realColors: false });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0][6]).toMatchObject({ realColors: false });
  });
});
