import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test OAuth2 / OIDC Connection
 */
export async function testOAuth2(data: DataSourceData): Promise<TestResult> {
    if (!data.clientId) {
        return { success: false, message: 'Client ID is required' };
    }

    if (!data.issuerUrl) {
        return { success: false, message: 'Issuer / Token URL is required for OIDC discovery or token fetching' };
    }

    try {
        // Try OIDC Discovery first
        const discoveryUrl = data.issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
        try {
            const res = await fetch(discoveryUrl, { method: 'GET' });
            if (res.ok) {
                const config = await res.json() as any;
                return {
                    success: true,
                    message: 'Successfully connected to OIDC Discovery Endpoint',
                    details: {
                        issuer: config.issuer,
                        authorization_endpoint: config.authorization_endpoint,
                        token_endpoint: config.token_endpoint
                    }
                };
            }
        } catch (_e) {
            // Ignore fetch error for discovery and fall through to token endpoint test
        }

        // If it's not an OIDC discovery URL, try it directly as a Token Endpoint if clientSecret is provided
        if (data.clientSecret) {
            const tokenRes = await fetch(data.issuerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: data.clientId,
                    client_secret: data.clientSecret,
                })
            });

            if (tokenRes.ok) {
                return {
                    success: true,
                    message: 'Successfully retrieved token via Client Credentials',
                    details: {
                        endpoint: data.issuerUrl,
                        status: tokenRes.status
                    }
                };
            } else {
                const errorText = await tokenRes.text();
                return {
                    success: false,
                    message: `Failed to fetch token: ${tokenRes.status} ${tokenRes.statusText}`,
                    details: { response: errorText }
                };
            }
        }

        return {
            success: false,
            message: 'Issuer URL did not respond to OIDC discovery and no Client Secret was provided for token endpoint test.'
        };
    } catch (err) {
        return {
            success: false,
            message: `Connection failed: ${(err as Error).message}`,
        };
    }
}
