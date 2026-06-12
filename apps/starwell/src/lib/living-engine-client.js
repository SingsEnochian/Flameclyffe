const DEFAULT_LIVING_ENGINE_URL = 'ws://127.0.0.1:8765/v1/liquid-light/stream';
const SUPPORTED_SCHEMA_VERSION = '1.0.0';

function assertSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError('Living Engine sent a non-object snapshot.');
  }

  if (snapshot.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Living Engine schema ${snapshot.schema_version ?? 'unknown'}; expected ${SUPPORTED_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(snapshot.nodes)) {
    throw new TypeError('Living Engine snapshot is missing its nodes array.');
  }

  return snapshot;
}

export function createLivingEngineClient({
  url = DEFAULT_LIVING_ENGINE_URL,
  controls,
  onSnapshot,
  onStateChange = () => {},
  onError = () => {},
} = {}) {
  if (!controls || typeof controls !== 'object') {
    throw new TypeError('createLivingEngineClient requires a complete controls object.');
  }

  if (typeof onSnapshot !== 'function') {
    throw new TypeError('createLivingEngineClient requires an onSnapshot callback.');
  }

  let socket = null;
  let currentControls = { ...controls };
  let closedByClient = false;

  function setState(state, detail = null) {
    onStateChange({ state, detail });
  }

  function connect() {
    if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) {
      return socket;
    }

    closedByClient = false;
    setState('connecting');
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      setState('open');
      socket.send(JSON.stringify({ controls: currentControls }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.type === 'error') {
          onError(payload);
          return;
        }

        onSnapshot(assertSnapshot(payload));
      } catch (error) {
        onError(error);
      }
    });

    socket.addEventListener('error', (event) => {
      setState('error', event);
      onError(event);
    });

    socket.addEventListener('close', (event) => {
      setState(closedByClient ? 'closed' : 'disconnected', event);
      socket = null;
    });

    return socket;
  }

  function updateControls(nextControls) {
    if (!nextControls || typeof nextControls !== 'object') {
      throw new TypeError('Living Engine controls must be an object.');
    }

    currentControls = { ...nextControls };

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ controls: currentControls }));
    }
  }

  function close(code = 1000, reason = 'Client closed the Living Engine connection.') {
    closedByClient = true;
    socket?.close(code, reason);
  }

  return {
    connect,
    updateControls,
    close,
    get readyState() {
      return socket?.readyState ?? WebSocket.CLOSED;
    },
    get controls() {
      return { ...currentControls };
    },
  };
}

export { DEFAULT_LIVING_ENGINE_URL, SUPPORTED_SCHEMA_VERSION };
