/**
 * Authentication utilities for Azure Entra SSO
 */
import type { FastifyRequest, FastifyReply } from 'fastify';

import { logger } from './logger.js';

export interface AuthConfig {
  enabled: boolean;
  provider: 'azure-entra' | 'none' | 'local';
  azure?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Load auth config from environment
export function getAuthConfig(): AuthConfig {
  const enabled = process.env.AUTH_ENABLED === 'true';
  const provider = (process.env.AUTH_PROVIDER as AuthConfig['provider']) || 'none';

  if (!enabled || provider === 'none') {
    return { enabled: false, provider: 'none' };
  }

  if (provider === 'local') {
    return { enabled: true, provider: 'local' };
  }

  if (provider === 'azure-entra') {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!tenantId || !clientId || !clientSecret) {
      logger.warn('Azure Entra SSO enabled but missing configuration');
      return { enabled: false, provider: 'none' };
    }

    return {
      enabled: true,
      provider: 'azure-entra',
      azure: {
        tenantId,
        clientId,
        clientSecret,
        redirectUri,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
      },
    };
  }

  return { enabled: false, provider: 'none' };
}

// Azure Entra OAuth URLs
export function getAzureUrls(config: AuthConfig) {
  if (!config.azure) throw new Error('Azure config not available');

  const { tenantId } = config.azure;
  const baseUrl = `https://login.microsoftonline.com/${tenantId}`;

  return {
    authorizeUrl: `${baseUrl}/oauth2/v2.0/authorize`,
    tokenUrl: `${baseUrl}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    logoutUrl: `${baseUrl}/oauth2/v2.0/logout`,
  };
}

// Generate authorization URL
export function getAuthorizationUrl(config: AuthConfig, state: string): string {
  if (!config.azure) throw new Error('Azure config not available');

  const { authorizeUrl } = getAzureUrls(config);
  const { clientId, redirectUri, scopes } = config.azure;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    response_mode: 'query',
    state,
  });

  return `${authorizeUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  config: AuthConfig,
  code: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number; idToken?: string }> {
  if (!config.azure) throw new Error('Azure config not available');

  const { tokenUrl } = getAzureUrls(config);
  const { clientId, clientSecret, redirectUri, scopes } = config.azure;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: scopes.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    idToken: data.id_token,
  };
}

// Refresh access token
export async function refreshAccessToken(
  config: AuthConfig,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  if (!config.azure) throw new Error('Azure config not available');

  const { tokenUrl } = getAzureUrls(config);
  const { clientId, clientSecret, scopes } = config.azure;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: scopes.join(' '),
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// Get user info from Microsoft Graph
export async function getUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  givenName?: string;
  surname?: string;
}> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  const data = await response.json() as {
    id: string;
    mail?: string;
    userPrincipalName: string;
    displayName: string;
    givenName?: string;
    surname?: string;
  };

  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    name: data.displayName,
    givenName: data.givenName,
    surname: data.surname,
  };
}

// Session management using Prisma
import { prisma } from './prisma.js';

// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userSession: UserSession): Promise<string> {
  // 1. Upsert user
  const user = await prisma.user.upsert({
    where: { email: userSession.email.toLowerCase() },
    update: {
      name: userSession.name,
      lastLoginAt: new Date(),
      // Update provider info if needed, or keep existing
    },
    create: {
      email: userSession.email.toLowerCase(),
      name: userSession.name,
      provider: userSession.provider,
      isActive: true, // Auto-activate SSO users
    },
  });

  // 2. Ensure default group membership
  const groupCount = await prisma.groupMember.count({
    where: { userId: user.id },
  });

  if (groupCount === 0) {
    const defaultGroup = await prisma.group.findFirst({
      where: { isDefault: true },
    });
    if (defaultGroup) {
      await prisma.groupMember.create({
        data: {
          userId: user.id,
          groupId: defaultGroup.id,
          role: 'member',
        },
      });
    }
  }

  // 3. Create session
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function getSession(token: string): Promise<UserSession | undefined> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return undefined;
  }

  // Check expiry
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return undefined;
  }

  if (!session.user.isActive) {
    return undefined;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || '',
    provider: session.user.provider,
    // We don't store upstream tokens in DB session
  };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

// Optional auth middleware
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    const cookieHeader = request.headers.cookie || '';
    if (!cookieHeader) return;

    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length >= 2) {
        cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
    const token = cookies['twiddle_session'] || '';

    if (!token) return;

    const session = await getSession(token);

    if (session) {
      (request as FastifyRequest & { user: { id: string; email: string; name: string | null; isAdmin: boolean } }).user = {
        id: session.id,
        email: session.email,
        name: session.name,
        isAdmin: false, // Access user record for strict admin check if needed
      };

      // Fetch admin status if needed (optimization: add isAdmin to UserSession interface or fetch here)
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { isAdmin: true }
      });
      if (user?.isAdmin) {
        (request as any).user.isAdmin = true;
      }
    }
  } catch (error) {
    request.log.error({ err: error }, 'Auth middleware error');
  }
}

// Auth middleware
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = getAuthConfig();

  if (!config.enabled) {
    return;
  }

  const cookieHeader = request.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
  const sessionId = cookies['twiddle_session'] || '';

  if (!sessionId) {
    reply.status(401).send({ error: 'Unauthorized', message: 'No session found' });
    return;
  }

  const session = await getSession(sessionId);

  if (!session) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid session' });
    return;
  }

  // Attach user to request
  (request as FastifyRequest & { user: UserSession }).user = session;
}
