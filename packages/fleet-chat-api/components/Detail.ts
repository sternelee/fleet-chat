/**
 * Detail Component
 *
 * Raycast-compatible Detail component built with Lit
 */

import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

export interface IconProps {
  source: string
  tintColor?: string
  tooltip?: string
}

export interface DetailMetadataProps {
  label: string
  text: string
  icon?: string | IconProps
  href?: string
}

export interface DetailActionProps {
  title: string
  icon?: string | IconProps
  onAction?: () => void | Promise<void>
  style?: 'default' | 'primary' | 'destructive'
  shortcut?: string
  href?: string
  target?: string
}

@customElement('fc-detail')
export class FCDetail extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }

    .detail-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .detail-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .detail-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-icon-background);
      font-size: 32px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .detail-icon img,
    .detail-icon svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .detail-header-content {
      flex: 1;
      min-width: 0;
    }

    .detail-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 4px;
      line-height: 1.2;
    }

    .detail-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    /* Content Area */
    .content-area {
      background: var(--color-background);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 16px;
    }

    /* Markdown Content */
    .markdown-content {
      line-height: 1.6;
      color: var(--color-text-primary);
      word-wrap: break-word;
    }

    .markdown-content :global(h1) {
      font-size: 2em;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: var(--color-text-primary);
      border-bottom: 2px solid var(--color-border);
      padding-bottom: 8px;
    }

    .markdown-content :global(h2) {
      font-size: 1.5em;
      font-weight: 600;
      margin: 24px 0 16px 0;
      color: var(--color-text-primary);
    }

    .markdown-content :global(h3) {
      font-size: 1.25em;
      font-weight: 600;
      margin: 20px 0 12px 0;
      color: var(--color-text-primary);
    }

    .markdown-content :global(h4) {
      font-size: 1.1em;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: var(--color-text-primary);
    }

    .markdown-content :global(p) {
      margin: 16px 0;
      line-height: 1.6;
    }

    .markdown-content :global(ul),
    .markdown-content :global(ol) {
      margin: 16px 0;
      padding-left: 24px;
    }

    .markdown-content :global(li) {
      margin: 4px 0;
    }

    .markdown-content :global(blockquote) {
      margin: 16px 0;
      padding: 12px 16px;
      background: var(--color-blockquote-background);
      border-left: 4px solid var(--color-primary);
      border-radius: 0 4px 4px 0;
      color: var(--color-text-secondary);
    }

    .markdown-content :global(code) {
      background: var(--color-code-background);
      color: var(--color-code-text);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-family-mono);
      font-size: 0.9em;
    }

    .markdown-content :global(pre) {
      background: var(--color-code-background);
      color: var(--color-code-text);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: var(--font-family-mono);
      font-size: 0.9em;
      line-height: 1.4;
    }

    .markdown-content :global(pre code) {
      background: transparent;
      padding: 0;
    }

    .markdown-content :global(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    .markdown-content :global(th),
    .markdown-content :global(td) {
      border: 1px solid var(--color-border);
      padding: 12px;
      text-align: left;
    }

    .markdown-content :global(th) {
      background: var(--color-table-header);
      font-weight: 600;
    }

    .markdown-content :global(img) {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 16px 0;
    }

    .markdown-content :global(a) {
      color: var(--color-primary);
      text-decoration: none;
    }

    .markdown-content :global(a:hover) {
      text-decoration: underline;
    }

    /* Metadata */
    .metadata {
      background: var(--color-background);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--color-border);
    }

    .metadata-title {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);
      gap: 12px;
    }

    .metadata-item:last-child {
      border-bottom: none;
    }

    .metadata-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .metadata-label-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
    }

    .metadata-text {
      font-size: 14px;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .metadata-link {
      font-size: 14px;
      color: var(--color-primary);
      text-decoration: none;
    }

    .metadata-link:hover {
      text-decoration: underline;
    }

    /* Actions */
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-button-background);
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .action-button:hover {
      background: var(--color-button-hover);
      border-color: var(--color-primary);
    }

    .action-button.primary {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .action-button.primary:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    .action-button.destructive {
      color: var(--color-error);
      border-color: var(--color-error);
    }

    .action-button.destructive:hover {
      background: var(--color-error-alpha);
    }

    .action-icon {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-shortcut {
      font-size: 11px;
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 4px;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--color-text-secondary);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top: 3px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--color-error);
      text-align: center;
    }

    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.7;
    }

    .error-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .error-message {
      font-size: 14px;
      line-height: 1.4;
    }

    /* Tags */
    .tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      background: var(--color-tag-background);
      color: var(--color-tag-text);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
  `

  @property({ type: String })
  markdown = ''

  @property({ type: String })
  html = ''

  @property({ type: Boolean })
  isLoading = false

  @property({ type: Array })
  metadata: DetailMetadataProps[] = []

  @property({ type: Array })
  actions: DetailActionProps[] = []

  @property({ type: String })
  title?: string

  @property({ type: String })
  subtitle?: string

  @property({ type: String })
  icon?: string | IconProps

  @property({ type: Array })
  tags: string[] = []

  @property({ type: String })
  error?: string

  render() {
    if (this.isLoading) {
      return this.renderLoadingState()
    }

    if (this.error) {
      return this.renderErrorState()
    }

    return html`
      <div class="detail-container">
        ${this.title || this.icon ? this.renderHeader() : ''}

        ${
          this.markdown || this.html
            ? html`
              <div class="content-area">
                <div class="markdown-content">
                  ${
                    this.html
                      ? unsafeHTML(this.html)
                      : unsafeHTML(this.renderMarkdown(this.markdown))
                  }
                </div>
              </div>
            `
            : ''
        }

        ${this.tags.length > 0 ? this.renderTags() : ''}

        ${this.metadata.length > 0 ? this.renderMetadata() : ''}

        ${this.actions.length > 0 ? this.renderActions() : ''}
      </div>
    `
  }

  private renderHeader() {
    return html`
      <div class="detail-header">
        ${this.icon ? this.renderIcon(this.icon) : ''}
        <div class="detail-header-content">
          <div class="detail-title">${this.title || ''}</div>
          ${this.subtitle ? html`<div class="detail-subtitle">${this.subtitle}</div>` : ''}
        </div>
      </div>
    `
  }

  private renderIcon(icon: string | IconProps) {
    const iconSrc = typeof icon === 'string' ? icon : icon.source
    const iconTint = typeof icon === 'object' && icon.tintColor ? `color: ${icon.tintColor}` : ''

    if (iconSrc.startsWith('http') || iconSrc.startsWith('/')) {
      return html`<div class="detail-icon"><img src="${iconSrc}" alt="" /></div>`
    }

    if (iconSrc.startsWith('<svg')) {
      return html`<div class="detail-icon" style="${iconTint}">${iconSrc}</div>`
    }

    return html`<div class="detail-icon" style="${iconTint}">${iconSrc}</div>`
  }

  private renderTags() {
    return html`
      <div class="tags">
        ${this.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
      </div>
    `
  }

  private renderMetadata() {
    return html`
      <div class="metadata">
        <div class="metadata-title">Information</div>
        ${repeat(
          this.metadata,
          (item) => item.label,
          (item) => html`
            <div class="metadata-item">
              <div class="metadata-label">
                ${
                  item.icon
                    ? html`
                  <div class="metadata-label-icon">
                    ${this.renderMetadataIcon(item.icon)}
                  </div>
                `
                    : ''
                }
                ${item.label}
              </div>
              ${
                item.href
                  ? html`<a class="metadata-link" href="${item.href}" target="_blank">${item.text}</a>`
                  : html`<div class="metadata-text">${item.text}</div>`
              }
            </div>
          `,
        )}
      </div>
    `
  }

  private renderMetadataIcon(icon: string | IconProps) {
    const iconSrc = typeof icon === 'string' ? icon : icon.source
    const iconTint = typeof icon === 'object' && icon.tintColor ? `color: ${icon.tintColor}` : ''

    if (iconSrc.startsWith('http') || iconSrc.startsWith('/')) {
      return html`<img src="${iconSrc}" alt="" style="${iconTint}; width: 100%; height: 100%; object-fit: contain;" />`
    }

    return html`<span style="${iconTint}">${iconSrc}</span>`
  }

  private renderActions() {
    return html`
      <div class="actions">
        ${repeat(
          this.actions,
          (action) => action.title,
          (action) => html`
            ${
              action.href
                ? html`
                  <a
                    class="action-button ${action.style === 'primary' ? 'primary' : ''} ${action.style === 'destructive' ? 'destructive' : ''}"
                    href="${action.href}"
                    target="${action.target || '_blank'}"
                  >
                    ${action.icon ? this.renderActionIcon(action.icon) : ''}
                    ${action.title}
                  </a>
                `
                : html`
                  <button
                    class="action-button ${action.style === 'primary' ? 'primary' : ''} ${action.style === 'destructive' ? 'destructive' : ''}"
                    @click="${() => this.handleAction(action)}"
                  >
                    ${action.icon ? this.renderActionIcon(action.icon) : ''}
                    ${action.title}
                    ${action.shortcut ? html`<span class="action-shortcut">${action.shortcut}</span>` : ''}
                  </button>
                `
            }
          `,
        )}
      </div>
    `
  }

  private renderActionIcon(icon: string | IconProps) {
    const iconSrc = typeof icon === 'string' ? icon : icon.source
    const iconTint = typeof icon === 'object' && icon.tintColor ? `color: ${icon.tintColor}` : ''

    if (iconSrc.startsWith('http') || iconSrc.startsWith('/')) {
      return html`<img src="${iconSrc}" alt="" style="width: 14px; height: 14px; object-fit: contain;" />`
    }

    return html`<span class="action-icon" style="${iconTint}">${iconSrc}</span>`
  }

  private renderLoadingState() {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div>Loading...</div>
      </div>
    `
  }

  private renderErrorState() {
    return html`
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Error</div>
        <div class="error-message">${this.error}</div>
      </div>
    `
  }

  private renderMarkdown(markdown: string): string {
    // Enhanced markdown parser
    return (
      markdown
        // Escape HTML first to prevent XSS
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Code (inline)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
        // Blockquotes
        .replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>')
        // Unordered lists
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
        // Fix adjacent lists
        .replace(/<\/ul>\s*<ul>/g, '')
        // Ordered lists
        .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
        .replace(/<\/ol>\s*<ol>/g, '')
        // Horizontal rules
        .replace(/^---$/gim, '<hr />')
        .replace(/^\*\*\*$/gim, '<hr />')
        // Line breaks and paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
    )
  }

  private async handleAction(action: DetailActionProps) {
    try {
      if (action.onAction) {
        await action.onAction()
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
  }
}

export default FCDetail
