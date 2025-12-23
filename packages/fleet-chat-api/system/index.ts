/**
 * Fleet Chat System APIs
 *
 * System-level APIs for Fleet Chat plugins
 * Includes clipboard, filesystem, and other system integrations
 */

// Import Tauri APIs
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { exists, readTextFile, writeFile, mkdir, remove } from '@tauri-apps/plugin-fs'

// Clipboard APIs
export interface ClipboardOptions {
  text?: string
}

export interface ClipboardResult {
  success: boolean
  data?: string
  error?: string
}

/**
 * Fleet Chat Clipboard - Unified clipboard API
 * Supports both Tauri and browser environments
 */
export class Clipboard {
  /**
   * Read text from clipboard
   */
  static async readText(): Promise<string> {
    try {
      // Try Tauri clipboard first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        return await readText()
      }

      // Fallback to browser clipboard
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText()
      }

      throw new Error('Clipboard API not available')
    } catch (error) {
      console.error('Clipboard readText error:', error)
      throw error
    }
  }

  /**
   * Write text to clipboard
   */
  static async writeText(text: string): Promise<void> {
    try {
      // Try Tauri clipboard first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await writeText(text)
        return
      }

      // Fallback to browser clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }

      throw new Error('Clipboard API not available')
    } catch (error) {
      console.error('Clipboard writeText error:', error)
      throw error
    }
  }

  /**
   * Read clipboard content (legacy method)
   */
  static async read(): Promise<string> {
    return this.readText()
  }

  /**
   * Write clipboard content (legacy method)
   */
  static async write(text: string): Promise<void> {
    await this.writeText(text)
  }

  /**
   * Check if clipboard API is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Check if Tauri clipboard is available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        return true
      }

      // Check if browser clipboard is available
      return !!(
        navigator.clipboard &&
        (navigator.clipboard.readText || navigator.clipboard.writeText)
      )
    } catch {
      return false
    }
  }

  /**
   * Clear clipboard content
   */
  static async clear(): Promise<void> {
    try {
      await this.writeText('')
    } catch (error) {
      console.error('Clipboard clear error:', error)
      throw error
    }
  }

  /**
   * Check if clipboard has text content
   */
  static async hasText(): Promise<boolean> {
    try {
      const text = await this.readText()
      return text.length > 0
    } catch {
      return false
    }
  }

  /**
   * Get clipboard text length
   */
  static async getLength(): Promise<number> {
    try {
      const text = await this.readText()
      return text.length
    } catch {
      return 0
    }
  }
}

// File System APIs
export interface FileSystemOptions {
  path: string
  content?: string
  encoding?: 'utf-8' | 'binary'
}

export interface FileMetadata {
  path: string
  size: number
  modified: Date
  isDirectory: boolean
  isFile: boolean
}

export interface FileSystemResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Fleet Chat File System - Unified file system API
 * Supports both Tauri and browser environments
 */
export class FileSystem {
  /**
   * Check if a file or directory exists
   */
  static async exists(path: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        return await exists(path)
      }

      // Browser fallback - limited functionality
      return false
    } catch (error) {
      console.error('FileSystem exists error:', error)
      return false
    }
  }

  /**
   * Read text file content
   */
  static async readTextFile(path: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        return await readTextFile(path)
      }

      // Browser fallback - could implement IndexedDB storage
      throw new Error('File system API not available in browser environment')
    } catch (error) {
      console.error('FileSystem readTextFile error:', error)
      throw error
    }
  }

  /**
   * Write text to file
   */
  static async writeFile(path: string, content: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await writeFile(path, content)
        return
      }

      // Browser fallback - could implement IndexedDB storage
      throw new Error('File system API not available in browser environment')
    } catch (error) {
      console.error('FileSystem writeFile error:', error)
      throw error
    }
  }

  /**
   * Create directory
   */
  static async mkdir(path: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await mkdir(path, { recursive: true })
        return
      }

      throw new Error('File system API not available in browser environment')
    } catch (error) {
      console.error('FileSystem mkdir error:', error)
      throw error
    }
  }

  /**
   * Remove file or directory
   */
  static async remove(path: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await remove(path)
        return
      }

      throw new Error('File system API not available in browser environment')
    } catch (error) {
      console.error('FileSystem remove error:', error)
      throw error
    }
  }

  /**
   * Get file metadata
   */
  static async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // Tauri implementation would go here
        // For now, return basic info
        return {
          path,
          size: 0,
          modified: new Date(),
          isDirectory: path.endsWith('/'),
          isFile: !path.endsWith('/'),
        }
      }

      return null
    } catch (error) {
      console.error('FileSystem getMetadata error:', error)
      return null
    }
  }

  /**
   * Check if path is available for file operations
   */
  static async isAvailable(): Promise<boolean> {
    try {
      return typeof window !== 'undefined' && !!window.__TAURI__
    } catch {
      return false
    }
  }
}

// Re-export application management from api/applications.ts
export {
  getApplications,
  getFrontmostApplication,
  getRunningApplications,
  launchApplication,
} from '../api/applications.js'

export type { Application } from '../api/applications.js'

// Legacy exports for compatibility
export const FCClipboard = Clipboard
export const FCFileSystem = FileSystem
