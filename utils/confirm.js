/**
 * window.confirm() replacement: one <dialog> per document, shared by the popup
 * and the dashboard. The native element already gives us Escape-to-cancel, the
 * backdrop and a focus trap, so this is only the promise plumbing on top.
 */
import { t } from './i18n.js';
import { icon } from './icons.js';

let dialog = null;
let bodyNode = null;
let cancelBtn = null;
let okBtn = null;
let pending = null;
let settle = null;

function build() {
  const dlg = document.createElement('dialog');

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'dialog-close';
  x.append(icon('x'));
  x.title = t('action.close');
  x.setAttribute('aria-label', t('action.close'));
  x.addEventListener('click', () => dlg.close());

  const body = document.createElement('p');
  body.className = 'confirm-body';

  const actions = document.createElement('menu');
  actions.className = 'dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'confirm-cancel';
  cancel.addEventListener('click', () => dlg.close());
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'confirm-ok danger';
  ok.addEventListener('click', () => {
    dlg.returnValue = 'ok';
    dlg.close();
  });
  actions.append(cancel, ok);

  dlg.append(x, body, actions);
  // Cancel, Escape and a backdrop click all leave returnValue empty => false.
  dlg.addEventListener('close', () => {
    const done = settle;
    settle = null;
    pending = null;
    if (done) done(dlg.returnValue === 'ok');
  });
  dlg.addEventListener('click', (event) => {
    if (event.target === dlg) dlg.close();
  });
  dialog = dlg;
  bodyNode = body;
  cancelBtn = cancel;
  okBtn = ok;
  return dlg;
}

/** Ask the user to confirm a destructive action. Resolves true only on OK. */
export function askConfirm(message) {
  if (pending) return pending;
  if (!dialog) build();
  document.body.append(dialog);
  bodyNode.textContent = message;
  okBtn.textContent = t('action.confirm');
  cancelBtn.textContent = t('action.cancel');
  cancelBtn.focus();
  dialog.returnValue = '';
  pending = new Promise((resolve) => {
    settle = resolve;
  });
  dialog.showModal();
  return pending;
}
