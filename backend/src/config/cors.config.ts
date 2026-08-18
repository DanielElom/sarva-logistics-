/**
 * @module CorsConfig
 * @description Shared CORS configuration for HTTP and WebSocket gateways.
 * Both must use the same allowlist to prevent unauthorized cross-origin access.
 *
 * Socket.io gateways do NOT inherit `app.enableCors()` — each @WebSocketGateway
 * carries its own cors option, so both must call getAllowedOrigins() explicitly.
 */
export function getAllowedOrigins(): string[] {
  const origins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (process.env.FRONTEND_URL) {
    // Trim a trailing slash — browsers send the Origin header without one,
    // and CORS matching is an exact string comparison.
    origins.push(process.env.FRONTEND_URL.replace(/\/+$/, ''));
  }
  return origins;
}
