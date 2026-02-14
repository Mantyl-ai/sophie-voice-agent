# Contributing

Thank you for your interest in contributing to Sophie — AI Sales Intelligence Agent.

## Development Setup

```bash
# Clone
git clone <repo-url>
cd sophie-voice-agent

# Environment
cp .env.example .env
# Add your OPENAI_API_KEY and ANTHROPIC_API_KEY to .env

# Run
npx netlify dev
# Opens at http://localhost:8888
```

## Project Structure

```
public/index.html         — Entire frontend (React 18 + Babel, single file)
netlify/functions/chat.js  — OpenAI proxy (voice conversation)
netlify/functions/debrief.js — Anthropic proxy (debrief generation)
netlify.toml               — Routing, headers, build config
```

There is no build step. Edit `public/index.html` and reload.

## Branch Strategy

| Branch     | Purpose                                |
| ---------- | -------------------------------------- |
| `main`     | Production — auto-deploys to Netlify   |
| `develop`  | Integration branch for active work     |
| `feat/*`   | Feature branches off `develop`         |
| `fix/*`    | Bug fix branches off `develop`         |
| `hotfix/*` | Urgent fixes branched from `main`      |

## Pull Request Process

1. Branch from `develop` (or `main` for hotfixes)
2. Make your changes
3. Test locally with `npx netlify dev`
4. Verify voice input/output works in Chrome
5. Open a PR with:
   - Clear description of what changed and why
   - Screenshots if UI changed
   - Confirmation that you tested voice, text input, and debrief generation
6. Request review from a maintainer
7. Squash-merge into target branch

## Code Style

- **No build tools.** The frontend is a single HTML file by design. Keep it that way.
- **Vanilla CSS.** Use CSS custom properties defined in `:root`. No Tailwind, no CSS-in-JS.
- **Serverless functions.** Keep them stateless, small, and focused. One function per concern.
- **No new dependencies** unless absolutely necessary. The project has zero `node_modules` in production.

## Adding a New AI Endpoint

1. Create `netlify/functions/<name>.js` following the pattern in `chat.js` or `debrief.js`
2. Add a redirect in `netlify.toml`: `from = "/api/<name>"` → `to = "/.netlify/functions/<name>"`
3. Add the required environment variable to `.env.example`
4. Update `docs/API.md` with the new endpoint spec
5. Update `ALLOWED_ORIGINS` in the new function

## Testing

Currently, testing is manual:

- Open in Chrome (required for Web Speech API)
- Test the full flow: Setup → Voice Session → Debrief
- Verify microphone and speaker functionality
- Test text input as fallback
- Verify error states (deny mic, bad API key)

Automated testing contributions welcome — see issues labeled `good first issue`.

## Security

- Never log or expose API keys
- Never commit `.env` files
- Keep `ALLOWED_ORIGINS` restrictive
- Report vulnerabilities per `SECURITY.md`
