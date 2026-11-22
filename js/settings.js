/* ZenouMath, settings panel.
 * Appearance: accent pair, glow strength, corner style, card density,
 * background style and motion. Disguise: tab title, preset/custom favicon.
 * Everything applies instantly and is stored in this browser only.
 */
'use strict';

(function () {
  const $ = (s, el) => (el || document).querySelector(s);

  const store = {
    get(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  /* ---------- appearance ---------- */
  const THEMES = [
    ['white', 'White'],
    ['aurora', 'Aurora'],
    ['cyan', 'Cyan'],
    ['violet', 'Violet'],
    ['emerald', 'Emerald'],
    ['amber', 'Amber'],
    ['crimson', 'Crimson'],
    ['ice', 'Ice'],
    ['ocean', 'Ocean'],
    ['sunset', 'Sunset'],
    ['rose', 'Rose'],
    ['mint', 'Mint'],
    ['gold', 'Gold'],
  ];
  const THEME_IDS = new Set(THEMES.map(([id]) => id));

  const PREF_GROUPS = [
    ['glow', 'Glow strength', [['off', 'Off'], ['soft', 'Soft'], ['medium', 'Medium'], ['strong', 'Strong']]],
    ['radius', 'Corner style', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']]],
    ['density', 'Card density', [['cozy', 'Cozy'], ['compact', 'Compact']]],
    ['bg', 'Background', [['white', 'White'],
    ['aurora', 'Aurora'], ['stars', 'Stars'], ['snow', 'Snow'], ['night', 'Stars + snow'], ['grid', 'Grid'], ['plain', 'Plain'], ['custom', 'Custom image']]],
    ['motion', 'Motion', [['full', 'Full'], ['calm', 'Calm']]],
  ];
  const DEFAULTS = { theme: 'white', glow: 'medium', radius: 'soft', density: 'cozy', bg: 'aurora', bgEffects: 'none', motion: 'full', bgDim: 45, hue: null };
  const PREF_KEY = 'zenou_prefs';
  const BG_KEY = 'zenou_bgimg';

  function readPrefs() {
    const saved = store.get(PREF_KEY, {});
    const legacy = store.get('zenou_mask', {});
    const p = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    if (!saved || !saved.theme) {
      if (legacy && THEME_IDS.has(legacy.theme)) p.theme = legacy.theme;
    }
    if (!THEME_IDS.has(p.theme)) p.theme = DEFAULTS.theme;
    return p;
  }
  function writePrefs(p) { store.set(PREF_KEY, p); }

  function readBgImage() { try { return localStorage.getItem(BG_KEY) || ''; } catch { return ''; } }

  /* hue -> rgb triple, so the glow layers and canvas keep working */
  function hslTriple(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    const k = (n) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map(x => Math.round(x * 255)).join(' ');
  }
  function applyHue(p) {
    const r = document.documentElement;
    if (p.hue == null) {
      r.style.removeProperty('--accent');
      r.style.removeProperty('--accent-2');
      r.style.removeProperty('--accent-rgb');
      r.style.removeProperty('--accent-2-rgb');
      return;
    }
    const h = +p.hue;
    r.style.setProperty('--accent', `hsl(${h} 92% 64%)`);
    r.style.setProperty('--accent-2', `hsl(${(h + 42) % 360} 92% 68%)`);
    r.style.setProperty('--accent-rgb', p.hueRgb || hslTriple(h, 92, 64));
    r.style.setProperty('--accent-2-rgb', p.hue2Rgb || hslTriple((h + 42) % 360, 92, 68));
  }

  function applyPrefs(p) {
    const r = document.documentElement;
    r.dataset.theme = p.theme;

    applyHue(p);
    r.dataset.glow = p.glow;
    r.dataset.radius = p.radius;
    r.dataset.density = p.density;
    window.ZenouAtmo?.applyPreferences(p);
  }
  function setPref(key, value) {
    const p = readPrefs();
    p[key] = value;
    if (key === 'theme') { p.hue = null; delete p.hueRgb; delete p.hue2Rgb; }
    if (key === 'hue') {
      if (value == null) { delete p.hueRgb; delete p.hue2Rgb; }
      else {
        p.hueRgb = hslTriple(+value, 92, 64);
        p.hue2Rgb = hslTriple((+value + 42) % 360, 92, 68);
      }
    }
    writePrefs(p);
    applyPrefs(p);
  }

  /* ---------- tab icon presets (inline SVG data URIs, drawn locally) ---------- */
  function svgIcon(svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  const ICON_PRESETS = [
    ['roblox', 'Roblox', svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#e2231a"/><rect x="11" y="7" width="14" height="14" rx="2" transform="rotate(12 18 14)" fill="#fff"/></svg>')],
    ['youtube', 'YouTube', svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#ff0033"/><path d="M13 10.5 23 16l-10 5.5z" fill="#fff"/></svg>')],
    ['google', 'Google', svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#fff"/><text x="16" y="22" font-family="Arial, sans-serif" font-size="17" font-weight="700" text-anchor="middle" fill="#4285F4">G</text></svg>')],
    ['drive', 'Google Drive', svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fff"/><path d="M11 6h10l7 12-5 8H9l-2-3.5z" fill="#0f9d58"/><path d="M11 6h10l3 5.5H8z" fill="#ffcf44"/><path d="M9 23.5 14 11.5h-6L3 19z" fill="#11a861"/><path d="M21 23.5H9L23 11.5h4z" fill="#4285f4"/></svg>')],
    ['classroom', 'Classroom', svgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0f9d58"/><rect x="8" y="12" width="16" height="11" rx="1.5" fill="#fff"/><path d="M16 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 5h12l-1 2H11z" fill="#fff"/></svg>')],
  ];

  /* ---------- title / icon masking ---------- */
  const maskState = { title: '', icon: '' };
  let titleObserver = null;

  function applyFavicon(icon) {
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(n => n.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = /svg/i.test(icon.slice(0, 60)) ? 'image/svg+xml' : 'image/png';
    link.href = icon;
    document.head.append(link);
  }

  function applyTabMask(title, iconPresetId, customIcon) {
    maskState.title = (title || '').trim();
    const preset = ICON_PRESETS.find(([id]) => id === iconPresetId);
    maskState.icon = customIcon || (preset && preset[2]) || '';
    if (maskState.title) document.title = maskState.title;
    if (maskState.icon) applyFavicon(maskState.icon);
    if (maskState.title && !titleObserver) {
      titleObserver = new MutationObserver(() => {
        if (maskState.title && document.title !== maskState.title) document.title = maskState.title;
      });
      const t = document.querySelector('title') || document.head.appendChild(document.createElement('title'));
      titleObserver.observe(t, { childList: true, characterData: true, subtree: true });
    }
  }

  window.zenouMaskedTitle = function (fallback) { return maskState.title || fallback; };

  window.zenouSettingsBoot = function () {
    const prefs = readPrefs();
    applyPrefs(prefs);
    const mask = store.get('zenou_mask', {});
    applyTabMask(mask.title, mask.icon, mask.iconData);
  };

  /* ---------- custom background image ---------- */
  const MAX_BG_BYTES = 3.4 * 1024 * 1024;
  function shrinkImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Pick an image file (JPG, PNG, WebP).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
          let out = '';
          for (const [max, quality] of [[2400, .84], [1800, .78], [1400, .7], [1000, .62]]) {
            const scale = Math.min(1, max / longest);
            const cw = Math.max(1, Math.round(img.naturalWidth * scale));
            const ch = Math.max(1, Math.round(img.naturalHeight * scale));
            const c = document.createElement('canvas');
            c.width = cw; c.height = ch;
            c.getContext('2d').drawImage(img, 0, 0, cw, ch);
            out = c.toDataURL('image/jpeg', quality);
            if (out.length < MAX_BG_BYTES) break;
          }
          URL.revokeObjectURL(url);
          resolve(out);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }

  /* ---------- panel ---------- */
  function buildPanel() {
    const prefs = readPrefs();
    const mask = store.get('zenou_mask', {});

    const root = document.createElement('dialog');
    root.className = 'settings-overlay';
    root.setAttribute('aria-labelledby', 'settingsTitle');
    root.innerHTML = `
      <div class="settings-panel">
        <header class="settings-header">
          <h2 id="settingsTitle">Settings</h2>
          <button class="settings-close btn btn-ghost" type="button" aria-label="Close settings" autofocus>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="settings-tabs" role="tablist" aria-label="Settings sections">
          <button type="button" role="tab" id="settingsTabAppearance" aria-controls="settingsAppearance" aria-selected="true">Appearance</button>
          <button type="button" role="tab" id="settingsTabWallpaper" aria-controls="settingsWallpaper" aria-selected="false" tabindex="-1">Wallpaper</button>
          <button type="button" role="tab" id="settingsTabBrowser" aria-controls="settingsBrowser" aria-selected="false" tabindex="-1">Browser tab</button>
          <button type="button" role="tab" id="settingsTabShortcuts" aria-controls="settingsShortcuts" aria-selected="false" tabindex="-1">Shortcuts</button>
        </div>

        <div class="settings-content">
        <section class="settings-section" role="tabpanel" id="settingsAppearance" aria-labelledby="settingsTabAppearance">
          <div class="settings-field">
            <span>Accent</span>
            <div id="seThemes" class="theme-chips"></div>
          </div>
          <div id="sePrefs"></div>

          <div class="settings-field hue-field">
            <span><label for="seHue">Custom accent hue</label> <output id="seHueOut">off</output></span>
            <input id="seHue" type="range" min="0" max="360" step="2" value="320">
            <button id="seHueClear" class="btn btn-ghost" type="button">Use preset colours</button>
          </div>

          <div class="settings-field settings-connection">
            <span>Supabase connection</span>
            <button id="seSupabaseCheck" class="btn btn-ghost" type="button" aria-describedby="seSupabaseStatus">Check connection</button>
            <small id="seSupabaseStatus" role="status" aria-live="polite">Project configured. Check its availability here.</small>
          </div>

        </section>

        <section class="settings-section" role="tabpanel" id="settingsWallpaper" aria-labelledby="settingsTabWallpaper" hidden>
          <div id="seBackgroundStyle"></div>
          <div class="settings-field" id="seWallpaperPresets" hidden>
            <span id="seWallpaperPresetsLabel">Preset wallpapers</span>
            <div class="wallpaper-presets" role="group" aria-labelledby="seWallpaperPresetsLabel"></div>
          </div>
          <div class="settings-field">
            <span>Custom wallpaper</span>
            <div class="bg-row">
              <div id="seBgThumb" class="bg-thumb" aria-hidden="true"></div>
              <div class="bg-actions">
                <input id="seBgFile" class="settings-file" type="file" accept="image/*">
                <label class="btn btn-ghost" for="seBgFile">Upload wallpaper</label>
                <button id="seBgClear" class="btn btn-ghost" type="button">Remove upload</button>
              </div>
            </div>
            <small id="seBgNote" role="status"></small>
          </div>
          <label class="settings-field" for="seDim">
            <span>Image dim <output id="seDimOut">45%</output></span>
            <input id="seDim" type="range" min="0" max="85" step="5" value="45">
          </label>
          <div class="settings-field">
            <span id="seBgEffectsLabel">Wallpaper effects</span>
            <div class="seg" id="seBgEffects" role="group" aria-labelledby="seBgEffectsLabel">
              <button type="button" data-val="none">None</button>
              <button type="button" data-val="stars">Stars</button>
              <button type="button" data-val="snow">Snow</button>
              <button type="button" data-val="night">Stars + snow</button>
            </div>
          </div>
        </section>

        <section class="settings-section" role="tabpanel" id="settingsBrowser" aria-labelledby="settingsTabBrowser" hidden>
          <label class="settings-field">
            <span>Tab title</span>
            <input id="seTitle" type="text" placeholder="ZenouMath" value="">
          </label>
          <div class="settings-field">
            <span>Preset tab icons</span>
            <div id="seIcons" class="icon-row"></div>
          </div>
          <label class="settings-field">
            <span>Custom tab icon</span>
            <input id="seIconFile" type="file" accept="image/*" aria-label="Upload custom tab icon" aria-describedby="seIconHint">
            <small id="seIconHint">Icon uploads are saved when you press Done.</small>
          </label>
        </section>

        <section class="settings-section" role="tabpanel" id="settingsShortcuts" aria-labelledby="settingsTabShortcuts" hidden>
        <div class="settings-shortcut-group">
          <h3>Web shortcuts</h3>
          <p class="settings-note">Assign keys to open up to 12 websites. Shortcuts are paused while you type.</p>
          <div id="seTabs" class="tab-binder"></div>
          <p id="seTabsNote" class="settings-note" role="status" aria-live="polite" style="margin:0"></p>
        </div>

        <div class="settings-shortcut-group">
          <h3>Arcade shortcuts</h3>
          <div class="settings-field" data-shared-settings>
            <span>Install as an app</span>
            <button id="seInstall" class="btn btn-ghost" type="button">Install Zenou</button>
            <small>Adds a home-screen icon and opens without browser chrome. Available in Chrome, Edge and most Android browsers.</small>
          </div>
          <div class="settings-field" data-shared-settings>
            <span>Keyboard</span>
            <button id="seKeys" class="btn btn-ghost" type="button">Show all shortcuts</button>
          </div>
          <div class="settings-field" data-shared-settings>
            <span>Shortcut keys</span>
            <div id="seKeymap" class="keymap"></div>
            <small>Click Change, then press any key. Defaults use digits and punctuation, so typing a letter in a game never opens a page.</small>
            <button id="seKeysReset" class="btn btn-ghost" type="button" style="margin-top:10px">Reset shortcuts</button>
            <p id="seKeyNote" class="settings-note" role="status" aria-live="polite" style="margin:8px 0 0"></p>
          </div>
          <div class="settings-field">
            <span>Your library</span>
            <div class="play-tools">
              <a class="btn btn-ghost" href="/library#overview">Stats</a>
              <a class="btn btn-ghost" href="/library#playlists">Playlists</a>
              <a class="btn btn-ghost" href="/library#achievements">Achievements</a>
              <a class="btn btn-ghost" href="/library#data">Backup</a>
            </div>
          </div>
        </div>
        </section>
        </div>

        <footer class="settings-actions">
          <button class="btn btn-ghost" type="button" data-os-invitation>ZenouOS Beta</button>
          <button id="seReset" class="btn btn-ghost" type="button">Reset all</button>
          <button id="seSave" class="btn btn-solid" type="button">Done</button>
        </footer>
      </div>`;

    const titleInput = $('#seTitle', root);
    const connectionButton = $('#seSupabaseCheck', root);
    const connectionStatus = $('#seSupabaseStatus', root);
    connectionButton.addEventListener('click', async () => {
      connectionButton.disabled = true;
      connectionStatus.textContent = 'Checking Supabase…';
      try {
        const { checkSupabaseConnection } = await import('/js/supabase.js');
        await checkSupabaseConnection();
        connectionStatus.textContent = 'Connected to Supabase.';
      } catch (error) {
        connectionStatus.textContent = error instanceof TypeError || error.name === 'TimeoutError'
          ? 'Could not reach Supabase. Check your connection and try again.'
          : 'Connection check failed. ' + error.message;
      } finally {
        connectionButton.disabled = false;
      }
    });
    const themeWrap = $('#seThemes', root);
    const prefsWrap = $('#sePrefs', root);
    const backgroundStyle = $('#seBackgroundStyle', root);
    const tabs = Array.from(root.querySelectorAll('.settings-tabs [role="tab"]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    const content = $('.settings-content', root);
    const pendingPreviews = [];
    const selectTab = (selected) => {
      for (const tab of tabs) {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      }
      for (const panel of panels) panel.hidden = panel.id !== selected.getAttribute('aria-controls');
      if (selected.getAttribute('aria-controls') === 'settingsWallpaper') {
        for (const [preview, src] of pendingPreviews.splice(0)) preview.src = src;
      }
      content.scrollTop = 0;
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', event => {
        const destinations = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        };
        const next = tabs[destinations[event.key]];
        if (!next) return;
        event.preventDefault();
        selectTab(next);
        next.focus();
      });
    });
    const iconRow = $('#seIcons', root);
    const fileInput = $('#seIconFile', root);
    const bgFile = $('#seBgFile', root);
    const bgThumb = $('#seBgThumb', root);
    const bgNote = $('#seBgNote', root);
    const bgClear = $('#seBgClear', root);
    const dimInput = $('#seDim', root);
    const dimOut = $('#seDimOut', root);
    const effects = Array.from($('#seBgEffects', root).querySelectorAll('button'));
    const presetField = $('#seWallpaperPresets', root);
    const presetGroup = $('.wallpaper-presets', root);
    titleInput.value = mask.title || '';

    const paintBg = () => {
      const v = readBgImage();
      bgThumb.style.backgroundImage = v ? `url("${v}")` : '';
      bgThumb.classList.toggle('has-image', !!v);
      bgClear.hidden = !v;
      const { bg, bgDim, bgEffects } = readPrefs();
      for (const button of presetGroup.children) {
        button.setAttribute('aria-pressed', String(button.dataset.val === bg));
      }
      dimInput.value = String(bgDim);
      dimOut.textContent = bgDim + '%';
      effects.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.val === bgEffects)));
    };
    for (const preset of window.ZenouAtmo?.wallpaperPresets || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.val = preset.id;
      button.hidden = true;
      button.setAttribute('aria-pressed', String(readPrefs().bg === preset.id));
      const preview = document.createElement('img');
      preview.alt = '';
      preview.addEventListener('load', () => {
        button.hidden = false;
        presetField.hidden = false;
        paintBg();
      }, { once: true });
      button.append(preview, preset.name);
      presetGroup.append(button);
      pendingPreviews.push([preview, preset.src]);
      button.addEventListener('click', () => {
        setPref('bg', preset.id);
        paintBgSeg();
        paintBg();
      });
    }
    paintBg();
    effects.forEach(button => button.addEventListener('click', () => {
      setPref('bgEffects', button.dataset.val);
      paintBg();
    }));

    bgFile.addEventListener('change', async () => {
      const f = bgFile.files && bgFile.files[0];
      if (!f) return;
      bgNote.textContent = 'Preparing image…';
      try {
        const data = await shrinkImage(f);
        try { localStorage.setItem(BG_KEY, data); }
        catch { throw new Error('That image is too large for this browser’s storage. Try a smaller file.'); }
        setPref('bg', 'custom');
        paintBg();
        paintBgSeg();
        bgNote.textContent = 'Background saved. It lives in this browser only.';
      } catch (err) {
        bgNote.textContent = err && err.message ? err.message : 'That image could not be used.';
      } finally {
        bgFile.value = '';
      }
    });

    bgClear.addEventListener('click', () => {
      try { localStorage.removeItem(BG_KEY); } catch { /* ignore */ }
      window.ZenouAtmo?.applyPreferences();
      paintBg();
      bgNote.textContent = 'Image removed.';
    });

    dimInput.addEventListener('input', () => {
      dimOut.textContent = dimInput.value + '%';
      setPref('bgDim', +dimInput.value);
    });

    /* accent chips */
    const paintThemes = () => {
      const prefs = readPrefs();
      const cur = prefs.hue == null ? prefs.theme : null;
      themeWrap.innerHTML = '';
      THEMES.forEach(([id, name]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'theme-chip';
        b.dataset.id = id;
        b.setAttribute('aria-pressed', cur === id ? 'true' : 'false');
        b.innerHTML = `<i class="swatch sw-${id}" aria-hidden="true"></i><span></span>`;
        b.querySelector('span').textContent = name;
        b.addEventListener('click', () => {
          setPref('theme', id);
          paintHue();
          paintThemes();
        });
        themeWrap.append(b);
      });
    };
    paintThemes();

    /* custom accent hue */
    const hueInput = $('#seHue', root);
    const hueOut = $('#seHueOut', root);
    const paintHue = () => {
      const p = readPrefs();
      hueInput.value = p.hue == null ? 320 : p.hue;
      hueOut.textContent = p.hue == null ? 'preset' : `${p.hue}°`;
    };
    paintHue();
    hueInput.addEventListener('input', () => {
      setPref('hue', +hueInput.value);
      hueOut.textContent = `${hueInput.value}°`;
      paintThemes();
    });
    $('#seHueClear', root).addEventListener('click', () => {
      setPref('hue', null);
      paintHue();
      paintThemes();
    });

    /* web tab binder */
    const TAB_KEY = 'zenou_webtabs';
    const tabWrap = $('#seTabs', root);
    const tabNote = $('#seTabsNote', root);

    const MAX_TABS = 12;
    let draftOpen = false;
    const readTabs = () => {
      const raw = store.get(TAB_KEY, []);
      return (Array.isArray(raw) ? raw : [])
        .filter(t => t && t.url)
        .map(t => ({ key: t.key || '', url: t.url }))
        .slice(0, MAX_TABS);
    };
    const saveTabs = (list) => {
      store.set(TAB_KEY, list.slice(0, MAX_TABS));
    };
    const normalizeUrl = (v) => {
      const t = (v || '').trim();
      if (!t) return '';
      if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
      if (/^[\w-]+(\.[\w-]+)+(\/[^\s]*)?$/.test(t)) return `https://${t}`;
      return '';
    };
    const setTabNote = (text, bad) => {
      tabNote.textContent = text || '';
      tabNote.classList.toggle('is-bad', !!bad);
    };
    const keyName = (k) => (k === ' ' ? 'Space' : k);
    const keyMatches = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const siteKeys = () => ({
      search: '/', random: '4', games: '1', library: '2', settings: '3', shortcuts: '?',
      ...(store.get('zenou_keymap', {}) || {}),
    });
    const keyConflict = (key, list, except) => {
      const k = String(key).toLowerCase();
      if (Object.values(siteKeys()).map(v => String(v).toLowerCase()).includes(k)) return 'reserved';
      const hit = list.findIndex((t, idx) => idx !== except && t.key && keyMatches(t.key, key));
      return hit === -1 ? null : hit;
    };
    const launchShortcut = (tab) => { location.href = tab.url; };

    let webCaptureCancel = null;
    const captureKey = (btn, onKey) => {
      if (webCaptureCancel) webCaptureCancel();
      const old = btn.textContent;
      let active = true;
      let handler;
      const cleanup = () => {
        if (!active) return;
        active = false;
        document.removeEventListener('keydown', handler, true);
        btn.classList.remove('is-capturing');
        btn.textContent = old;
        if (webCaptureCancel === cancel) webCaptureCancel = null;
      };
      const cancel = cleanup;
      handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { cleanup(); setTabNote('Change cancelled.', false); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) { setTabNote('Pick one key, without Ctrl, Cmd or Alt.', true); return; }
        if (!e.key || e.key.length !== 1 || e.key === ' ') {
          setTabNote('Pick one printable key. Space is reserved for fullscreen.', true);
          return;
        }
        cleanup();
        onKey(e.key);
      };
      webCaptureCancel = cancel;
      btn.classList.add('is-capturing');
      btn.textContent = 'Press a key...';
      document.addEventListener('keydown', handler, true);
    };

    const makeTabRow = (tab, i) => {
      const row = document.createElement('div');
      row.className = 'tab-bind' + (tab ? ' is-bound' : ' is-draft');

      if (tab) {
        row.innerHTML = `
          <div class="tab-bind-head">
            <span class="tab-bind-index"></span>
            <span class="tab-bind-state">Direct, in this tab</span>
          </div>
          <div class="tab-bind-address"><span>Address</span><code></code></div>
          <div class="tab-bind-keyrow">
            <div class="tab-key-block"><span>Key</span><button type="button" class="tab-key" data-act="key"></button></div>
            <p class="tab-bind-hint">Click the key, then press the key that should open this address.</p>
          </div>
          <div class="tab-bind-actions">
            <button type="button" class="btn btn-solid" data-act="open">Open shortcut</button>
            <button type="button" class="btn btn-ghost" data-act="clear">Remove shortcut</button>
          </div>
          <p class="tab-bind-hint">Pressing this key opens the address at once, even from another page. It never loads in the Web stage.</p>`;
        row.querySelector('.tab-bind-index').textContent = `Shortcut ${i + 1}`;
        row.querySelector('.tab-bind-address code').textContent = tab.url || '';
        const keyBtn = row.querySelector('[data-act="key"]');
        keyBtn.textContent = tab.key ? keyName(tab.key) : 'Set key';
        keyBtn.classList.toggle('is-unset', !tab.key);

        keyBtn.addEventListener('click', () => {
          captureKey(keyBtn, (key) => {
            const list = readTabs();
            const current = list[i];
            if (!current) { setTabNote('That shortcut is no longer here.', true); paintTabs(); return; }
            const clash = keyConflict(key, list, i);
            if (clash === 'reserved') {
              setTabNote('That key is reserved by Zenou itself. Pick another.', true);
              paintTabs();
              return;
            }
            if (typeof clash === 'number') {
              setTabNote(`That key is already used by Shortcut ${clash + 1}.`, true);
              paintTabs();
              return;
            }
            current.key = key;
            saveTabs(list);
            setTabNote(`Shortcut ${i + 1} now opens with ${keyName(key)}.`, false);
            paintTabs();
          });
        });

        row.querySelector('[data-act="open"]').addEventListener('click', () => {
          const list = readTabs();
          const current = list[i];
          if (!current) { setTabNote('That shortcut is no longer here.', true); paintTabs(); return; }
          launchShortcut(current);
        });
        row.querySelector('[data-act="clear"]').addEventListener('click', () => {
          const list = readTabs();
          if (list[i]) list.splice(i, 1);
          saveTabs(list);
          setTabNote(`Shortcut ${i + 1} removed.`, false);
          paintTabs();
        });
        return row;
      }

      let draftKey = '';
      row.innerHTML = `
        <div class="tab-bind-head">
          <span class="tab-bind-index">New shortcut</span>
          <span class="tab-bind-state">Direct, in this tab</span>
        </div>
        <div class="tab-bind-keyrow">
          <div class="tab-key-block"><span>Key</span><button type="button" class="tab-key" data-act="key">Set key</button></div>
          <p class="tab-bind-hint">Click Set key, then press the key that should open your address.</p>
        </div>
        <label class="tab-field tab-field-wide"><span>Full address</span><input type="text" class="tab-bind-url" inputmode="url" autocomplete="off" placeholder="https://example.com"></label>
        <p class="tab-bind-hint">The key is yours alone. Pressing it anywhere in Zenou, outside a text field, leaves this site at once and opens the address. It never loads inside the Web stage.</p>
        <div class="tab-bind-actions">
          <button type="button" class="btn btn-solid" data-act="bind">Bind shortcut</button>
          <button type="button" class="btn btn-ghost" data-act="clear">Cancel</button>
        </div>`;

      const keyBtn = row.querySelector('[data-act="key"]');
      keyBtn.addEventListener('click', () => {
        captureKey(keyBtn, (key) => {
          const list = readTabs();
          const clash = keyConflict(key, list, -1);
          if (clash === 'reserved') {
            setTabNote('That key is reserved by Zenou itself. Pick another.', true);
            return;
          }
          if (typeof clash === 'number') {
            setTabNote(`That key is already used by Shortcut ${clash + 1}.`, true);
            return;
          }
          draftKey = key;
          keyBtn.textContent = keyName(key);
          keyBtn.classList.remove('is-unset');
          setTabNote(`Key ${keyName(key)} ready. Add the address and bind.`, false);
        });
      });

      row.querySelector('[data-act="bind"]').addEventListener('click', () => {
        const urlEl = row.querySelector('.tab-bind-url');
        const url = normalizeUrl(urlEl.value);
        if (!draftKey) { setTabNote('Set a key first, then add the address.', true); keyBtn.focus(); return; }
        if (!url) { setTabNote('That is not a usable address, include a domain, like example.com or https://example.com.', true); urlEl.focus(); return; }
        const list = readTabs();
        if (list.length >= MAX_TABS) { setTabNote(`The limit is ${MAX_TABS} shortcuts. Remove one first.`, true); return; }
        const clash = keyConflict(draftKey, list, -1);
        if (clash === 'reserved') { setTabNote('That key is reserved by Zenou itself. Pick another.', true); keyBtn.focus(); return; }
        if (typeof clash === 'number') { setTabNote(`That key is already used by Shortcut ${clash + 1}.`, true); keyBtn.focus(); return; }
        const dupe = list.findIndex(t => t.url === url);
        if (dupe !== -1) {
          setTabNote(`That URL is already bound to Shortcut ${dupe + 1}. Remove the existing shortcut first.`, true);
          return;
        }
        list.push({ key: draftKey, url });
        saveTabs(list);
        draftOpen = false;
        setTabNote(`Shortcut bound to ${keyName(draftKey)}. Press it anywhere in Zenou to open ${url}.`, false);
        paintTabs();
      });
      row.querySelector('[data-act="clear"]').addEventListener('click', () => {
        draftOpen = false;
        setTabNote('No shortcut added.', false);
        paintTabs();
      });
      return row;
    };

    const paintTabs = () => {
      if (webCaptureCancel) webCaptureCancel();
      const list = readTabs();
      tabWrap.innerHTML = '';
      list.forEach((tab, i) => tabWrap.append(makeTabRow(tab, i)));

      if (!list.length || draftOpen) {
        if (list.length < MAX_TABS) tabWrap.append(makeTabRow(null, -1));
        return;
      }
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn-ghost tab-add';
      add.textContent = '+ Add another shortcut';
      add.addEventListener('click', () => {
        draftOpen = true;
        paintTabs();
        const draft = tabWrap.querySelector('.is-draft');
        draft?.scrollIntoView({ block: 'nearest' });
        draft?.querySelector('.tab-key')?.focus();
      });
      tabWrap.append(add);
    };
    paintTabs();

    /* rebindable global shortcuts */
    const KEYMAP_KEY = 'zenou_keymap';
    const KEY_DEFAULTS = { search: '/', random: '4', games: '1', library: '2', settings: '3', shortcuts: '?' };
    const KEY_ACTIONS = [
      ['random', 'Random game'],
      ['games', 'Games catalogue'],
      ['library', 'My Library'],
      ['settings', 'Settings'],
      ['search', 'Focus search'],
      ['shortcuts', 'Shortcut sheet'],
    ];
    const keyWrap = $('#seKeymap', root);
    const keyNote = $('#seKeyNote', root);
    const readKeys = () => ({ ...KEY_DEFAULTS, ...(store.get(KEYMAP_KEY, {}) || {}) });
    const keyLabel = (action) => (KEY_ACTIONS.find(([a]) => a === action) || [action])[1];
    const setKeyNote = (text, bad) => {
      keyNote.textContent = text || '';
      keyNote.classList.toggle('is-bad', !!bad);
    };
    let capture = null;
    const endCapture = () => {
      if (!capture) return;
      document.removeEventListener('keydown', capture.handler, true);
      capture.btn.textContent = 'Change';
      capture = null;
    };
    const paintKeys = () => {
      const map = readKeys();
      keyWrap.innerHTML = '';
      KEY_ACTIONS.forEach(([action, label]) => {
        const row = document.createElement('div');
        row.className = 'keymap-row';
        row.innerHTML = '<span class="keymap-label"></span><kbd></kbd><button type="button" class="btn btn-ghost" data-act="set">Change</button>';
        row.querySelector('.keymap-label').textContent = label;
        row.querySelector('kbd').textContent = map[action] || '?';
        row.querySelector('button').addEventListener('click', () => {
          endCapture();
          const btn = row.querySelector('button');
          btn.textContent = 'Press a key';
          setKeyNote(`Press a key for ${label.toLowerCase()}. Escape cancels.`, false);
          const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
              endCapture();
              setKeyNote('Change cancelled.', false);
              return;
            }
            if (e.ctrlKey || e.metaKey) {
              setKeyNote('Pick a single key, without Ctrl or Cmd.', true);
              return;
            }
            if (e.key.length !== 1 || [' ', 'Enter', 'Tab'].includes(e.key)) {
              setKeyNote('Pick a printable key other than Space, Enter or Tab.', true);
              return;
            }
            const map = readKeys();
            const clash = KEY_ACTIONS.find(([a]) => a !== action && map[a] === e.key);
            if (clash) {
              endCapture();
              setKeyNote(`That key is already used by ${keyLabel(clash[0])}. Pick another.`, true);
              return;
            }
            map[action] = e.key;
            const saved = {};
            KEY_ACTIONS.forEach(([a]) => { saved[a] = map[a]; });
            store.set(KEYMAP_KEY, saved);
            endCapture();
            paintKeys();
            setKeyNote(`${label} now uses ${e.key}.`, false);
          };
          capture = { handler, btn };
          document.addEventListener('keydown', handler, true);
        });
        keyWrap.append(row);
      });
    };
    paintKeys();
    $('#seKeysReset', root).addEventListener('click', () => {
      endCapture();
      store.del(KEYMAP_KEY);
      paintKeys();
      setKeyNote('Shortcuts reset to the defaults: 4, 1, 2, 3, / and ?.', false);
    });

    /* app + shortcuts */
    if (!window.Zenou) root.querySelectorAll('[data-shared-settings]').forEach(field => { field.hidden = true; });
    $('#seInstall', root).addEventListener('click', () => {
      if (window.Zenou) window.Zenou.install();
    });
    $('#seKeys', root).addEventListener('click', () => {
      close();
      window.Zenou?.shortcutSheet();
    });

    /* segmented preference groups */
    const paintBgSeg = () => paintPrefGroup('bg');
    const paintPrefGroup = key => {
      const current = readPrefs()[key];
      const seg = root.querySelector(`[data-seg="${key}"]`);
      if (!seg) return;
      seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.val === current ? 'true' : 'false'));
    };

    PREF_GROUPS.forEach(([key, label, options]) => {
      const field = document.createElement('div');
      field.className = 'settings-field';
      const span = document.createElement('span');
      span.textContent = label;
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.dataset.seg = key;
      options.forEach(([val, text]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.val = val;
        b.textContent = text;
        b.setAttribute('aria-pressed', readPrefs()[key] === val ? 'true' : 'false');
        b.addEventListener('click', () => {
          if (key === 'bg' && val === 'custom' && !readBgImage()) {
            bgFile.click();
            return;
          }
          setPref(key, val);
          paintPrefGroup(key);
          if (key === 'bg') paintBg();
        });
        seg.append(b);
      });
      field.append(span, seg);
      (key === 'bg' ? backgroundStyle : prefsWrap).append(field);
    });

    /* icon presets */
    const paintIcons = () => {
      iconRow.innerHTML = '';
      for (const [id, name, data] of ICON_PRESETS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-chip';
        b.dataset.id = id;
        b.title = name;
        b.setAttribute('aria-label', `Tab icon: ${name}`);
        b.innerHTML = `<img src="${data}" alt="${name} icon">`;
        b.addEventListener('click', () => {
          applyTabMask(titleInput.value || undefined, id);
          [...iconRow.children].forEach(x => x.classList.remove('active'));
          b.classList.add('active');
        });
        iconRow.append(b);
      }
    };
    paintIcons();

    let customData = null;
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        customData = String(r.result);
        applyTabMask(titleInput.value || undefined, mask.icon, customData);
      };
      r.readAsDataURL(f);
    });

    $('#seSave', root).addEventListener('click', () => {
      const activePreset = [...iconRow.children].find(x => x.classList.contains('active'));
      const next = {
        title: titleInput.value.trim(),
        icon: activePreset ? activePreset.dataset.id : (mask.icon || null),
        iconData: customData,
      };
      if (!next.title && !next.icon && !next.iconData) store.del('zenou_mask');
      else store.set('zenou_mask', next);
      close();
    });

    $('#seReset', root).addEventListener('click', () => {
      store.del('zenou_mask');
      store.del(PREF_KEY);
      try { store.del('zenou_view'); } catch { /* ignore */ }
      try { localStorage.removeItem(BG_KEY); } catch { /* ignore */ }
      const r = document.documentElement;
      ['theme', 'glow', 'radius', 'density', 'bg', 'bgEffects', 'motion'].forEach(k => delete r.dataset[k]);
      r.style.removeProperty('--bg-dim');
      r.style.removeProperty('--custom-bg');
      r.classList.remove('has-custom');
      let link = document.querySelector('link[rel="icon"]');
      if (link) link.href = link.dataset.orig || link.getAttribute('href') || '';
      customData = null;
      titleInput.value = '';
      location.reload();
    });

    $('.settings-close', root).addEventListener('click', close);
    root.addEventListener('click', event => { if (event.target === root) close(); });
    root.addEventListener('close', () => {
      endCapture();
      webCaptureCancel?.();
      root.remove();
      document.getElementById('settingsBtn')?.focus();
    });

    document.body.append(root);
    return root;
  }

  function close() {
    document.querySelector('.settings-overlay[open]')?.close();
  }

  function open() {
    if (document.querySelector('.settings-overlay, #consentGate')) return;
    buildPanel().showModal();
  }

  function mountSidebarToggle(rail, row, settings) {
    const navigation = rail.querySelector('.za-scroll');
    if (!navigation) return;
    navigation.id ||= 'arcade-navigation';
    const account = document.createElement('a');
    account.href = '/account/';
    account.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>Account';
    if (location.pathname.startsWith('/account')) account.setAttribute('aria-current', 'page');
    navigation.querySelector('nav')?.append(account);

    const footer = rail.querySelector('.za-foot');
    const root = document.documentElement;
    const mobile = matchMedia('(max-width: 780px)');
    const layoutKey = () => mobile.matches ? 'zenou_sidebar_mobile' : 'zenou_sidebar_collapsed';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'sidebar-toggle';
    toggle.setAttribute('aria-controls', navigation.id);
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="/assets/ui-icons.svg#sidebar"/></svg>';
    row.insertBefore(toggle, settings);

    function render(collapsed) {
      root.toggleAttribute('data-sidebar-collapsed', collapsed);
      navigation.hidden = collapsed;
      if (footer) footer.hidden = collapsed;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      const label = collapsed ? 'Open sidebar' : 'Close sidebar';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }

    toggle.addEventListener('click', () => {
      const collapsed = !navigation.hidden;
      render(collapsed);
      store.set(layoutKey(), collapsed);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !mobile.matches || navigation.hidden || document.querySelector('dialog[open]')) return;
      render(true);
      store.set(layoutKey(), true);
      toggle.focus();
    });
    document.addEventListener('pointerdown', event => {
      if (!mobile.matches || navigation.hidden || rail.contains(event.target) || row.contains(event.target) || document.querySelector('dialog[open]')) return;
      render(true);
      store.set(layoutKey(), true);
    });

    const restoreSidebar = () => render(store.get(layoutKey(), mobile.matches) === true);
    restoreSidebar();
    mobile.addEventListener('change', restoreSidebar);
    window.addEventListener('pageshow', event => {
      if (event.persisted) restoreSidebar();
    });
  }

  function mountPrimaryNavigation(rail, row, settings) {
    const primary = [
      ['/', 'Discover', 'discover'], ['/?all=1', 'Games', 'gamepad'],
      ['/library/', 'Library', 'library'], ['/web/', 'Web', 'globe'],
    ];
    const nav = document.createElement('nav');
    nav.className = 'masthead-links';
    nav.setAttribute('aria-label', 'Main sections');
    for (const [href, title, symbol] of primary) {
      const link = document.createElement('a');
      link.href = href;
      link.innerHTML = '<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="/assets/ui-icons.svg#' + symbol + '"/></svg>';
      const text = document.createElement('span');
      text.textContent = title;
      link.append(text);
      nav.append(link);
    }
    row.insertBefore(nav, settings);
    const path = value => value.replace(/\/$/, '') || '/';
    const update = () => {
      const route = path(location.pathname);
      const params = new URLSearchParams(location.search);
      const catalog = route === '/' && (params.has('all') || Boolean(params.get('c') || params.get('q')));
      for (const link of nav.children) {
        const games = link.search === '?all=1';
        const active = games ? catalog || ['/play', '/browse', '/math-games'].includes(route)
          : path(link.pathname) === route && !(link.pathname === '/' && catalog);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    };
    update();
    new MutationObserver(update).observe(rail, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  }

  function injectButton() {
    if (document.getElementById('settingsBtn')) return;
    const brand = document.querySelector('.za-rail > .za-brand');
    const bar = document.querySelector('body > header, body > main > header');
    if (!brand && !bar) return;

    const b = document.createElement('button');
    b.className = 'settings-btn';
    b.type = 'button';
    b.id = 'settingsBtn';
    b.title = 'Settings';
    b.setAttribute('aria-label', 'Settings');
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/assets/ui-icons.svg#settings"/></svg>';
    b.addEventListener('click', open);
    if (brand) {
      const embedded = document.documentElement.hasAttribute('data-zenou-desktop');
      const row = document.createElement(embedded ? 'div' : 'header');
      row.className = 'za-brand-row';
      const rail = brand.parentElement;
      brand.replaceWith(row);
      row.append(brand, b);
      if (!embedded) {
        row.classList.add('site-masthead');
        rail.before(row);
        document.documentElement.setAttribute('data-site-masthead', '');
        mountPrimaryNavigation(rail, row, b);
      }
      mountSidebarToggle(rail, row, b);
      const main = document.querySelector('main');
      if (main) {
        main.id ||= 'main';
        main.tabIndex = -1;
        if (!document.querySelector('.skip-link')) {
          const skip = document.createElement('a');
          skip.className = 'skip-link';
          skip.href = '#' + main.id;
          skip.textContent = 'Skip to content';
          rail.before(skip);
        }
      }
    } else {
      bar.append(b);
    }
  }

  import('/js/motion.js').catch(() => {});
  import('/js/site-tools.js?v=blue-shell').catch(() => {});
  import('/js/os-switch.js').catch(() => {});
  import('/js/account-sync.js').catch(() => {});

  /* ---------- direct key shortcuts (Web shortcuts) ---------- */
  const WEB_TAB_KEY = 'zenou_webtabs';
  const SITE_KEY_DEFAULTS = { search: '/', random: '4', games: '1', library: '2', settings: '3', shortcuts: '?' };
  function directShortcutFor(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return null;
    if (!e.key || e.key.length !== 1 || e.key === ' ') return null;
    const target = e.target;
    if (target && target.matches && target.matches('input, textarea, select, [contenteditable]')) return null;
    if (document.querySelector('dialog[open], .sheet-overlay, .web-pin-overlay')) return null;
    let list;
    try { list = JSON.parse(localStorage.getItem(WEB_TAB_KEY) || '[]'); } catch { return null; }
    if (!Array.isArray(list)) return null;
    let savedKeys = {};
    try { savedKeys = JSON.parse(localStorage.getItem('zenou_keymap') || '{}') || {}; } catch { /* ignore */ }
    const reserved = Object.values({ ...SITE_KEY_DEFAULTS, ...savedKeys }).map(v => String(v).toLowerCase());
    if (reserved.includes(e.key.toLowerCase())) return null;
    return list.find(t => t && t.url && t.key && String(t.key).toLowerCase() === e.key.toLowerCase()) || null;
  }
  document.addEventListener('keydown', (e) => {
    const hit = directShortcutFor(e);
    if (!hit) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = hit.url;
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.zenouSettingsBoot && window.zenouSettingsBoot());
  else if (window.zenouSettingsBoot) window.zenouSettingsBoot();
})();
