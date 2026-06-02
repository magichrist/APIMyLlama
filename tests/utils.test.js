const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
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
    it('should return the URL from ollamaURL.conf', async function () {
      const url = await utils.getOllamaURL();
      expect(url).to.equal('http://localhost:11434');
    });

    it('should reject if ollamaURL.conf does not exist', async function () {
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

    beforeEach(async function () {
      axiosPostStub = sinon.stub(axios, 'post').resolves({ status: 200 });
    });

    afterEach(function () {
      axiosPostStub.restore();
    });

    it('should send notifications to all webhooks', async function () {
      await db.run('INSERT INTO webhooks (url) VALUES (?)', ['https://hook1.example.com']);
      await db.run('INSERT INTO webhooks (url) VALUES (?)', ['https://hook2.example.com']);

      const payload = { apikey: 'test', prompt: 'hello', model: 'llama3' };
      utils.sendWebhookNotification(payload);

      await new Promise(r => setTimeout(r, 100));

      expect(axiosPostStub.callCount).to.equal(2);
      expect(axiosPostStub.firstCall.args[0]).to.equal('https://hook1.example.com');
      expect(axiosPostStub.secondCall.args[0]).to.equal('https://hook2.example.com');
    });

    it('should not send when no webhooks exist', async function () {
      utils.sendWebhookNotification({ apikey: 'test' });

      await new Promise(r => setTimeout(r, 100));

      expect(axiosPostStub.callCount).to.equal(0);
    });
  });
});
