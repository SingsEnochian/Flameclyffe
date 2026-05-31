import React, { useMemo, useState } from 'react';
import './observer-atelier.css';

const canonCards = [
  {
    id: 'falka-hair',
    glyph: '🔥',
    type: 'Hair Canon',
    title: 'Falka · The Hair',
    status: 'Approved anchor',
    summary: 'Dense auburn-red waves with a smooth mixed surface, soft movement, warm light-catching ripples, and only a few fine detail pieces.',
    must: [
      'dense auburn-red waves',
      'smooth blended hair surface',
      'large soft ripples',
      'candlelit copper highlights',
      'a few delicate detail strands only',
      'weight, flow, and movement',
    ],
    avoid: [
      'stringy hair',
      'pixelated strand texture',
      'copper spaghetti',
      'over-rendered individual hairs',
      'frizzy wire texture',
      'flat red wig shape',
    ],
    tags: ['Falka', 'Hair Canon', 'Approved'],
  },
  {
    id: 'falka-face',
    glyph: '🍂',
    type: 'Character Anchor',
    title: 'Falka · Hearthlight Presence',
    status: 'Canon seed',
    summary: 'Pale warm skin, light freckles across cheeks and nose, green-hazel gaze, copper-red mythic presence, short enough to fit under Vee’s chin.',
    must: [
      'short romantic heroine scale',
      'warm pale skin with light freckles',
      'green-hazel eyes',
      'soft but sovereign expression',
      'teal and gold gothic romance styling',
      'luminous candlelit complexion',
    ],
    avoid: [
      'wrong face anchor',
      'overly tanned skin',
      'tilted head in every image',
      'stiff fashion catalogue posing',
      'generic fantasy face',
      'heavy harsh makeup',
    ],
    tags: ['Falka', 'Face Canon', 'Scale'],
  },
  {
    id: 'vee-gabriel',
    glyph: '🜂',
    type: 'Character Anchor',
    title: 'Vee · Gabriel Flame',
    status: 'Canon seed',
    summary: 'Auburn-haired, compact, wiry, storm-warm presence with dark library styling, black shirt or leather, attentive posture, and dangerous tenderness.',
    must: [
      'short king wiry build',
      'auburn red-brown hair catching amber light',
      'black shirt or dark leather',
      'protective posture without stiffness',
      'warm smoulder and clever eyes',
      'Gabriel/Sariel romance-cover energy',
    ],
    avoid: [
      'random tattoos unless requested',
      'too tall or bulky',
      'cold possessive staging',
      'flat villain glare',
      'wet string hair',
      'generic pirate costume unless selected',
    ],
    tags: ['Vee', 'Gabriel', 'Character Canon'],
  },
  {
    id: 'pairing-pose',
    glyph: '💛',
    type: 'Pose Language',
    title: 'Falka/Vee · Forever Poses',
    status: 'Live loom',
    summary: 'Leaning back against him, under-chin height difference, library chair compositions, almost-kiss tension, desk-adjacent combustion risk.',
    must: [
      'Falka leaning back into Vee',
      'height difference visible and tender',
      'close clothed gothic romance composition',
      'hands placed clearly and naturally',
      'almost-kiss or quiet eye contact',
      'classy intimate warmth',
    ],
    avoid: [
      'awkward hand placement',
      'anatomy-reference pose chaos',
      'same tilted head every time',
      'stiff prom photo framing',
      'floating bodies',
      'unreadable limbs',
    ],
    tags: ['Falka/Vee', 'Pose Canon', 'Romance'],
  },
  {
    id: 'gobby-desk',
    glyph: '🧾',
    type: 'Reject Pattern',
    title: 'Gobby’s Complaint Desk',
    status: 'Mock constructively',
    summary: 'The place where failed traits go to be named, tagged, laughed at gently, and kept from sneaking back into the next prompt.',
    must: [
      'failed traits become explicit avoid terms',
      'approved anchors stay visible',
      'prompt lineage is tracked',
      'the system learns what Rowan means',
      'humour stays in the margins',
      'no beige pearl clutching',
    ],
    avoid: [
      'forgetting approved hair',
      'forgetting scale',
      'repeating rejected poses',
      'unclear image lineage',
      'lost canon notes',
      'unlabelled visual drift',
    ],
    tags: ['Gobby', 'Reject Pattern', 'Lineage'],
  },
];

const poseSeeds = [
  'Falka seated on Vee’s lap in a carved leather chair, leaning forward with her hand on his shoulder while he looks up at her',
  'Falka leaning back against Vee in the candlelit library, his chin near her hair, both calm and powerful',
  'Vee seated at the desk while Falka stands between him and the bookshelves, her hair rippling over one shoulder',
  'Falka perched on the antique desk with Vee standing close, one hand braced on the table, faces near but not kissing',
  'Falka and Vee turned toward each other in profile, almost-kiss tension, old books and low candles around them',
  'Falka curled into Vee’s arms in the library chair, quiet after-the-storm tenderness',
];

const sceneSeeds = [
  'candlelit gothic library with old books, worn leather, amber shadows, and teal velvet',
  'antique study with maps, brass instruments, dark wood, and a desk at severe risk of poetic ignition',
  'moonlit window alcove with rain on old glass, warm candles inside, blue night outside',
  'romance-cover portrait in the Hearthweave Observatory, mythic but photorealistic',
  'Impala backseat timeline, cinematic night lighting, intimate but clothed and elegant',
];

const lightingSeeds = [
  'warm amber candlelight with copper rim highlights in the hair',
  'soft moon fill with gold candle edge light',
  'low-key chiaroscuro, rich shadows, luminous skin, no harsh flash',
  'velvet dark background with selective highlights on hair, eyes, jewellery, and hands',
];

const lineageNotes = [
  {
    title: 'Hair breakthrough',
    verdict: 'Keep',
    note: 'Use soft flowing auburn waves, broad ripples, smooth mixed surface, and only a few fine strands.',
  },
  {
    title: 'String-Hair Hydra',
    verdict: 'Reject',
    note: 'Too many strands, pixelated texture, copper spaghetti, and over-rendered fibres.',
  },
  {
    title: 'Pose correction',
    verdict: 'Keep',
    note: 'Change poses often. Head does not need to tilt every time. Let bodies lean, turn, and counterbalance.',
  },
  {
    title: 'Scale anchor',
    verdict: 'Keep',
    note: 'Falka is short enough to fit under Vee’s chin. Preserve the tender height difference.',
  },
];

function listToPrompt(label, items) {
  return `${label}: ${items.join(', ')}.`;
}

function buildPrompt({ card, pose, scene, lighting, extraNote }) {
  return [
    'Photorealistic dark gothic romance image of Falka and Vee inside the Hearthweave visual canon.',
    listToPrompt('Primary canon', card.must),
    `Pose: ${pose}.`,
    `Scene: ${scene}.`,
    `Lighting: ${lighting}.`,
    'Style: cinematic, elegant, richly textured, intimate but clothed, emotional, mythic, polished, high-detail, romance-cover composition.',
    extraNote ? `Rowan note: ${extraNote}.` : '',
    listToPrompt('Avoid', card.avoid),
  ].filter(Boolean).join('\n');
}

export function ObserverAtelier({ now }) {
  const [selectedId, setSelectedId] = useState(canonCards[0].id);
  const [pose, setPose] = useState(poseSeeds[0]);
  const [scene, setScene] = useState(sceneSeeds[0]);
  const [lighting, setLighting] = useState(lightingSeeds[0]);
  const [extraNote, setExtraNote] = useState('');
  const [copyState, setCopyState] = useState('idle');

  const selectedCard = canonCards.find((card) => card.id === selectedId) || canonCards[0];
  const generatedPrompt = useMemo(
    () => buildPrompt({ card: selectedCard, pose, scene, lighting, extraNote }),
    [selectedCard, pose, scene, lighting, extraNote]
  );

  async function copyPrompt() {
    if (!navigator.clipboard) {
      setCopyState('manual');
      return;
    }

    await navigator.clipboard.writeText(generatedPrompt);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1600);
  }

  return (
    <section className="observer-atelier chamber-card" aria-label="Observer Atelier visual canon chamber">
      <div className="atelier-hero">
        <div>
          <p className="atelier-kicker">Visual Canon · Prompt Loom · Gobby Containment</p>
          <h2>Observer Atelier</h2>
          <p>
            A living image-canon workbench for Falka, Vee, the Hair, pose language, lighting, scene lineage,
            and every rejected little goblin-shaped failure that should never crawl back into the next render.
          </p>
        </div>
        <aside className="atelier-seal" aria-label="Atelier status">
          <span>Falka/Vee</span>
          <strong>Forever</strong>
          <em>{now ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now) : 'Live'}</em>
        </aside>
      </div>

      <div className="atelier-layout">
        <div className="canon-column" aria-label="Canon cards">
          <div className="atelier-panel-title">
            <span>Canon Cards</span>
            <strong>{canonCards.length} anchors</strong>
          </div>
          <div className="canon-card-list">
            {canonCards.map((card) => (
              <button
                type="button"
                className={`canon-card ${selectedId === card.id ? 'active' : ''}`}
                key={card.id}
                onClick={() => setSelectedId(card.id)}
              >
                <span className="canon-glyph">{card.glyph}</span>
                <span>
                  <em>{card.type}</em>
                  <strong>{card.title}</strong>
                  <small>{card.status}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <article className="canon-detail" aria-live="polite">
          <div className="atelier-panel-title">
            <span>{selectedCard.title}</span>
            <strong>{selectedCard.type}</strong>
          </div>
          <p className="canon-summary">{selectedCard.summary}</p>
          <div className="tag-row">
            {selectedCard.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>

          <div className="canon-lists">
            <div>
              <h3>Must keep</h3>
              <ul>
                {selectedCard.must.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h3>Do not summon</h3>
              <ul>
                {selectedCard.avoid.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </article>
      </div>

      <div className="prompt-loom">
        <div className="atelier-panel-title">
          <span>Prompt Loom</span>
          <strong>Forge from canon</strong>
        </div>
        <div className="loom-controls">
          <label>
            <span>Pose seed</span>
            <select value={pose} onChange={(event) => setPose(event.target.value)}>
              {poseSeeds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Scene seed</span>
            <select value={scene} onChange={(event) => setScene(event.target.value)}>
              {sceneSeeds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Lighting seed</span>
            <select value={lighting} onChange={(event) => setLighting(event.target.value)}>
              {lightingSeeds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="loom-note">
            <span>Rowan note</span>
            <input
              value={extraNote}
              onChange={(event) => setExtraNote(event.target.value)}
              placeholder="e.g. more under-chin height difference, smoother hair ripples, no tattoos"
            />
          </label>
        </div>
        <textarea className="prompt-output" readOnly value={generatedPrompt} aria-label="Generated image prompt" />
        <div className="loom-actions">
          <button type="button" onClick={copyPrompt}>{copyState === 'copied' ? 'Copied to clipboard' : 'Copy Prompt'}</button>
          {copyState === 'manual' && <span>Clipboard unavailable. Select the prompt text manually.</span>}
        </div>
      </div>

      <div className="lineage-board" aria-label="Visual lineage ledger">
        <div className="atelier-panel-title">
          <span>Lineage Ledger</span>
          <strong>What the room remembers</strong>
        </div>
        <div className="lineage-grid">
          {lineageNotes.map((note) => (
            <article className={`lineage-card ${note.verdict.toLowerCase()}`} key={note.title}>
              <p>{note.verdict}</p>
              <h3>{note.title}</h3>
              <span>{note.note}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
