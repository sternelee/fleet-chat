/**
 * Clipboard API with Tauri integration
 * Provides Raycast-compatible clipboard functionality using Tauri plugins
 */

import { invoke } from "@tauri-apps/api/core";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Clipboard content types and operations
 */
export namespace Clipboard {
  export type Content = { text: string } | { file: string } | { html: string; text?: string };

  export type ReadContent = {
    text: string;
    file?: string;
    html?: string;
  };

  export type CopyOptions = {
    concealed?: boolean;
    backspace?: boolean;
  };

  /**
   * Copy content to clipboard
   */
  export async function copy(
    content: string | number | Content,
    options: CopyOptions = {},
  ): Promise<void> {
    let textContent: string;

    if (typeof content !== "object") {
      textContent = `${content}`;
    } else if ("text" in content) {
      textContent = content.text || '';
    } else if ("html" in content) {
      textContent = content.html || '';
    } else if ("file" in content) {
      textContent = content.file || '';
    } else {
      throw new Error("Invalid clipboard content format");
    }

    try {
      await writeText(textContent);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      throw new Error("Clipboard operation failed");
    }
  }

  /**
   * Paste content to active window
   */
  export async function paste(content: string | number | Content): Promise<void> {
    await copy(content);
    // Trigger paste action via Tauri shell plugin
    await invoke("trigger_paste");
  }

  /**
   * Read current clipboard content
   */
  export async function read(): Promise<ReadContent> {
    try {
      const text = await readText();
      return {
        text,
        // Additional content types can be implemented as needed
      };
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      return { text: "" };
    }
  }

  /**
   * Read text from clipboard
   */
  export async function readText(): Promise<string> {
    try {
      return await readText();
    } catch (error) {
      console.error("Failed to read clipboard text:", error);
      return "";
    }
  }

  /**
   * Clear clipboard content
   */
  export async function clear(): Promise<void> {
    try {
      await writeText("");
    } catch (error) {
      console.error("Failed to clear clipboard:", error);
      throw new Error("Failed to clear clipboard");
    }
  }

  /**
   * Check if clipboard contains specific content type
   */
  export async function hasText(): Promise<boolean> {
    const content = await readText();
    return content.length > 0;
  }

  /**
   * Get clipboard history if available
   */
  export async function getHistory(): Promise<ReadContent[]> {
    // This would require additional Tauri plugin implementation
    // For now, return current content
    return [await read()];
  }
}
