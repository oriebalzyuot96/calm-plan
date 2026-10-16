// Vite config for the React front end.
//
//   vite build              -> web/dist, served by the Node server (server/config.js)
//   vite build --mode demo  -> dist-demo/, static demo for GitHub Pages under /samples/calm-plan/
//
// The demo build adds <meta name="calm-plan-mode" content="demo"> (public/js/api.js then uses the
// in-memory demo store) and a CSP meta tag, because GitHub Pages cannot send headers.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { DEMO_CSP, assertNoInlineScripts } from '../scripts/build-demo.mjs';

const WEB = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(WEB, '..');

function calmPlanHtml(demo: boolean): Plugin {
  return {
    name: 'calm-plan-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        let out = html;
        if (demo) {
          out = out.replace(
            /<meta charset="utf-8">/i,
            (m) =>
              `${m}\n  <meta http-equiv="Content-Security-Policy" content="${DEMO_CSP}">` +
              '\n  <meta name="referrer" content="no-referrer">' +
              '\n  <meta name="calm-plan-mode" content="demo">',
          );
        }
        assertNoInlineScripts(out);
        return out;
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    root: WEB,
    base: demo ? '/samples/calm-plan/' : '/',
    plugins: [react(), calmPlanHtml(demo)],
    build: {
      outDir: demo ? path.join(ROOT, 'dist-demo') : path.join(WEB, 'dist'),
      emptyOutDir: true,
      // Fonts and images stay files: the CSP allows font-src 'self' only.
      assetsInlineLimit: 0,
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3000',
        '/health': 'http://localhost:3000',
      },
      fs: { allow: [ROOT] },
    },
    preview: { port: 4173 },
  };
});
