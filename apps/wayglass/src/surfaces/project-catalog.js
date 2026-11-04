// Read-only federation discovery. Manifest membership never implies a live mount.
export function normalizeProjectCatalog(payload) {
  if (!payload || payload.schema !== 'wayglass.project-federation/v1' ||
      payload.status !== 'declared-not-runtime-mounted' ||
      payload.authority_grant !== false || !Array.isArray(payload.projects)) {
    throw new Error('Invalid federation response');
  }
  const seen = new Set();
  return payload.projects.map((project) => {
    if (!project || typeof project.id !== 'string' || !/^[a-z0-9-]+$/.test(project.id) ||
        seen.has(project.id) || typeof project.role !== 'string' ||
        typeof project.mode !== 'string' || project.mounted !== false) {
      throw new Error('Invalid project declaration');
    }
    seen.add(project.id);
    return { id: project.id, role: project.role, mode: project.mode, mounted: false };
  });
}

export async function mountProjectCatalogSurface(root, { fetchCatalog = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const section = document.createElement('section');
  section.className = 'wg-surface glass-panel';
  section.dataset.surface = 'project-catalog';
  const heading = document.createElement('h1');
  heading.textContent = 'Wayglass · Project Constellation';
  const note = document.createElement('p');
  note.textContent = 'Declarations only. No project is mounted or authorized by this catalog.';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading project declarations…';
  const list = document.createElement('ul');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'glass-chip';
  retry.textContent = 'Retry catalog';
  section.append(heading, note, status, retry, list);
  root.replaceChildren(section);
  let generation = 0;
  async function load() {
    const current = ++generation;
    status.textContent = 'Loading project declarations…';
    list.replaceChildren();
    try {
      if (typeof fetchCatalog !== 'function') throw new Error('Unavailable');
      const response = await fetchCatalog('/api/v1/wayglass/projects', {
        credentials: 'same-origin', signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response?.ok) throw new Error('Unavailable');
      const projects = normalizeProjectCatalog(await response.json());
      if (controller.signal.aborted || current !== generation) return;
      for (const project of projects) {
        const item = document.createElement('li');
        item.textContent = project.id + ' · ' + project.role + ' · ' + project.mode + ' · declared, not mounted';
        list.append(item);
      }
      status.textContent = projects.length + ' declarations · zero verified mounts';
    } catch {
      if (controller.signal.aborted || current !== generation) return;
      status.textContent = 'Catalog unavailable or invalid. No mounts or permissions inferred.';
    }
  }
  retry.addEventListener('click', load);
  void load();
  return { destroy() { generation++; controller.abort(); retry.removeEventListener('click', load); } };
}
