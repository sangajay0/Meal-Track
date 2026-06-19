# Quick Start

## 1. Run the app locally

Terminal 1 (frontend):

```bash
cd /Users/sainathadepu/Documents/Supratik
python3 -m http.server 8000
```

Terminal 2 (backend proxy):

```bash
cd /Users/sainathadepu/Documents/Supratik
export ANTHROPIC_API_KEY='your-real-key'
node local_api_proxy.js
```

Open:

http://localhost:8000/poshan_netlify.html

## 2. Recommended config (production-safe)

The app now defaults to backend mode. Configure your backend URL and run:

```js
window.setAppConfig({
  MODE: 'backend',
  API_ENDPOINT: 'http://localhost:3000'
}, { persist: true, persistSecrets: false });
```

Reload the page after setting config.

## 3. Optional direct mode (testing only)

Use this only for private local testing.

```js
window.setAppConfig({
  MODE: 'direct',
  API_KEY: 'sk-ant-REPLACE_ME'
}, { persist: true, persistSecrets: false });
```

Note: with persistSecrets false, API_KEY will not be saved to localStorage.

## 4. Verify end-to-end flow

1. Select age group
2. Upload meal image (JPG/PNG)
3. Click Analyse
4. Confirm detected items
5. Fill tray and view score/report
6. Open Ask Poshan chat

## Modify config anytime

Read current config:

```js
window.setAppConfig({}, { persist: false })
```

Switch back to defaults quickly:

```js
localStorage.removeItem('pp_cfg');
location.reload();
```

## Common issues

- If analysis falls back to demo meal: verify backend URL or API key config.
- If upload is blocked: only JPG/PNG under 50MB are accepted.
- If backend mode fails: ensure backend exposes /api/analyze-meal and /api/chat.
- If you see API 500 from backend with valid config: check Anthropic billing/credits for the API key.
- If you see API 401 invalid x-api-key: key is wrong/revoked; replace ANTHROPIC_API_KEY and restart local_api_proxy.js.

See /Users/sainathadepu/Documents/Supratik/backend-setup-guide.md for backend setup.

