# Jisr

Online teaching platform for English instructors — courses, lessons, quizzes, live sessions, student tracking, and messaging in one tool, with AI built in to handle the repetitive work (lesson generation, quiz creation, audio for pronunciation, AI grading).

**Live:** [jisrteach.com](https://jisrteach.com)

---

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui + Radix UI + Lucide
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime) + Postgres RLS
- **AI layer:** Vercel AI SDK with Claude (Anthropic), OpenAI, and Gemini (Google)
- **Rate limiting:** Upstash Redis
- **Email:** Resend
- **State:** React Query (server data) + React Hook Form + Zod
- **Deployment:** Vercel

---

## Architecture highlights

A few places worth opening if you're reading the code:

- [`supabase/schema.sql`](supabase/schema.sql) — full data model in one file
- [`supabase/migrations/`](supabase/migrations/) — 30+ migrations showing how the schema evolved (RLS policies, RPCs, AI telemetry tables, waitlist)
- [`src/lib/ai/`](src/lib/ai/) — AI layer: prompt versioning, schema validation with auto-repair, cost tracking, evaluation tooling
- [`src/lib/services/`](src/lib/services/) — server-side logic: AI generators, rate limiting (Upstash), notifications, email, invites
- [`src/app/api/`](src/app/api/) — thin route handlers (parse input → call a service → return)

---

## What's interesting in here

- **Multi-provider AI layer** (Claude / OpenAI / Gemini) via the Vercel AI SDK, with structured-output validation, retry/repair, and per-feature timeouts
- **Tier-gated AI quotas** — `free` / `pro` / `studio` tiers with monthly limits enforced server-side
- **Rate limiting on AI + auth routes** via Upstash Redis (10/min per user on AI, 5/min per IP on signup)
- **Postgres RLS** for every tenant boundary — students see only what their instructor publishes, instructors see only their own data, admins gated by an `is_admin()` SQL function
- **AI telemetry table** logging every generation (cost, latency, tokens, schema validity, instructor acceptance) for cost tracking, quota enforcement, and prompt A/B testing
- **TTS + audio grading** — OpenAI TTS for conversation audio (cached), Whisper for student voice transcription, grading pipeline scores grammar + pronunciation
- **Strict TypeScript + ESLint** enforced via GitHub Actions CI on every commit

---

## Getting started (local dev)

```bash
git clone https://github.com/AyouubElb/jisr.git
cd jisr
npm install

# Copy the env template and fill in real values
cp .env.example .env.local
# Edit .env.local with your Supabase, AI provider, Upstash, and Resend keys

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run migrations against a fresh Supabase project, apply files under `supabase/migrations/` in order via the Supabase SQL editor.

---

## License

Source-available for review purposes only. Not licensed for redistribution or commercial use.

---

## Contact

- **Author:** Ayoub El Bouasri — [ayoub.elbouuasri@gmail.com](mailto:ayoub.elbouuasri@gmail.com)
- **LinkedIn:** [linkedin.com/in/ayoub-el-bouasri](https://www.linkedin.com/in/ayoub-el-bouasri)
