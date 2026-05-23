import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const DEFAULT_BASE_URL = 'http://localhost:1995';

export function getSandboxConfig() {
  return {
    baseUrl: process.env.EVERCORE_BASE_URL || DEFAULT_BASE_URL,
    userId: process.env.EVERCORE_USER_ID || 'rowan',
    groupId: process.env.EVERCORE_GROUP_ID || 'starwell-sandbox',
    groupName: process.env.EVERCORE_GROUP_NAME || 'STARWELL Sandbox',
    retrieveMethod: process.env.EVERCORE_RETRIEVE_METHOD || 'rrf',
    memoryType: process.env.EVERCORE_MEMORY_TYPE || 'episodic_memory'
  };
}

function makeMessageId(prefix = 'flameclyffe') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}_${random}`;
}

function requestJson(baseUrl, path, { method = 'GET', body, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body ? JSON.stringify(body) : '';
    const client = url.protocol === 'https:' ? https : http;

    const request = client.request(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: timeoutMs
      },
      response => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          text += chunk;
        });
        response.on('end', () => {
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (error) {
            reject(new Error(`EverCore returned non-JSON response (${response.statusCode}): ${text.slice(0, 300)}`));
            return;
          }

          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`EverCore request failed (${response.statusCode}): ${JSON.stringify(data)}`));
            return;
          }

          resolve(data);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`EverCore request timed out after ${timeoutMs}ms`));
    });
    request.on('error', reject);

    if (payload) request.write(payload);
    request.end();
  });
}

export async function checkHealth(config = getSandboxConfig()) {
  return requestJson(config.baseUrl, '/health');
}

export async function storeMemory(content, options = {}) {
  if (!content || !content.trim()) {
    throw new Error('storeMemory requires non-empty content.');
  }

  const config = { ...getSandboxConfig(), ...options };
  const message = {
    message_id: options.messageId || makeMessageId(config.groupId),
    create_time: options.createTime || new Date().toISOString(),
    sender: options.sender || config.userId,
    sender_name: options.senderName || 'Rowan',
    role: options.role || 'user',
    content: content.trim(),
    group_id: config.groupId,
    group_name: config.groupName,
    refer_list: options.referList || []
  };

  return requestJson(config.baseUrl, '/api/v0/memories', {
    method: 'POST',
    body: message
  });
}

export async function searchMemories(query, options = {}) {
  if (!query || !query.trim()) {
    throw new Error('searchMemories requires a non-empty query.');
  }

  const config = { ...getSandboxConfig(), ...options };
  const body = {
    query: query.trim(),
    user_id: config.userId,
    group_ids: [config.groupId],
    retrieve_method: config.retrieveMethod,
    memory_types: [config.memoryType],
    top_k: Number(options.topK || 10),
    include_metadata: true
  };

  // EverCore documents memory search as GET with a JSON body. Node's fetch
  // rejects GET bodies, so this client uses node:http directly.
  return requestJson(config.baseUrl, '/api/v0/memories/search', {
    method: 'GET',
    body
  });
}
