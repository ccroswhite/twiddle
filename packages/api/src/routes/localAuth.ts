/**
 * Local authentication routes (username/password)
 */
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  validatePassword,
  validateEmail,
} from '../lib/password.js';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Password reset token duration: 1 hour
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export const localAuthRoutes: FastifyPluginAsync = async (app) => {
  // Register a new user
  app.post<{
    Body: {
      email: string;
      password: string;
      name?: string;
    };
  }>('/register', async (request, reply) => {
    const { email, password, name } = request.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return reply.status(400).send({ error: 'Invalid email address' });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return reply.status(400).send({ error: passwordError });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // Check if this is the first user (will be admin)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (first user becomes admin)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password: hashedPassword,
        provider: 'local',
        isActive: true,
        isAdmin: isFirstUser,
      },
    });

    // Ensure Default group exists
    let defaultGroup = await prisma.group.findFirst({
      where: { isDefault: true },
    });

    if (!defaultGroup) {
      // Create the Default group if it doesn't exist
      defaultGroup = await prisma.group.create({
        data: {
          name: 'Default',
          description: 'Default group for all users',
          isDefault: true,
          createdById: user.id,
        },
      });
    }

    // Add user to default group
    await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId: defaultGroup.id,
        role: isFirstUser ? 'admin' : 'member', // First user is admin of default group too
      },
    });

    // Create session
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    reply.header(
      'Set-Cookie',
      `twiddle_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${isProduction ? '; Secure' : ''}`
    );

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    };
  });

  // Login with email/password
  app.post<{
    Body: {
      email: string;
      password: string;
    };
  }>('/login', async (request, reply) => {
    const email = (request.body as any).email?.trim();
    const password = (request.body as any).password?.trim();

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log(`[Auth] Login failed: User not found for email "${email}"`);
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return reply.status(401).send({ error: 'Account is disabled' });
    }

    // Check if user has a password (local auth)
    if (!user.password) {
      return reply.status(401).send({
        error: 'This account uses SSO. Please login with your SSO provider.'
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.log(`[Auth] Login failed: Invalid password for user "${email}"`);
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    reply.header(
      'Set-Cookie',
      `twiddle_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${isProduction ? '; Secure' : ''}`
    );

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    };
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const token = cookies['twiddle_session'] || '';

    if (token) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Clear session cookie
    reply.header(
      'Set-Cookie',
      'twiddle_session=; Path=/; HttpOnly; Max-Age=0'
    );

    return { success: true };
  });

  // Get current user
  app.get('/me', async (request, _reply) => {
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const token = cookies['twiddle_session'] || '';

    if (!token) {
      return { authenticated: false, user: null };
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return { authenticated: false, user: null };
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return { authenticated: false, user: null };
    }

    // Check if user is active
    if (!session.user.isActive) {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isAdmin: session.user.isAdmin,
        provider: session.user.provider,
      },
    };
  });

  // Change password
  app.post<{
    Body: {
      currentPassword: string;
      newPassword: string;
    };
  }>('/change-password', async (request, reply) => {
    const { currentPassword, newPassword } = request.body;

    // Get current user from session
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
    );
    const token = cookies['twiddle_session'] || '';

    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const user = session.user;

    // Check if user has local auth
    if (!user.password) {
      return reply.status(400).send({
        error: 'Cannot change password for SSO accounts'
      });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return reply.status(400).send({ error: passwordError });
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Optionally: invalidate all other sessions
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        token: { not: token },
      },
    });

    return { success: true };
  });

  // Check if any users exist (for initial setup)
  app.get('/setup-required', async () => {
    const userCount = await prisma.user.count();
    return { setupRequired: userCount === 0 };
  });

  // Create initial admin user (only works if no users exist)
  app.post<{
    Body: {
      email: string;
      password: string;
      name?: string;
    };
  }>('/setup', async (request, reply) => {
    const body = request.body || {};
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    // Check if body was received
    if (!email && !password) {
      console.log('Setup request body:', request.body);
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    // Check if any users exist
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return reply.status(400).send({ error: 'Setup already completed' });
    }

    // Validate email
    if (!email || !validateEmail(email)) {
      return reply.status(400).send({ error: 'Invalid email address' });
    }

    // Validate password
    if (!password) {
      return reply.status(400).send({ error: 'Password is required' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return reply.status(400).send({ error: passwordError });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || 'Admin',
        password: hashedPassword,
        provider: 'local',
        isAdmin: true,
        isActive: true,
      },
    });

    // Create default group
    const defaultGroup = await prisma.group.create({
      data: {
        name: 'Default',
        description: 'Default group for all users',
        isDefault: true,
        createdById: user.id,
      },
    });

    // Add admin to default group
    await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId: defaultGroup.id,
        role: 'admin',
      },
    });

    // Create session
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    reply.header(
      'Set-Cookie',
      `twiddle_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${isProduction ? '; Secure' : ''}`
    );

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    };
  });

  // Request password reset
  app.post<{
    Body: {
      email: string;
    };
  }>('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    if (!email || !validateEmail(email)) {
      return reply.status(400).send({ error: 'Invalid email address' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || user.provider !== 'local') {
      // Log for debugging but don't reveal to user
      console.log(`Password reset requested for non-existent or SSO user: ${email}`);
      return { success: true, message: 'If an account exists with this email, a reset link has been generated.' };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_DURATION_MS);

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // In a real application, you would send an email here
    // For now, we'll return the token in the response (development only)
    const isDev = process.env.NODE_ENV !== 'production';

    // Log token in dev for testing
    if (isDev) {
      console.log(`[DEV ONLY] Password reset token generated for ${email}: ${resetToken}`);
      console.log(`[DEV ONLY] Reset URL: /reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been generated.',
      // Only include token in development for testing
      ...(isDev && {
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
      }),
    };
  });

  // Verify reset token is valid
  app.post<{
    Body: {
      email: string;
      token: string;
    };
  }>('/verify-reset-token', async (request, reply) => {
    const { email, token } = request.body;

    if (!email || !token) {
      return reply.status(400).send({ error: 'Email and token are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' });
    }

    if (user.resetToken !== token) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' });
    }

    if (user.resetTokenExpiry < new Date()) {
      return reply.status(400).send({ error: 'Reset token has expired' });
    }

    return { valid: true };
  });

  // Reset password with token
  app.post<{
    Body: {
      email: string;
      token: string;
      newPassword: string;
    };
  }>('/reset-password', async (request, reply) => {
    const { email, token, newPassword } = request.body;

    if (!email || !token || !newPassword) {
      return reply.status(400).send({ error: 'Email, token, and new password are required' });
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return reply.status(400).send({ error: passwordError });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' });
    }

    if (user.resetToken !== token) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' });
    }

    if (user.resetTokenExpiry < new Date()) {
      return reply.status(400).send({ error: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return { success: true, message: 'Password has been reset successfully. Please log in with your new password.' };
  });
};
