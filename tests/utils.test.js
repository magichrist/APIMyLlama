const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const dnsPromises = require('dns/promises');
const fs = require('fs');
const path = require('path');
const { freshRequire, cleanupTestDb, getTestDbPath } = require('./setup');

describe('Utils', function () {
  let utils, db;

  beforeEach(async function () {
    cleanupTestDb();
    process.env.API_KEYS_DB_PATH = getTestDbPath();
    process.env.OLLAMA_URL = 'http://localhost:11434';
    fs.writeFileSync('ollamaURL.conf', 'http://localhost:11434', 'utf8');
    db = freshRequire('./db');
    await db.initialize();
    utils = freshRequire('./utils');
  });

  afterEach(async function () {
    if (db && db.close) await db.close();
    delete process.env.API_KEYS_DB_PATH;
    delete process.env.OLLAMA_URL;
    cleanupTestDb();
  });

  describe('getOllamaURL', function () {
    beforeEach(function () {
      delete process.env.OLLAMA_URL;
    });

    it('should return the URL from OLLAMA_URL env var', async function () {
      process.env.OLLAMA_URL = 'http://env-ollama:11434';
      const url = await utils.getOllamaURL();
      expect(url).to.equal('http://env-ollama:11434');
    });

    it('should return the URL from ollamaURL.conf', async function () {
      delete process.env.OLLAMA_URL;
      fs.writeFileSync('ollamaURL.conf', 'http://ollama:11434', 'utf8');
      const url = await utils.getOllamaURL();
      expect(url).to.equal('http://ollama:11434');
    });

    it('should reject if ollamaURL.conf does not exist', async function () {
      delete process.env.OLLAMA_URL;
      try {
        fs.unlinkSync('ollamaURL.conf');
      } catch {}
      try {
        await utils.getOllamaURL();
        expect.fail('Should have rejected');
      } catch (err) {
        expect(err.message).to.include('configuration file not found');
      }
    });

    it('should reject if ollamaURL.conf is empty', async function () {
      delete process.env.OLLAMA_URL;
      fs.writeFileSync('ollamaURL.conf', '', 'utf8');
      try {
        await utils.getOllamaURL();
        expect.fail('Should have rejected');
      } catch (err) {
        expect(err.message).to.include('Invalid Ollama url');
      }
    });
  });

  describe('sendWebhookNotification', function () {
    let axiosPostStub;
    let dnsResolve4Stub;
    let dnsResolve6Stub;

    beforeEach(async function () {
      axiosPostStub = sinon.stub(axios, 'post').resolves({ status: 200 });
      dnsResolve4Stub = sinon.stub(dnsPromises, 'resolve4').resolves(['93.184.216.34']);
      dnsResolve6Stub = sinon.stub(dnsPromises, 'resolve6').rejects(new Error('No AAAA record'));
    });

    afterEach(function () {
      axiosPostStub.restore();
      dnsResolve4Stub.restore();
      dnsResolve6Stub.restore();
    });

    it('should send notifications to key-associated webhooks', async function () {
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', ['https://hook1.example.com', 'test-key-1']);
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', ['https://hook2.example.com', 'test-key-2']);

      await utils.sendWebhookNotification('test-key-1', 'Hello from the LLM!');

      await new Promise(r => setTimeout(r, 100));

      expect(axiosPostStub.callCount).to.equal(1);
      expect(axiosPostStub.firstCall.args[0]).to.equal('https://93.184.216.34/');
      expect(axiosPostStub.firstCall.args[1]).to.deep.equal({ text: 'Hello from the LLM!' });
      expect(axiosPostStub.firstCall.args[2].headers['Content-Type']).to.equal('application/json');
      expect(axiosPostStub.firstCall.args[2].headers['Host']).to.equal('hook1.example.com');
    });

    it('should not send when no webhooks match the key', async function () {
      await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', ['https://hook3.example.com', 'other-key']);
      await utils.sendWebhookNotification('test-key-1', 'Hello');

      await new Promise(r => setTimeout(r, 100));

      expect(axiosPostStub.callCount).to.equal(0);
    });
  });
});
