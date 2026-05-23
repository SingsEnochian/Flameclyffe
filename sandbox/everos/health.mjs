import { checkHealth, getSandboxConfig } from './evercore-client.mjs';

try {
  const config = getSandboxConfig();
  const result = await checkHealth(config);
  console.log('EverCore health check passed.');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('EverCore health check failed.');
  console.error(error.message);
  process.exitCode = 1;
}
