/**
 * Plugin Loader
 *
 * Handles loading plugins from various sources (directory, .fcp package, URL, etc.)
 */

import { loadManifest, parseManifest, type PluginManifest } from './manifest.js';
import { validateCode } from '../sandbox/sandbox.js';

export interface LoadResult {
  manifest: PluginManifest;
  code?: string | Record<string, string>;
  entryPoint?: string;
  success: boolean;
  error?: string;
}

export interface PluginSource {
  type: 'directory' | 'package' | 'url' | 'code';
  path?: string;
  url?: string;
  code?: string;
}

export class PluginLoader {
  private static cache = new Map<string, LoadResult>();

  /**
   * Load plugin from directory path
   */
  static async loadFromDirectory(path: string, useCache = true): Promise<LoadResult> {
    const cacheKey = `dir:${path}`;

    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const manifest = await loadManifest(path);

      if (!manifest.isValid) {
        const result: LoadResult = {
          manifest,
          success: false,
          error: manifest.errors.join(', '),
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Find entry point (usually index.js or main field in manifest)
      let entryPoint = 'index.js';
      if (manifest.data.main) {
        entryPoint = manifest.data.main;
      }

      // Try to load the plugin code
      let code: string | Record<string, string> | undefined;

      try {
        // Try loading the main entry point
        const entryPath = `${path}/${entryPoint}`;
        const response = await fetch(entryPath);

        if (response.ok) {
          code = await response.text();
        } else {
          // Try with .ts extension
          const tsEntryPath = entryPoint.replace('.js', '.ts');
          const tsResponse = await fetch(`${path}/${tsEntryPath}`);

          if (tsResponse.ok) {
            code = await tsResponse.text();
          } else {
            // Try package.json exports field
            code = await this.loadFromExports(path, manifest);
          }
        }
      } catch (e) {
        // Code loading failed, but manifest is valid
        // Plugin will be loaded dynamically
      }

      const result: LoadResult = {
        manifest,
        entryPoint,
        code,
        success: true,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result: LoadResult = {
        manifest: { data: {} as any, path, isValid: false, errors: [] },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * Load plugin from .fcp package (Fleet Chat Package)
   * .fcp is a ZIP file containing plugin files
   */
  static async loadFromPackage(packagePath: string): Promise<LoadResult> {
    const cacheKey = `pkg:${packagePath}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Read the package file
      const response = await fetch(packagePath);
      if (!response.ok) {
        throw new Error(`Failed to load package: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const packageData = new Uint8Array(arrayBuffer);

      // Decompress and parse
      const { manifest, code } = await this.extractPackage(packageData);

      const result: LoadResult = {
        manifest,
        code,
        success: manifest.isValid,
        error: manifest.isValid ? undefined : manifest.errors.join(', '),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result: LoadResult = {
        manifest: { data: {} as any, path: packagePath, isValid: false, errors: [] },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * Load plugin from URL
   */
  static async loadFromUrl(url: string, options?: {
    allowedDomains?: string[];
    validateManifest?: boolean;
  }): Promise<LoadResult> {
    const cacheKey = `url:${url}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Validate domain if restrictions provided
      if (options?.allowedDomains && options.allowedDomains.length > 0) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        const isAllowed = options.allowedDomains.some(domain => {
          if (domain === '*') return true;
          if (domain.startsWith('*.')) {
            const baseDomain = domain.slice(2);
            return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
          }
          return hostname === domain;
        });

        if (!isAllowed) {
          throw new Error(`Domain not allowed: ${hostname}`);
        }
      }

      // Fetch manifest from URL
      const manifestUrl = url.endsWith('/') ? `${url}package.json` : `${url}/package.json`;
      const manifestResponse = await fetch(manifestUrl);

      if (!manifestResponse.ok) {
        throw new Error(`Failed to load manifest: ${manifestResponse.statusText}`);
      }

      const manifestJson = await manifestResponse.text();
      const manifest = parseManifest(manifestJson);
      manifest.path = url;

      if (!manifest.isValid) {
        const result: LoadResult = {
          manifest,
          success: false,
          error: manifest.errors.join(', '),
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Load plugin code
      let code: string | Record<string, string> | undefined;

      try {
        const entryPoint = manifest.data.main || 'index.js';
        const codeUrl = `${url}/${entryPoint}`;
        const codeResponse = await fetch(codeUrl);

        if (codeResponse.ok) {
          code = await codeResponse.text();

          // Validate code for security issues
          if (options?.validateManifest !== false) {
            const validation = validateCode(code);
            if (!validation.valid) {
              return {
                manifest,
                success: false,
                error: `Code validation failed: ${validation.errors.join(', ')}`,
              };
            }
          }
        }
      } catch {
        // Code loading is optional
      }

      const result: LoadResult = {
        manifest,
        code,
        success: true,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result: LoadResult = {
        manifest: { data: {} as any, path: url, isValid: false, errors: [] },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * Load plugin from code string
   */
  static async loadFromCode(
    code: string,
    manifestData: any,
    options?: {
      validateCode?: boolean;
    }
  ): Promise<LoadResult> {
    try {
      const manifest = parseManifest(JSON.stringify(manifestData));

      if (!manifest.isValid) {
        return {
          manifest,
          success: false,
          error: manifest.errors.join(', '),
        };
      }

      // Validate code if requested
      if (options?.validateCode !== false) {
        const validation = validateCode(code);
        if (!validation.valid) {
          return {
            manifest,
            success: false,
            error: `Code validation failed: ${validation.errors.join(', ')}`,
          };
        }
      }

      return {
        manifest,
        code,
        success: true,
      };
    } catch (error) {
      return {
        manifest: { data: {} as any, path: '', isValid: false, errors: [] },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Load plugin from auto-detecting source type
   */
  static async load(source: string | PluginSource): Promise<LoadResult> {
    if (typeof source === 'string') {
      // Auto-detect source type
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return this.loadFromUrl(source);
      } else if (source.endsWith('.fcp')) {
        return this.loadFromPackage(source);
      } else {
        return this.loadFromDirectory(source);
      }
    }

    // Use explicit source type
    switch (source.type) {
      case 'directory':
        return source.path ? this.loadFromDirectory(source.path) : {
          manifest: { data: {} as any, path: '', isValid: false, errors: ['Missing path'] },
          success: false,
          error: 'Missing path for directory source',
        };
      case 'package':
        return source.path ? this.loadFromPackage(source.path) : {
          manifest: { data: {} as any, path: '', isValid: false, errors: ['Missing path'] },
          success: false,
          error: 'Missing path for package source',
        };
      case 'url':
        return source.url ? this.loadFromUrl(source.url) : {
          manifest: { data: {} as any, path: '', isValid: false, errors: ['Missing URL'] },
          success: false,
          error: 'Missing URL for url source',
        };
      case 'code':
        return source.code ? this.loadFromCode(source.code, {}) : {
          manifest: { data: {} as any, path: '', isValid: false, errors: ['Missing code'] },
          success: false,
          error: 'Missing code for code source',
        };
      default:
        return {
          manifest: { data: {} as any, path: '', isValid: false, errors: ['Unknown source type'] },
          success: false,
          error: `Unknown source type: ${(source as any).type}`,
        };
    }
  }

  /**
   * Validate plugin permissions
   */
  static validatePermissions(
    permissions: string[],
    grantedPermissions: string[] = []
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const permission of permissions) {
      if (permission !== '*' && !grantedPermissions.includes(permission) && !grantedPermissions.includes('*')) {
        missing.push(permission);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Clear the loader cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Extract package data from .fcp file
   * .fcp format: ZIP archive with package.json at root
   */
  private static async extractPackage(packageData: Uint8Array): Promise<{
    manifest: PluginManifest;
    code?: string | Record<string, string>;
  }> {
    // For a real implementation, use a ZIP library like jszip
    // For now, return a placeholder
    return {
      manifest: {
        data: {} as any,
        path: '',
        isValid: false,
        errors: ['Package extraction not yet implemented'],
      },
    };
  }

  /**
   * Load plugin code from package.json exports field
   */
  private static async loadFromExports(
    path: string,
    manifest: PluginManifest
  ): Promise<string | Record<string, string> | undefined> {
    // Check for exports field in manifest
    // This is a placeholder - real implementation would parse exports
    return undefined;
  }
}
