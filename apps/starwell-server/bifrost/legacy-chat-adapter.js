'use strict';

const { bearerFromHeader, validateRuntimeToken } = require('../security/runtime-token');
const { resolveLegacyMember } = require('./legacy-member-map');

function stripHtml(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normaliseContext(context = []) {
  if (!Array.isArray(context)) return [];
  return context.slice(-10).map((item) => ({
    speaker: String(item?.member || item?.speaker || item?.from || 'unknown'),
    text: stripHtml(item?.html || item?.text || item?.content || ''),
  })).filter((item) => item.text);
}

function internalBaseUrl(env = process.env) {
  return String(env.HEARTHGATE_INTERNAL_URL || `http://127.0.0.1:${env.PORT || 3000}`).replace(/\/$/, '');
}

async function proxyLegacyMemberChat({
  memberId,
  prompt,
  context = [],
  authorization = '',
  fetchImpl = globalThis.fetch,
  env = process.env,
} = {}) {
  const token = bearerFromHeader(authorization);
  const auth = validateRuntimeToken(token, env);
  if (!auth.configured) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'runtime-token-not-configured',
        message: 'Set ARCSWEEP_RUNTIME_TOKEN or HEARTHGATE_GATEWAY_TOKEN before legacy member chat can use the Bifröst bridge.',
      },
    };
  }
  if (!auth.ok) {
    return {
      ok: false,
      status: 401,
      body: { error: 'runtime-token-required', message: 'A valid House runtime Bearer token is required.' },
    };
  }

  const resolved = resolveLegacyMember(memberId);
  if (!resolved) {
    return {
      ok: false,
      status: 400,
      body: { error: `No canonical Bifröst route for legacy member: ${memberId}` },
    };
  }

  const message = stripHtml(prompt);
  if (!message) {
    return { ok: false, status: 400, body: { error: 'prompt required' } };
  }

  const response = await fetchImpl(`${internalBaseUrl(env)}/api/v1/flames/${encodeURIComponent(resolved.flameId)}/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      context: normaliseContext(context),
      session_id: `legacy-member-chat-${resolved.canonicalVoiceId}`,
      metadata: {
        contract: 'bifrost.legacy-member-chat/v1',
        legacy_member_id: String(memberId || ''),
        expected_profile_id: resolved.profileId,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: {
        error: data.error || `Bifröst Flame route failed (${response.status})`,
        memberId,
        flameId: resolved.flameId,
        profileId: resolved.profileId,
        runtime: data.runtime || null,
      },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      reply: String(data.message || ''),
      parts: [String(data.message || '')],
      memberId,
      flameId: resolved.flameId,
      canonicalVoiceId: resolved.canonicalVoiceId,
      displayName: resolved.displayName,
      identity: resolved.identity,
      profileId: data.profile_id || resolved.profileId,
      provider: data.provider || resolved.provider,
      model: data.model || resolved.model,
      sourceModel: data.source_model || resolved.sourceModel,
      runtimeVerified: data.runtime_verified === true,
      citedSources: data.cited_sources || [],
    },
  };
}

function createLegacyMemberChatHandler(options = {}) {
  return async function legacyMemberChatHandler(req, res) {
    try {
      const result = await proxyLegacyMemberChat({
        memberId: req.body?.memberId,
        prompt: req.body?.prompt,
        context: req.body?.context || [],
        authorization: req.headers?.authorization || '',
        fetchImpl: options.fetchImpl || globalThis.fetch,
        env: options.env || process.env,
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      return res.status(502).json({
        error: 'legacy-bifrost-proxy-failed',
        detail: error?.message || String(error),
      });
    }
  };
}

module.exports = {
  stripHtml,
  normaliseContext,
  internalBaseUrl,
  proxyLegacyMemberChat,
  createLegacyMemberChatHandler,
};
