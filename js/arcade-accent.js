(() => {
  const picker = document.querySelector('.za-accent');
  if (!picker) return;
  const root = document.documentElement;
  const syncPicker = () => {
    const custom = picker.querySelector('[value="custom"]');
    if (root.style.getPropertyValue('--accent')) {
      if (!custom) picker.add(new Option('Custom', 'custom'));
      picker.value = 'custom';
    } else {
      custom?.remove();
      picker.value = root.dataset.theme || 'sunset';
    }
  };
  syncPicker();
  new MutationObserver(syncPicker).observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  picker.addEventListener('change', () => {
    const theme = picker.value;
    root.dataset.theme = theme;
    for (const name of ['--accent', '--accent-2', '--accent-rgb', '--accent-2-rgb']) {
      root.style.removeProperty(name);
    }
    picker.querySelector('[value="custom"]')?.remove();
    try {
      const prefs = JSON.parse(localStorage.getItem('zenou_prefs') || '{}');
      Object.assign(prefs, {theme, hue: null});
      delete prefs.hueRgb;
      delete prefs.hue2Rgb;
      localStorage.setItem('zenou_prefs', JSON.stringify(prefs));
    } catch { /* The selection still applies for this page. */ }
  });
})();
