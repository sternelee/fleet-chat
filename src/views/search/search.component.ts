import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { executePluginCommand, pluginIntegration } from "../../plugins/plugin-integration";
import { getCurrentMention, parseInput, type Mention, type ParsedInput } from "../../utils/mention-parser";
import type { SuggestionDropdown } from "../../components/suggestion-dropdown";

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

interface PluginCommand {
  key: string;
  pluginId: string;
  command: {
    name: string;
    title: string;
    description?: string;
    mode: string;
    icon?: string;
    keywords?: string[];
  };
}

type CommandPrefix = ">" | "/" | "?" | "";

interface QuickAction {
  title: string;
  icon: string;
  shortcut: string;
  action: () => void;
}

@customElement("view-search")
export class ViewSearch extends LitElement {
  @state() private query = "";
  @state() private results: SearchResult = { applications: [], files: [] };
  @state() private loading = false;
  @state() private selectedIndex = 0;
  @state() private searchMode: "all" | "apps" | "files" | "plugins" = "apps";
  @state() private isVisible = true; // Always visible in launcher mode
  @state() private recentSearches: string[] = [];
  @state() private pluginCommands: PluginCommand[] = [];
  @state() private commandPrefix: CommandPrefix = "";
  @state() private showQuickActions = false;
  @state() private frecencyItems: Array<{ query: string; count: number; lastUsed: number }> = [];
  @state() private aiInsights = "";
  @state() private aiInsightsLoading = false;
  @state() private showAiInsights = false;
  @state() private availableAIProviders: string[] = [];
  @state() private aiChatResponse = "";
  @state() private aiChatLoading = false;
  @state() private showAiChatModal = false;
  @state() private aiChatProvider = "";
  
  // Mention/autocomplete state
  @state() private currentMention: Mention | null = null;
  @state() private mentionSuggestions: Array<{ id: string; name: string; path?: string; icon?: string; type: 'app' | 'file' }> = [];
  @state() private showMentionDropdown = false;
  @state() private parsedInput: ParsedInput | null = null;

  // Frontend application cache (instant search)
  private applicationCache: Application[] = [];

  // Icon cache for asynchronously loaded icons
  private iconCache: Map<string, string> = new Map();
  private iconLoading: Set<string> = new Set();

  private searchDebounceTimer: number | null = null;
  private animationTimeout: number | null = null;
  private prefetchCache: Map<string, SearchResult> = new Map();
  private aiInsightsDebounceTimer: number | null = null;
  private currentModal: HTMLElement | null = null;

  async connectedCallback() {
    super.connectedCallback();
    this._addGlobalKeyListeners();
    this._loadFrecencyData();

    // Load all applications for frontend caching
    this._loadApplicationCache();

    // Fetch available AI providers
    try {
      this.availableAIProviders = await invoke<string[]>("get_available_ai_providers");
      console.log("Available AI providers:", this.availableAIProviders);
    } catch (error) {
      console.error("Failed to fetch AI providers:", error);
      this.availableAIProviders = [];
    }

    // Initialize plugins
    try {
      await pluginIntegration.initialize();
      this.pluginCommands = pluginIntegration.getAvailableCommands();

      // Listen for plugin registration events to refresh commands
      const pluginManager = pluginIntegration.getPluginManager();
      pluginManager.on("pluginRegistered", () => {
        console.log("Plugin registered, refreshing commands...");
        this.pluginCommands = pluginIntegration.getAvailableCommands();
        this.requestUpdate();
      });

      pluginManager.on("pluginUnregistered", () => {
        console.log("Plugin unregistered, refreshing commands...");
        this.pluginCommands = pluginIntegration.getAvailableCommands();
        this.requestUpdate();
      });
    } catch (error) {
      console.error("Failed to initialize plugins:", error);
    }

    // Auto-focus input
    this._focusInput();
  }

  /**
   * Load all applications and cache them in memory
   * This enables instant search without backend calls
   */
  private async _loadApplicationCache() {
    try {
      const apps = await invoke<Application[]>("get_all_applications");
      this.applicationCache = apps;
      console.log(`[Search] Cached ${apps.length} applications for instant search`);
    } catch (error) {
      console.error("[Search] Failed to load application cache:", error);
      this.applicationCache = [];
    }
  }

  /**
   * Instant search applications from frontend cache
   */
  private _searchApplicationsFromCache(query: string): Application[] {
    const queryLower = query.toLowerCase();
    const filtered = this.applicationCache.filter((app) =>
      app.name.toLowerCase().includes(queryLower),
    );

    // Sort by relevance
    const results = filtered.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();

      if (aLower === queryLower) return -1;
      if (bLower === queryLower) return 1;
      if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
      if (!aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) return 1;
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, 10);
  }

  /**
   * Asynchronously load icon for an application
   * Uses a local cache and tracks loading state to avoid duplicate requests
   */
  private async _loadApplicationIcon(appPath: string): Promise<void> {
    // Check if already cached
    if (this.iconCache.has(appPath)) {
      return;
    }

    // Check if already loading
    if (this.iconLoading.has(appPath)) {
      return;
    }

    // Mark as loading
    this.iconLoading.add(appPath);

    try {
      const icon = await invoke<string | null>("get_application_icon", { appPath });
      if (icon) {
        this.iconCache.set(appPath, icon);
        // Trigger re-render to show the icon
        this.requestUpdate();
      }
    } catch (error) {
      console.error(`[Search] Failed to load icon for ${appPath}:`, error);
    } finally {
      this.iconLoading.delete(appPath);
    }
  }

  /**
   * Load icons for all visible applications in the search results
   * This is called after search results are displayed
   */
  private _loadIconsForResults(applications: Application[]): void {
    // Only load icons for the first few results (priority)
    const maxIconsToLoad = 10;
    const appsToLoad = applications.slice(0, maxIconsToLoad);

    for (const app of appsToLoad) {
      // Load icon asynchronously without awaiting
      this._loadApplicationIcon(app.path);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeGlobalKeyListeners();

    // Clean up timers
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (this.aiInsightsDebounceTimer) {
      clearTimeout(this.aiInsightsDebounceTimer);
    }
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }

    // Clean up modal if it exists
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.parentNode.removeChild(this.currentModal);
    }
  }

  private _addGlobalKeyListeners() {
    document.addEventListener("keydown", this._globalKeyHandler);
  }

  private _removeGlobalKeyListeners() {
    document.removeEventListener("keydown", this._globalKeyHandler);
  }

  private _globalKeyHandler = (e: KeyboardEvent) => {
    // Handle Cmd/Ctrl + K globally to toggle launcher
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      this._toggleVisibility();
      return;
    }

    // Handle Cmd + Enter for quick actions
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && this.isVisible) {
      e.preventDefault();
      this.showQuickActions = !this.showQuickActions;
      return;
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

    /* AI Insights Styles */
    .ai-insights-container {
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      overflow: hidden;
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ai-insights-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.15);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    .ai-insights-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
      color: rgba(196, 181, 253, 0.9);
    }

    .ai-icon {
      width: 18px;
      height: 18px;
      color: rgba(196, 181, 253, 0.9);
    }

    .ai-insights-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.7);
      width: 20px;
      height: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.15s ease;
    }

    .ai-insights-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
    }

    .ai-insights-content {
      padding: 16px;
      min-height: 60px;
    }

    .ai-insights-text {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);
    }

    .ai-insights-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(196, 181, 253, 0.7);
      font-size: 13px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(196, 181, 253, 0.3);
      border-top-color: rgba(196, 181, 253, 0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    .search-input-wrapper:focus-within {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow:
        0 0 0 1px rgba(102, 126, 234, 0.3),
        0 8px 32px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    }

    .command-prefix-badge {
      position: absolute;
      left: 52px;
      padding: 2px 6px;
      background: rgba(102, 126, 234, 0.2);
      color: rgba(102, 126, 234, 0.9);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      animation: fadeIn 0.15s ease-out;
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

    .badge-plugin {
      background: rgba(168, 85, 247, 0.2);
      color: rgba(196, 181, 253, 0.9);
    }

    .badge-ai {
      background: rgba(59, 130, 246, 0.2);
      color: rgba(147, 197, 253, 0.9);
    }

    .ai-suggestion {
      background: rgba(139, 92, 246, 0.05);
    }

    .ai-suggestion:hover {
      background: rgba(139, 92, 246, 0.1);
    }

    .ai-suggestion.selected {
      background: rgba(139, 92, 246, 0.2);
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
    .search-container {
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .results-wrapper {
      animation: fadeIn 0.15s ease-out;
    }

    .fade-in {
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-down {
      animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .result-item {
      animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Plugin Upload Styles */
    .plugin-upload-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .plugin-upload-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, rgba(74, 144, 226, 0.8), rgba(95, 99, 250, 0.8));
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .plugin-upload-btn:hover {
      background: linear-gradient(135deg, rgba(74, 144, 226, 0.9), rgba(95, 99, 250, 0.9));
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .upload-icon {
      width: 20px;
      height: 20px;
    }

    .plugin-upload-status {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 4px;
      text-align: center;
      max-width: 400px;
      opacity: 0;
      transition: opacity 0.3s ease;
      word-break: break-word;
      white-space: pre-line;
    }

    .plugin-upload-status:not(:empty) {
      opacity: 1;
    }

    .plugin-upload-status.loading {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .plugin-upload-status.success {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .plugin-upload-status.error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Quick Actions Panel */
    .quick-actions-panel {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 4px;
      animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateY(-50%) translateX(10px);
      }
      to {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
    }

    .quick-action-btn {
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .quick-action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .quick-action-shortcut {
      font-size: 9px;
      opacity: 0.7;
      font-family: "SF Mono", "Monaco", "Menlo", monospace;
    }

    /* Prefix hints */
    .prefix-hints {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
      padding: 0 4px;
    }

    .prefix-hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .prefix-hint-key {
      padding: 2px 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      font-family: "SF Mono", "Monaco", "Menlo", monospace;
      font-weight: 600;
    }

    /* AI Chat Modal Styles */
    .ai-chat-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    .ai-chat-modal-container {
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 24px;
      max-width: 700px;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
      border: 1px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .ai-chat-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .ai-chat-modal-title {
      font-size: 18px;
      font-weight: 600;
      color: rgba(196, 181, 253, 0.9);
    }

    .ai-chat-modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: white;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.15s ease;
    }

    .ai-chat-modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .ai-chat-modal-query {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    .ai-chat-modal-query strong {
      font-weight: 600;
    }

    .ai-chat-modal-content {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);
      min-height: 60px;
    }

    .ai-chat-response-text {
      margin: 0;
      white-space: pre-wrap;
    }

    .ai-chat-modal-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(196, 181, 253, 0.7);
      font-size: 13px;
      padding: 20px 0;
      justify-content: center;
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
            ${this.commandPrefix
              ? html` <span class="command-prefix-badge">${this._getPrefixLabel()}</span> `
              : null}
            <input
              type="text"
              class="search-input"
              placeholder="${this._getPlaceholder()}"
              .value=${this.query}
              @input=${this._handleInput}
              @keydown=${this._handleKeyDown}
              @focus=${this._handleFocus}
              @blur=${this._handleBlur}
              autofocus
            />
            ${this.showQuickActions && this._getTotalResults() > 0
              ? this._renderQuickActions()
              : null}
          </div>

          ${this._renderPrefixHints()}
        </div>

        ${this._renderAIInsights()}

        <div class="results-wrapper">${this._renderResults()}</div>

        ${this._renderPluginUploadButton()} ${this._renderKeyboardHint()}
        ${this._renderAIChatModal()}
        ${this._renderMentionDropdown()}
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
            <div class="empty-text">Type to search applications</div>
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

    const hasResults =
      this.results.applications.length > 0 ||
      this.results.files.length > 0 ||
      this._getFilteredPluginCommands().length > 0;

    if (!hasResults) {
      // Show AI chat suggestions if AI providers are available
      if (this.availableAIProviders.length > 0) {
        return html`
          <div class="results-container">
            <div class="results-section">
              <h3 class="section-title">Ask AI</h3>
              ${this.availableAIProviders.map((provider, index) =>
                this._renderAIChatSuggestion(provider, index),
              )}
            </div>
          </div>
        `;
      }

      // Fallback to standard no results message
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
      <div class="results-container">
        ${this._renderApplications()} ${this._renderFiles()} ${this._renderPluginCommands()}
      </div>
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

    // Try icon cache first (async loaded icons), then backend icon, then fallback
    const cachedIcon = this.iconCache.get(app.path);
    const iconContent =
      cachedIcon || app.icon_base64
        ? html`<img src="${cachedIcon || app.icon_base64}" alt="${app.name}" />`
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

  private _renderPluginCommands() {
    if (this.searchMode === "apps" || this.searchMode === "files") {
      return null;
    }

    const filteredCommands = this._getFilteredPluginCommands();
    if (filteredCommands.length === 0) {
      return null;
    }

    return html`
      <div class="results-section">
        <h3 class="section-title">Plugins</h3>
        ${filteredCommands.map((cmd, index) => this._renderPluginCommandItem(cmd, index))}
      </div>
    `;
  }

  private _renderPluginCommandItem(cmd: PluginCommand, index: number) {
    const baseIndex = this.results.applications.length + this.results.files.length;
    const isSelected = baseIndex + index === this.selectedIndex;

    return html`
      <div
        class=${classMap({ "result-item": true, selected: isSelected })}
        @click=${() => this._executePluginCommand(cmd)}
      >
        <div class="result-icon">${cmd.command.icon || "🔌"}</div>
        <div class="result-content">
          <div class="result-title">${cmd.command.title}</div>
          <div class="result-path">
            ${cmd.pluginId} • ${cmd.command.description || "Plugin command"}
          </div>
        </div>
        <span class="result-badge badge-plugin">Plugin</span>
      </div>
    `;
  }

  private _renderAIChatSuggestion(provider: string, index: number) {
    const isSelected = index === this.selectedIndex;
    const iconMap: Record<string, string> = {
      OpenAI: "🤖",
      Anthropic: "🧠",
      Gemini: "✨",
      DeepSeek: "🔮",
      OpenRouter: "🌐",
    };
    const icon = iconMap[provider] || "💬";

    return html`
      <div
        class=${classMap({ "result-item": true, selected: isSelected, "ai-suggestion": true })}
        @click=${() => this._askAIProvider(provider)}
      >
        <div class="result-icon">${icon}</div>
        <div class="result-content">
          <div class="result-title">Ask "${this.query}" with ${provider}</div>
          <div class="result-path">Start an AI conversation with ${provider}</div>
        </div>
        <span class="result-badge badge-ai">AI</span>
      </div>
    `;
  }

  private _getFilteredPluginCommands(): PluginCommand[] {
    if (!this.query.trim()) {
      return this.searchMode === "plugins" ? this.pluginCommands : [];
    }

    const query = this.query.toLowerCase();
    return this.pluginCommands.filter((cmd) => {
      const titleMatch = cmd.command.title.toLowerCase().includes(query);
      const descriptionMatch = cmd.command.description?.toLowerCase().includes(query) ?? false;
      const keywordsMatch =
        cmd.command.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) ?? false;
      const pluginIdMatch = cmd.pluginId.toLowerCase().includes(query);

      return titleMatch || descriptionMatch || keywordsMatch || pluginIdMatch;
    });
  }

  private async _executePluginCommand(cmd: PluginCommand) {
    try {
      this._addToRecentSearches(cmd.command.title);

      const result = await executePluginCommand(cmd.pluginId, cmd.command.name);

      if (result && result instanceof HTMLElement) {
        // If the plugin returned a view, show it
        this._showPluginView(result, cmd.command.title);
      }

      console.log(`Executed plugin command: ${cmd.pluginId}/${cmd.command.name}`);
    } catch (error) {
      console.error("Failed to execute plugin command:", error);

      // Show error toast
      window.dispatchEvent(
        new CustomEvent("plugin:toast", {
          detail: {
            title: "Plugin Error",
            message: `Failed to execute "${cmd.command.title}"`,
            style: "failure",
          },
        }),
      );
    }
  }

  private _showPluginView(view: HTMLElement, _title: string) {
    // Create a modal or container for the plugin view
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 24px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: white;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);

    container.appendChild(closeBtn);
    container.appendChild(view);
    modal.appendChild(container);

    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };

    document.body.appendChild(modal);
  }

  private _getFileName(path: string): string {
    return path.split("/").pop() || path;
  }

  private _getPlaceholder(): string {
    if (this.commandPrefix === ">") {
      return "Search plugins and commands...";
    } else if (this.commandPrefix === "/") {
      return "Search files...";
    } else if (this.commandPrefix === "?") {
      return "Search everything...";
    }
    return "Search or ask AI... (Use @app and #file to mention)";
  }

  private _getPrefixLabel(): string {
    switch (this.commandPrefix) {
      case ">":
        return "Plugins";
      case "/":
        return "Files";
      case "?":
        return "All";
      default:
        return "";
    }
  }

  private _getTotalResults(): number {
    return (
      this.results.applications.length +
      this.results.files.length +
      this._getFilteredPluginCommands().length
    );
  }

  private _renderQuickActions() {
    const actions = this._getQuickActionsForSelected();
    if (actions.length === 0) return null;

    return html`
      <div class="quick-actions-panel">
        ${actions.map(
          (action) => html`
            <button class="quick-action-btn" @click=${action.action} title="${action.title}">
              <span>${action.icon}</span>
              <span>${action.title}</span>
              <span class="quick-action-shortcut">${action.shortcut}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderAIInsights() {
    if (!this.showAiInsights || (!this.aiInsights && !this.aiInsightsLoading)) {
      return null;
    }

    return html`
      <div class="ai-insights-container" role="region" aria-label="AI Insights" aria-live="polite">
        <div class="ai-insights-header">
          <div class="ai-insights-title">
            <svg
              class="ai-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              ></path>
            </svg>
            <span>AI Insights</span>
          </div>
          <button
            class="ai-insights-close"
            @click=${this._toggleAIInsights}
            title="Close AI insights"
            aria-label="Close AI insights"
          >
            ✕
          </button>
        </div>
        <div class="ai-insights-content">
          ${this.aiInsightsLoading
            ? html`
                <div class="ai-insights-loading">
                  <div class="spinner"></div>
                  <span>Generating insights...</span>
                </div>
              `
            : html`<p class="ai-insights-text">${this.aiInsights}</p>`}
        </div>
      </div>
    `;
  }

  private _renderPrefixHints() {
    if (this.query || this._getTotalResults() > 0) return null;

    return html`
      <div class="prefix-hints">
        <div class="prefix-hint">
          <span class="prefix-hint-key">@</span>
          <span>Mention apps</span>
        </div>
        <div class="prefix-hint">
          <span class="prefix-hint-key">#</span>
          <span>Mention files</span>
        </div>
        <div class="prefix-hint">
          <span class="prefix-hint-key">></span>
          <span>Plugins</span>
        </div>
        <div class="prefix-hint">
          <span class="prefix-hint-key">/</span>
          <span>Files</span>
        </div>
        <div class="prefix-hint">
          <span class="prefix-hint-key">?</span>
          <span>Everything</span>
        </div>
      </div>
    `;
  }

  private async _handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.query = target.value;
    
    // Parse input for mentions
    this.parsedInput = parseInput(this.query);

    // Detect command prefix
    this._detectCommandPrefix();
    
    // Check for active mention being typed
    const cursorPos = target.selectionStart || 0;
    const activeMention = getCurrentMention(this.query, cursorPos);
    
    if (activeMention) {
      // User is typing a mention, show suggestions
      this.currentMention = activeMention;
      await this._fetchMentionSuggestions(activeMention);
    } else {
      // No active mention, hide dropdown
      this.currentMention = null;
      this.showMentionDropdown = false;
      this.mentionSuggestions = [];
    }

    // Clear previous timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Use shorter debounce for instant search feel (apps are now cached)
    // File search still needs some time, but 50ms is imperceptible to users
    this.searchDebounceTimer = window.setTimeout(() => {
      this._performSearch();
    }, 50); // Reduced from 200ms for instant feel with cached app search
  }

  private _detectCommandPrefix() {
    const firstChar = this.query.charAt(0);
    if (firstChar === ">" || firstChar === "/" || firstChar === "?") {
      this.commandPrefix = firstChar;
      // Auto-switch modes based on prefix
      if (firstChar === ">") {
        this.searchMode = "plugins";
      } else if (firstChar === "/") {
        this.searchMode = "files";
      } else if (firstChar === "?") {
        this.searchMode = "all";
      }
    } else {
      this.commandPrefix = "";
      // Default to apps mode when no prefix
      this.searchMode = "apps";
    }
  }

  private async _performSearch() {
    // Get actual query without prefix
    const actualQuery = this.commandPrefix ? this.query.slice(1).trim() : this.query.trim();

    if (!actualQuery) {
      this.results = { applications: [], files: [] };
      this.selectedIndex = 0;
      this.aiInsights = "";
      this.showAiInsights = false;
      return;
    }

    // Check prefetch cache first
    const cacheKey = `${this.searchMode}:${actualQuery}`;
    if (this.prefetchCache.has(cacheKey)) {
      this.results = this.prefetchCache.get(cacheKey)!;
      this.selectedIndex = 0;

      // Load icons asynchronously for cached results
      if (this.results.applications.length > 0) {
        this._loadIconsForResults(this.results.applications);
      }

      // Fetch AI insights if we have results
      if (this._hasResults()) {
        this._fetchAIInsights(actualQuery, this.results);
      }
      return;
    }

    this.loading = true;

    try {
      let applications: Application[] = [];
      let files: FileMatch[] = [];

      // Search mode determination
      const includeApps = this.searchMode === "all" || this.searchMode === "apps";
      const includeFiles = this.searchMode === "all" || this.searchMode === "files";

      // Use frontend cache for instant application search
      if (includeApps) {
        applications = this._searchApplicationsFromCache(actualQuery);
        // Sort by frecency if available
        applications = this._sortByFrecency(applications, actualQuery);
      }

      // Backend search for files (still needs backend)
      if (includeFiles) {
        const fileResult = await invoke<FileMatch[]>("search_files", {
          query: actualQuery,
          searchPath: null,
          searchContent: false,
        });
        files = fileResult;
      }

      // Combine results
      if (this.searchMode === "apps") {
        this.results = { applications, files: [] };
      } else if (this.searchMode === "files") {
        this.results = { applications: [], files };
      } else {
        this.results = { applications, files };
      }

      // Cache the result
      this.prefetchCache.set(cacheKey, this.results);

      this.selectedIndex = 0;

      // Load icons asynchronously for displayed applications
      if (applications.length > 0) {
        this._loadIconsForResults(applications);
      }

      // Fetch AI insights if we have results
      if (this._hasResults()) {
        this._fetchAIInsights(actualQuery, this.results);
      }
    } catch (error) {
      console.error("Search error:", error);
      this.results = { applications: [], files: [] };
      this.aiInsights = "";
      this.showAiInsights = false;
    } finally {
      this.loading = false;
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    const pluginResults = this._getFilteredPluginCommands();
    const hasResults =
      this.results.applications.length > 0 ||
      this.results.files.length > 0 ||
      pluginResults.length > 0;
    const totalResults = hasResults
      ? this.results.applications.length + this.results.files.length + pluginResults.length
      : this.availableAIProviders.length; // AI chat suggestions

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
    const hasResults =
      this.results.applications.length > 0 ||
      this.results.files.length > 0 ||
      this._getFilteredPluginCommands().length > 0;

    // If we have search results, handle them normally
    if (hasResults) {
      if (this.selectedIndex < this.results.applications.length) {
        const app = this.results.applications[this.selectedIndex];
        this._openApplication(app);
      } else {
        const remainingIndex = this.selectedIndex - this.results.applications.length;

        if (remainingIndex < this.results.files.length) {
          const file = this.results.files[remainingIndex];
          this._openFile(file);
        } else {
          const pluginIndex = remainingIndex - this.results.files.length;
          const pluginResults = this._getFilteredPluginCommands();
          if (pluginIndex < pluginResults.length) {
            const cmd = pluginResults[pluginIndex];
            this._executePluginCommand(cmd);
          }
        }
      }
    } else {
      // No search results, handle AI chat suggestions
      if (this.selectedIndex < this.availableAIProviders.length) {
        const provider = this.availableAIProviders[this.selectedIndex];
        this._askAIProvider(provider);
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

    // Update frecency score
    this._updateFrecency(query);

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

  private _renderPluginUploadButton() {
    return html`
      <div class="plugin-upload-section">
        <input
          type="file"
          id="plugin-file-input"
          accept=".fcp"
          multiple
          style="display: none;"
          @change=${this._handlePluginFileSelect}
        />
        <button
          class="plugin-upload-btn"
          @click=${() => this.shadowRoot?.getElementById("plugin-file-input")?.click()}
        >
          <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            ></path>
          </svg>
          📦 Upload Plugin (.fcp)
        </button>
        <div class="plugin-upload-status" id="upload-status"></div>
      </div>
    `;
  }

  private async _handlePluginFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    if (files.length === 0) {
      return;
    }

    // 过滤 .fcp 文件
    const fcpFiles = files.filter((file) => file.name.endsWith(".fcp"));

    if (fcpFiles.length === 0) {
      this._showUploadStatus("❌ 请选择 .fcp 插件文件", "error");
      return;
    }

    this._showUploadStatus(`📦 处理 ${fcpFiles.length} 个插件文件...`, "loading");

    try {
      // 尝试加载插件
      const pluginLoader = (window as any).pluginLoader;

      if (!pluginLoader) {
        console.warn("插件加载器未初始化，创建模拟加载...");
        this._simulatePluginLoading(fcpFiles);
        return;
      }

      for (const file of fcpFiles) {
        try {
          await pluginLoader.loadPluginFromFile(file);
          this._showUploadStatus(`✅ 成功加载插件: ${file.name}`, "success");

          // Debug: Refresh plugin commands and show count
          this.pluginCommands = pluginIntegration.getAvailableCommands();
          console.log(
            `Plugin commands after upload:`,
            this.pluginCommands.length,
            this.pluginCommands,
          );

          // Force UI update
          this.requestUpdate();
        } catch (error) {
          console.error("插件加载失败:", error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          this._showUploadStatus(`❌ 加载 ${file.name} 失败: ${errorMsg}`, "error");
        }
      }
    } catch (error) {
      console.error("插件处理失败:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._showUploadStatus(`❌ 插件处理失败: ${errorMsg}`, "error");
    }

    // 清空输入
    input.value = "";
  }

  private _simulatePluginLoading(files: File[]) {
    console.log(
      "🧪 模拟加载插件:",
      files.map((f) => f.name),
    );

    setTimeout(() => {
      this._showUploadStatus(
        `✅ 模拟加载完成: ${files.map((f) => f.name).join(", ")}\n` +
          `💡 实际插件加载需要完整的插件系统支持`,
        "success",
      );
    }, 1000);
  }

  private _showUploadStatus(message: string, type: "loading" | "success" | "error") {
    const statusEl = this.shadowRoot?.getElementById("upload-status");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `plugin-upload-status ${type}`;

    // 3秒后自动清空状态消息（除了加载状态）
    if (type !== "loading") {
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "plugin-upload-status";
      }, 3000);
    }
  }

  // ===== Frecency and Helper Methods =====

  private _loadFrecencyData() {
    try {
      const data = localStorage.getItem("fleet-chat-frecency");
      if (data) {
        this.frecencyItems = JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load frecency data:", error);
      this.frecencyItems = [];
    }
  }

  private _saveFrecencyData() {
    try {
      localStorage.setItem("fleet-chat-frecency", JSON.stringify(this.frecencyItems));
    } catch (error) {
      console.error("Failed to save frecency data:", error);
    }
  }

  private _updateFrecency(query: string) {
    const now = Date.now();
    const existing = this.frecencyItems.find((item) => item.query === query);

    if (existing) {
      existing.count += 1;
      existing.lastUsed = now;
    } else {
      this.frecencyItems.push({ query, count: 1, lastUsed: now });
    }

    // Keep only top 50 items
    this.frecencyItems.sort((a, b) => {
      const scoreA = a.count * Math.log(now - a.lastUsed + 1);
      const scoreB = b.count * Math.log(now - b.lastUsed + 1);
      return scoreB - scoreA;
    });
    this.frecencyItems = this.frecencyItems.slice(0, 50);

    this._saveFrecencyData();
  }

  private _sortByFrecency<T extends { name?: string; path?: string }>(
    items: T[],
    _query: string,
  ): T[] {
    const now = Date.now();
    return items.sort((a, b) => {
      const nameA = a.name || a.path || "";
      const nameB = b.name || b.path || "";

      const frecencyA = this.frecencyItems.find((item) => item.query === nameA);
      const frecencyB = this.frecencyItems.find((item) => item.query === nameB);

      const scoreA = frecencyA ? frecencyA.count * Math.log(now - frecencyA.lastUsed + 1) : 0;
      const scoreB = frecencyB ? frecencyB.count * Math.log(now - frecencyB.lastUsed + 1) : 0;

      return scoreB - scoreA;
    });
  }

  private _focusInput() {
    setTimeout(() => {
      const input = this.shadowRoot?.querySelector(".search-input") as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  private _getQuickActionsForSelected(): QuickAction[] {
    if (this.selectedIndex < this.results.applications.length) {
      const app = this.results.applications[this.selectedIndex];
      return [
        {
          title: "Open",
          icon: "▶️",
          shortcut: "↵",
          action: () => this._openApplication(app),
        },
        {
          title: "Show in Finder",
          icon: "📁",
          shortcut: "⌘↵",
          action: () => this._showInFinder(app.path),
        },
        {
          title: "Copy Path",
          icon: "📋",
          shortcut: "⌘C",
          action: () => this._copyToClipboard(app.path),
        },
      ];
    }
    return [];
  }

  private async _showInFinder(path: string) {
    try {
      // Use Tauri to show file in Finder/Explorer
      await invoke("show_in_folder", { path });
    } catch (error) {
      console.error("Failed to show in finder:", error);
    }
  }

  private async _copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Show toast notification
      window.dispatchEvent(
        new CustomEvent("plugin:toast", {
          detail: {
            title: "Copied",
            message: "Path copied to clipboard",
            style: "success",
          },
        }),
      );
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }

  // AI Insights Methods
  private _hasResults(): boolean {
    return (
      this.results.applications.length > 0 ||
      this.results.files.length > 0 ||
      this._getFilteredPluginCommands().length > 0
    );
  }

  private async _fetchAIInsights(query: string, results: SearchResult) {
    // Clear previous timer
    if (this.aiInsightsDebounceTimer) {
      clearTimeout(this.aiInsightsDebounceTimer);
    }

    // Debounce AI insights fetching
    this.aiInsightsDebounceTimer = window.setTimeout(async () => {
      this.aiInsightsLoading = true;
      this.showAiInsights = true;

      try {
        const insights = await invoke<string>("generate_search_insights", {
          query,
          searchResults: results,
        });

        this.aiInsights = insights;
      } catch (error) {
        console.error("Failed to fetch AI insights:", error);
        this.aiInsights =
          "AI insights are currently unavailable. Please ensure an AI provider is configured.";
        // Hide after a delay if there's an error
        setTimeout(() => {
          this.showAiInsights = false;
        }, 5000);
      } finally {
        this.aiInsightsLoading = false;
      }
    }, 1000); // Wait 1 second after search completes before fetching AI insights
  }

  private _toggleAIInsights() {
    this.showAiInsights = !this.showAiInsights;
  }

  private async _askAIProvider(provider: string) {
    console.log(`Asking ${provider} about: ${this.query}`);

    // Clean up any existing modal
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.parentNode.removeChild(this.currentModal);
      this.currentModal = null;
    }

    this.aiChatLoading = true;
    this.aiChatResponse = "";
    this.aiChatProvider = provider;
    this.showAiChatModal = true;

    try {
      // Use fetch to call the Axum streaming endpoint directly
      // Note: provider needs to be mapped to the actual AI provider type
      const providerMap: Record<string, string> = {
        OpenAI: "openai",
        Anthropic: "anthropic",
        Gemini: "gemini",
        DeepSeek: "deepseek",
        OpenRouter: "openrouter",
      };

      const aiProvider = providerMap[provider] || "openai";
      const response = await fetch("/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: this.query,
          provider: aiProvider,
          temperature: 0.8,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // /ai/generate returns JSON directly (non-streaming)
      const result = await response.json();
      console.log("[AI] Response received:", result);

      this.aiChatResponse = result.text || "";
      this.aiChatLoading = false;
      this.requestUpdate();
    } catch (error) {
      console.error(`Failed to ask ${provider}:`, error);
      this.aiChatLoading = false;
      this.showAiChatModal = false;
      window.dispatchEvent(
        new CustomEvent("plugin:toast", {
          detail: {
            title: "AI Chat Error",
            message: `Failed to connect to ${provider}`,
            style: "failure",
          },
        }),
      );
    }
  }

  private _closeAIChatModal() {
    this.showAiChatModal = false;
    this.aiChatResponse = "";
    this.aiChatProvider = "";
  }

  private _handleModalKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      this._closeAIChatModal();
    }
  }

  private _renderAIChatModal() {
    if (!this.showAiChatModal) {
      return null;
    }

    return html`
      <div
        class="ai-chat-modal-overlay"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) {
            this._closeAIChatModal();
          }
        }}
        @keydown=${this._handleModalKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-chat-modal-title"
      >
        <div class="ai-chat-modal-container">
          <div class="ai-chat-modal-header">
            <div class="ai-chat-modal-title" id="ai-chat-modal-title">
              ${this.aiChatProvider} Response
            </div>
            <button
              class="ai-chat-modal-close"
              @click=${this._closeAIChatModal}
              aria-label="Close modal"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          <div class="ai-chat-modal-query"><strong>Query:</strong> ${this.query}</div>

          <div class="ai-chat-modal-content">
            ${this.aiChatLoading
              ? html`
                  <div class="ai-chat-modal-loading">
                    <div class="spinner"></div>
                    <span>Generating response...</span>
                  </div>
                `
              : html`<p class="ai-chat-response-text">${this.aiChatResponse}</p>`}
          </div>
        </div>
      </div>
    `;
  }
  
  // ===== Mention/Autocomplete Methods =====
  
  /**
   * Fetch suggestions for the current mention being typed
   */
  private async _fetchMentionSuggestions(mention: Mention) {
    if (!mention.text || mention.text.length < 1) {
      this.mentionSuggestions = [];
      this.showMentionDropdown = false;
      return;
    }
    
    try {
      if (mention.type === 'app') {
        // Fetch application suggestions
        const apps = await invoke<Application[]>('search_app_suggestions', {
          query: mention.text,
          limit: 10,
        });
        
        this.mentionSuggestions = apps.map(app => ({
          id: app.path,
          name: app.name,
          path: app.path,
          icon: app.icon_base64,
          type: 'app' as const,
        }));
      } else if (mention.type === 'file') {
        // Fetch file suggestions
        const files = await invoke<FileMatch[]>('search_file_suggestions', {
          query: mention.text,
          searchPath: null,
          limit: 10,
        });
        
        this.mentionSuggestions = files.map(file => ({
          id: file.path,
          name: this._getFileName(file.path),
          path: file.path,
          type: 'file' as const,
        }));
      }
      
      this.showMentionDropdown = this.mentionSuggestions.length > 0;
      
      // Load icons for app suggestions asynchronously
      if (mention.type === 'app') {
        this._loadIconsForMentionSuggestions();
      }
    } catch (error) {
      console.error('Failed to fetch mention suggestions:', error);
      this.mentionSuggestions = [];
      this.showMentionDropdown = false;
    }
  }
  
  /**
   * Load icons for mention suggestions asynchronously
   */
  private async _loadIconsForMentionSuggestions() {
    for (const suggestion of this.mentionSuggestions) {
      if (suggestion.type === 'app' && !suggestion.icon) {
        try {
          const icon = await invoke<string | null>('get_application_icon', {
            appPath: suggestion.path,
          });
          if (icon) {
            // Update the suggestion with the icon
            const index = this.mentionSuggestions.findIndex(s => s.id === suggestion.id);
            if (index !== -1) {
              this.mentionSuggestions[index] = { ...suggestion, icon };
              this.requestUpdate();
            }
          }
        } catch (error) {
          console.error('Failed to load icon for mention:', error);
        }
      }
    }
  }
  
  /**
   * Handle mention suggestion selection
   */
  private _handleMentionSelect(e: CustomEvent) {
    const suggestion = e.detail;
    
    if (!this.currentMention) return;
    
    // Replace the partial mention with the selected item
    const input = this.shadowRoot?.querySelector('.search-input') as HTMLInputElement;
    if (!input) return;
    
    const beforeMention = this.query.substring(0, this.currentMention.startIndex);
    const afterMention = this.query.substring(this.currentMention.endIndex);
    const mentionPrefix = this.currentMention.type === 'app' ? '@' : '#';
    
    // Insert the selected mention
    this.query = `${beforeMention}${mentionPrefix}${suggestion.name}${afterMention}`;
    
    // Update input value
    input.value = this.query;
    
    // Close dropdown
    this.showMentionDropdown = false;
    this.currentMention = null;
    this.mentionSuggestions = [];
    
    // Re-parse input
    this.parsedInput = parseInput(this.query);
    
    // Set cursor position after the mention
    const newCursorPos = this.currentMention.startIndex + mentionPrefix.length + suggestion.name.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();
    
    // Trigger update
    this.requestUpdate();
  }
  
  /**
   * Handle mention dropdown close
   */
  private _handleMentionClose() {
    this.showMentionDropdown = false;
    this.currentMention = null;
    this.mentionSuggestions = [];
  }
  
  /**
   * Get dropdown position relative to the input
   */
  private _getMentionDropdownPosition(): { top: number; left: number } {
    const input = this.shadowRoot?.querySelector('.search-input') as HTMLInputElement;
    if (!input) return { top: 0, left: 0 };
    
    const rect = input.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
    };
  }
  
  /**
   * Render the mention suggestion dropdown
   */
  private _renderMentionDropdown() {
    if (!this.showMentionDropdown || !this.currentMention) {
      return null;
    }
    
    const position = this._getMentionDropdownPosition();
    
    return html`
      <suggestion-dropdown
        .mentionType=${this.currentMention.type}
        .suggestions=${this.mentionSuggestions}
        .position=${position}
        .visible=${this.showMentionDropdown}
        @suggestion-select=${this._handleMentionSelect}
        @suggestion-close=${this._handleMentionClose}
      ></suggestion-dropdown>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "view-search": ViewSearch;
  }
}
