import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AnimatedTabs,
  Badge,
  Button,
  ConfirmProvider,
  Message,
  SoundProvider,
  Toaster,
  useSound,
  useThemeSwitch,
} from 'pelagic/react';
import { applyA11yPrefs, loadA11yPrefs, normalizeA11yPrefs, saveA11yPrefs, type A11yPrefs } from 'pelagic/core/a11y-prefs';
import {
  ChatIcon,
  CheckCircleIcon,
  EmojiIcon,
  LanguageIcon,
  LeafIcon,
  MoonIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from 'pelagic/icons/react';
import { isDemoMode } from './api';
import { AppContext, VIEWS, type AppState, type View } from './context';
import { I18nProvider, useI18n } from './i18n';
import { Logo } from './components/Art';
import { CrisisBanner } from './components/CrisisBanner';
import { syncSoundPrefs } from './soundscape';
import type { CrisisGuidance } from './types';
import { Today } from './views/Today';
import { MoodView } from './views/Mood';
import { Meditate } from './views/Meditate';
import { Chat } from './views/Chat';
import { Settings } from './views/Settings';

function viewFromHash(): View {
  const name = (globalThis.location?.hash || '#today').slice(1) as View;
  return VIEWS.includes(name) ? name : 'today';
}

/** Keeps the soundscape synthesiser (public/js/sound.js) in step with Pelagic's sound preferences. */
function SoundSync() {
  const { enabled, volume } = useSound();
  useEffect(() => syncSoundPrefs(enabled, volume), [enabled, volume]);
  return null;
}

function useDarkNow(mode: string) {
  const [systemDark, setSystemDark] = useState(() => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return mode === 'dark' || (mode === 'system' && systemDark);
}

function Header({ demo }: { demo: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { theme, switchTheme } = useThemeSwitch();
  const dark = useDarkNow(theme.mode);
  return (
    <header className="cp-header">
      <div className="cp-header__inner">
        <div className="cp-brand">
          <Logo />
          <div className="cp-brand__text">
            <h1 className="cp-brand__name">{t('appName')}</h1>
            <p className="cp-brand__tagline">{t('tagline')}</p>
          </div>
        </div>
        <div className="cp-header__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            title={t('toggleLanguageLabel')}
          >
            <LanguageIcon size={18} />
            <span lang={lang === 'ar' ? 'en' : 'ar'}>{t('toggleLanguage')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={dark ? t('toggleLight') : t('toggleDark')}
            title={dark ? t('toggleLight') : t('toggleDark')}
            onClick={(e) => void switchTheme({ mode: dark ? 'light' : 'dark' }, e)}
          >
            {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
        </div>
      </div>
      <div className="cp-header__chips">
        <Badge variant="info" className="cp-safety">
          <ShieldIcon size={16} />
          <span>{t('safetyChip')}</span>
        </Badge>
      </div>
      {demo && (
        <Message severity="info" className="cp-demo" icon={false}>
          <span lang="ar" dir="rtl">
            {t('demoBannerAr')}
          </span>{' '}
          <span lang="en" dir="ltr">
            {t('demoBannerEn')}
          </span>
        </Message>
      )}
    </header>
  );
}

function Notice() {
  const { t } = useI18n();
  return (
    <aside className="cp-notice" aria-label={t('noticeLabel')}>
      <ShieldIcon size={22} className="cp-notice__icon" />
      <div>
        <p lang="ar" dir="rtl">
          <strong>تنبيه:</strong> خطة الهدوء أداة لدعم الذات. وهي <strong>ليست علاجًا نفسيًا</strong>، ولا تشخص أي حالة، و
          <strong>ليست بديلًا عن الطبيب أو خدمات الطوارئ والأزمات</strong>. إذا كنت تفكر في إيذاء نفسك، فاتصل الآن برقم الطوارئ في بلدك.
        </p>
        <p lang="en" dir="ltr">
          <strong>Please note:</strong> Calm Plan is a self-help tool. It is <strong>not therapy</strong>, it does not diagnose anything,
          and it is <strong>not a replacement for a doctor or a crisis service</strong>. If you may harm yourself, call your local
          emergency number now.
        </p>
      </div>
    </aside>
  );
}

function Shell() {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>(viewFromHash);
  const [crisis, setCrisis] = useState<CrisisGuidance | null>(null);
  const [demo, setDemo] = useState(false);
  const [chat, setChatState] = useState<AppState['chat']>({ bubbles: [], history: [] });
  const [dataVersion, setDataVersion] = useState(0);
  const [a11y, setA11yState] = useState<A11yPrefs>(() => loadA11yPrefs());

  useEffect(() => {
    applyA11yPrefs(a11y);
    saveA11yPrefs(a11y);
  }, [a11y]);

  useEffect(() => {
    let alive = true;
    isDemoMode().then((d: boolean) => alive && setDemo(d));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const on = () => setView(viewFromHash());
    globalThis.addEventListener('hashchange', on);
    return () => globalThis.removeEventListener('hashchange', on);
  }, []);

  // Pelagic's AnimatedTabs places its sliding indicator when the selection or the list size changes,
  // but not when the writing direction flips. Re-place it after a language switch.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const ind = document.querySelector<HTMLElement>('.cp-tabs .pl-atabs__indicator');
      const sel = document.querySelector<HTMLElement>('.cp-tabs .pl-atabs__tab[aria-selected="true"]');
      if (ind && sel) ind.style.transform = `translate(${sel.offsetLeft}px, ${sel.offsetTop}px)`;
    });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  const navigate = useCallback((v: View) => {
    setView(v);
    if (globalThis.location && globalThis.location.hash !== `#${v}`) globalThis.history?.replaceState(null, '', `#${v}`);
  }, []);

  const app = useMemo<AppState>(
    () => ({
      showCrisis: setCrisis,
      navigate,
      demo,
      chat,
      setChat: (u) => setChatState(u),
      dataVersion,
      bumpData: () => setDataVersion((n) => n + 1),
      a11y,
      setA11y: (patch) => setA11yState((p) => normalizeA11yPrefs({ ...p, ...patch })),
      replaceA11y: (p) => setA11yState(normalizeA11yPrefs(p)),
    }),
    [navigate, demo, chat, dataVersion, a11y],
  );

  const tab = (value: View, label: string, icon: ReactNode, content: ReactNode) => ({ value, label, icon, content });
  const tabs = [
    tab('today', t('navToday'), <CheckCircleIcon size={20} />, <Today />),
    tab('mood', t('navMood'), <EmojiIcon size={20} />, <MoodView />),
    tab('meditate', t('navMeditate'), <LeafIcon size={20} />, <Meditate />),
    tab('chat', t('navChat'), <ChatIcon size={20} />, <Chat />),
    tab('settings', t('navSettings'), <SettingsIcon size={20} />, <Settings />),
  ];

  return (
    <AppContext.Provider value={app}>
      <a className="pl-skip-link" href="#main">
        {t('skipLink')}
      </a>
      <Header demo={demo} />
      <Notice />
      <CrisisBanner guidance={crisis} onDismiss={() => setCrisis(null)} />
      <main id="main" tabIndex={-1} className="cp-main">
        <AnimatedTabs
          className="cp-tabs"
          label={t('mainNav')}
          tabs={tabs}
          value={view}
          onChange={(v) => navigate(v as View)}
          fullWidth
        />
      </main>
      <footer className="cp-footer">
        <p>{t('footerText')}</p>
        <p>{t('crisisNote')}</p>
      </footer>
      <Toaster
        position="top-center"
        richColors
        locale={lang}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        label={t('toastRegion')}
        closeLabel={t('close')}
        hotkey={false}
      />
    </AppContext.Provider>
  );
}

export function App() {
  return (
    <SoundProvider enabled volume={0.4} theme="soft">
      <SoundSync />
      <I18nProvider>
        <ConfirmProvider>
          <Shell />
        </ConfirmProvider>
      </I18nProvider>
    </SoundProvider>
  );
}
