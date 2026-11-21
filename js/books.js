'use strict';

(() => {
  const host = document.getElementById('readerHost');
  const fullscreen = document.getElementById('readerFull');
  const status = document.getElementById('readerStatus');
  document.getElementById('readerReload').addEventListener('click', () => {
    const frame = document.getElementById('booksFrame');
    frame.replaceWith(frame.cloneNode(false));
  });
  fullscreen.hidden = !host.requestFullscreen;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch {
      status.textContent = 'Fullscreen is unavailable. You can keep reading in the page.';
    }
  });
})();
