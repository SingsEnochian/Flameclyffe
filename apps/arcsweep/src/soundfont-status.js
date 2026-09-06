export function formatSoundfontBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1048576) return `${Math.max(0, value / 1024).toFixed(1)} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
}

export function soundfontBankStatusText(detail = {}) {
  const { state, message, fileCount, totalBytes, fileName, fileIndex, fileSize, loadedCount, bankCount, presetCount, selectedPreset, failureCount } = detail;
  if (state === 'loading-bank') return `Sound Bank · preparing ${fileCount ?? '?'} file${fileCount === 1 ? '' : 's'} · ${formatSoundfontBytes(totalBytes)}`;
  if (state === 'bank-file-loading') return `Sound Bank · parsing ${fileIndex ?? '?'}/${fileCount ?? '?'} · ${fileName || 'bank'} · ${formatSoundfontBytes(fileSize)}`;
  if (state === 'bank-file-ready') return `Sound Bank · ${loadedCount ?? '?'} of ${fileCount ?? '?'} ready · ${fileName || 'bank'} · ${presetCount ?? '?'} presets`;
  if (state === 'bank-file-error') return `Sound Bank · ${fileName || 'bank'} failed · ${message || 'unknown parsing error'}`;
  if (state === 'bank-ready' || state === 'preset-selected' || state === 'audition-complete') {
    const presetName = selectedPreset?.name || selectedPreset?.presetName || selectedPreset?.key || 'preset selected';
    const failures = failureCount ? ` · ${failureCount} failed` : '';
    return `Sound Bank · ${bankCount ?? '?'} bank${bankCount === 1 ? '' : 's'} ready · ${presetCount ?? '?'} presets · selected: ${presetName}${failures}`;
  }
  if (state === 'audition-started') {
    const presetName = selectedPreset?.name || selectedPreset?.presetName || selectedPreset?.key || 'selected preset';
    return `Sound Bank · playing ${presetName} at ${Number(detail.frequency || 0).toFixed(2)} Hz…`;
  }
  if (state === 'error') return `Sound Bank · ${message || 'bank failed to load'}`;
  return 'Sound Bank · no bank loaded · choose one or more SF2, SF3, SFOGG, or DLS files';
}
