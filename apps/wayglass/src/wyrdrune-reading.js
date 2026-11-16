// Render authored expressions as text. A score's cues never dispatch playback.
export function renderWyrdruneReading(root, values = []) {
  root.replaceChildren();
  const document = root.ownerDocument;
  const append = (parent, tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  };
  for (const value of values) {
    if (value?.schema === 'wyrdrune.prose/v0.1' && Array.isArray(value.paragraphs)) {
      const article = append(root, 'article', '');
      append(article, 'h3', value.title);
      for (const text of value.paragraphs) {
        append(article, 'p', text).style.whiteSpace = 'pre-wrap';
      }
    } else if (value?.schema === 'wyrdrune.ritual-score/v0.1' && Array.isArray(value.cues)) {
      const section = append(root, 'section', '');
      append(section, 'h3', value.title);
      const list = append(section, 'ol', '');
      for (const cue of value.cues) {
        const line = cue.kind === 'silence' ? 'Silence · ' + cue.milliseconds + ' ms'
          : cue.kind + ' · ' + cue.voice + '\n' + cue.text;
        append(list, 'li', line).style.whiteSpace = 'pre-wrap';
      }
    }
  }
  root.hidden = !root.childElementCount;
}
