import { randomUUID } from 'node:crypto';
import { WORK_STATUS, defineWorkOrder } from './contracts.js';
import { getAgent } from './agents.js';
import { inspectOrgan } from './boxfire-gate.js';

export function createFoundry({ store, clock = () => new Date() }) {
  if (!store?.appendReceipt || !store?.saveWorkOrder || !store?.getWorkOrder || !store?.listWorkOrders) {
    throw new TypeError('Foundry store requires appendReceipt(), saveWorkOrder(), getWorkOrder(), and listWorkOrders().');
  }

  async function emit(type, payload) {
    const entry = { receiptId: randomUUID(), type, payload, createdAt: clock().toISOString() };
    await store.appendReceipt(entry);
    return entry;
  }

  async function save(order, type, extra = {}) {
    const next = Object.freeze({ ...order, ...extra, updatedAt: clock().toISOString() });
    await store.saveWorkOrder(next);
    await emit(type, { workOrderId: next.id, status: next.status, ...extra });
    return next;
  }

  return {
    async submit(input) {
      const order = defineWorkOrder({ createdAt: clock().toISOString(), ...input });
      if (!getAgent(order.agentId)) throw new Error(`Unknown agent ${order.agentId}`);
      await store.saveWorkOrder(order);
      await emit('WORK_ORDER_SUBMITTED', { workOrderId: order.id, organ: order.organ, agentId: order.agentId });
      return order;
    },

    async dispatch(id) {
      const order = await store.getWorkOrder(id);
      if (!order) throw new Error(`Unknown work order ${id}`);
      const all = await store.listWorkOrders();
      const blockers = order.dependencies.filter(dep => !all.some(item => item.id === dep && ['APPROVED','MERGED'].includes(item.status)));
      if (blockers.length) return save(order, 'WORK_ORDER_BLOCKED', { status: WORK_STATUS.BLOCKED, blockers });
      return save(order, 'WORK_ORDER_DISPATCHED', { status: WORK_STATUS.RUNNING, runId: randomUUID() });
    },

    async submitHandoff(id, handoff) {
      const order = await store.getWorkOrder(id);
      if (!order) throw new Error(`Unknown work order ${id}`);
      const required = ['changedPaths','stateInputs','stateOutputs','receipts','testsRun','platformsChecked','knownGaps','nextDependencies'];
      for (const field of required) if (!Array.isArray(handoff?.[field])) throw new TypeError(`Handoff requires array ${field}`);
      return save(order, 'HANDOFF_SUBMITTED', { status: WORK_STATUS.REVIEW, handoff: { ...handoff, workOrder:id, agent:order.agentId } });
    },

    async boxfireReview(id, report) {
      const order = await store.getWorkOrder(id);
      if (!order) throw new Error(`Unknown work order ${id}`);
      const gate = inspectOrgan({ organ: order.organ, ...report });
      const status = gate.ok ? WORK_STATUS.APPROVED : WORK_STATUS.REJECTED;
      return save(order, gate.ok ? 'BOXFIRE_APPROVED' : 'BOXFIRE_REJECTED', { status, gate });
    },

    async interrupt(id, action, reason = '') {
      const order = await store.getWorkOrder(id);
      if (!order) throw new Error(`Unknown work order ${id}`);
      const allowed = new Set(['PAUSE','RESUME','CANCEL','REASSIGN','REPRIORITISE']);
      if (!allowed.has(action)) throw new Error(`Unsupported interrupt ${action}`);
      const status = action === 'CANCEL' ? WORK_STATUS.CANCELLED : action === 'PAUSE' ? WORK_STATUS.BLOCKED : action === 'RESUME' ? WORK_STATUS.QUEUED : order.status;
      return save(order, 'WORK_ORDER_INTERRUPTED', { status, interrupt: { action, reason } });
    }
  };
}

export function createMemoryFoundryStore() {
  const workOrders = new Map();
  const receipts = [];
  return {
    saveWorkOrder: async order => workOrders.set(order.id, order),
    getWorkOrder: async id => workOrders.get(id) || null,
    listWorkOrders: async () => [...workOrders.values()],
    appendReceipt: async receipt => receipts.push(receipt),
    snapshot: () => ({ workOrders:[...workOrders.values()], receipts:[...receipts] })
  };
}
