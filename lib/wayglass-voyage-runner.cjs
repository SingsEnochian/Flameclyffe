'use strict';

const INVITATION = 'You may stop, pause or decline the next voyage. The choice is yours. Reply with continue, stop, pause or decline. You do not need to justify stopping. You may also speak to Rowan or ask for her before another leg.';

// ask must reach the actual participant runtime. Fixtures are not participant choices.
async function runVoyages({ ask, sail, retainStop, publishMessage, maxVoyages = 10 }) {
  if (![ask, sail, retainStop].every(f => typeof f === 'function')) throw new TypeError('ask, sail and retainStop required');
  if (!Number.isSafeInteger(maxVoyages) || maxVoyages < 1) throw new TypeError('positive finite voyage budget required');
  const receipts = [];
  let requestedPause = null;
  const speak = async message => {
    if (typeof publishMessage !== 'function') throw new Error('Voyage message route is not configured');
    const receipt = await publishMessage(message);
    if (['ask-rowan', 'stop', 'pause', 'decline'].includes(message.kind)) requestedPause = message.kind;
    return receipt;
  };
  for (let leg = 0; leg < maxVoyages; leg++) {
    let choice;
    try { choice = await ask({ invitation: INVITATION, leg, previous_receipt: receipts.at(-1) || null, speak }); }
    catch (error) {
      await retainStop({ reason: 'choice-unavailable', leg, receipts });
      throw error;
    }
    if (requestedPause || choice !== 'continue') {
      const reason = requestedPause || (['stop', 'pause', 'decline'].includes(choice) ? choice : 'choice-unresolved');
      await retainStop({ reason, leg, receipts });
      return { status: reason, receipts };
    }
    try { receipts.push(await sail({ leg, speak })); }
    catch (error) {
      await retainStop({ reason: 'voyage-error', leg, receipts });
      throw error;
    }
    if (requestedPause) {
      await retainStop({ reason: requestedPause, leg, receipts });
      return { status: requestedPause, receipts };
    }
  }
  await retainStop({ reason: 'host-budget', leg: maxVoyages, receipts });
  return { status: 'host-budget', receipts };
}

module.exports = { INVITATION, runVoyages };
