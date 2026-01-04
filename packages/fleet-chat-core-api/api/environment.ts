/**
 * Environment API
 *
 * Tauri-native environment information using @tauri-apps/plugin-os
 */

import {
  type,
  version,
  arch,
  tempdir,
  platform,
  version as osVersion,
} from '@tauri-apps/plugin-os';

export interface EnvironmentInfo {
  os: string;
  osVersion: string;
  arch: string;
  platform: string;
  tempDir: string;
}

/**
 * Environment API class wrapping Tauri OS plugin
 */
export class Environment {
  /**
   * Get operating system type
   */
  static async osType(): Promise<string> {
    return type();
  }

  /**
   * Get operating system version
   */
  static async osVersion(): Promise<string> {
    return osVersion();
  }

  /**
   * Get system architecture
   */
  static async arch(): Promise<string> {
    return arch();
  }

  /**
   * Get platform (Linux, macOS, Windows)
   */
  static async platform(): Promise<'linux' | 'darwin' | 'windows'> {
    return platform();
  }

  /**
   * Get temp directory
   */
  static async tempDir(): Promise<string> {
    return tempdir();
  }

  /**
   * Get all environment info
   */
  static async getInfo(): Promise<EnvironmentInfo> {
    const [osType, osVer, archStr, plat, tmp] = await Promise.all([
      this.osType(),
      this.osVersion(),
      this.arch(),
      this.platform(),
      this.tempDir(),
    ]);

    return {
      os: osType,
      osVersion: osVer,
      arch: archStr,
      platform: plat,
      tempDir: tmp,
    };
  }

  /**
   * Get environment variable (browser fallback for development)
   */
  static getEnv(name: string): string | undefined {
    // In browser/dev mode, use process.env or window
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    return undefined;
  }

  /**
   * Get command line arguments (Tauri-specific)
   */
  static async getArgs(): Promise<string[]> {
    // This would need to be a Tauri command if needed
    // For now, return empty array
    return [];
  }
}
