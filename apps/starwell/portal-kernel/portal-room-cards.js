import { yggRoomTemplates } from '../src/interfaces/yggInterfaceRegistry.js';
import { createYggRoomCardDeck } from '../src/interfaces/yggRoomCards.js';

const output = document.querySelector('[data-output]');
const cardsRoot = document.querySelector('[data-room-cards]');

function readOutputPayload() {
  try {
    return JSON.parse(output?.textContent ?? '{}');
  } catch {
    return {};
  }
}

function renderCards() {
  if (!cardsRoot) return;
  const payload = readOutputPayload();
  const deck = createYggRoomCardDeck({
    templates: yggRoomTemplates,
    roomProposal: payload.roomBuilder?.lastProposal,
    weatherSoundProposal: payload.soundContract?.currentProposal,
  });
  const cards = [deck.roomSeed, deck.weatherScene, ...deck.templates];
  cardsRoot.replaceChildren(...cards.map(createCardElement));
}

function createCardElement(card) {
  const article = document.createElement('article');
  article.className = `room-card ${card.type}`;

  const eyebrow = document.createElement('p');
  eyebrow.className = 'room-card-eyebrow';
  eyebrow.textContent = card.eyebrow;

  const title = document.createElement('h2');
  title.textContent = card.title;

  const status = document.createElement('p');
  status.className = 'room-card-status';
  status.textContent = card.status;

  const description = document.createElement('p');
  description.className = 'room-card-description';
  description.textContent = card.description;

  const fields = document.createElement('dl');
  fields.className = 'room-card-fields';
  card.fields.forEach((field) => {
    const term = document.createElement('dt');
    term.textContent = field.label;
    const detail = document.createElement('dd');
    detail.textContent = String(field.value);
    fields.append(term, detail);
  });

  article.append(eyebrow, title, status, description, fields);
  return article;
}

const observer = new MutationObserver(renderCards);
if (output) observer.observe(output, { childList: true, characterData: true, subtree: true });
renderCards();
