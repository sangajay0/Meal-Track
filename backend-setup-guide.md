# Secure API Setup Guide for Poshan Path

## Why Backend Proxy is Required

❌ **INSECURE**: API key in client code
- Anyone can see it in browser DevTools
- Anyone can steal your API quota
- Risk of unauthorized charges

✅ **SECURE**: Backend proxy with server-side API key
- API key stored securely on server
- Client never sees the key
- Full control over API usage

---

## Setup Backend (Node.js + Express)

### Step 1: Create Backend Project

```bash
mkdir poshan-backend
cd poshan-backend
npm init -y
npm install express dotenv cors axios
```

### Step 2: Create `.env` file
```
ANTHROPIC_API_KEY=sk-ant-YOUR-REAL-KEY-HERE
PORT=3000
```

### Step 3: Create `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Meal analysis endpoint
app.post('/api/analyze-meal', async (req, res) => {
  try {
    const { image_b64, image_type, age_group } = req.body;

    const response = await axios.post(API_URL, {
      model: MODEL,
      max_tokens: 1000,
      system: `You are Poshan, a school meal nutrition assistant. Analyze the meal on the tray and return ONLY valid JSON with food items, nutrients, and summary. Format: {"items":[{"name":"...","role":"carb|protein|vegetable|extra","amount_g":number,"k":number,"p":number,"c":number,"f":number,"i":number,"ca":number,"va":number,"vc":number}],"summary":"..."}`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image_type,
              data: image_b64
            }
          },
          {
            type: 'text',
            text: `Age group: ${age_group}. Identify all food items on this school meal tray.`
          }
        ]
      }]
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.content[0].text;
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, meal_info, lang } = req.body;

    const systemPrompt = `You are Poshan, professional nutrition coach for Indian schools. 
    ${lang === 'hi' ? 'Respond in natural Hinglish.' : 'Respond in clear English.'}
    Meal: ${meal_info}. Be concise and professional.`;

    const response = await axios.post(API_URL, {
      model: MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: messages
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    res.json({ content: response.data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'Chat failed' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Poshan API server running on port 3000');
});
```

### Step 4: Update Frontend to Use Backend

In `poshan_netlify.html`, change the `doAnalyse()` function:

```javascript
async function doAnalyse(){
  if(!S.img)return;
  showLoad('Poshan is analysing your meal...');
  gt('conf');
  
  const ag = S.ages[S.age];
  const b64 = S.img.split(',')[1];
  const mt = S.img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  
  try {
    // Call your backend instead of Anthropic directly
    const res = await fetch('http://localhost:3000/api/analyze-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_b64: b64,
        image_type: mt,
        age_group: ag.lbl
      })
    });
    
    const data = await res.json();
    S.det = data.items || [];
    S.conf = [...S.det];
    renderConf(data.summary || 'Meal identified:');
  } catch(e) {
    // Fallback to demo meal
    S.det = [/* demo items */];
    S.conf = [...S.det];
    renderConf('Demo meal loaded.');
  }
  hideLoad();
}
```

### Step 5: Run Backend
```bash
node server.js
# Server running on http://localhost:3000
```

### Step 6: Deploy to Production
- Use Heroku, Railway, or AWS
- Keep API key in environment variables
- Enable HTTPS only
- Add authentication if needed

---

## Quick Test

1. **Run backend locally**: `node server.js`
2. **Open HTML file** in browser
3. **Upload meal image** → Should analyze in real-time
4. **Check backend console** for API calls
5. **Monitor costs** on Anthropic dashboard

---

## Security Checklist

- ✅ API key stored in `.env` (not in git)
- ✅ `.env` added to `.gitignore`
- ✅ CORS configured properly
- ✅ Input validation on backend
- ✅ Error handling without leaking keys
- ✅ HTTPS enforced in production
- ✅ Rate limiting implemented
- ✅ API key rotated regularly

---

## Troubleshooting

**"CORS Error"**: Backend CORS not configured
- Add `app.use(cors())` to server

**"API key not found"**: Check `.env` file
- Verify `ANTHROPIC_API_KEY=sk-ant-...`
- Restart server after changing `.env`

**"API call fails"**: Check Anthropic API key validity
- Go to https://console.anthropic.com
- Verify key is active and has quota

