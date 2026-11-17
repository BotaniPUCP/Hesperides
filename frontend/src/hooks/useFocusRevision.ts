'use client';

import { useEffect, useState } from 'react';

/** One revision per return to the visible tab/window, even when both events fire. */
export function useFocusRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let wasHidden = document.visibilityState === 'hidden';
    let blurredWhileVisible = false;

    const refresh = () => setRevision((current) => current + 1);
    const onBlur = () => {
      blurredWhileVisible = true;
    };
    const onFocus = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      if (wasHidden) {
        wasHidden = false;
        blurredWhileVisible = false;
        refresh();
      } else if (blurredWhileVisible) {
        blurredWhileVisible = false;
        refresh();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
      } else if (wasHidden) {
        wasHidden = false;
        blurredWhileVisible = false;
        refresh();
      }
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return revision;
}
