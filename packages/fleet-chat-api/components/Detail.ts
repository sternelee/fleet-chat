/**
 * Detail Component
 *
 * Raycast-compatible Detail component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("fc-detail")
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

    .content-area {
      background: var(--background-color);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .markdown-content {
      line-height: 1.6;
      color: var(--text-color);
    }

    .markdown-content h1 {
      font-size: 2.5em;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: var(--text-color);
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 8px;
    }

    .markdown-content h2 {
      font-size: 2em;
      font-weight: 600;
      margin: 24px 0 16px 0;
      color: var(--text-color);
    }

    .markdown-content h3 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 20px 0 12px 0;
      color: var(--text-color);
    }

    .markdown-content h4 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: var(--text-color);
    }

    .markdown-content p {
      margin: 16px 0;
      line-height: 1.6;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    .markdown-content li {
      margin: 4px 0;
    }

    .markdown-content blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      background: var(--blockquote-background);
      border-left: 4px solid var(--accent-color);
      border-radius: 0 4px 4px 0;
    }

    .markdown-content code {
      background: var(--code-background);
      color: var(--code-color);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--monospace-font);
      font-size: 0.9em;
    }

    .markdown-content pre {
      background: var(--code-background);
      color: var(--code-color);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: var(--monospace-font);
      font-size: 0.9em;
      line-height: 1.4;
    }

    .markdown-content pre code {
      background: transparent;
      padding: 0;
    }

    .markdown-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    .markdown-content th,
    .markdown-content td {
      border: 1px solid var(--border-color);
      padding: 12px;
      text-align: left;
    }

    .markdown-content th {
      background: var(--header-background);
      font-weight: 600;
    }

    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 16px 0;
    }

    .metadata {
      background: var(--background-color);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--border-color);
    }

    .metadata-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-color);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .metadata-item:last-child {
      border-bottom: none;
    }

    .metadata-label {
      font-size: 14px;
      color: var(--secondary-text-color);
      font-weight: 500;
    }

    .metadata-text {
      font-size: 14px;
      color: var(--text-color);
      font-weight: 500;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .action-button {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--background-color);
      color: var(--text-color);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-button:hover {
      background: var(--hover-background);
      border-color: var(--accent-color);
    }

    .action-button.primary {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
    }

    .action-button.primary:hover {
      background: var(--accent-hover-color);
      border-color: var(--accent-hover-color);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--secondary-text-color);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--accent-color);
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

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--error-color);
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
  `;

  @property({ type: String })
  markdown = "";

  @property({ type: String })
  html = "";

  @property({ type: Boolean })
  isLoading = false;

  @property({ type: Array })
  metadata: Array<{
    label: string;
    text: string;
  }> = [];

  @property({ type: Array })
  actions: Array<{
    title: string;
    icon?: string;
    style?: "default" | "primary";
    onAction: () => void | Promise<void>;
  }> = [];

  render() {
    if (this.isLoading) {
      return this.renderLoadingState();
    }

    return html`
      <div class="detail-container">
        ${this.markdown || this.html
          ? html`
              <div class="content-area">
                ${this.html
                  ? html` <div class="markdown-content">${this.html}</div> `
                  : html` <div class="markdown-content">${this.renderMarkdown()}</div> `}
              </div>
            `
          : ""}
        ${this.metadata.length > 0
          ? html`
              <div class="metadata">
                <div class="metadata-title">Information</div>
                ${repeat(
                  this.metadata,
                  (item) => html`
                    <div class="metadata-item">
                      <span class="metadata-label">${item.label}</span>
                      <span class="metadata-text">${item.text}</span>
                    </div>
                  `,
                )}
              </div>
            `
          : ""}
        ${this.actions.length > 0
          ? html`
              <div class="actions">
                ${repeat(
                  this.actions,
                  (action) => html`
                    <button
                      class="action-button ${action.style === "primary" ? "primary" : ""}"
                      @click="${() => this.handleAction(action)}"
                    >
                      ${action.icon ? html`<span>${action.icon}</span>` : ""} ${action.title}
                    </button>
                  `,
                )}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderLoadingState() {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div>Loading...</div>
      </div>
    `;
  }

  private renderMarkdown() {
    // Simple markdown parser - in production, you'd use a proper markdown library
    return this.parseBasicMarkdown(this.markdown);
  }

  private parseBasicMarkdown(markdown: string): string {
    return (
      markdown
        // Headers
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        // Bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Italic
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Code
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Line breaks
        .replace(/\n/g, "<br>")
    );
  }

  private async handleAction(action: any) {
    try {
      await action.onAction();
    } catch (error) {
      console.error("Action failed:", error);
    }
  }
}

export default FCDetail;
