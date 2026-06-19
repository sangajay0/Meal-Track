# API and Token Test Guide

Use this checklist after setting your provider token.

## A. Backend mode setup

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'http://localhost:3000' }, { persist: true, persistSecrets: false });
location.reload();
```

## B. Verify backend provider

Backend terminal should print:

- Provider=github Model=...

or the provider you selected.

## C. Analyze image test

1. Upload image
2. Click Analyse
3. Confirm no fallback message appears
4. Confirm food list is populated

## D. Chat test

1. Open Ask Poshan
2. Send message
3. Confirm response is model-generated

## E. Failure diagnostics

- API 401 invalid token: token wrong/revoked/permission missing
- API 403: entitlement/org policy issue
- API 429: throttling/rate limit
- API 400: model/input request issue

### GitHub-specific auth error

If you see:

`The `models` permission is required to access this endpoint`

Your token is valid but missing GitHub Models permission.

Fix:

1. Regenerate fine-grained PAT
2. Enable GitHub Models inference/models permission
3. Save and restart backend proxy

## F. Security checklist

- Keep secrets in env vars only
- Do not store secrets in docs or source
- Rotate token if ever exposed
