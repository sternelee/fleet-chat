/**
 * Plugin Manifest Types and Loading
 */

import type { PluginManifestData, PluginCommandData, PreferenceData } from '../worker/types.js';

export type { PluginManifestData, PluginCommandData, PreferenceData };

export interface PluginArgumentData {
  name: string;
  type: 'text' | 'password' | 'dropdown';
  title?: string;
  description?: string;
  required?: boolean;
  data?: string[];
}

export interface PluginManifest {
  data: PluginManifestData;
  path: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Parse plugin manifest from JSON
 */
export function parseManifest(json: string): PluginManifest {
  const errors: string[] = [];
  let data: PluginManifestData;

  try {
    data = JSON.parse(json);
  } catch (error) {
    return {
      data: {} as PluginManifestData,
      path: '',
      isValid: false,
      errors: [`Invalid JSON: ${error}`],
    };
  }

  // Validate required fields
  if (!data.name) {
    errors.push('Missing required field: name');
  }
  if (!data.version) {
    errors.push('Missing required field: version');
  }
  if (!data.commands || !Array.isArray(data.commands)) {
    errors.push('Missing or invalid field: commands');
  }

  // Validate commands
  if (data.commands && Array.isArray(data.commands)) {
    for (let i = 0; i < data.commands.length; i++) {
      const command = data.commands[i];
      if (!command.name) {
        errors.push(`Command at index ${i} missing required field: name`);
      }
      if (!command.title) {
        errors.push(`Command at index ${i} missing required field: title`);
      }
      if (!command.mode || !['view', 'no-view'].includes(command.mode)) {
        errors.push(`Command at index ${i} has invalid mode: ${command.mode}`);
      }
    }
  }

  return {
    data,
    path: '',
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Load manifest from plugin package.json
 */
export async function loadManifest(pluginPath: string): Promise<PluginManifest> {
  const manifestPath = `${pluginPath}/package.json`;

  try {
    const response = await fetch(manifestPath);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }

    const json = await response.text();
    const manifest = parseManifest(json);
    manifest.path = pluginPath;

    return manifest;
  } catch (error) {
    return {
      data: {} as PluginManifestData,
      path: pluginPath,
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Get manifest from code string
 * Extracts JSDoc or special comment blocks for metadata
 */
export function extractManifestFromCode(code: string): Partial<PluginManifestData> {
  const manifest: Partial<PluginManifestData> = {
    commands: [],
  };

  // Extract @name, @version, @description from comments
  const nameMatch = code.match(/@name\s+(\w+)/);
  if (nameMatch) {
    manifest.name = nameMatch[1];
  }

  const versionMatch = code.match(/@version\s+([\d.]+)/);
  if (versionMatch) {
    manifest.version = versionMatch[1];
  }

  const descriptionMatch = code.match(/@description\s+(.+)/);
  if (descriptionMatch) {
    manifest.description = descriptionMatch[1];
  }

  const authorMatch = code.match(/@author\s+(.+)/);
  if (authorMatch) {
    manifest.author = authorMatch[1];
  }

  // Extract commands from export functions
  const commandMatches = code.matchAll(/export\s+(async\s+)?function\s+(\w+)/g);
  for (const match of commandMatches) {
    const commandName = match[2];
    if (commandName && manifest.commands) {
      manifest.commands.push({
        name: commandName,
        title: toTitleCase(commandName),
        mode: 'view',
      });
    }
  }

  // Also check for default export
  const defaultExportMatch = code.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)/);
  if (defaultExportMatch && manifest.commands) {
    const commandName = defaultExportMatch[1];
    manifest.commands.push({
      name: 'default',
      title: toTitleCase(commandName),
      mode: 'view',
    });
  }

  return manifest;
}

/**
 * Convert camelCase to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}
