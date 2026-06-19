const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const PROVIDER = String(process.env.MODEL_PROVIDER || 'github').toLowerCase();

const ANTHROPIC = {
  key: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  url: 'https://api.anthropic.com/v1/messages',
  version: '2023-06-01'
};

const GITHUB = {
  key: process.env.GITHUB_TOKEN || '',
  model: process.env.GITHUB_MODEL || 'gpt-4o-mini',
  url: 'https://models.inference.ai.azure.com/chat/completions'
};

const OPENAI = {
  key: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  url: process.env.OPENAI_URL || 'https://api.openai.com/v1/chat/completions'
};

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 60 * 1024 * 1024) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function requiredKey() {
  if (PROVIDER === 'anthropic') return ANTHROPIC.key;
  if (PROVIDER === 'openai') return OPENAI.key;
  return GITHUB.key;
}

function currentModel() {
  if (PROVIDER === 'anthropic') return ANTHROPIC.model;
  if (PROVIDER === 'openai') return OPENAI.model;
  return GITHUB.model;
}

function buildAnalysisPrompt(ageGroup) {
  return `You are Poshan, a school meal nutrition assistant for Indian schools. Analyze the meal and respond ONLY as strict JSON with this exact structure: {"items":[{"name":"food","role":"carb|protein|vegetable|extra|optional","amount_g":number,"k":number,"p":number,"c":number,"f":number,"i":number,"ca":number,"va":number,"vc":number}],"summary":"one sentence"}. Use realistic ICMR/NIN style estimates. Age group: ${ageGroup || 'unknown'}.`;
}

async function parseError(resp) {
  const text = await resp.text();
  let message = `Provider ${resp.status}`;
  let details = text.slice(0, 1000);
  try {
    const parsed = JSON.parse(text);
    message = String(parsed?.error?.message || parsed?.message || message);
    details = parsed;
  } catch (e) {
    // keep text details
  }
  throw new HttpError(resp.status, message, details);
}

async function callAnthropic({ system, messages, max_tokens }) {
  const resp = await fetch(ANTHROPIC.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC.key,
      'anthropic-version': ANTHROPIC.version
    },
    body: JSON.stringify({
      model: ANTHROPIC.model,
      max_tokens,
      system,
      messages
    })
  });
  if (!resp.ok) return parseError(resp);
  return resp.json();
}

function oaContentFromMessages(messages, imageDataUrl) {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => {
      if (typeof m.content === 'string') return m.content;
      if (!Array.isArray(m.content)) return '';
      return m.content.map(c => c.text || '').join('\n');
    })
    .join('\n')
    .trim();

  const content = [{ type: 'text', text: userText || 'Analyze this meal image and return JSON only.' }];
  if (imageDataUrl) {
    content.push({ type: 'image_url', image_url: { url: imageDataUrl } });
  }
  return content;
}

async function callOpenAICompat({ system, messages, max_tokens, image_b64, image_type, jsonMode }) {
  const isOpenAI = PROVIDER === 'openai';
  const cfg = isOpenAI ? OPENAI : GITHUB;
  const imageDataUrl = image_b64 ? `data:${image_type || 'image/jpeg'};base64,${image_b64}` : '';

  const payload = {
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: oaContentFromMessages(messages, imageDataUrl) }
    ],
    max_tokens,
    temperature: 0.2
  };
  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const resp = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.key}`
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) return parseError(resp);
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content;
  let text = '';
  if (typeof raw === 'string') text = raw;
  else if (Array.isArray(raw)) text = raw.map(p => p?.text || '').join('');
  return { content: [{ text }] };
}

async function callModel({ system, messages, max_tokens, image_b64, image_type, jsonMode }) {
  if (PROVIDER === 'anthropic') {
    return callAnthropic({ system, messages, max_tokens });
  }
  return callOpenAICompat({ system, messages, max_tokens, image_b64, image_type, jsonMode });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
    res.end();
    return;
  }

  if (!requiredKey()) {
    sendJson(res, 500, { error: `Missing provider key for MODEL_PROVIDER=${PROVIDER}` });
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/analyze-meal') {
      const raw = await collectBody(req);
      const body = JSON.parse(raw || '{}');
      const image_b64 = String(body.image_b64 || '');
      const image_type = String(body.image_type || 'image/jpeg');
      const age_group = String(body.age_group || 'unknown');

      if (!image_b64) {
        sendJson(res, 400, { error: 'image_b64 is required' });
        return;
      }

      const system = buildAnalysisPrompt(age_group);
      const messages = [{
        role: 'user',
        content: [{ type: 'text', text: 'Identify all foods visible in the tray and return JSON only.' }]
      }];

      const data = await callModel({
        system,
        messages,
        max_tokens: 1000,
        image_b64,
        image_type,
        jsonMode: true
      });

      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
      const raw = await collectBody(req);
      const body = JSON.parse(raw || '{}');
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const meal_info = String(body.meal_info || 'unknown');
      const age_group = String(body.age_group || 'unknown');
      const lang = String(body.lang || 'en');

      const system = `You are Poshan, a school nutrition coach. Meal: ${meal_info}. Age group: ${age_group}. ${lang === 'hi' ? 'Respond in natural Hinglish.' : 'Respond in clear English.'} Keep replies concise and practical.`;
      const data = await callModel({
        system,
        messages,
        max_tokens: 400
      });

      sendJson(res, 200, data);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = Number(err?.status) || 500;
    const payload = { error: err?.message || String(err) };
    if (err?.details !== undefined) payload.details = err.details;
    sendJson(res, status, payload);
  }
});

server.listen(PORT, () => {
  console.log(`Poshan local API proxy running on http://localhost:${PORT}`);
  console.log(`Provider=${PROVIDER} Model=${currentModel()}`);
});
