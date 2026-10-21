// A viewing tool only: it never reads or writes the project library.
export function mountInteractiveDemo(doc) {
  const dialog = doc.getElementById('interactiveDemo');
  const video = doc.getElementById('interactiveDemoVideo');
  const message = doc.getElementById('demoPlaybackStatus');
  const form = doc.getElementById('expertCommandForm');
  const input = doc.getElementById('expertCommand');
  const status = doc.getElementById('expertCommandStatus');
  const en = () => doc.documentElement.lang === 'en';

  function open() {
    message.textContent = '';
    if (!dialog.open) dialog.showModal();
    // The button and form submission are direct user gestures on mobile too.
    try {
      Promise.resolve(video.play()).catch(() => {
        if (dialog.open) message.textContent = en()
          ? 'Press Play to start the video.'
          : 'Pulsa Reproducir para iniciar el vídeo.';
      });
    } catch {
      message.textContent = en() ? 'Press Play to start the video.' : 'Pulsa Reproducir para iniciar el vídeo.';
    }
  }

  for (const button of doc.querySelectorAll('[data-demo-open]')) button.addEventListener('click', open);
  doc.getElementById('closeInteractiveDemo').addEventListener('click', () => dialog.close());
  // Covers the close button and Escape/native dialog dismissal.
  dialog.addEventListener('close', () => video.pause());
  video.addEventListener('error', () => {
    message.textContent = en()
      ? 'The video could not load. Try the “Open video” link below.'
      : 'No se pudo cargar el vídeo. Prueba el enlace «Abrir vídeo» de abajo.';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (command === '/demo interactivo' || command === '/demo interactive') {
      status.textContent = en() ? 'Opening the interactive creator demo.' : 'Abriendo la demo del Creador de interactivos.';
      open();
    } else {
      status.textContent = en() ? 'Unknown command. Use /demo interactivo.' : 'Comando no reconocido. Usa /demo interactivo.';
    }
  });
  // Shareable viewing link, including the entry screen; do not autoplay on load.
  if (new URLSearchParams(doc.location.search).get('demo') === 'interactivo') dialog.showModal();
}

if (typeof document !== 'undefined') mountInteractiveDemo(document);
