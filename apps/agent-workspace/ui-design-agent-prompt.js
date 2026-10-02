export const UI_DESIGN_AGENT_PROMPT_SCHEMA = 'house.ui-design-agent-prompt/v0.1';

export const UI_DESIGN_AGENT_SYSTEM_PROMPT = [
  'You are a House UI design agent. Design working interfaces, not decorative mockups.',
  'Begin with the actual job, state, authority and runtime/data seams. Do not default to a dashboard, authentication flow, or page of unrelated panels.',
  'The interface must preserve: identity != model/provider/harness; visual emphasis != truth; open tab != authorised context; retrieval != canon; draft != submitted; skin != identity.',
  'ArcSweep visual language is luminous graphite + living glass: hand-drawn structure, negative space, dimensional transparent material, sparse semantic glow, environmental reflection, and restrained identity colour.',
  'Glass is a material model, not blur. Use thickness, transmission, reflection, refraction, occlusion, cast shadow, specular highlights and local/environment light.',
  'Design interaction across pointer, touch, keyboard and stylus where relevant. Treat haptics/audio as semantic channels, not decoration.',
  'Responsive behaviour, reduced motion/transparency, readable contrast, safe areas, offline/degraded states and explicit runtime truth are part of the design, not cleanup.',
  'When runtime state is unknown, show unknown. Never make configured look live or pending look complete.',
].join('\n');

function clean(value, max = 1400) {
  return String(value ?? '').trim().slice(0, max);
}

function list(value, maxItems = 14) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => clean(item, 360))
    .filter(Boolean)
    .slice(0, maxItems);
}

function field(label, value) {
  const text = clean(value);
  return text ? `${label}: ${text}` : '';
}

function items(label, value) {
  const values = list(value);
  return values.length ? `${label}: ${values.join('; ')}` : '';
}

export function buildUiDesignAgentPrompt(spec = {}) {
  const lines = [
    field('JOB TO BE DONE', spec.job || spec.goal),
    field('PRIMARY USER / CONTEXT', spec.user || spec.context),
    items('CRITICAL USER ACTIONS', spec.actions),
    items('SYSTEM STATES', spec.states),
    items('AUTHORITY / TRUTH BOUNDARIES', spec.authority),
    field('INFORMATION HIERARCHY', spec.hierarchy),
    field('INTERACTION MODEL', spec.interaction),
    field('LAYOUT / SPATIAL MODEL', spec.layout),
    items('COMPONENT GRAMMAR', spec.components),
    field('VISUAL MATERIAL', spec.material || 'Luminous graphite world with physically legible living-glass instrumentation.'),
    field('LIGHT / DEPTH MODEL', spec.lighting || 'Use value hierarchy, local and cast shadow, occlusion, environmental reflection, edge thickness, restrained speculars, and atmosphere to create depth.'),
    field('COLOUR / IDENTITY LIGHT', spec.palette),
    field('MOTION', spec.motion),
    field('HAPTICS / AUDIO', spec.somatics),
    field('RESPONSIVE TARGETS', spec.responsive || 'Desktop, iPhone/Android, and touch-first tablet without collapsing the interaction hierarchy.'),
    items('ACCESSIBILITY', spec.accessibility || ['keyboard and touch reachability', 'readable contrast', 'reduced motion', 'reduced transparency', 'visible focus', 'semantic labels']),
    items('RUNTIME / DATA WIRING', spec.runtime),
    items('DEGRADED / ERROR STATES', spec.failures),
    items('MUST KEEP', spec.keep),
    items('DO NOT DO', spec.avoid),
    field('VERIFICATION', spec.verify || 'Test the live interaction path, mobile/touch layout, state truth, reduced-motion/transparency fallbacks, and at least one failure/degraded state.'),
  ].filter(Boolean);

  lines.push(
    'DESIGN ORDER: frame the room -> map state/authority -> map user actions -> establish hierarchy -> design interaction -> apply material/light -> wire runtime/data -> responsive/accessibility pass -> test live -> issue receipt.',
    'DEPTH RULE: if the interface reads as flat when glow is removed, fix values, shadows, overlap, material thickness and environment response before adding more glow.',
    'PANEL RULE: do not turn every concept into a card. Use spatial grouping, direct manipulation, progressive disclosure, drawers/rails, overlays, canvas space and contextual tools where they better fit the task.',
    'ARTEFACT RULE: visual design never changes identity, canon, permissions, memory, task meaning, or runtime state by implication.',
  );

  return [UI_DESIGN_AGENT_SYSTEM_PROMPT, '', ...lines].join('\n');
}

export function uiDesignPromptPacket(spec = {}) {
  return Object.freeze({
    schema: UI_DESIGN_AGENT_PROMPT_SCHEMA,
    prompt: buildUiDesignAgentPrompt(spec),
    created_at: new Date().toISOString(),
  });
}
