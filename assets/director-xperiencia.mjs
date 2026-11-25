// Ventana «Xperiencia» de Admira Director (DeepAgent Neo, 25-nov-2026): edita desde aquí una Xperiencia viva
// de otra casa (hoy «Vuelta al 95», admira.live/windows95). Se abre en una ventana propia —la cookie de
// admira.live es SameSite=Lax y en un iframe no viajaría—, nos manda su esquema y su ajuste, y aquí se pinta
// el formulario. Aplicar reinicia el 95 con el borrador; Guardar lo persiste en admira.live con la sesión de
// la persona (en esa ventana). Lógica pura y probada: xperiencia-ajuste.mjs.
import { XPERIENCIAS, xperiencia, urlVentana, aceptaMensaje, tipoMensaje, texto, campos, valorCampo, normalizar, diferencia, hayCambios, resumenEstado, PREFIJO, leerRuta } from './xperiencia-ajuste.mjs?v=1';

export function mountXperienciaWindow({ doc = document, win = window, abrir } = {}) {
  const root = doc.querySelector('[data-window="xperiencia"] .xperiencia-editor');
  if (!root) return null;
  const lang = () => (doc.documentElement.lang === 'en' ? 'en' : 'es');
  const t = (es, en) => (lang() === 'en' ? en : es);
  const el = (tag, cls, txt) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const boton = (label, fn, cls = 'button light') => { const b = el('button', cls, label); b.type = 'button'; b.onclick = () => { try { fn(); } catch (e) { decir(String(e?.message || e), true); } }; return b; };

  let xp = xperiencia(XPERIENCIAS[0].id);
  let ventana = null;
  let estado = null;
  let vigilante = null;
  const lectores = new Map(); // ruta → () => valor normalizado

  root.replaceChildren();
  const cabecera = el('div', 'xp-head');
  const selector = el('select');
  selector.setAttribute('aria-label', t('Xperiencia', 'Xperience'));
  for (const x of XPERIENCIAS) { const o = el('option', null, texto(x.nombre, lang())); o.value = x.id; selector.append(o); }
  selector.onchange = () => { xp = xperiencia(selector.value); cerrarVentana(); enlace.href = urlVentana(xp, win.location.origin); enlace.target = 'admira-xperiencia-' + xp.id; };
  const btnAbrir = boton(t('Abrir Xperiencia', 'Open Xperience'), abrirVentana, 'button');
  // Enlace de respaldo: un clic en un enlace con target nunca lo bloquea el navegador; rel=opener deja
  // que la ventana nueva nos hable por window.opener y el Director la adopta con su «hola».
  const enlace = el('a', 'xp-link', t('o ábrela en una pestaña', 'or open it in a tab'));
  enlace.target = 'admira-xperiencia-' + xp.id;
  enlace.rel = 'opener';
  enlace.href = urlVentana(xp, win.location.origin);
  enlace.onclick = () => { decir(t('Pestaña abierta. Entra en admira.live si te lo pide; el ajuste llega solo.', 'Tab open. Sign in to admira.live if asked; the settings arrive by themselves.')); };
  cabecera.append(selector, btnAbrir, enlace);
  const aviso = el('p', 'xp-status', t('Abre la Xperiencia: se enseña en su ventana y aquí aparece su ajuste.', 'Open the Xperience: it shows in its own window and its settings appear here.'));
  aviso.setAttribute('role', 'status');
  const form = el('form', 'xp-form');
  form.addEventListener('submit', (e) => e.preventDefault());
  form.hidden = true;
  const pie = el('div', 'xp-foot');
  const btnAplicar = boton(t('Aplicar (reinicia el 95)', 'Apply (reboots the 95)'), () => enviar('aplicar', { ajuste: recoger() }), 'button');
  const btnGuardar = boton(t('Guardar en admira.live', 'Save to admira.live'), () => enviar('guardar', { ajuste: recoger() }), 'button');
  const btnDeshacer = boton(t('Deshacer', 'Undo'), () => { if (estado) pintar(); });
  const btnFabrica = boton(t('Valores de fábrica', 'Factory values'), () => { if (win.confirm(t('¿Borrar el ajuste guardado y volver a los valores de fábrica?', 'Delete the saved settings and return to factory values?'))) enviar('restaurar', {}); });
  pie.append(btnAplicar, btnGuardar, btnDeshacer, btnFabrica);
  pie.hidden = true;
  const nota = el('p', 'xp-note', t('Lo que guardas vive en admira.live (/api/win95/ajuste) con tu sesión de Google de esa ventana. El Director no guarda credenciales.', 'What you save lives at admira.live (/api/win95/ajuste) with your Google session in that window. Director stores no credentials.'));
  root.append(cabecera, aviso, form, pie, nota);

  function decir(msg, error = false) { aviso.textContent = msg; aviso.classList.toggle('is-error', !!error); }

  function abrirVentana() {
    if (ventana && !ventana.closed) { try { ventana.focus(); } catch {} enviar('estado?', {}); return; }
    const url = urlVentana(xp, win.location.origin);
    ventana = (abrir || ((u, n, f) => win.open(u, n, f)))(url, 'admira-xperiencia-' + xp.id, 'popup=yes,width=1040,height=820');
    if (!ventana) { decir(t('El navegador bloqueó la ventana: usa el enlace «o ábrela en una pestaña».', 'The browser blocked the window: use the “or open it in a tab” link.'), true); return; }
    decir(t('Ventana abierta. Entra en admira.live si te lo pide; el ajuste llega solo.', 'Window open. Sign in to admira.live if asked; the settings arrive by themselves.'));
    vigilar();
  }
  function vigilar() {
    win.clearInterval(vigilante);
    vigilante = win.setInterval(() => {
      if (ventana && ventana.closed) { win.clearInterval(vigilante); ventana = null; decir(t('Ventana cerrada. Vuelve a abrir la Xperiencia para seguir editando.', 'Window closed. Open the Xperience again to keep editing.')); form.hidden = true; pie.hidden = true; }
    }, 1000);
  }
  function cerrarVentana() { win.clearInterval(vigilante); if (ventana && !ventana.closed) { try { ventana.close(); } catch {} } ventana = null; estado = null; form.hidden = true; pie.hidden = true; }

  function enviar(tipo, extra) {
    if (!ventana || ventana.closed) { decir(t('Abre antes la Xperiencia.', 'Open the Xperience first.'), true); return; }
    if (tipo === 'aplicar') decir(t('Aplicando: el 95 se reinicia con tus cambios…', 'Applying: the 95 reboots with your changes…'));
    if (tipo === 'guardar') decir(t('Guardando en admira.live…', 'Saving to admira.live…'));
    if (tipo === 'restaurar') decir(t('Restaurando los valores de fábrica…', 'Restoring factory values…'));
    ventana.postMessage({ type: PREFIJO + tipo, id: xp.id, ...extra }, xp.origen);
  }

  win.addEventListener('message', (ev) => {
    if (!aceptaMensaje(ev, { ventana, origen: xp.origen, id: xp.id })) return;
    const tipo = tipoMensaje(ev.data);
    if (tipo === 'hola') { if (!ventana || ventana.closed) { ventana = ev.source; vigilar(); } enviar('estado?', {}); return; }
    if (tipo === 'estado') { estado = ev.data; pintar(); decir(resumenEstado(estado, lang())); return; }
    if (tipo === 'aplicando') { decir(t('El 95 se está reiniciando…', 'The 95 is rebooting…')); return; }
    if (tipo === 'guardado') {
      if (ev.data.ok) {
        const n = (ev.data.errores || []).length;
        decir(ev.data.restaurado ? t('Valores de fábrica restaurados.', 'Factory values restored.') : t('Guardado en admira.live', 'Saved to admira.live') + (ev.data.by ? ' · ' + ev.data.by : '') + (n ? t(' · ' + n + ' campo(s) descartado(s) por inválidos', ' · ' + n + ' field(s) dropped as invalid') : ''), n > 0);
      } else decir(t('No se pudo guardar: ', 'Could not save: ') + (ev.data.error || ''), true);
    }
  });

  function campoEntrada(c, valor, nombre) {
    let input;
    if (c.tipo === 'bool') { input = el('input'); input.type = 'checkbox'; input.checked = !!valor; }
    else if (c.tipo === 'select') { input = el('select'); for (const o of c.opciones || []) { const op = el('option', null, o); op.value = o; input.append(op); } input.value = valor ?? ''; }
    else if (c.tipo === 'number') { input = el('input'); input.type = 'number'; if (c.min != null) input.min = c.min; if (c.max != null) input.max = c.max; input.step = c.entero ? '1' : 'any'; input.value = valor ?? ''; }
    else if (c.tipo === 'tags') { input = el('input'); input.type = 'text'; input.value = (Array.isArray(valor) ? valor : []).join(', '); input.placeholder = t('separadas por comas', 'comma-separated'); }
    else { input = el('input'); input.type = 'text'; if (c.max) input.maxLength = c.max; input.value = valor ?? ''; if (c.tipo === 'image') input.placeholder = c.audio ? 'pista.mp3' : c.video ? 'video.mp4' : 'imagen.png'; }
    input.name = nombre;
    input.setAttribute('data-ruta', nombre);
    return input;
  }
  const leerInput = (c, input) => normalizar(c, c.tipo === 'bool' ? input.checked : input.value);

  function pintar() {
    const esquema = estado?.esquema;
    lectores.clear();
    form.replaceChildren();
    if (!esquema) { form.hidden = true; pie.hidden = true; decir(t('La Xperiencia no trajo esquema: ¿has entrado en admira.live en su ventana?', 'The Xperience sent no schema: are you signed in to admira.live in its window?'), true); return; }
    const ajuste = estado.ajuste || {};
    const fabrica = estado.fabrica || {};
    for (const g of esquema.grupos || []) {
      const det = el('details', 'xp-group');
      det.open = true;
      det.append(el('summary', null, texto(g.titulo, lang())));
      for (const c of g.campos || []) {
        const valor = valorCampo(c, ajuste, fabrica);
        if (c.tipo === 'list') {
          const fs = el('fieldset', 'xp-list');
          fs.append(el('legend', null, texto(c.etiqueta, lang())));
          const filas = el('div', 'xp-rows');
          const filaNueva = (datos) => {
            const fila = el('div', 'xp-row');
            const entradas = (c.item || []).map((ci) => { const lab = el('label', null, texto(ci.etiqueta, lang())); const inp = campoEntrada(ci, datos?.[ci.ruta] ?? valorCampo(ci, {}, {}), c.ruta + '.' + ci.ruta); lab.append(inp); fila.append(lab); return [ci, inp]; });
            fila._leer = () => Object.fromEntries(entradas.map(([ci, inp]) => [ci.ruta, leerInput(ci, inp)]));
            fila.append(boton('×', () => fila.remove(), 'button light xp-remove'));
            filas.append(fila);
          };
          for (const f of Array.isArray(valor) ? valor : []) filaNueva(f);
          const mas = boton(t('+ Añadir', '+ Add'), () => { if ((c.max ?? 99) > filas.children.length) filaNueva(null); }, 'button light xp-add');
          fs.append(filas, mas);
          lectores.set(c.ruta, () => [...filas.children].map((f) => f._leer()));
          det.append(fs);
        } else {
          const lab = el('label', c.tipo === 'bool' ? 'xp-switch' : null);
          const inp = campoEntrada(c, valor, c.ruta);
          if (c.tipo === 'bool') lab.append(inp, doc.createTextNode(' ' + texto(c.etiqueta, lang())));
          else lab.append(doc.createTextNode(texto(c.etiqueta, lang())), inp);
          if (c.ayuda) lab.append(el('small', null, texto(c.ayuda, lang())));
          lectores.set(c.ruta, () => leerInput(c, inp));
          det.append(lab);
        }
      }
      form.append(det);
    }
    form.hidden = false;
    pie.hidden = false;
  }

  /** El ajuste que viaja: sólo lo que difiere de fábrica. */
  function recoger() {
    const valores = {};
    for (const c of campos(estado?.esquema)) { const leer = lectores.get(c.ruta); if (leer) { const partes = c.ruta.split('.'); let o = valores; for (const k of partes.slice(0, -1)) o = o[k] ||= {}; o[partes.at(-1)] = leer(); } }
    return diferencia(valores, estado?.fabrica || {}, estado?.esquema);
  }

  return { abrir: abrirVentana, cerrar: cerrarVentana, recoger, estado: () => estado, ventana: () => ventana, pendiente: () => !!estado && hayCambios(recoger(), estado.ajuste && Object.keys(estado.ajuste).length ? diferencia(estado.ajuste, estado.fabrica || {}, estado.esquema) : {}), leer: (ruta) => leerRuta(recoger(), ruta) };
}

if (typeof document !== 'undefined' && document.querySelector('[data-window="xperiencia"]')) {
  const start = () => mountXperienciaWindow();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
