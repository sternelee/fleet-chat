import { invoke } from "@tauri-apps/api/core";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";

interface Application {
  name: string;
  path: string;
  icon_path?: string;
  icon_base64?: string;
}

interface FileMatch {
  path: string;
  line_number?: number;
  line_content?: string;
  match_type: string;
}

interface SearchResult {
  applications: Application[];
  files: FileMatch[];
}

@customElement("view-search")
export class ViewSearch extends LitElement {
  @state() private query = "";
  @state() private results: SearchResult = { applications: [], files: [] };
  @state() private loading = false;
  @state() private selectedIndex = 0;
  @state() private searchMode: "all" | "apps" | "files" = "all";
  @state() private isVisible = false;
  @state() private recentSearches: string[] = [];

  private searchDebounceTimer: number | null = null;
  private animationTimeout: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._addGlobalKeyListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeGlobalKeyListeners();
  }

  private _addGlobalKeyListeners() {
    document.addEventListener("keydown", this._globalKeyHandler);
  }

  private _removeGlobalKeyListeners() {
    document.removeEventListener("keydown", this._globalKeyHandler);
  }

  private _globalKeyHandler = (e: KeyboardEvent) => {
    // Handle Cmd/Ctrl + K globally
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      this._toggleVisibility();
    }
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(20px);
      color: var(--color-foreground);
    }

    .search-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 700px;
      margin: 0 auto;
      padding: 20vh 24px;
      width: 100%;
    }

    .search-header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
      overflow: hidden;
    }

    .search-input-wrapper:focus-within {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow:
        0 0 0 1px rgba(102, 126, 234, 0.3),
        0 8px 32px rgba(0, 0, 0, 0.12);
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
      color: rgba(255, 255, 255, 0.6);
      z-index: 1;
    }

    .search-input {
      width: 100%;
      padding: 16px 16px 16px 48px;
      font-size: 16px;
      background: transparent;
      color: rgba(255, 255, 255, 0.9);
      border: none;
      outline: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 400;
    }

    .search-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .search-filters {
      display: flex;
      gap: 6px;
      padding: 0 4px;
    }

    .filter-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }

    .filter-btn.active {
      background: rgba(102, 126, 234, 0.8);
      color: white;
    }

    .results-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow-y: auto;
      max-height: 400px;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 0;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 16px 8px 16px;
      padding: 8px 0 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }

    .result-item {
      padding: 12px 16px;
      border: none;
      border-radius: 0;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      min-height: 52px;
    }

    .result-item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: transparent;
      transition: all 0.15s ease;
    }

    .result-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .result-item.selected {
      background: rgba(102, 126, 234, 0.15);
    }

    .result-item.selected::before {
      background: rgba(102, 126, 234, 0.8);
    }

    .result-item:first-of-type {
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .result-item:last-of-type {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .result-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
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
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .result-title {
      font-weight: 500;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0 0 2px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-path {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: "SF Mono", "Monaco", "Menlo", monospace;
    }

    .result-line {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 2px;
      font-family: "SF Mono", "Monaco", "Menlo", monospace;
    }

    .result-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
    }

    .badge-app {
      background: rgba(59, 130, 246, 0.2);
      color: rgba(147, 197, 253, 0.9);
    }

    .badge-file {
      background: rgba(34, 197, 94, 0.2);
      color: rgba(134, 239, 172, 0.9);
    }

    .loading-state,
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: rgba(255, 255, 255, 0.6);
      padding: 32px;
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      opacity: 0.4;
    }

    .empty-text {
      font-size: 14px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.7);
    }

    .keyboard-hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .kbd {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      font-family: "SF Mono", "Monaco", "Menlo", monospace;
      font-size: 10px;
      margin: 0 2px;
      color: rgba(255, 255, 255, 0.8);
    }

    /* Scrollbar styling */
    .results-container::-webkit-scrollbar {
      width: 6px;
    }

    .results-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .results-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .results-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Animation classes */
    .results-wrapper {
      animation: fadeIn 0.2s ease-out;
    }

    .fade-in {
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-down {
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .result-item {
      animation: slideIn 0.3s ease-out forwards;
      opacity: 0;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  render() {
    return html`
      <div class="search-container">
        <div class="search-header">
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
              placeholder="Search applications and files... (⌘K to toggle)"
              .value=${this.query}
              @input=${this._handleInput}
              @keydown=${this._handleKeyDown}
              @focus=${this._handleFocus}
              @blur=${this._handleBlur}
              autofocus
            />
          </div>

          <div class="search-filters">
            <button
              class=${classMap({ "filter-btn": true, active: this.searchMode === "all" })}
              @click=${() => this._setSearchMode("all")}
            >
              All
            </button>
            <button
              class=${classMap({ "filter-btn": true, active: this.searchMode === "apps" })}
              @click=${() => this._setSearchMode("apps")}
            >
              Apps
            </button>
            <button
              class=${classMap({ "filter-btn": true, active: this.searchMode === "files" })}
              @click=${() => this._setSearchMode("files")}
            >
              Files
            </button>
          </div>
        </div>

        <div class="results-wrapper">${this._renderResults()}</div>

        ${this._renderKeyboardHint()}
      </div>
    `;
  }

  private _renderResults() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <div class="empty-icon">⏳</div>
          <div class="empty-text">Searching...</div>
        </div>
      `;
    }

    if (!this.query && this.recentSearches.length === 0) {
      return html`
        <div class="results-container">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">Type to search for applications and files</div>
            <div class="keyboard-hint">Press <kbd class="kbd">⌘K</kbd> to toggle search</div>
          </div>
        </div>
      `;
    }

    if (!this.query && this.recentSearches.length > 0) {
      return html`
        <div class="results-container">
          <div class="results-section">
            <h3 class="section-title">Recent Searches</h3>
            ${repeat(
              this.recentSearches,
              (search) => search,
              (search, index) => html`
                <div
                  class="result-item"
                  @click=${() => this._selectRecentSearch(search)}
                  @mouseenter=${() => this._setSelectedIndex(index)}
                >
                  <div class="result-icon">🕐</div>
                  <div class="result-content">
                    <div class="result-title">${search}</div>
                  </div>
                </div>
              `,
            )}
          </div>
        </div>
      `;
    }

    const hasResults = this.results.applications.length > 0 || this.results.files.length > 0;

    if (!hasResults) {
      return html`
        <div class="results-container">
          <div class="empty-state">
            <div class="empty-icon">😔</div>
            <div class="empty-text">No results found for "${this.query}"</div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="results-container">${this._renderApplications()} ${this._renderFiles()}</div>
    `;
  }

  private _renderApplications() {
    if (this.searchMode === "files" || this.results.applications.length === 0) {
      return null;
    }

    return html`
      <div class="results-section">
        <h3 class="section-title">Applications</h3>
        ${this.results.applications.map((app, index) => this._renderApplicationItem(app, index))}
      </div>
    `;
  }

  private _renderFiles() {
    if (this.searchMode === "apps" || this.results.files.length === 0) {
      return null;
    }

    return html`
      <div class="results-section">
        <h3 class="section-title">Files</h3>
        ${this.results.files.map((file, index) =>
          this._renderFileItem(file, this.results.applications.length + index),
        )}
      </div>
    `;
  }

  private _renderApplicationItem(app: Application, index: number) {
    const isSelected = index === this.selectedIndex;
    const iconContent = app.icon_base64
      ? html`<img src="${app.icon_base64}" alt="${app.name}" />`
      : html`${app.name.charAt(0).toUpperCase()}`;

    return html`
      <div
        class=${classMap({ "result-item": true, selected: isSelected })}
        @click=${() => this._openApplication(app)}
      >
        <div class="result-icon">${iconContent}</div>
        <div class="result-content">
          <div class="result-title">${app.name}</div>
          <div class="result-path">${app.path}</div>
        </div>
        <span class="result-badge badge-app">App</span>
      </div>
    `;
  }

  private _renderFileItem(file: FileMatch, index: number) {
    const isSelected = index === this.selectedIndex;
    return html`
      <div
        class=${classMap({ "result-item": true, selected: isSelected })}
        @click=${() => this._openFile(file)}
      >
        <div class="result-icon">📄</div>
        <div class="result-content">
          <div class="result-title">${this._getFileName(file.path)}</div>
          <div class="result-path">${file.path}</div>
          ${file.line_content
            ? html`<div class="result-line">Line ${file.line_number}: ${file.line_content}</div>`
            : null}
        </div>
        <span class="result-badge badge-file">File</span>
      </div>
    `;
  }

  private _getFileName(path: string): string {
    return path.split("/").pop() || path;
  }

  private async _handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.query = target.value;

    // Clear previous timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Debounce search
    this.searchDebounceTimer = window.setTimeout(() => {
      this._performSearch();
    }, 300);
  }

  private async _performSearch() {
    if (!this.query.trim()) {
      this.results = { applications: [], files: [] };
      this.selectedIndex = 0;
      return;
    }

    this.loading = true;

    try {
      const includeFiles = this.searchMode === "all" || this.searchMode === "files";
      const result = await invoke<SearchResult>("unified_search", {
        query: this.query,
        searchPath: null,
        includeFiles,
      });

      // Filter results based on search mode
      if (this.searchMode === "apps") {
        this.results = { applications: result.applications, files: [] };
      } else if (this.searchMode === "files") {
        this.results = { applications: [], files: result.files };
      } else {
        this.results = result;
      }

      this.selectedIndex = 0;
    } catch (error) {
      console.error("Search error:", error);
      this.results = { applications: [], files: [] };
    } finally {
      this.loading = false;
    }
  }

  private _setSearchMode(mode: "all" | "apps" | "files") {
    this.searchMode = mode;
    this._performSearch();
  }

  private _handleKeyDown(e: KeyboardEvent) {
    const totalResults = this.results.applications.length + this.results.files.length;

    // Handle keyboard shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      this._toggleVisibility();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (totalResults > 0) {
          this.selectedIndex = Math.min(this.selectedIndex + 1, totalResults - 1);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (totalResults > 0) {
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (this.query && totalResults > 0) {
          this._openSelected();
        }
        break;
      case "Escape":
        e.preventDefault();
        this._handleEscape();
        break;
    }
  }

  private _openSelected() {
    if (this.selectedIndex < this.results.applications.length) {
      const app = this.results.applications[this.selectedIndex];
      this._openApplication(app);
    } else {
      const fileIndex = this.selectedIndex - this.results.applications.length;
      if (fileIndex < this.results.files.length) {
        const file = this.results.files[fileIndex];
        this._openFile(file);
      }
    }
  }

  private async _openFile(file: FileMatch) {
    try {
      // Use Tauri opener plugin to open the file with default application
      await openPath(file.path);
      console.log("Opened file:", file.path);
      this._addToRecentSearches(this.query);
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  }

  private async _openApplication(app: Application) {
    try {
      // Use Tauri opener plugin to launch the application
      await openPath(app.path);
      console.log("Opened application:", app.name);
      this._addToRecentSearches(this.query);
    } catch (error) {
      console.error("Failed to open application:", error);
    }
  }

  private _handleFocus() {
    this.isVisible = true;
  }

  private _handleBlur() {
    // Delay hiding to allow for clicks on results
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    this.animationTimeout = window.setTimeout(() => {
      this.isVisible = false;
    }, 200);
  }

  private _handleEscape() {
    if (this.query) {
      this.query = "";
      this.results = { applications: [], files: [] };
      this.selectedIndex = 0;
    } else {
      this.isVisible = false;
    }
  }

  private _toggleVisibility() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.query = "";
      this.results = { applications: [], files: [] };
      this.selectedIndex = 0;
      // Focus the input after a short delay
      setTimeout(() => {
        const input = this.shadowRoot?.querySelector(".search-input") as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }

  private _addToRecentSearches(query: string) {
    if (!query.trim()) return;

    // Remove if already exists
    this.recentSearches = this.recentSearches.filter((search) => search !== query);

    // Add to beginning
    this.recentSearches.unshift(query);

    // Keep only last 5 searches
    this.recentSearches = this.recentSearches.slice(0, 5);
  }

  private _selectRecentSearch(search: string) {
    this.query = search;
    this._performSearch();
  }

  private _setSelectedIndex(index: number) {
    this.selectedIndex = index;
  }

  private _formatPath(path: string): string {
    // Shorten path for better display
    if (path.startsWith("/Users/")) {
      return path.replace("/Users/", "~/");
    }
    return path;
  }

  private _renderKeyboardHint() {
    if (!this.query) {
      return html`
        <div class="keyboard-hint">
          <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> to navigate •
          <kbd class="kbd">↵</kbd> to open • <kbd class="kbd">Esc</kbd> to clear
        </div>
      `;
    }
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "view-search": ViewSearch;
  }
}
