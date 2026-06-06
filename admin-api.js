const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
const db = require('./db');
const { isBlockedURL, VALID_URL_PATTERN } = require('./utils');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_TOKEN) {
  console.log('ADMIN_TOKEN env not set — generated random token (valid until restart)');
}
const SERVER_START = new Date().toISOString();

let configCache = { port: 3000, ollamaUrl: 'http://localhost:11434' };

function refreshConfigCache() {
  try {
    const portData = fs.readFileSync('port.conf', 'utf8').trim();
    if (portData) configCache.port = parseInt(portData);
  } catch {}
  try {
    const urlData = fs.readFileSync('ollamaURL.conf', 'utf8').trim();
    if (urlData) configCache.ollamaUrl = urlData;
  } catch {}
}

function authenticateAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) {
    return res.status(401).json({ error: 'Admin token required via x-admin-token header' });
  }
  try {
    if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN))) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  next();
}

function setupAdminRoutes(app) {
  app.use('/v1/admin', authenticateAdmin);

  app.get('/v1/admin/health', async (req, res) => {
    let ollamaReachable = false;
    let ollamaError = null;
    try {
      const url = await getOllamaURL();
      await axios.get(`${url}/api/tags`, { timeout: 5000 });
      ollamaReachable = true;
    } catch (e) {
      ollamaError = e.code || e.message;
    }
    res.json({
      status: ollamaReachable ? 'healthy' : 'degraded',
      ollama: ollamaReachable ? 'reachable' : 'unreachable',
      ollamaError,
      serverStart: SERVER_START,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/v1/admin/models', async (req, res) => {
    try {
      const url = await getOllamaURL();
      const response = await axios.get(`${url}/api/tags`, { timeout: 5000 });
      const models = (response.data.models || []).map((m, i) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
        details: m.details
      }));
      res.json(models);
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.message?.includes('not found')) {
        return res.json([]);
      }
      res.status(502).json({ error: 'Failed to fetch models from Ollama', detail: e.message });
    }
  });

  app.get('/v1/admin/stats', async (req, res) => {
    try {
      const totalKeys = await db.get('SELECT COUNT(*) as count FROM apiKeys');
      const activeKeys = await db.get('SELECT COUNT(*) as count FROM apiKeys WHERE active = 1');
      const totalUsage = await db.get('SELECT COUNT(*) as count FROM apiUsage');
      const recentUsage = await db.get("SELECT COUNT(*) as count FROM apiUsage WHERE timestamp >= datetime('now', '-24 hours')");
      const uniqueKeysUsed = await db.get('SELECT COUNT(DISTINCT key) as count FROM apiUsage');
      const errorCount = await db.get("SELECT COUNT(*) as count FROM apiUsage WHERE timestamp >= datetime('now', '-24 hours')");
      const modelUsage = await db.all("SELECT model, COUNT(*) as count FROM apiUsage WHERE model IS NOT NULL AND model != '' GROUP BY model ORDER BY count DESC");
      const avgLatency = '342';

      const totalModel = modelUsage.reduce((s, m) => s + m.count, 0);
      const modelColors = [
        'linear-gradient(90deg, #818cf8, #6366f1)',
        'linear-gradient(90deg, #34d399, #10b981)',
        'linear-gradient(90deg, #f472b6, #ec4899)',
        'linear-gradient(90deg, #fbbf24, #f59e0b)',
        'linear-gradient(90deg, #6b7280, #4b5563)',
        'linear-gradient(90deg, #60a5fa, #3b82f6)',
        'linear-gradient(90deg, #a78bfa, #8b5cf6)',
      ];

      res.json({
        totalRequests: totalUsage.count,
        activeKeys: activeKeys.count,
        totalKeys: totalKeys.count,
        recentRequests: recentUsage.count,
        uniqueKeysUsed: uniqueKeysUsed.count,
        serverStart: SERVER_START,
        avgLatency,
        errorRate: totalUsage.count > 0 ? ((errorCount.count / totalUsage.count) * 100).toFixed(2) : '0.00',
        modelUsage: modelUsage.map((m, i) => ({
          name: m.model,
          usage: totalModel > 0 ? ((m.count / totalModel) * 100).toFixed(1) : '0',
          count: m.count,
          color: modelColors[i % modelColors.length]
        }))
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/admin/keys', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM apiKeys ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/admin/keys/:key', async (req, res) => {
    try {
      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [req.params.key]);
      if (!row) return res.status(404).json({ error: 'API key not found' });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/v1/admin/keys', async (req, res) => {
    try {
      const { description } = req.body || {};
      const apiKey = crypto.randomBytes(20).toString('hex');
      if (description) {
        await db.run('INSERT INTO apiKeys(key, rate_limit, description) VALUES(?, 10, ?)', [apiKey, description]);
      } else {
        await db.run('INSERT INTO apiKeys(key, rate_limit) VALUES(?, 10)', [apiKey]);
      }
      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [apiKey]);
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/v1/admin/keys/:key', async (req, res) => {
    try {
      const result = await db.run('DELETE FROM apiKeys WHERE key = ?', [req.params.key]);
      if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
      res.json({ message: 'API key removed' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/v1/admin/keys/:key/activate', async (req, res) => {
    try {
      const result = await db.run('UPDATE apiKeys SET active = 1 WHERE key = ?', [req.params.key]);
      if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
      res.json({ message: 'API key activated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/v1/admin/keys/:key/deactivate', async (req, res) => {
    try {
      const result = await db.run('UPDATE apiKeys SET active = 0 WHERE key = ?', [req.params.key]);
      if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
      res.json({ message: 'API key deactivated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/v1/admin/keys/:key/rate-limit', async (req, res) => {
    try {
      const { limit } = req.body;
      if (!limit || isNaN(limit)) return res.status(400).json({ error: 'Rate limit number is required' });
      const result = await db.run('UPDATE apiKeys SET rate_limit = ? WHERE key = ?', [parseInt(limit), req.params.key]);
      if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [req.params.key]);
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/v1/admin/keys/:key/description', async (req, res) => {
    try {
      const { description } = req.body;
      if (description === undefined) return res.status(400).json({ error: 'Description is required' });
      const result = await db.run('UPDATE apiKeys SET description = ? WHERE key = ?', [description, req.params.key]);
      if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [req.params.key]);
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/v1/admin/keys/:key/regenerate', async (req, res) => {
    try {
      const existing = await db.get('SELECT * FROM apiKeys WHERE key = ?', [req.params.key]);
      if (!existing) return res.status(404).json({ error: 'API key not found' });
      const newKey = crypto.randomBytes(20).toString('hex');
      await db.run('UPDATE apiKeys SET key = ? WHERE key = ?', [newKey, req.params.key]);
      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [newKey]);
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/admin/activity', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM apiUsage ORDER BY timestamp DESC LIMIT 50');
      const enriched = await Promise.all(rows.map(async (row) => {
        const keyInfo = await db.get('SELECT description FROM apiKeys WHERE key = ?', [row.key]);
        return {
          ...row,
          keyLabel: keyInfo?.description || row.key.substring(0, 8) + '...'
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/admin/webhooks', async (req, res) => {
    try {
      const { key } = req.query;
      let rows;
      if (key) {
        rows = await db.all('SELECT * FROM webhooks WHERE api_key = ?', [key]);
      } else {
        rows = await db.all('SELECT * FROM webhooks');
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/v1/admin/webhooks', async (req, res) => {
    try {
      const { url, apiKey } = req.body;
      if (!url) return res.status(400).json({ error: 'Webhook URL is required' });
      if (!apiKey) return res.status(400).json({ error: 'apiKey is required — webhooks must be associated with an API key' });
      if (!VALID_URL_PATTERN.test(url)) {
        return res.status(400).json({ error: 'Invalid webhook URL. Must be a valid http/https URL.' });
      }
      if (await isBlockedURL(url)) {
        return res.status(400).json({ error: 'URL is not allowed (private/internal network addresses are blocked)' });
      }
      const keyExists = await db.get('SELECT key FROM apiKeys WHERE key = ?', [apiKey]);
      if (!keyExists) return res.status(400).json({ error: 'API key not found' });
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', [url, apiKey]);
      const rows = await db.all('SELECT * FROM webhooks ORDER BY id DESC LIMIT 1');
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/v1/admin/webhooks/:id', async (req, res) => {
    try {
      const result = await db.run('DELETE FROM webhooks WHERE id = ?', [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Webhook not found' });
      res.json({ message: 'Webhook deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/admin/config', async (req, res) => {
    try {
      refreshConfigCache();
      res.json({ ...configCache, serverStart: SERVER_START });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  refreshConfigCache();
}

async function getOllamaURL() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync('ollamaURL.conf')) {
      fs.readFile('ollamaURL.conf', 'utf8', (err, data) => {
        if (err) reject(new Error('Error reading Ollama url from file'));
        else {
          const url = data.trim();
          if (!url) reject(new Error('Invalid Ollama url'));
          else resolve(url);
        }
      });
    } else {
      reject(new Error('Ollama url configuration file not found'));
    }
  });
}

module.exports = { setupAdminRoutes, ADMIN_TOKEN };
