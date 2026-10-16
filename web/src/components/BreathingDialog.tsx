import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, useReducedMotion } from 'pelagic/react';
import { PauseIcon, PlayIcon } from 'pelagic/icons/react';
import { phaseAt } from '../../../public/js/meditation-core.js';
import { useI18n } from '../i18n';
import { Orb } from './Art';

const PACE = { in: 4, hold: 4, out: 6 };
const PHASE_KEY: Record<string, string> = { in: 'breathIn', hold: 'breathHold', out: 'breathOut' };

/** Guided 4-4-6 breathing in a Pelagic dialog. With reduced motion the orb stays still and only the cue changes. */
export function BreathingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);
  const started = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    started.current = performance.now();
    const loop = () => {
      setElapsed(base.current + (performance.now() - started.current) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      base.current += (performance.now() - started.current) / 1000;
    };
  }, [running]);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      base.current = 0;
      setElapsed(0);
    }
  }, [open]);

  // Pelagic's dialog close button has an English name; give it the current language.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => document.querySelector('.cp-breath-dialog .pl-close')?.setAttribute('aria-label', t('breathClose')));
  }, [open, t]);

  const ph = phaseAt(PACE, elapsed);
  const scale = reduced ? 0.75 : running || elapsed > 0 ? 0.55 + 0.45 * ph.scale : 0.55;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('breathTitle')}
      className="cp-breath-dialog"
      footer={
        <>
          <Button variant="primary" onClick={() => setRunning((r) => !r)}>
            {running ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            {running ? t('breathPause') : t('breathStart')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('breathClose')}
          </Button>
        </>
      }
    >
      <p>{t('breathIntro')}</p>
      <div className="cp-breath">
        <Orb
          scale={scale}
          ring={running || elapsed > 0 ? ph.progress : 0}
          phase={running || elapsed > 0 ? t(PHASE_KEY[ph.phase]) : ''}
          count={running ? ph.count.toLocaleString(locale) : ''}
        />
      </div>
      <p className="cp-breath__cue" aria-live="polite">
        {running ? t(PHASE_KEY[ph.phase]) : t('breathReady')}
      </p>
    </Dialog>
  );
}
