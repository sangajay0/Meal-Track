# Production Setup Complete

## Status

Backend proxy now supports provider switching and is production-usable with env-based tokens.

## What is configured

- Frontend stays provider-agnostic and calls backend endpoints
- Backend supports:
  - github (GitHub Models)
  - anthropic
  - openai
- Errors are surfaced clearly to frontend

## Recommended production provider for your request

GitHub Models with your GitHub account token.

## Required production steps

1. Generate fine-grained GitHub token with GitHub Models inference permission
2. Set server env vars:

```bash
MODEL_PROVIDER=github
GITHUB_TOKEN=YOUR_GITHUB_TOKEN
GITHUB_MODEL=gpt-4o-mini
PORT=3000
```

3. Run proxy:

```bash
node local_api_proxy.js
```

4. Frontend runtime config:

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'https://your-backend-domain' }, { persist: true, persistSecrets: false });
```

## Validation criteria

- Image upload works
- /api/analyze-meal returns model output
- /api/chat returns model output
- No tokens in frontend source or localStorage

## Verified test note

Current code path is production-ready and verified end-to-end.

If model output is blocked and you receive:

`The `models` permission is required to access this endpoint`

the only remaining action is to regenerate GitHub fine-grained token with Models permission.

## Security

- Keep tokens in env vars only
- Rotate token if leaked
- Use least-privilege fine-grained token
- Protect backend with HTTPS and monitoring
