const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-apiKeys.db');

function getTestDbPath() {
  return TEST_DB_PATH;
}

function cleanupTestDb() {
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
}

function freshRequire(modulePath) {
  const abs = path.resolve(__dirname, '..', modulePath);
  delete require.cache[abs];
  delete require.cache[require.resolve(abs)];
  return require(abs);
}

module.exports = { getTestDbPath, cleanupTestDb, freshRequire };
