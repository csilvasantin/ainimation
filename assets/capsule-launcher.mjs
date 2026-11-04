export function capsuleEditorPath(value) {
  let id = value.trim(), ref = '';
  if (/^https?:\/\//i.test(id)) {
    let url;
    try { url = new URL(id); } catch { return null; }
    id = url.searchParams.get('admiraStockId') || url.searchParams.get('highlight') || '';
    ref = url.searchParams.get('admiraCapsuleRef') || '';
  }
  if (/^[a-zA-Z0-9_-]{1,160}$/.test(id) && !/^\d+$/.test(id)) {
    return '/studio.html?' + new URLSearchParams({mode:'capsula', admiraStockId:id});
  }
  if (/^capsula-url:[a-f0-9]{16}$/.test(ref)) {
    return '/studio.html?' + new URLSearchParams({admiraCapsuleRef:ref});
  }
  return null;
}

if (typeof document !== 'undefined') {
  const form = document.getElementById('capsuleOpen');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const target = capsuleEditorPath(document.getElementById('capsuleLink').value);
    const error = document.getElementById('capsuleError');
    if (!target) {
      error.hidden = false;
      error.textContent = document.documentElement.lang === 'es'
        ? 'Pega el enlace completo de la cápsula o su ID de archivo. El número visible del Stock no es su ID.'
        : 'Paste the full capsule link or asset ID. The visible Stock number is not its ID.';
      return;
    }
    const url = new URL(target, location.origin);
    url.searchParams.set('lang', document.documentElement.lang === 'es' ? 'es' : 'en');
    location.assign(url.href);
  });
}
