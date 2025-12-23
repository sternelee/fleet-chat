import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { a2uiPluginGenerator, type GeneratedPlugin } from "../../services/a2ui-plugin-generator";

@customElement("plugin-generator-view")
export class PluginGeneratorView extends LitElement {
  @state()
  accessor description = "";

  @state()
  accessor pluginName = "";

  @state()
  accessor generating = false;

  @state()
  accessor generatedPlugin: GeneratedPlugin | null = null;

  @state()
  accessor error = "";

  static styles = css\`
    :host {
      display: block;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 24px;
      font-size: 14px;
    }

    .form-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--text-primary);
      font-size: 14px;
    }

    input,
    textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
    }

    button.primary {
      background: #007bff;
      color: white;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #ccc;
      border-top-color: #007bff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  \`;

  async handleGenerate() {
    if (!this.description.trim()) {
      this.error = "Please enter a plugin description";
      return;
    }

    this.generating = true;
    this.error = "";
    this.generatedPlugin = null;

    try {
      const plugin = await a2uiPluginGenerator.quickGenerate(
        this.description,
        this.pluginName || undefined
      );

      this.generatedPlugin = plugin;
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to generate plugin";
    } finally {
      this.generating = false;
    }
  }

  async handleDownload() {
    if (!this.generatedPlugin) return;
    await a2uiPluginGenerator.savePluginToFile(this.generatedPlugin, "./");
  }

  render() {
    return html\`
      <h1>🤖 A2UI Plugin Generator</h1>
      <div class="subtitle">
        Generate Fleet Chat plugins using AI
      </div>

      <div class="form-section">
        <div class="form-group">
          <label for="plugin-name">Plugin Name (optional)</label>
          <input
            id="plugin-name"
            type="text"
            placeholder="my-awesome-plugin"
            .value=\${this.pluginName}
            @input=\${(e: InputEvent) => {
              this.pluginName = (e.target as HTMLInputElement).value;
            }}
          />
        </div>

        <div class="form-group">
          <label for="description">Plugin Description *</label>
          <textarea
            id="description"
            placeholder="Example: Create a plugin that shows a list of my favorite websites."
            .value=\${this.description}
            @input=\${(e: InputEvent) => {
              this.description = (e.target as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </div>

        <button
          class="primary"
          @click=\${this.handleGenerate}
          ?disabled=\${this.generating || !this.description.trim()}
        >
          \${this.generating ? "Generating..." : "Generate Plugin"}
        </button>
      </div>

      \${this.generatedPlugin
        ? html\`
            <div class="result">
              <h2>✅ Plugin Generated!</h2>
              <p>\${this.generatedPlugin.manifest.name}</p>
              <button class="primary" @click=\${this.handleDownload}>
                Download Files
              </button>
            </div>
          \`
        : null}
    \`;
  }
}
