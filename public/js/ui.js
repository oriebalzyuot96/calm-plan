import { t } from './i18n.js';

/** Creates an element with text content and attributes (no innerHTML). */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'className') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function setStatus(node, message, isError = false) {
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('error', Boolean(isError));
}

export function errorMessage(err) {
  if (err?.code === 'network') return t('errorNetwork');
  if (err?.status === 429) return t('errorRate');
  return t('errorGeneric');
}

/** Shows the crisis banner with guidance from the server, in the current language. */
export function showCrisis(guidance) {
  if (!guidance) return;
  const box = document.getElementById('crisis');
  if (!box) return;
  box.querySelector('[data-crisis-title]').textContent = guidance.title;
  box.querySelector('[data-crisis-body]').textContent = guidance.body;
  const steps = box.querySelector('[data-crisis-steps]');
  steps.replaceChildren(...guidance.steps.map((s) => el('li', { text: s })));
  box.querySelector('[data-crisis-prompt]').textContent = guidance.prompt || '';
  box.hidden = false;
  box.focus();
}

export function hideCrisis() {
  const box = document.getElementById('crisis');
  if (box) box.hidden = true;
}

/** Opens the confirm dialog. Resolves true only when the user confirms. */
export function confirmDialog(message, confirmLabel) {
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-text').textContent = message;
  const ok = document.getElementById('confirm-ok');
  if (confirmLabel) ok.textContent = confirmLabel;
  return new Promise((resolve) => {
    const onClose = () => {
      dialog.removeEventListener('close', onClose);
      resolve(dialog.returnValue === 'ok');
    };
    dialog.addEventListener('close', onClose);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else resolve(window.confirm(message));
  });
}
