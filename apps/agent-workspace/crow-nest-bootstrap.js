const KEY = 'hearthweave.crow-nest/v0.1';
const RUNTIME_DEFAULT_VERSION = 1;

try {
  const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!parsed || typeof parsed !== 'object') {
    localStorage.setItem(KEY, JSON.stringify({
      selectedId: 'crow',
      crowRoute: 'crow',
      nestlings: [],
      runtimeDefaultVersion: RUNTIME_DEFAULT_VERSION,
    }));
  } else if (Number(parsed.runtimeDefaultVersion || 0) < RUNTIME_DEFAULT_VERSION) {
    localStorage.setItem(KEY, JSON.stringify({
      ...parsed,
      selectedId: parsed.selectedId || 'crow',
      crowRoute: parsed.crowRoute || 'crow',
      nestlings: Array.isArray(parsed.nestlings) ? parsed.nestlings : [],
      runtimeDefaultVersion: RUNTIME_DEFAULT_VERSION,
    }));
  }
} catch {
  // Local persistence is optional. Crow Nest can still run for this tab.
}
