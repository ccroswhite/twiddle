/**
 * Authentication utilities for Azure Entra SSO
 */
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthConfig {
  enabled: boolean;
  provider: 'azure-entra' | 'none';
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

  if (provider === 'azure-entra') {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!tenantId || !clientId || !clientSecret) {
      console.warn('Azure Entra SSO enabled but missing configuration');
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

// Session store (in production, use Redis or database)
const sessions = new Map<string, UserSession>();

export function createSession(user: UserSession): string {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, user);
  return sessionId;
}

export function getSession(sessionId: string): UserSession | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Optional auth middleware - sets request.user if authenticated, but doesn't block
// This is used for routes that work with or without authentication
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Import prisma dynamically to avoid circular dependencies
  const { prisma } = await import('./prisma.js');
  
  try {
    const cookieHeader = request.headers.cookie || '';
    if (!cookieHeader) {
      return; // No cookies, continue without user
    }
    
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length >= 2) {
        cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
    const token = cookies['twiddle_session'] || '';
    
    if (!token) {
      return; // No session, continue without user
    }
    
    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return; // Invalid/expired session, continue without user
    }
    
    // Attach user to request
    (request as FastifyRequest & { user: { id: string; email: string; name: string | null; isAdmin: boolean } }).user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isAdmin: session.user.isAdmin,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Continue without user on error
  }
}

// Auth middleware
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = getAuthConfig();
  
  // If auth is disabled, allow all requests
  if (!config.enabled) {
    return;
  }
  
  // Check for session cookie or authorization header
  const cookieHeader = request.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
  const sessionId = cookies['twiddle_session'] || '';
  
  if (!sessionId) {
    reply.status(401).send({ error: 'Unauthorized', message: 'No session found' });
    return;
  }
  
  const session = getSession(sessionId);
  
  if (!session) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid session' });
    return;
  }
  
  // Check if token is expired
  if (session.expiresAt && Date.now() > session.expiresAt) {
    // Try to refresh the token
    if (session.refreshToken) {
      try {
        const tokens = await refreshAccessToken(config, session.refreshToken);
        session.accessToken = tokens.accessToken;
        session.refreshToken = tokens.refreshToken;
        session.expiresAt = Date.now() + tokens.expiresIn * 1000;
      } catch {
        deleteSession(sessionId);
        reply.status(401).send({ error: 'Unauthorized', message: 'Session expired' });
        return;
      }
    } else {
      deleteSession(sessionId);
      reply.status(401).send({ error: 'Unauthorized', message: 'Session expired' });
      return;
    }
  }
  
  // Attach user to request
  (request as FastifyRequest & { user: UserSession }).user = session;
}
