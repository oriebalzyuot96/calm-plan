# Calm Plan

## ملخص بالعربية

**خطة الهدوء** أداة شخصية لدعم الذات تجمع ثلاثة أشياء: قائمة مهام يومية مع عادات صغيرة للعافية، وتسجيل للمزاج على مقياس من 1 إلى 5 مع رسم بياني لآخر 14 يومًا، ودردشة داعمة بسيطة.

**ما ليست عليه:** ليست علاجًا نفسيًا، ولا تشخيصًا لأي حالة، ولا بديلًا عن الطبيب أو خدمات الطوارئ والأزمات. لا تقدم نصائح طبية أو دوائية. إذا كنت تفكر في إيذاء نفسك، فاتصل الآن برقم الطوارئ في بلدك أو بشخص تثق به.

**التشغيل:** `node server/index.js` (يتطلب Node 24). البيانات محفوظة في قاعدة SQLite على الخادم، ويمكنك مسحها كاملة من صفحة الإعدادات.

---

## What it is

Calm Plan is a personal, bilingual (Arabic primary, English) self-help companion. It has three parts:

- **Today**: a to-do list with tasks and small wellbeing habits. Add, complete, delete, and reorder with the arrow buttons (no dragging).
- **Mood**: a 1 to 5 check-in with an optional note, and a 14-day chart drawn in SVG.
- **Chat**: a supportive conversation. It uses a local rule-based responder by default, or the Anthropic Messages API if you set `ANTHROPIC_API_KEY`.

## What it is not

- **Not therapy.** It does not replace a counsellor, psychologist, or psychiatrist.
- **Not a diagnosis.** It never assesses or names a condition.
- **Not medical advice.** The chat refuses medication, dosage, symptom, and diagnosis questions and redirects to a doctor or pharmacist.
- **Not a crisis service.** If the app detects self-harm or suicide language, it shows emergency and helpline guidance. It does not try to counsel the person through a crisis. **In an emergency, call your local emergency number.**

## How to run

Requires Node.js 24 or newer. There are no npm dependencies.

```bash
git clone <this repo> calm-plan
cd calm-plan
node server/index.js
# open http://localhost:3000
```

Run the tests:

```bash
npm test
```

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
- Preferences (language, theme) are stored in the browser's `localStorage`. Erasing data does not clear these preferences.
- Use HTTPS in any deployment.

## Crisis resources (owner to localise)

The crisis guidance in `server/chat/crisis.js` gives generic instructions and names example emergency numbers (911, 999, 112). **Before you use this with anyone, replace these with the correct resources for your country:**

- The emergency number for your country.
- A local mental-health helpline, with its number and hours.
- Any local services you trust.

Keyword lists are in `server/chat/crisis.js`. They are deliberately broad, so the app may show resources more often than needed. Review the Arabic wording with a native speaker.

## Deploy on Render

`render.yaml` describes a Node web service. It sets `DATA_FILE` to a persistent disk at `/var/data`, which requires a paid plan. If you do not need persistence, remove the `disk` block and point `DATA_FILE` at a path that exists. Set `ANTHROPIC_API_KEY` in the Render dashboard. It is not stored in the repository.

## Project layout

```
server/        node:http server, SQLite store (node:sqlite), validation, chat logic
server/chat/   crisis detection, local responder, Anthropic client
public/        static front end (HTML, CSS, ES modules, no build step)
test/          node:test suites
render.yaml    Render blueprint
```

## License

MIT. Copyright (c) 2026 Orieb Alzyuot. See `LICENSE`.
