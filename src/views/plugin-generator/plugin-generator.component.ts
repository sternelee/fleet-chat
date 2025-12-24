import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { invoke } from '@tauri-apps/api/core';

interface PluginGenerationRequest {
  description: string;
  name?: string;
  plugin_type?: string;
  requirements?: string[];
  include_sample_data?: boolean;
}

interface PluginGenerationResponse {
  manifest: {
    name: string;
    version: string;
    description: string;
    author: string;
    icon: string;
    commands: Array<{
      name: string;
      title: string;
      description: string;
      mode: string;
    }>;
  };
  source_code: string;
  plugin_id: string;
  package_name: string;
  explanation: string;
  warnings?: string[];
}

@customElement('plugin-generator-view')
export class PluginGeneratorView extends LitElement {
  @state() private description = '';
  @state() private pluginName = '';
  @state() private pluginType = 'list';
  @state() private requirements = '';
  @state() private includeSampleData = true;
  @state() private isGenerating = false;
  @state() private generatedPlugin: PluginGenerationResponse | null = null;
  @state() private error: string | null = null;

  render() {
    return html`
      <div class="plugin-generator-container">
        <div class="generator-header">
          <h1>🔌 A2UI Plugin Generator</h1>
          <p class="subtitle">
            Generate Fleet Chat plugins using AI-powered A2UI system
          </p>
        </div>

        <div class="generator-form">
          ${this._renderForm()}
        </div>

        ${this.error ? this._renderError() : ''}
        ${this.generatedPlugin ? this._renderResult() : ''}
      </div>
    `;
  }

  private _renderForm() {
    return html`
      <div class="form-section">
        <h2>Plugin Configuration</h2>

        <div class="form-group">
          <label for="description">
            Description <span class="required">*</span>
          </label>
          <textarea
            id="description"
            placeholder="Describe what your plugin should do (e.g., 'Display a list of GitHub repositories')"
            .value=${this.description}
            @input=${this._handleDescriptionChange}
            ?disabled=${this.isGenerating}
            rows="3"
          ></textarea>
          <small>Provide a clear description of your plugin's functionality</small>
        </div>

        <div class="form-group">
          <label for="plugin-name">Plugin Name</label>
          <input
            type="text"
            id="plugin-name"
            placeholder="my-awesome-plugin (auto-generated from description if empty)"
            .value=${this.pluginName}
            @input=${this._handleNameChange}
            ?disabled=${this.isGenerating}
          />
        </div>

        <div class="form-group">
          <label for="plugin-type">Plugin Type</label>
          <select
            id="plugin-type"
            .value=${this.pluginType}
            @change=${this._handleTypeChange}
            ?disabled=${this.isGenerating}
          >
            <option value="list">List - Display items in a list</option>
            <option value="grid">Grid - Display items in a grid</option>
            <option value="detail">Detail - Display detailed information</option>
            <option value="form">Form - Collect user input</option>
          </select>
        </div>

        <div class="form-group">
          <label for="requirements">Additional Requirements (optional)</label>
          <textarea
            id="requirements"
            placeholder="Enter each requirement on a new line"
            .value=${this.requirements}
            @input=${this._handleRequirementsChange}
            ?disabled=${this.isGenerating}
            rows="3"
          ></textarea>
          <small>Add specific features or requirements, one per line</small>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              .checked=${this.includeSampleData}
              @change=${this._handleSampleDataToggle}
              ?disabled=${this.isGenerating}
            />
            Include sample data
          </label>
        </div>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            @click=${this._generatePlugin}
            ?disabled=${this.isGenerating || !this.description}
          >
            ${this.isGenerating ? '⏳ Generating...' : '🚀 Generate Plugin'}
          </button>

          ${this.generatedPlugin
            ? html`
                <button
                  class="btn btn-secondary"
                  @click=${this._reset}
                  ?disabled=${this.isGenerating}
                >
                  🔄 New Plugin
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private _renderError() {
    return html`
      <div class="error-section">
        <div class="error-box">
          <h3>⚠️ Error</h3>
          <p>${this.error}</p>
          <button class="btn btn-secondary" @click=${() => (this.error = null)}>
            Dismiss
          </button>
        </div>
      </div>
    `;
  }

  private _renderResult() {
    if (!this.generatedPlugin) return '';

    return html`
      <div class="result-section">
        <h2>✅ Plugin Generated Successfully!</h2>

        <div class="info-box">
          <h3>${this.generatedPlugin.manifest.icon} ${this.generatedPlugin.manifest.name}</h3>
          <p>${this.generatedPlugin.explanation}</p>

          ${this.generatedPlugin.warnings && this.generatedPlugin.warnings.length > 0
            ? html`
                <div class="warnings">
                  <h4>⚠️ Warnings:</h4>
                  <ul>
                    ${this.generatedPlugin.warnings.map(
                      warning => html`<li>${warning}</li>`
                    )}
                  </ul>
                </div>
              `
            : ''}
        </div>

        <div class="manifest-section">
          <h3>📋 Plugin Manifest</h3>
          <pre><code>${JSON.stringify(this.generatedPlugin.manifest, null, 2)}</code></pre>
        </div>

        <div class="code-section">
          <h3>💻 Generated Code</h3>
          <div class="code-actions">
            <button class="btn btn-small" @click=${this._copyCode}>
              📋 Copy Code
            </button>
            <button class="btn btn-small" @click=${this._downloadPlugin}>
              💾 Download Plugin
            </button>
          </div>
          <pre><code>${this.generatedPlugin.source_code}</code></pre>
        </div>

        <div class="next-steps">
          <h3>📚 Next Steps</h3>
          <ol>
            <li>Review and customize the generated code</li>
            <li>Test the plugin in your development environment</li>
            <li>Package the plugin using the Fleet Chat CLI</li>
            <li>Install the plugin by dragging the .fcp file into Fleet Chat</li>
          </ol>
        </div>
      </div>
    `;
  }

  private _handleDescriptionChange(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  private _handleNameChange(e: Event) {
    this.pluginName = (e.target as HTMLInputElement).value;
  }

  private _handleTypeChange(e: Event) {
    this.pluginType = (e.target as HTMLSelectElement).value;
  }

  private _handleRequirementsChange(e: Event) {
    this.requirements = (e.target as HTMLTextAreaElement).value;
  }

  private _handleSampleDataToggle(e: Event) {
    this.includeSampleData = (e.target as HTMLInputElement).checked;
  }

  private async _generatePlugin() {
    if (!this.description) {
      this.error = 'Please provide a plugin description';
      return;
    }

    this.isGenerating = true;
    this.error = null;
    this.generatedPlugin = null;

    try {
      const requirementsList = this.requirements
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const request: PluginGenerationRequest = {
        description: this.description,
        name: this.pluginName || undefined,
        plugin_type: this.pluginType,
        requirements: requirementsList.length > 0 ? requirementsList : undefined,
        include_sample_data: this.includeSampleData,
      };

      // Call the backend API via HTTP (not Tauri command)
      const response = await fetch('http://localhost:3000/a2ui/generate-plugin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate plugin: ${response.statusText}`);
      }

      this.generatedPlugin = await response.json();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Plugin generation error:', err);
    } finally {
      this.isGenerating = false;
    }
  }

  private _reset() {
    this.description = '';
    this.pluginName = '';
    this.pluginType = 'list';
    this.requirements = '';
    this.includeSampleData = true;
    this.generatedPlugin = null;
    this.error = null;
  }

  private async _copyCode() {
    if (!this.generatedPlugin) return;

    try {
      await navigator.clipboard.writeText(this.generatedPlugin.source_code);
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy code:', err);
      alert('Failed to copy code to clipboard');
    }
  }

  private async _downloadPlugin() {
    if (!this.generatedPlugin) return;

    try {
      // Create a simple package with manifest and source
      const packageData = {
        manifest: this.generatedPlugin.manifest,
        source: this.generatedPlugin.source_code,
      };

      const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.generatedPlugin.manifest.name}-plugin.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert(
        'Plugin downloaded! Use the Fleet Chat CLI to package this into a .fcp file.'
      );
    } catch (err) {
      console.error('Failed to download plugin:', err);
      alert('Failed to download plugin');
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }

    .plugin-generator-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .generator-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .generator-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: var(--color-text-primary, #000);
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--color-text-secondary, #666);
    }

    .form-section {
      background: var(--color-background-secondary, #f5f5f5);
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .form-section h2 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: var(--color-text-primary, #000);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--color-text-primary, #000);
    }

    .required {
      color: var(--color-error, #ff0000);
    }

    .form-group input[type='text'],
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border, #ddd);
      border-radius: 4px;
      font-family: inherit;
      font-size: 1rem;
    }

    .form-group textarea {
      resize: vertical;
      font-family: inherit;
    }

    .form-group small {
      display: block;
      margin-top: 0.25rem;
      color: var(--color-text-secondary, #666);
      font-size: 0.875rem;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      margin-bottom: 0;
      font-weight: normal;
      cursor: pointer;
    }

    .checkbox-group input[type='checkbox'] {
      margin-right: 0.5rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--color-primary, #007bff);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover, #0056b3);
    }

    .btn-secondary {
      background: var(--color-secondary, #6c757d);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--color-secondary-hover, #5a6268);
    }

    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .error-section {
      margin-bottom: 2rem;
    }

    .error-box {
      background: var(--color-error-background, #fff5f5);
      border: 2px solid var(--color-error, #ff0000);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .error-box h3 {
      margin-top: 0;
      color: var(--color-error, #ff0000);
    }

    .result-section {
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .result-section h2 {
      color: var(--color-success, #28a745);
      margin-bottom: 1.5rem;
    }

    .info-box {
      background: var(--color-background-secondary, #f5f5f5);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .info-box h3 {
      margin-top: 0;
      margin-bottom: 1rem;
    }

    .warnings {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--color-warning-background, #fff3cd);
      border-left: 4px solid var(--color-warning, #ffc107);
      border-radius: 4px;
    }

    .warnings h4 {
      margin-top: 0;
      color: var(--color-warning, #ffc107);
    }

    .warnings ul {
      margin: 0.5rem 0 0 0;
      padding-left: 1.5rem;
    }

    .manifest-section,
    .code-section {
      margin-bottom: 2rem;
    }

    .manifest-section h3,
    .code-section h3 {
      margin-bottom: 1rem;
    }

    .code-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    pre {
      background: var(--color-code-background, #f5f5f5);
      border: 1px solid var(--color-border, #ddd);
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .next-steps {
      background: var(--color-info-background, #d1ecf1);
      border-left: 4px solid var(--color-info, #17a2b8);
      border-radius: 4px;
      padding: 1.5rem;
    }

    .next-steps h3 {
      margin-top: 0;
      color: var(--color-info, #17a2b8);
    }

    .next-steps ol {
      margin: 0.5rem 0 0 0;
      padding-left: 1.5rem;
    }

    .next-steps li {
      margin-bottom: 0.5rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'plugin-generator-view': PluginGeneratorView;
  }
}
