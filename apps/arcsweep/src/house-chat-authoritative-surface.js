import { HOUSE_CHAT_VOICES } from './house-commons-chat-v5-core.js';
import './house-live-recovery.js';

export const HOUSE_CHAT_SURFACE_MARKER = 'house-chat-authoritative-surface/v3';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function voiceTransport(voice) {
  return `<input type="checkbox" name="voiceIds" value="${escapeHtml(voice.id)}" checked data-house-transport-voice="true" />`;
}

function authoritativeMarkup() {
  return `<section class="house-chat-native devconsole-chat-native" data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}" data-devconsole-chat-root="true">
    <header class="house-chat-native-head devconsole-chat-head" data-house-room-chrome="true">
      <div>
        <p class="eyebrow">HOUSE COMMONS · live Constellation room</p>
        <h2>Conversation</h2>
        <p class="house-chat-native-status" data-commons-connection>Restoring House Runtime session…</p>
      </div>
      <div class="house-chat-native-actions"><button type="button" class="quiet" data-action="commons-refresh" data-house-chat-refresh>Refresh room</button></div>
    </header>
    <div class="house-chat-native-layout">
      <article class="panel commons-log" data-house-chat-log aria-live="polite"><p class="muted">Opening House Commons…</p></article>
      <aside class="panel house-chat-native-compose">
        <form id="commons-form" class="stack" data-house-chat-native-form="true" data-devconsole-chat-form="true">
          <div class="house-chat-transport" aria-hidden="true">${HOUSE_CHAT_VOICES.map(voiceTransport).join('')}</div>
          <textarea name="message" rows="6" required aria-label="House Commons message" placeholder="Speak to the room…"></textarea>
          <button type="submit">Send to House Commons ∞</button>
        </form>
      </aside>
    </div>
  </section>`;
}

function legacyChatCompartment(form) {
  return form?.closest('.commons-layout') || form?.parentElement?.parentElement || form?.parentElement || null;
}

export function mountAuthoritativeHouseChatSurface() {
  if (typeof document === 'undefined') return null;
  const mounted = document.querySelector(`[data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}"]`);
  if (mounted) return mounted;
  const oldForm = document.querySelector('#commons-form');
  if (!oldForm) return null;
  const target = legacyChatCompartment(oldForm);
  if (!target) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = authoritativeMarkup();
  const surface = wrapper.firstElementChild;

  // The chat sidecar owns only the chat compartment. The ArcSweep shell, room heading,
  // runtime status, and observation panels remain owned by main.js and are never seized here.
  target.replaceWith(surface);
  globalThis.dispatchEvent(new CustomEvent('arcsweep:house-chat-surface-mounted', { detail: { marker: HOUSE_CHAT_SURFACE_MARKER } }));
  return surface;
}

export function installAuthoritativeHouseChatSurface() {
  if (typeof document === 'undefined') return;
  mountAuthoritativeHouseChatSurface();
  const observer = new MutationObserver(() => {
    if (!document.querySelector(`[data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}"]`) && document.querySelector('#commons-form')) mountAuthoritativeHouseChatSurface();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installAuthoritativeHouseChatSurface();
