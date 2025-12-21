/**
 * FCFileSystem - Fleet Chat File System Component
 * Provides file system functionality for plugins
 */

export interface FileSystemOptions {
  path: string;
  content?: string;
  encoding?: string;
}

export interface FileSystemResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  size?: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

export class FCFileSystem {
  /**
   * Read a file's content
   */
  static async readFile(path: string, encoding: string = 'utf8'): Promise<string> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const content = await readFile(path);
        return new TextDecoder().decode(content);
      }

      // Fallback to fetch for web environment (limited)
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('FileSystem readFile error:', error);
      throw error;
    }
  }

  /**
   * Write content to a file
   */
  static async writeFile(path: string, content: string, encoding: string = 'utf8'): Promise<void> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const encoder = new TextEncoder();
        await writeFile(path, encoder.encode(content));
        return;
      }

      throw new Error('File writing not available in web environment');
    } catch (error) {
      console.error('FileSystem writeFile error:', error);
      throw error;
    }
  }

  /**
   * Check if a file or directory exists
   */
  static async exists(path: string): Promise<boolean> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { exists } = await import('@tauri-apps/plugin-fs');
        return await exists(path);
      }

      // Fallback: try to fetch the path
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List contents of a directory
   */
  static async readDir(path: string): Promise<DirectoryEntry[]> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { readDir } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(path);
        
        return entries.map(entry => ({
          name: entry.name,
          path: entry.path,
          type: entry.children ? 'directory' : 'file',
          size: entry.metadata?.size,
          modified: entry.metadata?.lastModified ? new Date(entry.metadata.lastModified) : undefined
        }));
      }

      throw new Error('Directory listing not available in web environment');
    } catch (error) {
      console.error('FileSystem readDir error:', error);
      throw error;
    }
  }

  /**
   * Create a directory
   */
  static async createDir(path: string): Promise<void> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { createDir } = await import('@tauri-apps/plugin-fs');
        await createDir(path);
        return;
      }

      throw new Error('Directory creation not available in web environment');
    } catch (error) {
      console.error('FileSystem createDir error:', error);
      throw error;
    }
  }

  /**
   * Remove a file or directory
   */
  static async remove(path: string): Promise<void> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(path);
        return;
      }

      throw new Error('File removal not available in web environment');
    } catch (error) {
      console.error('FileSystem remove error:', error);
      throw error;
    }
  }

  /**
   * Copy a file or directory
   */
  static async copy(source: string, destination: string): Promise<void> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { copy } = await import('@tauri-apps/plugin-fs');
        await copy(source, destination);
        return;
      }

      throw new Error('File copying not available in web environment');
    } catch (error) {
      console.error('FileSystem copy error:', error);
      throw error;
    }
  }

  /**
   * Move a file or directory
   */
  static async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { rename } = await import('@tauri-apps/plugin-fs');
        await rename(oldPath, newPath);
        return;
      }

      throw new Error('File moving not available in web environment');
    } catch (error) {
      console.error('FileSystem rename error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getMetadata(path: string): Promise<FileInfo> {
    try {
      // Try Tauri file system API first if available
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { metadata } = await import('@tauri-apps/plugin-fs');
        const meta = await metadata(path);
        
        return {
          path,
          name: path.split('/').pop() || path,
          size: meta.size,
          isFile: meta.isFile,
          isDirectory: meta.isDirectory,
          createdAt: meta.createdAt ? new Date(meta.createdAt) : undefined,
          modifiedAt: meta.lastModified ? new Date(meta.lastModified) : undefined
        };
      }

      throw new Error('File metadata not available in web environment');
    } catch (error) {
      console.error('FileSystem getMetadata error:', error);
      throw error;
    }
  }

  /**
   * Join path segments
   */
  static joinPath(...segments: string[]): string {
    return segments
      .map(segment => segment.replace(/^[\/\\]+|[\/\\]+$/g, ''))
      .filter(Boolean)
      .join('/');
  }

  /**
   * Get the directory name of a path
   */
  static getDirName(path: string): string {
    return path.split(/[\/\\]/).slice(0, -1).join('/');
  }

  /**
   * Get the base name of a path
   */
  static getBaseName(path: string): string {
    return path.split(/[\/\\]/).pop() || path;
  }

  /**
   * Get the file extension
   */
  static getExtension(path: string): string {
    const baseName = this.getBaseName(path);
    const lastDot = baseName.lastIndexOf('.');
    return lastDot > 0 ? baseName.substring(lastDot + 1) : '';
  }
}