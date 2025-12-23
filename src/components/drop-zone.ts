/**
 * Drop Zone Component for Plugin Installation
 *
 * Provides a drag-and-drop zone for installing .fcp plugin files
 */

import { css, html, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('drop-zone')
export class DropZone extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .drop-zone {
      border: 2px dashed var(--border-color);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      transition: all 0.3s ease;
      background-color: var(--surface-color);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .drop-zone:hover {
      border-color: var(--primary-color);
      background-color: var(--hover-bg-color);
    }

    .drop-zone.drag-over {
      border-color: var(--primary-color);
      background-color: var(--primary-color-light);
      transform: scale(1.02);
      box-shadow: 0 0 20px rgba(var(--primary-color-rgb), 0.2);
    }

    .drop-zone.drag-reject {
      border-color: var(--error-color);
      background-color: var(--error-color-light);
      animation: shake 0.5s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .drop-icon {
      font-size: 64px;
      margin-bottom: 16px;
      color: var(--text-secondary-color);
      transition: all 0.3s ease;
    }

    .drop-zone:hover .drop-icon {
      color: var(--primary-color);
      transform: scale(1.1);
    }

    .drop-zone.drag-over .drop-icon {
      color: var(--primary-color);
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .drop-text {
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .drop-subtext {
      color: var(--text-secondary-color);
      font-size: 0.9rem;
      margin-bottom: 16px;
    }

    .drop-button {
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .drop-button:hover {
      background-color: var(--primary-hover-color);
      transform: translateY(-1px);
    }

    .file-input {
      display: none;
    }

    .drop-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    .drop-overlay.show {
      opacity: 1;
      pointer-events: auto;
    }

    .drop-overlay-content {
      text-align: center;
      color: white;
    }

    .drop-overlay-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .drop-overlay-text {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .progress-bar {
      margin-top: 16px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      height: 4px;
      overflow: hidden;
    }

    .progress-fill {
      background-color: var(--primary-color);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    .status-message {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .status-message.show {
      opacity: 1;
    }

    .status-message.success {
      background-color: var(--success-color);
      color: white;
    }

    .status-message.error {
      background-color: var(--error-color);
      color: white;
    }

    .file-list {
      margin-top: 16px;
      text-align: left;
      max-height: 200px;
      overflow-y: auto;
    }

    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background-color: var(--input-bg-color);
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .file-name {
      flex: 1;
      font-size: 0.9rem;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      color: var(--text-secondary-color);
      font-size: 0.8rem;
      margin-left: 12px;
    }

    .file-status {
      margin-left: 12px;
      font-size: 0.8rem;
    }

    .file-status.success {
      color: var(--success-color);
    }

    .file-status.error {
      color: var(--error-color);
    }
  `

  @property({ type: Boolean })
  disabled = false

  @property({ type: String })
  accept = '.fcp'

  @property({ type: Boolean })
  multiple = false

  @state()
  private isDragOver = false

  @state()
  private isDragReject = false

  @state()
  private isProcessing = false

  @state()
  private dragFiles: File[] = []

  @state()
  private fileStatuses: Map<string, { status: 'pending' | 'success' | 'error'; message?: string }> =
    new Map()

  // Event handlers
  private onFilesDrop?: (files: File[]) => Promise<void>

  constructor() {
    super()
    this.setupDragListeners()
  }

  connectedCallback() {
    super.connectedCallback()
    this.setupGlobalDragListeners()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.removeGlobalDragListeners()
  }

  private setupDragListeners() {
    this.addEventListener('dragenter', this.handleDragEnter.bind(this))
    this.addEventListener('dragover', this.handleDragOver.bind(this))
    this.addEventListener('dragleave', this.handleDragLeave.bind(this))
    this.addEventListener('drop', this.handleDrop.bind(this))
  }

  private setupGlobalDragListeners() {
    // Listen for global drag events to show overlay
    document.addEventListener('dragenter', this.handleGlobalDragEnter.bind(this))
    document.addEventListener('dragover', this.handleGlobalDragOver.bind(this))
    document.addEventListener('drop', this.handleGlobalDrop.bind(this))
  }

  private removeGlobalDragListeners() {
    document.removeEventListener('dragenter', this.handleGlobalDragEnter.bind(this))
    document.removeEventListener('dragover', this.handleGlobalDragOver.bind(this))
    document.removeEventListener('drop', this.handleGlobalDrop.bind(this))
  }

  private handleGlobalDragEnter(e: DragEvent) {
    e.preventDefault()
    const hasFiles =
      e.dataTransfer?.items && Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
    if (hasFiles) {
      this.isDragOver = true
    }
  }

  private handleGlobalDragOver(e: DragEvent) {
    e.preventDefault()
    if (this.isDragOver) {
      this.isDragOver = true
    }
  }

  private handleGlobalDrop(e: DragEvent) {
    e.preventDefault()
    this.isDragOver = false
  }

  private handleDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (this.disabled || this.isProcessing) return

    const hasValid = this.hasValidDataTransfer(e.dataTransfer)
    if (hasValid) {
      this.isDragOver = true
      this.isDragReject = false
    } else {
      this.isDragReject = true
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (this.disabled || this.isProcessing) {
      e.dataTransfer!.dropEffect = 'none'
      return
    }

    const hasValid = this.hasValidDataTransfer(e.dataTransfer)
    if (hasValid) {
      e.dataTransfer!.dropEffect = 'copy'
      this.isDragOver = true
      this.isDragReject = false
    } else {
      e.dataTransfer!.dropEffect = 'none'
      this.isDragReject = true
    }
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Only reset if leaving the drop zone
    if (!this.contains(e.relatedTarget as Node)) {
      this.isDragOver = false
      this.isDragReject = false
    }
  }

  private async handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (this.disabled || this.isProcessing) {
      return
    }

    this.isDragOver = false
    this.isDragReject = false

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    // Filter valid files
    const validFiles = this.filterValidFiles(Array.from(files))
    if (validFiles.length === 0) {
      this.showMessage('No valid plugin files found', 'error')
      return
    }

    if (!this.multiple && validFiles.length > 1) {
      this.showMessage('Only one file can be dropped at a time', 'error')
      return
    }

    this.dragFiles = validFiles
    await this.processFiles(validFiles)
  }

  private hasValidDataTransfer(dataTransfer: DataTransfer | null | undefined): boolean {
    if (!dataTransfer) return false

    // Check items first
    if (dataTransfer.items) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file && this.isValidFile(file)) {
            return true
          }
        }
      }
    }

    // Fallback to files
    if (dataTransfer.files) {
      for (let i = 0; i < dataTransfer.files.length; i++) {
        if (this.isValidFile(dataTransfer.files[i])) {
          return true
        }
      }
    }

    return false
  }

  private isValidFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.fcp')
  }

  private filterValidFiles(files: File[]): File[] {
    return files.filter((file) => this.isValidFile(file))
  }

  private async processFiles(files: File[]) {
    if (!this.onFilesDrop) return

    this.isProcessing = true

    // Initialize file statuses
    files.forEach((file) => {
      this.fileStatuses.set(file.name, { status: 'pending' })
    })
    this.requestUpdate()

    try {
      await this.onFilesDrop(files)

      // Mark all as success
      files.forEach((file) => {
        this.fileStatuses.set(file.name, { status: 'success' })
      })

      this.showMessage(
        `Successfully installed ${files.length} plugin${files.length > 1 ? 's' : ''}`,
        'success',
      )
    } catch (error) {
      // Mark all as error
      files.forEach((file) => {
        this.fileStatuses.set(file.name, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Installation failed',
        })
      })

      this.showMessage('Failed to install plugin(s)', 'error')
      console.error('Plugin installation error:', error)
    } finally {
      this.isProcessing = false
      setTimeout(() => {
        this.dragFiles = []
        this.fileStatuses.clear()
      }, 3000)
    }
  }

  private showMessage(text: string, type: 'success' | 'error') {
    // Dispatch custom event for parent to handle
    this.dispatchEvent(
      new CustomEvent('drop-zone-message', {
        detail: { text, type },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private handleClick() {
    if (this.disabled || this.isProcessing) return

    const input = this.shadowRoot!.querySelector('.file-input') as HTMLInputElement
    input.click()
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])

    if (files.length > 0) {
      this.dragFiles = files
      this.processFiles(files)
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i]
  }

  // Public API
  public setFilesDropHandler(handler: (files: File[]) => Promise<void>) {
    this.onFilesDrop = handler
  }

  render() {
    const hasDragFiles = this.dragFiles.length > 0

    return html`
      <div class="drop-zone ${this.isDragOver ? 'drag-over' : ''} ${this.isDragReject ? 'drag-reject' : ''}"
           @click="${this.handleClick}">

        ${
          !hasDragFiles
            ? html`
          <div class="drop-icon">📦</div>
          <div class="drop-text">Drop plugin files here</div>
          <div class="drop-subtext">or click to browse</div>
          <div class="drop-subtext">Supports .fcp files</div>
          <button class="drop-button" ?disabled="${this.disabled}">
            Browse Files
          </button>
        `
            : ''
        }

        ${
          hasDragFiles
            ? html`
          <div class="file-list">
            ${this.dragFiles.map((file) => {
              const status = this.fileStatuses.get(file.name) || { status: 'pending' }
              return html`
                <div class="file-item">
                  <span class="file-name">${file.name}</span>
                  <span class="file-size">${this.formatFileSize(file.size)}</span>
                  <span class="file-status ${status.status}">
                    ${status.status === 'pending' ? '⏳' : ''}
                    ${status.status === 'success' ? '✓' : ''}
                    ${status.status === 'error' ? '✗' : ''}
                  </span>
                </div>
              `
            })}
          </div>
        `
            : ''
        }

        <input type="file"
               class="file-input"
               accept="${this.accept}"
               ?multiple="${this.multiple}"
               @change="${this.handleFileSelect}">
      </div>

      <div class="drop-overlay ${this.isDragOver ? 'show' : ''}">
        <div class="drop-overlay-content">
          <div class="drop-overlay-icon">📥</div>
          <div class="drop-overlay-text">Drop to install plugin</div>
          <div class="drop-subtext">Release to install</div>
          ${
            this.isProcessing
              ? html`
            <div class="progress-bar">
              <div class="progress-fill" style="width: 60%"></div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }
}
