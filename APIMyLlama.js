const express = require('express');
const db = require('./db');
const { startServer, resolveConfig, startCLI, getServer } = require('./utils');
const { setupRoutes } = require('./api');
const { setupAdminRoutes } = require('./admin-api');

const app = express();

async function main() {
  console.log('APIMyLlama V2 is being started. Thanks for choosing Gimer Studios.');

  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    console.log(`Received a ${req.method} request at ${req.url}`);
    next();
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  await db.initialize();

  setupRoutes(app);
  setupAdminRoutes(app);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const port = await resolveConfig('port number', 'PORT', 'port.conf', '3000');
  await resolveConfig('Ollama server URL', 'OLLAMA_URL', 'ollamaURL.conf', 'http://localhost:11434');

  startServer(parseInt(port), app);
  startCLI();
}

async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  const srv = getServer();
  if (srv) {
    srv.close(async () => {
      await db.close();
      process.exit(0);
    });
  } else {
    await db.close();
    process.exit(0);
  }
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

module.exports = app;
