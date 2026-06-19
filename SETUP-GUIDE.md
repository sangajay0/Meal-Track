# Poshan Path - Single Setup Guide

This is the only guide required to run and deploy the project on any machine.

## 1. What this project includes

- Frontend app: `poshan_netlify.html`
- Local API proxy: `local_api_proxy.js`
- Supported model providers in backend:
  - GitHub Models (recommended)
  - Anthropic
  - OpenAI-compatible endpoints

The frontend always calls backend endpoints:

- `POST /api/analyze-meal`
- `POST /api/chat`

## 2. Prerequisites (any machine)

Install:

- Git
- Node.js 18+ (Node 20+ recommended)
- Python 3.x
- Modern browser (Chrome/Edge/Safari/Firefox)

Verify:

```bash
git --version
node --version
python3 --version
```

## 3. Get project code

If cloning:

```bash
git clone <YOUR_REPO_URL>
cd Supratik
```

If already copied locally, open the project folder and continue.

## 4. Provider token setup

Choose one provider.

### A) GitHub Models (recommended)

1. GitHub -> Settings -> Developer settings -> Personal access tokens
2. Create **Fine-grained token**
3. Set correct resource owner
4. Enable **Models / inference read** permission
5. Copy token

### B) Anthropic

Create API key in Anthropic console.

### C) OpenAI

Use OpenAI API key from your account.

## 5. Start frontend + backend locally

Open two terminals.

Terminal 1 (frontend):

```bash
cd <PROJECT_PATH>
python3 -m http.server 8000
```

Terminal 2 (backend proxy):

### GitHub Models mode

```bash
cd <PROJECT_PATH>
MODEL_PROVIDER=github GITHUB_TOKEN='YOUR_GITHUB_TOKEN' GITHUB_MODEL='gpt-4o-mini' PORT=3000 node local_api_proxy.js
```

### Anthropic mode

```bash
cd <PROJECT_PATH>
MODEL_PROVIDER=anthropic ANTHROPIC_API_KEY='YOUR_ANTHROPIC_KEY' ANTHROPIC_MODEL='claude-sonnet-4-6' PORT=3000 node local_api_proxy.js
```

### OpenAI mode

```bash
cd <PROJECT_PATH>
MODEL_PROVIDER=openai OPENAI_API_KEY='YOUR_OPENAI_KEY' OPENAI_MODEL='gpt-4o-mini' PORT=3000 node local_api_proxy.js
```

Backend successful startup should print:

- `Poshan local API proxy running on http://localhost:3000`
- `Provider=<provider> Model=<model>`

## 6. Configure frontend runtime once

Open:

- `http://localhost:8000/poshan_netlify.html`

In browser console, run:

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'http://localhost:3000' }, { persist: true, persistSecrets: false });
location.reload();
```

## 7. End-to-end verification

1. Select age
2. Upload meal image
3. Click Analyse
4. Confirm food cards render
5. Go to score/report
6. Open Ask Poshan and send a chat message
7. Save session and verify history card appears

## 8. Common errors and fixes

### `The models permission is required to access this endpoint`

Your GitHub token is missing Models permission.

Fix:

- Regenerate fine-grained PAT
- Enable Models inference permission
- Restart backend terminal

### `API 401`

- Token invalid/revoked
- Wrong provider selected
- Token not exported in same terminal

### `API 400` on provider

- Request or account-level issue (for example billing, entitlement, model access)

### Port in use (`3000` or `8000`)

Find and stop process, then restart:

```bash
lsof -i :3000 -sTCP:LISTEN -n -P
lsof -i :8000 -sTCP:LISTEN -n -P
kill <PID>
```

## 9. Production readiness checklist

- Use backend mode only in production
- Keep secrets in environment variables only
- Never commit tokens to repository
- Restrict CORS to your frontend domain
- Run backend behind HTTPS (reverse proxy or managed platform)
- Add rate limiting and request logging
- Monitor provider errors and token expiry

## 10. Deploy on any machine/server

1. Install Node and Python
2. Copy repository
3. Set provider env vars
4. Start backend (`node local_api_proxy.js`)
5. Serve frontend (Nginx/static host or `python3 -m http.server` for basic use)
6. Set frontend runtime config to deployed backend URL

Example deployed frontend console config:

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'https://api.yourdomain.com' }, { persist: true, persistSecrets: false });
```

## 11. Security notes

- Do not store provider tokens in frontend code, HTML, markdown, or git history
- Rotate tokens immediately if exposed
- Prefer fine-grained least-privilege tokens
- Use separate tokens for dev and production
