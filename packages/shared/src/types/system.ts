/**
 * System settings types for Twiddle
 */

export interface SystemSettings {
    id: string;
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
    general: {
        siteName: string;
        allowRegistration: boolean;
        requireEmailVerification: boolean;
    };
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
    temporal: {
        serverAddress: string;
        namespace: string;
        taskQueue: string;
    };
    updatedAt: string;
}
