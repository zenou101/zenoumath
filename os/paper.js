import { artwork, button, el, iconButton, prefix, read, write } from './shared.js';
import { addWallpaper, appearance, removeWallpaper, setAppearance, uploadedWallpapers, wallpapers } from './appearance.js?v=blue-shell';

export async function mount(root, { notify, signal }) {
  const header = el('div', 'utility-head');
  header.append(el('h2', '', 'Wallpapers'));
  const upload = el('input');
  upload.type = 'file';
  upload.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm';
  upload.hidden = true;
  header.append(button('Upload wallpaper', () => upload.click(), 'os-button primary'), upload);
  const layout = el('div', 'paper-layout');
  const collection = el('div', 'paper-collection');
  const filters = el('div', 'button-row');
  const search = el('input');
  search.placeholder = 'Search wallpapers…';
  search.setAttribute('aria-label', 'Search wallpapers');
  search.type = 'search';
  const filter = el('select');
  filter.setAttribute('aria-label', 'Wallpaper category');
  filter.append(...['All wallpapers', 'Favorites', 'Recently used', 'Uploaded', ...new Set(wallpapers.map(item => item.category))].map(name => new Option(name)));
  filters.append(search, filter);
  const gallery = el('div', 'paper-gallery');
  collection.append(filters, gallery);
  const preview = el('div', 'paper-preview');
  layout.append(collection, preview);
  root.classList.add('utility', 'paper');
  root.replaceChildren(header, layout);
  let uploads = await uploadedWallpapers().catch(() => []);
  if (signal.aborted) return;
  let chosen = appearance().wallpaper;
  let urls = [];
  const favKey = prefix + 'paperFavorites';
  const recentKey = prefix + 'paperRecent';
  const items = () => [...wallpapers, ...uploads];
  function showImage(item, className, loadVideo = false) {
    const holder = el('div', className);
    if (item?.file?.type.startsWith('video/')) {
      if (loadVideo) {
        const player = el('video');
        player.controls = true;
        player.preload = 'metadata';
        player.src = URL.createObjectURL(item.file);
        urls.push(player.src);
        holder.append(player);
      } else holder.textContent = 'Video';
    } else if (item) {
      const src = item.file ? URL.createObjectURL(item.file) : item.url;
      if (item.file) urls.push(src);
      holder.append(artwork(src));
    }
    return holder;
  }
  function apply(id) {
    chosen = id;
    if (!setAppearance({ wallpaper: id })) { notify('Wallpaper preferences could not be saved.'); return; }
    if (id !== 'theme') write(recentKey, [id, ...read(recentKey, []).filter(value => value !== id)].slice(0, 20));
    notify('Wallpaper applied.');
    render();
  }
  function render() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    const favorite = new Set(read(favKey, []));
    const recent = read(recentKey, []);
    let matching = items().filter(item => item.name.toLowerCase().includes(search.value.trim().toLowerCase()));
    switch (filter.value) {
      case 'All wallpapers': break;
      case 'Favorites': matching = matching.filter(item => favorite.has(item.id)); break;
      case 'Recently used': matching = recent.map(id => matching.find(item => item.id === id)).filter(Boolean); break;
      default: matching = matching.filter(item => item.category === filter.value);
    }
    gallery.replaceChildren(...matching.map(item => {
      const entry = el('article', 'paper-item');
      const select = button('', () => { chosen = item.id; render(); }, 'paper-select');
      select.setAttribute('aria-pressed', String(chosen === item.id));
      select.append(showImage(item, 'paper-thumb'), el('strong', '', item.name));
      const star = iconButton(favorite.has(item.id) ? 'Remove from wallpaper favorites' : 'Favorite wallpaper', 'heart', () => {
        if (favorite.has(item.id)) favorite.delete(item.id); else favorite.add(item.id);
        write(favKey, [...favorite]); render();
      });
      star.dataset.favorite = item.id;
      star.setAttribute('aria-pressed', String(favorite.has(item.id)));
      entry.append(select, star);
      return entry;
    }));
    if (!matching.length) gallery.append(el('p', 'app-message', 'No wallpapers in this view.'));
    const active = items().find(item => item.id === chosen);
    const current = active || wallpapers.find(item => item.id === appearance().theme);
    preview.replaceChildren(showImage(current, 'paper-large', Boolean(active?.file?.type.startsWith('video/'))), el('h3', '', current?.name || 'Theme wallpaper'));
    preview.append(button('Apply wallpaper', () => apply(chosen), 'os-button primary'), button('Use theme wallpaper', () => apply('theme')));
    if (active?.file) preview.append(button('Delete upload', async () => {
      if (!confirm(`Delete ${active.name} from this browser?`)) return;
      try { await removeWallpaper(active.id); uploads = await uploadedWallpapers(); chosen = appearance().wallpaper; render(); }
      catch { notify('The wallpaper could not be deleted.'); }
    }));
    for (const [caption, property, values] of [['Fit', 'fit', ['cover','contain']], ['Position', 'position', ['center','top','bottom','left','right']]]) {
      const label = el('label', 'os-field', caption);
      const select = el('select');
      select.append(...values.map(value => new Option(value)));
      select.value = appearance()[property];
      select.onchange = () => setAppearance({ [property]: select.value });
      label.append(select);
      preview.append(label);
    }
  }
  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    if (!file) return;
    try { chosen = await addWallpaper(file); uploads = await uploadedWallpapers(); render(); }
    catch (error) { notify(error.message || 'Could not save this wallpaper.'); }
    upload.value = '';
  });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  signal.addEventListener('abort', () => urls.forEach(URL.revokeObjectURL), { once: true });
  render();
}
