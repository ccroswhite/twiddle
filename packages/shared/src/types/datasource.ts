/**
 * Credential types for Twiddle
 */

/**
 * Type-safe definition of all possible credential data fields.
 * Different credential types use different subsets of these fields.
 */
export interface CredentialData {
  // Authentication
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;

  // Database connection
  host?: string;
  port?: number;
  database?: string;

  // SSH/TLS
  privateKey?: string;
  passphrase?: string;
  useTls?: boolean;
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;

  // OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;

  // Snowflake specific
  account?: string;
  warehouse?: string;
  role?: string;

  // WinRM
  domain?: string;
  useHttps?: boolean;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  data: CredentialData;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CredentialCreateInput {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

export interface CredentialUpdateInput {
  name?: string;
  data?: Record<string, unknown>;
}

export interface CredentialTestResult {
  success: boolean;
  message: string;
  details?: {
    errorCode?: string;
    rawError?: string;
    connectionInfo?: {
      host?: string;
      port?: number;
      user?: string;
      database?: string;
    };
    version?: string;
    [key: string]: unknown;
  };
}

export interface DataSourceWithAccess {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  groups: {
    id: string;
    name: string;
  }[];
  isOwner: boolean;
}

// Backwards compatibility alias
export type CredentialWithAccess = DataSourceWithAccess;
