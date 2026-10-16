import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, Button, Card, Textarea, useSound } from 'pelagic/react';
import { SendIcon, SparklesIcon } from 'pelagic/icons/react';
import { api, errorKey } from '../api';
import { useApp, type Bubble } from '../context';
import { useI18n } from '../i18n';
import { BreathingDialog } from '../components/BreathingDialog';

const MAX_HISTORY = 12;
const MAX_CHARS = 1000;
let nextId = 1;

export function Chat() {
  const { t, lang } = useI18n();
  const { chat, setChat, showCrisis } = useApp();
  const { play } = useSound();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [breathOpen, setBreathOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [chat.bubbles.length, busy]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    if (content.length > MAX_CHARS) {
      setError(t('chatTooLong'));
      return;
    }
    setError('');
    setBusy(true);
    const history = [...chat.history, { role: 'user' as const, content }].slice(-MAX_HISTORY);
    const userBubble: Bubble = { id: nextId++, role: 'user', text: content };
    setChat((c) => ({ ...c, bubbles: [...c.bubbles, userBubble] }));
    setText('');
    play('send');
    try {
      const result = await api.chat({ messages: history, lang });
      const reply: Bubble = {
        id: nextId++,
        role: 'assistant',
        text: result.reply,
        meta: result.crisis ? undefined : result.source === 'anthropic' ? t('chatSourceApi') : t('chatSource'),
        crisis: Boolean(result.crisis),
      };
      setChat((c) => ({
        bubbles: [...c.bubbles, reply],
        history: [...history, { role: 'assistant' as const, content: result.reply }].slice(-MAX_HISTORY),
      }));
      // Crisis language: the guidance replaces the normal reply and the banner opens.
      if (result.crisis) showCrisis(result.crisis);
      else play('pop');
    } catch (err) {
      setError(t(errorKey(err)));
      setChat((c) => ({ ...c, bubbles: [...c.bubbles, { id: nextId++, role: 'assistant', text: t('chatError') }] }));
      // The unanswered message is not kept in the history, so the next turn stays well formed.
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(text);
  }

  const bubbles: Bubble[] = chat.bubbles.length ? chat.bubbles : [{ id: 0, role: 'assistant', text: t('chatWelcome') }];

  return (
    <section className="cp-view" aria-labelledby="h-chat">
      <h2 id="h-chat" className="cp-view__title">
        {t('chatTitle')}
      </h2>
      <p className="cp-lead">{t('chatIntro')}</p>
      <Card className="cp-chat">
        <div ref={logRef} className="cp-chat__log" role="log" aria-live="polite" aria-label={t('chatLog')} aria-busy={busy} tabIndex={0}>
          {bubbles.map((b) => (
            <div key={b.id} className={`cp-msg cp-msg--${b.role}${b.crisis ? ' cp-msg--crisis' : ''}`}>
              {b.role === 'assistant' && <Avatar name={t('chatCompanion')} size="sm" />}
              <div className="cp-msg__bubble">
                <span className="pl-sr-only">{b.role === 'user' ? t('chatYou') : t('chatCompanion')}: </span>
                <p className="cp-msg__text">{b.text}</p>
                {b.meta && <p className="cp-msg__meta">{b.meta}</p>}
              </div>
            </div>
          ))}
          {busy && <p className="cp-muted cp-chat__busy">{t('chatBusy')}</p>}
        </div>

        <div className="cp-chips" role="group" aria-label={t('chatSuggestions')}>
          <Button variant="secondary" size="sm" onClick={() => setBreathOpen(true)}>
            <SparklesIcon size={16} />
            {t('chipBreath')}
          </Button>
          {[1, 2, 3, 4].map((n) => (
            <Button key={n} variant="outline" size="sm" disabled={busy} onClick={() => void send(t(`chipMsg${n}`))}>
              {t(`chip${n}`)}
            </Button>
          ))}
        </div>

        <form className="cp-chat__form" onSubmit={submit}>
          <Textarea
            ref={inputRef}
            label={t('chatLabel')}
            hint={t('chatHint')}
            error={error || undefined}
            value={text}
            rows={2}
            maxLength={MAX_CHARS + 200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <Button type="submit" variant="primary" loading={busy}>
            <SendIcon size={18} />
            {t('sendButton')}
          </Button>
        </form>
      </Card>
      <BreathingDialog open={breathOpen} onClose={() => setBreathOpen(false)} />
    </section>
  );
}
