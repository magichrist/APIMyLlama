const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const express = require('express');
const request = require('supertest');
const { freshRequire, cleanupTestDb, getTestDbPath } = require('./setup');

describe('Admin API', function () {
  let app, db, adminApi;
  let testKey;
  let axiosGetStub;
  const ADMIN_TOKEN = 'test-admin-token-123';

  beforeEach(async function () {
    cleanupTestDb();
    process.env.API_KEYS_DB_PATH = getTestDbPath();
    process.env.ADMIN_TOKEN = ADMIN_TOKEN;
    process.env.OLLAMA_URL = 'http://test-ollama:11434';

    axiosGetStub = sinon.stub(axios, 'get').resolves({ status: 200, data: { models: [] } });

    db = freshRequire('./db');
    await db.initialize();

    testKey = 'test-api-key-123';
    await db.run('INSERT INTO apiKeys (key, rate_limit, tokens, active) VALUES (?, 10, 10, 1)', [testKey]);

    app = express();
    app.use(express.json({ limit: '10mb' }));

    adminApi = freshRequire('./admin-api');
    adminApi.setupAdminRoutes(app);
  });

  afterEach(async function () {
    await db.close();
    delete process.env.API_KEYS_DB_PATH;
    delete process.env.ADMIN_TOKEN;
    delete process.env.OLLAMA_URL;
    axiosGetStub.restore();
    cleanupTestDb();
  });

  describe('Authentication', function () {
    it('should return 401 when no admin token is provided', async function () {
      const res = await request(app).get('/v1/admin/health');
      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Admin token required');
    });

    it('should return 401 when an invalid admin token is provided', async function () {
      const res = await request(app)
        .get('/v1/admin/health')
        .set('x-admin-token', 'wrong-token');
      expect(res.status).to.equal(401);
      expect(res.body.error).to.equal('Invalid admin token');
    });

    it('should pass with a valid admin token', async function () {
      const res = await request(app)
        .get('/v1/admin/health')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
    });
  });

  describe('GET /v1/admin/health', function () {
    it('should return health status with serverStart and timestamp', async function () {
      const res = await request(app)
        .get('/v1/admin/health')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('healthy');
      expect(res.body.ollama).to.equal('reachable');
      expect(res.body.serverStart).to.be.a('string');
      expect(res.body.timestamp).to.be.a('string');
    });

    it('should return degraded when Ollama is unreachable', async function () {
      axiosGetStub.rejects(new Error('ECONNREFUSED'));
      const res = await request(app)
        .get('/v1/admin/health')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('degraded');
      expect(res.body.ollama).to.equal('unreachable');
    });
  });

  describe('CRUD /v1/admin/keys', function () {
    it('should list all API keys', async function () {
      const res = await request(app)
        .get('/v1/admin/keys')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf.at.least(1);
      expect(res.body[0].key).to.equal(testKey);
    });

    it('should create a new API key', async function () {
      const res = await request(app)
        .post('/v1/admin/keys')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ description: 'test creation' });
      expect(res.status).to.equal(201);
      expect(res.body.key).to.be.a('string');
      expect(res.body.key).to.have.lengthOf(40);
      expect(res.body.rate_limit).to.equal(10);
      expect(res.body.description).to.equal('test creation');
      expect(res.body.active).to.equal(1);
    });

    it('should create a new API key without description', async function () {
      const res = await request(app)
        .post('/v1/admin/keys')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(201);
      expect(res.body.key).to.be.a('string');
    });

    it('should get a specific API key', async function () {
      const res = await request(app)
        .get(`/v1/admin/keys/${testKey}`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.key).to.equal(testKey);
    });

    it('should return 404 for a non-existent key', async function () {
      const res = await request(app)
        .get('/v1/admin/keys/nonexistent-key')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
      expect(res.body.error).to.equal('API key not found');
    });

    it('should delete an API key', async function () {
      const res = await request(app)
        .delete(`/v1/admin/keys/${testKey}`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('API key removed');

      const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [testKey]);
      expect(row).to.be.undefined;
    });

    it('should return 404 when deleting a non-existent key', async function () {
      const res = await request(app)
        .delete('/v1/admin/keys/nonexistent-key')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
    });

    it('should regenerate an API key', async function () {
      const res = await request(app)
        .post(`/v1/admin/keys/${testKey}/regenerate`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.key).to.be.a('string');
      expect(res.body.key).to.not.equal(testKey);
    });

    it('should return 404 when regenerating a non-existent key', async function () {
      const res = await request(app)
        .post('/v1/admin/keys/nonexistent-key/regenerate')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
    });
  });

  describe('Key Status (activate/deactivate)', function () {
    it('should deactivate an API key', async function () {
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/deactivate`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('API key deactivated');
      const row = await db.get('SELECT active FROM apiKeys WHERE key = ?', [testKey]);
      expect(row.active).to.equal(0);
    });

    it('should activate an API key', async function () {
      await db.run('UPDATE apiKeys SET active = 0 WHERE key = ?', [testKey]);
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/activate`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('API key activated');
      const row = await db.get('SELECT active FROM apiKeys WHERE key = ?', [testKey]);
      expect(row.active).to.equal(1);
    });

    it('should return 404 when deactivating a non-existent key', async function () {
      const res = await request(app)
        .put('/v1/admin/keys/nonexistent-key/deactivate')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
    });

    it('should return 404 when activating a non-existent key', async function () {
      const res = await request(app)
        .put('/v1/admin/keys/nonexistent-key/activate')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
    });
  });

  describe('Key Config (rate limit, description)', function () {
    it('should update rate limit for a key', async function () {
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/rate-limit`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ limit: 25 });
      expect(res.status).to.equal(200);
      expect(res.body.rate_limit).to.equal(25);
    });

    it('should return 400 when rate limit body is missing', async function () {
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/rate-limit`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({});
      expect(res.status).to.equal(400);
    });

    it('should return 404 when setting rate limit for non-existent key', async function () {
      const res = await request(app)
        .put('/v1/admin/keys/nonexistent-key/rate-limit')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ limit: 10 });
      expect(res.status).to.equal(404);
    });

    it('should update description for a key', async function () {
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/description`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ description: 'updated desc' });
      expect(res.status).to.equal(200);
      expect(res.body.description).to.equal('updated desc');
    });

    it('should return 400 when description body is missing', async function () {
      const res = await request(app)
        .put(`/v1/admin/keys/${testKey}/description`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({});
      expect(res.status).to.equal(400);
    });
  });

  describe('Webhooks', function () {
    const webhookUrl = 'https://example.com/test-hook';

    it('should create a webhook with an apiKey', async function () {
      const res = await request(app)
        .post('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ url: webhookUrl, apiKey: testKey });
      expect(res.status).to.equal(201);
      expect(res.body.url).to.equal(webhookUrl);
      expect(res.body.api_key).to.equal(testKey);
    });

    it('should return 400 when creating webhook without apiKey', async function () {
      const res = await request(app)
        .post('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ url: webhookUrl });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('apiKey is required');
    });

    it('should return 400 when creating webhook without url', async function () {
      const res = await request(app)
        .post('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ apiKey: testKey });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('Webhook URL is required');
    });

    it('should return 400 when creating webhook with invalid url', async function () {
      const res = await request(app)
        .post('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ url: 'not-a-url', apiKey: testKey });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('Invalid webhook URL');
    });

    it('should return 400 when creating webhook with non-existent apiKey', async function () {
      const res = await request(app)
        .post('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ url: webhookUrl, apiKey: 'nonexistent-key' });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('API key not found');
    });

    it('should list all webhooks', async function () {
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', [webhookUrl, testKey]);
      const res = await request(app)
        .get('/v1/admin/webhooks')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].url).to.equal(webhookUrl);
    });

    it('should list webhooks filtered by key', async function () {
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', ['https://example.com/hook1', testKey]);
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', ['https://example.com/hook2', 'other-key']);
      const res = await request(app)
        .get(`/v1/admin/webhooks?key=${testKey}`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].url).to.equal('https://example.com/hook1');
    });

    it('should delete a webhook', async function () {
      const insert = await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', [webhookUrl, testKey]);
      const res = await request(app)
        .delete(`/v1/admin/webhooks/${insert.lastID}`)
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('Webhook deleted');
    });

    it('should return 404 when deleting a non-existent webhook', async function () {
      const res = await request(app)
        .delete('/v1/admin/webhooks/99999')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(404);
    });
  });

  describe('GET /v1/admin/stats', function () {
    it('should return stats with expected fields', async function () {
      const res = await request(app)
        .get('/v1/admin/stats')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('totalRequests');
      expect(res.body).to.have.property('activeKeys');
      expect(res.body).to.have.property('totalKeys');
      expect(res.body).to.have.property('recentRequests');
      expect(res.body).to.have.property('uniqueKeysUsed');
      expect(res.body).to.have.property('serverStart');
      expect(res.body).to.have.property('errorRate');
      expect(res.body).to.have.property('modelUsage');
      expect(res.body.activeKeys).to.equal(1);
      expect(res.body.totalKeys).to.equal(1);
    });
  });

  describe('GET /v1/admin/activity', function () {
    it('should return activity list', async function () {
      await db.run('INSERT INTO apiUsage (key, model) VALUES (?, ?)', [testKey, 'llama3']);
      const res = await request(app)
        .get('/v1/admin/activity')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].key).to.equal(testKey);
      expect(res.body[0].keyLabel).to.be.a('string');
    });
  });

  describe('GET /v1/admin/config', function () {
    it('should return configuration', async function () {
      const res = await request(app)
        .get('/v1/admin/config')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('port');
      expect(res.body).to.have.property('ollamaUrl');
      expect(res.body).to.have.property('serverStart');
    });
  });

  describe('GET /v1/admin/models', function () {
    it('should return models list (empty if Ollama unavailable)', async function () {
      // Stub already returns { models: [] }, models should be empty
      const res = await request(app)
        .get('/v1/admin/models')
        .set('x-admin-token', ADMIN_TOKEN);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });
});
