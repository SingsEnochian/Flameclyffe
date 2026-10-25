import { readVoyageMessages, replyToVoyage } from './route-client.js';

export function installVoyageInbox(host = document.body) {
  const panel = document.createElement('details');
  panel.className = 'wg-voyage-inbox';
  const summary = document.createElement('summary');
  summary.textContent = 'Voyage messages';
  const refresh = document.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Check messages';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Check for messages from the voyage.';
  const list = document.createElement('div');
  panel.append(summary, refresh, status, list);
  refresh.addEventListener('click', async () => {
    refresh.disabled = true;
    try {
      const inbox = await readVoyageMessages();
      list.replaceChildren();
      status.textContent = inbox.messages.length ? `${inbox.messages.length} voyage messages.` : 'No voyage messages yet.';
      for (const message of inbox.messages) {
        const article = document.createElement('article');
        const sender = document.createElement('h3');
        sender.textContent = `${message.participant_id} · ${message.kind}`;
        const text = document.createElement('p'); text.textContent = message.text;
        const reference = document.createElement('small'); reference.textContent = `${message.voyage_ref} · ${message.created_at}`;
        const form = document.createElement('form');
        const label = document.createElement('label'); label.textContent = `Reply to ${message.participant_id}`;
        const input = document.createElement('textarea'); input.required = true; input.maxLength = 12000;
        label.append(input);
        const send = document.createElement('button'); send.type = 'submit'; send.textContent = 'Send reply';
        form.append(label, send);
        form.addEventListener('submit', async event => {
          event.preventDefault(); send.disabled = true;
          try {
            await replyToVoyage({ recipientId: message.participant_id, voyageRef: message.voyage_ref, text: input.value });
            status.textContent = `Reply sent to ${message.participant_id}.`; input.value = '';
          } catch { status.textContent = 'Your reply could not be delivered. It remains here to retry.'; }
          finally { send.disabled = false; }
        });
        article.append(sender, text, reference, form); list.append(article);
      }
    } catch { status.textContent = 'Voyage messages are unavailable. The host connection needs to be ready.'; }
    finally { refresh.disabled = false; }
  });
  host.append(panel);
  return panel;
}
