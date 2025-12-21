/**
 * File System API with Tauri integration
 * Provides Raycast-compatible file system operations using Tauri plugins
 */

import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  readDir,
  remove,
  rename,
  copyFile,
} from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";
import { basename, dirname, extname, join } from "@tauri-apps/api/path";

/**
 * File System operations
 */
export namespace FileSystem {
  export type FileOptions = {
    encoding?: string;
  };

  export type DirectoryOptions = {
    recursive?: boolean;
  };

  /**
   * Read file contents as text
   */
  export async function readText(filePath: string, options: FileOptions = {}): Promise<string> {
    try {
      return await readTextFile(filePath);
    } catch (error) {
      console.error("Failed to read file:", error);
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Write text to file
   */
  export async function writeText(
    filePath: string,
    content: string,
    options: FileOptions = {},
  ): Promise<void> {
    try {
      // Ensure directory exists
      const dir = await dirname(filePath);
      await mkdir(dir, { recursive: true });

      await writeTextFile(filePath, content);
    } catch (error) {
      console.error("Failed to write file:", error);
      throw new Error(`Failed to write file: ${filePath}`);
    }
  }

  /**
   * Check if file or directory exists
   */
  export async function exists(path: string): Promise<boolean> {
    try {
      return await exists(path);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create directory
   */
  export async function createDirectory(
    path: string,
    options: DirectoryOptions = {},
  ): Promise<void> {
    try {
      await mkdir(path, { recursive: options.recursive ?? true });
    } catch (error) {
      console.error("Failed to create directory:", error);
      throw new Error(`Failed to create directory: ${path}`);
    }
  }

  /**
   * List directory contents
   */
  export async function readDirectory(
    path: string,
  ): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
    try {
      const entries = await readDir(path);
      return entries.map((entry) => ({
        name: entry.name,
        path: (entry as any).path || entry.name,
        isDirectory: (entry as any).isDirectory || false,
      }));
    } catch (error) {
      console.error("Failed to read directory:", error);
      throw new Error(`Failed to read directory: ${path}`);
    }
  }

  /**
   * Remove file or directory
   */
  export async function remove(path: string): Promise<void> {
    try {
      const { remove } = await import('@tauri-apps/plugin-fs');
      await remove(path, { recursive: true });
    } catch (error) {
      console.error("Failed to remove:", error);
      throw new Error(`Failed to remove: ${path}`);
    }
  }

  /**
   * Copy file
   */
  export async function copy(source: string, destination: string): Promise<void> {
    try {
      // Ensure destination directory exists
      const destDir = await dirname(destination);
      await mkdir(destDir, { recursive: true });

      await copyFile(source, destination);
    } catch (error) {
      console.error("Failed to copy file:", error);
      throw new Error(`Failed to copy from ${source} to ${destination}`);
    }
  }

  /**
   * Move/rename file or directory
   */
  export async function move(source: string, destination: string): Promise<void> {
    try {
      // Ensure destination directory exists
      const destDir = await dirname(destination);
      await mkdir(destDir, { recursive: true });

      await rename(source, destination);
    } catch (error) {
      console.error("Failed to move file:", error);
      throw new Error(`Failed to move from ${source} to ${destination}`);
    }
  }

  /**
   * Get file basename
   */
  export async function getBasename(path: string): Promise<string> {
    return await basename(path);
  }

  /**
   * Get file directory name
   */
  export async function getDirname(path: string): Promise<string> {
    return await dirname(path);
  }

  /**
   * Get file extension
   */
  export async function getExtension(path: string): Promise<string> {
    return await extname(path);
  }

  /**
   * Join path components
   */
  async function joinPath(...paths: string[]): Promise<string> {
    let result = paths[0];
    for (let i = 1; i < paths.length; i++) {
      result = await join(result, paths[i]);
    }
    return result;
  }

  /**
   * Open file with default application
   */
  export async function openFile(filePath: string): Promise<void> {
    try {
      await open(filePath);
    } catch (error) {
      console.error("Failed to open file:", error);
      throw new Error(`Failed to open file: ${filePath}`);
    }
  }

  /**
   * Open directory in file manager
   */
  export async function openDirectory(dirPath: string): Promise<void> {
    try {
      await open(dirPath);
    } catch (error) {
      console.error("Failed to open directory:", error);
      throw new Error(`Failed to open directory: ${dirPath}`);
    }
  }

  /**
   * Get file stats
   */
  export async function getStats(path: string): Promise<{
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    modified: Date;
    created: Date;
  }> {
    try {
      const stat = await exists(path);
      // This would need additional implementation with Tauri's metadata API
      // For now, return basic info
      return {
        size: 0,
        isFile: false,
        isDirectory: false,
        modified: new Date(),
        created: new Date(),
      };
    } catch (error) {
      console.error("Failed to get file stats:", error);
      throw new Error(`Failed to get stats for: ${path}`);
    }
  }
}

