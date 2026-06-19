const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

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

async function callAnthropic({ system, messages, max_tokens }) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': API_VERSION
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens,
      system,
      messages
    })
  });

  const text = await resp.text();
  if (!resp.ok) {
    let message = `Anthropic ${resp.status}`;
    let details = text.slice(0, 1000);
    try {
      const parsed = JSON.parse(text);
      const providerMsg = parsed?.error?.message || parsed?.message;
      if (providerMsg) message = String(providerMsg);
      details = parsed;
    } catch (e) {
      // Keep string details when provider body is not JSON.
    }
    throw new HttpError(resp.status, message, details);
  }
  return JSON.parse(text);
}

function buildAnalysisPrompt(ageGroup) {
  return `You are Poshan, a school meal nutrition assistant for Indian schools. Analyze the meal and respond ONLY as strict JSON with this exact structure: {"items":[{"name":"food","role":"carb|protein|vegetable|extra|optional","amount_g":number,"k":number,"p":number,"c":number,"f":number,"i":number,"ca":number,"va":number,"vc":number}],"summary":"one sentence"}. Use realistic ICMR/NIN style estimates. Age group: ${ageGroup || 'unknown'}.`;
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

  if (!API_KEY) {
    sendJson(res, 500, { error: 'ANTHROPIC_API_KEY not set in environment' });
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

      const data = await callAnthropic({
        system: buildAnalysisPrompt(age_group),
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image_type, data: image_b64 } },
            { type: 'text', text: 'Identify all foods visible in the tray and return JSON only.' }
          ]
        }]
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
      const data = await callAnthropic({
        system,
        max_tokens: 400,
        messages
      });

      sendJson(res, 200, data);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    const status = Number(err?.status) || 500;
    const msg = err?.message || String(err);
    const payload = { error: msg };
    if (err?.details !== undefined) payload.details = err.details;
    sendJson(res, status, payload);
  }
});

server.listen(PORT, () => {
  console.log(`Poshan local API proxy running on http://localhost:${PORT}`);
});
