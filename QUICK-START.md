# Quick Start

This project now supports multiple model providers through the local backend proxy.

Recommended provider for your GitHub account: GitHub Models.

## 1. Start frontend

```bash
cd /Users/sainathadepu/Documents/Supratik
python3 -m http.server 8000
```

Open:

http://localhost:8000/poshan_netlify.html

## 2. Create GitHub Models token

1. Open GitHub -> Settings -> Developer settings -> Personal access tokens
2. Create a fine-grained token
3. Grant permission for GitHub Models inference
4. Copy the token

Note: GitHub Models uses a GitHub token. It is not the same as an OpenAI API key.

## 3. Start backend proxy with GitHub Models

```bash
cd /Users/sainathadepu/Documents/Supratik
export MODEL_PROVIDER=github
export GITHUB_TOKEN='YOUR_GITHUB_TOKEN'
export GITHUB_MODEL='gpt-4o-mini'
node local_api_proxy.js
```

Production style single command:

```bash
MODEL_PROVIDER=github GITHUB_TOKEN='YOUR_GITHUB_TOKEN' GITHUB_MODEL='gpt-4o-mini' PORT=3000 node local_api_proxy.js
```

## 4. Set frontend runtime config

In browser console:

```js
setAppConfig({ MODE: 'backend', API_ENDPOINT: 'http://localhost:3000' }, { persist: true, persistSecrets: false });
location.reload();
```

## 5. Test flow

1. Select age
2. Upload meal image
3. Click Analyse
4. Validate detected foods and report
5. Open Ask Poshan and verify chat response

## Common issues

- API 401: token invalid or missing GitHub Models permission
- API 429/403: rate/entitlement limits on account or org policy
- API 500 from proxy: check provider env vars and restart proxy

For GitHub PATs ensure:

- Fine-grained token type
- Resource owner is correct account/org
- Models inference permission is enabled
