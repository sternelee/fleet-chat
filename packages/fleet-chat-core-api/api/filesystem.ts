/**
 * Filesystem API
 *
 * Tauri-native filesystem operations using @tauri-apps/plugin-fs
 */

import {
  readTextFile,
  writeTextFile,
  readBinaryFile,
  writeBinaryFile,
  exists,
  mkdir,
  readDir,
  remove,
  rename,
  copyFile,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  isFile: boolean;
  size?: number;
  modified?: Date;
}

export interface ReadDirOptions {
  dir?: BaseDirectory;
  recursive?: boolean;
}

/**
 * Filesystem API class wrapping Tauri filesystem plugin
 */
export class FileSystem {
  /**
   * Read text file content
   */
  static async readText(path: string, options?: { dir?: BaseDirectory }): Promise<string> {
    return readTextFile(path, options);
  }

  /**
   * Write text to file
   */
  static async writeText(
    path: string,
    contents: string,
    options?: { dir?: BaseDirectory },
  ): Promise<void> {
    return writeTextFile(path, contents, options);
  }

  /**
   * Read binary file content
   */
  static async readBinary(
    path: string,
    options?: { dir?: BaseDirectory },
  ): Promise<Uint8Array> {
    return readBinaryFile(path, options);
  }

  /**
   * Write binary data to file
   */
  static async writeBinary(
    path: string,
    contents: Uint8Array,
    options?: { dir?: BaseDirectory },
  ): Promise<void> {
    return writeBinaryFile(path, contents, options);
  }

  /**
   * Check if path exists
   */
  static async exists(path: string, options?: { dir?: BaseDirectory }): Promise<boolean> {
    try {
      return await exists(path, options);
    } catch {
      return false;
    }
  }

  /**
   * Create directory
   */
  static async mkdir(
    path: string,
    options?: { dir?: BaseDirectory; recursive?: boolean },
  ): Promise<void> {
    return mkdir(path, { dir: options?.dir, recursive: options?.recursive ?? false });
  }

  /**
   * Read directory entries
   */
  static async readDir(
    path: string,
    options?: ReadDirOptions,
  ): Promise<FileEntry[]> {
    const entries = await readDir(path, { dir: options?.dir });

    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: entry.isDirectory ?? false,
      isFile: !entry.isDirectory,
    }));
  }

  /**
   * Remove file or directory
   */
  static async remove(
    path: string,
    options?: { dir?: BaseDirectory; recursive?: boolean },
  ): Promise<void> {
    return remove(path, { dir: options?.dir, recursive: options?.recursive });
  }

  /**
   * Rename/move file or directory
   */
  static async rename(
    oldPath: string,
    newPath: string,
    options?: { dir?: BaseDirectory },
  ): Promise<void> {
    return rename(oldPath, newPath, options);
  }

  /**
   * Copy file
   */
  static async copy(
    source: string,
    destination: string,
    options?: { dir?: BaseDirectory },
  ): Promise<void> {
    return copyFile(source, destination, options);
  }

  /**
   * Get home directory
   */
  static async homeDir(): Promise<string> {
    return BaseDirectory.Home.toString();
  }

  /**
   * Get app data directory
   */
  static async appDataDir(): Promise<string> {
    return BaseDirectory.AppData.toString();
  }

  /**
   * Get desktop directory
   */
  static async desktopDir(): Promise<string> {
    return BaseDirectory.Desktop.toString();
  }

  /**
   * Get documents directory
   */
  static async documentsDir(): Promise<string> {
    return BaseDirectory.Document.toString();
  }

  /**
   * Get downloads directory
   */
  static async downloadsDir(): Promise<string> {
    return BaseDirectory.Download.toString();
  }
}
