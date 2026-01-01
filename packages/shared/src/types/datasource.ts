/**
 * Data Source types for Twiddle
 */

/**
 * Type-safe definition of all possible data source connection fields.
 * Different data source types use different subsets of these fields.
 */
export interface DataSourceData {
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

  // WinRM / Windows Auth
  domain?: string;
  useHttps?: boolean;

  // Azure Entra ID
  tenantId?: string;

  // SSL/TLS options
  allowSelfSigned?: boolean;
  skipHostnameVerification?: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  data: DataSourceData;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface DataSourceCreateInput {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

export interface DataSourceUpdateInput {
  name?: string;
  data?: Record<string, unknown>;
}

export interface DataSourceTestResult {
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

// Backwards compatibility aliases
export type CredentialData = DataSourceData;
export type Credential = DataSource;
export type CredentialCreateInput = DataSourceCreateInput;
export type CredentialUpdateInput = DataSourceUpdateInput;
export type CredentialTestResult = DataSourceTestResult;
export type CredentialWithAccess = DataSourceWithAccess;
