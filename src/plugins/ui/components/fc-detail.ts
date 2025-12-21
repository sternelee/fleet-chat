/**
 * FCDetail - Fleet Chat Detail Component
 * Raycast-compatible Detail component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface DetailMetadataItem {
  label: string;
  text: string;
}

@customElement("fc-detail")
export class FCDetail extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      background: var(--color-background);
      color: var(--color-text-primary);
      font-family: var(--font-family-system);
      font-size: var(--font-size-base);
      line-height: 1.6;
    }

    .detail-container {
      display: flex;
      height: 100%;
    }

    .content {
      flex: 1;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .markdown {
      color: var(--color-text-primary);
    }

    /* Markdown Typography */
    .markdown h1 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .markdown h2 {
      font-size: var(--font-size-xl);
      font-weight: 600;
      margin: 24px 0 12px 0;
      color: var(--color-text-primary);
      line-height: 1.3;
    }

    .markdown h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      margin: 20px 0 10px 0;
      color: var(--color-text-primary);
      line-height: 1.3;
    }

    .markdown h4,
    .markdown h5,
    .markdown h6 {
      font-size: var(--font-size-base);
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: var(--color-text-primary);
      line-height: 1.3;
    }

    .markdown p {
      margin-bottom: 16px;
      color: var(--color-text-primary);
    }

    .markdown a {
      color: var(--color-primary);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s ease;
    }

    .markdown a:hover {
      border-bottom-color: var(--color-primary);
    }

    .markdown ul,
    .markdown ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }

    .markdown li {
      margin-bottom: 4px;
      color: var(--color-text-primary);
    }

    .markdown blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      background: var(--color-blockquote-background);
      border-left: 4px solid var(--color-primary);
      font-style: italic;
      color: var(--color-text-secondary);
    }

    .markdown code {
      background: var(--color-code-background);
      color: var(--color-code-text);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-family-mono);
      font-size: 0.9em;
    }

    .markdown pre {
      background: var(--color-code-background);
      color: var(--color-code-text);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: var(--font-family-mono);
      font-size: 0.9em;
      line-height: 1.4;
    }

    .markdown pre code {
      background: none;
      padding: 0;
    }

    .markdown table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: var(--font-size-sm);
    }

    .markdown th,
    .markdown td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    .markdown th {
      background: var(--color-table-header);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .markdown td {
      color: var(--color-text-secondary);
    }

    .markdown img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }

    .markdown hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 24px 0;
    }

    .markdown strong {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .markdown em {
      font-style: italic;
    }

    /* Metadata Panel */
    .metadata {
      width: 300px;
      background: var(--color-panel-background);
      border-left: 1px solid var(--color-border);
      padding: 24px;
      overflow-y: auto;
    }

    .metadata-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metadata-item {
      margin-bottom: 20px;
    }

    .metadata-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metadata-text {
      font-size: var(--font-size-base);
      color: var(--color-text-primary);
      word-wrap: break-word;
    }

    .metadata-text code {
      background: var(--color-code-background);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.9em;
    }

    /* Loading State */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--color-text-secondary);
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border);
      border-top: 2px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Empty State */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--color-text-secondary);
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: var(--font-size-lg);
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .detail-container {
        flex-direction: column;
      }

      .content {
        padding: 16px;
      }

      .metadata {
        width: 100%;
        border-left: none;
        border-top: 1px solid var(--color-border);
        padding: 16px;
      }
    }

    /* Syntax Highlighting (basic) */
    .markdown .hljs-keyword {
      color: var(--color-syntax-keyword);
      font-weight: 600;
    }

    .markdown .hljs-string {
      color: var(--color-syntax-string);
    }

    .markdown .hljs-comment {
      color: var(--color-syntax-comment);
      font-style: italic;
    }

    .markdown .hljs-number {
      color: var(--color-syntax-number);
    }

    .markdown .hljs-function {
      color: var(--color-syntax-function);
    }

    .markdown .hljs-variable {
      color: var(--color-syntax-variable);
    }
  `;

  @property({ type: String })
  markdown: string = "";

  @property({ type: Array })
  metadata?: DetailMetadataItem[];

  @property({ type: Boolean })
  isLoading: boolean = false;

  @property({ type: String })
  loadingText: string = "Loading...";

  @property({ type: String })
  emptyTitle: string = "No Content";

  @property({ type: String })
  emptyDescription: string = "";

  @property({ type: String })
  emptyIcon: string = "📄";

  @property({ type: Boolean })
  showMetadata: boolean = true;

  /**
   * Parse markdown content
   */
  private _parseMarkdown(markdown: string): string {
    if (!markdown) return "";

    // Basic markdown parsing - in a real implementation,
    // you'd want to use a proper markdown parser like marked
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || "text"}">${this._escapeHtml(code)}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Lists
    html = html.replace(/^\* (.+)$/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Blockquotes
    html = html.replace(/^> (.+)$/gim, "<blockquote>$1</blockquote>");

    // Horizontal rules
    html = html.replace(/^---$/gim, "<hr>");

    // Line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = "<p>" + html + "</p>";

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, "");
    html = html.replace(/<p>(<h[1-6]>)/g, "$1");
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, "$1");
    html = html.replace(/<p>(<ul>)/g, "$1");
    html = html.replace(/(<\/ul>)<\/p>/g, "$1");
    html = html.replace(/<p>(<blockquote>)/g, "$1");
    html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");
    html = html.replace(/<p>(<hr>)<\/p>/g, "$1");
    html = html.replace(/<p>(<pre>)/g, "$1");
    html = html.replace(/(<\/pre>)<\/p>/g, "$1");

    return html;
  }

  /**
   * Escape HTML characters
   */
  private _escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render loading state
   */
  private _renderLoading() {
    return html`
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>${this.loadingText}</span>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private _renderEmpty() {
    return html`
      <div class="empty">
        <div class="empty-icon">${this.emptyIcon}</div>
        <div class="empty-text">${this.emptyTitle}</div>
        <div class="empty-description">${this.emptyDescription}</div>
      </div>
    `;
  }

  /**
   * Render metadata panel
   */
  private _renderMetadata() {
    if (!this.showMetadata || !this.metadata || this.metadata.length === 0) {
      return html``;
    }

    return html`
      <div class="metadata">
        <div class="metadata-title">Details</div>
        ${this.metadata.map(
          (item) => html`
            <div class="metadata-item">
              <div class="metadata-label">${item.label}</div>
              <div class="metadata-text">${item.text}</div>
            </div>
          `,
        )}
      </div>
    `;
  }

  render() {
    if (this.isLoading) {
      return this._renderLoading();
    }

    if (!this.markdown) {
      return this._renderEmpty();
    }

    const parsedMarkdown = this._parseMarkdown(this.markdown);

    return html`
      <div class="detail-container">
        <div class="content">
          <div class="markdown">${parsedMarkdown}</div>
        </div>
        ${this._renderMetadata()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fc-detail": FCDetail;
  }
}

