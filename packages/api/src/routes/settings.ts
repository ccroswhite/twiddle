/**
 * System settings routes (admin only)
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import fs from 'fs/promises';
import path from 'path';

// Settings are stored in a JSON file for simplicity
// In production, you might want to use a database table
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Helper to get user from session cookie
async function getUserFromSession(request: FastifyRequest) {
  const cookieHeader = request.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
  const token = cookies['twiddle_session'] || '';

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

interface SystemSettings {
  // SSO Configuration
  sso: {
    enabled: boolean;
    provider: 'azure-entra' | 'okta' | 'none';
    azureEntra?: {
      clientId: string;
      clientSecret: string;
      tenantId: string;
      redirectUri: string;
    };
    okta?: {
      clientId: string;
      clientSecret: string;
      domain: string;
      redirectUri: string;
    };
  };
  // General Settings
  general: {
    siteName: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
  };
  // Security Settings
  security: {
    sessionDurationDays: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecial: boolean;
  };
  // Temporal Settings
  temporal: {
    serverAddress: string;
    namespace: string;
    taskQueue: string;
  };
}

const DEFAULT_SETTINGS: SystemSettings = {
  sso: {
    enabled: false,
    provider: 'none',
  },
  general: {
    siteName: 'Twiddle',
    allowRegistration: true,
    requireEmailVerification: false,
  },
  security: {
    sessionDurationDays: 7,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
  },
  temporal: {
    serverAddress: 'localhost:7233',
    namespace: 'default',
    taskQueue: 'twiddle-tasks',
  },
};

// Load settings from file
async function loadSettings(): Promise<SystemSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings to file
async function saveSettings(settings: SystemSettings): Promise<void> {
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Get all settings (admin only, sensitive fields masked for non-admins)
  app.get('/', async (request, reply) => {
    const user = await getUserFromSession(request);
    
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const settings = await loadSettings();
    
    // Mask sensitive fields
    const maskedSettings = {
      ...settings,
      sso: {
        ...settings.sso,
        azureEntra: settings.sso.azureEntra ? {
          ...settings.sso.azureEntra,
          clientSecret: settings.sso.azureEntra.clientSecret ? '••••••••' : '',
        } : undefined,
        okta: settings.sso.okta ? {
          ...settings.sso.okta,
          clientSecret: settings.sso.okta.clientSecret ? '••••••••' : '',
        } : undefined,
      },
    };
    
    return maskedSettings;
  });

  // Update settings (admin only)
  app.put<{
    Body: Partial<SystemSettings>;
  }>('/', async (request, reply) => {
    const user = await getUserFromSession(request);
    
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const currentSettings = await loadSettings();
    const updates = request.body;
    
    // Merge updates with current settings
    const newSettings: SystemSettings = {
      ...currentSettings,
      ...updates,
      sso: {
        ...currentSettings.sso,
        ...updates.sso,
        // Don't overwrite secrets if masked value is sent
        azureEntra: updates.sso?.azureEntra ? {
          ...currentSettings.sso.azureEntra,
          ...updates.sso.azureEntra,
          clientSecret: updates.sso.azureEntra.clientSecret === '••••••••' 
            ? currentSettings.sso.azureEntra?.clientSecret || ''
            : updates.sso.azureEntra.clientSecret || '',
        } : currentSettings.sso.azureEntra,
        okta: updates.sso?.okta ? {
          ...currentSettings.sso.okta,
          ...updates.sso.okta,
          clientSecret: updates.sso.okta.clientSecret === '••••••••'
            ? currentSettings.sso.okta?.clientSecret || ''
            : updates.sso.okta.clientSecret || '',
        } : currentSettings.sso.okta,
      },
      general: {
        ...currentSettings.general,
        ...updates.general,
      },
      security: {
        ...currentSettings.security,
        ...updates.security,
      },
      temporal: {
        ...currentSettings.temporal,
        ...updates.temporal,
      },
    };
    
    await saveSettings(newSettings);
    
    // Return masked settings
    return {
      ...newSettings,
      sso: {
        ...newSettings.sso,
        azureEntra: newSettings.sso.azureEntra ? {
          ...newSettings.sso.azureEntra,
          clientSecret: newSettings.sso.azureEntra.clientSecret ? '••••••••' : '',
        } : undefined,
        okta: newSettings.sso.okta ? {
          ...newSettings.sso.okta,
          clientSecret: newSettings.sso.okta.clientSecret ? '••••••••' : '',
        } : undefined,
      },
    };
  });

  // Test SSO configuration
  app.post('/sso/test', async (request, reply) => {
    const user = await getUserFromSession(request);
    
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const settings = await loadSettings();
    
    if (!settings.sso.enabled) {
      return reply.status(400).send({ error: 'SSO is not enabled' });
    }
    
    // Basic validation based on provider
    if (settings.sso.provider === 'azure-entra') {
      const config = settings.sso.azureEntra;
      if (!config?.clientId || !config?.tenantId) {
        return { success: false, message: 'Missing Azure Entra configuration (Client ID or Tenant ID)' };
      }
      
      // Try to fetch the OpenID configuration
      try {
        const response = await fetch(
          `https://login.microsoftonline.com/${config.tenantId}/v2.0/.well-known/openid-configuration`
        );
        if (response.ok) {
          return { success: true, message: 'Azure Entra configuration is valid' };
        } else {
          return { success: false, message: 'Invalid Tenant ID or Azure Entra is not accessible' };
        }
      } catch (err) {
        return { success: false, message: `Connection failed: ${(err as Error).message}` };
      }
    }
    
    if (settings.sso.provider === 'okta') {
      const config = settings.sso.okta;
      if (!config?.clientId || !config?.domain) {
        return { success: false, message: 'Missing Okta configuration (Client ID or Domain)' };
      }
      
      // Try to fetch the OpenID configuration
      try {
        const response = await fetch(
          `https://${config.domain}/.well-known/openid-configuration`
        );
        if (response.ok) {
          return { success: true, message: 'Okta configuration is valid' };
        } else {
          return { success: false, message: 'Invalid Okta domain or Okta is not accessible' };
        }
      } catch (err) {
        return { success: false, message: `Connection failed: ${(err as Error).message}` };
      }
    }
    
    return { success: false, message: 'Unknown SSO provider' };
  });
};
