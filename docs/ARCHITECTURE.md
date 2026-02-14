# Architecture

> Sophie Voice Agent — system design reference for engineers and reviewers.

## System Overview

Sophie is a browser-based AI sales intelligence tool. A sales rep provides context about a prospect, has a real-time voice conversation with an AI agent, and receives a structured debrief (signal report, next moves, and draft follow-up email). The entire session takes under five minutes.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   ┌──────────┐   ┌─────────────┐   ┌──────────────────────┐   │
│   │  Setup    │──▶│   Voice     │──▶│     Debrief          │   │
│   │  Phase    │   │   Session   │   │     Phase            │   │
│   │          │   │             │   │                      │   │
│   │ Context  │   │ SpeechRec  │   │ Signal Report        │   │
│   │ Docs     │   │ SpeechSyn  │   │ Next Moves           │   │
│   │ Metadata │   │ Live Chat  │   │ Draft Email          │   │
│   └──────────┘   └──────┬──────┘   └──────────┬───────────┘   │
│                          │                      │               │
│                     POST /api/chat         POST /api/debrief    │
└──────────────────────────┼──────────────────────┼───────────────┘
                           │                      │
                    ┌──────▼──────┐        ┌──────▼──────┐
                    │  Netlify    │        │  Netlify    │
                    │  Function   │        │  Function   │
                    │  chat.js    │        │  debrief.js │
                    └──────┬──────┘        └──────┬──────┘
                           │                      │
                    ┌──────▼──────┐        ┌──────▼──────┐
                    │   OpenAI    │        │  Anthropic  │
                    │   GPT-4o   │        │  Claude     │
                    │             │        │  Haiku      │
                    └─────────────┘        └─────────────┘
```

## Dual-Model Architecture

Two AI providers are used, each chosen for its strengths:

| Concern            | Provider       | Model                      | Rationale                                                |
| ------------------ | -------------- | -------------------------- | -------------------------------------------------------- |
| Voice conversation | OpenAI         | `gpt-4o`                   | Lowest latency for multi-turn dialogue; strong at open-ended questioning |
| Debrief generation | Anthropic      | `claude-haiku-4-5-20251001` | Structured output at lower cost; strong at synthesis and formatting |

The frontend never touches API keys. Both models are called through Netlify Functions that act as authenticated proxies.

## Request Flow

### Voice Conversation (`/api/chat`)

```
Browser                   Netlify Function (chat.js)          OpenAI
   │                              │                              │
   │  POST /api/chat              │                              │
   │  { model, messages,          │                              │
   │    temperature, max_tokens } │                              │
   │─────────────────────────────▶│                              │
   │                              │  Validate origin (CORS)      │
   │                              │  Validate model whitelist    │
   │                              │  Enforce token ceiling (2000)│
   │                              │                              │
   │                              │  POST /v1/chat/completions   │
   │                              │  Authorization: Bearer $KEY  │
   │                              │─────────────────────────────▶│
   │                              │                              │
   │                              │◀─────────────────────────────│
   │◀─────────────────────────────│  Proxy response verbatim     │
   │                              │                              │
```

### Debrief Report (`/api/debrief`)

```
Browser                   Netlify Function (debrief.js)       Anthropic
   │                              │                              │
   │  POST /api/debrief           │                              │
   │  { system, messages,         │                              │
   │    max_tokens }              │                              │
   │─────────────────────────────▶│                              │
   │                              │  Validate origin (CORS)      │
   │                              │  Extract system prompt       │
   │                              │                              │
   │                              │  POST /v1/messages           │
   │                              │  x-api-key: $KEY             │
   │                              │  anthropic-version: 2023-06-01│
   │                              │─────────────────────────────▶│
   │                              │                              │
   │                              │◀─────────────────────────────│
   │                              │  Normalize: { content, model,│
   │                              │    usage }                   │
   │◀─────────────────────────────│                              │
   │                              │                              │
```

## Frontend Architecture

The frontend is a **zero-build single-file React 18 application**. This is an intentional design choice — it eliminates build tooling, CI pipelines, and bundler config while remaining fully functional for a tool of this scope.

### Technology Choices

| Layer          | Technology                 | Why                                                     |
| -------------- | -------------------------- | ------------------------------------------------------- |
| UI Framework   | React 18 (CDN + Babel)     | Component model without build step; fast iteration      |
| Styling        | Vanilla CSS custom props   | No runtime overhead; full control of design tokens      |
| Voice Input    | Web Speech API (STT)       | Native browser support, no third-party dependency       |
| Voice Output   | Web Speech API (TTS)       | Zero-latency playback, no audio streaming costs         |
| HTTP           | Native `fetch`             | No axios/superagent; keeps bundle at zero               |

### Component Structure

```
App (root)
├── Header              — Mantyl branding, Sophie pill, CTA
├── Hero                — Marketing landing section with Sophie character
├── StepIndicator       — Setup → Session → Debrief progress
│
├── SetupPhase          — Form: email, name, prospect, stage, notes, files
│   ├── FileUploader    — Drag-and-drop with FileReader text extraction
│   └── Validation      — Required fields with inline error states
│
├── SessionPhase        — Real-time voice conversation
│   ├── TranscriptView  — Scrolling message thread (user/Sophie)
│   ├── VoiceControls   — Mic toggle, end session, text input fallback
│   └── OrbVisualizer   — Animated state indicator (idle/speaking/listening)
│
└── DebriefPhase        — Structured output display
    ├── SignalReport     — Risk level (GREEN/YELLOW/RED) + key signals
    ├── NextMoves        — Prioritized action items
    └── DraftEmail       — Copy-ready follow-up with subject line
```

### State Management

All state lives in the root `App` component via `useState` hooks. A `useRef` (`mr`) holds the current message array for async callbacks that would otherwise capture stale closures.

| State    | Type     | Purpose                                     |
| -------- | -------- | ------------------------------------------- |
| `step`   | string   | Current phase: `setup`, `session`, `debrief` |
| `msgs`   | array    | Full conversation history (OpenAI format)    |
| `tx`     | array    | UI transcript entries `{ role, text }`       |
| `brief`  | string   | Raw debrief markdown from Claude             |
| `hear`   | boolean  | Microphone active                            |
| `talk`   | boolean  | Sophie TTS speaking                          |
| `think`  | boolean  | Waiting for AI response                      |

## Security Model

### API Key Isolation

```
┌──────────────────┐
│    Browser        │  ← No secrets. No API keys. No tokens.
│    (public)       │
└────────┬─────────┘
         │ HTTPS only
┌────────▼─────────┐
│  Netlify Function │  ← Keys injected via environment variables
│  (serverless)     │     at deploy time. Never in source code.
└────────┬─────────┘
         │
┌────────▼─────────┐
│  AI Provider API  │
└──────────────────┘
```

### Defense Layers

| Layer              | Implementation                                                    |
| ------------------ | ----------------------------------------------------------------- |
| CORS               | Origin whitelist checked on every request                         |
| Model whitelist    | Only `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` accepted             |
| Token ceiling      | `max_tokens` capped at 2000 server-side                           |
| HTTP method guard  | Only `POST` accepted; all others return 405                       |
| Security headers   | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP   |
| Microphone policy  | `Permissions-Policy: microphone=(self)` — no third-party mic access |
| Input validation   | Required fields enforced client-side before any API call          |

## Performance Characteristics

| Metric                  | Typical Value        | Notes                                   |
| ----------------------- | -------------------- | --------------------------------------- |
| Cold start (function)   | ~200ms               | Netlify Functions on Node 18            |
| Chat round-trip         | 800ms–2s             | GPT-4o streaming not used (full response) |
| Debrief generation      | 2–4s                 | Claude Haiku, ~1500 tokens output       |
| Frontend bundle         | 0 KB (CDN)           | React + Babel loaded from unpkg CDN     |
| Static assets           | ~350 KB              | Sophie PNG + inline CSS/JS              |
| Lighthouse Performance  | 90+                  | No build artifacts, minimal JS          |

## Failure Modes

| Scenario                     | Behavior                                              |
| ---------------------------- | ----------------------------------------------------- |
| OpenAI API down              | Error banner shown; session stays active for retry     |
| Anthropic API down           | Debrief shows error message; conversation data preserved |
| Missing env var              | Function returns 500 with descriptive message          |
| Microphone denied            | Fallback to text input; error toast shown              |
| Browser lacks Web Speech API | Text-only mode; mic button disabled with explanation   |
| CORS mismatch                | Request blocked; no data exposure                      |

## File Map

```
sophie-voice-agent/
├── public/
│   ├── index.html              # 47 KB — entire frontend application
│   └── sophie.png              # Character asset (transparent PNG)
├── netlify/
│   └── functions/
│       ├── chat.js             # OpenAI proxy — conversation
│       └── debrief.js          # Anthropic proxy — report generation
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── API.md                  # Endpoint specifications
│   └── DEPLOYMENT.md           # Ops runbook
├── .github/
│   ├── ISSUE_TEMPLATE/         # Bug report + feature request templates
│   ├── pull_request_template.md
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── netlify.toml                # Build config, redirects, headers
├── package.json                # Metadata + scripts
├── .env.example                # Environment variable template
├── .gitignore
├── ARCHITECTURE.md → docs/     # Symlink or redirect
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md
```
