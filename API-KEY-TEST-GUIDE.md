# API Configuration Test Guide

## Goal

Validate that image analysis and chat are using your configured mode correctly:

- backend mode (recommended)
- direct mode (local testing only)

## A. Backend mode validation (recommended)

Set config in browser console:

```js
window.setAppConfig({
  MODE: 'backend',
  API_ENDPOINT: 'http://localhost:3000'
}, { persist: true, persistSecrets: false });
location.reload();
```

Expected behavior:

1. Upload an image (JPG/PNG)
2. Click Analyse
3. Meal items should come from API response (not demo fallback)
4. Ask Poshan chat should return backend response

If it fails:

- Check backend is running
- Check endpoint path support:
  - /api/analyze-meal
  - /api/chat
- Check browser Network tab for HTTP status

## B. Direct mode validation (testing only)

```js
window.setAppConfig({
  MODE: 'direct',
  API_KEY: 'sk-ant-REPLACE_ME'
}, { persist: false, persistSecrets: false });
location.reload();
```

Expected behavior:

- Analyse and chat call Anthropic endpoint directly
- Invalid key should show API error then demo fallback for analysis

## C. Reset config

```js
localStorage.removeItem('pp_cfg');
location.reload();
```

## Security checklist

- Never hardcode real API keys in source files
- Keep production in backend mode
- Do not persist secrets in browser storage
- Rotate keys if previously exposed
