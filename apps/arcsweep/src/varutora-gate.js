import { getKelyranSupabase } from './kelyran-supabase.js';
import { openKelvaruMessage, sealKelvaruMessage } from './kelvaru-crypto.js';
import { bootOperatorArcsweep } from './operator-arcsweep-bootstrap.js';

const $ = (selector) => document.querySelector(selector);
const shell = $('#gate-shell');
const authPanel = $('#auth-panel');
const claimPanel = $('#claim-panel');
const operatorPanel = $('#operator-panel');
const workspaceGrid = $('#workspace-grid');
const messageList = $('#kelvaru-message-list');
const statusNode = $('#gate-status');
const emailInput = $('#operator-email');
const claimInput = $('#operator-claim');
const circleKeyInput = $('#kelvaru-circle-key');
const rememberKey = $('#remember-kelvaru-key');
const messageInput = $('#kelvaru-message');

const supabase = await getKelyranSupabase();
let user = null;
let profile = null;
let workspaces = [];
let messages = [];

function setStatus(message, tone = 'info') {
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function gateUrl() {
  const url = new URL(globalThis.location.href);
  url.hash = '';
  url.search = '';
  return url.toString();
}

function currentCircleKey() {
  const value = String(circleKeyInput.value || '').trim();
  if (rememberKey.checked && value) sessionStorage.setItem('kelvaru.circle-key.v1', value);
  if (!rememberKey.checked) sessionStorage.removeItem('kelvaru.circle-key.v1');
  return value;
}

function authorIdentity() {
  return profile?.operator_key === 'nocturne' ? 'nocturne-glint' : 'rowan';
}

async function readProfile() {
  const { data, error } = await supabase
    .from('arcsweep_operator_profiles')
    .select('auth_user_id, operator_key, display_name, workspace_slug, access_level, kelvaru_member')
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function readWorkspaces() {
  const { data, error } = await supabase
    .from('arcsweep_private_workspaces')
    .select('slug, owner_operator_key, display_name, variant_label, config, state, updated_at')
    .order('slug');
  if (error) throw error;
  return data || [];
}

async function readMessages() {
  const { data, error } = await supabase
    .from('kelvaru_circle_messages')
    .select('id, author_identity, workspace_slug, cipher_schema, key_version, salt_b64, iv_b64, ciphertext_b64, aad, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

function renderWorkspaceCards() {
  workspaceGrid.replaceChildren();
  for (const workspace of workspaces) {
    const card = document.createElement('article');
    card.className = 'workspace-card';
    const title = document.createElement('h3');
    title.textContent = workspace.display_name;
    const label = document.createElement('p');
    label.textContent = workspace.variant_label;
    const meta = document.createElement('small');
    const stamp = workspace.updated_at ? new Date(workspace.updated_at).toLocaleString() : 'never';
    meta.textContent = `Supabase mirror: ${stamp}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Enter this Arcsweep';
    button.addEventListener('click', async () => {
      button.disabled = true;
      setStatus(`Opening ${workspace.display_name}…`);
      try {
        await bootOperatorArcsweep({ supabase, profile, workspace });
      } catch (error) {
        button.disabled = false;
        setStatus(error.message || 'Arcsweep could not open.', 'error');
      }
    });
    card.append(title, label, meta, button);
    workspaceGrid.append(card);
  }
}

function renderMessages() {
  messageList.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No sealed Kelvaru messages yet.';
    messageList.append(empty);
    return;
  }
  for (const message of messages) {
    const item = document.createElement('article');
    item.className = 'message-envelope';
    const header = document.createElement('div');
    header.className = 'message-envelope-header';
    const who = document.createElement('strong');
    who.textContent = message.author_identity;
    const when = document.createElement('span');
    when.textContent = new Date(message.created_at).toLocaleString();
    header.append(who, when);
    const scope = document.createElement('small');
    scope.textContent = message.workspace_slug || 'circle';
    const body = document.createElement('pre');
    body.textContent = 'veir · sealed';
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open with circle key';
    open.addEventListener('click', async () => {
      try {
        const key = currentCircleKey();
        body.textContent = await openKelvaruMessage(message, key);
        open.textContent = 'Opened · ae';
      } catch (error) {
        body.textContent = error.message || 'Kelvaru did not open.';
      }
    });
    item.append(header, scope, body, open);
    messageList.append(item);
  }
}

async function refreshOperatorState() {
  user = (await supabase.auth.getUser()).data.user || null;
  authPanel.hidden = Boolean(user);
  claimPanel.hidden = true;
  operatorPanel.hidden = true;

  if (!user) {
    setStatus('Varutóra is held. Authenticate to continue.');
    return;
  }

  profile = await readProfile();
  if (!profile) {
    claimPanel.hidden = false;
    setStatus('Authenticated. This account has not claimed an operator identity yet.');
    return;
  }

  workspaces = await readWorkspaces();
  messages = profile.kelvaru_member ? await readMessages() : [];
  operatorPanel.hidden = false;
  $('#operator-name').textContent = profile.display_name;
  $('#operator-role').textContent = `${profile.access_level} · ${profile.workspace_slug}`;
  renderWorkspaceCards();
  renderMessages();
  setStatus(`Tóra ae. ${profile.display_name} is inside the held threshold.`, 'success');
}

$('#send-operator-link').addEventListener('click', async () => {
  const email = String(emailInput.value || '').trim();
  if (!email) return setStatus('Enter the email address for the Supabase sign-in link.', 'error');
  setStatus('Requesting a Supabase sign-in link…');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: gateUrl() },
  });
  if (error) return setStatus(error.message, 'error');
  setStatus('Sign-in link sent. Open it in this browser to return through Varutóra.', 'success');
});

$('#claim-operator').addEventListener('click', async () => {
  const token = String(claimInput.value || '').trim();
  if (!token) return setStatus('Paste the one-time operator claim key.', 'error');
  setStatus('Claiming operator identity…');
  const { error } = await supabase.rpc('claim_arcsweep_operator_invite', { p_token: token });
  if (error) return setStatus(error.message, 'error');
  claimInput.value = '';
  setStatus('Operator identity claimed. Opening the inner gate…', 'success');
  await refreshOperatorState();
});

$('#seal-kelvaru-message').addEventListener('click', async () => {
  const plaintext = String(messageInput.value || '');
  const key = currentCircleKey();
  if (!profile || !user) return setStatus('Authenticate before writing to Kelvaru.', 'error');
  try {
    const speaker = authorIdentity();
    const workspaceSlug = profile.workspace_slug;
    const envelope = await sealKelvaruMessage(plaintext, key, {
      speaker,
      workspace_slug: workspaceSlug,
      purpose: 'circle-message',
    });
    const { error } = await supabase.from('kelvaru_circle_messages').insert({
      author_user_id: user.id,
      author_identity: speaker,
      workspace_slug: workspaceSlug,
      ...envelope,
    });
    if (error) throw error;
    messageInput.value = '';
    messages = await readMessages();
    renderMessages();
    setStatus('Rin veir. Kelvaru message sealed into Supabase.', 'success');
  } catch (error) {
    setStatus(error.message || 'Kelvaru message could not be sealed.', 'error');
  }
});

$('#refresh-kelvaru').addEventListener('click', async () => {
  try {
    messages = await readMessages();
    renderMessages();
    setStatus('Kelvaru envelopes refreshed.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

$('#operator-sign-out').addEventListener('click', async () => {
  await supabase.auth.signOut();
  profile = null;
  workspaces = [];
  messages = [];
  await refreshOperatorState();
});

const rememberedKey = sessionStorage.getItem('kelvaru.circle-key.v1');
if (rememberedKey) {
  circleKeyInput.value = rememberedKey;
  rememberKey.checked = true;
}

supabase.auth.onAuthStateChange(() => {
  setTimeout(() => void refreshOperatorState().catch((error) => setStatus(error.message, 'error')), 0);
});

try {
  await refreshOperatorState();
} catch (error) {
  shell.hidden = false;
  setStatus(error.message || 'Varutóra gate failed to initialise.', 'error');
}
