import { useEffect, useState } from 'react';
import {
  AccessibilityPanel,
  Button,
  Card,
  ColorPicker,
  Segmented,
  Slider,
  Switch,
  toast,
  useConfirm,
  useSound,
  useThemeSwitch,
} from 'pelagic/react';
import { presetSwatches, type A11yPrefs } from 'pelagic/core/a11y-prefs';
import { AccessibilityIcon, CheckIcon, RefreshIcon, TrashIcon } from 'pelagic/icons/react';
import { api, errorKey } from '../api';
import { useApp } from '../context';
import { useI18n, type Lang } from '../i18n';
import { BRAND_SWATCHES, DEFAULT_PRESET, PRESETS, applyBrand, loadBrand, saveBrand, type Preset } from '../theme';

/** The accent colour in use now, so the picker starts from what the person sees. */
function currentPrimary(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--pl-primary').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#0f766e';
}

const presetKey = (p: string) => `preset${p[0].toUpperCase()}${p.slice(1)}`;

export function Settings() {
  const { t, lang, setLang, locale } = useI18n();
  const { demo, a11y, setA11y, replaceA11y, bumpData } = useApp();
  const { theme, switchTheme } = useThemeSwitch();
  const sound = useSound();
  const { confirm } = useConfirm();
  const [brand, setBrand] = useState<string | null>(() => loadBrand());
  const [panelOpen, setPanelOpen] = useState(false);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    applyBrand(brand);
    saveBrand(brand);
  }, [brand]);

  const preset = (theme.preset ?? 'default') as Preset;
  const dark = theme.mode === 'dark' || (theme.mode === 'system' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);

  async function pickPreset(p: Preset, origin: HTMLElement | null) {
    await switchTheme({ preset: p }, origin ?? undefined);
    if (brand) applyBrand(brand);
  }

  async function erase() {
    const ok = await confirm({
      header: t('eraseTitle'),
      message: t('eraseText'),
      acceptLabel: t('confirmErase'),
      rejectLabel: t('cancel'),
      severity: 'danger',
    });
    if (!ok) return;
    setErasing(true);
    try {
      await api.eraseAll();
      bumpData();
      toast.success(t('erased'), { sound: 'delete' });
    } catch (err) {
      toast.error(t(errorKey(err)));
    } finally {
      setErasing(false);
    }
  }

  function resetAll() {
    void switchTheme({ mode: 'system', preset: DEFAULT_PRESET, accent: null });
    setBrand(null);
    replaceA11y({ ...a11y, contrast: 'default', fontScale: 1, motion: 'system' } as A11yPrefs);
    sound.setEnabled(true);
    sound.setVolume(0.4);
    toast(t('drawerResetDone'));
  }

  return (
    <section className="cp-view" aria-labelledby="h-settings">
      <h2 id="h-settings" className="cp-view__title">
        {t('settingsTitle')}
      </h2>
      <p className="cp-lead">{t('settingsIntro')}</p>

      <div className="cp-settings">
        <Card title={<h3>{t('languageTitle')}</h3>}>
          <Segmented
            label={t('languageTitle')}
            value={lang}
            onChange={(v) => setLang(v as Lang)}
            options={[
              { value: 'ar', label: <span lang="ar">العربية</span> },
              { value: 'en', label: <span lang="en">English</span> },
            ]}
          />
        </Card>

        <Card title={<h3>{t('appearanceTitle')}</h3>}>
          <div className="cp-stack">
            <div>
              <p className="pl-label">{t('modeTitle')}</p>
              <Segmented
                label={t('modeTitle')}
                value={theme.mode === 'hc' ? 'system' : theme.mode}
                onChange={(v) => void switchTheme({ mode: v as 'system' | 'light' | 'dark' })}
                options={[
                  { value: 'system', label: t('themeSystem') },
                  { value: 'light', label: t('themeLight') },
                  { value: 'dark', label: t('themeDark') },
                ]}
              />
            </div>
            <fieldset className="cp-fieldset">
              <legend className="pl-label">{t('presetTitle')}</legend>
              <div className="cp-presets" role="radiogroup" aria-label={t('presetTitle')}>
                {PRESETS.map((p) => {
                  const sw = presetSwatches[p]?.[dark ? 'dark' : 'light'];
                  const checked = preset === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked ? 0 : -1}
                      className="cp-preset"
                      onClick={(e) => void pickPreset(p, e.currentTarget)}
                      onKeyDown={(e) => {
                        const keys = lang === 'ar' ? { next: 'ArrowLeft', prev: 'ArrowRight' } : { next: 'ArrowRight', prev: 'ArrowLeft' };
                        const i = PRESETS.indexOf(p);
                        let j = -1;
                        if (e.key === keys.next || e.key === 'ArrowDown') j = (i + 1) % PRESETS.length;
                        if (e.key === keys.prev || e.key === 'ArrowUp') j = (i - 1 + PRESETS.length) % PRESETS.length;
                        if (j < 0) return;
                        e.preventDefault();
                        const next = e.currentTarget.parentElement?.children[j] as HTMLElement | undefined;
                        next?.focus();
                        void pickPreset(PRESETS[j], next ?? null);
                      }}
                    >
                      <span className="cp-preset__swatch" aria-hidden="true">
                        {sw && (
                          <svg className="cp-preset__art" viewBox="0 0 36 24" focusable="false">
                            <rect width="36" height="24" rx="6" fill={sw.surface} />
                            <rect x="0" y="14" width="36" height="10" fill={sw.alt} />
                            <circle cx="12" cy="10" r="6" fill={sw.primary} />
                            <rect x="21" y="7" width="11" height="3" rx="1.5" fill={sw.text} />
                          </svg>
                        )}
                        {checked && <CheckIcon size={14} className="cp-preset__check" />}
                      </span>
                      <span>{t(presetKey(p))}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="cp-brand-row">
              <ColorPicker
                label={t('brandTitle')}
                hint={t('brandHint')}
                value={brand ?? currentPrimary()}
                onChange={(hex) => setBrand(hex.slice(0, 7).toLowerCase())}
                presets={BRAND_SWATCHES}
                recent={0}
                alpha={false}
                eyeDropper={false}
                formats={['hex']}
                pickerLabel={t('brandPicker')}
              />
              {brand && (
                <Button variant="ghost" size="sm" onClick={() => setBrand(null)}>
                  {t('brandClear')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card title={<h3>{t('a11yTitle')}</h3>}>
          <div className="cp-stack">
            <div>
              <p className="pl-label">{t('contrastTitle')}</p>
              <Segmented
                className="cp-wrap"
                label={t('contrastTitle')}
                value={['default', 'hc', 'yellow-black', 'gray'].includes(a11y.contrast) ? a11y.contrast : 'default'}
                onChange={(v) => setA11y({ contrast: v as A11yPrefs['contrast'] })}
                options={[
                  { value: 'default', label: t('contrastDefault') },
                  { value: 'hc', label: t('contrastHc') },
                  { value: 'yellow-black', label: t('contrastYellow') },
                  { value: 'gray', label: t('contrastGray') },
                ]}
              />
            </div>
            <Slider
              label={t('textScale', { n: Math.round(a11y.fontScale * 100).toLocaleString(locale) })}
              value={Math.round(a11y.fontScale * 100)}
              min={90}
              max={200}
              step={10}
              onChange={(v) => setA11y({ fontScale: v / 100 })}
            />
            <div>
              <p className="pl-label">{t('motionTitle')}</p>
              <Segmented
                label={t('motionTitle')}
                value={a11y.motion === 'full' ? 'system' : a11y.motion}
                onChange={(v) => setA11y({ motion: v as A11yPrefs['motion'] })}
                options={[
                  { value: 'system', label: t('motionSystem') },
                  { value: 'reduce', label: t('motionReduce') },
                  { value: 'off', label: t('motionOff') },
                ]}
              />
              <p className="pl-hint">{t('motionHint')}</p>
            </div>
            <Button variant="outline" onClick={() => setPanelOpen(true)}>
              <AccessibilityIcon size={18} />
              {t('moreA11y')}
            </Button>
          </div>
        </Card>

        <Card title={<h3>{t('soundTitle')}</h3>}>
          <div className="cp-stack">
            <Switch showLabel label={t('soundOn')} checked={sound.enabled} onChange={(on) => sound.setEnabled(on)} />
            <Slider
              label={t('soundVolumeValue', { n: Math.round(sound.volume * 100).toLocaleString(locale) })}
              value={Math.round(sound.volume * 100)}
              min={0}
              max={100}
              step={5}
              disabled={!sound.enabled}
              onChange={(v) => sound.setVolume(v / 100)}
            />
            <div>
              <p className="pl-label">{t('soundThemeTitle')}</p>
              <Segmented
                label={t('soundThemeTitle')}
                value={sound.theme === 'minimal' ? 'minimal' : 'soft'}
                onChange={(v) => {
                  sound.setTheme(v as 'soft' | 'minimal');
                  sound.play('select');
                }}
                options={[
                  { value: 'soft', label: t('soundSoft') },
                  { value: 'minimal', label: t('soundMinimal') },
                ]}
              />
            </div>
            <p className="pl-hint">{t('soundHint')}</p>
          </div>
        </Card>

        <Card title={<h3>{t('dataTitle')}</h3>}>
          <div className="cp-stack">
            <p>{demo ? t('privacyTextDemo') : t('privacyText')}</p>
            <div className="cp-row">
              <Button variant="danger" loading={erasing} onClick={() => void erase()}>
                <TrashIcon size={18} />
                {t('eraseButton')}
              </Button>
              <Button variant="ghost" onClick={resetAll}>
                <RefreshIcon size={18} />
                {t('resetSettings')}
              </Button>
            </div>
          </div>
        </Card>

        <Card title={<h3>{t('aboutTitle')}</h3>}>
          <p>{t('aboutText')}</p>
          <p className="cp-strong">{t('crisisNote')}</p>
        </Card>
      </div>

      <AccessibilityPanel
        trigger="none"
        open={panelOpen}
        onOpenChange={setPanelOpen}
        locale={lang}
        appearance={false}
        sound={false}
        preview={false}
        persist={false}
        value={a11y}
        onChange={(p) => replaceA11y(p)}
      />
    </section>
  );
}
