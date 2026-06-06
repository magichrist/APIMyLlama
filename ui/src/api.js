const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'admin'

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': ADMIN_TOKEN,
      ...options.headers
    },
    ...options
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getStats: () => request('/v1/admin/stats'),
  getKeys: () => request('/v1/admin/keys'),
  getKey: (key) => request(`/v1/admin/keys/${encodeURIComponent(key)}`),
  createKey: (description) => request('/v1/admin/keys', {
    method: 'POST',
    body: JSON.stringify({ description: description || undefined })
  }),
  deleteKey: (key) => request(`/v1/admin/keys/${encodeURIComponent(key)}`, {
    method: 'DELETE'
  }),
  activateKey: (key) => request(`/v1/admin/keys/${encodeURIComponent(key)}/activate`, {
    method: 'PUT'
  }),
  deactivateKey: (key) => request(`/v1/admin/keys/${encodeURIComponent(key)}/deactivate`, {
    method: 'PUT'
  }),
  setRateLimit: (key, limit) => request(`/v1/admin/keys/${encodeURIComponent(key)}/rate-limit`, {
    method: 'PUT',
    body: JSON.stringify({ limit })
  }),
  setDescription: (key, description) => request(`/v1/admin/keys/${encodeURIComponent(key)}/description`, {
    method: 'PUT',
    body: JSON.stringify({ description })
  }),
  regenerateKey: (key) => request(`/v1/admin/keys/${encodeURIComponent(key)}/regenerate`, {
    method: 'POST'
  }),
  getActivity: () => request('/v1/admin/activity'),
  getWebhooks: (key) => key
    ? request(`/v1/admin/webhooks?key=${encodeURIComponent(key)}`)
    : request('/v1/admin/webhooks'),
  addWebhook: (url, apiKey) => request('/v1/admin/webhooks', {
    method: 'POST',
    body: JSON.stringify({ url, apiKey })
  }),
  deleteWebhook: (id) => request(`/v1/admin/webhooks/${id}`, {
    method: 'DELETE'
  }),
  getConfig: () => request('/v1/admin/config'),
  getHealth: () => request('/v1/admin/health'),
  getModels: () => request('/v1/admin/models')
}
