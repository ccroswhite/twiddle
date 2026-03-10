export interface DataSourceData {
    username?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
    token?: string;
    apiKey?: string;
    useTls?: boolean;
    privateKey?: string;
    passphrase?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    account?: string;
    warehouse?: string;
    role?: string;
    domain?: string;
    useHttps?: boolean;
    tenantId?: string;
    allowSelfSigned?: boolean;
    skipHostnameVerification?: boolean;
}

export interface TestResult {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}
