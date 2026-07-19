import type { IncomingMessage } from 'node:http';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { JwtPayload } from '../auth/jwt-payload.interface';

export type AuthenticatedMcpRequest = IncomingMessage & {
  user: JwtPayload;
  auth?: AuthInfo;
};

/**
 * Maps the NestJS JWT payload (ADR-010) onto the MCP SDK AuthInfo shape
 * expected by StreamableHTTPServerTransport.handleRequest(req, res).
 */
export function attachJwtAuthInfo(
  req: IncomingMessage & { user: JwtPayload },
): AuthenticatedMcpRequest {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : '';

  const authenticatedReq = req as AuthenticatedMcpRequest;
  authenticatedReq.auth = {
    token,
    clientId: req.user.sub,
    scopes: [req.user.role],
    extra: { user: req.user },
  };

  return authenticatedReq;
}

/** Reads the JwtPayload stored in AuthInfo.extra by attachJwtAuthInfo. */
export function getJwtUserFromAuthInfo(
  authInfo: AuthInfo | undefined,
): JwtPayload | undefined {
  const user = authInfo?.extra?.user;
  if (
    user &&
    typeof user === 'object' &&
    'sub' in user &&
    'email' in user &&
    'role' in user
  ) {
    return user as JwtPayload;
  }
  return undefined;
}
