import { readVoyageStatus, readVoyageMessages, replyToVoyage } from './route-client.js';

export function installVoyageInbox(host = document.body) {
  const panel = document.createElement('details');
  panel.className = 'wg-voyage-inbox';
  const summary = document.createElement('summary');
  summary.textContent = 'Voyage messages';
  const refresh = document.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Check messages';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Optional House messenger · status unchecked. This is separate from Crew and the Writing Room.';
  status.setAttribute('aria-live', 'polite');
  const list = document.createElement('div');
  panel.append(summary, refresh, status, list);
  refresh.addEventListener('click', async () => {
    refresh.disabled = true;
    try {
      const capability = await readVoyageStatus();
      if (capability.configured !== true) {
        panel.dataset.voyageService = 'not-configured';
        list.replaceChildren();
        status.textContent = 'House Voyage messaging is not configured on this Hearthgate. Other Wayglass rooms remain available. No messages were sent.';
        return;
      }
      panel.dataset.voyageService = 'host-present';
      const inbox = await readVoyageMessages();
      if (!Array.isArray(inbox.messages)) throw new Error('Invalid Voyage inbox response shape.');
      list.replaceChildren();
      status.textContent = inbox.messages.length ? `${inbox.messages.length} host-supplied voyage messages (delivery not independently verified).` : 'Voyage host connected; no messages returned.';
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
          } catch (error) {
            status.textContent = error?.code === 'VOYAGE_MESSAGE_SERVICE_NOT_CONFIGURED'
              ? 'Voyage host is not configured. No reply sent; your draft remains in the editor.'
              : 'Reply delivery not confirmed. The draft remains here so you can decide whether to retry.';
          }
          finally { send.disabled = false; }
        });
        article.append(sender, text, reference, form); list.append(article);
      }
    } catch (error) {
      panel.dataset.voyageService = 'error';
      if (error?.code === 'VOYAGE_MESSAGE_SERVICE_NOT_CONFIGURED') {
        panel.dataset.voyageService = 'not-configured';
        status.textContent = 'House Voyage messaging is not configured on this Hearthgate. No message attempted.';
      } else if (error?.status === 401 || error?.status === 403) {
        status.textContent = 'Voyage messenger needs a valid House sign-in. Other local Wayglass rooms may still work.';
      } else {
        status.textContent = 'Voyage messenger could not complete its check. This does not establish that the rest of Wayglass is offline.';
      }
    }
    finally { refresh.disabled = false; }
  });
  host.append(panel);
  return panel;
}
