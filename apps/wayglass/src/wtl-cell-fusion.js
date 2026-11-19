import {createWyrdruneRuntime} from './wtl-cell-runtime.js';
import {digestWce1Sync} from './wtl-cell-digest.js';

const runtime = createWyrdruneRuntime({
  hashSource: source => digestWce1Sync({wtl_source: source}),
  continuityDigest: digestWce1Sync,
});
const ir = runtime.compile(`mobius scoped {
  perceive { let difference = voice - neighbour_voice; }
  compress { let distance = when difference < 0 then 0 - difference else difference; }
  release { let affinity = 0.16 + curiosity * 0.07; }
  verify { require initiator != partner else "a hybrid needs distinct parents"; }
  integrate { let ready = energy >= 0.25 and not resting; }
  choose {
    let decision = when distance > affinity * 2 then "declined"
      else when ready and distance <= affinity then "accept" else "open";
  }
  return { emit {cell: initiator, neighbour: partner, exchange: exchange, decision: decision}; }
  transcend {}
}`);

// Each run has a distinct point of view. The exchange ID binds a decision to
// the actual meeting the cell considered.
export async function chooseFusion(cell, neighbour, exchange, signal) {
  const run = await runtime.execute(ir, {
    signal,
    seeds: {
      initiator: cell.address, partner: neighbour.address, exchange: exchange.id,
      voice: cell.carry.voice, neighbour_voice: neighbour.carry.voice,
      curiosity: cell.genome.curiosity, energy: cell.carry.energy, resting: cell.carry.rest,
    },
  });
  return {
    ...run.output[0], source_hash: ir.sourceHash, lineage_root: run.lineage.root,
    checkpoint: digestWce1Sync(run.checkpoints.at(-1)),
    phases: run.receipts.map(receipt => receipt.phase),
  };
}
