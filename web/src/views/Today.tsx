import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Card, Checkbox, DatePicker, EmptyState, formatIsoDate, parseIsoDate, Input, ProgressBar, SkeletonText, toast, useSound } from 'pelagic/react';
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, PlusIcon, TrashIcon } from 'pelagic/icons/react';
import { Illustration } from 'pelagic/illustrations/react';
import { api, errorKey, type Task } from '../api';
import { useApp } from '../context';
import { useI18n } from '../i18n';
import { Plant } from '../components/Art';

export function plantStage(tasks: Pick<Task, 'done'>[]): number {
  const total = tasks.length;
  const done = tasks.filter((x) => x.done).length;
  if (!total) return 0;
  const ratio = done / total;
  return ratio === 1 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : done > 0 ? 1 : 0;
}

const sorted = (tasks: Task[]) => [...tasks].sort((a, b) => a.position - b.position);

export function Today() {
  const { t, locale } = useI18n();
  const { dataVersion } = useApp();
  const { play } = useSound();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [habit, setHabit] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bloom, setBloom] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fail = useCallback((err: unknown) => toast.error(t(errorKey(err))), [t]);

  const load = useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data.tasks);
    } catch (err) {
      setTasks([]);
      fail(err);
    }
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const items = sorted(tasks ?? []);
  const total = items.length;
  const done = items.filter((x) => x.done).length;
  const stage = plantStage(items);
  const allDone = total > 0 && done === total;

  const focusRow = (id: string, action: string) => {
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);
      const btn = row?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
      if (btn && !btn.disabled) btn.focus();
      else row?.querySelector<HTMLInputElement>('input')?.focus();
    });
  };

  async function add(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setTitleError(t('titleRequired'));
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const { task } = await api.createTask({ title: clean, dueDate: due || null, category: habit ? 'habit' : 'task' });
      setTasks((list) => [...(list ?? []), task]);
      setTitle('');
      setDue('');
      setHabit(false);
      setTitleError('');
      toast.success(t('taskAdded'), { sound: 'pop' });
      titleRef.current?.focus();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: Task, next: boolean) {
    const before = tasks ?? [];
    // Optimistic: the checkbox follows the click at once and reverts if the save fails.
    setTasks(before.map((x) => (x.id === task.id ? { ...x, done: next } : x)));
    try {
      const { task: updated } = await api.updateTask(task.id, { done: next });
      const list = before.map((x) => (x.id === task.id ? updated : x));
      setTasks(list);
      const nowAll = list.length > 0 && list.every((x) => x.done);
      if (updated.done && nowAll && !allDone) {
        setBloom(true);
        globalThis.setTimeout(() => setBloom(false), 2600);
        toast.success(t('taskAllDone'), { sound: 'success' });
      } else if (updated.done) {
        play('success');
        toast(t('taskDone'), { sound: false, duration: 2000 });
      } else {
        play('toggle-off');
        toast(t('taskReopened'), { sound: false, duration: 2000 });
      }
    } catch (err) {
      setTasks(before);
      fail(err);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const i = items.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const a = items[i];
    const b = items[j];
    try {
      await Promise.all([api.updateTask(a.id, { position: b.position }), api.updateTask(b.id, { position: a.position })]);
      await load();
      play('drop');
      focusRow(id, dir < 0 ? 'up' : 'down');
    } catch (err) {
      fail(err);
    }
  }

  async function remove(task: Task) {
    try {
      await api.deleteTask(task.id);
      setTasks((list) => (list ?? []).filter((x) => x.id !== task.id));
      toast(t('taskDeleted'), { sound: 'delete' });
      titleRef.current?.focus();
    } catch (err) {
      fail(err);
    }
  }

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const plantText = !total ? t('plantEmpty') : allDone ? t('plantAllDone') : t('plantProgress', { done, total });

  return (
    <section className="cp-view" aria-labelledby="h-today">
      <h2 id="h-today" className="cp-view__title">
        {t('todayTitle')}
      </h2>
      <div className="cp-today">
        <Card className={`cp-plant-card${bloom ? ' cp-plant-card--bloom' : ''}`} title={<h3>{t('plantLabel')}</h3>}>
          <div className="cp-plant-card__body">
            <Plant stage={stage} />
            <div className="cp-plant-card__meta">
              <p className="cp-plant-card__text" aria-live="polite">
                {plantText}
              </p>
              <ProgressBar value={total ? Math.round((done / total) * 100) : 0} label={t('plantLabel')} />
            </div>
          </div>
        </Card>

        <Card title={<h3>{t('taskLabel')}</h3>} className="cp-add-card">
          <form className="cp-add" onSubmit={add} noValidate>
            <Input
              ref={titleRef}
              label={t('taskLabel')}
              placeholder={t('taskPlaceholder')}
              value={title}
              maxLength={200}
              autoComplete="off"
              error={titleError || undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError('');
              }}
            />
            <div className="cp-add__row">
              <DatePicker
                label={t('dueLabel')}
                value={due ? parseIsoDate(due) : null}
                onChange={(v) => setDue(v instanceof Date ? formatIsoDate(v) : '')}
                locale={locale}
                showButtonBar
                placeholder="2026-10-16"
                labels={{
                  chooseDate: t('dpChoose'),
                  previousMonth: t('dpPrev'),
                  nextMonth: t('dpNext'),
                  month: t('dpMonth'),
                  year: t('dpYear'),
                  today: t('dpToday'),
                  clear: t('dpClear'),
                  done: t('dpDone'),
                  format: t('dpFormat'),
                }}
              />
              <Checkbox label={t('habitToggle')} checked={habit} onChange={(e) => setHabit(e.target.checked)} />
            </div>
            <Button type="submit" variant="primary" loading={busy}>
              <PlusIcon size={18} />
              {t('addButton')}
            </Button>
          </form>
        </Card>
      </div>

      <h3 className="cp-subtitle" id="h-list">
        {t('listTitle')}
      </h3>
      {tasks === null ? (
        <SkeletonText lines={3} label={t('tasksLoading')} />
      ) : items.length === 0 ? (
        <EmptyState
          size="compact"
          headingLevel={4}
          illustration={<Illustration name="empty-calendar" compact styles={false} />}
          title={t('moonEmpty')}
          description={t('emptyTasks')}
        />
      ) : (
        <ul className="cp-tasks" aria-labelledby="h-list" ref={listRef}>
          {items.map((task, index) => (
            <li key={task.id} data-id={task.id} className={`cp-task${task.done ? ' cp-task--done' : ''}`}>
              <Checkbox
                className="cp-task__check"
                data-action="toggle"
                checked={task.done}
                onChange={(e) => void toggle(task, e.target.checked)}
                label={<span className="cp-task__title">{task.title}</span>}
              />
              <span className="cp-task__meta">
                <Badge variant={task.category === 'habit' ? 'success' : 'neutral'}>
                  {task.category === 'habit' ? t('categoryHabit') : t('categoryTask')}
                </Badge>
                {task.dueDate && (
                  <span className="cp-task__due">
                    <CalendarIcon size={14} />
                    <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>
                  </span>
                )}
              </span>
              <span className="cp-task__actions">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  data-action="up"
                  aria-label={`${t('moveUp')}: ${task.title}`}
                  disabled={index === 0}
                  onClick={() => void move(task.id, -1)}
                >
                  <ArrowUpIcon size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  data-action="down"
                  aria-label={`${t('moveDown')}: ${task.title}`}
                  disabled={index === items.length - 1}
                  onClick={() => void move(task.id, 1)}
                >
                  <ArrowDownIcon size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  data-action="delete"
                  aria-label={`${t('deleteTask')}: ${task.title}`}
                  onClick={() => void remove(task)}
                >
                  <TrashIcon size={18} />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
