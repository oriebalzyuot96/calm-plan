import { Axis, ChartContainer, ChartPlot, Gridlines, LineSeries, PointSeries, bandScale, linearScale } from 'pelagic/react';
import { useI18n } from '../i18n';
import type { DayBucket } from '../views/Mood';

/**
 * 14-day mood chart composed from Pelagic chart primitives, so the value axis is fixed to 1-5.
 * ChartContainer gives the figure, caption, text summary, keyboard navigation with announcements
 * and the "Show data table" fallback.
 */
export function MoodChart({ days, summary }: { days: DayBucket[]; summary: string }) {
  const { t, lang, locale } = useI18n();
  const labels = days.map((d) => d.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }));
  const fmt = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });
  const series = t('chartSeries');
  return (
    <ChartContainer
      key={lang}
      title={t('chartTitle')}
      description={t('chartAria')}
      summary={summary}
      showSummary
      height={260}
      locale={locale}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      margin={{ top: 12, bottom: 32, start: 36, end: 16 }}
      labels={{
        showTable: t('chartShowTable'),
        hideTable: t('chartHideTable'),
        instructions: t('chartInstructions'),
        noData: t('chartNoData'),
        category: t('dayHeader'),
        value: t('scoreHeader'),
        legend: series,
      }}
      tableData={{
        caption: t('chartTableCaption'),
        columns: [t('dayHeader'), t('scoreHeader')],
        rows: days.map((d, i) => ({ header: labels[i], cells: [d.avg === null ? '-' : fmt(d.avg)] })),
      }}
    >
      {(frame) => {
        const keys = days.map((d) => d.key);
        const x = bandScale(keys, frame.rtl ? [frame.innerWidth, 0] : [0, frame.innerWidth], { paddingInner: 0, paddingOuter: 0.5 });
        const y = linearScale([1, 5], [frame.innerHeight, 0]);
        const pts = days.map((d) => (d.avg === null ? null : { x: x.center(d.key), y: y(d.avg) }));
        const nav = [
          days.map((d, i) =>
            d.avg === null ? null : { x: x.center(d.key), y: y(d.avg), title: labels[i], series, value: fmt(d.avg) },
          ),
        ];
        const shownTicks = keys.filter((_, i) => i % 2 === 1 || i === keys.length - 1);
        return (
          <ChartPlot points={nav}>
            <Gridlines scale={y} orientation="horizontal" tickValues={[1, 2, 3, 4, 5]} />
            <LineSeries points={pts.filter(Boolean)} seriesIndex={0} curve="monotone" markers={false} />
            <PointSeries points={pts} seriesIndex={0} radius={5} />
            <Axis
              scale={x}
              position="bottom"
              tickValues={shownTicks}
              format={((k: string) => labels[keys.indexOf(k)]) as (v: never) => string}
            />
            <Axis scale={y} position="start" tickValues={[1, 2, 3, 4, 5]} format={((v: number) => fmt(v)) as (v: never) => string} />
          </ChartPlot>
        );
      }}
    </ChartContainer>
  );
}
