import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testOAuth2 } from './oauth2.js';

describe('OAuth2 / OIDC Tester', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should fail if no client ID is provided', async () => {
        const result = await testOAuth2({ issuerUrl: 'https://example.com' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('Client ID is required');
    });

    it('should fail if no issuer URL is provided', async () => {
        const result = await testOAuth2({ clientId: 'client-1' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('Issuer / Token URL is required');
    });

    it('should succeed via OIDC Discovery ping', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                issuer: 'https://example.com',
                authorization_endpoint: 'https://example.com/auth',
                token_endpoint: 'https://example.com/token'
            })
        });

        const result = await testOAuth2({ clientId: 'client-1', issuerUrl: 'https://example.com' });
        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/.well-known/openid-configuration', { method: 'GET' });
    });

    it('should fallback to token endpoint if discovery fails but clientSecret is provided', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false }) // Discovery fails
            .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' }); // Token fetch succeeds

        const result = await testOAuth2({
            clientId: 'client-1',
            clientSecret: 'secret-1',
            issuerUrl: 'https://example.com/oauth/token'
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Successfully retrieved token');

        // Assert token fetch was called with correct params
        const tokenFetchCall = vi.mocked(global.fetch).mock.calls[1] as any;
        expect(tokenFetchCall[0]).toBe('https://example.com/oauth/token');
        expect(tokenFetchCall[1].method).toBe('POST');
        expect(tokenFetchCall[1].body.toString()).toContain('grant_type=client_credentials');
    });
});
