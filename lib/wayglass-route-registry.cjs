'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-route-registry.cjs');
module.exports = runtime;
module.exports.parseSpicyChatChatLink = runtime.parseSpicyChatChatLink;
module.exports.resolveWayglassRoute = runtime.resolveWayglassRoute;
module.exports.publicWayglassRoutes = runtime.publicWayglassRoutes;
module.exports.wayglassRouteIds = runtime.wayglassRouteIds;
