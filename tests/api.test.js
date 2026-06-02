const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const express = require('express');
const request = require('supertest');
const { freshRequire, cleanupTestDb, getTestDbPath } = require('./setup');

describe('API Routes', function () {
  let app, db, api, utils, server;
  let testKey;
  let axiosGetStub, axiosPostStub, sendWebhookStub, getOllamaURLStub;

  beforeEach(async function () {
    cleanupTestDb();
    process.env.API_KEYS_DB_PATH = getTestDbPath();
    process.env.OLLAMA_URL = 'http://test-ollama:11434';
    process.env.PORT = '0';

    db = freshRequire('./db');
    await db.initialize();

    testKey = 'test-api-key-123';
    await db.run('INSERT INTO apiKeys (key, rate_limit, tokens, active) VALUES (?, 10, 10, 1)', [testKey]);

    axiosGetStub = sinon.stub(axios, 'get').resolves({ status: 200 });
    axiosPostStub = sinon.stub(axios, 'post').resolves({
      data: { response: 'Hello from Llama!', model: 'llama3', done: true }
    });

    utils = freshRequire('./utils');
    sendWebhookStub = sinon.stub(utils, 'sendWebhookNotification').returns();
    getOllamaURLStub = sinon.stub(utils, 'getOllamaURL').resolves('http://test-ollama:11434');

    app = express();
    app.use(express.json({ limit: '10mb' }));

    api = freshRequire('./api');
    api.setupRoutes(app);

    server = app.listen(0);
  });

  afterEach(async function () {
    await db.close();
    server.close();
    delete process.env.API_KEYS_DB_PATH;
    delete process.env.OLLAMA_URL;
    delete process.env.PORT;
    cleanupTestDb();
    axiosGetStub.restore();
    axiosPostStub.restore();
    sendWebhookStub.restore();
    getOllamaURLStub.restore();
  });

  describe('GET /health', function () {
    it('should return 401 when no API key is provided', async function () {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('API key is required');
    });

    it('should return 403 when an invalid API key is provided', async function () {
      const res = await request(app).get('/health').set('Authorization', 'Bearer invalid-key');
      expect(res.status).to.equal(403);
      expect(res.body.error).to.equal('Invalid API key');
    });

    it('should return healthy status with a valid API key', async function () {
      const res = await request(app).get('/health').set('Authorization', `Bearer ${testKey}`);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('healthy');
      expect(res.body.ollama).to.equal('reachable');
      expect(res.body.timestamp).to.be.a('string');
    });

    it('should return degraded when Ollama is unreachable', async function () {
      axiosGetStub.rejects(new Error('ECONNREFUSED'));
      const res = await request(app).get('/health').set('Authorization', `Bearer ${testKey}`);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('degraded');
      expect(res.body.ollama).to.equal('unreachable');
    });
  });

  describe('GET /v1/health', function () {
    it('should work the same as /health', async function () {
      const res = await request(app).get('/v1/health').set('Authorization', `Bearer ${testKey}`);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('healthy');
    });
  });

  describe('POST /generate', function () {
    it('should return 401 when no API key is provided', async function () {
      const res = await request(app)
        .post('/generate')
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(401);
    });

    it('should return 403 when an invalid API key is provided', async function () {
      const res = await request(app)
        .post('/generate')
        .set('Authorization', 'Bearer invalid-key')
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(403);
    });

    it('should return 403 when the API key is deactivated', async function () {
      await db.run('UPDATE apiKeys SET active = 0 WHERE key = ?', [testKey]);
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(403);
      expect(res.body.error).to.equal('API key is deactivated');
    });

    it('should return 400 when prompt is missing', async function () {
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ model: 'llama3' });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.equal('Both prompt and model are required');
    });

    it('should return 400 when model is missing', async function () {
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello' });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.equal('Both prompt and model are required');
    });

    it('should generate a response with valid key, prompt and model', async function () {
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(200);
      expect(res.body.response).to.equal('Hello from Llama!');
    });

    it('should extract API key from the apikey body field', async function () {
      const res = await request(app)
        .post('/generate')
        .send({ prompt: 'Hello', model: 'llama3', apikey: testKey });
      expect(res.status).to.equal(200);
      expect(res.body.response).to.equal('Hello from Llama!');
    });

    it('should extract API key from the apikey query parameter', async function () {
      const res = await request(app)
        .post(`/generate?apikey=${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(200);
    });

    it('should return 503 when Ollama is unreachable', async function () {
      axiosPostStub.rejects({ code: 'ECONNREFUSED', message: 'Connection refused' });
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal('Ollama server is not reachable');
    });

    it('should return 500 on generic Ollama error', async function () {
      axiosPostStub.rejects(new Error('Something went wrong'));
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(500);
    });
  });

  describe('POST /v1/generate', function () {
    it('should work the same as /generate', async function () {
      const res = await request(app)
        .post('/v1/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(200);
    });
  });

  describe('Rate Limiting', function () {
    it('should allow requests within the rate limit', async function () {
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/generate')
          .set('Authorization', `Bearer ${testKey}`)
          .send({ prompt: 'Hello', model: 'llama3' });
        expect(res.status).to.equal(200);
      }
    });

    it('should return 429 when rate limit is exceeded', async function () {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/generate')
          .set('Authorization', `Bearer ${testKey}`)
          .send({ prompt: 'Hello', model: 'llama3' });
      }
      const res = await request(app)
        .post('/generate')
        .set('Authorization', `Bearer ${testKey}`)
        .send({ prompt: 'Hello', model: 'llama3' });
      expect(res.status).to.equal(429);
      expect(res.body.error).to.equal('Rate limit exceeded. Try again later.');
    });
  });
});
