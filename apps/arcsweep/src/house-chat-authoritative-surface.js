import { HOUSE_CHAT_VOICES } from './house-commons-chat-v5-core.js';
import './house-live-recovery.js';

export const HOUSE_CHAT_SURFACE_MARKER = 'house-chat-authoritative-surface/v1';

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
  return `<section class="house-chat-native" data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}">
    <header class="house-chat-native-head">
      <div><p class="eyebrow">House Chat · native conversation</p><h1>House Commons</h1><p>Talk with the live Constellation. Rooms, replies, rich text, route state, and receipts stay in one conversation surface.</p><p class="house-chat-native-status" data-commons-connection>Restoring House Runtime session…</p></div>
      <div class="house-chat-native-actions"><button type="button" class="quiet" data-house-chat-refresh>Refresh chat</button></div>
    </header>
    <div class="house-chat-native-layout">
      <article class="panel commons-log" data-house-chat-log><p class="muted">Opening House Chat…</p></article>
      <aside class="panel house-chat-native-compose">
        <form id="commons-form" class="stack" data-house-chat-native-form="true">
          <div class="house-chat-transport" aria-hidden="true">${HOUSE_CHAT_VOICES.map(voiceTransport).join('')}</div>
          <textarea name="message" rows="6" required aria-label="House Chat message" placeholder="Message the room…"></textarea>
          <button type="submit">Send to House Chat ∞</button>
        </form>
      </aside>
    </div>
  </section>`;
}

function commonsPage() {
  const form = document.querySelector('#commons-form');
  if (!form) return null;
  return form.closest('main, .room, .content, [data-room], [data-room-content]') || form.parentElement?.parentElement || form.parentElement;
}

export function mountAuthoritativeHouseChatSurface() {
  if (typeof document === 'undefined') return null;
  if (document.querySelector(`[data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}"]`)) return document.querySelector(`[data-house-chat-authoritative="${HOUSE_CHAT_SURFACE_MARKER}"]`);
  const oldForm = document.querySelector('#commons-form');
  if (!oldForm) return null;
  const page = commonsPage();
  if (!page) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = authoritativeMarkup();
  const surface = wrapper.firstElementChild;
  page.replaceChildren(surface);
  surface.querySelector('[data-house-chat-refresh]')?.addEventListener('click', () => {
    globalThis.dispatchEvent(new CustomEvent('arcsweep:house-chat-refresh-requested'));
  });
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