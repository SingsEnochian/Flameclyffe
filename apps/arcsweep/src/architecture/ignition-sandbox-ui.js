import { runIgnitionSandbox } from './ignition-sandbox.js';

const status = document.querySelector('#status');
const output = document.querySelector('#result');
document.querySelectorAll('[data-scenario]').forEach((button) => {
  button.addEventListener('click', async () => {
    const scenario = button.dataset.scenario;
    status.textContent = `Running ${scenario} fixture…`;
    try {
      const result = await runIgnitionSandbox(scenario);
      const { cycle } = result;
      status.textContent = `${scenario}: ${cycle.status}; trajectory ${cycle.trajectory.state}`;
      output.textContent = JSON.stringify({
        scenario, synthetic: result.synthetic, executionCount: result.executionCount,
        observation: result.observation, possibility: cycle.possibility,
        trajectory: cycle.trajectory, intention: cycle.intention,
        request: cycle.request, decision: cycle.decision, receipt: cycle.receipt,
        receiptValidation: cycle.receiptValidation, feedbackObservation: cycle.feedbackObservation,
        feedbackEvidence: result.feedbackEvidence,
      }, null, 2);
    } catch (error) {
      status.textContent = `Sandbox error: ${error.message}`;
      output.textContent = '';
    }
  });
});
