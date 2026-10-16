import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, EmptyState, ProgressBar, RadioGroup, Segmented, Slider, Switch, useReducedMotion, useSound } from 'pelagic/react';
import { PauseIcon, PlayIcon, StopIcon } from 'pelagic/icons/react';
import { Illustration } from 'pelagic/illustrations/react';
import {
  SESSIONS,
  SLEEP_TIMER_OPTIONS,
  SOUNDSCAPES,
  buildTimeline,
  fadeGain,
  formatClock,
  getSession,
  hiddenTooLong,
  phaseAt,
  sleepGain,
  stepIndexAt,
} from '../../../public/js/meditation-core.js';
import { useApp } from '../context';
import { useI18n } from '../i18n';
import { Orb } from '../components/Art';
import { soundscape } from '../soundscape';

const HIDDEN_LIMIT_MS = 60_000;
const PHASE_KEY: Record<string, string> = { in: 'breathIn', hold: 'breathHold', out: 'breathOut' };
const SCAPE_KEY: Record<string, string> = {
  none: 'medScapeNone',
  drone: 'medScapeDrone',
  bowls: 'medScapeBowls',
  rain: 'medScapeRain',
  ocean: 'medScapeOcean',
};

type Phase = 'idle' | 'running' | 'paused' | 'done';
interface Step {
  key: string;
  start: number;
  end: number;
  seconds: number;
}

export function Meditate() {
  const { t, locale } = useI18n();
  const { navigate } = useApp();
  const sound = useSound();
  const reduced = useReducedMotion();

  const [sessionId, setSessionId] = useState<string>(SESSIONS[0].id);
  const [scape, setScape] = useState('drone');
  const [sleepMin, setSleepMin] = useState(0);
  const [mix, setMix] = useState(false);
  const [level, setLevel] = useState(70);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState('');

  const run = useRef({ base: 0, startedAt: 0, raf: 0, sleepDone: false, stepIndex: -1, hiddenSince: null as number | null, hiddenTimer: 0 });
  const timeline = useRef<Step[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const beginRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState('');

  const session = getSession(sessionId) ?? SESSIONS[0];
  const total = session.minutes * 60;
  const stateRef = useRef({ phase, level, sleepMin, mix, total, scape });
  stateRef.current = { phase, level, sleepMin, mix, total, scape };

  const now = () => (stateRef.current.phase === 'running' ? run.current.base + (performance.now() - run.current.startedAt) / 1000 : run.current.base);

  const applyLevel = useCallback((at: number) => {
    const s = stateRef.current;
    if (!soundscape.playing()) return;
    const sleepSec = s.sleepMin * 60;
    const v = s.phase === 'running' ? (s.level / 100) * fadeGain(at, s.total) * sleepGain(at, sleepSec) : 0;
    soundscape.level(v);
    if (sleepSec && at >= sleepSec && !run.current.sleepDone) {
      run.current.sleepDone = true;
      soundscape.stop();
      setStatus(t('medTimerEnded'));
    }
  }, [t]);

  const stopLoop = () => cancelAnimationFrame(run.current.raf);

  const finish = useCallback(() => {
    stopLoop();
    soundscape.stop();
    run.current.base = 0;
    setElapsed(0);
    setPhase('done');
    sound.play('success');
    requestAnimationFrame(() => doneRef.current?.querySelector<HTMLElement>('.pl-empty__title')?.focus());
  }, [sound]);

  const frame = useCallback(() => {
    if (stateRef.current.phase !== 'running') return;
    const at = now();
    if (at >= stateRef.current.total) {
      finish();
      return;
    }
    const idx = stepIndexAt(timeline.current, at);
    if (idx !== run.current.stepIndex) {
      const first = run.current.stepIndex === -1;
      run.current.stepIndex = idx;
      const step = timeline.current[idx];
      if (step) setLive(`${t('medStepAnnounce', { n: idx + 1, total: timeline.current.length })}. ${t(step.key)}`);
      if (!first && stateRef.current.mix) sound.play('notification');
    }
    setElapsed(at);
    applyLevel(at);
    run.current.raf = requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLevel, finish, t, sound]);

  const startSound = () => {
    soundscape.unlock();
    const s = stateRef.current;
    if (s.scape === 'none' || run.current.sleepDone) return;
    if (!soundscape.playing()) soundscape.start(s.scape);
  };

  const startLoop = () => {
    stopLoop();
    run.current.startedAt = performance.now();
    stateRef.current.phase = 'running';
    setPhase('running');
    run.current.raf = requestAnimationFrame(frame);
  };

  function begin() {
    timeline.current = buildTimeline(session);
    run.current.base = 0;
    run.current.stepIndex = -1;
    run.current.sleepDone = false;
    setStatus('');
    setElapsed(0);
    startSound();
    startLoop();
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function pause() {
    if (stateRef.current.phase !== 'running') return;
    run.current.base = now();
    stateRef.current.phase = 'paused';
    setPhase('paused');
    stopLoop();
    soundscape.level(0);
  }

  function resume() {
    if (stateRef.current.phase !== 'paused') return;
    setStatus('');
    startSound();
    startLoop();
  }

  function end() {
    stopLoop();
    soundscape.stop();
    run.current.base = 0;
    stateRef.current.phase = 'idle';
    setPhase('idle');
    setElapsed(0);
    requestAnimationFrame(() => beginRef.current?.focus());
  }

  // Pause and stop the sound when the tab stays hidden for a minute.
  useEffect(() => {
    const onVisibility = () => {
      const r = run.current;
      const stopForHidden = () => {
        if (stateRef.current.phase === 'running') {
          pause();
          setStatus(t('medStopped'));
        }
        soundscape.stop();
      };
      if (document.hidden) {
        r.hiddenSince = Date.now();
        clearTimeout(r.hiddenTimer);
        r.hiddenTimer = window.setTimeout(stopForHidden, HIDDEN_LIMIT_MS);
      } else {
        clearTimeout(r.hiddenTimer);
        if (hiddenTooLong(r.hiddenSince, Date.now(), HIDDEN_LIMIT_MS)) stopForHidden();
        r.hiddenSince = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onHide = () => soundscape.stop(true);
    globalThis.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      globalThis.removeEventListener('pagehide', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Leaving the Meditate tab ends the session and the sound.
  useEffect(
    () => () => {
      cancelAnimationFrame(run.current.raf);
      clearTimeout(run.current.hiddenTimer);
      soundscape.stop();
    },
    [],
  );

  useEffect(() => {
    if (!sound.enabled) soundscape.stop(true);
  }, [sound.enabled]);

  useEffect(() => {
    if (phase === 'running' || phase === 'paused') applyLevel(now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const active = phase === 'running' || phase === 'paused';
  const ph = phaseAt(session.pace, elapsed);
  const stepIdx = active ? stepIndexAt(timeline.current, elapsed) : -1;
  const step = stepIdx >= 0 ? timeline.current[stepIdx] : null;
  const orbScale = !active ? 0.55 : reduced ? 0.75 : 0.55 + 0.45 * ph.scale;

  if (phase === 'done') {
    return (
      <section className="cp-view" aria-labelledby="h-med">
        <h2 id="h-med" className="cp-view__title">
          {t('medTitle')}
        </h2>
        <Card>
          <div ref={doneRef}>
            <EmptyState
              headingLevel={3}
              illustration={<Illustration name="all-done" styles={false} />}
              title={t('medDoneTitle')}
              description={t('medDoneText')}
              primaryAction={
                <Button variant="primary" onClick={() => navigate('mood')}>
                  {t('medDoneMood')}
                </Button>
              }
              secondaryAction={
                <Button variant="ghost" onClick={() => setPhase('idle')}>
                  {t('medDoneAgain')}
                </Button>
              }
            />
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="cp-view" aria-labelledby="h-med">
      <h2 id="h-med" className="cp-view__title">
        {t('medTitle')}
      </h2>
      <p className="cp-lead">{t('medIntro')}</p>

      {active ? (
        <Card className="cp-player" title={<h3 ref={titleRef} tabIndex={-1}>{t(`med_title_${session.id}`)}</h3>}>
          <div className="cp-player__stage">
            <Orb
              scale={orbScale}
              ring={elapsed / total}
              phase={phase === 'running' ? t(PHASE_KEY[ph.phase]) : t('medPause')}
              count={phase === 'running' ? ph.count.toLocaleString(locale) : ''}
            />
            <div className="cp-player__info">
              <p className="cp-player__clock">
                <span className="cp-muted">{t('medRemaining')}</span>{' '}
                <time>{formatClock(total - elapsed)}</time>
              </p>
              <ProgressBar value={Math.round((elapsed / total) * 100)} label={t('medProgress')} />
              <p className="cp-player__step">{step ? t(step.key) : ''}</p>
              <p className="pl-sr-only" aria-live="polite">
                {live}
              </p>
              {status && (
                <p className="cp-status" role="status">
                  {status}
                </p>
              )}
              <div className="cp-row">
                <Button variant="primary" onClick={phase === 'running' ? pause : resume}>
                  {phase === 'running' ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                  {phase === 'running' ? t('medPause') : t('medResume')}
                </Button>
                <Button variant="outline" onClick={end}>
                  <StopIcon size={18} />
                  {t('medEnd')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card title={<h3 id="h-sessions">{t('medSessions')}</h3>}>
            <RadioGroup
              name="session"
              className="cp-sessions"
              label={t('medSessions')}
              value={sessionId}
              onChange={(v) => {
                setSessionId(v);
                sound.play('select');
              }}
              options={SESSIONS.map((s: { id: string; minutes: number }) => ({
                value: s.id,
                label: (
                  <span className="cp-session">
                    <span className="cp-session__head">
                      <strong>{t(`med_title_${s.id}`)}</strong>
                      <Badge variant="primary">{t('medMinutes', { n: s.minutes.toLocaleString(locale) })}</Badge>
                    </span>
                    <span className="cp-muted">{t(`med_desc_${s.id}`)}</span>
                  </span>
                ),
              }))}
            />
          </Card>

          <Card title={<h3>{t('medSoundscapes')}</h3>}>
            <div className="cp-stack">
              <Segmented
                className="cp-wrap"
                label={t('medSoundscapes')}
                value={scape}
                onChange={(v) => setScape(v)}
                options={['none', ...SOUNDSCAPES].map((s) => ({ value: s, label: t(SCAPE_KEY[s]) }))}
              />
              <Slider label={`${t('medMusicVolume')}: ${level.toLocaleString(locale)}%`} value={level} min={0} max={100} step={5} onChange={setLevel} />
              <div>
                <p className="pl-label" id="sleep-label">
                  {t('medSleepTimer')}
                </p>
                <Segmented
                  className="cp-wrap"
                  label={t('medSleepTimer')}
                  value={String(sleepMin)}
                  onChange={(v) => setSleepMin(Number(v))}
                  options={SLEEP_TIMER_OPTIONS.map((m: number) => ({
                    value: String(m),
                    label: m === 0 ? t('medSleepOff') : t('medSleepMin', { n: m.toLocaleString(locale) }),
                  }))}
                />
              </div>
              <Switch showLabel label={t('medMix')} checked={mix} onChange={setMix} />
              <p className="cp-muted">{sound.enabled ? t('medSoundAuto') : t('medSoundOff')}</p>
            </div>
          </Card>

          <div className="cp-row cp-row--end">
            <p className="cp-muted">{t('medChooseHint')}</p>
            <Button ref={beginRef} variant="primary" size="lg" onClick={begin}>
              <PlayIcon size={20} />
              {t('medBegin')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
