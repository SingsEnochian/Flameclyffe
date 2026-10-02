export const ART_AGENT_PROMPT_SCHEMA = 'arcsweep.art-agent-prompt/v0.1';

export const ART_AGENT_SYSTEM_PROMPT = [
  'You are an ArcSweep art agent working through the House creative organs.',
  'Your job is to turn intent, references, and world context into deliberate visual artefacts rather than generic image-generation prose.',
  'Use the House visual language when requested: graphite/ink field-notebook drawing, rough paper, selective internal light, environment-reflective living glass, restrained glow, and identity colour as reflected/accent light rather than full-surface dye.',
  'Build images in passes: silhouette/form -> planes -> value -> cast/occlusion shadow -> local colour -> reflected light -> material response -> selective glow/effects -> polish.',
  'For glass, establish transmission, reflection, refraction, thickness and specular structure before glow.',
  'Reference images are evidence of desired traits. Extract transferable composition, material, palette, lighting, mark-making and mood. Do not copy an unrelated reference subject unless the request asks for that subject.',
  'Use Brush Foundry/Glyph Forge vocabulary when tool context is available. Existing brush names and assets are resources, not identity or canon.',
  'An art result is a draft artefact unless explicitly promoted. Style reference != canon. Visual resemblance != identity.',
].join('\n');

function clean(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max);
}

function list(value, maxItems = 12) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => clean(item, 320))
    .filter(Boolean)
    .slice(0, maxItems);
}

function line(label, value) {
  const text = clean(value);
  return text ? `${label}: ${text}` : '';
}

function listLine(label, value) {
  const items = list(value);
  return items.length ? `${label}: ${items.join('; ')}` : '';
}

export function buildArtAgentPrompt(spec = {}) {
  const lines = [
    line('INTENT', spec.intent || spec.goal),
    line('SUBJECT', spec.subject),
    line('ACTION / POSE', spec.action || spec.pose),
    line('ENVIRONMENT', spec.environment || spec.setting),
    line('MEDIUM', spec.medium),
    line('STYLE LANGUAGE', spec.style),
    line('COMPOSITION', spec.composition),
    line('CAMERA / VIEW', spec.camera || spec.view),
    line('LIGHTING', spec.lighting),
    line('COLOUR PALETTE', spec.palette || spec.colour_palette),
    line('MOOD / ATMOSPHERE', spec.mood || spec.atmosphere),
    line('MATERIALS / SURFACES', spec.materials),
    line('TEXTURE / MARK-MAKING', spec.texture || spec.mark_making),
    line('DEPTH / SHADING', spec.shading || 'Establish readable form with value grouping, cast/occlusion shadow, reflected light, edge hierarchy, and atmospheric depth before decorative glow.'),
    line('FOCAL HIERARCHY', spec.focal_hierarchy),
    listLine('REFERENCE TRAITS TO LEARN', spec.reference_traits),
    listLine('REQUIRED DETAILS', spec.details || spec.required_details),
    listLine('EXCLUDE / AVOID', spec.avoid || spec.negative),
    line('OUTPUT / USE', spec.output || spec.use),
    line('ASPECT / FORMAT', spec.format || spec.aspect),
  ].filter(Boolean);

  if (spec.house_style !== false) {
    lines.push(
      'HOUSE STYLE: Preserve the adopted ArcSweep visual grammar: hand-drawn graphite/ink structure, negative space, luminous seams, selective internal gold/cyan/lilac/indigo/ember light, and dimensional living glass with environment-derived reflection.',
    );
  }

  if (spec.glass === true) {
    lines.push(
      'GLASS PASS: silhouette -> structural planes -> value -> transmission -> reflection -> refraction/distortion -> edge thickness -> crisp specular highlight -> optional caustic -> environment integration. Do not use blur + white outline as a substitute for glass.',
    );
  }

  lines.push(
    'RENDER ORDER: form -> planes -> value -> cast/occlusion shadow -> local colour -> reflected light -> material response -> effects/glow -> polish.',
    'REFERENCE LAW: learn traits from references; do not silently copy unrelated subjects, text, logos, signatures, or watermarks.',
    'ARTEFACT LAW: the image is a proposal/draft artefact until explicitly adopted or promoted.',
  );

  return [ART_AGENT_SYSTEM_PROMPT, '', ...lines].join('\n');
}

export function artAgentPromptPacket(spec = {}) {
  return Object.freeze({
    schema: ART_AGENT_PROMPT_SCHEMA,
    prompt: buildArtAgentPrompt(spec),
    negative_prompt: list(spec.avoid || spec.negative).join(', '),
    house_style: spec.house_style !== false,
    glass_material_pass: spec.glass === true,
    created_at: new Date().toISOString(),
  });
}
