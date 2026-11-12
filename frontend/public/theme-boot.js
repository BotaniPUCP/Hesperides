(function () {
  try {
    var preference = localStorage.getItem('hesperides.theme');
    if (['light', 'dark', 'system'].indexOf(preference) < 0) preference = 'light';
    var isDark = preference === 'dark'
      || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (error) {
    // The theme should not prevent the page from rendering if storage is unavailable.
  }
})();
