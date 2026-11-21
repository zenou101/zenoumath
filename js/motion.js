const preference = matchMedia('(prefers-reduced-motion: reduce)');
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('motion-visible');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.06 });
function reveal(root) {
  if (preference.matches) return;
  const cards = root.querySelectorAll('.card, .ai-card, .stat-card, .play-side-card');
  cards.forEach((card, index) => {
    if (card.dataset.motionReady) return;
    card.dataset.motionReady = 'true';
    card.style.setProperty('--reveal-delay', `${Math.min(index % 8, 7) * 35}ms`);
    observer.observe(card);
  });
}
reveal(document);
let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; reveal(document); });
}).observe(document.body, { childList: true, subtree: true });
preference.addEventListener('change', () => {
  if (preference.matches) {
    observer.disconnect();
    document.querySelectorAll('[data-motion-ready]').forEach(el => { el.classList.add('motion-visible'); });
  } else reveal(document);
});
