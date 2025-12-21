import { invoke } from '@tauri-apps/api/core'
import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

interface Application {
  name: string
  path: string
  icon_path?: string
  icon_base64?: string
}

interface FileMatch {
  path: string
  line_number?: number
  line_content?: string
  match_type: string
}

interface SearchResult {
  applications: Application[]
  files: FileMatch[]
}

@customElement('view-search')
export class ViewSearch extends LitElement {
  @state() private query = ''
  @state() private results: SearchResult = { applications: [], files: [] }
  @state() private loading = false
  @state() private selectedIndex = 0
  @state() private searchMode: 'all' | 'apps' | 'files' = 'all'

  private searchDebounceTimer: number | null = null

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: var(--color-background);
      color: var(--color-foreground);
    }

    .search-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      width: 100%;
    }

    .search-header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-title {
      font-size: 32px;
      font-weight: 600;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      width: 20px;
      height: 20px;
      color: #9ca3af;
    }

    .search-input {
      width: 100%;
      padding: 16px 16px 16px 48px;
      font-size: 18px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      color: #111827;
      transition: all 0.2s ease;
      font-family: var(--font-sans);
    }

    .search-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .search-filters {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
      padding: 8px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      color: #6b7280;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      font-family: var(--font-sans);
    }

    .filter-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .filter-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 8px 0;
    }

    .result-item {
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .result-item:hover,
    .result-item.selected {
      background: #f9fafb;
      border-color: #667eea;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .result-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 18px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .result-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .result-content {
      flex: 1;
      min-width: 0;
    }

    .result-title {
      font-weight: 600;
      font-size: 16px;
      color: #111827;
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-path {
      font-size: 13px;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Monaco', 'Menlo', monospace;
    }

    .result-line {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
    }

    .result-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-app {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-file {
      background: #dcfce7;
      color: #166534;
    }

    .loading-state,
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 64px;
      opacity: 0.3;
    }

    .empty-text {
      font-size: 16px;
      font-weight: 500;
    }

    .keyboard-hint {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      text-align: center;
    }

    .kbd {
      display: inline-block;
      padding: 2px 6px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      margin: 0 2px;
    }
  `

  render() {
    return html`
      <div class="search-container">
        <div class="search-header">
          <h1 class="search-title">🔍 Search</h1>
          
          <div class="search-input-wrapper">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search applications and files..."
              .value=${this.query}
              @input=${this._handleInput}
              @keydown=${this._handleKeyDown}
              autofocus
            />
          </div>

          <div class="search-filters">
            <button
              class=${classMap({ 'filter-btn': true, active: this.searchMode === 'all' })}
              @click=${() => this._setSearchMode('all')}
            >
              All
            </button>
            <button
              class=${classMap({ 'filter-btn': true, active: this.searchMode === 'apps' })}
              @click=${() => this._setSearchMode('apps')}
            >
              Applications
            </button>
            <button
              class=${classMap({ 'filter-btn': true, active: this.searchMode === 'files' })}
              @click=${() => this._setSearchMode('files')}
            >
              Files
            </button>
          </div>
        </div>

        ${this._renderResults()}

        <div class="keyboard-hint">
          <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> to navigate •
          <kbd class="kbd">↵</kbd> to open •
          <kbd class="kbd">Esc</kbd> to clear
        </div>
      </div>
    `
  }

  private _renderResults() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <div class="empty-icon">⏳</div>
          <div class="empty-text">Searching...</div>
        </div>
      `
    }

    if (!this.query) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">Type to search for applications and files</div>
        </div>
      `
    }

    const hasResults =
      this.results.applications.length > 0 || this.results.files.length > 0

    if (!hasResults) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">😔</div>
          <div class="empty-text">No results found for "${this.query}"</div>
        </div>
      `
    }

    return html`
      <div class="results-container">
        ${this._renderApplications()} ${this._renderFiles()}
      </div>
    `
  }

  private _renderApplications() {
    if (this.searchMode === 'files' || this.results.applications.length === 0) {
      return null
    }

    return html`
      <div class="results-section">
        <h3 class="section-title">Applications</h3>
        ${this.results.applications.map((app, index) =>
          this._renderApplicationItem(app, index),
        )}
      </div>
    `
  }

  private _renderFiles() {
    if (this.searchMode === 'apps' || this.results.files.length === 0) {
      return null
    }

    return html`
      <div class="results-section">
        <h3 class="section-title">Files</h3>
        ${this.results.files.map((file, index) =>
          this._renderFileItem(file, this.results.applications.length + index),
        )}
      </div>
    `
  }

  private _renderApplicationItem(app: Application, index: number) {
    const isSelected = index === this.selectedIndex
    const iconContent = app.icon_base64
      ? html`<img src="${app.icon_base64}" alt="${app.name}" />`
      : html`${app.name.charAt(0).toUpperCase()}`
    
    return html`
      <div
        class=${classMap({ 'result-item': true, selected: isSelected })}
        @click=${() => this._openApplication(app)}
      >
        <div class="result-icon">${iconContent}</div>
        <div class="result-content">
          <div class="result-title">${app.name}</div>
          <div class="result-path">${app.path}</div>
        </div>
        <span class="result-badge badge-app">App</span>
      </div>
    `
  }

  private _renderFileItem(file: FileMatch, index: number) {
    const isSelected = index === this.selectedIndex
    return html`
      <div
        class=${classMap({ 'result-item': true, selected: isSelected })}
        @click=${() => this._openFile(file)}
      >
        <div class="result-icon">📄</div>
        <div class="result-content">
          <div class="result-title">${this._getFileName(file.path)}</div>
          <div class="result-path">${file.path}</div>
          ${file.line_content
            ? html`<div class="result-line">
                Line ${file.line_number}: ${file.line_content}
              </div>`
            : null}
        </div>
        <span class="result-badge badge-file">File</span>
      </div>
    `
  }

  private _getFileName(path: string): string {
    return path.split('/').pop() || path
  }

  private async _handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    this.query = target.value

    // Clear previous timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer)
    }

    // Debounce search
    this.searchDebounceTimer = window.setTimeout(() => {
      this._performSearch()
    }, 300)
  }

  private async _performSearch() {
    if (!this.query.trim()) {
      this.results = { applications: [], files: [] }
      this.selectedIndex = 0
      return
    }

    this.loading = true

    try {
      const includeFiles = this.searchMode === 'all' || this.searchMode === 'files'
      const result = await invoke<SearchResult>('unified_search', {
        query: this.query,
        searchPath: null,
        includeFiles,
      })

      // Filter results based on search mode
      if (this.searchMode === 'apps') {
        this.results = { applications: result.applications, files: [] }
      } else if (this.searchMode === 'files') {
        this.results = { applications: [], files: result.files }
      } else {
        this.results = result
      }

      this.selectedIndex = 0
    } catch (error) {
      console.error('Search error:', error)
      this.results = { applications: [], files: [] }
    } finally {
      this.loading = false
    }
  }

  private _setSearchMode(mode: 'all' | 'apps' | 'files') {
    this.searchMode = mode
    this._performSearch()
  }

  private _handleKeyDown(e: KeyboardEvent) {
    const totalResults = this.results.applications.length + this.results.files.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, totalResults - 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
        break
      case 'Enter':
        e.preventDefault()
        this._openSelected()
        break
      case 'Escape':
        e.preventDefault()
        this.query = ''
        this.results = { applications: [], files: [] }
        this.selectedIndex = 0
        break
    }
  }

  private _openSelected() {
    if (this.selectedIndex < this.results.applications.length) {
      const app = this.results.applications[this.selectedIndex]
      this._openApplication(app)
    } else {
      const fileIndex = this.selectedIndex - this.results.applications.length
      if (fileIndex < this.results.files.length) {
        const file = this.results.files[fileIndex]
        this._openFile(file)
      }
    }
  }

  private async _openApplication(app: Application) {
    try {
      // Use Tauri opener plugin to launch the application
      const { open } = await import('@tauri-apps/plugin-opener')
      await open(app.path)
      console.log('Opened application:', app.name)
    } catch (error) {
      console.error('Failed to open application:', error)
    }
  }

  private async _openFile(file: FileMatch) {
    try {
      // Use Tauri opener plugin to open the file with default application
      const { open } = await import('@tauri-apps/plugin-opener')
      await open(file.path)
      console.log('Opened file:', file.path)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-search': ViewSearch
  }
}
