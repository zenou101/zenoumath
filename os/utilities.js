import { button, el, iconButton, link, prefix, read, write } from './shared.js';
import { appearance, resetAppearance, setAppearance, uploadedWallpapers } from './appearance.js?v=blue-shell';

const noteKey = prefix + 'notes';
const feedbackKey = prefix + 'feedback';
const themesKey = prefix + 'customThemes';
function heading(root, text) { root.append(el('h2', 'utility-title', text)); }
function field(label, input) { const node = el('label', 'os-field', label); node.append(input); return node; }
function download(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const anchor = el('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function customThemes(notify) {
  const section = el('section', 'custom-themes');
  const form = el('form', 'button-row');
  const name = el('input');
  name.maxLength = 32;
  name.required = true;
  name.placeholder = 'Theme name';
  name.setAttribute('aria-label', 'Custom theme name');
  const save = el('button', 'os-button', 'Save current theme');
  save.type = 'submit';
  form.append(name, save);
  const list = el('div', 'button-row');
  let themes = read(themesKey, []);
  function render() {
    list.replaceChildren(...themes.map(item => {
      const row = el('div', 'custom-theme');
      row.append(button(item.name, () => {
        if (setAppearance(item.prefs)) notify(`${item.name} applied.`);
      }), iconButton(`Delete ${item.name} theme`, 'close', () => {
        if (confirm(`Delete the ${item.name} theme?`)) store(themes.filter(theme => theme !== item));
      }));
      return row;
    }));
  }
  function store(next) {
    if (!write(themesKey, next)) { notify('Custom themes could not be saved.'); return false; }
    themes = next;
    render();
    return true;
  }
  form.onsubmit = event => {
    event.preventDefault();
    const label = name.value.trim();
    if (!label) return;
    if (themes.some(item => item.name.toLowerCase() === label.toLowerCase())) { notify('Choose a new name for this theme.'); return; }
    if (themes.length >= 12) { notify('Delete a theme before saving another.'); return; }
    if (store([{ name: label, prefs: appearance() }, ...themes])) {
      name.value = '';
      notify(`${label} saved.`);
    }
  };
  section.append(el('h3', 'utility-subtitle', 'Custom themes'), form, list);
  render();
  return section;
}

function settings(root, { open, notify, signal }) {
  heading(root, 'Desktop settings');
  const fields = el('div', 'settings-fields');
  const prefs = appearance();
  const theme = el('select');
  theme.append(new Option('Christmas', 'christmas'), new Option('Original', 'original'));
  theme.value = prefs.theme;
  theme.onchange = () => { setAppearance({ theme: theme.value, wallpaper: 'theme' }); notify(`${theme.selectedOptions[0].text} theme applied.`); };
  const accent = el('input'); accent.type = 'color'; accent.value = prefs.accent || (prefs.theme === 'christmas' ? '#b9edce' : '#b8caff');
  accent.oninput = () => setAppearance({ accent: accent.value });
  const toggles = [['Desktop animations and videos', 'motion'], ['Snow effect', 'snow'], ['App sounds', 'sound']].map(([label, key]) => {
    const input = el('input'); input.type = 'checkbox'; input.checked = Boolean(prefs[key]);
    input.onchange = () => setAppearance({ [key]: input.checked });
    input.dataset.osSetting = key;
    return field(label, input);
  });
  fields.append(field('Theme', theme), field('Accent color', accent), ...toggles);
  const actions = el('div', 'button-row');
  actions.append(button('Use theme accent', () => setAppearance({ accent: '' })), button('Open ZenouPaper', () => open('paper')), button('Reset appearance', () => {
    resetAppearance(); notify('Desktop appearance reset.');
  }));
  window.addEventListener('zenouos:appearance', () => {
    const value = appearance();
    theme.value = value.theme; accent.value = value.accent || (value.theme === 'christmas' ? '#b9edce' : '#b8caff');
    fields.querySelectorAll('[data-os-setting]').forEach(input => { input.checked = Boolean(value[input.dataset.osSetting]); });
  }, { signal });
  root.append(fields, el('p', 'muted', 'Turn off animations and videos for lower power use.'), actions, customThemes(notify), el('h3', 'utility-subtitle', 'Privacy & storage'), el('p', 'muted', 'Desktop preferences, notes, wallpaper uploads and feedback drafts are stored in this browser. Game favorites and recently played games use your existing library.'),
    link('Privacy policy', '/legal/privacy/', true), link('Manage account', '/account/', true), link('Return to Classic', '/?interface=classic'));
}

function notes(root, { notify }) {
  heading(root, 'Notes');
  const layout = el('div', 'notes-layout');
  const browse = el('div', 'notes-list');
  const query = el('input'); query.type = 'search'; query.placeholder = 'Find a note…'; query.setAttribute('aria-label', 'Find a note');
  const list = el('div');
  const editor = el('div', 'notes-editor');
  let data = read(noteKey, []);
  let selected = data[0]?.id;
  function save() { if (!write(noteKey, data)) notify('There is not enough browser storage for this note.'); }
  function renderList() {
    const needle = query.value.trim().toLowerCase();
    const matches = data.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(needle));
    list.replaceChildren(...matches.map(note => {
      const node = button(note.title || 'Untitled note', () => { selected = note.id; render(); });
      node.setAttribute('aria-pressed', String(note.id === selected));
      return node;
    }));
    if (!matches.length) list.append(el('p', 'muted', 'No notes in this view.'));
  }
  function render() {
    renderList();
    const note = data.find(item => item.id === selected);
    if (!note) { editor.replaceChildren(el('p', 'muted', 'Create a note to get started.')); return; }
    const title = el('input'); title.value = note.title; title.maxLength = 90;
    const body = el('textarea'); body.value = note.body; body.maxLength = 20000;
    title.oninput = () => { note.title = title.value; save(); renderList(); };
    body.oninput = () => { note.body = body.value; save(); renderList(); };
    editor.replaceChildren(field('Title', title), field('Note', body), button('Delete note', () => {
      if (!confirm('Delete this note from this browser?')) return;
      data = data.filter(item => item.id !== note.id); selected = data[0]?.id; save(); render();
    }));
  }
  const add = button('New note', () => {
    const note = { id: crypto.randomUUID(), title: '', body: '' };
    data.unshift(note); selected = note.id; query.value = ''; save(); render(); editor.querySelector('input')?.focus();
  }, 'os-button primary');
  query.oninput = renderList;
  browse.append(add, query, list);
  layout.append(browse, editor);
  root.append(layout);
  render();
}

async function files(root, { open, signal }) {
  heading(root, 'Files');
  const listing = el('div', 'file-list');
  root.append(el('p', 'muted', 'Notes and wallpaper uploads stored in this browser.'), listing);
  const notes = read(noteKey, []);
  const uploads = await uploadedWallpapers().catch(() => []);
  if (signal.aborted) return;
  for (const note of notes) {
    const row = el('div', 'file-row');
    const name = note.title || 'Untitled note';
    row.append(el('strong', '', name), button('Download note', () => download(`${name}.txt`, note.body)));
    listing.append(row);
  }
  for (const item of uploads) {
    const row = el('div', 'file-row');
    row.append(el('strong', '', item.name), button('Download wallpaper', () => download(item.name, item.file)));
    listing.append(row);
  }
  if (!notes.length && !uploads.length) listing.append(el('p', 'app-message', 'Your saved files will appear here.'));
  const actions = el('div', 'button-row');
  actions.append(button('Open ZNotes', () => open('notes')), button('Open ZenouPaper', () => open('paper')));
  root.append(actions);
}

async function calculator(root) {
  const { calculate } = await import('/js/calculator.js');
  heading(root, 'Calculator');
  const form = el('form', 'calculator-form');
  const input = el('input'); input.setAttribute('aria-label', 'Math expression'); input.placeholder = '0'; input.maxLength = 200; input.inputMode = 'decimal';
  const result = el('output'); result.setAttribute('role', 'status');
  function solve() {
    try { input.value = String(calculate(input.value)); result.textContent = input.value; }
    catch (error) { result.textContent = error.message; }
  }
  form.addEventListener('submit', event => { event.preventDefault(); solve(); });
  const keys = el('div', 'calculator-keys');
  for (const key of ['AC','(',')','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','=']) {
    keys.append(button(key, () => {
      if (key === '=') solve();
      else if (key === 'AC') { input.value = ''; result.textContent = ''; }
      else if (key === '⌫') input.value = input.value.slice(0, -1);
      else input.value = (input.value + key).slice(0, 200);
    }, key === '=' ? 'os-button primary' : 'os-button'));
  }
  form.append(input, result, keys);
  root.append(form);
}

function about(root, { notify }) {
  heading(root, 'ZenouOS Beta');
  root.append(el('p', 'muted', 'Version 0.1.0 · Developed by Zenou'), el('h3', 'utility-subtitle', 'Release notes'),
    el('p', '', 'The first beta includes the desktop, Zteam, ZBrowse, ZenouPaper and the built-in utilities.'),
    el('h3', 'utility-subtitle', 'Known limitations'),
    el('p', '', 'Some external games and sites restrict embedded playback. Recently added uses the latest recorded catalog import. Desktop uploads and notes are local to this browser.'),
    link('Developer on GitHub', 'https://github.com/zenou101', true), el('h3', 'utility-subtitle', 'Feedback draft'));
  const comment = el('textarea'); comment.maxLength = 5000; comment.value = read(feedbackKey, '');
  const caption = field('What happened or what would you change?', comment);
  const actions = el('div', 'button-row');
  actions.append(button('Save draft', () => notify(write(feedbackKey, comment.value) ? 'Feedback draft saved in this browser.' : 'The feedback draft could not be saved.')),
    button('Download draft', () => download('zenouos-feedback.txt', comment.value)));
  root.append(caption, actions);
}

const handlers = { settings, notes, files, calculator, about };
export function mount(root, context) {
  root.classList.add('utility', `utility-${context.app.id}`);
  root.replaceChildren();
  return handlers[context.app.id](root, context);
}
