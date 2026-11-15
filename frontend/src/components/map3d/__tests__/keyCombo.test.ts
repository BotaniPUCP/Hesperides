import { isCtrlShift } from '../keyCombo';

const keys = { code: 'KeyY', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };

describe('isCtrlShift', () => {
  it('reconoce Ctrl+Shift con la tecla pedida', () => {
    expect(isCtrlShift(keys, 'KeyY')).toBe(true);
  });

  it.each([
    ['sin Ctrl', { ...keys, ctrlKey: false }],
    ['sin Shift', { ...keys, shiftKey: false }],
    ['con Alt', { ...keys, altKey: true }],
    ['con Meta', { ...keys, metaKey: true }],
    ['con otra tecla', { ...keys, code: 'KeyU' }],
  ])('%s no coincide', (_, event) => {
    expect(isCtrlShift(event, 'KeyY')).toBe(false);
  });
});
