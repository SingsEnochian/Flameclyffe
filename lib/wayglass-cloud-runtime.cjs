'use strict';
const { createWayglassMcpServer } = require('./wayglass-mcp-server.cjs');
const { createIntrospectionBearerVerifier } = require('./wayglass-mcp-introspection-verifier.cjs');
const { createWayglassMcpNativeBridge } = require('./wayglass-mcp-native-bridge.cjs');
const { createWayglassCloudHost } = require('./wayglass-cloud-host.cjs');

// Trusted host composition. No credential issuer, provider or authority is invented.
// Presentation remains unadvertised until its separate scope/grant adapter exists.
function createWayglassCloudRuntime({ resourceUrl, authorizationServerUrl, introspect, ownerSubject,
  nativeOrigin, authorizeNative, credentialFor, isStopped, sourceSha, checkReadiness, fetchImpl } = {}) {
  const verifyBearer = createIntrospectionBearerVerifier({introspect,issuer:authorizationServerUrl,
    audience:resourceUrl,ownerSubject});
  const bridge = createWayglassMcpNativeBridge({nativeOrigin,resource:resourceUrl,authorize:authorizeNative,
    credentialFor,featherStopped:isStopped,...(fetchImpl ? {fetchImpl} : {})});
  const gateway = createWayglassMcpServer({resourceUrl,authorizationServerUrl,verifyBearer,
    listRoutes:bridge.listRoutes,respond:bridge.respond});
  return createWayglassCloudHost({gatewayHandler:(req,res)=>gateway.emit('request',req,res),
    checkReadiness,isStopped,sourceSha});
}
module.exports = { createWayglassCloudRuntime };
