const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const net = require('net');
const dns = require('dns/promises');
const axios = require('axios');
const db = require('./db');

let server;
let currentPort;
let expressApp;

const VALID_URL_PATTERN = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  if (parts[0] === 127) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 0) return true;
  return false;
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  if (normalized.startsWith('::ffff:')) {
    const v4 = normalized.split(':').pop();
    return isPrivateIPv4(v4);
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  return false;
}

async function isBlockedURL(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) return true;
    const host = parsed.hostname;
    if (BLOCKED_HOSTS.includes(host)) return true;
    if (net.isIP(host)) {
      if (net.isIPv4(host)) return isPrivateIPv4(host);
      if (net.isIPv6(host)) return isPrivateIPv6(host);
      return true;
    }
    try {
      const v4 = await dns.resolve4(host);
      if (v4.some(ip => isPrivateIPv4(ip))) return true;
    } catch {
      return true;
    }
    try {
      const v6 = await dns.resolve6(host);
      if (v6.some(ip => isPrivateIPv6(ip))) return true;
    } catch {}
    return false;
  } catch {
    return true;
  }
}

function startServer(port, app) {
  currentPort = port;
  expressApp = app;
  server = expressApp.listen(currentPort, () => console.log(`Server running on port ${currentPort}`));
}

function getServer() { return server; }

async function resolveConfig(name, envVar, confFile, defaultValue) {
  if (process.env[envVar]) {
    console.log(`${name} set from environment variable ${envVar}`);
    return process.env[envVar];
  }

  try {
    const data = await fs.promises.readFile(confFile, 'utf8');
    const value = data.trim();
    if (value) {
      console.log(`${name} loaded from ${confFile}: ${value}`);
      return value;
    }
  } catch {}

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Enter the ${name} (default: ${defaultValue}): `, (answer) => {
      rl.close();
      const value = answer.trim() || defaultValue;
      fs.promises.writeFile(confFile, value, 'utf8')
        .then(() => console.log(`${name} saved to ${confFile}: ${value}`))
        .catch(err => console.error(`Error saving ${confFile}:`, err.message));
      resolve(value);
    });
  });
}

async function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', async (input) => {
    const [command, argument, ...rest] = input.trim().split(' ');
    const description = rest.join(' ');

    try {
      switch (command) {
        case 'generatekey':
          await generateKey();
          break;
        case 'generatekeys':
          await generateKeys(argument);
          break;
        case 'listkey':
          await listKeys();
          break;
        case 'removekey':
          await removeKey(argument);
          break;
        case 'addkey':
          await addKey(argument);
          break;
        case 'changeport':
          await changePort(argument);
          break;
        case 'changeollamaurl':
          await changeOllamaURL(argument);
          break;
        case 'ratelimit':
          await setRateLimit(argument, rest[0]);
          break;
        case 'addwebhook':
          await addWebhook(argument, rest[0]);
          break;
        case 'deletewebhook':
          await deleteWebhook(argument);
          break;
        case 'listwebhooks':
          await listWebhooks();
          break;
        case 'activatekey':
          await activateKey(argument);
          break;
        case 'deactivatekey':
          await deactivateKey(argument);
          break;
        case 'addkeydescription':
          await addKeyDescription(argument, description);
          break;
        case 'listkeydescription':
          await listKeyDescription(argument);
          break;
        case 'regeneratekey':
          await regenerateKey(argument);
          break;
        case 'activateallkeys':
          await activateAllKeys();
          break;
        case 'deactivateallkeys':
          await deactivateAllKeys();
          break;
        case 'getkeyinfo':
          await getKeyInfo(argument);
          break;
        case 'listinactivekeys':
          await listInactiveKeys();
          break;
        case 'listactivekeys':
          await listActiveKeys();
          break;
        case 'help':
          console.log(`
Available commands:
  generatekey                    Generate a single API key
  generatekeys <count>           Generate multiple API keys
  listkey                        List all API keys
  listactivekeys                 List active API keys
  listinactivekeys               List inactive API keys
  removekey <key>                Remove an API key
  addkey <key>                   Add your own API key
  activatekey <key>              Activate an API key
  deactivatekey <key>            Deactivate an API key
  activateallkeys                Activate all API keys
  deactivateallkeys              Deactivate all API keys
  addkeydescription <key> <desc> Add description to a key
  listkeydescription <key>       Show description for a key
  regeneratekey <key>            Regenerate (replace) an API key
  getkeyinfo <key>               Show full info for a key
  ratelimit <key> <limit>        Set rate limit for a key
  changeport <port>              Change the server port
  changeollamaurl <url>          Change the Ollama URL
  addwebhook <url> [api_key]     Add a webhook (optionally linked to an API key)
  deletewebhook <id>             Delete a webhook by ID
  listwebhooks                   List all webhooks
  help                           Show this help message
  exit                           Shut down the server
`);
          break;
        case 'exit':
          console.log('Shutting down...');
          await db.close();
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('Unknown command. Type "help" to see available commands.');
      }
    } catch (err) {
      console.error('Command error:', err.message);
    }
  });
}

async function generateKey() {
  const apiKey = crypto.randomBytes(20).toString('hex');
  await db.run('INSERT INTO apiKeys(key, rate_limit) VALUES(?, 10)', [apiKey]);
  console.log(`API key generated: ${apiKey}`);
}

async function generateKeys(count) {
  if (!count || isNaN(count)) {
    console.log('Invalid number of keys');
    return;
  }
  const numberOfKeys = parseInt(count);
  for (let i = 0; i < numberOfKeys; i++) {
    await generateKey();
  }
}

async function listKeys() {
  const rows = await db.all('SELECT key, active, description FROM apiKeys');
  console.log('API keys:', rows);
}

async function removeKey(key) {
  if (!key) {
    console.log('API key is required');
    return;
  }
  await db.run('DELETE FROM apiKeys WHERE key = ?', [key]);
  console.log('API key removed');
}

async function addKey(key) {
  if (!key) {
    console.log('API key is required');
    return;
  }
  console.log('Warning: Adding your own keys may be unsafe. It is recommended to generate keys using the generatekey command.');
  await db.run('INSERT INTO apiKeys(key, rate_limit) VALUES(?, 10)', [key]);
  console.log(`API key added: ${key}`);
}

async function changePort(newPort) {
  if (!newPort || isNaN(newPort)) {
    console.log('Invalid port number');
    return;
  }
  const port = parseInt(newPort);
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('Error closing the server:', err.message);
          reject(err);
        } else {
          console.log(`Server closed on port ${currentPort}`);
          resolve();
        }
      });
    });
  }
  await fs.promises.writeFile('port.conf', port.toString(), 'utf8');
  console.log(`Port number saved to port.conf: ${port}`);
  if (expressApp) {
    startServer(port, expressApp);
  } else {
    console.error('Express app not available. Unable to restart server.');
  }
}

async function changeOllamaURL(newURL) {
  if (!newURL || !VALID_URL_PATTERN.test(newURL)) {
    console.log('Invalid Ollama URL. Must be a valid http/https URL.');
    return;
  }
  if (await isBlockedURL(newURL)) {
    console.log('URL is not allowed (private/internal network addresses are blocked)');
    return;
  }
  await fs.promises.writeFile('ollamaURL.conf', newURL, 'utf8');
  console.log(`Ollama URL saved to ollamaURL.conf: ${newURL}`);
}

async function setRateLimit(key, limit) {
  if (!key || !limit || isNaN(limit)) {
    console.log('Invalid API key or rate limit number');
    return;
  }
  const rateLimit = parseInt(limit);
  await db.run('UPDATE apiKeys SET rate_limit = ? WHERE key = ?', [rateLimit, key]);
  console.log(`Rate limit set to ${rateLimit} requests per minute for API key: ${key}`);
}

async function addWebhook(url, apiKey) {
  if (!url) {
    console.log('Webhook URL is required');
    return;
  }
  if (!VALID_URL_PATTERN.test(url)) {
    console.log('Invalid webhook URL. Must be a valid http/https URL.');
    return;
  }
  if (await isBlockedURL(url)) {
    console.log('URL is not allowed (private/internal network addresses are blocked)');
    return;
  }
  if (apiKey) {
    const keyExists = await db.get('SELECT key FROM apiKeys WHERE key = ?', [apiKey]);
    if (!keyExists) {
      console.log('API key not found');
      return;
    }
    await db.run('INSERT INTO webhooks (url, api_key) VALUES (?, ?)', [url, apiKey]);
  } else {
    await db.run('INSERT INTO webhooks (url) VALUES (?)', [url]);
  }
  console.log(`Webhook added: ${url}`);
}

async function deleteWebhook(id) {
  if (!id) {
    console.log('Webhook ID is required');
    return;
  }
  await db.run('DELETE FROM webhooks WHERE id = ?', [id]);
  console.log('Webhook deleted');
}

async function listWebhooks() {
  const rows = await db.all('SELECT id, url FROM webhooks');
  console.log('Webhooks:', rows);
}

async function activateKey(key) {
  if (!key) {
    console.log('API key is required');
    return;
  }
  await db.run('UPDATE apiKeys SET active = 1 WHERE key = ?', [key]);
  console.log(`API key ${key} activated`);
}

async function deactivateKey(key) {
  if (!key) {
    console.log('API key is required');
    return;
  }
  await db.run('UPDATE apiKeys SET active = 0 WHERE key = ?', [key]);
  console.log(`API key ${key} deactivated`);
}

async function addKeyDescription(key, description) {
  if (!key || !description) {
    console.log('Invalid API key or description');
    return;
  }
  await db.run('UPDATE apiKeys SET description = ? WHERE key = ?', [description, key]);
  console.log(`Description added to API key ${key}`);
}

async function listKeyDescription(key) {
  if (!key) {
    console.log('Invalid API key');
    return;
  }
  const row = await db.get('SELECT description FROM apiKeys WHERE key = ?', [key]);
  if (row) {
    console.log(`Description for API key ${key}: ${row.description}`);
  } else {
    console.log(`No description found for API key ${key}`);
  }
}

async function regenerateKey(oldKey) {
  if (!oldKey) {
    console.log('Invalid API key');
    return;
  }
  const newApiKey = crypto.randomBytes(20).toString('hex');
  await db.run('UPDATE apiKeys SET key = ? WHERE key = ?', [newApiKey, oldKey]);
  console.log(`API key regenerated. New API key: ${newApiKey}`);
}

async function activateAllKeys() {
  await db.run('UPDATE apiKeys SET active = 1');
  console.log('All API keys activated');
}

async function deactivateAllKeys() {
  await db.run('UPDATE apiKeys SET active = 0');
  console.log('All API keys deactivated');
}

async function getKeyInfo(key) {
  if (!key) {
    console.log('API key is required');
    return;
  }
  const row = await db.get('SELECT * FROM apiKeys WHERE key = ?', [key]);
  if (row) {
    console.log('API key info:', row);
  } else {
    console.log('No API key found with the given key.');
  }
}

async function listInactiveKeys() {
  const rows = await db.all('SELECT key FROM apiKeys WHERE active = 0');
  console.log('Inactive API keys:', rows);
}

async function listActiveKeys() {
  const rows = await db.all('SELECT key FROM apiKeys WHERE active = 1');
  console.log('Active API keys:', rows);
}

function getOllamaURL() {
  if (process.env.OLLAMA_URL) {
    return Promise.resolve(process.env.OLLAMA_URL);
  }
  return new Promise((resolve, reject) => {
    if (fs.existsSync('ollamaURL.conf')) {
      fs.readFile('ollamaURL.conf', 'utf8', (err, data) => {
        if (err) {
          reject(new Error('Error reading Ollama url from file: ' + err.message));
        } else {
          const ollamaURL = data.trim();
          if (typeof ollamaURL !== 'string' || ollamaURL === '') {
            reject(new Error('Invalid Ollama url in ollamaURL.conf'));
          } else {
            resolve(ollamaURL);
          }
        }
      });
    } else {
      reject(new Error('Ollama url configuration file not found'));
    }
  });
}

async function resolveAndVerify(urlStr) {
  const parsed = new URL(urlStr);
  const host = parsed.hostname;
  const ips = [];

  try {
    const v4 = await dns.resolve4(host);
    ips.push(...v4);
  } catch {}

  try {
    const v6 = await dns.resolve6(host);
    ips.push(...v6);
  } catch {}

  if (ips.length === 0) return null;

  for (const ip of ips) {
    if (net.isIPv4(ip) && isPrivateIPv4(ip)) return null;
    if (net.isIPv6(ip) && isPrivateIPv6(ip)) return null;
  }

  // Pick the first resolved IP to connect to directly, preventing DNS rebinding
  const ip = ips[0];
  const portPart = parsed.port ? `:${parsed.port}` : '';
  const ipUrl = `${parsed.protocol}//${ip}${portPart}${parsed.pathname}${parsed.search}${parsed.hash}`;

  return { url: ipUrl, host };
}

async function sendWebhookNotification(apikey, responseText) {
  try {
    const rows = await db.all('SELECT * FROM webhooks WHERE api_key = ?', [apikey]);
    const results = await Promise.allSettled(rows.map(async (row) => {
      try {
        const verified = await resolveAndVerify(row.url);
        if (!verified) {
          console.error('Webhook URL resolves to a blocked or unresolvable address:', row.url);
          return;
        }
        await axios.post(verified.url, { text: responseText }, {
          timeout: 10000,
          maxRedirects: 0,
          headers: { 'Content-Type': 'application/json', 'Host': verified.host },
        });
        await db.run('UPDATE webhooks SET last_triggered = ? WHERE id = ?', [new Date().toISOString(), row.id]);
      } catch (err) {
        console.error('Error sending webhook notification:', err.message);
      }
    }));
    for (const r of results) {
      if (r.status === 'rejected') console.error('Webhook send failed:', r.reason?.message);
    }
  } catch (err) {
    console.error('Error retrieving webhooks:', err.message);
  }
}

module.exports = {
  startServer,
  getServer,
  resolveConfig,
  startCLI,
  getOllamaURL,
  sendWebhookNotification,
  isBlockedURL,
  resolveAndVerify,
  VALID_URL_PATTERN
};
