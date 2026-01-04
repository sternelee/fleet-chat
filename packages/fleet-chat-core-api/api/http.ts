/**
 * HTTP Client API
 *
 * Tauri-native HTTP client using @tauri-apps/plugin-http
 */

import { fetch as tauriFetch, Client } from '@tauri-apps/plugin-http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | FormData | unknown;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

/**
 * HTTP Client class wrapping Tauri HTTP plugin
 */
export class HttpClient {
  private client?: Client;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.client = new Client({
        baseUrl,
      });
    }
  }

  /**
   * Perform HTTP GET request
   */
  async get<T = unknown>(url: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Perform HTTP POST request
   */
  async post<T = unknown>(url: string, data?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body: JSON.stringify(data) });
  }

  /**
   * Perform HTTP PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(data) });
  }

  /**
   * Perform HTTP DELETE request
   */
  async delete<T = unknown>(url: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Perform HTTP PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(data) });
  }

  /**
   * Perform HTTP request
   */
  async request<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const fetchFn = this.client ? this.client.fetch.bind(this.client) : tauriFetch;

    const response = await fetchFn(url, {
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body as BodyInit | undefined,
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const data = (await response.json().catch(() => response.text())) as T;

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      data,
    };
  }

  /**
   * Drop the HTTP client
   */
  async dispose(): Promise<void> {
    if (this.client) {
      await this.client.drop();
    }
  }
}

/**
 * Global fetch function using Tauri HTTP plugin
 */
export async function fetch<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
  const client = new HttpClient();
  return client.request<T>(url, options);
}
