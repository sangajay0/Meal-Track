# 🚀 Poshan Path - Complete Production Setup Guide

## ✅ Status Check

- ✅ API Key Added: `sk-ant-REDACTED`
- ✅ App File Configured
- ✅ Ready for Testing & Production

---

## 📋 Table of Contents

1. [Quick Start - Testing Now](#quick-start--testing-now)
2. [Production Setup - Recommended](#production-setup--recommended)
3. [Backend Proxy Implementation](#backend-proxy-implementation)
4. [Security Best Practices](#security-best-practices)
5. [Deployment Instructions](#deployment-instructions)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Quick Start - Testing Now

### Local Testing (5 minutes)

1. **Open the app** directly in browser:
   ```
   File → Open File
   Select: /Users/sainathadepu/Documents/Supratik/poshan_netlify.html
   ```

   OR serve locally:
   ```bash
   cd /Users/sainathadepu/Documents/Supratik
   python3 -m http.server 8000
   # Visit: http://localhost:8000/poshan_netlify.html
   ```

2. **Test the flow:**
   - Select age group (e.g., "Upper Primary")
   - Click "Scan New Meal"
   - Upload or capture your meal image
   - Click "Analyse"
   - Claude will analyze your image in real-time!
   - View nutritional breakdown and score

3. **Verify API is working:**
   - When you click "Analyse", you should see:
     - Loading message: "Poshan is analysing your meal..."
     - Results display: Detected food items from YOUR image (not demo)
     - Accurate nutritional calculations
     - Score and feedback specific to your meal

### ⚠️ Testing Limitations

Current setup has API key in client code (for testing only):
```javascript
const API_KEY = 'sk-ant-REDACTED';
```

✅ **OK for:** Testing, demos, internal use, development  
❌ **NOT OK for:** Production, public deployment, GitHub

---

## Production Setup - Recommended

### Why Backend Proxy?

**Security Comparison:**

| Aspect | Current | With Backend |
|--------|---------|-------------|
| **API Key Security** | ❌ Exposed in client | ✅ Protected on server |
| **API Usage Control** | ❌ Anyone can use | ✅ Server-managed quotas |
| **Cost Protection** | ❌ Unlimited exposure | ✅ Rate-limited |
| **Production Ready** | ❌ No | ✅ Yes |
| **Scalability** | ❌ Single server | ✅ Load balanceable |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SECURE PRODUCTION SETUP               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend (Browser)          Backend Server              │
│  ┌──────────────────┐        ┌──────────────────┐      │
│  │ poshan.html      │        │ Node.js/Express  │      │
│  │                  │        │                  │      │
│  │ No API Key ✓     │──API───│ API_KEY (env)    │      │
│  │ Safe HTML ✓      │Call    │ Secure ✓         │      │
│  │ Public OK ✓      │─────→  │ HTTPS/TLS ✓      │      │
│  │                  │        │                  │      │
│  │ Calls /api/*     │←─JSON─ │ Anthropic API    │      │
│  └──────────────────┘  Response └──────────────────┘      │
│                                    ↓                      │
│                            ┌──────────────┐               │
│                            │ Anthropic    │               │
│                            │ API          │               │
│                            │ (Claude)     │               │
│                            └──────────────┘               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Proxy Implementation

### Step 1: Create Backend Folder

```bash
mkdir poshan-api-backend
cd poshan-api-backend
npm init -y
npm install express dotenv cors axios multer
```

### Step 2: Create `.env` file

```env
# .env - NEVER commit this to Git!
ANTHROPIC_API_KEY=sk-ant-REDACTED
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Step 3: Create `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Constants
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Rate limiting map (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

// Middleware: Rate limiting
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const reqs = requestCounts.get(ip);
  const recentReqs = reqs.filter(t => now - t < RATE_WINDOW);
  
  if (recentReqs.length >= RATE_LIMIT) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }
  
  recentReqs.push(now);
  requestCounts.set(ip, recentReqs);
  next();
}

// ── API ENDPOINT: Meal Analysis ──
app.post('/api/analyze-meal', rateLimit, async (req, res) => {
  try {
    const { image_b64, image_type, age_group } = req.body;
    
    // Validation
    if (!image_b64 || !image_type || !age_group) {
      return res.status(400).json({ 
        error: 'Missing required fields: image_b64, image_type, age_group' 
      });
    }
    
    console.log(`[${new Date().toISOString()}] Analyzing meal for age group: ${age_group}`);
    
    const systemPrompt = `You are Poshan, a school meal nutrition assistant for Indian schools. 
The meal is served on a SIGNORAWARE 5-compartment white plastic thali (335×265×30mm deep).
Analyze the meal image and return ONLY valid JSON (no markdown, no extra text).

Format exactly:
{"items":[{"name":"food name","role":"carb|protein|vegetable|extra|optional","amount_g":number,"k":number,"p":number,"c":number,"f":number,"i":number,"ca":number,"va":number,"vc":number}],"summary":"one sentence description"}

Where:
- k = kcal (energy)
- p = protein (g)
- c = carbohydrates (g)
- f = fat (g)
- i = iron (mg)
- ca = calcium (mg)
- va = vitamin A (mcg)
- vc = vitamin C (mg)

Use ICMR/NIN Food Composition Database values for Indian foods.
Age group: ${age_group}`;

    const response = await axios.post(API_URL, {
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
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
            text: 'Identify all food items on this school meal tray. Return JSON only, no markdown.'
          }
        ]
      }]
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Extract and parse response
    const content = response.data.content[0].text;
    const cleanJson = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    console.log(`✓ Analysis complete: ${parsed.items?.length || 0} items detected`);
    res.json(parsed);

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    
    // Detailed error response
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.error?.message || error.message;
    
    res.status(statusCode).json({ 
      error: 'Meal analysis failed',
      details: errorMsg,
      timestamp: new Date().toISOString()
    });
  }
});

// ── API ENDPOINT: Chat ──
app.post('/api/chat', rateLimit, async (req, res) => {
  try {
    const { messages, meal_info, age_group, lang } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    const systemPrompt = `You are Poshan, a professional nutrition coach for Indian schools.
You speak to school staff, cooks, and students about meal nutrition.
Be direct, professional, evidence-based, and focus on school meal planning.

Current meal: ${meal_info || 'unknown'}
Age group: ${age_group || 'unknown'}
${lang === 'hi' ? 'Respond in natural Hinglish.' : 'Respond in clear English.'}

Be concise - 2-4 sentences unless detailed analysis is requested.`;

    const response = await axios.post(API_URL, {
      model: MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: messages
    }, {
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 15000
    });

    const content = response.data.content[0].text;
    res.json({ content });

  } catch (error) {
    console.error('Chat Error:', error.message);
    res.status(500).json({ 
      error: 'Chat request failed',
      details: error.message 
    });
  }
});

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍱 Poshan API Server running on port ${PORT}`);
  console.log(`📝 Meal analysis: POST /api/analyze-meal`);
  console.log(`💬 Chat endpoint: POST /api/chat`);
  console.log(`🏥 Health check: GET /health`);
});
```

### Step 4: Update Frontend (`poshan_netlify.html`)

Replace the `doAnalyse()` function:

```javascript
async function doAnalyse(){
  if(!S.img)return;
  showLoad('Poshan is analysing your meal...');
  gt('conf');
  const ag = S.ages[S.age];
  const b64 = S.img.split(',')[1];
  const mt = S.img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  
  try {
    // Call backend instead of Anthropic directly
    const res = await fetch('http://localhost:3000/api/analyze-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_b64: b64,
        image_type: mt,
        age_group: ag.lbl
      })
    });
    
    if (!res.ok) throw new Error('API request failed');
    
    const data = await res.json();
    S.det = data.items || [];
    S.conf = [...S.det];
    renderConf(data.summary || 'Meal identified:');
  } catch(e) {
    console.error('Analysis error:', e);
    // Fallback to demo
    S.det = [
      {name:'Rice',role:'carb',amount_g:300,k:390,p:8.1,c:84,f:0.9,i:0.6,ca:30,va:0,vc:0},
      {name:'Dal',role:'protein',amount_g:200,k:232,p:18,c:40,f:0.8,i:6.6,ca:38,va:0,vc:2},
      {name:'Sabzi',role:'vegetable',amount_g:150,k:90,p:3,c:15,f:2.25,i:2.25,ca:60,va:120,vc:27},
      {name:'Egg',role:'extra',amount_g:50,k:71,p:6.5,c:0.5,f:5,i:0.9,ca:28,va:70,vc:0}
    ];
    S.conf = [...S.det];
    renderConf('Demo meal loaded (backend unavailable).');
  }
  hideLoad();
}
```

Similarly, update the `callP()` function to call `/api/chat` endpoint.

### Step 5: Run Backend & Test

```bash
# Terminal 1: Start backend
cd poshan-api-backend
npm start
# Output: 🍱 Poshan API Server running on port 3000

# Terminal 2: Start frontend
cd /Users/sainathadepu/Documents/Supratik
python3 -m http.server 8001
# Visit: http://localhost:8001/poshan_netlify.html
```

---

## Security Best Practices

### ✅ DO

1. **Store API key in `.env`**
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Add `.env` to `.gitignore`**
   ```
   .env
   .env.local
   *.key
   *.pem
   ```

3. **Use HTTPS in production**
   - Let's Encrypt (free)
   - Cloudflare (proxying)

4. **Implement rate limiting**
   - Prevent abuse
   - Control costs
   - Already included in `server.js`

5. **Validate input on backend**
   - Image size limits
   - Format validation
   - Age group check

6. **Monitor API usage**
   - Log all requests
   - Track costs
   - Set up alerts

### ❌ DON'T

1. ❌ Never expose API keys in client code
2. ❌ Never commit `.env` to Git
3. ❌ Never use HTTP in production (always HTTPS)
4. ❌ Never skip authentication/authorization
5. ❌ Never ignore rate limiting
6. ❌ Never expose sensitive error details to clients

---

## Deployment Instructions

### Option A: Deploy to Heroku (Easiest)

```bash
# 1. Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create poshan-api

# 4. Set environment variables
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set FRONTEND_URL=https://yourdomain.com

# 5. Deploy
git push heroku main

# 6. Check logs
heroku logs --tail
```

### Option B: Deploy to Railway (Recommended)

1. Go to https://railway.app
2. Connect GitHub repo
3. Add environment variables in dashboard
4. Deploy (automatic on git push)

### Option C: Deploy to AWS EC2

```bash
# SSH into server
ssh -i key.pem ubuntu@your-server

# Install Node & npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18

# Clone repo
git clone your-repo
cd poshan-api-backend

# Install deps
npm install

# Set up PM2 for persistence
npm install -g pm2
pm2 start server.js --name "poshan-api"
pm2 startup
pm2 save

# Set up Nginx reverse proxy (optional)
# Configure SSL with Let's Encrypt
```

---

## Monitoring & Maintenance

### Health Check Script

```bash
#!/bin/bash
# monitor.sh

ENDPOINT="http://localhost:3000/health"
RETRIES=3

for i in {1..$RETRIES}; do
  if curl -s "$ENDPOINT" | grep -q '"status":"ok"'; then
    echo "✓ API is healthy"
    exit 0
  fi
  sleep 2
done

echo "✗ API is down!"
exit 1
```

### Log Monitoring

```bash
# Check recent errors
pm2 logs poshan-api | grep "error"

# Monitor real-time
pm2 monit
```

### Cost Management

- Check Anthropic usage: https://console.anthropic.com/account/usage
- Set spending limits in Anthropic dashboard
- Monitor requests per endpoint

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Health check endpoint works: `GET /health`
- [ ] Image analysis works with real meal images
- [ ] Chat feature responds correctly
- [ ] Rate limiting works (test with 11 requests)
- [ ] Error handling graceful (try invalid image)
- [ ] API key is NOT in client code
- [ ] Frontend calls backend, not Anthropic directly
- [ ] HTTPS works (if deployed)
- [ ] Logs are clean (no sensitive data)

---

## Quick Reference

**For Development:**
```bash
cd poshan-api-backend && npm start
# Visit http://localhost:8000
```

**For Production:**
```bash
# On your server
NODE_ENV=production PORT=443 pm2 start server.js
# With SSL/TLS certificate
```

**Environment Variables Template:**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://poshan.yourdomain.com
CORS_ORIGIN=https://poshan.yourdomain.com
LOG_LEVEL=info
```

---

## Support & Troubleshooting

### API Key Invalid
- Check key at https://console.anthropic.com/api_keys
- Verify key format (starts with `sk-ant-`)
- Check key hasn't been rotated/revoked

### CORS Errors
- Update `FRONTEND_URL` in `.env`
- Ensure frontend makes requests to backend, not Anthropic

### Rate Limit Exceeded
- Implemented in server: 10 requests/minute per IP
- Increase `RATE_LIMIT` value if needed
- Use Redis for distributed rate limiting

### Image Analysis Fails
- Ensure image is valid JPEG or PNG
- Check image size (< 50MB)
- Verify Claude can interpret the image format

---

**Ready to deploy?** Follow the steps above and you'll have a secure, production-ready nutrition analysis platform! 🚀

