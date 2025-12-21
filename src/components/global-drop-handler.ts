/**
 * Global Drop Handler for Plugin Installation
 *
 * Enables drag-and-drop of .fcp files anywhere in the Fleet Chat window
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('global-drop-handler')
export class GlobalDropHandler extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9999;
    }

    .global-drop-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .global-drop-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .drop-content {
      text-align: center;
      color: white;
      padding: 48px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(74, 144, 226, 0.9), rgba(95, 99, 250, 0.9));
      backdrop-filter: blur(10px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
      transition: transform 0.3s ease;
      max-width: 400px;
      margin: 20px;
    }

    .global-drop-overlay.active .drop-content {
      transform: scale(1);
    }

    .drop-icon {
      font-size: 64px;
      margin-bottom: 24px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .drop-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .drop-subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 32px;
    }

    .drop-files {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .drop-file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .drop-file-item:last-child {
      margin-bottom: 0;
    }

    .file-info {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .file-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .file-details {
      flex: 1;
    }

    .file-name {
      font-weight: 600;
      font-size: 16px;
    }

    .file-size {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .file-status {
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 20px;
      background-color: rgba(255, 255, 255, 0.2);
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 16px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      width: 0%;
      transition: width 0.5s ease;
      border-radius: 3px;
    }

    .drop-hint {
      font-size: 14px;
      opacity: 0.8;
      font-style: italic;
    }
  `;

  @state()
  private isActive = false;

  @state()
  private dropFiles: File[] = [];

  @state()
  private processingFiles: Set<string> = new Set();

  @state()
  private processedFiles: Set<string> = new Set();

  @state()
  private errorFiles: Set<string> = new Set();

  private fileDropHandler?: (files: File[]) => Promise<void>;

  connectedCallback() {
    super.connectedCallback();
    this.setupGlobalDragListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeGlobalDragListeners();
  }

  private setupGlobalDragListeners() {
    // Listen for drag events on the document
    document.addEventListener('dragenter', this.handleDocumentDragEnter.bind(this));
    document.addEventListener('dragover', this.handleDocumentDragOver.bind(this));
    document.addEventListener('dragleave', this.handleDocumentDragLeave.bind(this));
    document.addEventListener('drop', this.handleDocumentDrop.bind(this));
  }

  private removeGlobalDragListeners() {
    document.removeEventListener('dragenter', this.handleDocumentDragEnter.bind(this));
    document.removeEventListener('dragover', this.handleDocumentDragOver.bind(this));
    document.removeEventListener('dragleave', this.handleDocumentDragLeave.bind(this));
    document.removeEventListener('drop', this.handleDocumentDrop.bind(this));
  }

  private handleDocumentDragEnter(e: DragEvent) {
    e.preventDefault();

    const items = e.dataTransfer?.items;
    if (items && this.hasValidFiles(Array.from(items))) {
      this.isActive = true;
      document.body.style.userSelect = 'none';
    }
  }

  private handleDocumentDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.isActive) {
      e.dataTransfer!.dropEffect = 'copy';
    }
  }

  private handleDocumentDragLeave(e: DragEvent) {
    e.preventDefault();

    // Check if leaving the window
    if (e.clientX === 0 && e.clientY === 0) {
      this.isActive = false;
      document.body.style.userSelect = '';
    }
  }

  private async handleDocumentDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    console.log('🎯 GlobalDropHandler: Drop event detected', {
      hasFiles: !!(e.dataTransfer?.files),
      filesCount: e.dataTransfer?.files?.length,
      types: Array.from(e.dataTransfer?.items || []).map(item => ({
        kind: item.kind,
        type: item.type
      }))
    });

    this.isActive = false;
    document.body.style.userSelect = '';

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      console.log('❌ No files in drop event');
      return;
    }

    console.log('📁 Files dropped:', Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      path: (f as any).path || 'N/A'
    })));

    // Filter valid files (.fcp)
    const validFiles = Array.from(files).filter(file =>
      file.name.toLowerCase().endsWith('.fcp')
    );

    console.log('✅ Valid .fcp files:', validFiles.map(f => f.name));

    if (validFiles.length === 0) {
      console.log('❌ No valid .fcp files found');
      // Show temporary error state
      this.dropFiles = [];
      setTimeout(() => {
        this.isActive = false;
      }, 1000);
      return;
    }

    this.dropFiles = validFiles;
    this.processingFiles = new Set(validFiles.map(f => f.name));

    // Initialize plugin handler if needed
    if (!this.fileDropHandler) {
      console.log('⚠️ No file drop handler set, initializing...');
      this.initializePluginHandler();
    }

    // Process files
    if (this.fileDropHandler) {
      try {
        console.log('🔄 Processing files...');
        await this.fileDropHandler(validFiles);

        // Mark all as successfully processed
        validFiles.forEach(file => {
          this.processingFiles.delete(file.name);
          this.processedFiles.add(file.name);
          console.log(`✅ Successfully processed: ${file.name}`);
        });

        // Hide overlay after success
        setTimeout(() => {
          this.resetState();
        }, 2000);
      } catch (error) {
        // Mark all as errors
        validFiles.forEach(file => {
          this.processingFiles.delete(file.name);
          this.errorFiles.add(file.name);
          console.error(`❌ Failed to process ${file.name}:`, error);
        });

        console.error('Plugin installation error:', error);

        // Hide overlay after error
        setTimeout(() => {
          this.resetState();
        }, 3000);
      }
    }
  }

  private async initializePluginHandler() {
    try {
      console.log('🔧 Initializing plugin handler...');

      // Import the plugin loader
      const { getGlobalPluginLoader } = await import('../plugins/plugin-loader.js');

      // Get the global plugin loader instance
      const pluginLoader = getGlobalPluginLoader();

      if (pluginLoader) {
        console.log('✅ Found global plugin loader');
        // Create a handler that processes an array of files
        this.fileDropHandler = async (files: File[]) => {
          console.log(`📦 Processing ${files.length} files with global plugin loader`);

          for (const file of files) {
            await pluginLoader.loadPluginFromFile(file);
          }
        };
        console.log('✅ Plugin handler initialized successfully');
      } else {
        console.log('⚠️ No global plugin loader found, checking for window.pluginManager...');

        // Fallback to window.pluginManager if available
        const pluginManager = (window as any).pluginManager;
        if (pluginManager) {
          console.log('✅ Using window.pluginManager fallback');
          const { PluginLoader } = await import('../plugins/plugin-loader.js');
          const loader = new PluginLoader(pluginManager);

          this.fileDropHandler = async (files: File[]) => {
            console.log(`📦 Processing ${files.length} files with fallback loader`);

            for (const file of files) {
              await loader.loadPluginFromFile(file);
            }
          };
          console.log('✅ Fallback plugin handler initialized');
        } else {
          console.log('❌ No plugin manager available');
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize plugin handler:', error);
    }
  }

  private hasValidFiles(items: DataTransferItem[]): boolean {
    return Array.from(items).some(item => {
      const file = item.getAsFile();
      return file && file.name.toLowerCase().endsWith('.fcp');
    });
  }

  private resetState() {
    this.isActive = false;
    this.dropFiles = [];
    this.processingFiles.clear();
    this.processedFiles.clear();
    this.errorFiles.clear();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileStatus(fileName: string): 'processing' | 'success' | 'error' {
    if (this.processingFiles.has(fileName)) return 'processing';
    if (this.processedFiles.has(fileName)) return 'success';
    if (this.errorFiles.has(fileName)) return 'error';
    return 'processing';
  }

  // Public API
  public setFileDropHandler(handler: (files: File[]) => Promise<void>) {
    this.fileDropHandler = handler;
  }

  render() {
    return html`
      <div class="global-drop-overlay ${this.isActive ? 'active' : ''}">
        <div class="drop-content">
          <div class="drop-icon">📦</div>
          <div class="drop-title">Install Plugin</div>
          <div class="drop-subtitle">Release to install Fleet Chat plugin</div>

          ${this.dropFiles.length > 0 ? html`
            <div class="drop-files">
              ${this.dropFiles.map(file => {
                const status = this.getFileStatus(file.name);
                return html`
                  <div class="drop-file-item">
                    <div class="file-info">
                      <div class="file-icon">📁</div>
                      <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <div class="file-status">
                      ${status === 'processing' ? html`<span>⏳ Processing...</span>` : ''}
                      ${status === 'success' ? html`<span>✅ Installed</span>` : ''}
                      ${status === 'error' ? html`<span>❌ Failed</span>` : ''}
                    </div>
                  </div>
                `;
              })}
            </div>
          ` : ''}

          <div class="drop-hint">
            ${this.dropFiles.length === 0
              ? 'Drag .fcp plugin files here'
              : this.processingFiles.size > 0
                ? `Installing ${this.processingFiles.size} plugin${this.processingFiles.size > 1 ? 's' : ''}...`
                : this.processedFiles.size > 0
                  ? `Successfully installed ${this.processedFiles.size} plugin${this.processedFiles.size > 1 ? 's' : ''}!`
                  : ''
            }
          </div>

          ${this.processingFiles.size > 0 ? html`
            <div class="progress-bar">
              <div class="progress-fill" style="width: 60%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// Declare for TypeScript
declare global {
  interface WindowEventMap {
    'dragenter': DragEvent;
    'dragover': DragEvent;
    'dragleave': DragEvent;
    'drop': DragEvent;
  }
}