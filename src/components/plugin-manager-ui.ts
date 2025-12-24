/**
 * Plugin Manager UI Component
 *
 * Provides a user interface for managing Fleet Chat plugins
 */

import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { PluginLoader } from '../plugins/plugin-loader'
import { PluginManager } from '../plugins/plugin-manager'
import type { PluginManifest } from '../plugins/plugin-system'
import './drop-zone.js'

@customElement('plugin-manager-ui')
export class PluginManagerUI extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--surface-color);
      color: var(--text-color);
      font-family: var(--font-family);
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 16px;
      gap: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: var(--primary-color);
      color: white;
    }

    .btn:hover {
      background-color: var(--primary-hover-color);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background-color: var(--secondary-color);
    }

    .btn-secondary:hover {
      background-color: var(--secondary-hover-color);
    }

    .search-bar {
      position: relative;
      margin-bottom: 16px;
    }

    .search-bar input {
      width: 100%;
      padding: 8px 36px 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--input-bg-color);
      color: var(--text-color);
      font-size: 0.9rem;
    }

    .search-bar input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .search-bar .search-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.6;
    }

    .content-area {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }

    .drop-zone-section {
      flex-shrink: 0;
    }

    .drop-zone-title {
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--text-secondary-color);
    }

    .plugin-list {
      flex: 1;
      overflow-y: auto;
      border-radius: 8px;
      background-color: var(--panel-bg-color);
      min-height: 0;
    }

    .plugin-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
      transition: background-color 0.2s ease;
    }

    .plugin-item:hover {
      background-color: var(--hover-bg-color);
    }

    .plugin-item:last-child {
      border-bottom: none;
    }

    .plugin-icon {
      width: 40px;
      height: 40px;
      margin-right: 12px;
      border-radius: 8px;
      background-color: var(--placeholder-bg-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .plugin-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }

    .plugin-info {
      flex: 1;
    }

    .plugin-name {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }

    .plugin-description {
      font-size: 0.85rem;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    .plugin-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
      font-size: 0.8rem;
      color: var(--text-muted-color);
    }

    .plugin-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-loaded {
      background-color: var(--success-color-light);
      color: var(--success-color);
    }

    .status-error {
      background-color: var(--error-color-light);
      color: var(--error-color);
    }

    .plugin-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .plugin-item:hover .plugin-actions {
      opacity: 1;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background-color: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .icon-btn:hover {
      background-color: var(--hover-bg-color);
      color: var(--text-color);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-muted-color);
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .install-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .install-modal.hidden {
      display: none;
    }

    .modal-content {
      background-color: var(--surface-color);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background-color: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary-color);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .form-group input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--input-bg-color);
      color: var(--text-color);
      font-size: 0.9rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      background-color: var(--toast-bg-color);
      color: var(--toast-text-color);
      box-shadow: var(--shadow-md);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 2000;
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    .toast.success {
      background-color: var(--success-color);
      color: white;
    }

    .toast.error {
      background-color: var(--error-color);
      color: white;
    }

    .divider {
      height: 1px;
      background-color: var(--border-color);
      margin: 16px 0;
    }
  `

  @state()
  private plugins: Array<{
    manifest: PluginManifest
    status: string
    errors?: string[]
  }> = []

  @state()
  private searchTerm: string = ''

  @state()
  private showInstallModal: boolean = false

  @state()
  private installUrl: string = ''

  @state()
  private showToast: boolean = false
  @state()
  private toastMessage: string = ''
  @state()
  private toastType: 'success' | 'error' = 'success'

  private pluginManager?: PluginManager
  private pluginLoader?: PluginLoader

  async connectedCallback() {
    super.connectedCallback()
    await this.initializePluginManager()
    this.loadPlugins()
  }

  private async initializePluginManager() {
    // Initialize plugin manager and loader
    this.pluginManager = new PluginManager()
    this.pluginLoader = new PluginLoader(this.pluginManager)
    await this.pluginManager.initialize()
  }

  private async loadPlugins() {
    if (!this.pluginLoader) return

    try {
      const loadedPlugins = this.pluginLoader.getInstalledPlugins()
      this.plugins = loadedPlugins.map((p) => ({
        manifest: p.manifest,
        status: 'loaded',
        errors: undefined,
      }))
    } catch (error) {
      console.error('Failed to load plugins:', error)
      this.showToastMessage('Failed to load plugins', 'error')
    }
  }

  private filteredPlugins() {
    if (!this.searchTerm) return this.plugins

    const term = this.searchTerm.toLowerCase()
    return this.plugins.filter(
      (p) =>
        p.manifest.name.toLowerCase().includes(term) ||
        p.manifest.description.toLowerCase().includes(term) ||
        (p.manifest.author && p.manifest.author.toLowerCase().includes(term)),
    )
  }

  private showInstallDialog() {
    this.showInstallModal = true
    this.installUrl = ''
  }

  private hideInstallDialog() {
    this.showInstallModal = false
    this.installUrl = ''
  }

  private async installFromUrl() {
    if (!this.installUrl || !this.pluginLoader) return

    try {
      await this.pluginLoader.loadPlugin(this.installUrl)
      this.showToastMessage('Plugin installed successfully', 'success')
      this.hideInstallDialog()
      this.loadPlugins()
    } catch (error) {
      this.showToastMessage(
        `Failed to install plugin: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private async uninstallPlugin(pluginName: string) {
    if (!this.pluginLoader) return

    if (!confirm(`Are you sure you want to uninstall "${pluginName}"?`)) {
      return
    }

    try {
      await this.pluginLoader.uninstallPlugin(pluginName)
      this.showToastMessage('Plugin uninstalled successfully', 'success')
      this.loadPlugins()
    } catch (error) {
      this.showToastMessage(
        `Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private async refreshPlugins() {
    this.showToastMessage('Refreshing plugins...', 'success')
    await this.loadPlugins()
  }

  private showToastMessage(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message
    this.toastType = type
    this.showToast = true
    setTimeout(() => {
      this.showToast = false
    }, 3000)
  }

  private async handleFilesDrop(files: File[]) {
    if (!this.pluginLoader) return

    for (const file of files) {
      try {
        // For local files, we need to get the file path
        // In a Tauri app, we can use the Tauri API to get the file path
        if ((window as any).__TAURI__) {
          const filePath = (file as any).path || file.name
          await this.pluginLoader.loadPlugin(filePath)
          this.showToastMessage(`Installed ${file.name}`, 'success')
        } else {
          // For web environment, use object URL
          const url = URL.createObjectURL(file)
          await this.pluginLoader.loadPlugin(url)
          this.showToastMessage(`Installed ${file.name}`, 'success')
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        this.showToastMessage(
          `Failed to install ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
          'error',
        )
      }
    }

    this.loadPlugins()
  }

  private handleDropZoneMessage(e: CustomEvent) {
    const { text, type } = e.detail
    this.showToastMessage(text, type)
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <h1>Plugins</h1>
          <div class="actions">
            <button class="btn btn-secondary" @click=${this.refreshPlugins}>
              Refresh
            </button>
            <button class="btn" @click=${this.showInstallDialog}>
              Install Plugin
            </button>
          </div>
        </div>

        <div class="search-bar">
          <input
            type="text"
            placeholder="Search plugins..."
            .value=${this.searchTerm}
            @input=${(e: Event) => (this.searchTerm = (e.target as HTMLInputElement).value)}
          />
          <span class="search-icon">🔍</span>
        </div>

        <div class="content-area">
          <div class="drop-zone-section">
            <div class="drop-zone-title">Install New Plugin</div>
            <drop-zone
              @drop-zone-message=${this.handleDropZoneMessage}
            ></drop-zone>
          </div>

          <div class="divider"></div>

          <div class="plugin-list">
            ${
              this.filteredPlugins().length > 0
                ? this.filteredPlugins().map((plugin) => this.renderPlugin(plugin))
                : this.renderEmptyState()
            }
          </div>
        </div>
      </div>

      ${this.renderInstallModal()}
      ${this.renderToast()}
    `
  }

  private renderPlugin(plugin: any) {
    return html`
      <div class="plugin-item">
        <div class="plugin-icon">
          ${
            plugin.manifest.icon
              ? html`<img src="${plugin.manifest.icon}" alt="${plugin.manifest.name}" />`
              : html`📦`
          }
        </div>
        <div class="plugin-info">
          <div class="plugin-name">${plugin.manifest.name}</div>
          <div class="plugin-description">${plugin.manifest.description}</div>
          <div class="plugin-meta">
            <span>v${plugin.manifest.version}</span>
            <span>•</span>
            <span>${plugin.manifest.author}</span>
            <span>•</span>
            <span class="plugin-status status-${plugin.status}">${plugin.status}</span>
          </div>
        </div>
        <div class="plugin-actions">
          <button
            class="icon-btn"
            @click=${() => this.uninstallPlugin(plugin.manifest.name)}
            title="Uninstall plugin"
          >
            🗑️
          </button>
        </div>
      </div>
    `
  }

  private renderEmptyState() {
    return html`
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <p>No plugins installed</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
          Drag .fcp files to the drop zone above or click "Install Plugin"
        </p>
      </div>
    `
  }

  private renderInstallModal() {
    if (!this.showInstallModal) return ''

    return html`
      <div class="install-modal" @click=${this.hideInstallDialog}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>Install Plugin</h2>
            <button class="close-btn" @click=${this.hideInstallDialog}>✕</button>
          </div>

          <div class="form-group">
            <label>Plugin URL or Path</label>
            <input
              type="text"
              placeholder="https://example.com/plugin.fcp or /path/to/plugin.fcp"
              .value=${this.installUrl}
              @input=${(e: Event) => (this.installUrl = (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click=${this.hideInstallDialog}>
              Cancel
            </button>
            <button class="btn" @click=${this.installFromUrl}>
              Install
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderToast() {
    if (!this.showToast) return ''

    return html`
      <div class="toast ${this.toastType} show">
        ${this.toastMessage}
      </div>
    `
  }

  // Set up drop zone handler after first render
  firstUpdated() {
    const dropZone = this.shadowRoot?.querySelector('drop-zone') as any
    if (dropZone) {
      dropZone.setFilesDropHandler(this.handleFilesDrop.bind(this))
    }
  }

  updated() {
    const dropZone = this.shadowRoot?.querySelector('drop-zone') as any
    if (dropZone && !dropZone.onFilesDrop) {
      dropZone.setFilesDropHandler(this.handleFilesDrop.bind(this))
    }
  }
}
