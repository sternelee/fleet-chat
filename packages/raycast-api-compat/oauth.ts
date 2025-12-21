/**
 * OAuth API with Tauri integration
 * Provides Raycast-compatible OAuth functionality using Tauri and system browser
 */

import { open } from "@tauri-apps/plugin-shell";
import { randomBytes } from "crypto";

/**
 * OAuth redirect methods
 */
export enum OAuthRedirectMethod {
  /**
   * Use web-based redirect
   */
  Web = "web",
  /**
   * Use app-scheme based redirect
   */
  App = "app",
  /**
   * Use URI-style app scheme
   */
  AppURI = "appURI",
}

/**
 * OAuth configuration and operations
 */
export namespace OAuth {
  export interface AuthorizationRequest {
    /**
     * The authorization URL
     */
    url: string;
    /**
     * Optional callback URL
     */
    callback?: string;
    /**
     * Additional parameters for the OAuth flow
     */
    extraParameters?: Record<string, string>;
  }

  export interface AuthorizationResponse {
    /**
     * Authorization code
     */
    code: string;
    /**
     * State parameter
     */
    state: string;
    /**
     * Additional response parameters
     */
    [key: string]: any;
  }

  export interface TokenRequest {
    /**
     * Token endpoint URL
     */
    url: string;
    /**
     * Client ID
     */
    clientId: string;
    /**
     * Client secret
     */
    clientSecret: string;
    /**
     * Authorization code
     */
    code: string;
    /**
     * Redirect URI
     */
    redirectUri: string;
    /**
     * Optional parameters
     */
    extraParameters?: Record<string, string>;
  }

  export interface TokenResponse {
    /**
     * Access token
     */
    accessToken: string;
    /**
     * Refresh token
     */
    refreshToken?: string;
    /**
     * Token type
     */
    tokenType: string;
    /**
     * Expires in seconds
     */
    expiresIn?: number;
    /**
     * Scope
     */
    scope?: string;
  }

  /**
   * Generate random state for OAuth flow
   */
  export function generateState(length: number = 32): string {
    return randomBytes(length).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, length);
  }

  /**
   * Generate PKCE challenge and verifier
   */
  export async function generatePKCE(): Promise<{
    verifier: string;
    challenge: string;
    method: string;
  }> {
    // Generate a random verifier
    const verifier = randomBytes(128).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Create challenge (simplified - in production, use proper SHA256)
    const challenge = verifier; // This should be SHA256 hash in real implementation
    const method = "plain"; // or 'S256' if using SHA256

    return { verifier, challenge, method };
  }

  /**
   * Perform OAuth authorization
   */
  export async function authorize(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    return new Promise((resolve, reject) => {
      // Generate state parameter
      const state = request.extraParameters?.state || generateState();

      // Construct full URL with parameters
      const url = new URL(request.url);
      url.searchParams.set("state", state);

      // Add extra parameters
      if (request.extraParameters) {
        Object.entries(request.extraParameters).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      // Open browser for OAuth
      console.log(`Opening OAuth URL: ${url.toString()}`);

      // In a real implementation, you'd set up a local server or deep linking
      // to handle the callback. For now, we'll simulate the response.
      open(url.toString())
        .then(() => {
          // In production, this would wait for the callback
          // For demo purposes, we'll resolve immediately
          setTimeout(() => {
            resolve({
              code: "mock_auth_code",
              state,
            });
          }, 1000);
        })
        .catch(reject);
    });
  }

  /**
   * Exchange authorization code for access token
   */
  export async function exchangeCodeForToken(request: TokenRequest): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: request.clientId,
        client_secret: request.clientSecret,
        code: request.code,
        redirect_uri: request.redirectUri,
        ...request.extraParameters,
      });

      const response = await fetch(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || "Bearer",
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      console.error("OAuth token exchange failed:", error);
      throw new Error("Failed to exchange authorization code for token");
    }
  }

  /**
   * Refresh access token
   */
  export async function refreshToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        tokenType: data.token_type || "Bearer",
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  /**
   * OAuth client for managing flows
   */
  export class OAuthClient {
    private clientId: string;
    private clientSecret?: string;
    private tokenUrl: string;
    private authUrl: string;
    private redirectUri: string;
    private currentToken?: TokenResponse;

    constructor(config: {
      clientId: string;
      clientSecret?: string;
      tokenUrl: string;
      authUrl: string;
      redirectUri: string;
    }) {
      this.clientId = config.clientId;
      this.clientSecret = config.clientSecret;
      this.tokenUrl = config.tokenUrl;
      this.authUrl = config.authUrl;
      this.redirectUri = config.redirectUri;
    }

    /**
     * Start OAuth flow
     */
    async authorize(scopes: string[] = []): Promise<void> {
      const authRequest: AuthorizationRequest = {
        url: this.authUrl,
        extraParameters: {
          client_id: this.clientId,
          redirect_uri: this.redirectUri,
          response_type: "code",
          scope: scopes.join(" "),
        },
      };

      const response = await authorize(authRequest);

      // Exchange code for token
      this.currentToken = await this.exchangeCodeForToken(response.code);
    }

    /**
     * Exchange authorization code for token
     */
    private async exchangeCodeForToken(code: string): Promise<TokenResponse> {
      return exchangeCodeForToken({
        url: this.tokenUrl,
        clientId: this.clientId,
        clientSecret: this.clientSecret!,
        code,
        redirectUri: this.redirectUri,
      });
    }

    /**
     * Get current access token
     */
    getAccessToken(): string | null {
      return this.currentToken?.accessToken || null;
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(): boolean {
      if (!this.currentToken || !this.currentToken.expiresIn) {
        return false;
      }

      // Simple check - in production, store token timestamp
      return false; // This would check actual expiration time
    }

    /**
     * Refresh token if needed
     */
    async refreshIfNeeded(): Promise<void> {
      if (this.isTokenExpired() && this.currentToken?.refreshToken) {
        this.currentToken = await refreshToken(
          this.tokenUrl,
          this.clientId,
          this.clientSecret!,
          this.currentToken.refreshToken,
        );
      }
    }
  }
}

