const { expect } = require('chai');
const { freshRequire, cleanupTestDb, getTestDbPath } = require('./setup');

describe('Database', function () {
  let db;

  beforeEach(async function () {
    cleanupTestDb();
    process.env.API_KEYS_DB_PATH = getTestDbPath();
    db = freshRequire('./db');
    await db.initialize();
  });

  afterEach(async function () {
    try {
      if (db && db.close) await db.close();
    } catch {}
    db = null;
    delete process.env.API_KEYS_DB_PATH;
    cleanupTestDb();
  });

  it('should create tables on initialize', async function () {
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    const names = tables.map(t => t.name).sort();
    expect(names).to.include.members(['apiKeys', 'apiUsage', 'webhooks']);
  });

  it('should insert and retrieve a key via run and get', async function () {
    await db.run('INSERT INTO apiKeys (key, rate_limit) VALUES (?, ?)', ['test-key-1', 10]);
    const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', ['test-key-1']);
    expect(row).to.not.be.null;
    expect(row.key).to.equal('test-key-1');
    expect(row.rate_limit).to.equal(10);
    expect(row.active).to.equal(1);
  });

  it('should return undefined for missing keys', async function () {
    const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', ['nonexistent']);
    expect(row).to.be.undefined;
  });

  it('should update a row with run', async function () {
    await db.run('INSERT INTO apiKeys (key, rate_limit) VALUES (?, ?)', ['key-to-update', 5]);
    await db.run('UPDATE apiKeys SET rate_limit = ? WHERE key = ?', [20, 'key-to-update']);
    const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', ['key-to-update']);
    expect(row.rate_limit).to.equal(20);
  });

  it('should delete a row with run', async function () {
    await db.run('INSERT INTO apiKeys (key, rate_limit) VALUES (?, ?)', ['key-to-delete', 5]);
    await db.run('DELETE FROM apiKeys WHERE key = ?', ['key-to-delete']);
    const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', ['key-to-delete']);
    expect(row).to.be.undefined;
  });

  it('should return all rows via all', async function () {
    await db.run('INSERT INTO apiKeys (key, rate_limit) VALUES (?, ?)', ['k1', 5]);
    await db.run('INSERT INTO apiKeys (key, rate_limit) VALUES (?, ?)', ['k2', 10]);
    const rows = await db.all('SELECT * FROM apiKeys ORDER BY key');
    expect(rows).to.have.length(2);
    expect(rows[0].key).to.equal('k1');
    expect(rows[1].key).to.equal('k2');
  });

  it('should handle log usage in apiUsage table', async function () {
    await db.run('INSERT INTO apiUsage (key) VALUES (?)', ['log-key']);
    const rows = await db.all('SELECT * FROM apiUsage');
    expect(rows).to.have.length(1);
    expect(rows[0].key).to.equal('log-key');
  });

  it('should handle webhooks table', async function () {
    await db.run('INSERT INTO webhooks (url) VALUES (?)', ['https://example.com/hook']);
    const rows = await db.all('SELECT * FROM webhooks');
    expect(rows).to.have.length(1);
    expect(rows[0].url).to.equal('https://example.com/hook');
  });

  it('should close the database connection', async function () {
    await db.close();
    // should not throw
    expect(true).to.be.true;
  });

  it('should add missing columns via ensureColumns', async function () {
    const rows = await db.all("PRAGMA table_info(apiKeys)");
    const columns = rows.map(r => r.name);
    expect(columns).to.include('active');
    expect(columns).to.include('description');
  });
});
