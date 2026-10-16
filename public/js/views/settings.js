import { api } from '../api.js';
import { t } from '../i18n.js';
import { confirmDialog, errorMessage, setStatus } from '../ui.js';

/** The data page: erase everything. Appearance preferences live in the settings drawer. */
export function initSettings() {
  const eraseBtn = document.getElementById('erase-btn');
  const status = document.getElementById('settings-status');

  eraseBtn.addEventListener('click', async () => {
    const ok = await confirmDialog(`${t('eraseTitle')} ${t('eraseText')}`, t('confirmErase'));
    if (!ok) {
      eraseBtn.focus();
      return;
    }
    eraseBtn.disabled = true;
    setStatus(status, t('erasing'));
    try {
      await api.eraseAll();
      setStatus(status, t('erased'));
      document.dispatchEvent(new CustomEvent('datacleared'));
    } catch (err) {
      setStatus(status, errorMessage(err), true);
    } finally {
      eraseBtn.disabled = false;
    }
  });
}
