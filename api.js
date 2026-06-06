const axios = require('axios');
const db = require('./db');
const { getOllamaURL, sendWebhookNotification } = require('./utils');

const rateLimits = new Map();
let rateLimitBatchTimer = null;
const rateLimitBatchQueue = new Map();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const failedAttempts = new Map();

const healthCache = { data: null, ttl: 0 };

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkBruteForce(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return null;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return `Too many failed attempts. Try again in ${remaining} seconds.`;
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    failedAttempts.delete(ip);
  }
  return null;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    console.warn(`Brute-force lockout triggered for IP ${ip} (${record.count} failed attempts)`);
  }
  failedAttempts.set(ip, record);
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

function extractApiKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.body?.apikey || req.query?.apikey || null;
}

function flushRateLimitBatch() {
  for (const [apikey, info] of rateLimitBatchQueue) {
    db.run('UPDATE apiKeys SET tokens = ?, last_used = ? WHERE key = ?', [
      info.tokens,
      new Date(info.lastUsed).toISOString(),
      apikey
    ]).catch(err => console.error('Error flushing rate limit batch:', err.message));
  }
  rateLimitBatchQueue.clear();
  rateLimitBatchTimer = null;
}

function scheduleRateLimitFlush() {
  if (!rateLimitBatchTimer) {
    rateLimitBatchTimer = setTimeout(flushRateLimitBatch, 3000);
  }
}

async function verifyApiKey(apikey) {
  if (!apikey) return null;
  try {
    return await db.get('SELECT * FROM apiKeys WHERE key = ?', [apikey]);
  } catch (err) {
    console.error('Database error during key verification:', err.message);
    throw err;
  }
}

async function authenticateRequest(req, res) {
  const ip = getClientIp(req);

  const lockoutError = checkBruteForce(ip);
  if (lockoutError) {
    return res.status(429).json({ error: lockoutError });
  }

  const apikey = extractApiKey(req);
  if (!apikey) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'API key is required (use Authorization: Bearer header or ?apikey= param)' });
  }

  const keyInfo = await verifyApiKey(apikey);
  if (!keyInfo) {
    recordFailedAttempt(ip);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  clearFailedAttempts(ip);
  return { apikey, keyInfo };
}

function setupRoutes(app) {
  const healthHandler = async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth || res.headersSent) return;

    if (healthCache.data && Date.now() < healthCache.ttl) {
      return res.json(healthCache.data);
    }

    let ollamaHealthy = false;
    try {
      const url = await getOllamaURL();
      await axios.get(`${url}/api/tags`, { timeout: 5000 });
      ollamaHealthy = true;
    } catch {
      ollamaHealthy = false;
    }

    healthCache.data = {
      status: ollamaHealthy ? 'healthy' : 'degraded',
      ollama: ollamaHealthy ? 'reachable' : 'unreachable',
      timestamp: new Date().toISOString()
    };
    healthCache.ttl = Date.now() + 10000;

    res.json(healthCache.data);
  };

  const generateHandler = async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth || res.headersSent) return;

    const { apikey, keyInfo } = auth;

    if (keyInfo.active === 0) {
      recordFailedAttempt(getClientIp(req));
      return res.status(403).json({ error: 'API key is deactivated' });
    }

    const rateLimitError = await checkRateLimit(apikey, keyInfo);
    if (rateLimitError) {
      return res.status(429).json({ error: rateLimitError });
    }

    await handleGenerate(req, res, apikey);
  };

  app.get('/v1/health', healthHandler);
  app.post('/v1/generate', generateHandler);
  app.get('/health', healthHandler);
  app.post('/generate', generateHandler);
}

async function checkRateLimit(apikey, keyInfo) {
  const currentTime = Date.now();
  const minute = 60000;
  const rateLimit = keyInfo.rate_limit;

  if (!rateLimits.has(apikey)) {
    const lastUsed = new Date(keyInfo.last_used).getTime();
    const timeElapsed = currentTime - lastUsed;
    const tokens = timeElapsed >= minute ? rateLimit : Math.min(keyInfo.tokens, rateLimit);
    rateLimits.set(apikey, { tokens, lastUsed });
  }

  const rateLimitInfo = rateLimits.get(apikey);
  const timeElapsed = currentTime - rateLimitInfo.lastUsed;

  if (timeElapsed >= minute) {
    rateLimitInfo.tokens = rateLimit;
    rateLimitInfo.lastUsed = currentTime;
  }

  if (rateLimitInfo.tokens <= 0) {
    return 'Rate limit exceeded. Try again later.';
  }

  rateLimitInfo.tokens -= 1;
  rateLimitInfo.lastUsed = currentTime;

  rateLimitBatchQueue.set(apikey, {
    tokens: rateLimitInfo.tokens,
    lastUsed: rateLimitInfo.lastUsed
  });
  scheduleRateLimitFlush();

  return null;
}

async function handleGenerate(req, res, apikey) {
  const { prompt, model, stream, images, raw } = req.body;

  if (!prompt || !model) {
    return res.status(400).json({ error: 'Both prompt and model are required' });
  }

  try {
    const ollamaURL = await getOllamaURL();
    const OLLAMA_API_URL = `${ollamaURL}/api/generate`;

    if (stream) {
      const ollamaResponse = await axios({
        method: 'post',
        url: OLLAMA_API_URL,
        data: { model, prompt, stream: true, images, raw },
        responseType: 'stream',
        timeout: 300000
      });

      res.setHeader('Content-Type', 'application/x-ndjson');

      let streamBody = '';

      ollamaResponse.data.on('data', (chunk) => {
        streamBody += chunk.toString();
      });

      ollamaResponse.data.on('error', (err) => {
        console.error('Ollama stream error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Upstream stream error' });
        } else {
          res.end();
        }
        logUsage(apikey, model);
      });

      res.on('close', () => {
        ollamaResponse.data.destroy();
        ollamaResponse.request.destroy();
      });

      ollamaResponse.data.on('end', () => {
        logUsage(apikey, model);
        const lines = streamBody.trim().split('\n').filter(Boolean);
        const lastLine = lines[lines.length - 1];
        let responseText = '';
        try {
          const parts = lines.map(l => JSON.parse(l));
          responseText = parts.map(p => p.response).join('');
        } catch {}
        sendWebhook(apikey, { prompt, model, response: responseText }, model);
      });

      ollamaResponse.data.pipe(res);
    } else {
      const ollamaResponse = await axios.post(OLLAMA_API_URL, { model, prompt, stream: false, images, raw }, {
        timeout: 300000
      });

      logUsage(apikey, model);
      sendWebhook(apikey, { prompt, model, response: ollamaResponse.data.response }, model);

      res.json(ollamaResponse.data);
    }
  } catch (error) {
    if (error.response) {
      console.error('Ollama API error:', error.response.status, error.response.data);
      res.status(error.response.status).json({ error: 'Ollama API error', detail: error.response.data });
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Ollama server is not reachable:', error.message);
      res.status(503).json({ error: 'Ollama server is not reachable' });
    } else {
      console.error('Error making request to Ollama API:', error.message);
      res.status(500).json({ error: 'Error making request to Ollama API' });
    }
  }
}

function logUsage(apikey, model) {
  db.run('INSERT INTO apiUsage (key, model) VALUES (?, ?)', [apikey, model || null])
    .catch(err => console.error('Error logging API usage:', err.message));
}

function sendWebhook(apikey, payload, model) {
  const responseText = payload?.response;
  if (responseText) {
    console.log(`Sending webhook for key ${apikey} with response (${responseText.length} chars)`);
    sendWebhookNotification(apikey, responseText);
  } else {
    console.error('sendWebhook called but payload.response is empty/undefined');
  }
}

module.exports = { setupRoutes };
