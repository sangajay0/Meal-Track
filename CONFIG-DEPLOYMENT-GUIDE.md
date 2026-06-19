# Configuration and Deployment Guide

## Runtime architecture

Frontend calls local backend:

- /api/analyze-meal
- /api/chat

Backend routes to selected model provider via MODEL_PROVIDER.

## Frontend config

Set once in browser console:

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'http://localhost:3000' }, { persist: true, persistSecrets: false });
```

## Backend provider config

### GitHub Models

```bash
MODEL_PROVIDER=github
GITHUB_TOKEN=YOUR_GITHUB_TOKEN
GITHUB_MODEL=gpt-4o-mini
```

### Anthropic

```bash
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### OpenAI

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_MODEL=gpt-4o-mini
```

## Local deployment

Terminal 1:

```bash
cd /Users/sainathadepu/Documents/Supratik
python3 -m http.server 8000
```

Terminal 2:

```bash
cd /Users/sainathadepu/Documents/Supratik
# set env vars for chosen provider
node local_api_proxy.js
```

## Production deployment notes

- Run proxy behind HTTPS
- Inject env vars via host secret manager
- Restrict CORS to your frontend domain
- Add rate limiting and request logging
- Do not expose provider tokens to browser
