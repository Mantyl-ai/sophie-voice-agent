# Sophie — AI Sales Intelligence Agent

[![Netlify Status](https://api.netlify.com/api/v1/badges/SITE_ID/deploy-status)](https://app.netlify.com/sites/sophie-voice-agent/deploys)

An AI-powered sales analyst by [Mantyl](https://mantyl.ai). Sales reps upload context about a prospect, have a live voice conversation with Sophie, and walk away with a signal report, recommended next moves, and a draft follow-up email — in under five minutes.

## How It Works

```
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │   1. SETUP  │──────▶│  2. VOICE   │──────▶│  3. DEBRIEF │
  │             │       │   SESSION   │       │             │
  │ Context     │       │ Live talk   │       │ Signal rpt  │
  │ Documents   │       │ with Sophie │       │ Next moves  │
  │ Metadata    │       │ via mic     │       │ Draft email │
  └─────────────┘       └─────────────┘       └─────────────┘
```

## Quick Start

```bash
git clone <repo-url> && cd sophie-voice-agent
cp .env.example .env          # Add your API keys
npx netlify dev                # http://localhost:8888
```

**Requirements:** Node >= 18, [Netlify CLI](https://docs.netlify.com/cli/get-started/), Chrome (for voice).

## Architecture

Sophie uses a **dual-model architecture** — each AI provider is chosen for what it does best:

| Task                  | Provider   | Model                      | Endpoint        |
| --------------------- | ---------- | -------------------------- | --------------- |
| Voice conversation    | OpenAI     | GPT-4o                     | `/api/chat`     |
| Sophie's voice (TTS)  | ElevenLabs | Turbo v2.5                 | `/api/tts`      |
| Debrief + email draft | Anthropic  | Claude Haiku 4.5            | `/api/debrief`  |

API keys live in Netlify environment variables. The frontend never touches credentials.

```
Browser ──POST──▶ Netlify Function ──▶ AI Provider
                  (chat.js / debrief.js / tts.js)
```

## Project Structure

```
public/
  index.html              # Single-file React 18 app (zero build step)
  sophie.png              # Character asset
netlify/functions/
  chat.js                 # OpenAI proxy — voice conversation
  tts.js                  # ElevenLabs proxy — Sophie's voice
  debrief.js              # Anthropic proxy — debrief generation
docs/
  ARCHITECTURE.md         # System design with diagrams
  API.md                  # Endpoint specifications
  DEPLOYMENT.md           # Ops runbook, costs, troubleshooting
.github/
  workflows/deploy.yml    # CI/CD pipeline
  ISSUE_TEMPLATE/         # Bug report + feature request
  pull_request_template.md
```

## Environment Variables

Set in **Netlify Dashboard > Site Settings > Environment Variables**:

| Variable             | Required | Provider   |
| -------------------- | -------- | ---------- |
| `OPENAI_API_KEY`     | Yes      | OpenAI     |
| `ANTHROPIC_API_KEY`  | Yes      | Anthropic  |
| `ELEVENLABS_API_KEY` | Yes      | ElevenLabs |

## Deploy to Production

### Option A: Git-Connected (recommended)

1. Push to GitHub
2. Connect repo in Netlify Dashboard
3. Set environment variables
4. Every push to `main` auto-deploys

### Option B: CLI

```bash
netlify login && netlify link
netlify deploy --prod
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for custom domains, cost estimation, monitoring, and troubleshooting.

## Documentation

| Document                                      | Contents                                        |
| --------------------------------------------- | ----------------------------------------------- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)| System design, data flow, security model         |
| [`docs/API.md`](docs/API.md)                  | Endpoint specs, request/response formats         |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)    | Ops runbook, DNS, monitoring, costs, rollback    |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Dev setup, branch strategy, code style           |
| [`SECURITY.md`](SECURITY.md)                  | Vulnerability reporting, security architecture   |
| [`CHANGELOG.md`](CHANGELOG.md)                | Version history                                  |

## Security

- API keys never reach the client — all AI requests proxied through serverless functions
- CORS origin whitelist on every endpoint
- Model whitelist + token ceiling on OpenAI proxy
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP
- Microphone scoped to self: `Permissions-Policy: microphone=(self)`
- Zero data persistence — session data lives only in browser memory

## Tech Stack

| Layer     | Technology                        |
| --------- | --------------------------------- |
| Frontend  | React 18 (CDN), vanilla CSS      |
| Backend   | Netlify Functions (Node 18)       |
| Voice In  | Web Speech API (SpeechRecognition)|
| Voice Out | ElevenLabs Turbo v2.5             |
| Chat AI   | OpenAI GPT-4o                     |
| Report AI | Anthropic Claude Haiku 4.5        |

## Cost per Session

~$0.03 (GPT-4o conversation + Claude Haiku debrief). See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for breakdown.

## License

[MIT](LICENSE) — Mantyl, Inc.
