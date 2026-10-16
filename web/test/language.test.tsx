// Language switch: Arabic is the default (rtl); English switches <html> to ltr and back.
import { describe, expect, test } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, useDemoMeta } from './helpers';
import { WEB_STRINGS } from '../src/strings';
import { STRINGS } from '../../public/js/i18n.js';

useDemoMeta();

describe('language', () => {
  test('defaults to Arabic with dir=rtl, switches to English (ltr) and back', async () => {
    const user = userEvent.setup();
    renderApp();
    const html = document.documentElement;
    await waitFor(() => expect(html.dir).toBe('rtl'));
    expect(html.lang).toBe('ar');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('خطة الهدوء');

    await user.click(screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }));
    await waitFor(() => expect(html.dir).toBe('ltr'));
    expect(html.lang).toBe('en');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Calm Plan');
    expect(screen.getByRole('tab', { name: /Today/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('calmPlan.prefs') || '{}').lang).toBe('en');

    // The language control in Settings does the same.
    await user.click(screen.getByRole('tab', { name: /Settings/ }));
    await user.click(screen.getByRole('radio', { name: 'العربية' }));
    await waitFor(() => expect(html.dir).toBe('rtl'));
    expect(html.lang).toBe('ar');
  });

  test('web strings exist in both languages and are not empty', () => {
    expect(Object.keys(WEB_STRINGS.ar).sort()).toEqual(Object.keys(WEB_STRINGS.en).sort());
    for (const lang of ['ar', 'en'] as const) {
      for (const v of Object.values(WEB_STRINGS[lang])) expect(v.trim()).not.toBe('');
    }
    expect(Object.keys(STRINGS.ar).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });
});
