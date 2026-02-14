# API Reference

> Sophie — AI Sales Intelligence Agent — serverless function endpoint specifications.

## Base URL

| Environment  | Base URL                           |
| ------------ | ---------------------------------- |
| Production   | `https://sophie.mantyl.ai`         |
| Preview      | `https://<deploy-id>.netlify.app`  |
| Local        | `http://localhost:8888`            |

---

## `POST /api/chat`

Proxies conversation requests to OpenAI. Used during the voice session phase for multi-turn dialogue.

### Request

```http
POST /api/chat HTTP/1.1
Content-Type: application/json
Origin: https://sophie.mantyl.ai
```

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are Sophie, an AI sales intelligence agent..." },
    { "role": "user", "content": "I want to talk about my engagement with Acme Corp." }
  ],
  "temperature": 0.7,
  "max_tokens": 800
}
```

### Parameters

| Field        | Type     | Required | Constraints                                     |
| ------------ | -------- | -------- | ----------------------------------------------- |
| `model`      | string   | Yes      | Must be one of: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` |
| `messages`   | array    | Yes      | OpenAI chat completion message format            |
| `temperature`| number   | No       | 0–2, defaults to model default                   |
| `max_tokens` | integer  | No       | Capped at 2000 server-side                       |

### Response — Success (200)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "gpt-4o-2024-08-06",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Thanks for sharing that context about Acme Corp..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 312,
    "completion_tokens": 89,
    "total_tokens": 401
  }
}
```

### Response — Error

| Status | Condition                    | Body                                                       |
| ------ | ---------------------------- | ---------------------------------------------------------- |
| 400    | Model not in whitelist       | `{ "error": { "message": "Model not allowed..." } }`       |
| 405    | Non-POST method              | `{ "error": "Method not allowed" }`                         |
| 500    | `OPENAI_API_KEY` not set     | `{ "error": { "message": "Server configuration error..." } }` |
| 500    | Unexpected exception         | `{ "error": { "message": "Internal server error." } }`      |

---

## `POST /api/debrief`

Proxies structured debrief requests to Anthropic Claude. Used after the voice session to generate the signal report, next moves, and draft follow-up email.

### Request

```http
POST /api/debrief HTTP/1.1
Content-Type: application/json
Origin: https://sophie.mantyl.ai
```

```json
{
  "system": "You are Sophie, an AI sales intelligence agent... You are now generating the post-session debrief.",
  "messages": [
    { "role": "user", "content": "Session started. I'm Jose..." },
    { "role": "assistant", "content": "Thanks Jose, tell me more about..." },
    { "role": "user", "content": "They mentioned budget concerns..." },
    { "role": "assistant", "content": "That's an important signal..." },
    { "role": "user", "content": "Based on the full conversation transcript above, generate a structured debrief..." }
  ],
  "max_tokens": 2000
}
```

### Parameters

| Field        | Type     | Required | Constraints                              |
| ------------ | -------- | -------- | ---------------------------------------- |
| `system`     | string   | No       | System prompt; extracted from conversation |
| `messages`   | array    | Yes      | Anthropic messages format (user/assistant alternating) |
| `max_tokens` | integer  | No       | Defaults to 2000                          |

### Response — Success (200)

```json
{
  "content": "## SIGNAL REPORT\nRisk Level: YELLOW\n- Budget concerns raised but not blocking...\n\n## RECOMMENDED NEXT MOVES\n1. Send ROI analysis within 48 hours...\n\n## DRAFT FOLLOW-UP MESSAGE\nSubject: Following up on our conversation...",
  "model": "claude-haiku-4-5-20251001",
  "usage": {
    "input_tokens": 1842,
    "output_tokens": 487
  }
}
```

> **Note:** The response is normalized. Anthropic's native `content[0].text` is flattened to a top-level `content` string for simpler frontend consumption.

### Response — Error

| Status | Condition                      | Body                                                             |
| ------ | ------------------------------ | ---------------------------------------------------------------- |
| 405    | Non-POST method                | `{ "error": "Method not allowed" }`                               |
| 500    | `ANTHROPIC_API_KEY` not set    | `{ "error": { "message": "Server configuration error..." } }`     |
| 500    | Anthropic API error            | `{ "error": { "message": "<upstream error message>" } }`          |
| 500    | Unexpected exception           | `{ "error": { "message": "Internal server error." } }`            |

---

## CORS Policy

Both endpoints enforce an origin whitelist:

```
https://sophie.mantyl.ai
https://tools.mantyl.ai
http://localhost:8888
http://localhost:3000
```

Preflight `OPTIONS` requests return `204` with appropriate headers. Requests from unlisted origins receive the first allowed origin as `Access-Control-Allow-Origin` (effectively rejecting cross-origin reads).

To add a new allowed origin, update the `ALLOWED_ORIGINS` array in both `chat.js` and `debrief.js`.

---

## Rate Limits

Rate limiting is inherited from the upstream providers:

| Provider   | Default Tier Limits                  | Recommended                          |
| ---------- | ------------------------------------ | ------------------------------------ |
| OpenAI     | Varies by org tier (TPM + RPM)       | Monitor via OpenAI dashboard          |
| Anthropic  | Varies by tier (RPM + TPM)           | Monitor via Anthropic console         |

For production deployments with significant traffic, consider adding a rate limiter at the Netlify Function level or using Netlify's built-in rate limiting features.

---

## Debrief Output Format

The debrief endpoint returns markdown with three expected sections:

```markdown
## SIGNAL REPORT
Risk Level: [GREEN | YELLOW | RED]
- Signal bullet 1
- Signal bullet 2
- Diagnosis paragraph

## RECOMMENDED NEXT MOVES
1. Highest priority action
2. Second priority
3. Third priority

## DRAFT FOLLOW-UP MESSAGE
Subject: [subject line]

[email body, ~150 words]

Best,
[Rep Name]
```

The frontend parses these sections by splitting on `## ` headings and matching keywords (`SIGNAL`, `NEXT`/`MOVE`/`ACTION`, `EMAIL`/`FOLLOW`/`MESSAGE`).
