export const vercelEnv = Object.freeze({
  get(name) {
    return process.env[name];
  },
});
