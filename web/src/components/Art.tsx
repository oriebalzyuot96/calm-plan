import type { CSSProperties } from 'react';

/** The Calm Plan whale. Decorative. */
export function Logo() {
  return (
    <svg className="cp-logo" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle className="cp-logo__bg" cx="20" cy="20" r="19" />
      <path
        className="cp-logo__whale"
        d="M6 22c0-6 5-10 12-10 6 0 10 3 11 8 1-2 3-4 6-4-1 5-3 8-7 9-3 4-9 6-14 4-5-1-8-3-8-7z"
      />
      <circle className="cp-logo__eye" cx="12" cy="21" r="1.3" />
      <path className="cp-logo__spout" d="M15 11c-1-3-3-4-4-4m4 4c1-3 3-4 4-4" fill="none" />
    </svg>
  );
}

/** The habit plant. It grows in four stages with the share of tasks that are done. Decorative. */
export function Plant({ stage }: { stage: number }) {
  const on = (n: number) => (stage >= n ? 'true' : 'false');
  return (
    <svg className="cp-plant" viewBox="0 0 160 200" data-stage={stage} aria-hidden="true" focusable="false">
      <ellipse className="cp-plant__shadow" cx="80" cy="192" rx="46" ry="6" />
      <g className="cp-plant__sway">
        <path className="cp-plant__stem" d="M80 160V132" />
        <path className="cp-plant__stem cp-pg" data-on={on(2)} d="M80 132V98" />
        <path className="cp-plant__stem cp-pg" data-on={on(3)} d="M80 98V66" />
        <g className="cp-pg" data-on={on(1)}>
          <path className="cp-plant__leaf" d="M80 138c-16-2-24-12-26-22 14 0 25 8 26 22z" />
          <path className="cp-plant__leaf" d="M80 138c14-2 22-10 24-20-13 0-23 6-24 20z" />
        </g>
        <g className="cp-pg" data-on={on(2)}>
          <path className="cp-plant__leaf cp-plant__leaf--2" d="M80 112c-18-2-28-12-30-24 16 0 29 9 30 24z" />
          <path className="cp-plant__leaf cp-plant__leaf--2" d="M80 106c16-2 26-10 28-22-15 0-27 8-28 22z" />
        </g>
        <g className="cp-pg" data-on={on(3)}>
          <path className="cp-plant__leaf" d="M80 84c-14-2-22-10-24-20 12 0 22 7 24 20z" />
          <path className="cp-plant__leaf" d="M80 78c13-2 20-8 22-18-11 0-20 6-22 18z" />
        </g>
        <g className="cp-pg cp-plant__bloom" data-on={on(4)}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} className="cp-plant__petal" cx="80" cy="40" rx="7" ry="12" transform={`rotate(${r} 80 54)`} />
          ))}
          <circle className="cp-plant__heart" cx="80" cy="54" r="6" />
        </g>
        <circle className="cp-pg cp-plant__bud" data-on={stage === 3 ? 'true' : 'false'} cx="80" cy="60" r="6" />
      </g>
      <path className="cp-plant__pot" d="M52 158h56l-6 34H58z" />
      <rect className="cp-plant__rim" x="48" y="152" width="64" height="10" rx="4" />
    </svg>
  );
}

/**
 * Breathing orb. `scale` is 0..1 (from meditation-core phaseAt), `ring` the progress 0..1.
 * The values are set through the CSSOM (allowed by the CSP), not a style attribute in HTML.
 */
export function Orb({ scale, ring, phase, count }: { scale: number; ring: number; phase: string; count: string }) {
  const style = { '--orb-scale': scale.toFixed(3), '--ring': Math.max(0, Math.min(1, ring)).toFixed(4) } as CSSProperties;
  return (
    <div className="cp-orb" style={style}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <circle className="cp-orb__track" cx="100" cy="100" r="92" />
        <circle className="cp-orb__ring" cx="100" cy="100" r="92" pathLength={1} />
        <circle className="cp-orb__glow" cx="100" cy="100" r="70" />
        <circle className="cp-orb__core" cx="100" cy="100" r="58" />
      </svg>
      <div className="cp-orb__text" aria-hidden="true">
        <span className="cp-orb__phase">{phase}</span>
        <span className="cp-orb__count">{count}</span>
      </div>
    </div>
  );
}
