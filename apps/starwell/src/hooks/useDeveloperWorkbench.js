import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

export function useDeveloperWorkbench() {
  const [schema, setSchema] = useState({ commands: [], adapters: [], routePreview: null });
  const [patches, setPatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchema = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/developer/schema`);
      if (!res.ok) throw new Error('Failed to retrieve core schema.');
      const data = await res.json();
      setSchema({
        commands: data.commands ?? [],
        adapters: data.adapters ?? [],
        routePreview: data.routePreview ?? null,
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/patches/tray`);
      if (!res.ok) throw new Error('Failed to synchronise patch tray.');
      const data = await res.json();
      setPatches(data.patches ?? []);
    } catch (err) {
      console.error('[🚨 FRONTEND ERROR]:', err.message);
    }
  }, []);

  const stagePatch = async (patchData) => {
    try {
      const res = await fetch(`${API_BASE}/patches/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error('Staging operation rejected.');
      await fetchPatches();
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePatchStatus = async (patchId, status, note = '') => {
    try {
      const res = await fetch(`${API_BASE}/patches/${patchId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error('Patch status update failed.');
      await fetchPatches();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSchema();
    fetchPatches();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchSchema();
        fetchPatches();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSchema, fetchPatches]);

  return {
    ...schema,
    patches,
    loading,
    error,
    stagePatch,
    updatePatchStatus,
    refetch: fetchSchema,
  };
}
