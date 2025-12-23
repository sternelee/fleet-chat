/**
 * OAuth API
 *
 * Provides OAuth functionality for plugins
 */

import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'

export enum OAuthRedirectMethod {
  Web = 'web',
  App = 'app',
  AppURI = 'appURI',
}

export interface OAuthOptions {
  providerName: string
  clientId: string
  clientSecret?: string
  authorizationUrl: string
  tokenUrl: string
  redirectUri: string
  scopes?: string[]
  redirectMethod?: OAuthRedirectMethod
  providerIcon?: string
}

export interface OAuthToken {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn?: number
  scope?: string
}

export interface OAuthUser {
  id: string
  name?: string
  email?: string
  avatar?: string
  [key: string]: any
}

export class OAuth {
  public static defaultOptions: Partial<OAuthOptions> = {
    redirectMethod: OAuthRedirectMethod.Web,
  }

  /**
   * Perform OAuth authorization flow
   */
  static async authorize(options: OAuthOptions): Promise<OAuthToken> {
    try {
      const mergedOptions = { ...OAuth.defaultOptions, ...options }
      const token = await invoke<OAuthToken>('oauth_authorize', { options: mergedOptions })
      return token
    } catch (error) {
      console.error('OAuth authorization failed:', error)
      throw error
    }
  }

  /**
   * Refresh OAuth token
   */
  static async refreshToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<OAuthToken> {
    try {
      const token = await invoke<OAuthToken>('oauth_refresh_token', {
        tokenUrl,
        clientId,
        clientSecret,
        refreshToken,
      })
      return token
    } catch (error) {
      console.error('OAuth token refresh failed:', error)
      throw error
    }
  }

  /**
   * Get user information from OAuth provider
   */
  static async getUserInfo(token: string, userInfoUrl: string): Promise<OAuthUser> {
    try {
      const user = await invoke<OAuthUser>('oauth_get_user_info', {
        token,
        userInfoUrl,
      })
      return user
    } catch (error) {
      console.error('Failed to get OAuth user info:', error)
      throw error
    }
  }

  /**
   * Revoke OAuth token
   */
  static async revokeToken(token: string, revokeUrl?: string): Promise<void> {
    try {
      await invoke('oauth_revoke_token', {
        token,
        revokeUrl,
      })
    } catch (error) {
      console.error('Failed to revoke OAuth token:', error)
      throw error
    }
  }

  /**
   * Generate PKCE challenge and verifier
   */
  static async generatePKCE(): Promise<{
    verifier: string
    challenge: string
    method: string
  }> {
    try {
      const pkce = await invoke<{
        verifier: string
        challenge: string
        method: string
      }>('oauth_generate_pkce')
      return pkce
    } catch (error) {
      console.error('Failed to generate PKCE:', error)
      throw error
    }
  }

  /**
   * Open OAuth URL in browser
   */
  static async openAuthorizationUrl(url: string): Promise<void> {
    try {
      await openUrl(url)
    } catch (error) {
      console.error('Failed to open OAuth URL:', error)
      throw error
    }
  }

  /**
   * OAuth client for managing flows
   */
  static createClient(config: OAuthOptions) {
    return new OAuthClient(config)
  }
}

export class OAuthClient {
  private config: OAuthOptions
  private currentToken?: OAuthToken

  constructor(config: OAuthOptions) {
    this.config = { ...OAuth.defaultOptions, ...config }
  }

  /**
   * Start OAuth authorization flow
   */
  async authorize(scopes: string[] = []): Promise<OAuthToken> {
    const options: OAuthOptions = {
      ...this.config,
      scopes: [...(this.config.scopes || []), ...scopes],
    }

    this.currentToken = await OAuth.authorize(options)
    return this.currentToken
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.currentToken?.accessToken || null
  }

  /**
   * Get current token
   */
  getCurrentToken(): OAuthToken | null {
    return this.currentToken || null
  }

  /**
   * Set token manually
   */
  setToken(token: OAuthToken): void {
    this.currentToken = token
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.currentToken || !this.currentToken.expiresIn) {
      return false
    }

    // In a real implementation, you'd store the token timestamp
    // For now, assume tokens are valid for 1 hour
    return false
  }

  /**
   * Refresh token if needed
   */
  async refreshIfNeeded(): Promise<void> {
    if (this.isTokenExpired() && this.currentToken?.refreshToken) {
      this.currentToken = await OAuth.refreshToken(
        this.config.tokenUrl,
        this.config.clientId,
        this.config.clientSecret!,
        this.currentToken.refreshToken,
      )
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(userInfoUrl?: string): Promise<OAuthUser> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }

    const url = userInfoUrl || this.getDefaultUserInfoUrl()
    return OAuth.getUserInfo(token, url)
  }

  /**
   * Revoke current token
   */
  async revoke(): Promise<void> {
    const token = this.getAccessToken()
    if (token) {
      await OAuth.revokeToken(token)
      this.currentToken = undefined
    }
  }

  /**
   * Make authenticated HTTP request
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  private getDefaultUserInfoUrl(): string {
    // This would be provider-specific
    // For now, return a generic URL
    return `${this.config.authorizationUrl}/user`
  }
}

// PKCE helper class
export class PKCEClient {
  private verifier: string = ''
  private challenge: string = ''
  private method: string = ''

  constructor(
    private options: {
      redirectMethod: OAuthRedirectMethod
      providerName: string
      providerIcon?: string
    },
  ) {
    // Generate PKCE values
    this.generatePKCE()
  }

  private async generatePKCE(): Promise<void> {
    const pkce = await OAuth.generatePKCE()
    this.verifier = pkce.verifier
    this.challenge = pkce.challenge
    this.method = pkce.method
  }

  getVerifier(): string {
    return this.verifier
  }

  getChallenge(): string {
    return this.challenge
  }

  getMethod(): string {
    return this.method
  }

  getProviderName(): string {
    return this.options.providerName
  }

  getProviderIcon(): string | undefined {
    return this.options.providerIcon
  }
}
