# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability in Sophie — AI Sales Intelligence Agent, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

### Contact

Email: **security@mantyl.ai**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Stage              | Target           |
| ------------------ | ---------------- |
| Acknowledgment     | Within 48 hours  |
| Initial assessment | Within 5 days    |
| Fix deployed       | Within 14 days   |
| Public disclosure  | After fix is live |

## Security Architecture

### API Key Management

All API keys (OpenAI, Anthropic) are stored as **Netlify environment variables**. They are:

- Injected into serverless functions at runtime
- Never present in client-side code
- Never committed to version control
- Rotatable without code changes (update in Netlify Dashboard, redeploy)

### CORS

Both serverless functions enforce an origin whitelist. Only requests from approved domains receive valid CORS headers.

### Input Validation

- Model whitelist prevents abuse of the OpenAI proxy (`gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` only)
- Token limits enforced server-side (max 2000) to prevent cost abuse
- HTTP method guard (POST only) on all endpoints

### Headers

Production responses include:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: microphone=(self)
```

### Data Handling

- Session data (conversation transcripts, uploaded documents) exists only in browser memory
- No data is persisted server-side beyond the AI provider's standard API logging
- No cookies, no tracking, no analytics
- File uploads are read client-side via `FileReader` and never sent to our servers — only text content is included in the AI prompt

## Known Considerations

| Item                          | Status    | Notes                                                |
| ----------------------------- | --------- | ---------------------------------------------------- |
| Rate limiting                 | Not implemented | Inherited from provider tier limits. Add for production scale. |
| Request logging               | Netlify default | Function invocations logged by Netlify. No request body logging. |
| Content filtering             | Provider-side | OpenAI and Anthropic apply their own content policies. |
| Input sanitization            | Minimal | User input is passed to AI models, not rendered as HTML. XSS risk is low. |
