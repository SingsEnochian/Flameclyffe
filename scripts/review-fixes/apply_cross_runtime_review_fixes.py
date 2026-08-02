from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "scripts" / "review-fixes"

cross_runtime = (TEMPLATE / "cross-runtime-authoritative.js").read_text(encoding="utf-8")
cross_runtime = cross_runtime.replace(
    "../../apps/starwell/src/hearthweave-kernel/dual-aspect.js",
    "./dual-aspect.js",
).replace(
    "../../apps/starwell/src/hearthweave-kernel/validation.js",
    "./validation.js",
)
(ROOT / "apps/starwell/src/hearthweave-kernel/cross-runtime.js").write_text(
    cross_runtime,
    encoding="utf-8",
)

test_source = (TEMPLATE / "cross-runtime-authoritative.test.js").read_text(encoding="utf-8")
test_source = test_source.replace("../../apps/starwell/src/", "../src/")
(ROOT / "apps/starwell/test/crossRuntimeCorrespondence.test.js").write_text(
    test_source,
    encoding="utf-8",
)

bridge_path = ROOT / "apps/starwell/src/hearthgate-sensory-bridge.js"
bridge = bridge_path.read_text(encoding="utf-8")
bridge = bridge.replace(
    "    storage = globalThis.sessionStorage ?? null,\n  } = {}) {",
    "    storage = globalThis.sessionStorage ?? null,\n"
    "    kernelEndpoint = 'http://127.0.0.1:8765',\n"
    "    fetchImpl = globalThis.fetch?.bind(globalThis) ?? null,\n"
    "    kernelVerifier = undefined,\n"
    "  } = {}) {",
)
bridge = bridge.replace(
    "    this.storage = storage;\n    this.packet = null;",
    "    this.storage = storage;\n"
    "    this.kernelEndpoint = kernelEndpoint;\n"
    "    this.fetchImpl = fetchImpl;\n"
    "    this.kernelVerifier = kernelVerifier;\n"
    "    this.packet = null;",
)
receive_pattern = re.compile(
    r"  receive\(packetInput, \{\n"
    r"    hearthweavePacket,\n"
    r"    correspondenceReceipt = null,\n"
    r"  \} = \{\}\) \{.*?\n  \}\n\n  async replaceAfterStop",
    re.DOTALL,
)
receive_replacement = """  async receive(packetInput, {
    hearthweavePacket,
    correspondenceReceipt = null,
  } = {}) {
    const nextPacket = verifySensoryPacket(packetInput);
    const activeHearthweavePacket = hearthweavePacket === undefined
      ? readActiveDualAspectPacket({ storage:this.storage })
      : hearthweavePacket;
    const nextCrossRuntimeActivation = await assertCrossRuntimeActivation({
      kernelPacket:nextPacket,
      hearthweavePacket:activeHearthweavePacket,
      correspondenceReceipt,
      ...(this.kernelVerifier ? { kernelVerifier:this.kernelVerifier } : {}),
      kernelEndpoint:this.kernelEndpoint,
      fetchImpl:this.fetchImpl,
    });
    const teardownRequired = this.active || this.audioContext || this.audioNodes.length > 0;
    if (teardownRequired) {
      return this.replaceAfterStop(nextPacket, nextCrossRuntimeActivation);
    }
    return this.installPacket(nextPacket, nextCrossRuntimeActivation);
  }

  async replaceAfterStop"""
bridge, count = receive_pattern.subn(receive_replacement, bridge, count=1)
if count != 1:
    raise RuntimeError("Could not replace HearthgateSensoryBridge.receive().")
bridge_path.write_text(bridge, encoding="utf-8")

room_path = ROOT / "apps/starwell/hearthgate-sensory/index.html"
room = room_path.read_text(encoding="utf-8")
room = room.replace(
    "      currentPacket = bridge.receive(packet);",
    "      bridge.kernelEndpoint = $('#endpoint').value.replace(/\\/$/,'');\n"
    "      currentPacket = await bridge.receive(packet);",
)
room_path.write_text(room, encoding="utf-8")

sensory_test_path = ROOT / "apps/starwell/test/hearthgateSensoryBridge.test.js"
sensory_test = sensory_test_path.read_text(encoding="utf-8")
sensory_test = sensory_test.replace(
    "import {\n  HearthgateSensoryBridge,",
    "import { createKernelAuthorityProof } from '../src/hearthweave-kernel/cross-runtime.js';\n\n"
    "import {\n  HearthgateSensoryBridge,",
)
helper = """
function trustedKernelVerifier(packet) {
  return Promise.resolve(createKernelAuthorityProof(
    packet,
    {
      schema:'hearthgate.integrity-audit.v1',
      identity:packet.identity,
      house_id:packet.house_id,
      status:'VERIFIED',
      claims:{shared_state:'VERIFIED',receipt_integrity:'VERIFIED'},
    },
    {
      schema:'hearthgate.replay-result.v1',
      packet_hash:packet.receipts.at(-1).packet_hash,
      verified:true,
    },
    {authority:'synthetic-test-verifier'},
  ));
}

"""
sensory_test = sensory_test.replace("class FakeParam {", helper + "class FakeParam {", 1)
sensory_test = sensory_test.replace(
    "    vibrate:(pattern) => vibrations.push(pattern),\n  });",
    "    vibrate:(pattern) => vibrations.push(pattern),\n"
    "    kernelVerifier:trustedKernelVerifier,\n"
    "  });",
)
sensory_test = sensory_test.replace(
    "    vibrate:() => true,\n  });",
    "    vibrate:() => true,\n"
    "    kernelVerifier:trustedKernelVerifier,\n"
    "  });",
)
sensory_test_path.write_text(sensory_test, encoding="utf-8")

portable_path = ROOT / "ml-lab/src/flameclyffe_ml/hearthgate_kernel/portable.py"
if portable_path.exists():
    portable_path.unlink()
