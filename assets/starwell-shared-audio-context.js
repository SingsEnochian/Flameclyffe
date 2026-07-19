'use strict';

/*
  Shared AudioContext Registry v0.1

  Native coupled mode keeps Wardenclyffe and Möbius inside one Web Audio graph.
  MediaStream remains an optional ingress/egress seam for independent tools.
*/

(function installSharedAudioContext(global) {
  const clients = new Map();
  let context = null;
  let mediaDestination = null;

  function AudioContextCtor() {
    return global.AudioContext || global.webkitAudioContext;
  }

  async function ensure(options = {}) {
    const Ctor = AudioContextCtor();
    if (!Ctor) throw new Error('Web Audio API is unavailable in this browser.');
    if (!context || context.state === 'closed') {
      context = new Ctor({ latencyHint: options.latencyHint || 'interactive' });
      mediaDestination = null;
      emit('created');
    }
    if (context.state === 'suspended') await context.resume();
    emit('ready');
    return context;
  }

  function register(clientId, metadata = {}) {
    const id = String(clientId || `client-${clients.size + 1}`);
    clients.set(id, { id, registeredAt: new Date().toISOString(), ...metadata });
    emit('client-registered');
    return () => {
      clients.delete(id);
      emit('client-released');
    };
  }

  async function createMediaDestination() {
    const ctx = await ensure();
    if (!mediaDestination) mediaDestination = ctx.createMediaStreamDestination();
    return mediaDestination;
  }

  async function createMediaSource(stream) {
    if (!(stream instanceof MediaStream)) throw new Error('Expected a MediaStream.');
    const ctx = await ensure();
    return ctx.createMediaStreamSource(stream);
  }

  function state(reason = 'state') {
    return {
      reason,
      ready: Boolean(context && context.state !== 'closed'),
      contextState: context?.state || 'uninitialised',
      sampleRate: context?.sampleRate || null,
      baseLatency: context?.baseLatency ?? null,
      outputLatency: context?.outputLatency ?? null,
      currentTime: context?.currentTime ?? null,
      clientCount: clients.size,
      clients: [...clients.values()],
      mediaDestinationReady: Boolean(mediaDestination)
    };
  }

  function emit(reason) {
    try {
      global.dispatchEvent(new CustomEvent('starwell:shared-audio-context', { detail: state(reason) }));
    } catch (error) {}
  }

  async function suspend() {
    if (context?.state === 'running') await context.suspend();
    emit('suspended');
  }

  async function close() {
    if (context && context.state !== 'closed') await context.close();
    context = null;
    mediaDestination = null;
    clients.clear();
    emit('closed');
  }

  function installMobiusSharedContext(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__starwellSharedContextV01) return false;
    const proto = MobiusAudioBus.prototype;
    const originalEnsure = proto.ensure;

    proto.ensure = async function sharedEnsure() {
      if (this.options?.sharedContext === false) return originalEnsure.call(this);
      if (!this.ctx) {
        const ctx = await ensure({ latencyHint: this.options?.latencyHint || 'interactive' });
        this.build(ctx);
        this.__sharedContextRelease = register(this.options?.clientId || 'mobius-audio-bus', {
          engine: 'mobius',
          transport: 'shared-context'
        });
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.ready = true;
      this.emitState('ready-shared-context');
      return this.ctx;
    };

    proto.__starwellSharedContextV01 = true;
    return true;
  }

  global.StarwellSharedAudioContext = Object.freeze({
    VERSION: '0.1.0',
    ensure,
    register,
    createMediaDestination,
    createMediaSource,
    state,
    suspend,
    close,
    installMobiusSharedContext,
    get context() { return context; }
  });

  if (global.MobiusAudioBus) installMobiusSharedContext(global.MobiusAudioBus);
})(window);

