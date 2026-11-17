import { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { Viewer } from '../../viewer/createViewer';
import { MapSequenceScreen } from '../MapSequenceScreen';

const mockViewer = {
  setLayerVisible: jest.fn(), setPaint: jest.fn(), setLabels: jest.fn(), setCaptureMode: jest.fn(),
  setSequence: jest.fn(), setSequenceLook: jest.fn(), setPoseNow: jest.fn(), freezeFrame: jest.fn(),
} as unknown as Viewer;

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useMapLayers', () => ({ useMapLayers: () => ({ data: {}, errorMessage: null }) }));
jest.mock('@/hooks/usePlanModel', () => ({ usePlanModel: () => ({ model: null, failed: true }) }));
jest.mock('../../sceneData', () => ({ toSceneData: () => ({ plane: {} }) }));
jest.mock('../../Map3DView', () => ({
  Map3DView: ({ onReady }: { onReady: (v: Viewer) => void }) => {
    useEffect(() => { onReady(mockViewer); }, [onReady]);
    return null;
  },
}));

describe('pantalla de la secuencia', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('tras preparar, pide Espacio aunque React monte dos veces (StrictMode)', async () => {
    render(<StrictMode><MapSequenceScreen /></StrictMode>);
    expect(screen.getByRole('status')).toHaveTextContent('Preparando');
    await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('status')).toHaveTextContent('Pulsa espacio');
    expect(mockViewer.setSequenceLook).toHaveBeenLastCalledWith('low');
  });
});
