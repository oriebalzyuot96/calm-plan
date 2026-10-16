import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Segmented, Textarea, toast, useSound } from 'pelagic/react';
import { SaveIcon } from 'pelagic/icons/react';
import { api, errorKey, type Mood } from '../api';
import { useApp } from '../context';
import { useI18n } from '../i18n';
import { MoodChart } from '../components/MoodChart';

const DAYS = 14;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface DayBucket {
  key: string;
  date: Date;
  avg: number | null;
}

/** One bucket per local day for the last 14 days, oldest first, with the average score. */
export function buckets(moods: Pick<Mood, 'score' | 'createdAt'>[], now = new Date()): DayBucket[] {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const days: { key: string; date: Date; scores: number[] }[] = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ key: dayKey(d), date: d, scores: [] });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const m of moods) byKey.get(dayKey(new Date(m.createdAt)))?.scores.push(m.score);
  return days.map((d) => ({
    key: d.key,
    date: d.date,
    avg: d.scores.length ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null,
  }));
}

export function MoodView() {
  const { t, lang, locale } = useI18n();
  const { showCrisis, dataVersion } = useApp();
  const { play } = useSound();
  const [score, setScore] = useState<string>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<DayBucket[]>(() => buckets([]));

  const loadChart = useCallback(async () => {
    try {
      const { moods } = await api.listMoods(DAYS);
      setDays(buckets(moods));
    } catch (err) {
      toast.error(t(errorKey(err)));
    }
  }, [t]);

  useEffect(() => {
    void loadChart();
  }, [loadChart, dataVersion]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!score) {
      setError(t('selectMoodFirst'));
      document.querySelector<HTMLElement>('.cp-mood-scale [role="radio"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await api.createMood({ score: Number(score), note, lang });
      play('success');
      toast.success(t('moodSaved'), { sound: false });
      setNote('');
      setScore('');
      setError('');
      if (result.crisis) showCrisis(result.crisis);
      await loadChart();
    } catch (err) {
      toast.error(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  const withData = days.filter((d) => d.avg !== null).map((d) => d.avg as number);
  const summary = withData.length
    ? t('chartSummary', { days: withData.length, avg: (withData.reduce((a, b) => a + b, 0) / withData.length).toFixed(1) })
    : t('chartSummaryNone');

  const options = [1, 2, 3, 4, 5].map((n) => ({
    value: String(n),
    label: (
      <span className="cp-mood-opt">
        <span className="cp-mood-opt__n">{n.toLocaleString(locale)}</span>
        <span className="cp-mood-opt__word">{t(`mood${n}`)}</span>
      </span>
    ),
  }));

  return (
    <section className="cp-view" aria-labelledby="h-mood">
      <h2 id="h-mood" className="cp-view__title">
        {t('moodTitle')}
      </h2>
      <Card title={<h3 id="mood-q">{t('moodQuestion')}</h3>}>
        <form className="cp-mood-form" onSubmit={save} noValidate>
          <Segmented
            className="cp-mood-scale"
            label={t('moodScaleLabel')}
            options={options}
            value={score}
            onChange={(v) => {
              setScore(v);
              setError('');
              play('select');
            }}
          />
          {error && (
            <p className="pl-error-text" role="alert">
              {error}
            </p>
          )}
          <Textarea label={t('moodNoteLabel')} value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" variant="primary" loading={busy}>
            <SaveIcon size={18} />
            {t('saveMood')}
          </Button>
        </form>
      </Card>

      <Card className="cp-chart-card">
        <MoodChart days={days} summary={summary} />
      </Card>
    </section>
  );
}
