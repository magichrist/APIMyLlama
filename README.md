
```
                    ╔═══════════════════════════════════════════╗
                    ║                                           ║
                    ║      █████╗ ██████╗ ██╗███╗   ███╗██╗    ║
                    ║     ██╔══██╗██╔══██╗██║████╗ ████║██║    ║
                    ║     ███████║██████╔╝██║██╔████╔██║██║    ║
                    ║     ██╔══██║██╔═══╝ ██║██║╚██╔╝██║██║    ║
                    ║     ██║  ██║██║     ██║██║ ╚═╝ ██║██║    ║
                    ║     ╚═╝  ╚═╝╚═�     ╚═╝╚═╝     ╚═╝╚═╝    ║
                    ║                                           ║
                    ║       ⚡ LLM API Gateway ⚡               ║
                    ║    ～ 鍵をかける、放つ、制御する ～        ║
                    ║                                           ║
                    ╚═══════════════════════════════════════════╝
```

<p align="center">
  <b>APIキー管理・レート制限・Webhook通知でOllamaをプロのように運用</b><br>
  <i>Manage, secure, and monitor your Ollama LLM deployments with API keys, rate limits, and webhooks.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-26.x-339933?style=flat&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?style=flat&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/status-battle__ready-ff69b4" />
</p>

---

## 📖 Table of Contents

- [What is APIMyLlama?](#-what-is-apimyllama)
- [Quickstart](#-quickstart)
- [Docker](#-docker)
- [Curl Use Cases](#-curl-use-cases)
- [Admin Dashboard](#-admin-dashboard)
- [Webhooks (Slack)](#-webhooks-slack)
- [CLI Commands](#-cli-commands)
- [Environment Variables](#-environment-variables)
- [Security](#-security)
- [Official Client Libraries](#-official-client-libraries)
- [FAQ](#-faq)

---

## ⚡ What is APIMyLlama?

**APIMyLlama** is a production-ready API gateway for [Ollama](https://ollama.com). It wraps your local LLM behind a secure REST API with:

- 🔑 **Per-user API keys** (auto-generated or custom)
- 🚦 **Per-key rate limiting** (token bucket algorithm)
- 🛡️ **Brute-force protection** (IP-based lockout after 5 failures)
- 🔔 **Slack webhook notifications** (per-key, with SSRF protection)
- 📊 **Admin dashboard** (Vue.js UI)
- 📝 **Usage logging**
- 🐳 **Docker support**

```
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Client   │───▶│ APIMyLlama   │───▶│  Ollama   │
│ (curl/SDK)│    │  (port 3000) │    │ (11434)   │
└──────────┘    └──────┬───────┘    └──────────┘
                       │
              ┌────────┴────────┐
              │  SQLite + Slack │
              │  Webhook        │
              └─────────────────┘
```

---

## 🚀 Quickstart

### 1. Prerequisites

- [Ollama](https://ollama.com/download) installed with a model pulled (`ollama pull llama3`)
- [Node.js](https://nodejs.org) >= 22
- `ollama serve` running in the background

### 2. Install & Run

```bash
git clone https://github.com/Gimer-Studios/APIMyLlama.git
cd APIMyLlama
npm install
node APIMyLlama.js
```

On first run you'll be prompted for a **port** and **Ollama URL**. These are saved to `.conf` files for subsequent starts.

```
$ node APIMyLlama.js

                    ╔═══════════════════════════════════════════╗
                    ║           APIMyLlama V2                  ║
                    ╚═══════════════════════════════════════════╝

  Admin token: a1b2c3d4e5f6...     ← copy this for the dashboard!
  Set ADMIN_TOKEN env var to persist across restarts.

Server running on port 3000
```

### 3. Get Your First API Key

```bash
# The CLI starts automatically. Type:
generatekey

# Output:
# Key generated: 7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6
```

Or generate one via the admin API:

```bash
curl -X POST http://localhost:3000/v1/admin/keys \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description": "my first key"}'
```

### 4. Make Your First LLM Call

```bash
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello! Who are you?", "model": "llama3"}'
```

---

## 🐳 Docker

```bash
# Build
docker build -t apimyllama .

# Run (with persistent DB)
docker run -d \
  --name apimyllama \
  -p 3000:3000 \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  -v apimyllama-data:/app/data \
  apimyllama
```

*Note: `host.docker.internal` connects to Ollama on the host machine. Adjust the URL for your setup.*

---

## 🔥 Curl Use Cases

### Basic Text Generation

```bash
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about servers", "model": "llama3"}'
```

### Streaming Response

```bash
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Tell me a story", "model": "llama3", "stream": true}'
```

### Chat with Context (Images)

```bash
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is in this image?",
    "model": "llava",
    "images": ["base64_encoded_image_data"]
  }'
```

### Health Check

```bash
curl -X GET http://localhost:3000/health \
  -H "Authorization: Bearer abc123"
```

### Using the v1-compatible Endpoint

```bash
curl -X POST http://localhost:3000/v1/generate \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "model": "llama3"}'
```

### Check Rate Limit Status

```bash
# Sending requests from a Python script to see rate limits in action
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/generate \
    -H "Authorization: Bearer abc123" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Hi", "model": "llama3"}'
done
# After the 10th request (default limit), you'll see 429s
```

### Create an API Key (Admin)

```bash
curl -X POST http://localhost:3000/v1/admin/keys \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description": "production-key-1"}'
```

### List All Keys (Admin)

```bash
curl http://localhost:3000/v1/admin/keys \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

### Deactivate / Reactivate a Key

```bash
# Deactivate
curl -X PUT http://localhost:3000/v1/admin/keys/<KEY>/deactivate \
  -H "x-admin-token: <ADMIN_TOKEN>"

# Reactivate
curl -X PUT http://localhost:3000/v1/admin/keys/<KEY>/activate \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

### Set Rate Limit on a Key

```bash
curl -X PUT http://localhost:3000/v1/admin/keys/<KEY>/rate-limit \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

### Regenerate a Key (without losing config)

```bash
curl -X POST http://localhost:3000/v1/admin/keys/<KEY>/regenerate \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

### View Usage Activity

```bash
curl http://localhost:3000/v1/admin/activity \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

### Add a Slack Webhook

```bash
curl -X POST http://localhost:3000/v1/admin/webhooks \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://hooks.slack.com/services/T00/B00/xxxxx", "apiKey": "<API_KEY>"}'
```

---

## 🎛️ Admin Dashboard

APIMyLlama ships with a built-in Vue.js admin UI served directly by Express.

```
http://localhost:3000/
```

| Page | Description |
|------|-------------|
| **Dashboard** | Real-time stats: total keys, active keys, requests served, model usage |
| **API Keys** | CRUD for keys, rate limit sliders, activate/deactivate, regenerate |
| **Settings** | Webhook management with per-key association |

On first load, you'll be prompted for the **admin token** (printed in the server console or set via `ADMIN_TOKEN` env var).

---

## 🔔 Webhooks (Slack)

Webhooks fire when an LLM request using the associated API key completes successfully. The payload sent to Slack is the **model's raw response text**.

### Setup

1. Create a Slack webhook URL in your Slack workspace:
   - Go to `https://api.slack.com/apps` → Create an app → Incoming Webhooks
   - Copy the webhook URL

2. Add it to APIMyLlama:

```bash
curl -X POST http://localhost:3000/v1/admin/webhooks \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://hooks.slack.com/services/...", "apiKey": "<API_KEY>"}'
```

3. Every time that API key is used, Slack receives:
```
Hello! I am Llama 3, an AI assistant created by Meta...
```

### Security

- ✅ **Per-key scoping**: only webhooks matching the request's API key fire
- ✅ **SSRF protection**: private/internal IPs blocked via DNS resolution + IP range checking
- ✅ **No redirect following**: `maxRedirects: 0` prevents SSRF redirect attacks
- ✅ **URL validation**: protocol, format, and credential check

---

## 🖥️ CLI Commands

The built-in CLI starts automatically with the server.

| Command | Description |
|---------|-------------|
| `generatekey` | Generate a new API key (cryptographically random) |
| `listkey` | List all API keys |
| `removekey <key>` | Delete an API key |
| `addkey <key>` | Add a custom key (use with caution) |
| `changeport <port>` | Change server port (no restart needed) |
| `changeollamaurl <url>` | Change the Ollama server URL |
| `addwebhook <url>` | Add a webhook URL |
| `listwebhooks` | List all webhooks |
| `deletewebhook <id>` | Delete a webhook by ID |
| `ratelimit <key> <limit>` | Set rate limit for a key (req/min) |
| `deactivatekey <key>` | Deactivate an API key |
| `activatekey <key>` | Reactivate an API key |
| `addkeydescription <key>` | Add a description to a key |
| `listkeydescription <key>` | View a key's description |
| `generatekeys <n>` | Bulk-generate N keys |
| `regeneratekey <key>` | Re-roll a key (preserves config) |
| `activateallkeys` | Activate every key |
| `deactivateallkeys` | Deactivate every key |
| `getkeyinfo <key>` | Detailed key information |
| `listactivekeys` | List only active keys |
| `listinactivekeys` | List only inactive/deactivated keys |

---

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `ADMIN_TOKEN` | *(auto-generated)* | Admin API auth token. If unset, a random 64-hex-char token is generated each startup |
| `API_KEYS_DB_PATH` | `./apiKeys.db` | SQLite database path |
| `NODE_ENV` | — | `production` enables static UI serving, `combined` morgan logs |
| `VITE_ADMIN_TOKEN` | — | *(deprecated)* Removed for security — use the login page instead |

---

## 🛡️ Security

| Feature | Status | Details |
|---------|--------|---------|
| 🔑 API key auth | ✅ | Bearer token in `Authorization` header |
| 🚦 Rate limiting | ✅ | Token bucket per key, batch DB writes (3s flush) |
| 🛡️ Brute-force lockout | ✅ | IP-based, 5 failed attempts, 15min lockout |
| 🔒 Admin token | ✅ | Auto-generated 32-byte random hex, `timingSafeEqual` comparison |
| 🚫 SSRF protection | ✅ | DNS resolution + private IP range checks + no redirects |
| 🔐 Parameterized SQL | ✅ | All queries use `?` placeholders — no SQL injection |
| 📝 Error leakage | ⚠️ | Some `err.message` returned to admin API callers |
| 🌐 CORS | ⚠️ | Wildcard origin (acceptable for API proxy use case) |
| 🪖 Security headers | ⚠️ | Helmet not yet enabled |

---

## 📦 Official Client Libraries

| Language | Package | Install |
|----------|---------|---------|
| **Node.js** | [`apimyllama-node-package`](https://npmjs.com/package/apimyllama-node-package) | `npm install apimyllama-node-package` |
| **Python** | [`apimyllama`](https://pypi.org/project/apimyllama/) | `pip install apimyllama` |
| **Java** | `com.github.Gimer-Studios:APIMyLlama-Java-Package:V2.0.5` | Jitpack |
| **Rust** | [`apimyllama`](https://crates.io/crates/apimyllama) | `cargo add apimyllama` |

### Node.js Example

```javascript
const apiMyLlama = require('apimyllama-node-package');

apiMyLlama.generate('API_KEY', 'Hello!', 'llama3', '127.0.0.1', 3000, false)
  .then(res => console.log(res))
  .catch(err => console.error(err));
```

### Python Example

```python
from apimyllama import ApiMyLlama

api = ApiMyLlama('127.0.0.1', 3000)
result = api.generate('API_KEY', 'Hello!', 'llama3')
print(result)
```

---

## ❓ FAQ

**Q: Module not found error?**  
A: Run `npm install` before starting.

**Q: Can't connect from outside my network?**  
A: Port-forward port 3000 (or your configured port). APIMyLlama does not handle TLS — put it behind nginx/Caddy for HTTPS.

**Q: `Error: listen tcp 127.0.0.1:11434: bind: Only one usage...`**  
A: Close the Ollama system tray app (Windows) or `systemctl stop ollama` (Linux), then `ollama serve`.

**Q: `Error making request to Ollama API`**  
A: Verify `ollama serve` is running and the URL in `ollamaURL.conf` is correct. Use `changeollamaurl` to update it.

**Q: Webhook not firing?**  
A: Check the server console logs for `sendWebhookNotification` messages. The webhook must be created with the **same API key** used in the request.

**Q: Admin token keeps changing?**  
A: Set the `ADMIN_TOKEN` env var to a fixed value. Without it, a random token is generated on every startup.

---

## 💖 Support

- [Ko-fi](https://ko-fi.com/gimerstudios) — buy us a coffee ☕
- [Discord](https://discord.gg/r6XazGtKg7) — get help, request features
- [GitHub Issues](https://github.com/Gimer-Studios/APIMyLlama/issues) — bug reports

---

<p align="center">
  <sub>Made with ⚡ by <a href="https://github.com/Gimer-Studios">Gimer Studios</a></sub><br>
  <sub>鍵をかける、放つ、制御する — Secure, unleash, control.</sub>
</p>
