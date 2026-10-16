#!/usr/bin/env node
// Builds the static demo (no server) into dist-demo/.
//
//   node scripts/build-demo.mjs [--out dist-demo]
//
// - Copies public/ as is (including js/shared, used for the in-browser chat).
// - Rewrites root-absolute href/src/url() paths to relative ones, so the
//   site works under any sub-path such as /samples/calm-plan/ on GitHub Pages.
// - Injects <meta name="calm-plan-mode" content="demo"> and a CSP meta tag
//   (GitHub Pages cannot send headers). No inline scripts are added.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// frame-ancestors is not allowed in a meta CSP, so it is left out here.
export const DEMO_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

/** Turns "/styles.css" into "styles.css". Leaves "//host", "#x", "data:" and relative paths alone. */
export function relativize(text) {
  return text
    .replace(/(\s(?:href|src)\s*=\s*")\/(?!\/)([^"]*)"/gi, (_, a, p) => `${a}${p || './'}"`)
    .replace(/url\(\s*(["']?)\/(?!\/)([^"')]*)\1\s*\)/gi, (_, q, p) => `url(${q}${p}${q})`);
}

export function transformIndex(html) {
  let out = relativize(html);
  if (!/name="calm-plan-mode"/.test(out)) {
    const tags =
      `\n  <meta http-equiv="Content-Security-Policy" content="${DEMO_CSP}">` +
      '\n  <meta name="referrer" content="no-referrer">' +
      '\n  <meta name="calm-plan-mode" content="demo">';
    out = out.replace(/<meta charset="utf-8">/i, (m) => m + tags);
    if (!/name="calm-plan-mode"/.test(out)) throw new Error('could not inject the demo meta tag');
  }
  return out;
}

/** Throws if the HTML contains an inline script or an inline event handler. */
export function assertNoInlineScripts(html) {
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\ssrc\s*=/i.test(m[1]) || m[2].trim()) throw new Error('inline script found');
  }
  if (/\son[a-z]+\s*=/i.test(html)) throw new Error('inline event handler found');
  if (/javascript:/i.test(html)) throw new Error('javascript: URL found');
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

export async function buildDemo({ src = path.join(ROOT, 'public'), out = path.join(ROOT, 'dist-demo') } = {}) {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(src, out, { recursive: true });

  for (const file of await walk(out)) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') {
      const html = transformIndex(await readFile(file, 'utf8'));
      assertNoInlineScripts(html);
      await writeFile(file, html);
    } else if (ext === '.css') {
      await writeFile(file, relativize(await readFile(file, 'utf8')));
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = i > -1 ? path.resolve(process.argv[i + 1]) : undefined;
  const dir = await buildDemo(out ? { out } : {});
  console.log(`demo built in ${path.relative(process.cwd(), dir) || dir}`);
}
