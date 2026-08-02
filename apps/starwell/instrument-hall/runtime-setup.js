const button = document.querySelector('#prepare-math-runtime');
const status = document.querySelector('#math-runtime-status');

button?.addEventListener('click', async () => {
  if (!window.electronAPI?.prepareMathRuntime) {
    status.textContent = 'Runtime preparation is available inside the installed Windows House.';
    return;
  }
  button.disabled = true;
  status.textContent = 'PREPARING · opening a visible local terminal; no installation occurs silently.';
  try {
    const result = await window.electronAPI.prepareMathRuntime();
    status.textContent = result.ok
      ? result.already_ready
        ? `READY · PyTorch ${result.torch_version}`
        : `PREPARING · private runtime at ${result.runtime_path}`
      : `RESTING · ${result.error}`;
  } catch (error) {
    status.textContent = `RESTING · ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
