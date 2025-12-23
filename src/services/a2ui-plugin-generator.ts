/**
 * A2UI Plugin Generator Client
 *
 * TypeScript client for generating Fleet Chat plugins using the A2UI backend
 */

export interface CommandSpec {
  name: string;
  title: string;
  description: string;
  mode: "view" | "no-view";
}

export interface PluginGenerationRequest {
  session_id: string;
  description: string;
  plugin_name?: string;
  commands?: CommandSpec[];
}

export interface PluginCommand {
  name: string;
  title: string;
  description: string;
  mode: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  icon: string;
  commands: PluginCommand[];
}

export interface GeneratedPlugin {
  manifest: PluginManifest;
  source_code: string;
  a2ui_components: any[];
}

export interface PluginPreview {
  manifest: PluginManifest;
  source_code: string;
  has_a2ui_components: boolean;
  component_count: number;
}

export class A2UIPluginGeneratorClient {
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a complete Fleet Chat plugin using A2UI
   */
  async generatePlugin(
    request: PluginGenerationRequest
  ): Promise<GeneratedPlugin> {
    const response = await fetch(`${this.baseUrl}/a2ui/plugin/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Plugin generation failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Generate a plugin preview (manifest and source only, no A2UI components)
   */
  async generatePluginPreview(
    request: PluginGenerationRequest
  ): Promise<PluginPreview> {
    const response = await fetch(
      `${this.baseUrl}/a2ui/plugin/generate/preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Plugin preview generation failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Save the generated plugin to a file
   */
  async savePluginToFile(
    plugin: GeneratedPlugin,
    outputDir: string
  ): Promise<void> {
    // Create package.json
    const packageJson = {
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      icon: plugin.manifest.icon,
      commands: plugin.manifest.commands,
    };

    // In a real implementation, you would use Tauri's fs plugin to write files
    // For now, we'll use the browser's download functionality
    this.downloadAsFile(
      `${plugin.manifest.name}-package.json`,
      JSON.stringify(packageJson, null, 2)
    );

    this.downloadAsFile(
      `${plugin.manifest.name}-index.ts`,
      plugin.source_code
    );

    if (plugin.a2ui_components.length > 0) {
      this.downloadAsFile(
        `${plugin.manifest.name}-a2ui-components.json`,
        JSON.stringify(plugin.a2ui_components, null, 2)
      );
    }
  }

  /**
   * Download content as a file
   */
  private downloadAsFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Create a plugin package (.fcp file) from generated content
   */
  async createPluginPackage(plugin: GeneratedPlugin): Promise<Blob> {
    // In a real implementation, this would create a .fcp file (ZIP format)
    // containing package.json and src/index.ts
    // For now, we'll create a simple text representation

    const packageContent = `
=== package.json ===
${JSON.stringify(
  {
    name: plugin.manifest.name,
    version: plugin.manifest.version,
    description: plugin.manifest.description,
    author: plugin.manifest.author,
    icon: plugin.manifest.icon,
    commands: plugin.manifest.commands,
  },
  null,
  2
)}

=== src/index.ts ===
${plugin.source_code}
`;

    return new Blob([packageContent], { type: "text/plain" });
  }

  /**
   * Quick plugin generation from a simple description
   */
  async quickGenerate(
    description: string,
    pluginName?: string
  ): Promise<GeneratedPlugin> {
    const sessionId = `plugin-gen-${Date.now()}`;

    const request: PluginGenerationRequest = {
      session_id: sessionId,
      description,
      plugin_name: pluginName,
    };

    return this.generatePlugin(request);
  }

  /**
   * Generate plugin with multiple commands
   */
  async generateMultiCommandPlugin(
    description: string,
    pluginName: string,
    commands: CommandSpec[]
  ): Promise<GeneratedPlugin> {
    const sessionId = `plugin-gen-${Date.now()}`;

    const request: PluginGenerationRequest = {
      session_id: sessionId,
      description,
      plugin_name: pluginName,
      commands,
    };

    return this.generatePlugin(request);
  }
}

// Export a singleton instance for convenience
export const a2uiPluginGenerator = new A2UIPluginGeneratorClient();
