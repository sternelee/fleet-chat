/**
 * Command Metadata API for Fleet Chat Plugins
 * Provides Raycast-compatible command metadata functionality
 */

export interface CommandMetadata {
  subtitle?: string | null;
}

/**
 * Update the values of properties declared in the manifest of the current command.
 * Currently only `subtitle` is supported. Pass `null` to clear the custom subtitle.
 *
 * @param metadata - The metadata to update
 * @example
 * ```typescript
 * import { updateCommandMetadata } from "@raycast/api";
 *
 * // Update subtitle
 * await updateCommandMetadata({ subtitle: "Processing..." });
 *
 * // Clear subtitle
 * await updateCommandMetadata({ subtitle: null });
 * ```
 */
export async function updateCommandMetadata(metadata: CommandMetadata): Promise<void> {
  // Dispatch event to main thread to update command metadata
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("plugin:updateCommandMetadata", {
        detail: metadata,
      }),
    );
  }
}

/**
 * Get the current command metadata
 */
export async function getCommandMetadata(): Promise<CommandMetadata> {
  // In a real implementation, this would fetch current metadata
  // For now, return empty object
  return {};
}

