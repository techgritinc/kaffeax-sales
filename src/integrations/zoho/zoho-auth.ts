import { env } from '@env';

import { getZohoToken, saveZohoToken } from '@/repositories/zoho-credential.repository';
import { type ZohoTokenResponse } from '@/types/zoho.types';

interface ZohoCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  tokenUrl: string;
}

class ZohoAuthService {
  private static instance: ZohoAuthService;
  private readonly credentials: ZohoCredentials;

  private constructor() {
    this.credentials = {
      clientId: env.ZOHO_CLIENT_ID,
      clientSecret: env.ZOHO_CLIENT_SECRET,
      refreshToken: env.ZOHO_REFRESH_TOKEN,
      organizationId: env.ZOHO_ORGANIZATION_ID,
      tokenUrl: env.ZOHO_TOKEN_URL,
    };
    this.validateCredentials();
  }

  static getInstance(): ZohoAuthService {
    if (!ZohoAuthService.instance) {
      ZohoAuthService.instance = new ZohoAuthService();
    }
    return ZohoAuthService.instance;
  }

  private validateCredentials(): void {
    const missing: string[] = [];
    if (!this.credentials.clientId) missing.push('ZOHO_CLIENT_ID');
    if (!this.credentials.clientSecret) missing.push('ZOHO_CLIENT_SECRET');
    if (!this.credentials.refreshToken) missing.push('ZOHO_REFRESH_TOKEN');
    if (missing.length > 0) {
      throw new Error(`Missing required Zoho credentials: ${missing.join(', ')}`);
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const token = await getZohoToken();
      if (token && new Date(token.expires_at) > new Date(Date.now() + 60_000)) {
        return token.access_token;
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
      });

      const response = await fetch(this.credentials.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed with status ${response.status}`);
      }

      const data = (await response.json()) as ZohoTokenResponse;
      const expires_at = new Date(Date.now() + data.expires_in * 1000);
      await saveZohoToken({ access_token: data.access_token, expires_at });
      return data.access_token;
    } catch (error) {
      console.error(
        '[ZohoAuth] Failed to refresh access token:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new Error('Failed to authenticate with Zoho API');
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return { Authorization: `Zoho-oauthtoken ${token}` };
  }

  async makeAuthenticatedRequest(
    url: string,
    options?: { method?: string; body?: unknown; headers?: Record<string, string> },
  ): Promise<Response> {
    const authHeaders = await this.getAuthHeaders();
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    };
    return fetch(url, {
      method: options?.method ?? 'GET',
      headers: mergedHeaders,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  }
}

export const zohoAuth = ZohoAuthService.getInstance();
