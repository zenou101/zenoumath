let entries = [];

const get = id => document.getElementById(id);
const search = get('directorySearch');
const category = get('directoryCategory');
const layout = get('directoryLayout');
const onlySaved = get('onlySaved');
const grid = get('directoryEntries');
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
const stored = read('zenou_directory_favourites', []);
const favourites = new Set(Array.isArray(stored) ? stored : []);
layout.value = read('zenou_directory_layout','grid') === 'list' ? 'list' : 'grid';

function render() {
  grid.dataset.layout = layout.value;
  grid.replaceChildren();
  for (const {name,url,group,description} of entries) {
    if (category.value && category.value !== group || onlySaved.checked && !favourites.has(url)) continue;
    if (![name,group,description].join(' ').toLowerCase().includes(search.value.trim().toLowerCase())) continue;
    const card = document.createElement('article');
    const link = document.createElement('a');
    link.href = url;
    link.textContent = name;
    if (url.startsWith('https:')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    const meta = document.createElement('small');
    meta.textContent = group;
    const note = document.createElement('p');
    note.textContent = description;
    const button = document.createElement('button');
    button.type = 'button';
    function paint() {
      button.setAttribute('aria-label','Favourite '+name);
      button.setAttribute('aria-pressed',String(favourites.has(url)));
      button.textContent = favourites.has(url) ? 'Saved' : 'Save';
    }
    button.onclick = () => {
      if (favourites.has(url)) favourites.delete(url); else favourites.add(url);
      save('zenou_directory_favourites',[...favourites]);
      if (onlySaved.checked) { render(); onlySaved.focus(); } else paint();
    };
    paint();
    card.append(meta,link,note,button);
    grid.append(card);
  }
  get('directoryCount').textContent = grid.childElementCount ? grid.childElementCount+' results' : 'No matching apps or websites.';
}
search.oninput = category.onchange = onlySaved.onchange = render;
layout.onchange = () => { save('zenou_directory_layout',layout.value); render(); };
try {
  const response = await fetch('/catalog/directory.json');
  if (!response.ok) throw new Error();
  entries = await response.json();
  for (const group of new Set(entries.map(entry => entry.group))) category.add(new Option(group,group));
  render();
} catch { get('directoryCount').textContent = 'The directory could not load. Refresh to retry.'; }
