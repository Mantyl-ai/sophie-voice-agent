# Deployment Guide

> Sophie — AI Sales Intelligence Agent — operations runbook for production deployment and maintenance.

## Prerequisites

| Requirement          | Version   | Purpose                          |
| -------------------- | --------- | -------------------------------- |
| Node.js              | >= 18     | Runtime for Netlify Functions     |
| Netlify CLI          | Latest    | Local dev and manual deploys      |
| Git                  | >= 2.30   | Version control                   |
| OpenAI API key       | —         | Voice conversation (GPT-4o)       |
| Anthropic API key    | —         | Debrief generation (Claude Haiku) |

## Environment Variables

Set these in **Netlify Dashboard > Site Settings > Environment Variables**:

| Variable             | Required | Description                            | Example                        |
| -------------------- | -------- | -------------------------------------- | ------------------------------ |
| `OPENAI_API_KEY`     | Yes      | OpenAI API key for GPT-4o             | `sk-proj-abc123...`            |
| `ANTHROPIC_API_KEY`  | Yes      | Anthropic API key for Claude Haiku     | `sk-ant-api03-abc123...`       |

Never commit these values. The `.env.example` file documents the expected shape.

## Deployment Methods

### Method 1: Git-Connected (Recommended)

1. Push repo to GitHub (public or private)
2. In Netlify Dashboard, click **Add new site > Import an existing project**
3. Connect your GitHub repo
4. Configure:
   - **Build command:** `echo 'Static site'` (or leave blank)
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Add environment variables in site settings
6. Every push to `main` triggers an automatic deploy

### Method 2: CLI Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and link to site
netlify login
netlify link

# Preview deploy (generates a unique URL)
netlify deploy

# Production deploy
netlify deploy --prod
```

### Method 3: Drag-and-Drop

Upload the `public/` folder directly to Netlify's deploy UI. Note: this won't include serverless functions. Use CLI or Git-connected for full functionality.

## Custom Domain Setup

### DNS Configuration

1. Netlify Dashboard > **Domain Settings > Add custom domain**
2. Enter `sophie.mantyl.ai` (or `tools.mantyl.ai/sophie`)
3. Add a CNAME record in your DNS provider:

```
Type:  CNAME
Name:  sophie
Value: <your-site>.netlify.app
TTL:   300
```

4. Netlify provisions SSL automatically via Let's Encrypt
5. HTTPS enforcement is enabled by default

### Subdirectory Deployment (tools.mantyl.ai/sophie)

If deploying under a subdirectory of an existing site, you'll need a reverse proxy or Netlify rewrite from the parent site:

```toml
# On the parent site's netlify.toml
[[redirects]]
  from = "/sophie/*"
  to = "https://sophie-voice-agent.netlify.app/:splat"
  status = 200
  force = true
```

## Updating CORS Origins

When your production domain changes, update the `ALLOWED_ORIGINS` array in both serverless functions:

```
netlify/functions/chat.js     — line 4
netlify/functions/debrief.js  — line 3
```

Add the new origin, commit, and redeploy.

## Monitoring

### Netlify Function Logs

```bash
# Stream real-time logs
netlify logs:function chat
netlify logs:function debrief

# Or view in Dashboard > Functions > chat/debrief > Logs
```

### Key Metrics to Watch

| Metric                        | Where to Check              | Alert Threshold       |
| ----------------------------- | --------------------------- | --------------------- |
| Function invocation count     | Netlify Dashboard           | > 10K/day (review)    |
| Function duration             | Netlify Dashboard           | > 10s (investigate)   |
| OpenAI token usage            | platform.openai.com         | Set billing alerts    |
| Anthropic token usage         | console.anthropic.com       | Set billing alerts    |
| Function errors (5xx)         | Netlify Logs                | Any non-zero          |
| CORS rejections               | Browser console / logs      | Any non-zero          |

### Cost Estimation

| Component        | Unit Cost (approx.)           | Per Session (~5 min)     |
| ---------------- | ----------------------------- | ------------------------ |
| GPT-4o input     | $2.50 / 1M tokens             | ~3K tokens → $0.0075    |
| GPT-4o output    | $10.00 / 1M tokens            | ~2K tokens → $0.02      |
| Claude Haiku in  | $0.80 / 1M tokens             | ~4K tokens → $0.0032    |
| Claude Haiku out | $4.00 / 1M tokens             | ~500 tokens → $0.002    |
| Netlify Functions| Free tier: 125K invocations   | $0.00                   |
| **Total**        |                               | **~$0.03 per session**  |

## Rollback

### Instant Rollback via Netlify

1. Dashboard > **Deploys** > Select any previous deploy
2. Click **Publish deploy**
3. Site reverts immediately (< 5 seconds)

### Git Rollback

```bash
git revert HEAD
git push origin main
# Auto-deploy picks up the revert
```

## Troubleshooting

| Symptom                              | Likely Cause                              | Fix                                      |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| "Server configuration error"         | Missing environment variable               | Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in Netlify settings |
| CORS errors in browser console       | Origin not in whitelist                    | Add your domain to `ALLOWED_ORIGINS`      |
| "Model not allowed"                  | Frontend requesting non-whitelisted model  | Check `allowedModels` in `chat.js`        |
| Microphone not working               | HTTPS required for Web Speech API          | Ensure site is served over HTTPS          |
| Sophie doesn't speak                 | No TTS voices available                    | Browser-dependent; Chrome recommended     |
| Debrief shows "Error"                | Anthropic API issue or rate limit          | Check `netlify logs:function debrief`     |
| Functions return 502                 | Function timeout (default 10s)             | Optimize prompt or increase timeout in `netlify.toml` |

## Health Check

Quick validation after any deploy:

```bash
# 1. Check the site loads
curl -s -o /dev/null -w "%{http_code}" https://sophie.mantyl.ai

# 2. Check chat function responds
curl -X POST https://sophie.mantyl.ai/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://sophie.mantyl.ai" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'

# 3. Check debrief function responds
curl -X POST https://sophie.mantyl.ai/api/debrief \
  -H "Content-Type: application/json" \
  -H "Origin: https://sophie.mantyl.ai" \
  -d '{"messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

Expected: 200 responses with valid JSON.
