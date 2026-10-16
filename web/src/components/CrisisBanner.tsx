import { useEffect, useRef } from 'react';
import { Alert, Button } from 'pelagic/react';
import { HeartIcon } from 'pelagic/icons/react';
import { useI18n } from '../i18n';
import type { CrisisGuidance } from '../types';

/**
 * Emergency guidance shown when crisis language is detected (chat or mood note).
 * The guidance text comes from public/js/shared/crisis.js via the API or the demo store.
 * It takes focus when it appears so keyboard and screen reader users meet it first.
 */
export function CrisisBanner({ guidance, onDismiss }: { guidance: CrisisGuidance | null; onDismiss: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (guidance) {
      ref.current?.focus();
      ref.current?.scrollIntoView?.({ block: 'start' });
    }
  }, [guidance]);
  if (!guidance) return null;
  return (
    <section ref={ref} className="cp-crisis" aria-labelledby="crisis-title" tabIndex={-1} data-testid="crisis-banner">
      <Alert
        variant="danger"
        title={
          <h2 id="crisis-title" className="cp-crisis__title">
            <HeartIcon size={22} />
            <span>{guidance.title}</span>
          </h2>
        }
      >
        <p>{guidance.body}</p>
        <ol className="cp-crisis__steps">
          {guidance.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {guidance.prompt && <p className="cp-crisis__prompt">{guidance.prompt}</p>}
        <Button variant="outline" size="sm" onClick={onDismiss}>
          {t('crisisDismiss')}
        </Button>
      </Alert>
    </section>
  );
}
