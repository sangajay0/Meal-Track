# Backend Setup Guide

This guide configures local_api_proxy.js for provider switching.

## Supported providers

- github (default)
- anthropic
- openai

## Environment variables

### GitHub Models (recommended)

```bash
export MODEL_PROVIDER=github
export GITHUB_TOKEN='YOUR_GITHUB_TOKEN'
export GITHUB_MODEL='gpt-4o-mini'
```

### Anthropic

```bash
export MODEL_PROVIDER=anthropic
export ANTHROPIC_API_KEY='YOUR_ANTHROPIC_KEY'
export ANTHROPIC_MODEL='claude-sonnet-4-6'
```

### OpenAI

```bash
export MODEL_PROVIDER=openai
export OPENAI_API_KEY='YOUR_OPENAI_KEY'
export OPENAI_MODEL='gpt-4o-mini'
# optional custom base URL
# export OPENAI_URL='https://api.openai.com/v1/chat/completions'
```

## Run backend

```bash
cd /Users/sainathadepu/Documents/Supratik
node local_api_proxy.js
```

Expected startup logs:

- Poshan local API proxy running on http://localhost:3000
- Provider=<provider> Model=<model>

## Endpoints used by frontend

- POST /api/analyze-meal
- POST /api/chat

No frontend code changes required beyond setting MODE=backend and API_ENDPOINT.

## GitHub token generation steps

1. GitHub Settings
2. Developer settings
3. Personal access tokens
4. Fine-grained token
5. Allow GitHub Models inference permission
6. Save token securely

Security note: never commit tokens to files or git history.
