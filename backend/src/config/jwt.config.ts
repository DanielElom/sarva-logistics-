/**
 * @module JwtConfig
 * @description Single source of truth for the JWT signing/verification secret.
 *
 * Fails closed. A hardcoded fallback secret is worse than no secret at all:
 * if JWT_SECRET were ever unset in production, tokens would be signed and
 * verified with a value published in this repository, so anyone could forge
 * an ADMIN token. Refusing to boot is the safe failure mode.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start — set it in backend/.env ' +
        '(local) or in the Render service environment (production).',
    );
  }
  return secret;
}
