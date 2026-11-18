export interface KeyCombo { code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }

/** Ctrl+Shift con la tecla `code` (`KeyboardEvent.code`), sin Alt ni Meta. */
export function isCtrlShift(event: KeyCombo, code: string): boolean {
  return event.code === code && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;
}
