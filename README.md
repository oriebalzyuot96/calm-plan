# Calm Plan

## ملخص بالعربية

**خطة الهدوء** أداة شخصية لدعم الذات تجمع ثلاثة أشياء: قائمة مهام يومية مع عادات صغيرة للعافية، وتسجيل للمزاج على مقياس من 1 إلى 5 مع رسم بياني لآخر 14 يومًا، ودردشة داعمة بسيطة.

**ما ليست عليه:** ليست علاجًا نفسيًا، ولا تشخيصًا لأي حالة، ولا بديلًا عن الطبيب أو خدمات الطوارئ والأزمات. لا تقدم نصائح طبية أو دوائية. إذا كنت تفكر في إيذاء نفسك، فاتصل الآن برقم الطوارئ في بلدك أو بشخص تثق به.

**التشغيل:** `npm install` ثم `npm run build` ثم `npm start` (يتطلب Node 24). الواجهة مبنية بـ React ومكتبة Pelagic UI، والعربية هي اللغة الافتراضية. البيانات محفوظة في قاعدة SQLite على الخادم، ويمكنك مسحها كاملة من صفحة الإعدادات.

---

## What it is

Calm Plan is a personal, bilingual (Arabic primary, English) self-help companion:

- **Today**: a to-do list with tasks and small wellbeing habits, and a plant that grows as you finish them. Add, complete, delete, and reorder with the arrow buttons (no dragging).
- **Mood**: a 1 to 5 check-in with an optional note, and an accessible 14-day chart (keyboard navigable, with a data table).
- **Meditate**: short guided sessions (3 to 15 minutes) with a breathing orb, generated soundscapes (no audio files) and a sleep timer.
- **Chat**: a supportive conversation with suggestion chips and a guided breathing dialog. It uses a local rule-based responder by default, or the Anthropic Messages API if you set `ANTHROPIC_API_KEY`.
- **Settings**: language (Arabic, right to left, or English), light, dark or device theme, 11 colour themes, your own brand colour, contrast modes (high, yellow on black, grayscale), text size, motion, sound, and erase all data.

## Stack

- **Front end** (`web/`): React 19, Vite and TypeScript, built on [Pelagic UI](https://www.npmjs.com/package/pelagic) (`pelagic` on npm). It uses Pelagic's AnimatedTabs (a bottom bar on phones), Button, Input, Textarea, Checkbox, DatePicker, Segmented, RadioGroup, Slider, Switch, Card, Badge, Alert, Message, ProgressBar, EmptyState and illustrations, ColorPicker, ConfirmDialog, Dialog, Toaster, chart primitives, AccessibilityPanel, the theme engine (`switchTheme`, colour themes, `createTheme` for the brand colour), accessibility preferences, the UI sound engine and the icon set.
- **Shared logic**: the front end imports the existing modules instead of copying them: `public/js/shared/` (crisis detection and the local responder, also used by the server), `public/js/api.js` and `public/js/demo-store.js` (HTTP API or in-memory demo store), `public/js/meditation-core.js` and `public/js/sound.js` (session timeline and soundscape synthesis), and the strings in `public/js/i18n.js`.
- **Back end** (`server/`): plain `node:http` and `node:sqlite`, unchanged API. In production it serves the React build from `web/dist`, and falls back to the older vanilla front end in `public/` if `web/dist` is missing.

The strict Content Security Policy (`script-src 'self'; style-src 'self'`) is kept. There are no inline scripts. The brand colour is applied through CSS custom properties set with the CSSOM, because Pelagic's `applyCustomTheme()` injects a `<style>` element that this CSP would block.

## What it is not

- **Not therapy.** It does not replace a counsellor, psychologist, or psychiatrist.
- **Not a diagnosis.** It never assesses or names a condition.
- **Not medical advice.** The chat refuses medication, dosage, symptom, and diagnosis questions and redirects to a doctor or pharmacist.
- **Not a crisis service.** If the app detects self-harm or suicide language, it shows emergency and helpline guidance. It does not try to counsel the person through a crisis. **In an emergency, call your local emergency number.**

## How to run

Requires Node.js 24 or newer. The server itself has no npm dependencies; the front end is built with the dev dependencies.

```bash
git clone <this repo> calm-plan
cd calm-plan
npm install
npm run build      # builds the React front end into web/dist
npm start          # node server/index.js
# open http://localhost:3000
```

Development, with hot reload (the Vite dev server on http://localhost:5173 proxies `/api` and `/health` to the Node server on port 3000):

```bash
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Node server (watch mode) and the Vite dev server together. |
| `npm run build` | Production build of the front end into `web/dist`. |
| `npm run build:demo` | Static demo build into `dist-demo/` for GitHub Pages (see below). |
| `npm start` | Starts the server. |
| `npm test` | Server and shared tests (`node --test`), then the front-end tests (Vitest with jsdom). |
| `npm run typecheck` | TypeScript check of `web/`. |

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. |
| `ANTHROPIC_API_KEY` | (none) | If set, chat replies come from the Anthropic Messages API. If the call fails, the local responder is used. |
| `CHAT_MODEL` | `claude-haiku-5-5` | Model used when the API is enabled. |
| `DATA_FILE` | `data/calm-plan.db` | SQLite database file. Use a persistent disk path in production. |
| `TRUST_PROXY` | (off) | Set to `1` behind a reverse proxy (for example Render) so rate limiting uses the client address from `X-Forwarded-For`. |

## API

All endpoints are under `/api`. Responses are JSON.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks in order. |
| POST | `/api/tasks` | `{ title, dueDate?, category?: 'task' \| 'habit', done? }` |
| PATCH | `/api/tasks/:id` | Any of `title`, `done`, `dueDate`, `category`, `position`. |
| DELETE | `/api/tasks/:id` | Returns 204. |
| GET | `/api/moods?days=14` | Check-ins from the last N days (1 to 365). |
| POST | `/api/moods` | `{ score: 1-5, note?, createdAt? }`. Returns `{ mood, crisis }`. |
| POST | `/api/chat` | `{ messages: [{role, content}], lang: 'en' \| 'ar' }`. Returns `{ reply, kind, source, crisis }`. |
| DELETE | `/api/data` | Erases all tasks and moods. Requires the header `X-Confirm-Erase: yes`. |
| GET | `/health` | Health check. |

Limits: request bodies are capped at 8 KB, chat messages at 1000 characters, and each IP is limited to 120 `/api` requests per minute.

## Privacy

- Data is stored in a local SQLite file on the server you run. Nothing is sent to a third party unless you set `ANTHROPIC_API_KEY`.
- With the API enabled, **only the chat messages** of the current conversation are sent to Anthropic. Mood history and tasks are never sent.
- Chat transcripts are kept in the browser's memory only and are not saved on the server.
- The server does not log message contents, mood notes, or task titles.
- Only appearance, accessibility and sound preferences are stored in the browser's `localStorage`: `calmPlan.prefs` (language, sound), `calmPlan.brand` (your own colour), and Pelagic's `pelagic-ui-theme` (theme and colour theme), `pelagic-ui-a11y` (contrast, text size, motion and the other accessibility options) and `pl-sound` (interface sounds). Chat, mood and task text are never stored there. Erasing data does not clear these preferences. All sounds are generated live with the Web Audio API; there are no audio files.
- Use HTTPS in any deployment.

## Crisis resources (owner to localise)

The crisis guidance in `public/js/shared/crisis.js` gives generic instructions and names example emergency numbers (911, 999, 112). **Before you use this with anyone, replace these with the correct resources for your country:**

- The emergency number for your country.
- A local mental-health helpline, with its number and hours.
- Any local services you trust.

Keyword lists are in `public/js/shared/crisis.js`. They are deliberately broad, so the app may show resources more often than needed. Review the Arabic wording with a native speaker.

## Static demo (GitHub Pages)

`npm run build:demo` builds the React front end with Vite in demo mode into `dist-demo/` (ignored by git). It runs without the server:

- The Vite base is `/samples/calm-plan/`, so publish the folder at that path (for example `https://<user>.github.io/samples/calm-plan/`). Change `base` in `web/vite.config.ts` for another path.
- Tasks and moods live in memory in the browser tab (`public/js/demo-store.js`) and are cleared when the tab is closed. Nothing is written to `localStorage` except the preferences listed above.
- Chat uses the same rule-based responder and crisis detection as the server (`public/js/shared/`, imported by both). No API key and no network calls.
- The build adds a CSP meta tag and `<meta name="calm-plan-mode" content="demo">`, and fails if the page has an inline script.

Demo mode turns on with that meta tag, with `?demo=1`, or when `GET /health` fails. A banner says so in Arabic and English.

`npm run build:demo:legacy` still builds the older vanilla front end (`scripts/build-demo.mjs`).

## Deploy on Render

`render.yaml` describes a Node web service. The build command installs the dependencies and builds the front end (`npm ci && npm run build`). It sets `DATA_FILE` to a persistent disk at `/var/data`, which requires a paid plan. If you do not need persistence, remove the `disk` block and point `DATA_FILE` at a path that exists. Set `ANTHROPIC_API_KEY` in the Render dashboard. It is not stored in the repository.

## Project layout

```
server/        node:http server, SQLite store (node:sqlite), validation, chat logic
server/chat/   chat entry point and Anthropic client (re-exports the shared modules)
web/           React + Pelagic UI front end (Vite, TypeScript); web/test has the Vitest suites
public/js/shared/  crisis detection and local responder, shared by server, React app and demo
public/        older vanilla front end (fallback) and the shared modules the React app imports
scripts/       build-demo.mjs (legacy static demo build; its CSP helpers are reused by Vite)
test/          node:test suites
render.yaml    Render blueprint
```

## License

MIT. Copyright (c) 2026 Orieb Alzyuot. See `LICENSE`.
