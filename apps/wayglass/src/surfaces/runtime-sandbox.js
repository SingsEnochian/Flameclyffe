import { wayglassSomaticSound } from '../somatic-sound.js';

export function mountWayglassRuntimeSandbox(root) {
  root.innerHTML = `
    <section class="wg-surface glass-panel">
      <h1>Wayglass Runtime Sandbox</h1>
      <p>Invite the Ship Voice to create a project or revise its active Wyrdrune programme.</p>
      <form data-sandbox-turn>
        <label>Project context <select name="project"><option value="">All projects</option></select></label>
        <label>Programme <select name="program"><option value="main">main</option></select></label>
        <label>Invitation <textarea name="input" maxlength="2000" rows="4" required></textarea></label>
        <button class="glass-chip" type="submit">Invite Wayglass</button>
        <button class="glass-chip" type="button" data-sandbox-run>Run selected project</button>
        <button class="glass-chip" type="button" data-sandbox-stop>Feather · Stop request</button>
      </form>
      <p role="status" data-sandbox-status></p>
      <pre data-sandbox-receipt></pre>
    </section>`;
  const form = root.querySelector('[data-sandbox-turn]');
  const status = root.querySelector('[data-sandbox-status]');
  const output = root.querySelector('[data-sandbox-receipt]');
  let pending = null, disposed = false;

  async function request(suffix = '', body, signal) {
    const options = { credentials: 'same-origin', cache: 'no-store', signal };
    if (body) Object.assign(options, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const response = await fetch('/api/v1/wayglass/sandbox' + suffix, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sandbox unavailable');
    return data;
  }

  async function updatePrograms(signal, preferred) {
    const id = form.elements.project.value;
    const list = form.elements.program;
    const selected = preferred ?? list.value;
    const programs = id ? (await request('?project_id=' + encodeURIComponent(id), undefined, signal)).project.programs : [];
    if (disposed || signal.aborted || id !== form.elements.project.value) return;
    list.length = 0;
    for (const item of programs) list.add(new Option(item.name, item.name));
    if (!programs.length) list.add(new Option('main', 'main'));
    if (programs.some(item => item.name === selected)) list.value = selected;
  }

  async function update(signal) {
    const { projects } = await request('', undefined, signal);
    if (disposed || signal.aborted) return;
    const list = form.elements.project, selected = list.value;
    list.length = 1;
    for (const item of projects) list.add(new Option(item.title, item.id));
    if (projects.some(item => item.id === selected)) list.value = selected;
  }

  async function operation(run) {
    if (pending || disposed) return;
    if (wayglassSomaticSound.snapshot().feather_stopped) {
      status.textContent = 'Feather is holding the sandbox.';
      return;
    }
    const controller = new AbortController();
    pending = controller;
    form.elements.project.disabled = true;
    form.elements.program.disabled = true;
    status.textContent = 'Working…';
    try {
      await run(controller.signal);
      if (!disposed && !controller.signal.aborted) status.textContent = 'Sandbox ready.';
    } catch (error) {
      if (!disposed) status.textContent = controller.signal.aborted ? 'Feather held the request.' : error.message;
    } finally {
      pending = null;
      if (!disposed) {
        form.elements.project.disabled = false;
        form.elements.program.disabled = false;
      }
    }
  }

  form.elements.project.addEventListener('change', () => void operation(updatePrograms));
  form.addEventListener('submit', event => {
    event.preventDefault();
    void operation(async signal => {
      const result = await request('/turn', {
        input: form.elements.input.value, project_id: form.elements.project.value || undefined,
        program: form.elements.program.value,
      }, signal);
      if (disposed || signal.aborted) return;
      output.textContent = JSON.stringify(result, null, 2);
      await update(signal);
      if (disposed || signal.aborted) return;
      const receipt = result.receipt;
      if (receipt?.project_id) form.elements.project.value = receipt.project_id;
      await updatePrograms(signal, receipt?.data?.program);
    });
  });
  root.querySelector('[data-sandbox-run]').addEventListener('click', () => {
    const id = form.elements.project.value;
    if (!id) { status.textContent = 'Choose a project to run.'; return; }
    void operation(async signal => {
      const result = await request('/run', { project_id: id, program: form.elements.program.value }, signal);
      if (!disposed && !signal.aborted) output.textContent = JSON.stringify(result, null, 2);
    });
  });
  root.querySelector('[data-sandbox-stop]').addEventListener('click', () => pending?.abort());
  const onFeather = event => { if (event.detail?.stopped) pending?.abort(); };
  globalThis.addEventListener('wayglass:feather', onFeather);
  void operation(update);
  return () => {
    disposed = true;
    pending?.abort();
    globalThis.removeEventListener('wayglass:feather', onFeather);
  };
}
