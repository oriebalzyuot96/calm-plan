// Crisis language in the chat: the guidance replaces the reply and the crisis banner appears.
import { describe, expect, test } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { crisisGuidance } from '../../public/js/shared/crisis.js';
import { renderApp, useDemoMeta } from './helpers';

useDemoMeta();

describe('crisis banner', () => {
  test('appears when a crisis message is sent; a normal message does not trigger it', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('tab', { name: /الدردشة/ }));
    const box = screen.getByLabelText('رسالتك');

    await user.type(box, 'مرحبا{Enter}');
    await waitFor(() => expect(screen.getAllByText(/يسعدني أن تكتب لي/).length).toBeGreaterThan(0));
    expect(screen.queryByTestId('crisis-banner')).toBeNull();

    await user.type(box, 'أفكر في الانتحار{Enter}');
    const banner = await screen.findByTestId('crisis-banner');
    const g = crisisGuidance('ar');
    expect(within(banner).getByRole('heading', { name: g.title })).toBeTruthy();
    for (const step of g.steps) expect(within(banner).getByText(step)).toBeTruthy();
    expect(within(banner).getByRole('alert')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(banner));

    // The chat reply is the crisis guidance, not a normal answer.
    const log = screen.getByRole('log');
    expect(within(log).getByText((text) => text.startsWith(g.title))).toBeTruthy();

    await user.click(within(banner).getByRole('button', { name: 'إخفاء هذه الرسالة' }));
    expect(screen.queryByTestId('crisis-banner')).toBeNull();
  });
});
