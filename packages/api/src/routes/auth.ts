/**
 * Authentication routes for Azure Entra SSO
 */
import type { FastifyPluginAsync } from 'fastify';
import {
  getAuthConfig,
  getAuthorizationUrl,
  getAzureUrls,
  exchangeCodeForTokens,
  getUserInfo,
  createSession,
  getSession,
  deleteSession,
  type UserSession,
} from '../lib/auth.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const config = getAuthConfig();

  // Get auth configuration (public)
  app.get('/config', async () => {
    return {
      enabled: config.enabled,
      provider: config.provider,
      // Don't expose secrets
      ...(config.azure && {
        clientId: config.azure.clientId,
        tenantId: config.azure.tenantId,
      }),
    };
  });

  // Get current user session
  app.get('/me', async (request, _reply) => {
    if (!config.enabled) {
      return { authenticated: false, user: null };
    }

    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const sessionId = cookies['twiddle_session'] || '';

    if (!sessionId) {
      return { authenticated: false, user: null };
    }

    const session = await getSession(sessionId);

    if (!session) {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        provider: session.provider,
      },
    };
  });

  // Initiate login flow
  app.get('/login', async (_request, reply) => {
    if (!config.enabled) {
      return reply.status(400).send({ error: 'Authentication not enabled' });
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in cookie for verification
    reply.header(
      'Set-Cookie',
      `twiddle_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );

    const authUrl = getAuthorizationUrl(config, state);

    // Redirect to Azure login
    return reply.redirect(authUrl);
  });

  // OAuth callback
  app.get('/callback', async (request, reply) => {
    if (!config.enabled) {
      return reply.status(400).send({ error: 'Authentication not enabled' });
    }

    const { code, state, error, error_description } = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    // Check for OAuth errors
    if (error) {
      request.log.error({ error, error_description }, 'OAuth error');
      return reply.redirect(`/?auth_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return reply.redirect('/?auth_error=missing_code_or_state');
    }

    // Verify state
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const savedState = cookies['twiddle_auth_state'] || '';

    if (state !== savedState) {
      return reply.redirect('/?auth_error=invalid_state');
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(config, code);

      // Get user info
      const userInfo = await getUserInfo(tokens.accessToken);

      // Create session
      const session: UserSession = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        provider: 'azure-entra',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      };

      const sessionId = await createSession(session);

      // Set session cookie
      const isProduction = process.env.NODE_ENV === 'production';
      reply.header(
        'Set-Cookie',
        `twiddle_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProduction ? '; Secure' : ''}`
      );

      // Clear auth state cookie
      reply.header(
        'Set-Cookie',
        'twiddle_auth_state=; Path=/; HttpOnly; Max-Age=0'
      );

      // Redirect to app
      return reply.redirect('/');
    } catch (err) {
      request.log.error({ err }, 'Auth callback error');
      return reply.redirect('/?auth_error=authentication_failed');
    }
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const sessionId = cookies['twiddle_session'] || '';

    if (sessionId) {
      await deleteSession(sessionId);
    }

    // Clear session cookie
    reply.header(
      'Set-Cookie',
      'twiddle_session=; Path=/; HttpOnly; Max-Age=0'
    );

    if (config.enabled && config.azure) {
      // Return Azure logout URL for frontend to redirect
      const { logoutUrl } = getAzureUrls(config);
      const postLogoutRedirect = process.env.APP_URL || 'http://localhost:5173';

      return {
        success: true,
        logoutUrl: `${logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`,
      };
    }

    return { success: true };
  });

  // Get logout URL (for frontend)
  app.get('/logout-url', async () => {
    if (!config.enabled || !config.azure) {
      return { logoutUrl: null };
    }

    const { logoutUrl } = getAzureUrls(config);
    const postLogoutRedirect = process.env.APP_URL || 'http://localhost:5173';

    return {
      logoutUrl: `${logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`,
    };
  });
};
